// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 使用具名导入，消除警告
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev 用于本地测试的模拟美元稳定币 (B2B USD)
 */
contract MockERC20 is ERC20 {
    constructor() ERC20("B2B USD", "BUSD") {
        // 部署时，给部署者（我们的测试钱包）铸造 1,000,000 个代币
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    // 为了方便系统仿真，允许任何人自由铸币（仅限测试网/本地节点）
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}