// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PaymentEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum OrderStatus { Created, Locked, Released, Refunded }

    struct Order {
        address buyer;
        address seller;
        uint256 amount;
        bytes32 goodsHash;
        OrderStatus status;
        uint256 expiration; // 新增：过期时间戳
    }

    mapping(bytes32 => Order) public orders;
    IERC20 public immutable paymentToken;
    uint256 public constant TIMEOUT = 7 days; // 默认超时时间

    event OrderCreated(bytes32 indexed orderId, address buyer, uint256 amount);
    event FundsLocked(bytes32 indexed orderId, uint256 expiration);
    event FundsReleased(bytes32 indexed orderId);
    event RefundClaimed(bytes32 indexed orderId);

    constructor(address _token) {
        paymentToken = IERC20(_token);
    }

    function createOrder(bytes32 _orderId, address _seller, uint256 _amount, bytes32 _goodsHash) external {
        require(orders[_orderId].buyer == address(0), "Order exists");
        
        orders[_orderId] = Order({
            buyer: msg.sender,
            seller: _seller,
            amount: _amount,
            goodsHash: _goodsHash,
            status: OrderStatus.Created,
            expiration: 0
        });

        emit OrderCreated(_orderId, msg.sender, _amount);
    }

    function lockFunds(bytes32 _orderId) external nonReentrant {
        Order storage order = orders[_orderId];
        require(msg.sender == order.buyer, "Only buyer");
        require(order.status == OrderStatus.Created, "Invalid status");

        order.status = OrderStatus.Locked;
        order.expiration = block.timestamp + TIMEOUT; // 设置到期锚点
        
        paymentToken.safeTransferFrom(msg.sender, address(this), order.amount);
        emit FundsLocked(_orderId, order.expiration);
    }

    // 买家确认收货，释放资金给卖家
    function releaseFunds(bytes32 _orderId) external nonReentrant {
        Order storage order = orders[_orderId];
        require(msg.sender == order.buyer, "Only buyer");
        require(order.status == OrderStatus.Locked, "Funds not locked");

        order.status = OrderStatus.Released;
        paymentToken.safeTransfer(order.seller, order.amount);
        emit FundsReleased(_orderId);
    }

    // 新增：超时单方面退款逻辑（核心学术点）
    function claimExpiredRefund(bytes32 _orderId) external nonReentrant {
        Order storage order = orders[_orderId];
        require(order.status == OrderStatus.Locked, "Not locked");
        require(block.timestamp > order.expiration, "Not expired yet");
        require(msg.sender == order.buyer, "Only buyer can claim");

        order.status = OrderStatus.Refunded;
        paymentToken.safeTransfer(order.buyer, order.amount);
        emit RefundClaimed(_orderId);
    }
}