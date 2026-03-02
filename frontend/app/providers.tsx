'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  getDefaultWallets,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import {
  trustWallet,
  ledgerWallet,
} from '@rainbow-me/rainbowkit/wallets';
import {
  sepolia,
} from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http } from 'wagmi';
import '@rainbow-me/rainbowkit/styles.css';

// 1. 配置 Wagmi 客户端
// 这里的 projectId 是 WalletConnect 的 ID，演示用可以使用公共 ID 或留空
// 也可以去 cloud.walletconnect.com 申请一个免费的
const { wallets } = getDefaultWallets();

const config = getDefaultConfig({
  appName: 'B2B Payment System',
  projectId: 'YOUR_PROJECT_ID', // 如果没有，RainbowKit 会由默认 ID，可能有速率限制
  wallets: [
    ...wallets,
    {
      groupName: 'Other',
      wallets: [trustWallet, ledgerWallet],
    },
  ],
  chains: [
    sepolia, // 我们只部署在 Sepolia 测试网
  ],
  transports: {
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'), // 强制使用 HTTP RPC
  },
  ssr: true, // 服务端渲染支持
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}