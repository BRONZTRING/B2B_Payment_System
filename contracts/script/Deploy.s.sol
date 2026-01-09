// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/PaymentEscrow.sol";
import "../src/MockERC20.sol";

contract DeployScript is Script {
    function run() external {
        // 获取 Anvil 默认的第一个私钥用于部署
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerPrivateKey);

        // 1. 部署模拟 USDT
        MockERC20 token = new MockERC20("Mock USDT", "USDT");
        console.log("MockERC20 deployed at:", address(token));

        // 2. 部署托管合约
        PaymentEscrow escrow = new PaymentEscrow();
        console.log("PaymentEscrow deployed at:", address(escrow));

        vm.stopBroadcast();
    }
}