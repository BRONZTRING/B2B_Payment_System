// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMockERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract PaymentEscrow {
    IMockERC20 public paymentToken;
    address public owner; 

    // 平台流动性资金池，用于真实的保理放款，杜绝凭空 mint
    uint256 public platformPool; 

    enum OrderStatus { PENDING, PAID, SHIPPED, COMPLETED, REFUNDED, REVOKED, DISPUTED }

    struct Order {
        address payer;
        address payee;
        uint256 amount;
        OrderStatus status;
        bool isFinanced; 
    }

    mapping(string => Order) public orders;
    // 记录恶意卖家的坏账（纠纷败诉但已卷走融资款）
    mapping(address => uint256) public badDebt;

    event OrderCreated(string orderId, address payer, address payee, uint256 amount);
    event OrderPaid(string orderId);
    event OrderShipped(string orderId);
    event OrderCompleted(string orderId);
    event OrderRefunded(string orderId);
    event OrderRevoked(string orderId);
    event OrderDisputed(string orderId);
    event OrderFinanced(string orderId, address payee, uint256 advanceAmount);
    event PoolFunded(address funder, uint256 amount);
    event BadDebtRecorded(address payee, uint256 debtAmount);

    constructor(address _paymentToken) {
        paymentToken = IMockERC20(_paymentToken);
        owner = msg.sender;
    }

    // [新增] LP 或平台方注资，建立真实的借贷池
    function fundPlatformPool(uint256 amount) external {
        require(paymentToken.transferFrom(msg.sender, address(this), amount), "Funding failed");
        platformPool += amount;
        emit PoolFunded(msg.sender, amount);
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

    function shipOrder(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PAID, "Order is not paid or already shipped");
        require(msg.sender == order.payee, "Only the seller can ship the order"); 
        
        order.status = OrderStatus.SHIPPED;
        emit OrderShipped(orderId);
    }

    // [修复] 剥离假冒的 mint，改为从平台池真实拨付
    function requestFinancing(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.SHIPPED, "Order must be shipped to request financing");
        require(msg.sender == order.payee, "Only the seller can request financing");
        require(!order.isFinanced, "Order is already financed");

        uint256 advanceAmount = (order.amount * 80) / 100; // 提取 80%
        require(platformPool >= advanceAmount, "Insufficient liquidity in platform pool");

        order.isFinanced = true;
        platformPool -= advanceAmount; // 扣减资金池

        require(paymentToken.transfer(order.payee, advanceAmount), "Financing transfer failed");
        emit OrderFinanced(orderId, order.payee, advanceAmount);
    }

    function completeOrder(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PAID || order.status == OrderStatus.SHIPPED, "Invalid status");
        require(msg.sender == owner || msg.sender == order.payer, "Unauthorized");

        order.status = OrderStatus.COMPLETED;

        if (order.isFinanced) {
            uint256 platformRepayment = (order.amount * 82) / 100; // 回收 80% 本金 + 2% 利润
            uint256 finalPayment = order.amount - platformRepayment;

            platformPool += platformRepayment; // 资金连本带利回流资金池
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

    // [修复] 仲裁退款漏洞：若已融资且判买家胜，必须将卖家记入坏账黑名单
    function resolveDispute(string memory orderId, bool favorBuyer) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.DISPUTED, "Not in dispute");
        require(msg.sender == owner, "Only arbitrator");

        if (favorBuyer) {
            order.status = OrderStatus.REFUNDED;
            require(paymentToken.transfer(order.payer, order.amount), "Refund failed");
            
            // 如果判给买家，但卖家已经把 80% 提走了，平台承担损失并记录坏账
            if (order.isFinanced) {
                uint256 debt = (order.amount * 80) / 100;
                badDebt[order.payee] += debt;
                emit BadDebtRecorded(order.payee, debt);
            }
            emit OrderRefunded(orderId);
        } else {
            order.status = OrderStatus.COMPLETED;
            if (order.isFinanced) {
                uint256 platformRepayment = (order.amount * 82) / 100;
                uint256 finalPayment = order.amount - platformRepayment;
                platformPool += platformRepayment;
                require(paymentToken.transfer(order.payee, finalPayment), "Final payment failed");
            } else {
                require(paymentToken.transfer(order.payee, order.amount), "Transfer failed");
            }
            emit OrderCompleted(orderId);
        }
    }
}