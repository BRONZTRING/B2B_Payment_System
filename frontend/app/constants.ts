// 后端 API 基础地址
export const BACKEND_URL = "http://localhost:8080";

// 本地 Anvil 测试网链 ID
export const CHAIN_ID = 31337;

// --- 核心智能合约地址 (我们在 Step 3 中部署所得) ---
export const MOCK_ERC20_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const PAYMENT_ESCROW_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

// --- 极简 ABI (Application Binary Interface) ---
// 供 ethers.js 或 viem 调用智能合约时使用
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)"
];

export const ESCROW_ABI = [
  "function createAndPayOrder(string orderId, address payee, uint256 amount) external",
  "function completeOrder(string orderId) external",
  "function refundOrder(string orderId) external",
  "event OrderCreated(string orderId, address payer, address payee, uint256 amount)",
  "event OrderCompleted(string orderId)",
  "event OrderRefunded(string orderId)"
];