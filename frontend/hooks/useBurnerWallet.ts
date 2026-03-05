import { createWalletClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';

// 这里使用本地 Anvil 测试网的第0号账号私钥作为买方(Payer)的“隐形钱包”
// 在真实生产环境中，应由用户输入支付密码在前端解密本地存储的私钥
const BUYER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export function useBurnerWallet() {
  // 1. 从私钥直接派生出 Web3 账户对象
  const account = privateKeyToAccount(BUYER_PRIVATE_KEY);

  // 2. 创建连接到本地 Anvil 测试链的客户端，并扩展公共操作方法
  const walletClient = createWalletClient({
    account,
    chain: foundry,
    transport: http('http://127.0.0.1:8545'),
  }).extend(publicActions);

  return { account, walletClient };
}