"use client";

import { useEffect, useState } from "react";
import { parseAbi, parseEther } from "viem";
import { BACKEND_URL, MOCK_ERC20_ADDRESS, PAYMENT_ESCROW_ADDRESS, ERC20_ABI, ESCROW_ABI } from "./constants";
import { useBurnerWallet } from "../hooks/useBurnerWallet";

interface Order {
  ID: string;
  Amount: number;
  Status: string;
  Origin: string;
  Destination: string;
  RiskScore: number;
  IsFlagged: boolean;
  TxHash: string;
}

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLog, setActionLog] = useState<string>("系统就绪，等待交互...");
  
  // 引入隐形钱包
  const { account, walletClient } = useBurnerWallet();

  const fetchOrders = () => {
    fetch(`${BACKEND_URL}/api/orders`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setOrders(data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("获取订单失败:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOrders();
    // 简易轮询：每5秒自动刷新一次数据
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- Web3 智能合约交互逻辑 ---

  const handleMint = async () => {
    try {
      setActionLog("⏳ 正在请求铸造 BUSD 测试币...");
      const hash = await walletClient.writeContract({
        address: MOCK_ERC20_ADDRESS as `0x${string}`,
        abi: parseAbi(ERC20_ABI),
        functionName: 'mint',
        args: [account.address, parseEther("100000")], // 铸造 10 万个 BUSD
      });
      setActionLog(`✅ 铸造成功! 交易哈希: ${hash.substring(0, 15)}...`);
    } catch (e: any) {
      setActionLog(`❌ 铸造失败: ${e.shortMessage || e.message}`);
    }
  };

  const handleApprove = async () => {
    try {
      setActionLog("⏳ 正在授权担保合约扣款...");
      const hash = await walletClient.writeContract({
        address: MOCK_ERC20_ADDRESS as `0x${string}`,
        abi: parseAbi(ERC20_ABI),
        functionName: 'approve',
        args: [PAYMENT_ESCROW_ADDRESS as `0x${string}`, parseEther("1000000")], // 授权高额度
      });
      setActionLog(`✅ 授权成功! 交易哈希: ${hash.substring(0, 15)}...`);
    } catch (e: any) {
      setActionLog(`❌ 授权失败: ${e.shortMessage || e.message}`);
    }
  };

  const handleCreateOrder = async () => {
    try {
      setActionLog("⏳ 正在链上发起担保支付...");
      const orderId = `ORD-NEW-${Math.floor(Math.random() * 10000)}`;
      const sellerAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Anvil 账号 1 (卖家)
      const amount = parseEther("8888"); // 固定支付 8888 BUSD 演示

      const hash = await walletClient.writeContract({
        address: PAYMENT_ESCROW_ADDRESS as `0x${string}`,
        abi: parseAbi(ESCROW_ABI),
        functionName: 'createAndPayOrder',
        args: [orderId, sellerAddress as `0x${string}`, amount],
      });
      setActionLog(`✅ 支付成功! 订单号: ${orderId}, 链上哈希: ${hash.substring(0, 15)}...`);
      // 提示：实际上这里应该还要把这个订单发送给 Go 后端存入数据库，我们在下一步完善它
    } catch (e: any) {
      setActionLog(`❌ 支付失败: ${e.shortMessage || e.message}`);
    }
  };

  // 统计数据
  const totalVolume = orders.reduce((sum, o) => sum + o.Amount, 0);
  const shippedCount = orders.filter((o) => o.Status === "SHIPPED").length;
  const riskCount = orders.filter((o) => o.IsFlagged).length;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            B2B 跨境支付与物流仿真大屏 (V11.0)
          </h1>
          <p className="text-sm text-gray-400 mt-2">Hybrid Blockchain & AI Risk Radar Simulation</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium text-emerald-400">System Online</span>
        </div>
      </header>

      {/* --- Web3 仿真控制台 --- */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-200">
            🚀 Web3 仿真控制台 
            <span className="ml-3 text-xs font-mono text-emerald-500 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-800/50">
              隐形钱包已激活: {account.address.substring(0,6)}...{account.address.substring(38)}
            </span>
          </h2>
          <span className="text-sm font-mono text-gray-400 bg-gray-950 px-3 py-1 rounded-md border border-gray-800">
            {actionLog}
          </span>
        </div>
        <div className="flex space-x-4">
          <button onClick={handleMint} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20">
            1. 铸造测试币 (Mint BUSD)
          </button>
          <button onClick={handleApprove} className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-yellow-900/20">
            2. 授权担保扣款 (Approve)
          </button>
          <button onClick={handleCreateOrder} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-900/20">
            3. 链上担保支付 (Create Order)
          </button>
        </div>
      </div>

      {/* 顶部数据看板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-gray-400 text-sm font-medium">总交易流水 (USD)</h3>
          <p className="text-3xl font-bold text-white mt-2">
            ${totalVolume.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-gray-400 text-sm font-medium">在途物流 (SHIPPED)</h3>
          <p className="text-3xl font-bold text-blue-400 mt-2">{shippedCount} 笔</p>
        </div>
        <div className="bg-gray-900 border border-red-900/50 rounded-xl p-6 shadow-lg relative overflow-hidden">
          <h3 className="text-red-400 text-sm font-medium">AI 拦截高风险交易</h3>
          <p className="text-3xl font-bold text-red-500 mt-2">{riskCount} 笔</p>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* 核心数据表格 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-200">实时订单与物流仿真流</h2>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500 animate-pulse">正在从区块链与后端拉取数据...</div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-950 text-gray-400 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 font-medium">订单编号</th>
                  <th className="px-6 py-3 font-medium">金额 (USD)</th>
                  <th className="px-6 py-3 font-medium">状态</th>
                  <th className="px-6 py-3 font-medium">物流路线</th>
                  <th className="px-6 py-3 font-medium">AI 风险得分</th>
                  <th className="px-6 py-3 font-medium">链上哈希</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {orders.map((order) => (
                  <tr key={order.ID} className={`hover:bg-gray-800/50 transition-colors ${order.IsFlagged ? 'bg-red-950/20' : ''}`}>
                    <td className="px-6 py-4 font-mono text-gray-300">{order.ID}</td>
                    <td className="px-6 py-4 font-bold text-emerald-400">${order.Amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium 
                        ${order.Status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 
                          order.Status === 'SHIPPED' ? 'bg-blue-500/10 text-blue-400' : 
                          order.Status === 'PAID' ? 'bg-yellow-500/10 text-yellow-400' : 
                          'bg-gray-500/10 text-gray-400'}`}>
                        {order.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {order.Origin} <span className="text-gray-600 mx-1">→</span> {order.Destination}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${order.RiskScore > 0.8 ? 'bg-red-500' : order.RiskScore > 0.5 ? 'bg-yellow-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${order.RiskScore * 100}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs ${order.RiskScore > 0.8 ? 'text-red-400' : 'text-gray-400'}`}>
                          {order.RiskScore.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">
                      {order.TxHash.substring(0, 10)}...{order.TxHash.substring(order.TxHash.length - 4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}