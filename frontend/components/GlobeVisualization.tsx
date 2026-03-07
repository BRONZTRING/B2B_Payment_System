"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

const CITY_COORDS: Record<string, [number, number]> = {
  "Shanghai, China": [31.2304, 121.4737],
  "Shenzhen, China": [22.5431, 114.0579],
  "Los Angeles, USA": [34.0522, -118.2437],
  "Rotterdam, Netherlands": [51.9225, 4.4791],
  "Hamburg, Germany": [53.5511, 9.9937],
  "Moscow, Russia": [55.7558, 37.6173],
  "Singapore, Singapore": [1.3521, 103.8198],
  "Dubai, UAE": [25.2048, 55.2708],
  "Unknown": [0, 0],
  "High-Risk-Zone": [0, 0],
};

const getCoords = (cityName: string): [number, number] => {
  if (CITY_COORDS[cityName]) return CITY_COORDS[cityName];
  return [20 + Math.random() * 20, 100 + Math.random() * 40]; 
};

export default function GlobeVisualization({ orders }: { orders: any[] }) {
  const [arcsData, setArcsData] = useState<any[]>([]);
  const [ringsData, setRingsData] = useState<any[]>([]);
  const globeRef = useRef<any>();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 30, lng: 90, altitude: 2.2 }, 2000);
    }
  }, [isMounted]);

  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const newArcs: any[] = [];
    const newRings: any[] = [];

    orders.forEach((order) => {
      const [startLat, startLng] = getCoords(order.Origin);
      const [endLat, endLng] = getCoords(order.Destination);

      // 【核心修复】: 弃用 rgba，全部改用最稳定的 HEX 色值，避免 opacity 渲染崩溃
      let color = ["#059669", "#10b981"]; // 默认绿色 COMPLETED
      if (order.IsFlagged) {
        color = ["#991b1b", "#ef4444"]; // 红色警报
        newRings.push({ lat: startLat, lng: startLng, color: "#ef4444", maxR: 15, propagationSpeed: 2, repeatPeriod: 500 });
      } else if (order.Status === "SHIPPED") {
        color = ["#1e3a8a", "#3b82f6"]; // 蓝色在途
        newRings.push({ lat: endLat, lng: endLng, color: "#3b82f6", maxR: 5, propagationSpeed: 1, repeatPeriod: 1000 });
      } else if (order.Status === "PAID") {
        color = ["#854d0e", "#eab308"]; // 黄色刚支付
      }

      newArcs.push({
        startLat, startLng, endLat, endLng, color,
        name: `${order.Origin} -> ${order.Destination}`,
      });
    });

    setArcsData(newArcs);
    setRingsData(newRings);
  }, [orders]);

  if (!isMounted) return <div className="h-[400px] flex items-center justify-center text-emerald-500">正在启动 3D WebGL 引擎...</div>;

  return (
    <div className="w-full h-[450px] bg-gray-950 flex justify-center items-center overflow-hidden border border-gray-800 rounded-xl shadow-2xl relative cursor-move">
      <div className="absolute top-4 left-4 z-10 bg-gray-900/80 backdrop-blur border border-gray-700 px-4 py-2 rounded-lg pointer-events-none">
        <p className="text-xs text-gray-400 font-mono">GLOBAL LOGISTICS RADAR</p>
        <div className="flex space-x-3 mt-2">
          <span className="flex items-center text-xs text-emerald-400"><span className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></span> 完结</span>
          <span className="flex items-center text-xs text-blue-400"><span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span> 在途</span>
          <span className="flex items-center text-xs text-red-400"><span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span> 高危</span>
        </div>
      </div>
      
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        arcsData={arcsData}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={2000}
        arcAltitudeAutoScale={0.3}
        ringsData={ringsData}
        ringColor="color"
        ringMaxRadius="maxR"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
      />
    </div>
  );
}