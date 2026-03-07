"use client";

import { useEffect, useState, useRef } from "react";
import { parseAbi, parseEther, createPublicClient, http } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { BACKEND_URL, MOCK_ERC20_ADDRESS, PAYMENT_ESCROW_ADDRESS, ERC20_ABI, ESCROW_ABI } from "../constants";
import { useBurnerWallet } from "../../hooks/useBurnerWallet";
import GlobeVisualization from "../../components/GlobeVisualization";

const ANVIL_MNEMONIC = "test test test test test test test test test test test junk";
const publicClient = createPublicClient({ chain: foundry, transport: http('http://127.0.0.1:8545') });

const LOCAL_ESCROW_ABI = [
  "function createAndPayOrder(string orderId, address payee, uint256 amount) external",
  "function resolveDispute(string orderId, bool favorBuyer) external"
];

export default function Dashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLog, setActionLog] = useState<string>("上帝视角就绪，监控全球资金流...");
  const [detailOrder, setDetailOrder] = useState<any | null>(null);
  
  const [showTerminal, setShowTerminal] = useState(false);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  const { account, walletClient } = useBurnerWallet();

  const [fiatRates, setFiatRates] = useState<Record<string, number>>({});
  const [oracleNews, setOracleNews] = useState("正在连结预言机...");

  useEffect(() => {
    fetchUsers(); fetchOrders(); fetchOracle();
    const interval = setInterval(() => { fetchOrders(); fetchUsers(); fetchOracle(); }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchOracle = () => {
    fetch(`${BACKEND_URL}/api/oracle`).then(res => res.json()).then(data => {
      if (data.success) {
        setFiatRates(data.data.rates);
        setOracleNews(`[${data.data.time}] ${data.data.news}`);
      }
    }).catch(() => {});
  };

  const fetchUsers = () => { fetch(`${BACKEND_URL}/api/users`).then(res => res.json()).then(data => { if (data.success) setUsers(data.data); }); };
  const fetchOrders = () => { fetch(`${BACKEND_URL}/api/orders`).then(res => res.json()).then(data => { if (data.success) setOrders(data.data); setLoading(false); }).catch(() => setLoading(false)); };

  useEffect(() => {
    if (!showTerminal) return;
    setAiLogs(prev => [...prev, `[SYSTEM INIT] Connecting to EVM Node...`, `[SYSTEM INIT] AI Radar Online...`]);
    const fetchLatestBlock = async () => {
      try {
        const block = await publicClient.getBlock();
        setBlocks(prev => {
          if (prev.length > 0 && prev[0].number === block.number) return prev;
          return [block, ...prev].slice(0, 5);
        });
      } catch (e) {}
    };
    fetchLatestBlock();
    const blockInterval = setInterval(fetchLatestBlock, 2000); 
    return () => clearInterval(blockInterval);
  }, [showTerminal]);

  useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [aiLogs]);

  const getUserName = (id: number) => { const u = users.find(user => user.ID === id); return u ? u.CompanyName : "Unknown Entity"; };
  const getUserStatus = (id: number) => { const u = users.find(user => user.ID === id); return u ? u.HealthStatus : "UNKNOWN"; };
  const addAiLog = (msg: string) => setAiLogs(prev => [...prev, msg]);

  const handleUnlockUser = async (userId: number, userName: string) => {
    if(!confirm(`最高指令：确定要驳回 AI 的风控拦截，强行恢复【${userName}】的账户状态吗？`)) return;
    try {
      setActionLog(`⏳ 正在重置用户 [${userName}] 的健康状态...`);
      const res = await fetch(`${BACKEND_URL}/api/users/${userId}/unlock`, { method: 'PUT' });
      if (res.ok) {
        setActionLog(`✅ 解锁成功！用户 [${userName}] 已恢复交易权限。`);
        addAiLog(`[⚠️ ADMIN OVERRIDE] User ${userId} restored to ACTIVE.`);
        fetchUsers(); 
      }
    } catch (e: any) {}
  };

  const handleResolveDispute = async (orderId: string, favorBuyer: boolean) => {
    if(!confirm(`【国际仲裁庭指令】\n\n确定要裁决该订单 ${favorBuyer ? '【退款给买家】' : '【强制结款给卖家】'} 吗？此上链操作不可逆！`)) return;
    try {
        setActionLog(`⏳ 正在将仲裁结果广播至区块链...`);
        addAiLog(`[⚖️ ARBITRATION] Admin executing resolveDispute for Order ${orderId}. Favor Buyer: ${favorBuyer}`);
        await walletClient.writeContract({ address: PAYMENT_ESCROW_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ESCROW_ABI), functionName: 'resolveDispute', args: [orderId, favorBuyer] });
        const finalStatus = favorBuyer ? "REFUNDED" : "COMPLETED";
        await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: finalStatus }) });
        setActionLog(`✅ 仲裁执行完毕！资金已由智能合约重新分配。`); fetchOrders();
    } catch (e: any) { setActionLog(`❌ 仲裁上链失败`); }
  };

  const handleCreateOrder = async () => {
    if (users.length === 0) return setActionLog("等待数据加载...");
    try {
      if (!showTerminal) setShowTerminal(true); 
      setActionLog("⏳ 正在生成全局随机贸易节点...");
      const orderId = `ORD-NEW-${Math.floor(Math.random() * 10000)}`;
      const buyers = users.filter(u => u.Role === 'buyer');
      const sellers = users.filter(u => u.Role === 'seller');
      const randomBuyer = buyers[Math.floor(Math.random() * buyers.length)];
      const randomSeller = sellers[Math.floor(Math.random() * sellers.length)];
      const sellerAccount = mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: randomSeller.AccountIndex });
      
      const isBadApple = Math.random() > 0.8; 
      const amountNum = isBadApple ? (250000 + Math.floor(Math.random()*50000)) : (Math.floor(Math.random() * 50000) + 10000); 
      const amount = parseEther(amountNum.toString());

      await walletClient.writeContract({ address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(ERC20_ABI), functionName: 'mint', args: [account.address, amount] });
      await walletClient.writeContract({ address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(ERC20_ABI), functionName: 'approve', args: [PAYMENT_ESCROW_ADDRESS as `0x${string}`, amount] });

      const hash = await walletClient.writeContract({ address: PAYMENT_ESCROW_ADDRESS as `0x${string}`, abi: parseAbi(["function createAndPayOrder(string, address, uint256) external"]), functionName: 'createAndPayOrder', args: [orderId, sellerAccount.address, amount] });
      
      const res = await fetch(`${BACKEND_URL}/api/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId, buyer_id: randomBuyer.ID, seller_id: randomSeller.ID, payment_type: "ESCROW", amount: amountNum, fiat_amount: amountNum * 90, currency: randomBuyer.FiatCurrency,
          origin: "Global Hub", destination: isBadApple ? "Pyongyang, DPRK" : "Normal Port", txHash: hash
        })
      });

      if (res.ok) {
        const resultData = await res.json();
        if (resultData.data?.IsFlagged || isBadApple) {
            addAiLog(`[🔴 AI ALERT] OUTLIER DETECTED! Executing degradation for ID ${randomBuyer.ID}...`);
        } else { addAiLog(`[🟢 AI PASS] Transaction verified.`); }
        setActionLog(`✅ 完美闭环! 订单 ${orderId} 成功列装大屏。`);
        fetchOrders(); fetchUsers();
      }
    } catch (e: any) { setActionLog(`❌ 失败`); }
  };

  const totalVolume = orders.reduce((sum, o) => sum + o.Amount, 0);
  const shippedCount = orders.filter((o) => o.Status === "SHIPPED").length;
  const riskCount = orders.filter((o) => o.IsFlagged).length;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans relative overflow-x-hidden pb-8">
      <style>{`
        @keyframes ticker { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        .animate-ticker { animation: ticker 20s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #064e3b; border-radius: 4px; }
      `}</style>

      <div className="bg-gray-900 border-b border-emerald-900/50 text-emerald-400 px-6 py-2 text-xs font-mono flex items-center overflow-hidden">
         <span className="font-bold text-white mr-4 shrink-0 flex items-center">
            <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-ping"></span>GLOBAL MACRO ORACLE
         </span>
         <div className="whitespace-nowrap animate-ticker inline-block">
             <span className={oracleNews.includes("🚨") || oracleNews.includes("📉") || oracleNews.includes("🔥") ? "text-red-400 font-bold" : "text-emerald-400"}>
                {oracleNews}
             </span>
             <span className="mx-10 text-gray-600">|</span>
             <span className="text-gray-400">RATES (vs USD): </span>
             <span className="ml-4 text-white">EUR {fiatRates["EUR"]?.toFixed(4)}</span>
             <span className="ml-4 text-white">GBP {fiatRates["GBP"]?.toFixed(4)}</span>
             <span className="ml-4 text-white">CNY {fiatRates["CNY"]?.toFixed(4)}</span>
             <span className="ml-4 text-white">RUB {fiatRates["RUB"]?.toFixed(4)}</span>
             <span className="ml-4 text-white">JPY {fiatRates["JPY"]?.toFixed(4)}</span>
         </div>
      </div>

      <div className="p-8">
      <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">底座监控：B2B 区块链与 AI 仿真大屏</h1>
          <p className="text-sm text-gray-400 mt-2">最高权限：透视所有实体企业、交易流向与风控决策</p>
        </div>
        <div className="flex items-center space-x-4">
          <button onClick={() => setShowTerminal(!showTerminal)} className={`text-sm font-bold px-4 py-2 rounded-lg transition border ${showTerminal ? 'bg-emerald-900/40 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700'}`}>{showTerminal ? '🔽 收起底层解析终端' : '⚡ 开启全息底层节点'}</button>
          <a href="/" className="text-sm bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition border border-gray-600">退出上帝视角</a>
        </div>
      </header>

      {showTerminal && (
        <div className="mb-8 bg-black/90 border border-emerald-900/50 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.1)] p-6 font-mono text-sm h-80 flex gap-6 relative overflow-hidden">
            <div className="w-1/2 flex flex-col h-full">
                <h3 className="text-emerald-500 font-bold mb-3 flex items-center border-b border-emerald-900/50 pb-2"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>EVM MAINNET NODE (Port 8545)</h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {blocks.map((b) => (
                        <div key={b.hash} className="bg-gray-900/80 p-3 rounded border border-gray-800">
                            <div className="flex justify-between text-emerald-400 mb-1"><span className="font-bold">BLOCK #{b.number.toString()}</span></div>
                            <p className="text-gray-400 text-xs truncate">Hash: {b.hash}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="w-1/2 flex flex-col h-full border-l border-emerald-900/30 pl-6">
                <h3 className="text-blue-400 font-bold mb-3 flex items-center border-b border-blue-900/50 pb-2"><span className="text-lg mr-2">👁️‍🗨️</span> AI ANOMALY DETECTION RADAR</h3>
                <div ref={terminalRef} className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar pb-4">
                    {aiLogs.map((log, i) => (<div key={i} className={`text-xs ${log.includes('RED') || log.includes('ALERT') ? 'text-red-400' : 'text-blue-300'}`}><span className="text-gray-600 mr-2">{'>'}</span>{log}</div>))}
                </div>
            </div>
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-200">🚀 全局压力测试与模拟控制台</h2>
          <span className="text-sm font-mono text-emerald-400 bg-emerald-950/30 px-3 py-1 rounded-md border border-emerald-900">{actionLog}</span>
        </div>
        <div className="flex space-x-4 w-full">
          <button onClick={handleCreateOrder} className="w-full py-4 bg-gradient-to-r from-blue-900 to-emerald-900 hover:from-blue-800 hover:to-emerald-800 text-white rounded-xl text-sm font-black tracking-widest transition-all border border-blue-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            ⚡ 启动全球贸易网络仿真流 (INJECT RANDOM ON-CHAIN TRANSACTION)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm font-medium">总资金流量 (BUSD)</h3><p className="text-3xl font-bold text-white mt-2">${totalVolume.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-gray-400 text-sm font-medium">在途物流 (SHIPPED)</h3><p className="text-3xl font-bold text-blue-400 mt-2">{shippedCount} 笔</p>
        </div>
        <div className="bg-gray-900 border border-red-900/50 rounded-xl p-6 relative overflow-hidden">
          <h3 className="text-red-400 text-sm font-medium">AI 拦截池</h3><p className="text-3xl font-bold text-red-500 mt-2">{riskCount} 笔</p>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl"></div>
        </div>
      </div>

      <div className="mb-8 relative z-0">
        <GlobeVisualization orders={orders} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between">
          <h2 className="text-lg font-semibold text-gray-200">底层数据流明细 & 法务仲裁庭</h2>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-950 text-gray-400 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 font-medium">业务哈希</th>
                  <th className="px-6 py-3 font-medium">汇款方 &rarr; 收款方</th>
                  <th className="px-6 py-3 font-medium">底层资产流转</th>
                  <th className="px-6 py-3 font-medium">AI 判定 (AML)</th>
                  <th className="px-6 py-3 font-medium text-right">人工仲裁 / 审计日志</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {orders.map((order) => {
                  const isBuyerRestricted = getUserStatus(order.BuyerID) === 'RESTRICTED';
                  return (
                  <tr key={order.ID} className={`hover:bg-gray-800/80 transition-colors ${order.Status === 'DISPUTED' ? 'bg-orange-950/20' : order.IsFlagged ? 'bg-red-950/10' : ''}`}>
                    <td className="px-6 py-4 font-mono text-gray-400">
                      <div className="flex items-center">
                        {order.ID}
                        {order.IsFinanced && <span className="ml-2 bg-purple-900/30 text-purple-400 border border-purple-700/50 px-1 py-0.5 rounded text-[10px]">已垫资</span>}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-1">{order.Status} | {order.PaymentType}</div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className={`font-bold ${isBuyerRestricted ? 'text-red-400 line-through' : 'text-blue-300'}`}>{getUserName(order.BuyerID)}</span>
                          {isBuyerRestricted && <span className="ml-2 text-[10px] bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded">受限</span>}
                        </div>
                        <div className="text-gray-500 text-xs mt-1">&darr; 汇往</div>
                        <div className="text-emerald-300 font-bold">{getUserName(order.SellerID)}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-emerald-400 font-bold">${order.Amount.toLocaleString()} <span className="text-xs text-gray-500">BUSD</span></td>
                    <td className="px-6 py-4">
                      {order.Status === 'DISPUTED' ? (
                          <span className="text-xs font-black text-orange-400 border border-orange-700 bg-orange-900/30 px-2 py-1 rounded animate-pulse">⚖️ 仲裁死锁</span>
                      ) : (
                        <span className={`text-xs font-bold px-2 py-1 rounded border ${order.IsFlagged ? 'text-red-400 bg-red-900/30 border-red-800' : 'text-emerald-400 bg-emerald-900/30 border-emerald-800'}`}>
                          {order.IsFlagged ? `高危 (${order.RiskScore.toFixed(2)})` : `安全 (${order.RiskScore.toFixed(2)})`}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3 items-center">
                          {order.Status === 'DISPUTED' && (
                             <div className="flex bg-orange-950/40 border border-orange-800 rounded p-1">
                               <button onClick={() => handleResolveDispute(order.ID, true)} className="text-xs bg-gray-800 hover:bg-gray-700 text-orange-300 px-3 py-1.5 rounded-l border-r border-gray-600 transition">👨‍⚖️ 判给买家 (退款)</button>
                               <button onClick={() => handleResolveDispute(order.ID, false)} className="text-xs bg-gray-800 hover:bg-gray-700 text-emerald-400 px-3 py-1.5 rounded-r transition">👨‍⚖️ 判给卖家 (结汇)</button>
                             </div>
                          )}

                          {isBuyerRestricted && order.IsFlagged && (
                            <button onClick={() => handleUnlockUser(order.BuyerID, getUserName(order.BuyerID))} className="text-xs bg-amber-900/40 text-amber-400 border border-amber-700/50 px-3 py-1.5 rounded hover:bg-amber-800 transition">🔓 驳回AI并解锁</button>
                          )}
                          <button onClick={() => setDetailOrder(order)} className="text-blue-400 hover:text-blue-300 font-bold text-xs bg-blue-900/20 px-3 py-1.5 rounded-md border border-blue-900 transition">📄 提取审计报表</button>
                        </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
        </div>
      </div>
      </div>

      {detailOrder && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-sm w-full max-w-3xl shadow-2xl relative text-gray-900 print:w-full print:h-screen print:shadow-none print:m-0">
            <div className="bg-gray-100 px-6 py-3 flex justify-between items-center border-b border-gray-200 print:hidden">
              <span className="text-sm font-bold text-gray-500 flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> 区块链固化凭证提取成功</span>
              <div className="flex gap-4">
                <button onClick={() => window.print()} className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded shadow hover:bg-blue-700 transition">🖨️ 导出/打印 PDF</button>
                <button onClick={() => setDetailOrder(null)} className="text-gray-500 hover:text-red-500 text-2xl leading-none">&times;</button>
              </div>
            </div>

            <div className="p-12 relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                <div className="absolute top-10 right-10 w-32 h-32 border-4 border-emerald-600/30 rounded-full flex items-center justify-center text-emerald-600/30 font-bold text-xl -rotate-12 pointer-events-none select-none">
                  ON-CHAIN<br/>VERIFIED
                </div>

                <div className="border-b-2 border-gray-800 pb-6 mb-8 flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter text-gray-900 mb-2">SMART CONTRACT AUDIT REPORT</h2>
                        <p className="text-sm text-gray-500 font-mono">TrustPay Global Settlement Network</p>
                    </div>
                    <div className="text-right text-xs text-gray-500 font-mono space-y-1">
                        <p>Date: {new Date(detailOrder.CreatedAt).toUTCString()}</p>
                        <p>Report ID: AR-{detailOrder.ID.split('-')[2]}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-10 mb-8 text-sm">
                    <div className="bg-gray-50 p-5 rounded border border-gray-200">
                        <h4 className="font-bold text-gray-400 uppercase mb-3 text-xs tracking-widest">Payer (Origin)</h4>
                        <p className="font-black text-lg text-blue-900 mb-1">{getUserName(detailOrder.BuyerID)}</p>
                        <p className="text-gray-600 font-mono text-xs">Origin Node: {detailOrder.Origin}</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded border border-gray-200">
                        <h4 className="font-bold text-gray-400 uppercase mb-3 text-xs tracking-widest">Payee (Destination)</h4>
                        <p className="font-black text-lg text-emerald-900 mb-1">{getUserName(detailOrder.SellerID)}</p>
                        <p className="text-gray-600 font-mono text-xs">Dest Node: {detailOrder.Destination}</p>
                    </div>
                </div>

                <div className="mb-10 border border-gray-200 rounded overflow-hidden">
                    <div className="bg-gray-800 text-white px-5 py-3 text-sm font-bold tracking-widest uppercase">Cryptographic Proof & Settlement</div>
                    <div className="p-5 space-y-4 text-sm font-mono bg-white">
                        <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                            <span className="text-gray-500">Order Ref:</span>
                            <span className="font-bold text-gray-900">{detailOrder.ID}</span>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                            <span className="text-gray-500">EVM TxHash:</span>
                            <span className="text-blue-600 break-all text-xs w-2/3 text-right">{detailOrder.TxHash}</span>
                        </div>
                        
                        {detailOrder.IsFinanced && (
                          <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                              <span className="text-purple-600 font-bold uppercase">DeFi Financing:</span>
                              <span className="font-bold text-purple-700 bg-purple-100 px-2 rounded">80% Advanced Collateral Loan</span>
                          </div>
                        )}

                        <div className="flex justify-between border-b border-dashed border-gray-200 pb-2">
                            <span className="text-gray-500">Fiat Converted:</span>
                            <span className="font-bold text-gray-900">{detailOrder.FiatAmount.toLocaleString()} {detailOrder.Currency}</span>
                        </div>
                        <div className="flex justify-between pt-2 text-lg">
                            <span className="text-gray-600 font-sans font-bold">Underlying Asset Locked:</span>
                            <span className="font-black text-emerald-600">{detailOrder.Amount.toLocaleString()} BUSD</span>
                        </div>
                    </div>
                </div>

                <div className={`p-5 rounded border ${detailOrder.Status === 'DISPUTED' ? 'bg-orange-50 border-orange-200' : detailOrder.IsFlagged ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <h4 className="font-bold text-gray-800 mb-2 text-sm">AI AML & Legal Status</h4>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200/50">
                        <span className="text-sm font-bold text-gray-700">Final Verdict:</span>
                        <span className={`px-3 py-1 font-bold text-sm rounded ${detailOrder.Status === 'DISPUTED' ? 'bg-orange-600 text-white' : detailOrder.IsFlagged ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                            {detailOrder.Status === 'DISPUTED' ? 'LEGAL ARBITRATION PENDING' : detailOrder.IsFlagged ? `HIGH RISK (Score: ${detailOrder.RiskScore?.toFixed(3) || '0.99'})` : `CLEARED`}
                        </span>
                    </div>
                </div>
                
                <p className="text-[10px] text-gray-400 text-center mt-10">This document is cryptographically verified by the TrustPay immutable ledger. Alteration of this digital or printed copy invalidates its authenticity.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}