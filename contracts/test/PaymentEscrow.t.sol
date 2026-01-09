// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PaymentEscrow.sol";
import "../src/MockERC20.sol";

contract PaymentEscrowTest is Test {
    PaymentEscrow public escrow;
    MockERC20 public token;

    // 定义两个虚拟用户：买家和卖家
    address buyer = address(0x1);
    address seller = address(0x2);

    // 在每个测试运行前，都会先运行这个 setup
    function setUp() public {
        // 1. 部署模拟代币 (USDT)
        token = new MockERC20("Mock USDT", "USDT");
        
        // 2. 部署托管合约
        escrow = new PaymentEscrow();

        // 3. 给买家发钱 (充值 1000 USDT)
        token.mint(buyer, 1000 * 10**18);

        // 4. 模拟买家操作：批准托管合约可以动用他的钱
        vm.startPrank(buyer); // 切换身份为 buyer
        token.approve(address(escrow), 1000 * 10**18);
        vm.stopPrank(); // 停止模拟
    }

    // 测试核心流程：创建订单 -> 释放资金
    function test_FullFlow() public {
        uint256 amount = 100 * 10**18;
        // 模拟货物的哈希值 (比如 "iPhone 15" 的哈希)
        bytes32 goodsHash = keccak256(abi.encodePacked("iPhone 15 Pro Max"));

        // === 步骤 1: 买家创建订单 ===
        vm.startPrank(buyer);
        uint256 orderId = escrow.createOrder(seller, address(token), amount, goodsHash);
        vm.stopPrank();

        // 验证：资金是否真的从买家转到了合约里？
        assertEq(token.balanceOf(buyer), 900 * 10**18, "Buyer balance should decrease");
        assertEq(token.balanceOf(address(escrow)), 100 * 10**18, "Escrow should hold funds");
        
        // 验证：订单状态是否为 LOCKED (1)
        (,,, uint256 orderAmount,, PaymentEscrow.OrderState state) = escrow.orders(orderId);
        assertEq(orderAmount, amount);
        assertEq(uint(state), uint(PaymentEscrow.OrderState.LOCKED));

        // === 步骤 2: 买家确认收货，释放资金 ===
        vm.startPrank(buyer);
        escrow.releaseFunds(orderId);
        vm.stopPrank();

        // 验证：卖家是否收到了钱？
        assertEq(token.balanceOf(seller), 100 * 10**18, "Seller should receive funds");
        assertEq(token.balanceOf(address(escrow)), 0, "Escrow should be empty");
        
        // 验证：订单状态是否为 RELEASED (2)
        (,,,,, PaymentEscrow.OrderState newState) = escrow.orders(orderId);
        assertEq(uint(newState), uint(PaymentEscrow.OrderState.RELEASED));
    }
}