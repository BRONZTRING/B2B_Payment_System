// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol"; 
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title B2B Cross-Border Payment Escrow with AI Risk Control
 * @notice 硕士毕设核心合约：包含基于 EIP-191 的链下 AI 风控签名验证机制。
 */
contract PaymentEscrow is Ownable {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // === 状态定义 ===
    enum OrderState { PENDING, LOCKED, RELEASED, REFUNDED }

    struct Order {
        address buyer;
        address seller;
        address token;
        uint256 amount;
        bytes32 goodsHash; // 隐私数据哈希 (链下 PDF 的指纹)
        OrderState state;
        uint256 createdAt;
    }

    // === 核心存储 ===
    mapping(uint256 => Order) public orders;
    uint256 public nextOrderId;
    
    // 【关键变量】风控预言机地址 (对应 Go 后端的公钥)
    // 只有该地址签名的交易，才被允许上链
    address public riskOracle; 

    // === 事件 (用于 Go 后端监听) ===
    event OrderCreated(uint256 indexed orderId, address indexed buyer, uint256 amount, bytes32 goodsHash);
    event FundsReleased(uint256 indexed orderId, address indexed seller);
    event FundsRefunded(uint256 indexed orderId, address indexed buyer);
    event OracleUpdated(address indexed newOracle);

    // === 构造函数 ===
    constructor(address _riskOracle) Ownable(msg.sender) {
        require(_riskOracle != address(0), "Oracle cannot be zero");
        riskOracle = _riskOracle;
    }

    // === 管理功能：更换风控模型地址 ===
    function setRiskOracle(address _newOracle) external onlyOwner {
        riskOracle = _newOracle;
        emit OracleUpdated(_newOracle);
    }

    /**
     * @notice 创建订单 (必须携带后端 AI 签发的“通行证”)
     * @dev 验证逻辑：recover(hash, signature) == riskOracle
     * @param _signature 后端 AI 批准交易的数字签名
     * @param _deadline 签名的有效期，防止重放攻击
     */
    function createOrder(
        address _seller,
        address _token,
        uint256 _amount,
        bytes32 _goodsHash,
        uint256 _deadline,
        bytes calldata _signature
    ) external returns (uint256) {
        require(_amount > 0, "Amount > 0");
        require(block.timestamp < _deadline, "Signature expired");

        // --- 【学术亮点】链上验证链下风控结果 (EIP-191) ---
        // 1. 重构消息哈希 (必须与 Go 后端的打包顺序严格一致)
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                msg.sender, // 买家 (防假冒)
                _seller,
                _token,
                _amount,
                _goodsHash,
                _deadline,
                block.chainid // 防跨链攻击
            )
        );
        
        // 2. 转换为以太坊签名消息格式
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);

        // 3. 恢复签名者地址并比对
        address signer = ECDSA.recover(ethSignedMessageHash, _signature);
        require(signer == riskOracle, "Risk check failed: Invalid signature");
        // -------------------------------------------

        // 资金托管：扣款 (买家 -> 合约)
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        // 记录订单
        uint256 orderId = nextOrderId++;
        orders[orderId] = Order({
            buyer: msg.sender,
            seller: _seller,
            token: _token,
            amount: _amount,
            goodsHash: _goodsHash,
            state: OrderState.LOCKED,
            createdAt: block.timestamp
        });

        emit OrderCreated(orderId, msg.sender, _amount, _goodsHash);
        return orderId;
    }

    // 确认收货 (仅买家)
    function releaseFunds(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        require(msg.sender == order.buyer, "Not buyer");
        require(order.state == OrderState.LOCKED, "Invalid state");

        order.state = OrderState.RELEASED;
        IERC20(order.token).safeTransfer(order.seller, order.amount);
        
        emit FundsReleased(_orderId, order.seller);
    }

    // 退款 (仅卖家)
    function refund(uint256 _orderId) external {
        Order storage order = orders[_orderId];
        require(msg.sender == order.seller, "Not seller");
        require(order.state == OrderState.LOCKED, "Invalid state");

        order.state = OrderState.REFUNDED;
        IERC20(order.token).safeTransfer(order.buyer, order.amount);
        
        emit FundsRefunded(_orderId, order.buyer);
    }
}