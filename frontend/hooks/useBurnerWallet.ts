import { useState, useEffect } from 'react';
import { createWalletClient, http, publicActions, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { foundry } from 'viem/chains';

const BURNER_WALLET_KEY = 'b2b_burner_wallet_private_key';

export function useBurnerWallet() {
  const [account, setAccount] = useState<any>(null);
  const [walletClient, setWalletClient] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 1. 读取或生成本地私钥
    let pk = localStorage.getItem(BURNER_WALLET_KEY) as `0x${string}` | null;

    if (!pk) {
      // 模拟生成 32 字节私钥
      const randomBytes = crypto.getRandomValues(new Uint8Array(32));
      pk = `0x${Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
      localStorage.setItem(BURNER_WALLET_KEY, pk);
      console.log("🌟 [Burner Wallet] 新商户，已静默生成本地私钥!");
    }

    const burnerAccount = privateKeyToAccount(pk);
    setAccount(burnerAccount);

    // 2. 创建无感知签名的 Wallet Client
    const client = createWalletClient({
      account: burnerAccount,
      chain: foundry,
      transport: http('http://127.0.0.1:8545'),
    }).extend(publicActions); // 扩展读取链上数据的功能

    setWalletClient(client);
    setIsReady(true);
  }, []);

  return {
    address: account?.address as Address,
    walletClient,
    isReady
  };
}