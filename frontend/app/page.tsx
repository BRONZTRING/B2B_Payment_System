"use client";

import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// 编译修复与沙盒预览 Mock 区 (Mock Zone for Canvas Preview)
// ---------------------------------------------------------------------------
/* // 在本地生产环境中，请取消注释以下真实导入，并删除下方的 Mock 变量：
import { parseAbi, parseEther, createWalletClient, createPublicClient, http, publicActions, formatEther } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { BACKEND_URL, PAYMENT_ESCROW_ADDRESS, MOCK_ERC20_ADDRESS } from "./constants";
*/

const BACKEND_URL = "http://localhost:8080";
const PAYMENT_ESCROW_ADDRESS = "0x0000000000000000000000000000000000000000";
const MOCK_ERC20_ADDRESS = "0x0000000000000000000000000000000000000000";

const formatEther = (val: any) => "150000.00";
const parseEther = (val: string) => val; 
const parseAbi = (val: any) => val;
const mnemonicToAccount = (m: string, opt: any) => ({ address: "0x1234...5678" });

// 修复 TS2554 报错：为 readContract 补充参数接收定义
const createPublicClient = (opt: any) => ({ 
    readContract: async (params?: any) => BigInt("150000000000000000000000") 
});

// 修复 TS2554 报错：为 writeContract 补充参数接收定义
const createWalletClient = (opt: any) => ({ 
    extend: (actions?: any) => ({ 
        account: { address: "0x1234...5678" }, 
        writeContract: async (params?: any) => "0x" + Math.random().toString(16).substring(2, 18) 
    }) 
});
const http = (url: string) => url;
const publicActions = {};
const foundry = {};
// ---------------------------------------------------------------------------

const ANVIL_MNEMONIC = "test test test test test test test test test test test junk";

// 扩充了全球港口列表
const DESTINATIONS = [
  "Rotterdam, Netherlands", "Hamburg, Germany", "Los Angeles, USA", 
  "Singapore, Singapore", "Dubai, UAE", "Shanghai, China", 
  "Antwerp, Belgium", "Santos, Brazil", "Mumbai, India", 
  "Durban, South Africa", "Vladivostok, Russia", "St. Petersburg, Russia",
  "Pyongyang, DPRK (Sanctioned)", "Unknown Dark Web Node"
];

const LOCAL_ESCROW_ABI = [
  "function createAndPayOrder(string orderId, address payee, uint256 amount) external",
  "function completeOrder(string orderId) external",
  "function revokeOrder(string orderId) external",
  "function raiseDispute(string orderId) external",
  "function requestFinancing(string orderId) external",
  "function shipOrder(string orderId) external"
];
const LOCAL_ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

interface User { ID: number; CompanyName: string; Role: string; AccountIndex: number; FiatCurrency: string; BankAccount: string; HealthStatus: string; }
interface Order { ID: string; BuyerID: number; SellerID: number; PaymentType: string; Amount: number; FiatAmount: number; Currency: string; Status: string; Origin: string; Destination: string; TxHash: string; LogisticsRoute: string; CreatedAt: string; IsFlagged: boolean; IsFinanced: boolean; }

const MOCK_USERS: User[] = [
    { ID: 1, CompanyName: "Global Tech Buyer Inc.", Role: "buyer", AccountIndex: 1, FiatCurrency: "USD", BankAccount: "US123", HealthStatus: "ACTIVE" },
    { ID: 2, CompanyName: "Shenzhen Manufacturing", Role: "seller", AccountIndex: 2, FiatCurrency: "CNY", BankAccount: "CN456", HealthStatus: "ACTIVE" },
    { ID: 3, CompanyName: "Restricted Entity", Role: "buyer", AccountIndex: 3, FiatCurrency: "RUB", BankAccount: "RU789", HealthStatus: "RESTRICTED" }
];

const dict = {
  "zh": {
    "sys_desc": "基于不可篡改合约与动态AI风控的全球结算网。",
    "auth_login": "企业系统登录", "auth_register": "企业入驻 (KYC)", "auth_select_role": "请选择您的业务角色",
    "auth_role_buyer": "全球采购商 (Buyer)", "auth_role_seller": "跨国供应商 (Supplier)", "auth_back": "🔙 返回重选",
    "auth_demo_select": "选择企业节点", "auth_password": "访问密钥 (自动补全)", "auth_btn_login": "验证并安全登录", 
    "buyer_portal": "全球采购商 (Buyer)", "seller_portal": "全球供应商 (Seller)",
    "bank_balance": "法币可用余额", "platform_balance": "数字系统余额", "deposit": "划转入金", "withdraw": "划转提现",
    "new_transfer": "新建国际汇款", "payee": "收款企业", "dest_port": "物流目的港口", "amount_requested": "对方索要金额", "escrow_pay": "🛡️ 担保支付", "direct_pay": "⚡ P2P 直汇", "submit": "提交指令",
    "trade_flow": "企业财务业务流", "status_paid": "💰 等待发货", "status_shipped": "🚢 国际运输中", "status_completed": "✅ 交易已结算", "status_revoked": "🔙 交易撤销", "status_disputed": "⚖️ 平台仲裁介入中",
    "btn_ship": "📦 录入运单并确认发货", "btn_receipt": "🤝 确认收货并结款", "btn_dispute": "⚠️ 发起仲裁", "btn_finance": "🏦 质押订单: 提前提取 80%", "label_financed": "🏦 平台已垫资 80%",
    "bi_vol": "累计流转资金", "bi_pend": "在途担保资金", "bi_defi": "DeFi 平台授信 / 垫资", "bi_risk": "AI 拦截订单",
    "btn_passport": "📜 链上护照", "passport_title": "企业数字身份 (Web3 KYC)", "kyc_tier": "合规级别", "ai_score": "AI 信用评级", "empty_orders": "暂无流水",
    "prompt_ship_title": "📦 填写并上链物流运单", "prompt_ship_desc": "请输入国际提单(B/L)或航空运单号(AWB)以完成链上确权："
  },
  "ru": {
    "sys_desc": "Глобальная сеть на базе смарт-контрактов и ИИ для контроля рисков.",
    "auth_login": "Вход в систему", "auth_register": "Регистрация (KYC)", "auth_select_role": "Выберите вашу роль",
    "auth_role_buyer": "Импортер (Buyer)", "auth_role_seller": "Экспортер (Supplier)", "auth_back": "🔙 Назад",
    "auth_demo_select": "Выберите узел", "auth_password": "Пароль доступа", "auth_btn_login": "Авторизоваться", 
    "buyer_portal": "Импортер", "seller_portal": "Экспортер",
    "bank_balance": "Фиатный баланс", "platform_balance": "Цифровой резерв", "deposit": "Пополнить", "withdraw": "Вывести",
    "new_transfer": "Новый перевод", "payee": "Получатель", "dest_port": "Порт назначения", "amount_requested": "Сумма к оплате", "escrow_pay": "🛡️ Безопасная сделка", "direct_pay": "⚡ P2P Перевод", "submit": "Отправить",
    "trade_flow": "Финансовые операции", "status_paid": "💰 Ожидает отправки", "status_shipped": "🚢 В пути (Транзит)", "status_completed": "✅ Завершено", "status_revoked": "🔙 Отменено", "status_disputed": "⚖️ Спор (Арбитраж)",
    "btn_ship": "📦 Ввести накладную и отправить", "btn_receipt": "🤝 Подтвердить получение", "btn_dispute": "⚠️ Открыть спор", "btn_finance": "🏦 Факторинг: 80%", "label_financed": "🏦 Профинансировано 80%",
    "bi_vol": "Общий оборот", "bi_pend": "В ожидании / Транзит", "bi_defi": "DeFi Кредит", "bi_risk": "ИИ Блокировки",
    "btn_passport": "📜 Web3 Паспорт", "passport_title": "Цифровая идентичность", "kyc_tier": "Уровень комплаенса", "ai_score": "Рейтинг ИИ", "empty_orders": "Нет транзакций",
    "prompt_ship_title": "📦 Ввод транспортной накладной", "prompt_ship_desc": "Введите номер коносамента (B/L) или авианакладной (AWB):"
  }
};

export default function BusinessPortal() {
  const [lang, setLang] = useState<"zh" | "ru">("zh");
  const [loginRole, setLoginRole] = useState<"buyer" | "seller" | null>(null);
  const [loginUserId, setLoginUserId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cryptoBalance, setCryptoBalance] = useState(0); 
  const [bankBalance, setBankBalance] = useState<number>(0); 
  const [showBankMenu, setShowBankMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [payAmount, setPayAmount] = useState(""); 
  const [payDest, setPayDest] = useState(DESTINATIONS[0]);
  const [paymentType, setPaymentType] = useState("ESCROW"); 
  const [selectedOrderForLogistics, setSelectedOrderForLogistics] = useState<Order | null>(null);
  const [selectedOrderForTx, setSelectedOrderForTx] = useState<Order | null>(null);
  const [fiatRates, setFiatRates] = useState<Record<string, number>>({ "USD": 1.00, "CNY": 7.23, "RUB": 92.50, "EUR": 0.92, "GBP": 0.79, "JPY": 150.12 });
  const [modalState, setModalState] = useState<{isOpen: boolean, type: 'alert'|'confirm'|'prompt', title: string, message: string, defaultValue?: string, resolve?: (val: any) => void} | null>(null);
  const [modalInput, setModalInput] = useState("");

  const t = (key: keyof typeof dict.zh) => (dict[lang] as Record<string, string>)[key] || dict["zh"][key];

  const handleLoginSubmit = () => { 
    if (loginUserId) {
        const found = users.find(u => u.ID === Number(loginUserId));
        if (found) setCurrentUser(found);
    } 
  };

  const showModal = (type: 'alert'|'confirm'|'prompt', title: string, message: string, defaultValue: string = "") => {
    return new Promise<any>((resolve) => {
        setModalInput(defaultValue);
        setModalState({ isOpen: true, type, title, message, defaultValue, resolve });
    });
  };

  const handleModalClose = (value: any = null) => {
    if (modalState?.resolve) modalState.resolve(value);
    setModalState(null);
  };

  const fetchUsers = () => { 
    fetch(`${BACKEND_URL}/api/users`).then(res => res.json()).then(data => { if (data.success) setUsers(data.data); }).catch(() => {}); 
  };

  const fetchOrders = () => { 
    if (!currentUser) return;
    fetch(`${BACKEND_URL}/api/orders`).then(res => res.json()).then(data => { 
        if (data.success) { 
            const myOrders = data.data.filter((o: Order) => (o.BuyerID === currentUser?.ID || o.SellerID === currentUser?.ID)); 
            setOrders(myOrders); 
        } 
    }).catch(() => {}); 
  };

  const fetchBalance = async () => {
    if (!currentUser) return;
    try {
      const publicClient = createPublicClient({ chain: foundry, transport: http('http://127.0.0.1:8545') });
      const bal = await publicClient.readContract({ address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI), functionName: 'balanceOf', args: ["0x..."] });
      setCryptoBalance(Number(formatEther(bal)));
    } catch (e) { setCryptoBalance(125000.50); }
  };

  const handlePayment = async () => {
    if (!selectedSellerId || !payAmount) return showModal('alert', 'Error', 'Please complete the form.');
    setLoading(true);
    try {
      const client: any = createWalletClient({}).extend(publicActions as any);
      const orderId = `ORD-NEW-${Math.floor(Math.random() * 100000)}`;
      const hash = await client.writeContract({ address: PAYMENT_ESCROW_ADDRESS, abi: parseAbi(LOCAL_ESCROW_ABI), functionName: 'createAndPayOrder', args: [orderId, "0x...", parseEther(payAmount)] });
      
      const newOrder: Order = { ID: orderId, BuyerID: currentUser!.ID, SellerID: Number(selectedSellerId), PaymentType: paymentType, Amount: Number(payAmount), FiatAmount: Number(payAmount), Currency: currentUser!.FiatCurrency, Origin: "Global Hub", Destination: payDest, TxHash: hash, Status: paymentType === "DIRECT" ? "COMPLETED" : "PAID", LogisticsRoute: "", CreatedAt: new Date().toISOString(), IsFlagged: false, IsFinanced: false };
      setOrders(prev => [newOrder, ...prev]);

      fetch(`${BACKEND_URL}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: orderId, buyer_id: currentUser!.ID, seller_id: Number(selectedSellerId), payment_type: paymentType, amount: Number(payAmount), destination: payDest, txHash: hash }) }).catch(() => {});
      setPayAmount(""); 
      showModal('alert', 'Success', 'Transaction submitted to blockchain.');
    } catch (e) {}
    setLoading(false);
  };

  const genericContractAction = async (orderId: string, actionName: string, backendStatus: string, confirmationText: string) => {
      const confirmed = await showModal('confirm', 'Confirmation', confirmationText);
      if (!confirmed) return;
      setLoading(true);
      try {
        const client: any = createWalletClient({}).extend(publicActions as any);
        await client.writeContract({ address: PAYMENT_ESCROW_ADDRESS, abi: parseAbi(LOCAL_ESCROW_ABI), functionName: actionName, args: [orderId] });
        setOrders(prev => prev.map(o => o.ID === orderId ? { ...o, Status: backendStatus !== 'FINANCE' ? backendStatus : o.Status, IsFinanced: backendStatus === 'FINANCE' ? true : o.IsFinanced } : o));
        fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: backendStatus }) }).catch(()=>{});
      } catch (e) {}
      setLoading(false);
  };

  const handleShipOrder = async (orderId: string) => {
      const mockWaybill = `BL-${Math.floor(Math.random() * 100000000)}-${new Date().getFullYear()}`;
      const waybill = await showModal('prompt', t('prompt_ship_title'), t('prompt_ship_desc'), mockWaybill);
      if (!waybill) return;

      setLoading(true);
      try {
        const client: any = createWalletClient({}).extend(publicActions as any);
        await client.writeContract({ address: PAYMENT_ESCROW_ADDRESS, abi: parseAbi(LOCAL_ESCROW_ABI), functionName: 'shipOrder', args: [orderId] });
        
        setOrders(prev => prev.map(o => o.ID === orderId ? { ...o, Status: 'SHIPPED', LogisticsRoute: waybill } : o));
        fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'SHIPPED' }) }).catch(()=>{});
      } catch (e) {}
      setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);
  useEffect(() => {
    if (currentUser) {
      const storedBank = localStorage.getItem(`bank_v3_${currentUser.ID}`);
      if (storedBank) setBankBalance(Number(storedBank));
      else { const initMoney = 5000000; localStorage.setItem(`bank_v3_${currentUser.ID}`, initMoney.toString()); setBankBalance(initMoney); }
      fetchOrders(); fetchBalance();
      const interval = setInterval(() => { fetchOrders(); fetchBalance(); }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const dashboardStats = {
    totalVol: orders.reduce((sum, o) => sum + (o.FiatAmount || 0), 0),
    pendingVol: orders.filter(o => o.Status === 'PAID' || o.Status === 'SHIPPED').reduce((sum, o) => sum + (o.FiatAmount || 0), 0),
    financedVol: orders.filter(o => o.IsFinanced).reduce((sum, o) => sum + (o.FiatAmount || 0) * 0.8, 0),
    riskCount: orders.filter(o => o.IsFlagged).length
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-950 flex font-sans relative overflow-hidden text-gray-200">
        <div className="absolute top-6 left-6 z-50 flex gap-2">
            <button onClick={()=>setLang('zh')} className={`px-3 py-1 rounded text-xs font-bold ${lang==='zh'?'bg-blue-600 text-white':'bg-white/10'}`}>中文</button>
            <button onClick={()=>setLang('ru')} className={`px-3 py-1 rounded text-xs font-bold ${lang==='ru'?'bg-blue-600 text-white':'bg-white/10'}`}>РУ</button>
        </div>
        <div className="hidden lg:flex w-1/2 flex-col justify-center px-20 relative bg-gradient-to-br from-gray-900 to-blue-950">
            <div className="z-10">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-[0_0_30px_rgba(37,99,235,0.5)]">🌐</div>
                <h1 className="text-6xl font-black text-white mb-6 tracking-tight leading-tight">TrustPay <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Enterprise</span></h1>
                <p className="text-gray-400 text-xl mb-12 leading-relaxed max-w-md">{t('sys_desc')}</p>
            </div>
            <a href="/simulation" target="_blank" className="absolute bottom-10 left-20 px-5 py-2.5 bg-gray-800/50 border border-gray-700 text-gray-300 text-sm rounded-lg hover:bg-gray-800 transition">🎛️ System Administrator / Thesis Lab</a>
        </div>
        
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 p-10 rounded-3xl shadow-2xl w-full max-w-md z-10 transition-all duration-300">
                <div className="flex space-x-6 mb-8 border-b border-gray-800 pb-4">
                    <h2 className="text-xl font-bold text-white tracking-widest">{t('auth_login')}</h2>
                </div>
                
                {!loginRole ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{t('auth_select_role')}</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setLoginRole("buyer")} className="p-6 border-2 border-blue-500/30 hover:border-blue-500 bg-blue-900/20 rounded-2xl text-center group transition-all">
                                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🛒</div>
                                <div className="text-blue-100 font-bold text-sm leading-tight">{t('auth_role_buyer')}</div>
                            </button>
                            <button onClick={() => setLoginRole("seller")} className="p-6 border-2 border-emerald-500/30 hover:border-emerald-500 bg-emerald-900/20 rounded-2xl text-center group transition-all">
                                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🏭</div>
                                <div className="text-emerald-100 font-bold text-sm leading-tight">{t('auth_role_seller')}</div>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
                        <button onClick={() => { setLoginRole(null); setLoginUserId(""); setLoginPassword(""); }} className="text-xs text-blue-400 hover:text-blue-300 font-bold mb-2 inline-block">
                            {t('auth_back')}
                        </button>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">{t('auth_demo_select')}</label>
                            <select className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-sm font-bold text-white outline-none focus:border-blue-500 transition appearance-none" value={loginUserId} onChange={(e) => { setLoginUserId(e.target.value); if(e.target.value) setLoginPassword("******"); }}>
                                <option value="">-- {t('auth_demo_select')} --</option>
                                {users.filter(u => u.Role === loginRole).map(u => (
                                    <option key={u.ID} value={u.ID}>{u.CompanyName} ({u.FiatCurrency})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">{t('auth_password')}</label>
                            <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-sm text-gray-500 font-mono tracking-widest cursor-not-allowed"/>
                        </div>
                        <button onClick={handleLoginSubmit} disabled={!loginUserId} className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 text-white font-bold py-4 rounded-xl mt-4 shadow-lg transition-all active:scale-95">
                            {t('auth_btn_login')}
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    );
  }

  const isHealthy = currentUser.HealthStatus === 'ACTIVE';

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 pb-20 relative">
      
      {/* 弹窗系统 */}
      {modalState?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => handleModalClose(null)}>
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 w-full max-w-sm animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <h3 className={`text-xl font-black mb-2 ${modalState.type === 'alert' ? 'text-blue-600' : 'text-gray-800'}`}>{modalState.title}</h3>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed whitespace-pre-wrap">{String(modalState.message)}</p>
                {modalState.type === 'prompt' && (
                    <input type="text" autoFocus value={modalInput} onChange={e => setModalInput(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 mb-6 outline-none focus:border-blue-500 font-bold font-mono text-center" />
                )}
                <div className="flex gap-3 justify-end">
                    {modalState.type !== 'alert' && (
                        <button onClick={() => handleModalClose(null)} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 transition">Cancel</button>
                    )}
                    <button onClick={() => handleModalClose(modalState.type === 'prompt' ? modalInput : true)} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 shadow-lg transition">Confirm</button>
                </div>
            </div>
        </div>
      )}

      {/* 物流轨迹抽屉 */}
      {selectedOrderForLogistics && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedOrderForLogistics(null)}>
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-black mb-6 border-b pb-4">🚢 智能物流溯源与确权</h3>
                <div className="space-y-8 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-100">
                    <div className="relative flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center z-10 border-4 border-white shadow-sm">✓</div>
                        <div className="flex-1 bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <p className="font-bold text-blue-900 text-sm">智能合约锁定资金</p>
                            <p className="text-[10px] text-blue-600 font-mono mt-1">Hash: {selectedOrderForLogistics.TxHash?.substring(0,12)}...</p>
                        </div>
                    </div>
                    <div className="relative flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-sm ${['SHIPPED', 'COMPLETED'].includes(selectedOrderForLogistics.Status) ? 'bg-emerald-500 text-white' : 'bg-gray-200'}`}>🚢</div>
                        <div className={`flex-1 p-3 rounded-xl border ${['SHIPPED', 'COMPLETED'].includes(selectedOrderForLogistics.Status) ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 opacity-50'}`}>
                            <p className="font-bold text-sm">国际运输中 (提单已上链)</p>
                            <p className="text-[10px] text-gray-500 mt-1">Destination: {selectedOrderForLogistics.Destination}</p>
                            {selectedOrderForLogistics.LogisticsRoute && (
                                <p className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-1 rounded inline-block mt-2 border border-emerald-200">Waybill: {selectedOrderForLogistics.LogisticsRoute}</p>
                            )}
                        </div>
                    </div>
                    <div className="relative flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-4 border-white shadow-sm ${selectedOrderForLogistics.Status === 'COMPLETED' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>🚩</div>
                        <div className={`flex-1 p-3 rounded-xl border ${selectedOrderForLogistics.Status === 'COMPLETED' ? 'bg-green-50 border-green-100' : 'bg-gray-50 opacity-50'}`}>
                            <p className="font-bold text-sm">买方验收 & 释放尾款</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 预言机横幅 */}
      <div className="bg-gray-900 text-gray-400 px-6 py-2 text-[10px] font-mono flex items-center overflow-hidden border-b border-gray-800">
         <span className="font-bold text-emerald-400 mr-4 shrink-0 flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>ORACLE CONNECTED</span>
         <div className="whitespace-nowrap"><span className="text-blue-300 ml-4">EUR {fiatRates["EUR"]?.toFixed(4)}</span><span className="text-red-300 ml-4">CNY {fiatRates["CNY"]?.toFixed(4)}</span><span className="text-orange-300 ml-4">RUB {fiatRates["RUB"]?.toFixed(4)}</span></div>
      </div>

      <nav className={`bg-white border-b shadow-sm sticky top-0 z-20 px-8 py-3 flex justify-between items-center ${!isHealthy ? 'border-red-400 bg-red-50/20' : ''}`}>
        <div className="flex items-center">
          <h1 className="text-xl font-black text-blue-900 mr-6 tracking-tighter">TrustPay <span className="font-light text-gray-400">| Enterprise</span></h1>
          <div className={`px-3 py-1 rounded-full border text-sm font-bold ${isHealthy ? 'bg-blue-50 text-blue-800 border-blue-100' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {currentUser.CompanyName}
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <div className="relative">
             <button onClick={() => setShowBankMenu(!showBankMenu)} className="bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-800 transition">🏦 {t('bank_balance')}</button>
             {showBankMenu && (
               <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border p-5 z-50 animate-in fade-in slide-in-from-top-2">
                 <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">{t('bank_balance')}</div>
                 <div className="text-2xl font-black text-blue-600 mb-6">{bankBalance.toLocaleString()} <span className="text-xs">{currentUser.FiatCurrency}</span></div>
                 <div className="flex gap-2 border-t pt-4">
                   <button onClick={() => setShowBankMenu(false)} className="flex-1 py-2 bg-green-50 text-green-700 rounded font-bold text-[10px]">{t('deposit')}</button>
                   <button onClick={() => setShowBankMenu(false)} className="flex-1 py-2 bg-blue-50 text-blue-700 rounded font-bold text-[10px]">{t('withdraw')}</button>
                 </div>
               </div>
             )}
          </div>
          <div className="flex flex-col border-l pl-6">
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('platform_balance')}</div>
            <div className="font-black text-lg text-gray-900 leading-tight">125,000.50 <span className="text-xs text-gray-500 font-normal">{currentUser.FiatCurrency}</span></div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition uppercase tracking-widest">Exit</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* 数据看板 */}
        <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/3 bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><span className="text-9xl">📜</span></div>
                <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center"><span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span> {t('passport_title')}</h3>
                <div className="mb-8">
                    <div className="text-2xl font-black">{currentUser.CompanyName}</div>
                    <div className="text-blue-400 text-xs font-mono mt-1 opacity-70">DID: 0x{currentUser.ID}FF...{currentUser.AccountIndex}7C</div>
                </div>
                <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-6">
                    <div>
                        <p className="text-[9px] text-gray-500 uppercase font-bold">{t('ai_score')}</p>
                        <p className={`text-xl font-black ${isHealthy ? 'text-emerald-400' : 'text-red-400'}`}>{isHealthy ? '98.2' : '14.5'}/100</p>
                    </div>
                    <div>
                        <p className="text-[9px] text-gray-500 uppercase font-bold">{t('kyc_tier')}</p>
                        <p className="text-xl font-black text-purple-400">Tier-1</p>
                    </div>
                </div>
            </div>

            <div className="lg:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">{t('bi_vol')}</p>
                    <p className="text-3xl font-black text-gray-800">{String(dashboardStats.totalVol.toLocaleString())} <span className="text-xs text-gray-400">{currentUser.FiatCurrency}</span></p>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">{t('bi_pend')}</p>
                    <p className="text-3xl font-black text-blue-600">{String(dashboardStats.pendingVol.toLocaleString())}</p>
                </div>
                <div className={`rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col justify-center ${currentUser.Role === 'seller' ? 'bg-purple-50/50' : 'bg-red-50/50'}`}>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">{currentUser.Role === 'seller' ? t('bi_defi') : t('bi_risk')}</p>
                    <p className={`text-3xl font-black ${currentUser.Role === 'seller' ? 'text-purple-600' : 'text-red-600'}`}>{String(currentUser.Role === 'seller' ? dashboardStats.financedVol.toLocaleString() : dashboardStats.riskCount)}</p>
                </div>
            </div>
        </div>

        {/* 业务操作区 */}
        <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/3">
                <div className={`bg-white rounded-3xl shadow-sm border p-8 ${!isHealthy ? 'border-red-400 ring-2 ring-red-50' : 'border-gray-100'}`}>
                    <h3 className="font-extrabold text-xl mb-6">{currentUser.Role === 'buyer' ? t('new_transfer') : t('seller_portal')}</h3>
                    {currentUser.Role === 'buyer' ? (
                        <div className="space-y-5">
                            {!isHealthy && (<div className="bg-red-50 p-4 rounded-xl border border-red-200"><p className="font-bold text-red-800 text-xs uppercase tracking-widest">Account Restricted</p></div>)}
                            <div><label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">{t('payee')}</label>
                                <select value={selectedSellerId} onChange={e => setSelectedSellerId(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 transition-all">
                                    <option value="">-- Select Corporate --</option>
                                    {users.filter(u => u.Role === 'seller').map(s => <option key={s.ID} value={String(s.ID)}>{s.CompanyName}</option>)}
                                </select>
                            </div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">{t('dest_port')}</label>
                                <select value={payDest} onChange={e => setPayDest(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold outline-none">
                                    {DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                                <label className="text-[10px] font-black text-blue-800 uppercase mb-2 block">{t('amount_requested')} (USD)</label>
                                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full bg-white border-2 border-blue-100 rounded-xl p-4 text-xl font-black outline-none" placeholder="0.00" />
                            </div>
                            <button onClick={handlePayment} disabled={loading || !payAmount || !selectedSellerId} className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${isHealthy ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600'}`}>
                                {loading ? 'EXECUTING...' : t('submit')}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-3xl">
                            <p className="font-black text-emerald-800 text-lg mb-2">Welcome, Supplier</p>
                            <p className="text-xs text-emerald-600 leading-relaxed">Incoming Escrow orders and DeFi financing options will appear in your trade flow dashboard.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:w-2/3">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[600px]">
                    <h3 className="font-extrabold text-xl mb-8 border-b pb-4">{t('trade_flow')}</h3>
                    <div className="space-y-6">
                        {orders.length === 0 && <div className="text-center py-20 text-gray-300 font-bold uppercase tracking-widest">{t('empty_orders')}</div>}
                        {orders.map(order => (
                            <div key={order.ID} className={`group border-2 rounded-2xl p-6 transition-all hover:shadow-xl ${order.Status==='DISPUTED'?'border-orange-200 bg-orange-50/30':'border-gray-50 hover:border-blue-100'}`}>
                                <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setSelectedOrderForTx(order)} className="text-[10px] font-mono bg-gray-100 px-2 py-1 rounded text-gray-500 hover:bg-emerald-500 hover:text-white transition-colors">
                                                ⛓️ {String(order.ID)}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full animate-pulse bg-blue-500"></div>
                                            <p className="text-lg font-black text-gray-900">
                                                {currentUser.Role==='buyer' ? `TO: ${MOCK_USERS.find(u=>u.ID===order.SellerID)?.CompanyName || 'Supplier'}` : `FROM: ${MOCK_USERS.find(u=>u.ID===order.BuyerID)?.CompanyName || 'Buyer'}`}
                                            </p>
                                        </div>
                                        <div className="flex gap-4">
                                            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{String(order.Status)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-black tracking-tight text-gray-900">{String(order.FiatAmount?.toLocaleString())} <span className="text-xs font-bold text-gray-400 uppercase">{currentUser.FiatCurrency}</span></p>
                                    </div>
                                </div>
                                <div className="mt-8 pt-6 border-t border-gray-50 flex flex-wrap justify-between items-center gap-4">
                                    <button onClick={() => setSelectedOrderForLogistics(order)} className="text-[10px] font-black text-blue-600 hover:text-blue-800 underline underline-offset-4 decoration-2">
                                        📦 TRACK LOGISTICS & OWNERSHIP
                                    </button>
                                    <div className="flex gap-3">
                                        {/* 供应商操作区 */}
                                        {currentUser.Role === 'seller' && order.Status === 'PAID' && (
                                            <button onClick={() => handleShipOrder(order.ID)} className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                                                {t('btn_ship')}
                                            </button>
                                        )}
                                        {currentUser.Role === 'seller' && order.Status === 'SHIPPED' && !order.IsFinanced && (
                                            <button onClick={() => genericContractAction(order.ID, 'requestFinancing', 'FINANCE', 'Request DeFi factoring (80%)?')} className="bg-purple-600 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-purple-500/20 active:scale-95 transition-all">
                                                DEFI FINANCING
                                            </button>
                                        )}
                                        {/* 采购商操作区 */}
                                        {currentUser.Role === 'buyer' && order.Status === 'SHIPPED' && (
                                            <>
                                                <button onClick={() => genericContractAction(order.ID, 'raiseDispute', 'DISPUTED', 'Initiate arbitration?')} className="border-2 border-orange-500 text-orange-600 px-5 py-2 rounded-xl text-xs font-black active:scale-95 transition-all">DISPUTE</button>
                                                <button onClick={() => genericContractAction(order.ID, 'completeOrder', 'COMPLETED', 'Release funds to seller?')} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all">CONFIRM RECEIPT</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </main>

      {/* 底部区块浏览器 (Tx Drawer) */}
      {selectedOrderForTx && (
        <div className="fixed bottom-0 inset-x-0 z-[100] flex justify-center p-4">
            <div className="w-full max-w-4xl bg-slate-900 rounded-3xl shadow-2xl border-t-4 border-emerald-500 p-8 text-white pointer-events-auto">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-emerald-400 font-mono font-bold">⛓️ EVM LAYER-2 TRANSACTION EXPLORER</h3>
                    <button onClick={() => setSelectedOrderForTx(null)} className="text-[10px] font-black bg-white/10 px-4 py-2 rounded-lg">CLOSE</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-4 bg-black/40 p-5 rounded-2xl">
                        <p className="text-gray-500 text-[9px] uppercase font-bold mb-2 tracking-widest">Transaction Hash</p>
                        <p className="text-white font-mono text-xs break-all">{String(selectedOrderForTx.TxHash || "0x_Pending_Network_Consensus")}</p>
                    </div>
                    <div className="bg-black/40 p-4 rounded-2xl">
                        <p className="text-gray-500 text-[9px] uppercase font-bold mb-2">Block Index</p>
                        <p className="text-blue-400 font-mono text-sm">#18,293,012</p>
                    </div>
                    <div className="bg-black/40 p-4 rounded-2xl">
                        <p className="text-gray-500 text-[9px] uppercase font-bold mb-2">Status</p>
                        <p className="text-emerald-400 font-mono text-xs font-bold">SUCCESS</p>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}