// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMockERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function mint(address to, uint256 amount) external;
}

contract PaymentEscrow {
    IMockERC20 public paymentToken;
    address public owner; 

    enum OrderStatus { PENDING, PAID, SHIPPED, COMPLETED, REFUNDED, REVOKED, DISPUTED }

    struct Order {
        address payer;
        address payee;
        uint256 amount;
        OrderStatus status;
        bool isFinanced; 
    }

    mapping(string => Order) public orders;

    event OrderCreated(string orderId, address payer, address payee, uint256 amount);
    event OrderPaid(string orderId);
    event OrderShipped(string orderId); // 新增：链上发货事件
    event OrderCompleted(string orderId);
    event OrderRefunded(string orderId);
    event OrderRevoked(string orderId);
    event OrderDisputed(string orderId);
    event OrderFinanced(string orderId, address payee, uint256 advanceAmount);

    constructor(address _paymentToken) {
        paymentToken = IMockERC20(_paymentToken);
        owner = msg.sender;
    }

    function createAndPayOrder(string memory orderId, address payee, uint256 amount) external {
        require(orders[orderId].payer == address(0), "Order already exists");
        require(amount > 0, "Amount must be greater than 0");

        orders[orderId] = Order({
            payer: msg.sender,
            payee: payee,
            amount: amount,
            status: OrderStatus.PAID,
            isFinanced: false
        });

        require(paymentToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        emit OrderCreated(orderId, msg.sender, payee, amount);
        emit OrderPaid(orderId);
    }

    // ================== V15 核心修复：将发货状态同步到区块链 ==================
    function shipOrder(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PAID, "Order is not paid or already shipped");
        require(msg.sender == order.payee, "Only the seller can ship the order"); // 只有卖家有权上链发货
        
        order.status = OrderStatus.SHIPPED;
        emit OrderShipped(orderId);
    }

    // DeFi 供应链保理模块
    function requestFinancing(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.SHIPPED, "Order must be shipped to request financing");
        require(msg.sender == order.payee, "Only the seller can request financing");
        require(!order.isFinanced, "Order is already financed");

        order.isFinanced = true;
        uint256 advanceAmount = (order.amount * 80) / 100; // 提取 80%

        // 模拟平台资金池即时放款
        paymentToken.mint(order.payee, advanceAmount);

        emit OrderFinanced(orderId, order.payee, advanceAmount);
    }

    // 终局资金结算
    function completeOrder(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PAID || order.status == OrderStatus.SHIPPED, "Invalid status");
        require(msg.sender == owner || msg.sender == order.payer, "Unauthorized");

        order.status = OrderStatus.COMPLETED;

        if (order.isFinanced) {
            uint256 platformRepayment = (order.amount * 82) / 100;
            uint256 finalPayment = order.amount - platformRepayment;

            require(paymentToken.transfer(owner, platformRepayment), "Repayment failed");
            require(paymentToken.transfer(order.payee, finalPayment), "Final payment failed");
        } else {
            require(paymentToken.transfer(order.payee, order.amount), "Transfer failed");
        }

        emit OrderCompleted(orderId);
    }

    function revokeOrder(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PAID, "Cannot revoke");
        require(msg.sender == order.payer, "Unauthorized");
        order.status = OrderStatus.REVOKED;
        require(paymentToken.transfer(order.payer, order.amount), "Transfer failed");
        emit OrderRevoked(orderId);
    }

    function raiseDispute(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.SHIPPED, "Must be shipped");
        require(msg.sender == order.payer, "Unauthorized");
        order.status = OrderStatus.DISPUTED;
        emit OrderDisputed(orderId);
    }

    function resolveDispute(string memory orderId, bool favorBuyer) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.DISPUTED, "Not in dispute");
        require(msg.sender == owner, "Only arbitrator");

        if (favorBuyer) {
            order.status = OrderStatus.REFUNDED;
            require(paymentToken.transfer(order.payer, order.amount), "Refund failed");
            emit OrderRefunded(orderId);
        } else {
            order.status = OrderStatus.COMPLETED;
            if (order.isFinanced) {
                uint256 platformRepayment = (order.amount * 82) / 100;
                uint256 finalPayment = order.amount - platformRepayment;
                require(paymentToken.transfer(owner, platformRepayment), "Repayment failed");
                require(paymentToken.transfer(order.payee, finalPayment), "Final payment failed");
            } else {
                require(paymentToken.transfer(order.payee, order.amount), "Transfer failed");
            }
            emit OrderCompleted(orderId);
        }
    }
}