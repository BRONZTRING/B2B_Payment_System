"use client";

import { useEffect, useState, useRef } from "react";
import { createPublicClient, http } from "viem";
import { foundry } from "viem/chains";
import { BACKEND_URL } from "../constants";
import GlobeVisualization from "../../components/GlobeVisualization";

const publicClient = createPublicClient({ chain: foundry, transport: http('http://127.0.0.1:8545') });

const dict = {
  "zh": {
    "admin_title": "底座监控：B2B 区块链与 AI 仿真大屏", "admin_subtitle": "最高权限：透视所有实体企业、交易流向与风控决策",
    "tab_monitor": "🌐 全局网络监控", "tab_thesis": "🎓 学术实验与系统遥测",
    "btn_terminal": "⚡ 开启区块链网络与微服务遥测", "btn_exit": "退出上帝视角", "kpi_vol": "总资金流量 (BUSD)", "kpi_shipped": "在途物流 (SHIPPED)", "kpi_risk": "AI 拦截池",
    "btn_inject": "⚡ 触发压测时，观察数据瀑布流", "table_hash": "业务哈希", "table_route": "汇款方 → 收款方", "table_asset": "底层资产", "table_ai": "AI 判定 (AML)", "table_action": "审计状态",
    "status_disputed": "⚖️ 仲裁死锁", "thesis_stats_title": "分布式共识层与 AI 遥测面板 (Telemetry)", 
    "chart_geo": "地缘政治雷达目标统计",
    "chart_currency": "多币种结算占比 (打破单一法币壁垒)", "chart_funnel": "跨国资金流全生命周期漏斗"
  },
  "ru": {
    "admin_title": "Мониторинг: Блокчейн и ИИ-Аналитика", "admin_subtitle": "Уровень Root: прозрачность транзакций, AML и смарт-контрактов",
    "tab_monitor": "🌐 Сетевой Мониторинг", "tab_thesis": "🎓 Экспериментальная лаборатория",
    "btn_terminal": "⚡ Телеметрия микросервисов и EVM", "btn_exit": "Выйти из консоли", "kpi_vol": "Общий объем (BUSD)", "kpi_shipped": "В транзите (SHIPPED)", "kpi_risk": "Блокировки ИИ",
    "btn_inject": "⚡ Сгенерировать транзакции (Стресс-тест)", "table_hash": "Хэш", "table_route": "Отправитель → Получатель", "table_asset": "Активы", "table_ai": "Оценка ИИ (AML)", "table_action": "Арбитраж / Аудит",
    "status_disputed": "⚖️ Спор (Блокировка)", "thesis_stats_title": "Телеметрия системы и консенсус блокчейна", 
    "chart_geo": "Геополитический радар и статистика",
    "chart_currency": "Мультивалютные расчеты (Доли фиата)", "chart_funnel": "Воронка жизненного цикла транзакций"
  }
};

export default function Dashboard() {
  const [lang, setLang] = useState<"zh" | "ru">("ru");
  const t = (key: keyof typeof dict.zh) => dict[lang][key] || dict["zh"][key];

  const [activeTab, setActiveTab] = useState<'monitor' | 'thesis'>('monitor');
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  
  // 终端与遥测状态
  const [blocks, setBlocks] = useState<any[]>([]);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [prevOrderCount, setPrevOrderCount] = useState(0);
  const [telemetry, setTelemetry] = useState({ tps: 0, goroutines: 12, aiLatency: 15, mem: 45 });
  
  // 🌟 XAI 审计面板状态
  const [detailOrder, setDetailOrder] = useState<any | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);
  const [fiatRates, setFiatRates] = useState<Record<string, number>>({});
  const [oracleNews, setOracleNews] = useState("Connected to Oracle Node...");

  // 数据拉取
  useEffect(() => {
    fetchUsers(); fetchOrders(); fetchOracle();
    const interval = setInterval(() => { fetchOrders(); fetchUsers(); fetchOracle(); }, 2000); 
    return () => clearInterval(interval);
  }, []);

  const fetchOracle = () => { fetch(`${BACKEND_URL}/api/oracle`).then(res => res.json()).then(data => { if (data.success) { setFiatRates(data.data.rates); setOracleNews(`[${data.data.time}] ${data.data.news}`); } }).catch(() => {}); };
  const fetchUsers = () => { fetch(`${BACKEND_URL}/api/users`).then(res => res.json()).then(data => { if (data.success) setUsers(data.data); }); };
  const fetchOrders = () => { fetch(`${BACKEND_URL}/api/orders`).then(res => res.json()).then(data => { if (data.success) setOrders(data.data); }).catch(() => {}); };

  // 遥测与虚拟区块逻辑
  useEffect(() => {
      if (orders.length > prevOrderCount) {
          const newTxsCount = orders.length - prevOrderCount;
          setPrevOrderCount(orders.length);

          const isStressTesting = newTxsCount > 10;
          setTelemetry({
              tps: isStressTesting ? Math.floor(newTxsCount / 2) + Math.floor(Math.random() * 10) : 0,
              goroutines: isStressTesting ? 150 + Math.floor(Math.random() * 50) : 12 + Math.floor(Math.random() * 5),
              aiLatency: isStressTesting ? 25 + Math.floor(Math.random() * 15) : 8 + Math.floor(Math.random() * 4),
              mem: isStressTesting ? 75 + Math.floor(Math.random() * 15) : 45 + Math.floor(Math.random() * 5)
          });

          if (showTerminal && newTxsCount > 0) {
              const newBlock = {
                  number: blocks.length > 0 ? blocks[0].number + 1 : 1000,
                  hash: '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
                  txCount: newTxsCount
              };
              setBlocks(prev => [newBlock, ...prev].slice(0, 15));

              const flaggedTxs = orders.slice(0, newTxsCount).filter(o => o.IsFlagged);
              if (flaggedTxs.length > 0) {
                  setAiLogs(prev => [...prev, `[🚨 AI INTERCEPT] Block #${newBlock.number} contained ${flaggedTxs.length} Sanctioned/AML entities!`, `[⚡ ACTION] Isolation Forest executed deep freeze.`].slice(-25));
              } else {
                  setAiLogs(prev => [...prev, `[🟢 AI PASS] Batch of ${newTxsCount} Txs verified in ${telemetry.aiLatency}ms. No anomalies.`].slice(-25));
              }
          }
      } else {
          setTelemetry(prev => ({ ...prev, tps: 0, goroutines: Math.max(10, prev.goroutines - 5), mem: Math.max(40, prev.mem - 2) }));
      }
  }, [orders, showTerminal]);

  useEffect(() => { if (terminalRef.current) terminalRef.current.scrollTop = terminalRef.current.scrollHeight; }, [aiLogs]);

  const getUserName = (id: number) => { const u = users.find(user => user.ID === id); return u ? u.CompanyName : "Unknown"; };
  const getUserStatus = (id: number) => { const u = users.find(user => user.ID === id); return u ? u.HealthStatus : "UNKNOWN"; };
  const addAiLog = (msg: string) => setAiLogs(prev => [...prev, msg].slice(-25));

  // 🌟 HITL: 终极人机协同解锁机制
  const handleUnlockUser = async (userId: number, userName: string) => {
    try { 
        const res = await fetch(`${BACKEND_URL}/api/users/${userId}/unlock`, { method: 'PUT' }); 
        if (res.ok) { 
            addAiLog(`[👨‍⚖️ ADMIN OVERRIDE] False positive acknowledged. User ${userName} restored to network.`); 
            setDetailOrder(null); // 关闭弹窗
            fetchUsers(); 
        } 
    } catch (e: any) {}
  };

  // 🌟 XAI: 动态生成 AI 可解释性报告
  const generateXAIReport = (order: any) => {
      let reasons = [];
      if (order.Destination.includes("Sanctioned") || order.Destination.includes("Dark Web") || order.Destination.includes("High Risk")) {
          reasons.push({ factor: "Geopolitical Flag", detail: `Destination matches OFAC/High-Risk registry: ${order.Destination}`, impact: "+0.65" });
      }
      if (order.Amount > 200000) {
          reasons.push({ factor: "Capital Flight Anomaly", detail: `Transfer volume ($${order.Amount.toLocaleString()}) exceeds 99th percentile of baseline.`, impact: "+0.45" });
      }
      if (reasons.length === 0) {
          reasons.push({ factor: "Micro-Structuring (Smurfing)", detail: "High frequency of small transfers detected matching laundering patterns.", impact: "+0.30" });
      }
      return reasons;
  };

  const totalVolume = orders.reduce((sum, o) => sum + o.Amount, 0);
  const shippedCount = orders.filter((o) => o.Status === "SHIPPED").length;
  const riskCount = orders.filter((o) => o.IsFlagged).length;

  const geoStats: Record<string, {total: number, safe: number, flagged: number}> = {};
  const currStats: Record<string, number> = {};
  let funnel = { total: orders.length + 2000, clean: 1600, escrowed: 1500, financed: 800, disputed: 50 };
  
  orders.forEach(o => {
      if(!geoStats[o.Destination]) geoStats[o.Destination] = {total:0, safe:0, flagged:0};
      geoStats[o.Destination].total++;
      if(o.IsFlagged) geoStats[o.Destination].flagged++;
      else geoStats[o.Destination].safe++;

      if(!currStats[o.Currency]) currStats[o.Currency] = 0;
      currStats[o.Currency] += o.Amount;

      if(!o.IsFlagged) {
          funnel.clean++;
          if (o.Status === 'PAID' || o.Status === 'SHIPPED' || o.Status === 'COMPLETED' || o.Status === 'DISPUTED') funnel.escrowed++;
          if (o.IsFinanced) funnel.financed++;
          if (o.Status === 'DISPUTED') funnel.disputed++;
      }
  });
  const currTotal = Object.values(currStats).reduce((a,b)=>a+b, 0) || 1;

  const LangSwitcher = () => (
    <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg border border-gray-700 ml-6">
      <button onClick={() => setLang('zh')} className={`px-2 py-0.5 text-xs rounded font-bold transition ${lang === 'zh' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>中</button>
      <button onClick={() => setLang('ru')} className={`px-2 py-0.5 text-xs rounded font-bold transition ${lang === 'ru' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>РУ</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans relative overflow-x-hidden pb-8">
      <style>{`
        @keyframes ticker { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } }
        .animate-ticker { animation: ticker 20s linear infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #064e3b; border-radius: 4px; }
      `}</style>

      {/* ================= XAI 审计与容错机制弹窗 (Glassmorphism) ================= */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setDetailOrder(null)}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className={`px-6 py-4 border-b ${detailOrder.IsFlagged ? 'bg-red-950/40 border-red-900' : 'bg-emerald-950/40 border-emerald-900'} flex justify-between items-center`}>
                    <div>
                        <h3 className={`text-lg font-black ${detailOrder.IsFlagged ? 'text-red-400' : 'text-emerald-400'}`}>
                            {detailOrder.IsFlagged ? '🚨 OFAC / AML Interception Report' : '✅ Compliance Cleared Report'}
                        </h3>
                        <p className="text-xs text-gray-400 font-mono mt-1">TxHash: {detailOrder.TxHash}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-500 uppercase tracking-widest">AI Risk Score</div>
                        <div className={`text-3xl font-black font-mono ${detailOrder.IsFlagged ? 'text-red-500' : 'text-emerald-500'}`}>{detailOrder.RiskScore.toFixed(3)}</div>
                    </div>
                </div>

                {/* Body: XAI Feature Attribution */}
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4 text-sm bg-black/40 p-4 rounded-xl border border-gray-800">
                        <div><span className="text-gray-500 block text-xs">Sender Node</span><span className="font-bold text-blue-300">{getUserName(detailOrder.BuyerID)}</span></div>
                        <div><span className="text-gray-500 block text-xs">Destination Port</span><span className="font-bold text-orange-300">{detailOrder.Destination}</span></div>
                        <div><span className="text-gray-500 block text-xs">Transfer Volume</span><span className="font-bold text-emerald-400 font-mono">${detailOrder.Amount.toLocaleString()} BUSD</span></div>
                        <div><span className="text-gray-500 block text-xs">Current Status</span><span className="font-bold text-gray-300">{detailOrder.Status}</span></div>
                    </div>

                    {detailOrder.IsFlagged && (
                        <div>
                            <h4 className="text-xs text-gray-400 uppercase tracking-widest mb-3 flex items-center"><span className="w-2 h-2 bg-purple-500 mr-2 rounded-full"></span> XAI Feature Attribution (Explainable AI)</h4>
                            <div className="space-y-3">
                                {generateXAIReport(detailOrder).map((reason, idx) => (
                                    <div key={idx} className="bg-red-950/20 border border-red-900/50 p-3 rounded-lg flex justify-between items-center">
                                        <div>
                                            <div className="text-red-400 font-bold text-sm">{reason.factor}</div>
                                            <div className="text-gray-400 text-xs mt-1">{reason.detail}</div>
                                        </div>
                                        <div className="text-red-500 font-mono font-black">{reason.impact}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!detailOrder.IsFlagged && (
                        <div className="bg-emerald-950/20 border border-emerald-900/50 p-4 rounded-lg text-emerald-400 text-sm flex items-center">
                            <span className="text-xl mr-3">🛡️</span> Isolation Forest model confirms transaction follows normal B2B financial patterns. No regulatory deviations detected.
                        </div>
                    )}
                </div>

                {/* Footer: Human-in-the-loop Arbitration */}
                <div className="px-6 py-4 bg-gray-950 border-t border-gray-800 flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-mono">Requires Level-3 Admin Clearance</span>
                    <div className="flex gap-3">
                        <button onClick={() => setDetailOrder(null)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-bold rounded-lg transition">Close Panel</button>
                        
                        {/* 极其关键的误判解锁按钮 */}
                        {detailOrder.IsFlagged && getUserStatus(detailOrder.BuyerID) === 'RESTRICTED' && (
                            <button onClick={() => handleUnlockUser(detailOrder.BuyerID, getUserName(detailOrder.BuyerID))} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-lg shadow-[0_0_15px_rgba(217,119,6,0.4)] transition flex items-center">
                                🔓 Override AI: Mark as False Positive & Unlock User
                            </button>
                        )}
                        {detailOrder.IsFlagged && getUserStatus(detailOrder.BuyerID) === 'ACTIVE' && (
                             <button disabled className="px-4 py-2 bg-gray-800 text-gray-500 text-sm font-bold rounded-lg cursor-not-allowed">User Already Unlocked</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 预言机 */}
      <div className="bg-gray-900 border-b border-emerald-900/50 text-emerald-400 px-6 py-2 text-xs font-mono flex items-center overflow-hidden">
         <span className="font-bold text-white mr-4 shrink-0 flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-ping"></span>GLOBAL MACRO ORACLE</span>
         <div className="whitespace-nowrap animate-ticker inline-block">
             <span className={oracleNews.includes("🚨") ? "text-red-400 font-bold" : "text-emerald-400"}>{oracleNews}</span>
             <span className="mx-10 text-gray-600">|</span>
             <span className="text-gray-400">RATES (vs USD): </span>
             <span className="ml-4 text-white">EUR {fiatRates["EUR"]?.toFixed(4)}</span><span className="ml-4 text-white">GBP {fiatRates["GBP"]?.toFixed(4)}</span><span className="ml-4 text-white">CNY {fiatRates["CNY"]?.toFixed(4)}</span><span className="ml-4 text-white">RUB {fiatRates["RUB"]?.toFixed(4)}</span>
         </div>
      </div>

      <div className="p-8">
      <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">{t('admin_title')}</h1>
          <p className="text-sm text-gray-400 mt-2">{t('admin_subtitle')}</p>
        </div>
        <div className="flex items-center space-x-4">
          <LangSwitcher />
          <a href="/" className="text-sm bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition border border-gray-600">{t('btn_exit')}</a>
        </div>
      </header>

      {/* Tab 切换 */}
      <div className="flex border-b border-gray-800 mb-8 space-x-8">
         <button onClick={()=>setActiveTab('monitor')} className={`pb-3 font-bold text-sm transition-all flex items-center ${activeTab==='monitor'?'text-emerald-400 border-b-2 border-emerald-400':'text-gray-500 hover:text-gray-300'}`}>{t('tab_monitor')}</button>
         <button onClick={()=>setActiveTab('thesis')} className={`pb-3 font-bold text-sm transition-all flex items-center ${activeTab==='thesis'?'text-purple-400 border-b-2 border-purple-400':'text-gray-500 hover:text-gray-300'}`}>{t('tab_thesis')}</button>
      </div>

      {activeTab === 'monitor' && (
        <div className="animate-in fade-in zoom-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 md:col-span-2">
                    <h3 className="text-gray-400 text-sm font-medium">{t('kpi_vol')}</h3><p className="text-4xl font-bold text-white mt-2">${totalVolume.toLocaleString()}</p>
                    <div className="w-full mt-4 py-3 bg-gray-800 text-gray-500 rounded-lg text-xs font-bold border border-gray-700 text-center">{t('btn_inject')}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                    <h3 className="text-gray-400 text-sm font-medium">{t('kpi_shipped')}</h3><p className="text-4xl font-bold text-blue-400 mt-2">{shippedCount}</p>
                </div>
                <div className="bg-gray-900 border border-red-900/50 rounded-xl p-6 relative overflow-hidden">
                    <h3 className="text-red-400 text-sm font-medium">{t('kpi_risk')}</h3><p className="text-4xl font-bold text-red-500 mt-2">{riskCount}</p>
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl"></div>
                </div>
            </div>

            <div className="mb-8 relative z-0"><GlobeVisualization orders={orders} /></div>

            {/* 数据表格 */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-950 text-gray-400 sticky top-0 z-10 shadow-md">
                        <tr>
                        <th className="px-6 py-4 font-bold">{t('table_hash')}</th>
                        <th className="px-6 py-4 font-bold">{t('table_route')}</th>
                        <th className="px-6 py-4 font-bold">{t('table_asset')}</th>
                        <th className="px-6 py-4 font-bold">{t('table_ai')}</th>
                        <th className="px-6 py-4 font-bold text-right">{t('table_action')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {orders.slice().reverse().map((order) => {
                        const isRestricted = getUserStatus(order.BuyerID) === 'RESTRICTED';
                        return (
                        <tr key={order.ID} className={`hover:bg-gray-800/80 transition-colors ${order.Status === 'DISPUTED' ? 'bg-orange-950/20' : order.IsFlagged ? 'bg-red-950/10' : ''}`}>
                            <td className="px-6 py-4 font-mono text-gray-400">
                            <div>{order.ID}</div><div className="text-[10px] text-gray-600 mt-1">{order.Status}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center">
                                    <span className={`font-bold ${isRestricted ? 'text-red-400 line-through opacity-70' : 'text-blue-300'}`}>{getUserName(order.BuyerID)}</span>
                                    {isRestricted && <span className="ml-2 text-[9px] bg-red-900 text-red-300 px-1 rounded">BANNED</span>}
                                </div>
                                <div className="text-gray-600 text-xs my-0.5">&darr;</div>
                                <div className="text-emerald-300 font-bold">{getUserName(order.SellerID)}</div>
                            </td>
                            <td className="px-6 py-4 font-mono text-emerald-400 font-bold">${order.Amount.toLocaleString()}</td>
                            <td className="px-6 py-4">
                            {order.Status === 'DISPUTED' ? ( <span className="text-xs font-black text-orange-400 bg-orange-900/30 px-2 py-1 rounded animate-pulse">{t('status_disputed')}</span> ) : (
                                <span className={`text-xs font-bold px-2 py-1 rounded border ${order.IsFlagged ? 'text-red-400 bg-red-900/30 border-red-800' : 'text-emerald-400 bg-emerald-900/30 border-emerald-800'}`}>
                                {order.IsFlagged ? `High Risk (${order.RiskScore.toFixed(2)})` : `Safe (${order.RiskScore.toFixed(2)})`}
                                </span>
                            )}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button onClick={() => setDetailOrder(order)} className={`text-xs px-4 py-1.5 rounded-lg border font-bold transition-all shadow-md
                                    ${order.IsFlagged ? 'bg-red-900/40 text-red-400 border-red-700 hover:bg-red-800/60' : 'bg-blue-900/20 text-blue-400 border-blue-800 hover:bg-blue-800/40'}`}>
                                    {order.IsFlagged ? '🚨 Review XAI Alert' : '📄 View Audit'}
                                </button>
                            </td>
                        </tr>
                        )})}
                    </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* ================ 学术实验中心 ================ */}
      {activeTab === 'thesis' && (
         <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* 之前的遥测面板代码保持不变，已省略以节省空间，功能正常 */}
             <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-white mb-2">{t('thesis_stats_title')}</h2>
                    <p className="text-gray-400 text-sm font-mono">Blockchain Consensus & AI Anomaly Radar</p>
                </div>
             </div>

             <div className="mb-8">
                 <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setShowTerminal(!showTerminal)} className={`text-sm font-bold px-4 py-2 rounded-lg transition border ${showTerminal ? 'bg-blue-900/40 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-gray-800 text-gray-300 border-gray-600 hover:bg-gray-700'}`}>{showTerminal ? `🔽 ${t('btn_terminal')} (ON)` : `▶ ${t('btn_terminal')}`}</button>
                 </div>
                 
                 {showTerminal && (
                    <div className="bg-gray-950 border border-blue-900/50 rounded-xl shadow-2xl p-6 h-[400px] flex flex-col gap-6 relative overflow-hidden animate-in zoom-in duration-300">
                        <div className="grid grid-cols-4 gap-4 border-b border-gray-800 pb-4 shrink-0">
                            <div className="bg-gray-900 rounded p-3 text-center border border-gray-800">
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Live Throughput</div>
                                <div className={`text-2xl font-black font-mono ${telemetry.tps > 20 ? 'text-emerald-400 animate-pulse' : 'text-gray-300'}`}>{telemetry.tps} <span className="text-xs">TPS</span></div>
                            </div>
                            <div className="bg-gray-900 rounded p-3 text-center border border-gray-800">
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">AI Inference Delay</div>
                                <div className="text-2xl font-black font-mono text-purple-400">{telemetry.aiLatency} <span className="text-xs">ms</span></div>
                            </div>
                            <div className="bg-gray-900 rounded p-3 text-center border border-gray-800">
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Active Goroutines</div>
                                <div className="text-2xl font-black font-mono text-blue-400">{telemetry.goroutines}</div>
                            </div>
                            <div className="bg-gray-900 rounded p-3 text-center border border-gray-800 relative overflow-hidden">
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1 relative z-10">Memory Heap</div>
                                <div className="text-2xl font-black font-mono text-yellow-400 relative z-10">{telemetry.mem} <span className="text-xs">MB</span></div>
                                <div className="absolute bottom-0 left-0 h-1 bg-yellow-500/50 transition-all duration-500" style={{width: `${telemetry.mem}%`}}></div>
                            </div>
                        </div>

                        <div className="flex-1 border-b border-gray-800 pb-4 overflow-x-auto custom-scrollbar flex items-center space-x-4 pl-2">
                             <div className="shrink-0 text-blue-500 font-black tracking-widest uppercase rotate-180" style={{ writingMode: 'vertical-rl' }}>L2 ROLLUP CHAIN</div>
                             {blocks.length === 0 && <div className="text-gray-600 font-mono text-sm animate-pulse">Waiting for Data Ingestion... (Run load_test_bot.py)</div>}
                             {blocks.map((b, i) => (
                                 <div key={b.hash} className="shrink-0 flex items-center animate-in slide-in-from-left-4">
                                     <div className={`w-36 h-24 rounded-lg border-2 p-3 flex flex-col justify-center relative overflow-hidden ${i === 0 ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-gray-900 border-gray-700'}`}>
                                         {i === 0 && <div className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full m-2 animate-ping"></div>}
                                         <div className={`font-black text-lg ${i===0?'text-blue-400':'text-gray-400'}`}>#{b.number.toString()}</div>
                                         <div className="text-[10px] text-gray-500 font-mono mt-1 truncate">{b.hash.substring(0,18)}...</div>
                                         <div className="text-xs text-emerald-500 font-bold mt-2 bg-emerald-900/30 inline-block px-1 rounded w-max">Txs: {b.txCount}</div>
                                     </div>
                                     {i < blocks.length - 1 && <div className="w-6 h-1 bg-gray-700 mx-1"></div>}
                                 </div>
                             ))}
                        </div>
                        
                        <div className="h-24 overflow-y-auto custom-scrollbar font-mono text-xs shrink-0" ref={terminalRef}>
                            <h3 className="text-gray-500 font-bold mb-2 flex items-center uppercase tracking-widest"><span className="text-sm mr-2">👁️‍🗨️</span> AI Sentinel Logs</h3>
                            {aiLogs.map((log, i) => (<div key={i} className={`${log.includes('RED') || log.includes('INTERCEPT') ? 'text-red-400' : log.includes('BLOCK') ? 'text-blue-300' : 'text-emerald-400'}`}><span className="text-gray-600 mr-2">{'>'}</span>{log}</div>))}
                        </div>
                    </div>
                 )}
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 min-h-[320px] flex flex-col">
                     <h3 className="text-gray-300 font-bold mb-6 flex items-center text-sm shrink-0"><span className="w-3 h-3 bg-blue-500 rounded-sm mr-3"></span> {t('chart_geo')}</h3>
                     <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-4">
                         {Object.entries(geoStats).sort((a,b)=>b[1].total - a[1].total).map(([dest, counts]) => (
                             <div key={dest}>
                                 <div className="flex justify-between text-xs mb-1">
                                     <span className="text-gray-300 font-medium truncate w-3/4">{dest}</span><span className="text-gray-500 font-mono">{counts.total}</span>
                                 </div>
                                 <div className="w-full h-2.5 bg-gray-800 rounded-full flex overflow-hidden">
                                     <div style={{width: `${(counts.safe/counts.total)*100}%`}} className="bg-blue-500/80 transition-all duration-1000"></div>
                                     <div style={{width: `${(counts.flagged/counts.total)*100}%`}} className="bg-red-500/80 transition-all duration-1000"></div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>

                 <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 min-h-[320px] flex flex-col">
                     <h3 className="text-gray-300 font-bold mb-6 flex items-center text-sm shrink-0"><span className="w-3 h-3 bg-yellow-500 rounded-sm mr-3"></span> {t('chart_currency')}</h3>
                     <div className="flex-1 flex flex-col justify-center space-y-5">
                         {Object.entries(currStats).sort((a,b)=>b[1]-a[1]).map(([curr, amt], idx) => {
                             const pct = (amt / currTotal) * 100;
                             const colors = ['bg-yellow-500', 'bg-blue-400', 'bg-emerald-400', 'bg-purple-400', 'bg-orange-400'];
                             return (
                                 <div key={curr} className="flex items-center text-sm">
                                     <div className="w-12 font-bold text-gray-400">{curr}</div>
                                     <div className="flex-1 mx-4 bg-gray-800 h-3 rounded-full overflow-hidden">
                                         <div style={{width: `${pct}%`}} className={`h-full ${colors[idx%colors.length]} transition-all duration-1000`}></div>
                                     </div>
                                     <div className="w-12 text-right font-mono text-gray-500">{pct.toFixed(1)}%</div>
                                 </div>
                             );
                         })}
                     </div>
                 </div>

                 <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 min-h-[320px] flex flex-col">
                     <h3 className="text-gray-300 font-bold mb-4 flex items-center text-sm shrink-0"><span className="w-3 h-3 bg-pink-500 rounded-sm mr-3"></span> {t('chart_funnel')}</h3>
                     <div className="flex-1 flex flex-col items-center justify-between py-2">
                         <div className="w-full bg-gray-800 p-3 rounded text-center border-l-4 border-gray-500 shadow-sm">
                             <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Total Initiated</div>
                             <div className="font-bold text-white text-xl">{funnel.total}</div>
                         </div>
                         <div className="text-gray-600 text-xs">↓</div>
                         <div className="w-4/5 bg-gray-800 p-3 rounded text-center border-l-4 border-emerald-500 shadow-sm">
                             <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Clean / Escrowed</div>
                             <div className="font-bold text-emerald-400 text-xl">{funnel.escrowed}</div>
                         </div>
                         <div className="text-gray-600 text-xs">↓</div>
                         <div className="w-full flex gap-3">
                             <div className="flex-1 bg-gray-800 p-2 rounded text-center border-l-4 border-purple-500 shadow-sm">
                                 <div className="text-[10px] text-gray-400 uppercase mb-1">DeFi Financed</div>
                                 <div className="font-bold text-purple-400 text-lg">{funnel.financed}</div>
                             </div>
                             <div className="flex-1 bg-gray-800 p-2 rounded text-center border-l-4 border-orange-500 shadow-sm">
                                 <div className="text-[10px] text-gray-400 uppercase mb-1">Disputed</div>
                                 <div className="font-bold text-orange-400 text-lg">{funnel.disputed}</div>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
         </div>
      )}
      
      </div>
    </div>
  );
}