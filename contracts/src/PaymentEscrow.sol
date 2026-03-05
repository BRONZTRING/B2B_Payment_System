// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 修改导入路径：统一使用 OpenZeppelin 的 IERC20 接口，避免与 MockERC20 接口冲突
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title B2B Payment Escrow
 * @dev 核心支付担保合约，用于锁定买方资金，待物流确认后释放给卖方
 */
contract PaymentEscrow {
    IERC20 public paymentToken;
    address public owner; // 合约管理员（通常是我们的Go后端系统）

    // 订单状态机：待支付 -> 已支付(资金锁定) -> 已发货 -> 已完成(资金释放) / 已退款(资金退回)
    enum OrderStatus { PENDING, PAID, SHIPPED, COMPLETED, REFUNDED }

    struct Order {
        address payer;
        address payee;
        uint256 amount;
        OrderStatus status;
    }

    // 订单ID映射到订单详情 (使用字符串如 "ORD-001" 作为键)
    mapping(string => Order) public orders;

    // 事件定义，用于Go后端监听区块链状态
    event OrderCreated(string orderId, address payer, address payee, uint256 amount);
    event OrderPaid(string orderId);
    event OrderCompleted(string orderId);
    event OrderRefunded(string orderId);

    constructor(address _paymentToken) {
        paymentToken = IERC20(_paymentToken);
        owner = msg.sender;
    }

    /**
     * @dev 买方创建订单并支付资金入智能合约锁定
     * 注意：调用此函数前，买方钱包需先对本合约执行 token.approve()
     */
    function createAndPayOrder(string memory orderId, address payee, uint256 amount) external {
        require(orders[orderId].payer == address(0), "Order already exists");
        require(amount > 0, "Amount must be greater than 0");

        orders[orderId] = Order({
            payer: msg.sender,
            payee: payee,
            amount: amount,
            status: OrderStatus.PAID
        });

        // 将资金从买方转移到本合约进行锁定
        require(paymentToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        emit OrderCreated(orderId, msg.sender, payee, amount);
        emit OrderPaid(orderId);
    }

    /**
     * @dev 确认收货，将锁定的资金打给卖方
     */
    function completeOrder(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PAID || order.status == OrderStatus.SHIPPED, "Invalid status");
        
        // 只有买方自己，或者系统管理员（后端）有权确认收货
        require(msg.sender == owner || msg.sender == order.payer, "Unauthorized");

        order.status = OrderStatus.COMPLETED;
        // 将锁定的资金释放给卖方
        require(paymentToken.transfer(order.payee, order.amount), "Transfer failed");

        emit OrderCompleted(orderId);
    }

    /**
     * @dev 触发退款（如AI风控拦截或物流异常），将资金退还买方
     */
    function refundOrder(string memory orderId) external {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.PAID || order.status == OrderStatus.SHIPPED, "Invalid status");
        
        // 通常退款由系统管理员（后端根据风控结果）发起
        require(msg.sender == owner, "Only owner can refund");

        order.status = OrderStatus.REFUNDED;
        // 将锁定的资金退回给买方
        require(paymentToken.transfer(order.payer, order.amount), "Transfer failed");

        emit OrderRefunded(orderId);
    }
}