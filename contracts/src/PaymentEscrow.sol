// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 引入安全库，防止转账失败但不报错的问题
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PaymentEscrow {
    using SafeERC20 for IERC20;

    // 定义订单状态：0-待定, 1-已锁定, 2-已释放, 3-已退款
    enum OrderState { PENDING, LOCKED, RELEASED, REFUNDED }

    struct Order {
        address buyer;       // 买家
        address seller;      // 卖家
        address token;       // 支付代币地址
        uint256 amount;      // 金额
        bytes32 goodsHash;   // 【核心】隐私哈希，不存明文
        OrderState state;    // 当前状态
    }

    // 订单ID计数器
    uint256 public nextOrderId;
    // 存储所有订单
    mapping(uint256 => Order) public orders;

    // 定义事件，让 Go 后端监听
    event OrderCreated(uint256 indexed orderId, address indexed buyer, address indexed seller, uint256 amount);
    event FundsReleased(uint256 indexed orderId);
    event FundsRefunded(uint256 indexed orderId);

    // === 核心功能 1: 创建订单并锁定资金 ===
    function createOrder(
        address _seller,
        address _token,
        uint256 _amount,
        bytes32 _goodsHash
    ) external returns (uint256) {
        require(_amount > 0, "Amount must be > 0");
        require(_seller != address(0), "Invalid seller");

        uint256 orderId = nextOrderId++;

        orders[orderId] = Order({
            buyer: msg.sender,
            seller: _seller,
            token: _token,
            amount: _amount,
            goodsHash: _goodsHash,
            state: OrderState.LOCKED
        });

        // 从买家账户将钱转入合约 (买家必须先 Approve)
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        emit OrderCreated(orderId, msg.sender, _seller, _amount);
        return orderId;
    }

    // === 核心功能 2: 确认收货，释放资金 ===
    function releaseFunds(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        
        // 只有买家能操作 (简化逻辑)
        require(msg.sender == order.buyer, "Only buyer can release");
        require(order.state == OrderState.LOCKED, "Invalid state");

        order.state = OrderState.RELEASED;
        
        // 转账给卖家
        IERC20(order.token).safeTransfer(order.seller, order.amount);

        emit FundsReleased(_orderId);
    }

    // === 核心功能 3: 退款 ===
    function refund(uint256 _orderId) external {
        Order storage order = orders[_orderId];

        // 只有卖家同意才能退款
        require(msg.sender == order.seller, "Only seller can refund");
        require(order.state == OrderState.LOCKED, "Invalid state");

        order.state = OrderState.REFUNDED;

        // 原路退回给买家
        IERC20(order.token).safeTransfer(order.buyer, order.amount);

        emit FundsRefunded(_orderId);
    }
}