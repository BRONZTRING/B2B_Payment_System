// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 引入 OpenZeppelin 的 ERC20 标准实现
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev 用于测试的模拟稳定币 (比如模拟 USDT 或 CNH)
 */
contract MockERC20 is ERC20 {
    // 构造函数：设定代币名称(name)和符号(symbol)
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        // 部署时给自己铸造 100万个币 (精度18位)
        // 1000000 * 10^18
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    // 为了测试方便，允许任何人调用此函数给自己印钱 (生产环境绝对不能有这个!)
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}


