// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev 用于测试的模拟稳定币 (如 MockUSDT)。
 * 包含无限铸币功能 (Faucet)，方便论文演示时随时获取测试资金。
 */
contract MockERC20 is ERC20 {
    // 构造函数：部署时设定代币名称 (如 "Test USDT", "TUSDT")
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // 部署时默认给开发者 (你) 铸造 100万枚，精度 18
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    // === 关键功能：水龙头 (Faucet) ===
    // 允许任何人 (包括测试脚本) 调用此函数给自己发钱
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}