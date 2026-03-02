'use client';

import React, { useState } from 'react';
import { ArrowUpRight, ShieldCheck, Clock, Wallet, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseUnits, keccak256, toHex } from 'viem';
// 引入刚才配置好的合约地址和ABI
import { ESCROW_ADDRESS, ESCROW_ABI, TOKEN_ADDRESS, TOKEN_ABI } from './constants';

// 模拟数据 (UI展示用)
const MOCK_TRANSACTIONS = [
  { id: 'ORD-7782-XJ', counterparty: 'Shenzhen Electronics Ltd.', amount: '50,000.00', currency: 'USDT', status: 'LOCKED', date: '2 mins ago' },
  { id: 'ORD-9921-MC', counterparty: 'Global Logistics GmbH', amount: '12,500.00', currency: 'USDT', status: 'RELEASED', date: '2 hours ago' },
];

export default function PaymentDashboard() {
  const { address } = useAccount();
  
  // Wagmi 钩子：用于写合约
  const { writeContract, data: hash, isPending } = useWriteContract();
  
  // 监听交易是否上链确认
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // 状态：是否已授权
  const [isApproved, setIsApproved] = useState(false);

  // 1. 授权 (Approve)
  const handleApprove = async () => {
    if (!address) return alert("请先连接钱包！");
    try {
      console.log("正在申请授权...");
      
      // 【修改点】不再授权无限金额，只授权本次交易需要的 100 USDT
      // 这样可能减少 MetaMask 的部分风险提示
      const amountToApprove = parseUnits('100', 18);
      
      writeContract({
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'approve',
        args: [ESCROW_ADDRESS, amountToApprove],
      });
      
      // 模拟授权成功状态
      setTimeout(() => setIsApproved(true), 2000); 
    } catch (error) {
      console.error("授权失败:", error);
    }
  };

  // 2. 支付 (Create Order)
  const handleCreateOrder = async () => {
    if (!address) return alert("请先连接钱包！");

    try {
      console.log("正在发起支付...");
      
      // 模拟订单数据
      const amount = parseUnits('100', 18); // 100 USDT
      const goodsHash = keccak256(toHex("iPhone 16 Pro Max")); // 计算哈希
      const sellerAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Anvil 的第二个测试账户

      // 调用合约的 createOrder 函数
      writeContract({
        address: ESCROW_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'createOrder',
        args: [
          sellerAddress,
          TOKEN_ADDRESS,
          amount,
          goodsHash
        ],
      });
      
    } catch (error) {
      console.error("支付失败:", error);
      alert("支付失败，请检查控制台(F12)");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">SecureChain <span className="text-indigo-400">Pay</span></span>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700 text-xs font-mono text-emerald-400">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                Sepolia Testnet
             </div>
             <ConnectButton showBalance={false} chainStatus="none" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* 顶部操作区 */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">采购支付概览</h1>
            <p className="text-slate-400">当前环境: 本地全栈联调模式</p>
          </div>
          
          <div className="flex gap-3">
            {/* 步骤 1: 授权按钮 */}
            {!isApproved && !isConfirmed && (
               <button 
               onClick={handleApprove}
               disabled={isPending}
               className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all"
             >
               {isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
               步骤 1: 授权合约扣款
             </button>
            )}

            {/* 步骤 2: 支付按钮 */}
            <button 
              onClick={handleCreateOrder}
              disabled={!isApproved && !isConfirmed} // 未授权时禁用
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${
                isApproved ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isPending || isConfirming ? <Loader2 className="animate-spin" /> : <ArrowUpRight className="w-5 h-5" />}
              {isPending ? '钱包签名中...' : isConfirming ? '链上确认中...' : '步骤 2: 发起支付测试'}
            </button>
          </div>
        </div>

        {/* 交易状态提示条 */}
        {hash && (
          <div className="p-4 bg-slate-900 border border-emerald-500/30 rounded-lg break-all font-mono text-xs text-slate-400 animate-in fade-in slide-in-from-top-2">
            <div className="text-emerald-400 mb-1 font-bold">🚀 交易已发送!</div>
            <div>Hash: {hash}</div>
            {isConfirmed && <div className="text-white mt-2 font-bold bg-emerald-500/20 p-2 rounded">✅ 链上确认成功！资金已锁定在智能合约中。</div>}
          </div>
        )}

        {/* 资产卡片 (UI展示) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 relative overflow-hidden">
            <Wallet className="absolute top-0 right-0 w-24 h-24 text-white opacity-5 p-4" />
            <h3 className="text-slate-400 text-sm font-medium mb-1">钱包余额</h3>
            <div className="text-3xl font-bold text-white tracking-tight">10,000.00 <span className="text-lg text-slate-500 font-normal">ETH</span></div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative">
            <h3 className="text-slate-400 text-sm font-medium mb-1">智能合约托管中</h3>
            <div className="text-3xl font-bold text-white tracking-tight">0.00 <span className="text-lg text-slate-500 font-normal">USDT</span></div>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="text-slate-400 text-sm font-medium mb-1">AI 风控系统</h3>
            <div className="flex items-center gap-2 mt-2 text-emerald-400 text-sm">
               <ShieldCheck className="w-4 h-4" /> 系统运行正常
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}