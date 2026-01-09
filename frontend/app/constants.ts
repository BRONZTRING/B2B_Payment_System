// 1. 合约地址 (直接使用您刚才部署生成的地址)
export const ESCROW_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
export const TOKEN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// 2. 托管合约的 ABI (接口定义 - 告诉前端有哪些函数可以调)
export const ESCROW_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_seller", "type": "address" },
      { "internalType": "address", "name": "_token", "type": "address" },
      { "internalType": "uint256", "name": "_amount", "type": "uint256" },
      { "internalType": "bytes32", "name": "_goodsHash", "type": "bytes32" }
    ],
    "name": "createOrder",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_orderId", "type": "uint256" }],
    "name": "releaseFunds",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "orders",
    "outputs": [
      { "internalType": "address", "name": "buyer", "type": "address" },
      { "internalType": "address", "name": "seller", "type": "address" },
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "bytes32", "name": "goodsHash", "type": "bytes32" },
      { "internalType": "uint8", "name": "state", "type": "uint8" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// 3. 代币合约的 ABI (只需要 approve 和 allowance)
export const TOKEN_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "account", "type": "address" }
    ],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;