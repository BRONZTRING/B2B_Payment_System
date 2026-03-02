// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";
import "../src/PaymentEscrow.sol";

contract DeployScript is Script {
    function run() external {
        // 1. 读取环境变量中的私钥
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // 2. 推导出部署者的地址 (我们将把它设为 Risk Oracle)
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 3. 部署模拟 USDT
        MockERC20 usdt = new MockERC20("Mock USDT", "mUSDT");
        console.log("Mock USDT deployed at:", address(usdt));

        // 4. 部署核心合约 【修复点在此】
        // 我们传入 'deployer' 作为构造函数参数，指定当前账户为风控管理员
        PaymentEscrow escrow = new PaymentEscrow(deployer);
        console.log("PaymentEscrow deployed at:", address(escrow));

        vm.stopBroadcast();
    }
}