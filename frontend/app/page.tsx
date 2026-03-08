"use client";

import { useEffect, useState } from "react";
import { parseAbi, parseEther, createWalletClient, createPublicClient, http, publicActions, formatEther } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { BACKEND_URL, PAYMENT_ESCROW_ADDRESS, MOCK_ERC20_ADDRESS } from "./constants";

const ANVIL_MNEMONIC = "test test test test test test test test test test test junk";
const DESTINATIONS = ["Rotterdam, Netherlands", "Hamburg, Germany", "Los Angeles, USA", "Singapore, Singapore", "Dubai, UAE", "Pyongyang, DPRK (Sanctioned)", "Unknown Dark Web Node"];

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

// ================= 终极 i18n 多语言专业字典库 =================
const dict = {
  "zh": {
    "sys_desc": "基于不可篡改合约与动态AI风控的全球结算网。",
    "auth_login": "系统登录", "auth_register": "企业入驻 (KYC)", "auth_demo_select": "演示通道：快速选择企业节点", "auth_password": "访问密钥", "auth_btn_login": "验证并安全登录", "auth_reg_name": "企业法定名称", "auth_reg_role": "业务角色", "auth_reg_btn": "提交认证并注册上链",
    "buyer_portal": "全球采购商 (Buyer)", "seller_portal": "全球供应商 (Seller)",
    "bank_balance": "法币可用余额", "platform_balance": "数字系统余额", "deposit": "划转入金", "withdraw": "划转提现", "logout": "安全退出",
    "new_transfer": "新建国际汇款", "payee": "收款企业", "dest_port": "物流目的港口", "amount_requested": "对方索要金额", "escrow_pay": "🛡️ 担保支付", "direct_pay": "⚡ P2P 直汇", "submit": "提交指令",
    "trade_flow": "企业财务业务流", "status_paid": "💰 等待发货", "status_shipped": "🚢 国际运输中", "status_completed": "✅ 交易已结算", "status_revoked": "🔙 交易撤销", "status_refunded": "🔙 仲裁退款完毕", "status_disputed": "⚖️ 平台仲裁介入中",
    "btn_ship": "📦 确认发货", "btn_receipt": "🤝 确认收货并结款", "btn_dispute": "⚠️ 发起仲裁", "btn_finance": "🏦 质押订单: 提前提取 80%", "label_financed": "🏦 平台已垫资 80%",
    "bi_vol": "累计流转资金", "bi_pend": "在途/待处理订单", "bi_defi": "DeFi 平台授信 / 已垫资",
    "btn_passport": "📜 链上护照", "passport_title": "企业数字身份 (Web3 KYC)", "kyc_tier": "跨国合规级别", "ai_score": "AI 信用评级", "notifications": "消息中心", "empty_orders": "暂无流水"
  },
  "ru": {
    "sys_desc": "Глобальная сеть на базе смарт-контрактов и ИИ для контроля рисков.",
    "auth_login": "Вход в систему", "auth_register": "Регистрация (KYC)", "auth_demo_select": "Демо: Выбор узла сети", "auth_password": "Пароль доступа", "auth_btn_login": "Авторизоваться", "auth_reg_name": "Юридическое название", "auth_reg_role": "Роль в сети", "auth_reg_btn": "Отправить KYC",
    "buyer_portal": "Импортер", "seller_portal": "Экспортер",
    "bank_balance": "Фиатный баланс", "platform_balance": "Цифровой резерв", "deposit": "Пополнить", "withdraw": "Вывести", "logout": "Выйти",
    "new_transfer": "Новый перевод", "payee": "Получатель", "dest_port": "Порт назначения", "amount_requested": "Сумма к оплате", "escrow_pay": "🛡️ Безопасная сделка", "direct_pay": "⚡ P2P Перевод", "submit": "Отправить",
    "trade_flow": "Финансовые операции", "status_paid": "💰 Ожидает отправки", "status_shipped": "🚢 В пути (Транзит)", "status_completed": "✅ Завершено", "status_revoked": "🔙 Отменено", "status_refunded": "🔙 Возврат (Арбитраж)", "status_disputed": "⚖️ Спор (Арбитраж)",
    "btn_ship": "📦 Подтвердить отправку", "btn_receipt": "🤝 Подтвердить получение", "btn_dispute": "⚠️ Открыть спор", "btn_finance": "🏦 Факторинг: 80%", "label_financed": "🏦 Профинансировано 80%",
    "bi_vol": "Общий оборот", "bi_pend": "В ожидании / Транзит", "bi_defi": "DeFi Кредит",
    "btn_passport": "📜 Web3 Паспорт", "passport_title": "Цифровая идентичность", "kyc_tier": "Уровень комплаенса", "ai_score": "Рейтинг ИИ", "notifications": "Уведомления", "empty_orders": "Нет транзакций"
  }
};

export default function BusinessPortal() {
  const [lang, setLang] = useState<"zh" | "ru">("zh");
  const t = (key: keyof typeof dict.zh) => dict[lang][key] || dict["zh"][key];

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginUserId, setLoginUserId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [users, setUsers] = useState<User[]>([]);
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
  
  const [fiatRates, setFiatRates] = useState<Record<string, number>>({ "USD": 1.00, "CNY": 7.23, "RUB": 92.50, "EUR": 0.92, "GBP": 0.79, "JPY": 150.12 });
  const [oracleNews, setOracleNews] = useState("🌍 Connected to Oracle Node...");
  const [showPassport, setShowPassport] = useState(false);

  // ================= 极具质感的异步全局弹窗系统 =================
  const [modalState, setModalState] = useState<{isOpen: boolean, type: 'alert'|'confirm'|'prompt', title: string, message: string, defaultValue?: string, resolve?: (val: any) => void} | null>(null);
  const [modalInput, setModalInput] = useState("");

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

  // ================= 业务逻辑 =================
  useEffect(() => { fetchUsers(); }, []);
  const fetchUsers = () => { fetch(`${BACKEND_URL}/api/users`).then(res => res.json()).then(data => { if (data.success) { setUsers(data.data); setCurrentUser(prev => prev ? (data.data.find((u: User) => u.ID === prev.ID) || prev) : null); } }); };
  const fetchOracle = () => { fetch(`${BACKEND_URL}/api/oracle`).then(res => res.json()).then(data => { if (data.success) { setFiatRates(data.data.rates); setOracleNews(`[${data.data.time}] ${data.data.news}`); } }).catch(() => {}); };

  useEffect(() => {
    if (currentUser) {
      const storedBank = localStorage.getItem(`bank_v2_${currentUser.ID}`);
      if (storedBank) setBankBalance(Number(storedBank));
      else { const initMoney = 5000000; localStorage.setItem(`bank_v2_${currentUser.ID}`, initMoney.toString()); setBankBalance(initMoney); }
      fetchOrders(); fetchBalance(); fetchOracle();
      const interval = setInterval(() => { fetchOrders(); fetchBalance(); fetchUsers(); fetchOracle(); }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const updateBankBalance = (newAmount: number) => { setBankBalance(newAmount); localStorage.setItem(`bank_v2_${currentUser!.ID}`, newAmount.toString()); };
  const fetchOrders = () => { fetch(`${BACKEND_URL}/api/orders`).then(res => res.json()).then(data => { if (data.success) { const myOrders = data.data.filter((o: Order) => (o.BuyerID === currentUser?.ID || o.SellerID === currentUser?.ID) && o.ID.includes("NEW")); setOrders(myOrders); } }); };

  const getAccount = () => mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: currentUser!.AccountIndex });
  const fetchBalance = async () => {
    if (!currentUser) return;
    try {
      const publicClient = createPublicClient({ chain: foundry, transport: http('http://127.0.0.1:8545') });
      const bal = await publicClient.readContract({ address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI), functionName: 'balanceOf', args: [getAccount().address] });
      setCryptoBalance(Number(formatEther(bal as bigint)));
    } catch (e) {}
  };

  const getWalletClient = () => createWalletClient({ account: getAccount(), chain: foundry, transport: http('http://127.0.0.1:8545') }).extend(publicActions);

  const fiatPlatformBalance = (cryptoBalance * (fiatRates[currentUser?.FiatCurrency || "USD"])).toFixed(2);
  const selectedSeller = users.find(u => u.ID === Number(selectedSellerId));
  const sellerCurrency = selectedSeller ? selectedSeller.FiatCurrency : "USD";
  const sellerRate = fiatRates[sellerCurrency] || 1;
  const buyerRate = fiatRates[currentUser?.FiatCurrency || "USD"] || 1;
  const busdRequired = parseFloat(payAmount || "0") / sellerRate;
  const buyerFiatRequired = busdRequired * buyerRate;

  // ==== 替换 Alert/Prompt 的高级交互 ====
  const handleDeposit = async () => {
    if (currentUser?.HealthStatus !== "ACTIVE") return showModal('alert', 'Action Denied', 'Your account is restricted.');
    const amountStr = await showModal('prompt', 'Deposit Fiat to Web3', `Your Bank Balance: ${bankBalance.toLocaleString()} ${currentUser?.FiatCurrency}\nEnter amount to deposit:`, "100000");
    if (!amountStr) return;
    const depositFiat = parseFloat(amountStr);
    if (depositFiat > bankBalance) return showModal('alert', 'Error', 'Insufficient Bank Balance!');
    
    setLoading(true);
    try {
      const client = getWalletClient();
      await client.writeContract({ address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI), functionName: 'mint', args: [client.account.address, parseEther((depositFiat / buyerRate).toString())] });
      updateBankBalance(bankBalance - depositFiat);
      fetchBalance();
      showModal('alert', 'Success', `Successfully deposited ${depositFiat} ${currentUser?.FiatCurrency}`);
    } catch (e) {}
    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (currentUser?.HealthStatus !== "ACTIVE") return showModal('alert', 'Action Denied', 'Your account is restricted.');
    const amountStr = await showModal('prompt', 'Withdraw to Fiat Bank', `Available Platform Balance: ${fiatPlatformBalance} ${currentUser?.FiatCurrency}\nEnter amount to withdraw:`, fiatPlatformBalance);
    if (!amountStr) return;
    const withdrawFiat = parseFloat(amountStr);
    const burnBusd = withdrawFiat / buyerRate;
    if (burnBusd > cryptoBalance) return showModal('alert', 'Error', 'Insufficient Platform Balance!');
    
    setLoading(true);
    try {
      const client = getWalletClient();
      await client.writeContract({ address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI), functionName: 'transfer', args: ["0x000000000000000000000000000000000000dEaD", parseEther(burnBusd.toString())] });
      updateBankBalance(bankBalance + withdrawFiat);
      fetchBalance();
      showModal('alert', 'Success', `Successfully withdrew ${withdrawFiat} ${currentUser?.FiatCurrency}`);
    } catch (e) {}
    setLoading(false);
  };

  const handlePayment = async () => {
    if (currentUser?.HealthStatus !== "ACTIVE" && paymentType === "DIRECT") return showModal('alert', 'Denied', 'Restricted accounts cannot use Direct Transfer.');
    if (!selectedSeller || !payAmount) return showModal('alert', 'Form Error', 'Please select a payee and enter amount.');
    if (cryptoBalance < busdRequired) return showModal('alert', 'Insufficient Balance', `You need ${buyerFiatRequired.toFixed(2)} ${currentUser?.FiatCurrency} in platform balance.`);
    
    if (paymentType === "DIRECT") {
        const confirmed = await showModal('confirm', 'Warning', 'Direct transfers are irreversible and bypass AI Escrow protection. Proceed?');
        if (!confirmed) return;
    }

    setLoading(true);
    try {
      const client = getWalletClient();
      const sellerAccount = mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: selectedSeller.AccountIndex });
      const orderId = `ORD-NEW-${Math.floor(Math.random() * 100000)}`;
      const amountWei = parseEther(busdRequired.toString());
      let hash = "";
      if (paymentType === "DIRECT") {
        hash = await client.writeContract({ address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI), functionName: 'transfer', args: [sellerAccount.address, amountWei] });
      } else {
        await client.writeContract({ address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI), functionName: 'approve', args: [PAYMENT_ESCROW_ADDRESS as `0x${string}`, amountWei] });
        hash = await client.writeContract({ address: PAYMENT_ESCROW_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ESCROW_ABI), functionName: 'createAndPayOrder', args: [orderId, sellerAccount.address, amountWei] });
      }
      await fetch(`${BACKEND_URL}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: orderId, buyer_id: currentUser!.ID, seller_id: selectedSeller.ID, payment_type: paymentType, amount: busdRequired, fiat_amount: buyerFiatRequired, currency: currentUser!.FiatCurrency, origin: "Global Hub", destination: payDest, txHash: hash }) });
      setPayAmount(""); fetchOrders(); fetchBalance();
      showModal('alert', 'Success', 'Transaction submitted to blockchain network.');
    } catch (e) {}
    setLoading(false);
  };

  const genericContractAction = async (orderId: string, actionName: string, backendStatus: string, confirmationText: string) => {
      const confirmed = await showModal('confirm', 'Action Confirmation', confirmationText);
      if (!confirmed) return;
      setLoading(true);
      try {
        const client = getWalletClient();
        await client.writeContract({ address: PAYMENT_ESCROW_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ESCROW_ABI), functionName: actionName, args: [orderId] });
        if (backendStatus === 'FINANCE') {
            await fetch(`${BACKEND_URL}/api/orders/${orderId}/finance`, { method: 'PUT' });
        } else {
            await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: backendStatus }) });
        }
        fetchOrders(); fetchBalance();
      } catch (e) {}
      setLoading(false);
  };

  const handleLoginSubmit = () => { if (loginUserId) setCurrentUser(users.find(u => u.ID === Number(loginUserId)) || null); };

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
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 p-10 rounded-3xl shadow-2xl w-full max-w-md z-10">
                <div className="flex space-x-6 mb-8 border-b border-gray-800 pb-2">
                    <button className="pb-2 text-lg font-bold text-white border-b-2 border-blue-500">{t('auth_login')}</button>
                </div>
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">{t('auth_demo_select')}</label>
                        <select className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-sm text-white outline-none focus:border-blue-500 transition appearance-none" value={loginUserId} onChange={(e) => { setLoginUserId(e.target.value); if(e.target.value) setLoginPassword("******"); }}>
                            <option value="">-- Click to Select Node --</option>
                            <optgroup label="🏭 Sellers">{users.filter(u => u.Role === 'seller').map(u => <option key={u.ID} value={u.ID}>{u.CompanyName} ({u.FiatCurrency})</option>)}</optgroup>
                            <optgroup label="🛒 Buyers">{users.filter(u => u.Role === 'buyer').map(u => <option key={u.ID} value={u.ID}>{u.CompanyName} ({u.FiatCurrency})</option>)}</optgroup>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">{t('auth_password')}</label>
                        <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-sm text-white font-mono tracking-widest"/>
                    </div>
                    <button onClick={handleLoginSubmit} className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 text-white font-bold py-4 rounded-xl mt-4 transition-all">{t('auth_btn_login')}</button>
                </div>
            </div>
        </div>
      </div>
    );
  }

  const isHealthy = currentUser.HealthStatus === 'ACTIVE';

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 pb-20 relative">
      {/* 🚀 高级自定义模态框 (Glassmorphism UI) */}
      {modalState?.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={() => handleModalClose(null)}>
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 w-full max-w-sm animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <h3 className={`text-xl font-black mb-2 ${modalState.type === 'alert' ? 'text-blue-600' : 'text-gray-800'}`}>{modalState.title}</h3>
                <p className="text-gray-600 text-sm mb-6 leading-relaxed whitespace-pre-wrap">{modalState.message}</p>
                {modalState.type === 'prompt' && (
                    <input type="number" autoFocus value={modalInput} onChange={e => setModalInput(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 mb-6 outline-none focus:border-blue-500 font-bold" />
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

      {/* 预言机横幅 */}
      <div className="bg-gray-950 text-gray-300 px-6 py-2 text-xs font-mono flex items-center overflow-hidden border-b border-gray-800">
         <span className="font-bold text-emerald-400 mr-4 shrink-0 flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>ORACLE</span>
         <div className="whitespace-nowrap"><span className="text-emerald-300 ml-4">EUR {fiatRates["EUR"]?.toFixed(4)}</span><span className="text-blue-300 ml-4">GBP {fiatRates["GBP"]?.toFixed(4)}</span><span className="text-red-300 ml-4">CNY {fiatRates["CNY"]?.toFixed(4)}</span><span className="text-orange-300 ml-4">RUB {fiatRates["RUB"]?.toFixed(4)}</span></div>
      </div>

      <nav className={`bg-white border-b shadow-sm sticky top-0 z-20 px-8 py-3 flex justify-between items-center transition-colors ${!isHealthy ? 'border-red-400 bg-red-50/30' : ''}`}>
        <div className="flex items-center">
          <h1 className="text-xl font-black text-blue-900 inline-block mr-6">TrustPay</h1>
          <div className={`flex items-center px-3 py-1.5 rounded-full border ${isHealthy ? 'bg-blue-50 text-blue-800 border-blue-100' : 'bg-red-50 text-red-700 border-red-200'}`}>
            <span className="font-bold text-sm mr-3">{currentUser.CompanyName}</span>
          </div>
        </div>
        <div className="flex items-center space-x-5">
          <div className="relative">
             <button onClick={() => setShowBankMenu(!showBankMenu)} className="bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded-lg shadow hover:bg-gray-700 transition">🏦 {t('bank_balance')}</button>
             {showBankMenu && (
               <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-5 z-50">
                 <div className="text-xs font-bold text-gray-400 uppercase mb-1">{t('bank_balance')}</div>
                 <div className="text-3xl font-black text-blue-600 mb-6">{bankBalance.toLocaleString()} <span className="text-sm">{currentUser.FiatCurrency}</span></div>
                 <div className="flex justify-between gap-2 border-t pt-4">
                   <button onClick={handleDeposit} className={`flex-1 py-2 rounded font-bold text-xs ${isHealthy ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{t('deposit')}</button>
                   <button onClick={handleWithdraw} className={`flex-1 py-2 rounded font-bold text-xs ${isHealthy ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>{t('withdraw')}</button>
                 </div>
               </div>
             )}
          </div>
          <div className="flex flex-col border-l pl-5">
            <div className="text-xs text-gray-400 font-bold">{t('platform_balance')}</div>
            <div className="font-black text-lg text-gray-900">{fiatPlatformBalance} <span className="text-sm text-gray-500">{currentUser.FiatCurrency}</span></div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="text-sm font-bold text-red-500 hover:text-red-700 ml-2 p-2 rounded-lg transition">EXIT</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8 relative z-0">
        <div className="w-full lg:w-1/3">
          <div className={`bg-white rounded-3xl shadow-sm border p-8 transition-colors ${!isHealthy ? 'border-red-400' : 'border-gray-100'}`}>
            <h3 className="font-extrabold text-xl mb-6 text-gray-800">{currentUser.Role === 'buyer' ? t('new_transfer') : t('seller_portal')}</h3>
            {currentUser.Role === 'buyer' ? (
              <div className="space-y-5">
                {!isHealthy && (<div className="bg-red-50 p-4 rounded-xl border border-red-200"><h4 className="font-bold text-red-800 mb-1 text-sm">🔴 ACCOUNT RESTRICTED</h4></div>)}
                <div><label className="block text-xs font-bold text-gray-500 mb-2">{t('payee')}</label><select value={selectedSellerId} onChange={e => setSelectedSellerId(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm bg-white font-semibold outline-none"><option value="">-- Select --</option>{users.filter(u => u.Role === 'seller').map(s => <option key={s.ID} value={s.ID}>{s.CompanyName}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-2">{t('dest_port')}</label><select value={payDest} onChange={e => setPayDest(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm bg-white font-semibold outline-none">{DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100"><label className="block text-xs font-bold text-blue-800 mb-2">{t('amount_requested')} ({sellerCurrency})</label><input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 font-bold text-black outline-none" placeholder="0.00" /></div>
                <div className="pt-2"><div className="grid grid-cols-2 gap-3"><div onClick={() => setPaymentType('ESCROW')} className={`cursor-pointer border-2 rounded-xl p-3 ${paymentType === 'ESCROW' ? 'border-blue-500 bg-blue-50' : 'border-gray-100'}`}><p className="font-bold text-sm text-blue-900">{t('escrow_pay')}</p></div><div onClick={() => { if(isHealthy) setPaymentType('DIRECT') }} className={`border-2 rounded-xl p-3 transition ${paymentType === 'DIRECT' ? 'border-amber-500 bg-amber-50' : 'border-gray-100'} ${!isHealthy ? 'cursor-not-allowed opacity-40 grayscale bg-gray-100' : 'cursor-pointer hover:border-gray-300'}`}><p className="font-bold text-sm text-amber-900">{t('direct_pay')}</p></div></div></div>
                <button onClick={handlePayment} disabled={loading || !payAmount} className={`w-full text-white font-bold py-4 rounded-xl mt-4 shadow-lg disabled:opacity-50 ${!isHealthy ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'}`}>{loading ? '...' : t('submit')}</button>
              </div>
            ) : (
              <div className="space-y-4 text-sm text-emerald-800 bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                 <p className="font-bold text-lg mb-2">✔️ {t('seller_portal')}</p>
                 <p>Manage incoming orders and request DeFi factoring directly from the blockchain.</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-2/3">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[500px]">
            <h3 className="font-extrabold text-xl text-gray-800 mb-6 border-b pb-4">{t('trade_flow')}</h3>
            <div className="space-y-5">
              {orders.length === 0 && <div className="text-center py-10 text-gray-400 font-bold">{t('empty_orders')}</div>}
              {orders.map(order => {
                 const displayAmount = currentUser.Role === 'buyer' ? order.FiatAmount : (order.Amount * (fiatRates[currentUser.FiatCurrency] || 1));
                 return (
                <div key={order.ID} className={`border-2 rounded-2xl p-6 transition-all ${order.Status === 'DISPUTED' ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-white hover:border-blue-200 hover:shadow-lg'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center"><span className="font-mono text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded mr-3">{order.ID}</span>{order.IsFinanced && <span className="bg-purple-100 border border-purple-300 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black mr-3">{t('label_financed')}</span>}</div>
                      <div className="mt-2 text-sm">
                        {order.Status === 'PAID' && <span className="text-yellow-600 font-bold">{t('status_paid')}</span>}
                        {order.Status === 'SHIPPED' && <span className="text-blue-600 font-bold">{t('status_shipped')}</span>}
                        {order.Status === 'COMPLETED' && <span className="text-emerald-600 font-bold">{t('status_completed')}</span>}
                        {order.Status === 'REVOKED' && <span className="text-gray-400 font-bold line-through">{t('status_revoked')}</span>}
                        {order.Status === 'DISPUTED' && <span className="text-orange-600 font-black flex items-center"><span className="w-2 h-2 bg-orange-600 rounded-full mr-2 animate-ping"></span> {t('status_disputed')}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-black ${order.Status === 'REVOKED' || order.Status === 'REFUNDED' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{displayAmount?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-sm font-bold text-gray-500">{currentUser.FiatCurrency}</span></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end mt-4 pt-4 border-t border-gray-50">
                    <div className="flex space-x-3 w-full justify-end">
                      {currentUser.Role === 'seller' && order.Status === 'PAID' && order.PaymentType === 'ESCROW' && (
                        <button onClick={() => genericContractAction(order.ID, 'shipOrder', 'SHIPPED', 'Confirm that the goods have been shipped?')} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg">{t('btn_ship')}</button>
                      )}
                      {currentUser.Role === 'seller' && order.Status === 'SHIPPED' && !order.IsFinanced && (
                        <button onClick={() => genericContractAction(order.ID, 'requestFinancing', 'FINANCE', 'Pledge this invoice to receive an 80% immediate DeFi loan?')} className="px-4 py-2 border-2 border-purple-500 text-purple-700 bg-purple-50 text-sm font-black rounded-lg">{t('btn_finance')}</button>
                      )}
                      {currentUser.Role === 'buyer' && order.Status === 'SHIPPED' && (
                        <>
                          <button onClick={() => genericContractAction(order.ID, 'raiseDispute', 'DISPUTED', 'Freeze funds and raise a dispute?')} className="px-4 py-2 border-2 border-orange-500 text-orange-600 bg-orange-50 text-sm font-bold rounded-lg">{t('btn_dispute')}</button>
                          <button onClick={() => genericContractAction(order.ID, 'completeOrder', 'COMPLETED', 'Confirm receipt and release funds to seller?')} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg">{t('btn_receipt')}</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}