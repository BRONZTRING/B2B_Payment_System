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
  "en": {
    "sys_desc": "Global settlement network powered by immutable contracts & AI AML.",
    "auth_login": "Sign In", "auth_register": "Corporate KYC", "auth_demo_select": "Demo: Select Pre-seeded Node", "auth_password": "Access Key", "auth_btn_login": "Authenticate & Login", "auth_reg_name": "Legal Entity Name", "auth_reg_role": "Business Role", "auth_reg_btn": "Submit KYC & Register",
    "buyer_portal": "Global Buyer", "seller_portal": "Global Supplier",
    "bank_balance": "Fiat Bank Balance", "platform_balance": "Digital Vault Balance", "deposit": "Deposit", "withdraw": "Withdraw", "logout": "Logout",
    "new_transfer": "New Wire Transfer", "payee": "Beneficiary", "dest_port": "Destination Port", "amount_requested": "Requested Amount", "escrow_pay": "🛡️ Escrow Payment", "direct_pay": "⚡ P2P Direct", "submit": "Submit Order",
    "trade_flow": "Corporate Ledger", "status_paid": "💰 Awaiting Shipment", "status_shipped": "🚢 In Transit", "status_completed": "✅ Settled", "status_revoked": "🔙 Revoked", "status_refunded": "🔙 Arbitrated Refund", "status_disputed": "⚖️ Arbitration Pending",
    "btn_ship": "📦 Confirm Shipment", "btn_receipt": "🤝 Confirm Receipt", "btn_dispute": "⚠️ Raise Dispute", "btn_finance": "🏦 Pledge Order: Draw 80%", "label_financed": "🏦 80% Financed",
    "bi_vol": "Total Volume", "bi_pend": "Pending / In-Transit", "bi_defi": "DeFi Credit Drawn",
    "btn_passport": "📜 Web3 Passport", "passport_title": "Corporate Identity", "kyc_tier": "Compliance Tier", "ai_score": "AI Trust Score", "notifications": "Notifications", "empty_orders": "No transactions found"
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
  },
  "ja": {
    "sys_desc": "スマートコントラクトとAIリスク管理に基づくグローバル決済網。",
    "auth_login": "ログイン", "auth_register": "新規登録 (KYC)", "auth_demo_select": "デモ：既存ノードの選択", "auth_password": "パスワード", "auth_btn_login": "認証してログイン", "auth_reg_name": "法人名", "auth_reg_role": "ビジネスロール", "auth_reg_btn": "KYCを提出して登録",
    "buyer_portal": "グローバルバイヤー", "seller_portal": "グローバルサプライヤー",
    "bank_balance": "法定通貨残高", "platform_balance": "デジタル資産残高", "deposit": "入金する", "withdraw": "出金する", "logout": "ログアウト",
    "new_transfer": "新規海外送金", "payee": "受取企業", "dest_port": "仕向港", "amount_requested": "請求金額", "escrow_pay": "🛡️ エスクロー決済", "direct_pay": "⚡ P2P 直接送金", "submit": "送金実行",
    "trade_flow": "財務取引履歴", "status_paid": "💰 発送待ち", "status_shipped": "🚢 国際輸送中", "status_completed": "✅ 決済完了", "status_revoked": "🔙 キャンセル済み", "status_refunded": "🔙 仲裁返金済み", "status_disputed": "⚖️ 仲裁中",
    "btn_ship": "📦 発送を完了する", "btn_receipt": "🤝 決済を完了", "btn_dispute": "⚠️ 異議申し立て", "btn_finance": "🏦 債権担保: 80% 先払い", "label_financed": "🏦 80% 融資済み",
    "bi_vol": "累積取引額", "bi_pend": "処理中 / 輸送中", "bi_defi": "DeFi 融資枠",
    "btn_passport": "📜 Web3 パスポート", "passport_title": "企業デジタルID", "kyc_tier": "コンプライアンス層", "ai_score": "AI 信用スコア", "notifications": "通知センター", "empty_orders": "取引履歴がありません"
  }
};

export default function BusinessPortal() {
  const [lang, setLang] = useState<"zh" | "en" | "ru" | "ja">("zh");
  const t = (key: keyof typeof dict.zh) => dict[lang][key];

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
  
  const [detailOrder, setDetailOrder] = useState<Order | null>(null); 
  const [fiatRates, setFiatRates] = useState<Record<string, number>>({ "USD": 1.00, "CNY": 7.23, "RUB": 92.50, "EUR": 0.92, "GBP": 0.79, "JPY": 150.12 });
  const [oracleNews, setOracleNews] = useState("🌍 Connected to Oracle Node...");

  // ===== 终极 UI 新增状态 =====
  const [showPassport, setShowPassport] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const mockNotifs = [
    { id: 1, type: 'alert', msg: lang==='zh'?"预言机：全球外汇市场发生波动，请留意结汇成本。":"Oracle: High volatility in global FX markets detected.", time: "2 mins ago" },
    { id: 2, type: 'success', msg: lang==='zh'?"安全中心：检测到来自 Nizhny Novgorod 的可信登录。":"Security: Secure login from Nizhny Novgorod node.", time: "1 hr ago" },
    { id: 3, type: 'info', msg: lang==='zh'?"智能合约：您的底层授权额度充足。":"Smart Contract: ERC20 Allowance is sufficient.", time: "3 hrs ago" }
  ];

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
  const getUserName = (id: number) => { const u = users.find(user => user.ID === id); return u ? u.CompanyName : "Unknown Entity"; };

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

  const biTotalVolume = orders.filter(o => o.Status !== 'REVOKED' && o.Status !== 'REFUNDED').reduce((sum, o) => {
      return sum + (currentUser?.Role === 'buyer' ? o.FiatAmount : (o.Amount * (fiatRates[currentUser?.FiatCurrency || "USD"] || 1)));
  }, 0);
  const biPendingCount = orders.filter(o => o.Status === 'PAID' || o.Status === 'SHIPPED' || o.Status === 'DISPUTED').length;
  const biDeFiDebt = orders.filter(o => o.IsFinanced && o.Status !== 'COMPLETED').reduce((sum, o) => {
      return sum + (o.Amount * 0.8 * (fiatRates[currentUser?.FiatCurrency || "USD"] || 1));
  }, 0);

  const handleDeposit = async () => {
    if (currentUser?.HealthStatus !== "ACTIVE") return alert("Restricted.");
    const depositFiatStr = prompt(`Bank Balance: ${bankBalance.toLocaleString()} ${currentUser?.FiatCurrency}\nAmount to deposit:`, "100000");
    if (!depositFiatStr) return;
    const depositFiat = parseFloat(depositFiatStr);
    if (depositFiat > bankBalance) return alert(`Insufficient!`);
    const requiredBusd = depositFiat / buyerRate;
    setLoading(true);
    try {
      const client = getWalletClient();
      await client.writeContract({ address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI), functionName: 'mint', args: [client.account.address, parseEther(requiredBusd.toString())] });
      updateBankBalance(bankBalance - depositFiat);
      fetchBalance();
    } catch (e) {}
    setLoading(false);
  };
  const handleWithdraw = async () => {
    if (currentUser?.HealthStatus !== "ACTIVE") return alert("Restricted.");
    const withdrawFiatStr = prompt(`Platform Balance: ${fiatPlatformBalance} ${currentUser?.FiatCurrency}\nAmount to withdraw:`, fiatPlatformBalance);
    if (!withdrawFiatStr) return;
    const withdrawFiat = parseFloat(withdrawFiatStr);
    const burnBusd = withdrawFiat / buyerRate;
    if (burnBusd > cryptoBalance) return alert("Insufficient!");
    setLoading(true);
    try {
      const client = getWalletClient();
      await client.writeContract({ address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI), functionName: 'transfer', args: ["0x000000000000000000000000000000000000dEaD", parseEther(burnBusd.toString())] });
      updateBankBalance(bankBalance + withdrawFiat);
      fetchBalance();
    } catch (e) {}
    setLoading(false);
  };
  const handlePayment = async () => {
    if (currentUser?.HealthStatus !== "ACTIVE" && paymentType === "DIRECT") return alert("Restricted.");
    if (!selectedSeller || !payAmount) return alert("Fill form.");
    if (cryptoBalance < busdRequired) return alert(`Insufficient platform balance.`);
    setLoading(true);
    try {
      const client = getWalletClient();
      const sellerAccount = mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: selectedSeller.AccountIndex });
      const orderId = `ORD-NEW-${Math.floor(Math.random() * 100000)}`;
      const amountWei = parseEther(busdRequired.toString());
      let hash = "";
      if (paymentType === "DIRECT") {
        if(!confirm("Warning: Direct transfer is irreversible!")) { setLoading(false); return; }
        hash = await client.writeContract({ address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI), functionName: 'transfer', args: [sellerAccount.address, amountWei] });
      } else {
        await client.writeContract({ address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI), functionName: 'approve', args: [PAYMENT_ESCROW_ADDRESS as `0x${string}`, amountWei] });
        hash = await client.writeContract({ address: PAYMENT_ESCROW_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ESCROW_ABI), functionName: 'createAndPayOrder', args: [orderId, sellerAccount.address, amountWei] });
      }
      await fetch(`${BACKEND_URL}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: orderId, buyer_id: currentUser!.ID, seller_id: selectedSeller.ID, payment_type: paymentType, amount: busdRequired, fiat_amount: buyerFiatRequired, currency: currentUser!.FiatCurrency, origin: "Global Hub", destination: payDest, txHash: hash }) });
      setPayAmount(""); fetchOrders(); fetchBalance();
    } catch (e) {}
    setLoading(false);
  };
  const handleRevoke = async (orderId: string) => {
    if (!confirm("Revoke?")) return;
    setLoading(true);
    try {
      const client = getWalletClient();
      await client.writeContract({ address: PAYMENT_ESCROW_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ESCROW_ABI), functionName: 'revokeOrder', args: [orderId] });
      await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: "REVOKED" }) });
      fetchOrders(); fetchBalance();
    } catch (e) {}
    setLoading(false);
  };
  const handleShip = async (orderId: string) => {
    setLoading(true);
    try {
      const client = getWalletClient();
      await client.writeContract({ address: PAYMENT_ESCROW_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ESCROW_ABI), functionName: 'shipOrder', args: [orderId] });
      await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: "SHIPPED" }) });
      fetchOrders();
    } catch (e) {}
    setLoading(false);
  };
  const handleRequestFinancing = async (orderId: string) => {
    if (!confirm(`DeFi Loan Confirmation?`)) return;
    setLoading(true);
    try {
      const client = getWalletClient();
      await client.writeContract({ address: PAYMENT_ESCROW_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ESCROW_ABI), functionName: 'requestFinancing', args: [orderId] });
      await fetch(`${BACKEND_URL}/api/orders/${orderId}/finance`, { method: 'PUT' });
      fetchOrders(); fetchBalance();
    } catch (e) {}
    setLoading(false);
  };
  const handleConfirmReceipt = async (orderId: string) => {
    if (!confirm("Confirm Receipt?")) return;
    setLoading(true);
    try {
      const client = getWalletClient();
      await client.writeContract({ address: PAYMENT_ESCROW_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ESCROW_ABI), functionName: 'completeOrder', args: [orderId] });
      await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: "COMPLETED" }) });
      fetchOrders(); fetchBalance();
    } catch (e) {}
    setLoading(false);
  };
  const handleRaiseDispute = async (orderId: string) => {
    if (!confirm("Raise Dispute?")) return;
    setLoading(true);
    try {
      const client = getWalletClient();
      await client.writeContract({ address: PAYMENT_ESCROW_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ESCROW_ABI), functionName: 'raiseDispute', args: [orderId] });
      await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: "DISPUTED" }) });
      fetchOrders();
    } catch (e) {}
    setLoading(false);
  };

  const handleLoginSubmit = () => {
    if (!loginUserId) return;
    const u = users.find(u => u.ID === Number(loginUserId));
    if (u) setCurrentUser(u);
  };
  const handleMockRegister = () => { alert("KYC submitted to Blockchain Identity Node."); setAuthMode('login'); };

  const LangSwitcher = ({ style = "light" }: { style?: "light"|"dark" }) => (
    <div className={`flex space-x-1 p-1 rounded-lg ${style === 'dark' ? 'bg-white/10 border border-white/20' : 'bg-gray-100 border border-gray-200'}`}>
      <button onClick={() => setLang('zh')} className={`px-2 py-0.5 text-xs rounded font-bold transition ${lang === 'zh' ? 'bg-blue-600 text-white shadow' : (style==='dark'?'text-gray-300':'text-gray-500')}`}>中</button>
      <button onClick={() => setLang('en')} className={`px-2 py-0.5 text-xs rounded font-bold transition ${lang === 'en' ? 'bg-blue-600 text-white shadow' : (style==='dark'?'text-gray-300':'text-gray-500')}`}>EN</button>
      <button onClick={() => setLang('ru')} className={`px-2 py-0.5 text-xs rounded font-bold transition ${lang === 'ru' ? 'bg-blue-600 text-white shadow' : (style==='dark'?'text-gray-300':'text-gray-500')}`}>РУ</button>
      <button onClick={() => setLang('ja')} className={`px-2 py-0.5 text-xs rounded font-bold transition ${lang === 'ja' ? 'bg-blue-600 text-white shadow' : (style==='dark'?'text-gray-300':'text-gray-500')}`}>日</button>
    </div>
  );

  // ========================== 渲染：鉴权网关 ==========================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-950 flex font-sans relative overflow-hidden text-gray-200">
        <style>{`@keyframes ticker { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } } .animate-ticker { animation: ticker 25s linear infinite; } @keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
        <div className="absolute top-6 left-6 z-50"><LangSwitcher style="dark" /></div>
        <div className="hidden lg:flex w-1/2 flex-col justify-center px-20 relative bg-gradient-to-br from-gray-900 to-blue-950">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30"></div>
            <div className="z-10">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl mb-8 shadow-[0_0_30px_rgba(37,99,235,0.5)]">🌐</div>
                <h1 className="text-6xl font-black text-white mb-6 tracking-tight leading-tight">TrustPay <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Enterprise</span></h1>
                <p className="text-gray-400 text-xl mb-12 leading-relaxed max-w-md">{t('sys_desc')}</p>
                <div className="space-y-4">
                    <div className="flex items-center text-sm font-mono text-emerald-400"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-3 animate-pulse"></span> Immutable Smart Contracts</div>
                    <div className="flex items-center text-sm font-mono text-blue-400"><span className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse"></span> AI-Driven Isolation Forest AML</div>
                    <div className="flex items-center text-sm font-mono text-purple-400"><span className="w-2 h-2 bg-purple-500 rounded-full mr-3 animate-pulse"></span> DeFi Collateral Financing</div>
                </div>
            </div>
            <a href="/simulation" target="_blank" className="absolute bottom-10 left-20 px-5 py-2.5 bg-gray-800/50 border border-gray-700 text-gray-300 text-sm rounded-lg hover:bg-gray-800 transition flex items-center font-bold backdrop-blur">🎛️ Administrator Dashboard</a>
        </div>
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>
            <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 p-10 rounded-3xl shadow-2xl w-full max-w-md z-10">
                <div className="flex space-x-6 mb-8 border-b border-gray-800 pb-2">
                    <button onClick={() => setAuthMode('login')} className={`pb-2 text-lg font-bold transition-colors ${authMode === 'login' ? 'text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}>{t('auth_login')}</button>
                    <button onClick={() => setAuthMode('register')} className={`pb-2 text-lg font-bold transition-colors ${authMode === 'register' ? 'text-white border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-300'}`}>{t('auth_register')}</button>
                </div>
                {authMode === 'login' ? (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">{t('auth_demo_select')}</label>
                            {/* 【核心修复】：移除了非法的尖括号 < > */}
                            <select className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-sm text-white outline-none focus:border-blue-500 transition appearance-none" value={loginUserId} onChange={(e) => { setLoginUserId(e.target.value); if(e.target.value) setLoginPassword("TrustPay_Secure_Key_2026"); else setLoginPassword(""); }}>
                                <option value="">-- Click to Select Node --</option>
                                <optgroup label="🏭 Sellers">
                                    {users.filter(u => u.Role === 'seller').slice(0,10).map(u => <option key={u.ID} value={u.ID}>{u.CompanyName}</option>)}
                                </optgroup>
                                <optgroup label="🛒 Buyers">
                                    {users.filter(u => u.Role === 'buyer').slice(0,10).map(u => <option key={u.ID} value={u.ID}>{u.CompanyName}</option>)}
                                </optgroup>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">{t('auth_password')}</label>
                            <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-sm text-white outline-none focus:border-blue-500 transition font-mono tracking-widest"/>
                        </div>
                        <button onClick={handleLoginSubmit} className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 text-white font-bold py-4 rounded-xl mt-4 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all">{t('auth_btn_login')}</button>
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div><label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">{t('auth_reg_name')}</label><input type="text" placeholder="e.g. Global Tech LLC" className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-sm text-white outline-none focus:border-blue-500 transition" /></div>
                        <div><label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">{t('auth_reg_role')}</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="border border-gray-700 bg-gray-950 p-3 rounded-xl text-center text-sm hover:border-blue-500 cursor-pointer">🛒 Buyer</div>
                                <div className="border border-gray-700 bg-gray-950 p-3 rounded-xl text-center text-sm hover:border-blue-500 cursor-pointer">🏭 Seller</div>
                            </div>
                        </div>
                        <div><label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-widest">{t('auth_password')}</label><input type="password" placeholder="Create a strong password" className="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-sm text-white outline-none focus:border-blue-500 transition" /></div>
                        <button onClick={handleMockRegister} className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-bold py-4 rounded-xl mt-4 transition-all">{t('auth_reg_btn')}</button>
                    </div>
                )}
            </div>
        </div>
      </div>
    );
  }

  // ========================== 渲染：已登录主界面 ==========================
  const isHealthy = currentUser.HealthStatus === 'ACTIVE';

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800 pb-20 relative">
      <style>{`@keyframes ticker { 0% { transform: translateX(100vw); } 100% { transform: translateX(-100%); } } .animate-ticker { animation: ticker 25s linear infinite; } @keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
      
      <div className="bg-gray-950 text-gray-300 px-6 py-2 text-xs font-mono flex items-center overflow-hidden border-b border-gray-800">
         <span className="font-bold text-emerald-400 mr-4 shrink-0 flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>ORACLE FEED</span>
         <div className="whitespace-nowrap animate-ticker inline-block">
             <span className={oracleNews.includes("🚨") || oracleNews.includes("📉") || oracleNews.includes("🔥") ? "text-red-400 font-bold" : "text-gray-300"}>{oracleNews}</span>
             <span className="mx-10 text-gray-600">|</span><span>LIVE RATES: </span>
             <span className="ml-4 text-emerald-300">EUR {fiatRates["EUR"]?.toFixed(4)}</span><span className="ml-4 text-blue-300">GBP {fiatRates["GBP"]?.toFixed(4)}</span><span className="ml-4 text-red-300">CNY {fiatRates["CNY"]?.toFixed(4)}</span><span className="ml-4 text-orange-300">RUB {fiatRates["RUB"]?.toFixed(4)}</span><span className="ml-4 text-yellow-300">JPY {fiatRates["JPY"]?.toFixed(4)}</span>
         </div>
      </div>

      <nav className={`bg-white border-b shadow-sm sticky top-0 z-20 px-8 py-3 flex justify-between items-center transition-colors ${!isHealthy ? 'border-red-400 bg-red-50/30' : ''}`}>
        <div className="flex items-center">
          <h1 className="text-xl font-black text-blue-900 inline-block mr-6">TrustPay</h1>
          <div className={`flex items-center px-3 py-1.5 rounded-full border ${isHealthy ? 'bg-blue-50 text-blue-800 border-blue-100' : 'bg-red-50 text-red-700 border-red-200'}`}>
            <span className="font-bold text-sm mr-3">{currentUser.CompanyName}</span>
            <button onClick={() => setShowPassport(true)} className="flex items-center bg-white border border-gray-200 shadow-sm text-xs px-2 py-0.5 rounded hover:bg-gray-50 transition">
              {t('btn_passport')}
            </button>
          </div>
          <div className="ml-6"><LangSwitcher style="light" /></div>
        </div>
        <div className="flex items-center space-x-5">
          <div className="relative">
            <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 text-gray-500 hover:text-blue-600 transition bg-gray-100 rounded-full hover:bg-blue-50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            {showNotifs && (
              <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                <div className="bg-gray-50 px-4 py-3 font-bold text-sm text-gray-700 border-b">{t('notifications')}</div>
                <div className="max-h-64 overflow-y-auto">
                  {mockNotifs.map(n => (
                    <div key={n.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 text-xs">
                      <div className={`font-bold mb-1 ${n.type==='alert'?'text-red-600':n.type==='success'?'text-emerald-600':'text-blue-600'}`}>{n.type.toUpperCase()}</div>
                      <div className="text-gray-700 leading-relaxed mb-1">{n.msg}</div>
                      <div className="text-gray-400 font-mono text-[10px]">{n.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
             <button onClick={() => setShowBankMenu(!showBankMenu)} className="bg-gray-800 text-white text-sm font-bold px-4 py-2 rounded-lg shadow hover:bg-gray-700 transition">🏦 {t('bank_balance')}</button>
             {showBankMenu && (
               <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-5 z-50">
                 <div className="font-mono text-sm text-gray-700 mb-4 bg-gray-50 p-2 rounded">{currentUser.BankAccount}</div>
                 <div className="text-xs font-bold text-gray-400 uppercase mb-1">{t('bank_balance')}</div>
                 <div className="text-3xl font-black text-blue-600 mb-6">{bankBalance.toLocaleString()} <span className="text-sm">{currentUser.FiatCurrency}</span></div>
                 <div className="flex justify-between gap-2 border-t pt-4">
                   <button onClick={handleDeposit} className={`flex-1 py-2 rounded font-bold text-xs ${isHealthy ? 'bg-green-100 hover:bg-green-200 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{t('deposit')}</button>
                   <button onClick={handleWithdraw} className={`flex-1 py-2 rounded font-bold text-xs ${isHealthy ? 'bg-blue-100 hover:bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>{t('withdraw')}</button>
                 </div>
               </div>
             )}
          </div>
          <div className="flex flex-col border-l pl-5">
            <div className="text-xs text-gray-400 font-bold">{t('platform_balance')}</div>
            <div className="font-black text-lg text-gray-900">{fiatPlatformBalance} <span className="text-sm text-gray-500">{currentUser.FiatCurrency}</span></div>
          </div>
          <button onClick={() => { setCurrentUser(null); setLoginPassword(""); setLoginUserId(""); }} className="text-sm font-bold text-gray-500 hover:text-red-600 ml-2 p-2 rounded-lg hover:bg-red-50 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8 relative z-0">
        <div className="w-full lg:w-1/3">
          <div className={`bg-white rounded-3xl shadow-sm border p-8 transition-colors ${!isHealthy ? 'border-red-400' : 'border-gray-100'}`}>
            <h3 className="font-extrabold text-xl mb-6 text-gray-800">{currentUser.Role === 'buyer' ? t('new_transfer') : t('seller_portal')}</h3>
            {currentUser.Role === 'buyer' ? (
              <div className="space-y-5">
                {!isHealthy && (<div className="bg-red-50 p-4 rounded-xl border border-red-200"><h4 className="font-bold text-red-800 mb-1 text-sm">🔴 ACCOUNT RESTRICTED</h4></div>)}
                <div><label className="block text-xs font-bold text-gray-500 mb-2">{t('payee')}</label><select value={selectedSellerId} onChange={e => setSelectedSellerId(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm bg-white text-black font-semibold outline-none focus:border-blue-500"><option value="">-- Select --</option>{users.filter(u => u.Role === 'seller').map(s => <option key={s.ID} value={s.ID}>{s.CompanyName}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-2">{t('dest_port')}</label><select value={payDest} onChange={e => setPayDest(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm bg-white text-black font-semibold outline-none focus:border-blue-500">{DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 relative overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_3s_infinite]"></div><label className="block text-xs font-bold text-blue-800 mb-2 relative z-10">{t('amount_requested')} ({sellerCurrency})</label><div className="relative mb-3 z-10"><span className="absolute left-4 top-3 text-gray-400 font-bold">{sellerCurrency}</span><input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 pl-16 font-bold text-black outline-none focus:border-blue-500" placeholder="0.00" /></div></div>
                <div className="pt-2"><div className="grid grid-cols-2 gap-3"><div onClick={() => setPaymentType('ESCROW')} className={`cursor-pointer border-2 rounded-xl p-3 ${paymentType === 'ESCROW' ? 'border-blue-500 bg-blue-50' : 'border-gray-100'}`}><p className="font-bold text-sm text-blue-900">{t('escrow_pay')}</p></div><div onClick={() => { if(isHealthy) setPaymentType('DIRECT') }} className={`border-2 rounded-xl p-3 transition ${paymentType === 'DIRECT' ? 'border-amber-500 bg-amber-50' : 'border-gray-100'} ${!isHealthy ? 'cursor-not-allowed opacity-40 grayscale bg-gray-100' : 'cursor-pointer hover:border-gray-300'}`}><p className="font-bold text-sm text-amber-900">{t('direct_pay')}</p></div></div></div>
                <button onClick={handlePayment} disabled={loading || !payAmount} className={`w-full text-white font-bold py-4 rounded-xl mt-4 shadow-lg disabled:opacity-50 ${!isHealthy ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'}`}>{loading ? '...' : t('submit')}</button>
              </div>
            ) : (
              <div className="space-y-4 text-sm text-emerald-800 bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                 <p className="font-bold text-lg mb-2">✔️ {t('seller_portal')}</p>
                 <p className="pt-3 border-t border-emerald-200 mt-3"><span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold mr-2">DeFi</span>{t('btn_finance')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-2/3">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-900 to-blue-950 p-5 rounded-3xl text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <div className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">{t('bi_vol')}</div>
                <div className="text-2xl font-black">{biTotalVolume.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-sm font-normal">{currentUser.FiatCurrency}</span></div>
            </div>
            <div className="bg-white border border-gray-200 p-5 rounded-3xl shadow-sm">
                <div className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">{t('bi_pend')}</div>
                <div className="text-2xl font-black text-gray-800">{biPendingCount} <span className="text-sm font-normal text-gray-500">Orders</span></div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 p-5 rounded-3xl shadow-sm">
                <div className="text-purple-500 text-xs font-bold uppercase tracking-widest mb-1">{t('bi_defi')}</div>
                <div className="text-2xl font-black text-purple-900">{biDeFiDebt.toLocaleString(undefined, {maximumFractionDigits:0})} <span className="text-sm font-normal text-purple-500">{currentUser.FiatCurrency}</span></div>
            </div>
          </div>

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
                      <div className="flex items-center">
                          <span className="font-mono text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded mr-3">{order.ID}</span>
                          {order.IsFinanced && <span className="bg-purple-100 border border-purple-300 text-purple-700 px-2 py-0.5 rounded text-[10px] font-black mr-3">{t('label_financed')}</span>}
                      </div>
                      <div className="mt-2">
                        {order.Status === 'PAID' && <span className="text-yellow-600 font-bold text-sm">{t('status_paid')}</span>}
                        {order.Status === 'SHIPPED' && <span className="text-blue-600 font-bold text-sm">{t('status_shipped')}</span>}
                        {order.Status === 'COMPLETED' && <span className="text-emerald-600 font-bold text-sm">{t('status_completed')}</span>}
                        {order.Status === 'REVOKED' && <span className="text-gray-400 font-bold text-sm line-through">{t('status_revoked')}</span>}
                        {order.Status === 'REFUNDED' && <span className="text-emerald-600 font-bold text-sm">{t('status_refunded')}</span>}
                        {order.Status === 'DISPUTED' && <span className="text-orange-600 font-black text-sm flex items-center"><span className="w-2 h-2 bg-orange-600 rounded-full mr-2 animate-ping"></span> {t('status_disputed')}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-black ${order.Status === 'REVOKED' || order.Status === 'REFUNDED' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{displayAmount?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-sm font-bold text-gray-500">{currentUser.FiatCurrency}</span></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end mt-4 pt-4 border-t border-gray-50">
                    <div className="flex space-x-3 w-full justify-end">
                      {currentUser.Role === 'seller' && order.Status === 'PAID' && order.PaymentType === 'ESCROW' && (
                        <button onClick={() => handleShip(order.ID)} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-lg">{t('btn_ship')}</button>
                      )}
                      {currentUser.Role === 'seller' && order.Status === 'SHIPPED' && !order.IsFinanced && (
                        <button onClick={() => handleRequestFinancing(order.ID)} disabled={loading} className="px-4 py-2 border-2 border-purple-500 text-purple-700 bg-purple-50 hover:bg-purple-100 text-sm font-black rounded-lg shadow transition flex items-center">
                            {t('btn_finance')}
                        </button>
                      )}
                      {currentUser.Role === 'buyer' && order.Status === 'SHIPPED' && (
                        <>
                          <button onClick={() => handleRaiseDispute(order.ID)} disabled={loading} className="px-4 py-2 border-2 border-orange-500 text-orange-600 hover:bg-orange-50 text-sm font-bold rounded-lg transition">{t('btn_dispute')}</button>
                          <button onClick={() => handleConfirmReceipt(order.ID)} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-lg transition">{t('btn_receipt')}</button>
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

      {showPassport && (
        <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative">
              <div className="bg-gray-900 text-white p-6 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
                 <button onClick={() => setShowPassport(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
                 <div className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">{t('passport_title')}</div>
                 <h2 className="text-2xl font-black">{currentUser.CompanyName}</h2>
              </div>
              <div className="p-8 space-y-6">
                 <div>
                    <div className="text-gray-400 text-xs font-bold uppercase mb-1">EVM Address</div>
                    <div className="font-mono text-sm bg-gray-100 p-3 rounded-xl text-gray-700 break-all border border-gray-200">
                        {mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: currentUser.AccountIndex }).address}
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                        <div className="text-blue-600 text-xs font-bold uppercase mb-1">{t('kyc_tier')}</div>
                        <div className="font-black text-blue-900">Tier 3 (Global)</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                        <div className="text-emerald-600 text-xs font-bold uppercase mb-1">{t('ai_score')}</div>
                        <div className="font-black text-emerald-900 text-xl">99 / 100</div>
                    </div>
                 </div>
                 <div className="pt-4 border-t border-gray-100 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-blue-600/20 rounded-full flex items-center justify-center text-blue-600/30 font-bold -rotate-12 select-none">KYC<br/>PASS</div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}