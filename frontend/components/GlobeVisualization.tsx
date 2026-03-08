import React, { useMemo, useState, useRef } from 'react';

// 🌍 扩军后的 15 大核心港口坐标系 (百分比)
const PORT_COORDINATES: Record<string, { x: number, y: number }> = {
  "Shanghai Port, China (Asia)": { x: 80, y: 40 },
  "Shenzhen Port, China (Asia)": { x: 79, y: 43 },
  "Rotterdam Port, Netherlands (Europe)": { x: 49, y: 25 },
  "Port of London, UK (Europe)": { x: 47, y: 23 },
  "Port of Hamburg, Germany (Europe)": { x: 51, y: 24 },
  "Port of St. Petersburg, Russia (Europe)": { x: 55, y: 19 },
  "Port of New York, USA (North America)": { x: 27, y: 32 },
  "Port of Los Angeles, USA (North America)": { x: 15, y: 38 },
  "Panama Canal, Panama (Central America)": { x: 24, y: 52 },
  "Port of Singapore (Asia)": { x: 76, y: 55 },
  "Port of Santos, Brazil (South America)": { x: 33, y: 75 },
  "Port of Durban, South Africa (Africa)": { x: 54, y: 78 },
  "Port Hedland, Australia (Oceania)": { x: 85, y: 75 },
  "Jebel Ali Port, UAE (Middle East)": { x: 63, y: 42 },
  "Port of Tokyo, Japan (Asia)": { x: 86, y: 35 },
  "Pyongyang, DPRK (Sanctioned)": { x: 82, y: 32 },
  "Unknown Dark Web Node": { x: 40, y: 60 },
  "Caracas Shell Corp (High Risk)": { x: 26, y: 55 }
};

export default function GlobalRadarAndTVL({ orders }: { orders: any[] }) {
  
  // ================= 战术地图缩放与拖拽状态 =================
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDragging) {
          setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.5, 4));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.5, 1));
  const resetMap = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  // ================= 数据计算 =================
  const tvl = useMemo(() => {
      const lockedOrders = orders.filter(o => o.Status === 'PAID' || o.Status === 'SHIPPED' || o.Status === 'DISPUTED');
      return lockedOrders.reduce((sum, o) => sum + o.Amount, 0);
  }, [orders]);

  const nodeHeat = useMemo(() => {
      const heat: Record<string, { count: number, safeCount: number, riskCount: number }> = {};
      orders.forEach(o => {
          if (!heat[o.Destination]) heat[o.Destination] = { count: 0, safeCount: 0, riskCount: 0 };
          heat[o.Destination].count++;
          if (o.IsFlagged) heat[o.Destination].riskCount++;
          else heat[o.Destination].safeCount++;
          
          if (o.Origin && o.Origin !== "Global Hub" && o.Origin !== "Global AI Routing") {
              if (!heat[o.Origin]) heat[o.Origin] = { count: 0, safeCount: 0, riskCount: 0 };
              heat[o.Origin].count++;
              heat[o.Origin].safeCount++;
          }
      });
      return heat;
  }, [orders]);

  const networkLinks = useMemo(() => {
      const links: { origin: string, dest: string, isRisk: boolean, id: string }[] = [];
      const recentOrders = orders.slice(0, 150); 
      recentOrders.forEach(o => {
          if (PORT_COORDINATES[o.Origin] && PORT_COORDINATES[o.Destination]) {
              links.push({ origin: o.Origin, dest: o.Destination, isRisk: o.IsFlagged, id: o.ID });
          }
      });
      return links;
  }, [orders]);

  return (
    <div className="w-full bg-gray-950 border border-gray-800 rounded-xl overflow-hidden flex flex-col md:flex-row h-[480px]">
        
        {/* ================= 左侧：交互式战术雷达图 ================= */}
        <div className="w-full md:w-2/3 h-full relative bg-[#060913] p-4 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4 z-20">
                <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest flex items-center shrink-0">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-ping"></span> Global P2P Tactical Radar
                </h3>
                
                {/* 缩放控制器面板 */}
                <div className="flex space-x-2 bg-gray-900 border border-gray-700 rounded-lg p-1">
                    <button onClick={zoomOut} className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white rounded text-sm font-bold transition">-</button>
                    <button onClick={resetMap} className="px-2 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white rounded text-[10px] font-mono transition">RESET</button>
                    <button onClick={zoomIn} className="w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white rounded text-sm font-bold transition">+</button>
                </div>
            </div>
            
            <style>{`
                @keyframes flowLine { to { stroke-dashoffset: -20; } }
                .animate-flow { animation: flowLine 1.5s linear infinite; }
            `}</style>

            {/* 可拖拽缩放的视图容器 */}
            <div className="flex-1 relative border border-blue-900/30 rounded-lg overflow-hidden bg-gray-950 cursor-grab active:cursor-grabbing"
                 onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} ref={mapRef}>
                
                {/* 核心 Transform 层 */}
                <div className="absolute inset-0 w-full h-full transition-transform duration-100 ease-out"
                     style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transformOrigin: 'center center' }}>
                    
                    {/* 底层世界地图 */}
                    <div className="absolute inset-0 z-0 opacity-40 pointer-events-none"
                        style={{
                            backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')`,
                            backgroundSize: '100% 100%',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            filter: 'invert(1) sepia(1) saturate(200%) hue-rotate(180deg) brightness(80%)'
                        }}>
                    </div>

                    {/* SVG 飞线层 */}
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-10">
                        {networkLinks.map((link) => {
                            const org = PORT_COORDINATES[link.origin];
                            const dst = PORT_COORDINATES[link.dest];
                            if (!org || !dst) return null;

                            const cx = (org.x + dst.x) / 2;
                            const cy = Math.min(org.y, dst.y) - 15; 
                            const pathData = `M ${org.x} ${org.y} Q ${cx} ${cy} ${dst.x} ${dst.y}`;

                            return (
                                <path key={link.id} d={pathData} fill="none" 
                                      stroke={link.isRisk ? "#ef4444" : "#10b981"} 
                                      strokeWidth={link.isRisk ? 0.6 / scale : 0.2 / scale} // 线宽随缩放调整，保持精致
                                      className="animate-flow" 
                                      opacity={link.isRisk ? "0.9" : "0.5"} 
                                      strokeDasharray="2 3" />
                            );
                        })}
                    </svg>

                    {/* 节点光晕层 */}
                    {Object.entries(PORT_COORDINATES).map(([name, coords]) => {
                        const data = nodeHeat[name] || { count: 0, safeCount: 0, riskCount: 0 };
                        const isActive = data.count > 0;
                        const isHighRisk = name.includes("Sanctioned") || name.includes("Dark") || name.includes("Risk");
                        
                        if (!isActive && !isHighRisk) return null; 

                        const showGreen = data.safeCount > 0;
                        const showRed = data.riskCount > 0 || isHighRisk;
                        
                        // 节点大小也根据缩放比例动态微调，防止放大后光圈过大挡住视线
                        const baseSize = isActive ? Math.min(25, 8 + data.count * 0.2) : 6;
                        const size = baseSize / (scale * 0.7);

                        return (
                            <div key={name} 
                                 className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center group z-20"
                                 style={{ left: `${coords.x}%`, top: `${coords.y}%` }}>
                                
                                <div className="relative flex items-center justify-center">
                                    {showGreen && <div className="absolute rounded-full animate-ping opacity-30 bg-emerald-400 pointer-events-none" style={{ width: size, height: size }}></div>}
                                    {showRed && isActive && <div className="absolute rounded-full animate-ping opacity-60 bg-red-500 pointer-events-none" style={{ width: size*0.8, height: size*0.8 }}></div>}
                                    
                                    <div className={`rounded-full border-2 z-10 pointer-events-none
                                        ${showRed && !showGreen ? 'bg-red-900 border-red-500 shadow-[0_0_10px_#ef4444]' : 
                                          showGreen && !showRed ? 'bg-emerald-900 border-emerald-400 shadow-[0_0_10px_#10b981]' : 
                                          'bg-yellow-900 border-yellow-500 shadow-[0_0_10px_#eab308]'}`}
                                         style={{ width: size*0.5, height: size*0.5 }}></div>
                                </div>
                                
                                <div className={`mt-1 whitespace-nowrap font-mono px-1.5 py-0.5 rounded bg-black/80 border pointer-events-none
                                    ${showRed && !showGreen ? 'text-red-400 border-red-900' : 
                                      showGreen && !showRed ? 'text-emerald-300 border-emerald-900' : 'text-yellow-400 border-yellow-900'} 
                                    ${showRed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                                    style={{ fontSize: `${8 / scale}px` }}> {/* 字体大小随缩放调整 */}
                                    {name.split(',')[0]}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* ================= 右侧：TVL 金库 ================= */}
        <div className="w-full md:w-1/3 bg-gray-900 border-l border-gray-800 p-6 flex flex-col justify-center relative overflow-hidden z-20">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl"></div>
            <div className="mb-8 relative z-10">
                <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-2">Smart Contract Vault</h3>
                <h2 className="text-white text-lg font-black tracking-tight mb-1">Total Value Locked (TVL)</h2>
                <p className="text-gray-400 text-xs">Capital securely frozen in Escrow waiting for AI clearance & physical logistics.</p>
            </div>
            <div className="relative z-10 bg-black/40 border border-gray-800 p-5 rounded-2xl shadow-inner mb-6">
                <div className="text-emerald-400 text-4xl font-black font-mono tracking-tighter">
                    $ {tvl.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                </div>
                <div className="text-gray-500 text-xs font-mono mt-2">BUSD Equivalent</div>
            </div>
            <div className="space-y-4 relative z-10">
                <div className="w-full">
                    <div className="flex justify-between text-xs mb-1 font-mono"><span className="text-blue-400">Escrow Security</span><span className="text-blue-400">100%</span></div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="w-full h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div></div>
                </div>
                <div className="w-full">
                    <div className="flex justify-between text-xs mb-1 font-mono"><span className="text-purple-400">DeFi Financing Pool</span><span className="text-purple-400">Active</span></div>
                    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className="w-[80%] h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)] animate-pulse"></div></div>
                </div>
            </div>
        </div>
    </div>
  );
}