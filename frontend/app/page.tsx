"use client";

import { useEffect, useState } from "react";
import { parseAbi, parseEther, createWalletClient, createPublicClient, http, publicActions, formatEther } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { BACKEND_URL, PAYMENT_ESCROW_ADDRESS, MOCK_ERC20_ADDRESS } from "./constants";

const ANVIL_MNEMONIC = "test test test test test test test test test test test junk";
const DESTINATIONS = ["Rotterdam, Netherlands", "Hamburg, Germany", "Los Angeles, USA", "Moscow, Russia", "Singapore, Singapore", "Dubai, UAE"];

// 模拟实时汇率 (锚定 1 USD / BUSD 为基准)
const FIAT_RATES: Record<string, number> = {
  "USD": 1.00,
  "CNY": 7.23,
  "RUB": 92.50,
  "EUR": 0.92,
  "GBP": 0.79,
  "JPY": 150.12
};

const LOCAL_ESCROW_ABI = [
  "function createAndPayOrder(string orderId, address payee, uint256 amount) external",
  "function completeOrder(string orderId) external",
  "function revokeOrder(string orderId) external"
];
const LOCAL_ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function mint(address to, uint256 amount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

interface User {
  ID: number;
  CompanyName: string;
  Role: string;
  AccountIndex: number;
  FiatCurrency: string;
  BankAccount: string;
}

interface Order {
  ID: string;
  BuyerID: number;
  SellerID: number;
  PaymentType: string;
  Amount: number;     // 底层 BUSD 金额
  FiatAmount: number; // 买家扣除的法币金额
  Currency: string;   // 买家法币类型
  Status: string;
  Origin: string;
  Destination: string;
  TxHash: string;
  LogisticsRoute: string; 
}

export default function BusinessPortal() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cryptoBalance, setCryptoBalance] = useState(0); 
  const [loading, setLoading] = useState(false);
  
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [payAmount, setPayAmount] = useState(""); // 现在这个代表“卖家要求的目标金额”
  const [payDest, setPayDest] = useState(DESTINATIONS[0]);
  const [paymentType, setPaymentType] = useState("ESCROW"); 
  
  const [trackingRoute, setTrackingRoute] = useState<any[] | null>(null);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/users`)
      .then(res => res.json())
      .then(data => { if (data.success) setUsers(data.data); });
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchOrders();
      fetchBalance();
      const interval = setInterval(() => { fetchOrders(); fetchBalance(); }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const fetchOrders = () => {
    fetch(`${BACKEND_URL}/api/orders`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const myOrders = data.data.filter((o: Order) => 
            (o.BuyerID === currentUser?.ID || o.SellerID === currentUser?.ID) && o.ID.includes("NEW")
          );
          setOrders(myOrders);
        }
      });
  };

  const getAccount = () => mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: currentUser!.AccountIndex });

  const fetchBalance = async () => {
    if (!currentUser) return;
    try {
      const publicClient = createPublicClient({ chain: foundry, transport: http('http://127.0.0.1:8545') });
      const bal = await publicClient.readContract({
        address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI),
        functionName: 'balanceOf', args: [getAccount().address]
      });
      setCryptoBalance(Number(formatEther(bal as bigint)));
    } catch (e) {}
  };

  const getWalletClient = () => {
    return createWalletClient({ account: getAccount(), chain: foundry, transport: http('http://127.0.0.1:8545') }).extend(publicActions);
  };

  // 法币余额计算
  const fiatBalance = (cryptoBalance * FIAT_RATES[currentUser?.FiatCurrency || "USD"]).toFixed(2);

  // 【核心功能：跨国汇率计算器】
  const selectedSeller = users.find(u => u.ID === Number(selectedSellerId));
  const sellerCurrency = selectedSeller ? selectedSeller.FiatCurrency : "USD";
  const sellerRate = FIAT_RATES[sellerCurrency];
  const buyerRate = FIAT_RATES[currentUser?.FiatCurrency || "USD"];
  
  // 计算逻辑：卖家金额 -> BUSD -> 买家法币金额
  const busdRequired = parseFloat(payAmount || "0") / sellerRate;
  const buyerFiatRequired = busdRequired * buyerRate;

  // ================= 弹窗修复 =================
  const openTracking = (routeJson: string) => {
    if (!routeJson) return alert("暂无物流信息");
    try {
      const parsed = JSON.parse(routeJson);
      setTrackingRoute(parsed);
    } catch (e) {
      alert("物流数据解析失败");
    }
  };

  // ================= 法币入金 =================
  const handleDeposit = async () => {
    const depositFiatStr = prompt(`请输入要从银行卡 [${currentUser?.BankAccount}] 转入的金额 (${currentUser?.FiatCurrency}):`, "1000000");
    if (!depositFiatStr) return;
    const depositFiat = parseFloat(depositFiatStr);
    const requiredBusd = depositFiat / buyerRate;

    setLoading(true);
    try {
      const client = getWalletClient();
      await client.writeContract({
        address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI),
        functionName: 'mint', args: [client.account.address, parseEther(requiredBusd.toString())],
      });
      alert(`🏦 入金成功！系统已将 ${depositFiat} ${currentUser?.FiatCurrency} 转化为底层数字储备。`);
      fetchBalance();
    } catch (e: any) { alert(`入金失败: ${e.shortMessage}`); }
    setLoading(false);
  };

  // ================= 法币提现 =================
  const handleWithdraw = async () => {
    const withdrawFiatStr = prompt(`请输入要提现到银行卡 [${currentUser?.BankAccount}] 的金额 (${currentUser?.FiatCurrency}):`, fiatBalance);
    if (!withdrawFiatStr) return;
    const withdrawFiat = parseFloat(withdrawFiatStr);
    const burnBusd = withdrawFiat / buyerRate;

    if (burnBusd > cryptoBalance) return alert("❌ 账户余额不足！");

    setLoading(true);
    try {
      const client = getWalletClient();
      await client.writeContract({
        address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI),
        functionName: 'transfer', args: ["0x000000000000000000000000000000000000dEaD", parseEther(burnBusd.toString())],
      });
      alert(`🏦 提现成功！${withdrawFiat} ${currentUser?.FiatCurrency} 预计 2 小时内到达您的银行账户。`);
      fetchBalance();
    } catch (e: any) { alert(`提现失败: ${e.shortMessage}`); }
    setLoading(false);
  };

  // ================= 多货币汇兑支付 =================
  const handlePayment = async () => {
    if (!selectedSeller || !payAmount) return alert("请填写完整表单！");
    
    // 检查买家底层余额是否足够支付所需的 BUSD
    if (cryptoBalance < busdRequired) return alert(`❌ 余额不足！您需要大约 ${buyerFiatRequired.toFixed(2)} ${currentUser?.FiatCurrency}。请先入金。`);

    setLoading(true);
    try {
      const client = getWalletClient();
      const sellerAccount = mnemonicToAccount(ANVIL_MNEMONIC, { addressIndex: selectedSeller.AccountIndex });
      const orderId = `ORD-NEW-${Math.floor(Math.random() * 100000)}`;
      const amountWei = parseEther(busdRequired.toString());

      let hash = "";

      if (paymentType === "DIRECT") {
        if(!confirm("⚠️ 警告：您选择了无担保直接打款。资金将瞬间到达对方账户且不可撤销！")) {
            setLoading(false); return;
        }
        hash = await client.writeContract({
          address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI),
          functionName: 'transfer', args: [sellerAccount.address, amountWei],
        });
      } else {
        await client.writeContract({ 
          address: MOCK_ERC20_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ERC20_ABI), 
          functionName: 'approve', args: [PAYMENT_ESCROW_ADDRESS as `0x${string}`, amountWei] 
        });
        hash = await client.writeContract({
          address: PAYMENT_ESCROW_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ESCROW_ABI),
          functionName: 'createAndPayOrder', args: [orderId, sellerAccount.address, amountWei],
        });
      }

      await fetch(`${BACKEND_URL}/api/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: orderId, buyer_id: currentUser!.ID, seller_id: selectedSeller.ID,
          payment_type: paymentType, amount: busdRequired, fiat_amount: buyerFiatRequired, currency: currentUser!.FiatCurrency,
          origin: "Shenzhen, China", destination: payDest, txHash: hash
        })
      });

      alert(`✅ 支付指令已提交。系统自动按汇率扣除 ${buyerFiatRequired.toFixed(2)} ${currentUser!.FiatCurrency}。`);
      setPayAmount(""); fetchOrders(); fetchBalance();
    } catch (e: any) { alert(`支付失败: ${e.shortMessage}`); }
    setLoading(false);
  };

  const handleRevoke = async (orderId: string) => {
    if (!confirm("确定要撤销此笔担保支付吗？资金将原路退回。")) return;
    setLoading(true);
    try {
      const client = getWalletClient();
      await client.writeContract({
        address: PAYMENT_ESCROW_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ESCROW_ABI),
        functionName: 'revokeOrder', args: [orderId],
      });
      await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: "REVOKED" })
      });
      alert("✅ 订单已成功撤销，资金已退回您的账户。");
      fetchOrders(); fetchBalance();
    } catch (e: any) { alert(`撤销失败: 对方可能已发货。${e.shortMessage}`); }
    setLoading(false);
  };

  const handleShip = async (orderId: string) => {
    const trackingNo = prompt("请输入国际物流单号:", "TRK" + Math.floor(Math.random() * 1000000));
    if (!trackingNo) return;
    setLoading(true);
    try {
      await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: "SHIPPED" })
      });
      fetchOrders();
    } catch (e) {}
    setLoading(false);
  };

  const handleConfirmReceipt = async (orderId: string) => {
    if (!confirm("确认收货？货款将按照汇率结转给卖家。")) return;
    setLoading(true);
    try {
      const client = getWalletClient();
      await client.writeContract({
        address: PAYMENT_ESCROW_ADDRESS as `0x${string}`, abi: parseAbi(LOCAL_ESCROW_ABI),
        functionName: 'completeOrder', args: [orderId],
      });
      await fetch(`${BACKEND_URL}/api/orders/${orderId}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: "COMPLETED" })
      });
      fetchOrders(); fetchBalance();
    } catch (e: any) { alert(`收货失败: ${e.shortMessage}`); }
    setLoading(false);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="absolute top-6 right-6">
            <a href="/simulation" target="_blank" className="px-4 py-2 bg-gray-900 text-white text-xs rounded-md shadow hover:bg-black transition flex items-center">
              <span className="mr-2">🌍</span> 开启底层区块链/AI 监控大屏
            </a>
        </div>
        <h1 className="text-5xl font-extrabold text-blue-900 mb-3 tracking-tight">TrustPay <span className="text-2xl font-normal text-blue-600">Enterprise</span></h1>
        <p className="text-gray-500 mb-12 text-center max-w-lg text-lg">
          新一代跨国企业结算网络。<br/>无缝衔接全球法币账户，实时汇率，重塑供应链信任。
        </p>
        
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100">
          <h2 className="text-xl font-bold mb-8 text-center text-gray-800">请选择实体企业入驻</h2>
          
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">全球采购商 (Buyer)</label>
            <select className="w-full border-2 border-gray-200 p-4 rounded-xl text-sm bg-gray-50 text-gray-800 focus:border-blue-500 focus:ring-0 transition" onChange={(e) => setCurrentUser(users.find(u => u.ID === Number(e.target.value)) || null)}>
              <option value="">-- 选择跨国买家企业 --</option>
              {users.filter(u => u.Role === 'buyer').map(u => <option key={u.ID} value={u.ID}>{u.CompanyName} ({u.FiatCurrency})</option>)}
            </select>
          </div>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-300 text-xs font-bold">OR</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">中国出口商 (Seller)</label>
            <select className="w-full border-2 border-gray-200 p-4 rounded-xl text-sm bg-gray-50 text-gray-800 focus:border-emerald-500 focus:ring-0 transition" onChange={(e) => setCurrentUser(users.find(u => u.ID === Number(e.target.value)) || null)}>
              <option value="">-- 选择国内供应商 --</option>
              {users.filter(u => u.Role === 'seller').map(u => <option key={u.ID} value={u.ID}>{u.CompanyName} ({u.FiatCurrency})</option>)}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      <nav className="bg-white border-b shadow-sm sticky top-0 z-10 px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-blue-900 inline-block mr-6 tracking-tight">TrustPay</h1>
          <span className={`font-bold px-3 py-1 rounded-full text-sm ${currentUser.Role === 'buyer' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {currentUser.CompanyName}
          </span>
        </div>
        <div className="flex items-center space-x-8">
          <div className="flex items-center bg-gray-50 border rounded-xl p-2 pr-6">
            <div className="flex flex-col space-y-2 mr-6 ml-2">
              <button onClick={handleDeposit} disabled={loading} className="text-xs bg-white border shadow-sm hover:bg-gray-100 text-gray-700 px-3 py-1 rounded transition font-bold text-green-700">⬇️ 法币入金</button>
              <button onClick={handleWithdraw} disabled={loading} className="text-xs bg-white border shadow-sm hover:bg-gray-100 text-gray-700 px-3 py-1 rounded transition font-bold text-blue-700">⬆️ 法币提现</button>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 font-bold mb-1">连结卡: {currentUser.BankAccount}</div>
              <div className={`font-black text-xl ${parseFloat(fiatBalance) === 0 ? 'text-red-500' : 'text-gray-900'}`}>
                {fiatBalance} <span className="text-sm font-semibold text-gray-500">{currentUser.FiatCurrency}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2">
              <a href="/simulation" target="_blank" className="text-xs text-center text-gray-500 hover:text-blue-600 font-bold underline transition">⚙️ 后台底座监控</a>
              <button onClick={() => setCurrentUser(null)} className="text-sm font-bold text-gray-400 hover:text-red-600 transition">安全退出</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/3">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <h3 className="font-extrabold text-xl mb-6 text-gray-800">{currentUser.Role === 'buyer' ? '新建国际汇款 / 采购担保' : '账户健康概览'}</h3>
            
            {currentUser.Role === 'buyer' ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">收款企业 (及结算货币)</label>
                  <select value={selectedSellerId} onChange={e => setSelectedSellerId(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-800 bg-gray-50 focus:bg-white focus:border-blue-400 transition">
                    <option value="">-- 请选择供应商 --</option>
                    {users.filter(u => u.Role === 'seller').map(s => <option key={s.ID} value={s.ID}>{s.CompanyName} ({s.FiatCurrency})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">物流目的港口</label>
                  <select value={payDest} onChange={e => setPayDest(e.target.value)} className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm text-gray-800 bg-gray-50 focus:bg-white focus:border-blue-400 transition">
                    {DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                
                {/* 动态汇率换算引擎 UI */}
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <label className="block text-xs font-bold text-blue-800 mb-2 uppercase">收款方索要金额 ({sellerCurrency})</label>
                  <div className="relative mb-3">
                    <span className="absolute left-4 top-3 text-gray-400 font-bold">{sellerCurrency}</span>
                    <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="w-full border-2 border-white rounded-xl p-3 pl-16 text-lg font-bold text-gray-900 bg-white focus:border-blue-400 transition shadow-sm" placeholder="0.00" />
                  </div>
                  {payAmount && (
                    <div className="text-xs text-gray-600 bg-white p-2 rounded border border-dashed border-gray-300">
                      <p className="flex justify-between"><span>实时汇率换算:</span> <span>1 {sellerCurrency} ≈ {(buyerRate/sellerRate).toFixed(4)} {currentUser.FiatCurrency}</span></p>
                      <p className="flex justify-between font-bold text-red-600 mt-1 border-t pt-1"><span>系统将扣除您:</span> <span>- {buyerFiatRequired.toFixed(2)} {currentUser.FiatCurrency}</span></p>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-gray-500 mb-3 uppercase">选择结算网络通道</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div onClick={() => setPaymentType('ESCROW')} className={`cursor-pointer border-2 rounded-xl p-3 transition ${paymentType === 'ESCROW' ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <p className="font-bold text-sm text-blue-900 mb-1">🛡️ 担保支付</p>
                      <p className="text-[10px] text-gray-500 leading-tight">发货前可撤销。收货后清算。</p>
                    </div>
                    <div onClick={() => setPaymentType('DIRECT')} className={`cursor-pointer border-2 rounded-xl p-3 transition ${paymentType === 'DIRECT' ? 'border-amber-500 bg-amber-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <p className="font-bold text-sm text-amber-900 mb-1">⚡ P2P 直汇</p>
                      <p className="text-[10px] text-gray-500 leading-tight">瞬间到账。<strong className="text-red-500">不可退款。</strong></p>
                    </div>
                  </div>
                </div>

                <button onClick={handlePayment} disabled={loading || !payAmount} className={`w-full text-white font-bold py-4 rounded-xl mt-4 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${paymentType === 'ESCROW' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'}`}>
                  {loading ? '安全网络处理中...' : (paymentType === 'ESCROW' ? '生成担保合约并锁款' : '确认无误，立即转账')}
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-sm text-gray-600">
                <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
                  <h4 className="font-bold text-emerald-800 mb-2 text-base">🟢 账户状态正常</h4>
                  <p className="text-emerald-700 leading-relaxed mb-3">您的企业已通过高级 KYC 认证。支持接收全球多种法币的担保订单。</p>
                  <ul className="list-disc pl-5 text-emerald-600 space-y-1">
                    <li>收到担保订单后，请放心发货。</li>
                    <li>一旦录入运单，买家将<strong className="text-red-500 underline">无法撤销</strong>付款。</li>
                    <li>买家确认收货，系统自动按汇率结算为您的本国法币 ({currentUser.FiatCurrency})。</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-2/3">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[600px]">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
              <h3 className="font-extrabold text-xl text-gray-800">企业财务与物流追踪面板</h3>
              <button onClick={fetchOrders} className="text-sm text-gray-500 hover:text-gray-800 font-bold bg-gray-100 px-3 py-1.5 rounded-lg transition">↻ 同步最新数据</button>
            </div>
            
            <div className="space-y-5">
              {orders.length === 0 && <div className="text-center py-20 text-gray-300 font-bold text-lg">企业暂无业务流水</div>}
              {orders.map(order => {
                 // 核心：卖家和买家看到的金额不一样！买家看自己付的法币，卖家看自己收的法币。
                 const displayAmount = currentUser.Role === 'buyer' ? order.FiatAmount : (order.Amount * FIAT_RATES[currentUser.FiatCurrency]);
                 
                 return (
                <div key={order.ID} className={`border-2 rounded-2xl p-6 transition-all ${order.Status === 'REVOKED' ? 'border-gray-100 bg-gray-50 opacity-70' : 'border-gray-100 bg-white hover:border-blue-200 hover:shadow-lg'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-mono text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded">单号: {order.ID}</span>
                        {order.PaymentType === 'DIRECT' && <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-sm border border-amber-200 uppercase tracking-widest">P2P 直汇</span>}
                        {order.PaymentType === 'ESCROW' && <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-sm border border-blue-200 uppercase tracking-widest">智能担保</span>}
                      </div>
                      
                      <div className="mt-2">
                        {order.Status === 'PAID' && <span className="text-yellow-600 font-bold text-sm flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></span> 资金已托管 (等待发货)</span>}
                        {order.Status === 'SHIPPED' && <span className="text-blue-600 font-bold text-sm flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span> 国际物流运输中</span>}
                        {order.Status === 'COMPLETED' && <span className="text-emerald-600 font-bold text-sm flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> 交易圆满闭环 (款项已结算)</span>}
                        {order.Status === 'REVOKED' && <span className="text-gray-500 font-bold text-sm flex items-center"><span className="w-2 h-2 rounded-full bg-gray-400 mr-2"></span> 交易已撤销 (资金已退回)</span>}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-black ${order.Status === 'REVOKED' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {displayAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-sm font-bold text-gray-500">{currentUser.FiatCurrency}</span>
                      </div>
                      {currentUser.Role === 'buyer' && order.Status !== 'REVOKED' && (
                        <div className="text-xs text-gray-500 font-bold mt-1">
                          (卖家实收: {(order.Amount * FIAT_RATES["CNY"]).toLocaleString()} CNY)
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end mt-6 pt-5 border-t border-gray-50">
                    <div className="text-xs text-gray-400 space-y-2">
                      <p className="flex items-center"><span className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center mr-2">📍</span> <span className="font-bold text-gray-600">{order.Origin} &rarr; {order.Destination}</span></p>
                      <p className="flex items-center"><span className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center mr-2">🧾</span> 链上清算哈希: <span className="font-mono text-gray-500 ml-1">TX-{order.TxHash.substring(2, 14).toUpperCase()}</span></p>
                    </div>

                    <div className="flex space-x-3">
                      {/* 【修复】增加非空校验，避免 JSON.parse 崩溃 */}
                      {(order.Status === 'SHIPPED' || order.Status === 'COMPLETED') && order.LogisticsRoute && order.LogisticsRoute.length > 5 && (
                        <button onClick={() => openTracking(order.LogisticsRoute)} className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-200 transition">
                          📍 展开物流追踪
                        </button>
                      )}
                      
                      {currentUser.Role === 'buyer' && order.Status === 'PAID' && order.PaymentType === 'ESCROW' && (
                        <button onClick={() => handleRevoke(order.ID)} disabled={loading} className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-bold rounded-xl transition border border-red-100">
                          🔙 撤销付款
                        </button>
                      )}

                      {currentUser.Role === 'seller' && order.Status === 'PAID' && order.PaymentType === 'ESCROW' && (
                        <button onClick={() => handleShip(order.ID)} disabled={loading} className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/30">
                          📦 录入运单并发货
                        </button>
                      )}

                      {currentUser.Role === 'buyer' && order.Status === 'SHIPPED' && (
                        <button onClick={() => handleConfirmReceipt(order.ID)} disabled={loading} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-500 transition shadow-lg shadow-blue-600/30">
                          🤝 确认收货 (解冻资金)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        </div>
      </main>

      {trackingRoute && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative transform transition-all">
            <button onClick={() => setTrackingRoute(null)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-800 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center font-bold transition">&times;</button>
            <h3 className="text-xl font-black mb-8 text-gray-800 border-b-2 border-gray-100 pb-4">🌐 全球供应链物流节点溯源</h3>
            <div className="space-y-8 pl-4 border-l-4 border-blue-100 ml-2">
              {trackingRoute.map((node: any, idx: number) => (
                <div key={idx} className="relative">
                  <span className={`absolute -left-[25px] top-1 w-4 h-4 rounded-full border-4 border-white ${idx === 0 || idx === trackingRoute.length -1 ? 'bg-blue-600 scale-125' : 'bg-gray-300'}`}></span>
                  <div className="ml-4">
                    <p className="text-xs text-gray-400 font-mono font-bold mb-1">{node.time}</p>
                    <p className="font-black text-gray-800 text-base">{node.node}</p>
                    <p className="text-sm font-bold text-blue-700 mt-1.5 bg-blue-50 px-3 py-1 rounded-md inline-block border border-blue-100">{node.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}