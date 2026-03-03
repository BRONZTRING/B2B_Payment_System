'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, parseUnits } from 'viem';
import axios from 'axios';
import { 
  MOCK_TOKEN_ADDRESS, 
  ESCROW_CONTRACT_ADDRESS, 
  ERC20_ABI, 
  ESCROW_ABI 
} from './constants';

export default function Home() {
  const { address, isConnected } = useAccount();
  
  // 表单状态
  const [seller, setSeller] = useState('');
  const [amount, setAmount] = useState('');
  const [goods, setGoods] = useState('High-value chips batch #2024');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // 链上交互 Hooks
  const { writeContractAsync } = useWriteContract();

  // 添加日志辅助函数
  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  // === 核心逻辑：提交订单 ===
  const handleCreateOrder = async () => {
    if (!isConnected || !address) return alert('Please connect wallet');
    setLoading(true);
    setLogs([]); // 清空旧日志

    try {
      // Step 1: 检查并授权 USDT (Approve)
      addLog("1. Requesting Token Approval...");
      const approveTx = await writeContractAsync({
        address: MOCK_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ESCROW_CONTRACT_ADDRESS, parseEther(amount)], // 简单起见，这里假设 MockUSDT 精度是 18
      });
      addLog(`> Approval Tx Sent: ${approveTx}`);
      // 在真实场景应等待 approve 确认，这里为演示流畅性直接进行下一步 (本地链极快)

      // Step 2: 请求后端 AI 风控签名
      addLog("2. Calling Risk Control API (Go Backend)...");
      const response = await axios.post('http://localhost:8080/api/orders', {
        buyer: address,
        seller: seller,
        token: MOCK_TOKEN_ADDRESS,
        amount: parseEther(amount).toString(), // 转为 Wei 字符串传给后端
        goods_content: goods,
        chain_id: 31337 // 本地链 ID (Anvil 默认)
      });

      const { signature, goods_hash, risk_score } = response.data;
      addLog(`> AI Risk Check Passed! Score: ${risk_score}`);
      addLog(`> Got Signature: ${signature.slice(0, 10)}...`);

      // Step 3: 上链创建订单 (Create Order)
      addLog("3. Creating Order on Blockchain...");
      const createTx = await writeContractAsync({
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'createOrder',
        args: [
          seller as `0x${string}`,
          MOCK_TOKEN_ADDRESS,
          parseEther(amount),
          goods_hash as `0x${string}`,
          BigInt(Math.floor(Date.now() / 1000) + 3600), // deadline: 1 hour later
          signature as `0x${string}`
        ],
      });
      
      addLog(`✅ Order Created Successfully! Tx Hash: ${createTx}`);
      alert('Order Created on Chain!');

    } catch (error: any) {
      console.error(error);
      addLog(`❌ Error: ${error.message || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50 text-gray-800 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* 头部导航 */}
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold text-blue-900">
            🛡️ B2B Secure Payment <span className="text-sm font-normal text-gray-500">(Master Thesis Demo)</span>
          </h1>
          <ConnectButton />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* 左侧：表单区域 */}
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">📝</span> 
              Create New Order
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seller Address</label>
                <input 
                  type="text" 
                  placeholder="0x..." 
                  value={seller}
                  onChange={e => setSeller(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
                <p className="text-xs text-gray-400 mt-1">Try using one of the Anvil accounts</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Mock USDT)</label>
                <input 
                  type="number" 
                  placeholder="1000" 
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goods Description (Privacy Protected)</label>
                <textarea 
                  rows={3}
                  value={goods}
                  onChange={e => setGoods(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-xs text-green-600 mt-1">✨ Content will be hashed. Only hash goes on-chain.</p>
              </div>

              <button
                onClick={handleCreateOrder}
                disabled={loading || !isConnected}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-md transition-all
                  ${loading || !isConnected 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg transform hover:-translate-y-0.5'
                  }`}
              >
                {loading ? 'Processing Risk Check...' : '🚀 Submit Order with AI Risk Check'}
              </button>
            </div>
          </div>

          {/* 右侧：系统日志终端 */}
          <div className="bg-gray-900 p-6 rounded-xl shadow-lg text-green-400 font-mono text-sm overflow-hidden flex flex-col">
            <h2 className="text-gray-400 mb-4 border-b border-gray-700 pb-2 flex justify-between">
              <span>&gt; System Terminal</span>
              <span className="text-xs bg-gray-800 px-2 py-0.5 rounded">Layer 2 Connected</span>
            </h2>
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px]">
              {logs.length === 0 && (
                <div className="text-gray-600 italic">Waiting for interaction...</div>
              )}
              {logs.map((log, i) => (
                <div key={i} className="break-all animate-pulse-short">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部说明 */}
        <div className="mt-12 text-center text-gray-400 text-sm">
          <p>© 2026 Master Thesis Project. Powered by Sepolia (Simulated), Go, and Next.js.</p>
        </div>
      </div>
    </main>
  );
}