'use client';

import { useState, useEffect } from 'react';
import { parseEther, decodeEventLog } from 'viem';
import axios from 'axios';
import { useBurnerWallet } from '../hooks/useBurnerWallet';
import { 
  MOCK_TOKEN_ADDRESS, 
  ESCROW_CONTRACT_ADDRESS, 
  ERC20_ABI, 
  ESCROW_ABI 
} from './constants';

export default function Dashboard() {
  const { address, walletClient, isReady } = useBurnerWallet();
  const [viewRole, setViewRole] = useState<'buyer' | 'seller'>('buyer');
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingMsg, setLoadingMsg] = useState('');
  
  // 订单表单 (买家专用)
  const [sellerAddr, setSellerAddr] = useState('');
  const [amount, setAmount] = useState('50000');
  const [goods, setGoods] = useState('High-value tech components batch #001');

  // 初始化：请求列表 & 检查余额
  useEffect(() => {
    if (isReady && address) {
      fetchOrders();
      checkAndMintMockUSDT();
    }
  }, [isReady, address, viewRole]);

  // 获取订单列表
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`http://localhost:8080/api/orders?user=${address}&role=${viewRole}`);
      setOrders(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  };

  // 极致 UX：如果用户没钱，后台自动给他打 100 万测试 USDT！
  const checkAndMintMockUSDT = async () => {
    try {
      const balance = await walletClient.readContract({
        address: MOCK_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address]
      });
      if (balance === 0n) {
        console.log("Empty wallet detected. Auto-minting Mock USDT...");
        await walletClient.writeContract({
          address: MOCK_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'mint',
          args: [address, parseEther('1000000')]
        });
      }
    } catch (e) {
      console.error("Auto mint failed", e);
    }
  };

  // ==========================================
  // 核心流转 1：买家发起订单 (支付)
  // ==========================================
  const handleCreateOrder = async () => {
    if (!sellerAddr) return alert("Please enter seller address!");
    setLoadingMsg('1/3 AI Risk Engine analyzing...');
    
    try {
      // Step 1: 请求后端生成订单并获取 AI 风控签名
      const res = await axios.post('http://localhost:8080/api/orders', {
        buyer: address,
        seller: sellerAddr,
        token: MOCK_TOKEN_ADDRESS,
        amount: parseEther(amount).toString(),
        goods_content: goods,
        chain_id: 31337 
      });
      
      const { order_id, signature, goods_hash, deadline } = res.data;
      
      // Step 2: 隐形钱包自动静默授权 (Approve)
      setLoadingMsg('2/3 Approving Mock USDT (Silent)...');
      const approveHash = await walletClient.writeContract({
        address: MOCK_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ESCROW_CONTRACT_ADDRESS, parseEther(amount)]
      });
      await walletClient.waitForTransactionReceipt({ hash: approveHash });

      // Step 3: 隐形钱包自动调用担保合约上链
      setLoadingMsg('3/3 Smart Escrow Locking Funds...');
      const txHash = await walletClient.writeContract({
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'createOrder',
        args: [
          sellerAddr as `0x${string}`,
          MOCK_TOKEN_ADDRESS,
          parseEther(amount),
          goods_hash as `0x${string}`,
          BigInt(deadline),
          signature as `0x${string}`
        ]
      });

      // 解析链上日志，获取生成的真实 orderId
      const receipt = await walletClient.waitForTransactionReceipt({ hash: txHash });
      let contractOrderId = 0;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: ESCROW_ABI, data: log.data, topics: log.topics });
          if (decoded.eventName === 'OrderCreated') contractOrderId = Number((decoded.args as any).orderId);
        } catch (e) {}
      }

      // Step 4: 将链上成功状态同步回后端
      await axios.post('http://localhost:8080/api/orders/sync', {
        id: order_id,
        contract_order_id: contractOrderId,
        tx_hash: txHash
      });

      alert("🎉 Payment Secured on Chain!");
      fetchOrders();
    } catch (err: any) {
      alert("Error: " + (err.response?.data?.error || err.message));
    } finally {
      setLoadingMsg('');
    }
  };

  // ==========================================
  // 核心流转 2：卖家发货
  // ==========================================
  const handleShip = async (dbId: string) => {
    setLoadingMsg('Updating logistics status...');
    try {
      await axios.put(`http://localhost:8080/api/orders/${dbId}/status`, {
        status: 'SHIPPED',
        logistics_id: `FEDEX-${Math.floor(Math.random() * 1000000)}`
      });
      fetchOrders();
    } finally {
      setLoadingMsg('');
    }
  };

  // ==========================================
  // 核心流转 3：买家确认收货 (释放资金)
  // ==========================================
  const handleReceive = async (dbId: string, contractOrderId: number) => {
    setLoadingMsg('Releasing Escrow Funds on Chain...');
    try {
      // 链上释放资金
      const txHash = await walletClient.writeContract({
        address: ESCROW_CONTRACT_ADDRESS,
        abi: ESCROW_ABI,
        functionName: 'releaseFunds',
        args: [BigInt(contractOrderId)]
      });
      await walletClient.waitForTransactionReceipt({ hash: txHash });

      // 后端状态更新
      await axios.put(`http://localhost:8080/api/orders/${dbId}/status`, {
        status: 'COMPLETED'
      });
      alert("✅ Funds Released to Seller!");
      fetchOrders();
    } catch (err: any) {
      alert("Release failed: " + err.message);
    } finally {
      setLoadingMsg('');
    }
  };

  if (!isReady) return <div className="p-10 text-center font-mono">Initializing Encrypted Burner Wallet...</div>;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* 顶部：导航与角色切换器 */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
              🌍 GlobalPay Web3 <span className="text-sm font-normal bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full">V4.0 Escrow</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-mono">My Burner Identity: {address}</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setViewRole('buyer')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${viewRole === 'buyer' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              🛍️ Buyer Console
            </button>
            <button 
              onClick={() => setViewRole('seller')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${viewRole === 'seller' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              📦 Seller Console
            </button>
          </div>
        </header>

        {/* 动态加载浮层 */}
        {loadingMsg && (
          <div className="fixed top-4 right-4 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-pulse border border-slate-700">
            ⏳ {loadingMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 左侧：操作区 (仅在买家视角显示创建订单) */}
          {viewRole === 'buyer' && (
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
              <h2 className="text-lg font-bold text-slate-800 mb-6 border-b pb-2">Create Trade Order</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Supplier (Seller) Address</label>
                  <input type="text" value={sellerAddr} onChange={e => setSellerAddr(e.target.value)} placeholder="0x..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Amount (USDT)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Goods Description (Encrypted)</label>
                  <textarea rows={3} value={goods} onChange={e => setGoods(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/>
                </div>
                <button 
                  onClick={handleCreateOrder} 
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
                >
                  Pay & Lock Funds 🔒
                </button>
              </div>
            </div>
          )}

          {/* 右侧/全屏：订单历史账本 */}
          <div className={`${viewRole === 'buyer' ? 'lg:col-span-2' : 'lg:col-span-3'} bg-white p-6 rounded-2xl shadow-sm border border-slate-100`}>
            <h2 className="text-lg font-bold text-slate-800 mb-6 border-b pb-2">
              {viewRole === 'buyer' ? 'My Purchase Orders' : 'My Sales Orders'}
            </h2>
            
            {orders.length === 0 ? (
              <div className="py-12 text-center text-slate-400">No orders found.</div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="p-5 border border-slate-100 rounded-xl hover:shadow-md transition bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    
                    {/* 订单信息 */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono bg-slate-200 px-2 py-1 rounded text-slate-700">#{order.id.slice(0,6)}</span>
                        <span className="font-bold text-lg text-slate-800">${parseInt(order.amount).toLocaleString()} USDT</span>
                        
                        {/* 状态徽章 */}
                        {order.status === 'PENDING' && <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-full">Pending</span>}
                        {order.status === 'PAID' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Funds Locked</span>}
                        {order.status === 'SHIPPED' && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Shipped ({order.logistics_id})</span>}
                        {order.status === 'COMPLETED' && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Completed</span>}
                      </div>
                      
                      <div className="text-sm text-slate-500">
                        Counterparty: <span className="font-mono">{viewRole === 'buyer' ? order.seller_addr : order.buyer_addr}</span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono truncate max-w-md">
                        Chain Tx: {order.tx_hash || 'Waiting for chain...'}
                      </div>
                    </div>

                    {/* 操作按钮 (根据状态和角色) */}
                    <div>
                      {viewRole === 'seller' && order.status === 'PAID' && (
                        <button onClick={() => handleShip(order.id)} className="px-5 py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold rounded-lg shadow transition">
                          Ship Goods
                        </button>
                      )}
                      
                      {viewRole === 'buyer' && order.status === 'SHIPPED' && (
                        <button onClick={() => handleReceive(order.id, order.contract_order_id)} className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-lg shadow transition">
                          Confirm Receipt
                        </button>
                      )}

                      {order.status === 'COMPLETED' && (
                        <span className="text-green-500 font-bold text-xl">✓</span>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}