// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 使用具名导入，消除警告
import {Script, console2} from "forge-std/Script.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {PaymentEscrow} from "../src/PaymentEscrow.sol";

contract DeployScript is Script {
    function run() external {
        // 从环境变量获取部署者的私钥 (Anvil 默认的测试私钥之一)
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // 开始广播交易
        vm.startBroadcast(deployerPrivateKey);

        // 1. 部署模拟的 ERC20 稳定币
        MockERC20 mockToken = new MockERC20();
        console2.log("MockERC20 deployed at:", address(mockToken));

        // 2. 部署核心支付担保合约，并将稳定币的地址传入
        PaymentEscrow escrow = new PaymentEscrow(address(mockToken));
        console2.log("PaymentEscrow deployed at:", address(escrow));

        // 结束广播
        vm.stopBroadcast();
    }
}