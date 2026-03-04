'use client';

import * as React from 'react';

// V4.0 架构：我们彻底抛弃了 RainbowKit 和 Wagmi 的 Provider。
// 所有的区块链交互都将通过我们的隐形钱包引擎 (Burner Wallet) 独立完成。
// 这里保留 Providers 组件是为了以后可能引入 Redux 或 ThemeProvider 预留空间。

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}