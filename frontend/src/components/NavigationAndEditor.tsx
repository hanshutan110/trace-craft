import React, { useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { 
  ArrowLeft, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Square as StopIcon, 
  PenTool, 
  Eraser, 
  Maximize2, 
  Sparkles, 
  RotateCw, 
  Undo,
  ShieldAlert,
  MapPin,
  Route as RouteIcon,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { CrsType, GeneratedRoute, GeoPoint, ScreenId } from '../types';
import { useI18n } from '../i18n';

/* ==========================================
   Screen 2: Map Navigation Screen (导航界面)
   ========================================== */
interface MapNavigationScreenProps {
  onNavigate: (screen: ScreenId) => void;
  selectedShapeId: string;
}

export const MapNavigationScreen: React.FC<MapNavigationScreenProps> = ({ 
  onNavigate,
  selectedShapeId: _selectedShapeId,
}) => {
  const { text } = useI18n();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVoiceOn, setIsVoiceOn] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(1935); // 约32分15秒
  const [progress, setProgress] = useState(0.64); // 64% progress
  const [deviation, setDeviation] = useState(8); // 8m deviation
  
  // Dynamic state for simulating the runner's path
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
      // Simulate slight variations in deviation meter
      setDeviation(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const newVal = Math.max(0, prev + delta);
        return newVal > 15 ? 10 : newVal;
      });
      // Simulate progress traveling loader
      setProgress(prev => {
        const next = prev + 0.005;
        return next >= 1 ? 0 : next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Pre-drawn star route vertex calculations for blue tracker point
  const starPoints = [
    { x: 125, y: 50 },
    { x: 147, y: 100 },
    { x: 200, y: 104 },
    { x: 160, y: 138 },
    { x: 173, y: 190 },
    { x: 125, y: 160 },
    { x: 77, y: 190 },
    { x: 90, y: 138 },
    { x: 50, y: 104 },
    { x: 103, y: 100 },
  ];

  const getTrackerCoord = () => {
    const numPoints = starPoints.length;
    const pathIndex = progress * numPoints;
    const currentIndex = Math.floor(pathIndex) % numPoints;
    const nextIndex = (currentIndex + 1) % numPoints;
    const ratio = pathIndex - Math.floor(pathIndex);
    
    const p1 = starPoints[currentIndex];
    const p2 = starPoints[nextIndex];
    
    return {
      x: p1.x + (p2.x - p1.x) * ratio,
      y: p1.y + (p2.y - p1.y) * ratio
    };
  };

  const tracker = getTrackerCoord();

  return (
    <div className="flex flex-col h-full bg-slate-100 relative select-none overflow-hidden">
      
      {/* 2.1 SIMULATED VECTOR MAP CANVAS */}
      <div className="absolute inset-0 z-0">
        <svg viewBox="0 0 250 400" className="w-full h-full object-cover">
          {/* Waterway background stream */}
          <rect width="250" height="400" fill="#EAF3FA" />
          
          {/* Parks & Forest zones */}
          <path d="M 0,0 L 80,0 L 100,50 L 50,120 L 0,60 Z" fill="#E6F2ED" opacity="0.8" />
          <path d="M 180,300 L 250,280 L 250,400 L 140,400 Z" fill="#E6F2ED" opacity="0.8" />
          
          {/* Secondary streets grey lines */}
          <path d="M -10,120 Q 120,130 260,110" fill="none" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M -10,120 Q 120,130 260,110" fill="none" stroke="#E1E5EB" strokeWidth="2.5" />

          <path d="M 100,-10 L 110,410" fill="none" stroke="#FFFFFF" strokeWidth="5" />
          <path d="M 100,-10 L 110,410" fill="none" stroke="#E1E5EB" strokeWidth="2" />
          
          <path d="M 30,220 C 130,220 200,180 260,250" fill="none" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M 30,220 C 130,220 200,180 260,250" fill="none" stroke="#E1E5EB" strokeWidth="2.5" />

          {/* Target Star glowing trajectory path */}
          <polygon
            points={starPoints.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#FF6B35"
            strokeWidth="4"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_4px_rgba(255,107,53,0.6)]"
          />
          
          {/* Already ran paths (in green) */}
          <polyline
            points={starPoints.slice(0, Math.ceil(progress * starPoints.length)).map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#10B981"
            strokeWidth="4"
            strokeLinejoin="round"
          />

          {/* Glowing Animated blue running tracking circular point */}
          <g transform={`translate(${tracker.x}, ${tracker.y})`}>
            {/* Pulsing expand wave */}
            <circle r="12" fill="#3B82F6" opacity="0.25" className="animate-ping" style={{ animationDuration: '2s' }} />
            <circle r="6" fill="#FFFFFF" />
            <circle r="4" fill="#1E40AF" />
          </g>

          {/* Tiny Directional arrows on map */}
          <g transform="translate(180, 80) rotate(15)">
            <path d="M -4,0 L 4,0 M 1,-3 L 4,0 L 1,3" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </g>
          <g transform="translate(70, 160) rotate(210)">
            <path d="M -4,0 L 4,0 M 1,-3 L 4,0 L 1,3" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      {/* 2.2 TOP FROSTED BLUR BAR */}
      <div className="absolute top-4 left-4 right-4 z-10 bg-white/70 backdrop-blur-md border border-white/20 rounded-2xl py-3 px-4 flex items-center justify-between shadow-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">{text('剩余距离', 'Remaining Distance')}</span>
          <span className="text-[15px] font-extrabold text-gray-800">
            {isPlaying ? (3.2 * (1 - progress)).toFixed(2) : '2.3'}km
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">{text('偏差', 'Deviation')}</span>
          <span className={`text-[13px] font-bold ${deviation > 10 ? 'text-red-500' : 'text-emerald-600'}`}>
            {text('偏差', 'Deviation')} {deviation}m
          </span>
        </div>
      </div>

      {/* 2.3 FLOATING DIRECTIVE BANNER */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 bg-linear-to-r from-blue-600/90 to-[#4FACFE]/90 text-white text-[11px] font-semibold px-3.5 py-1.5 rounded-full shadow-md flex items-center space-x-1.5 animate-bounce">
        <span>⚡</span>
        <span>{text('直行 150m 后右转跑', 'Go straight 150 m then turn right')}</span>
      </div>

      {/* 2.4 RIGHT LOWER CORNER MINI STATS HUD */}
      <div className="absolute bottom-32 right-4 z-10 bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-xl p-3 text-left shadow-lg text-white max-w-[90px]">
        <div>
          <p className="text-[9px] uppercase text-gray-400 leading-none">{text('实时配速', 'Real-time Pace')}</p>
          <p className="font-mono text-xs font-bold mt-0.5">6:15/km</p>
        </div>
      </div>

      {/* 2.5 BOTTOM FROSTED BLUR CONTROL HUD */}
      <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/75 backdrop-blur-lg border border-white/30 rounded-3xl p-5 shadow-lg">
        {/* Progress horizontal slider bar */}
        <div className="w-full bg-gray-200/50 rounded-full h-1 mb-4 relative overflow-hidden">
          <div 
            className="bg-linear-to-r from-[#4FACFE] to-[#00F2FE] h-full transition-all duration-500" 
            style={{ width: `${progress * 100}%` }}
          ></div>
        </div>

        {/* Dynamic distance running meter */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-left">
            <span className="text-[20px] font-extrabold text-gray-800">
              {(3.2 * progress).toFixed(2)}
            </span>
            <span className="text-xs text-gray-400 ml-0.5">{text('km已跑', 'km run')}</span>
          </div>
          <div className="text-right">
            <span className="text-[16px] font-semibold text-gray-600 font-mono">
              {formatTime(elapsedSeconds)}
            </span>
            <span className="text-[10px] text-gray-400 block">{text('用时', 'Elapsed')}</span>
          </div>
        </div>

        {/* Controls layout */}
        <div className="flex items-center justify-between px-2">
          {/* Pause / Play */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isPlaying 
                ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 active:scale-95' 
                : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 active:scale-95'
            }`}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-emerald-600 ml-0.5" />}
          </button>

          {/* Stop / Complete */}
          <button
            onClick={() => onNavigate('success')}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-500/30 active:scale-95 transition-transform"
          >
            <StopIcon size={24} className="fill-white" />
          </button>

          {/* Voice Toggle */}
          <button
            onClick={() => setIsVoiceOn(!isVoiceOn)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isVoiceOn 
                ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            {isVoiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

    </div>
  );
};


/* ==========================================
   Screen 9.1: Route Preview & Risk Confirm (路线预览与风险确认)
   ========================================== */
interface RoutePreviewScreenProps {
  onNavigate: (screen: ScreenId) => void;
  selectedShapeId: string;
  generatedRoute: GeneratedRoute | null;
  isRouteGenerating: boolean;
  routeGenerationError: string | null;
  onGenerateTemplateRoute: (shapeId: string, targetKm?: number) => Promise<void>;
  onStartGeneratedRoute: (riskConfirmed: boolean) => Promise<void>;
}

/**
 * 基于 Leaflet 的真实地图预览组件
 * 使用 OpenStreetMap 瓦片渲染用户所在位置附近的真实街道信息
 * 街道名称来自地图瓦片数据，随语言切换自动更新
 *
 * UX 增强：
 * - ResizeObserver 自适应容器尺寸
 * - 瓦片加载失败自动切换备用源
 * - 自定义缩放控件 + 一键适应路线按钮
 * - 三层状态路由：加载中 → 就绪 / 错误
 */
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const CRS_PI = Math.PI;
const CRS_A = 6378245.0;
const CRS_EE = 0.00669342162296594323;

function outOfChina(lat: number, lng: number): boolean {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * CRS_PI) + 20.0 * Math.sin(2.0 * x * CRS_PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(y * CRS_PI) + 40.0 * Math.sin((y / 3.0) * CRS_PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((y / 12.0) * CRS_PI) + 320 * Math.sin((y * CRS_PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * CRS_PI) + 20.0 * Math.sin(2.0 * x * CRS_PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(x * CRS_PI) + 40.0 * Math.sin((x / 3.0) * CRS_PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((x / 12.0) * CRS_PI) + 300.0 * Math.sin((x / 30.0) * CRS_PI)) * 2.0) / 3.0;
  return ret;
}

function gcj02ToWgs84(point: GeoPoint): GeoPoint {
  if (outOfChina(point.lat, point.lng)) return point;
  let dLat = transformLat(point.lng - 105.0, point.lat - 35.0);
  let dLng = transformLng(point.lng - 105.0, point.lat - 35.0);
  const radLat = (point.lat / 180.0) * CRS_PI;
  let magic = Math.sin(radLat);
  magic = 1 - CRS_EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((CRS_A * (1 - CRS_EE)) / (magic * sqrtMagic)) * CRS_PI);
  dLng = (dLng * 180.0) / ((CRS_A / sqrtMagic) * Math.cos(radLat) * CRS_PI);
  const mgLat = point.lat + dLat;
  const mgLng = point.lng + dLng;
  return { ...point, lat: point.lat * 2 - mgLat, lng: point.lng * 2 - mgLng };
}

function bd09ToGcj02(point: GeoPoint): GeoPoint {
  const x = point.lng - 0.0065;
  const y = point.lat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin((y * CRS_PI * 3000.0) / 180.0);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos((x * CRS_PI * 3000.0) / 180.0);
  return { ...point, lng: z * Math.cos(theta), lat: z * Math.sin(theta) };
}

function toLeafletPoint(point: GeoPoint, crsHint?: string): GeoPoint {
  const crs = (crsHint || 'wgs84') as CrsType;
  if (crs === 'gcj02') return gcj02ToWgs84(point);
  if (crs === 'bd09') return gcj02ToWgs84(bd09ToGcj02(point));
  return point;
}

/** 按语言获取瓦片源列表（优先 → 备用） */
function getTileUrls(language: 'cn' | 'en'): string[] {
  if (language === 'en') {
    return [
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ];
  }
  return [
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  ];
}

const RoutePreviewMap: React.FC<{
  points: GeoPoint[];
  crsHint?: string;
  language: 'cn' | 'en';
  t: (key: string) => string;
}> = ({ points, crsHint, language, t }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [mapStatus, setMapStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [tileError, setTileError] = useState(false);

  const hasPoints = Array.isArray(points) && points.length > 0;
  const leafletPoints = useMemo(
    () => points.map((point) => toLeafletPoint(point, crsHint)),
    [points, crsHint],
  );

  // 注入 Leaflet CSS（幂等）
  useEffect(() => {
    const href = LEAFLET_CSS;
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }, []);

  // 初始化 / 重建地图
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasPoints) {
      setMapStatus('idle');
      return;
    }

    // 销毁旧地图
    if (mapRef.current) {
      resizeObserverRef.current?.disconnect();
      mapRef.current.remove();
      mapRef.current = null;
      polylineRef.current = null;
      tileLayerRef.current = null;
    }

    setMapStatus('loading');
    setTileError(false);

    let cancelled = false;

    const initMap = () => {
      if (cancelled || !containerRef.current) return;

      const start = leafletPoints[0];
      const map = L.map(containerRef.current, {
        center: [start.lat, start.lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        doubleClickZoom: true,
        touchZoom: true,
        scrollWheelZoom: false, // 防止滚动页面时误缩放
        dragging: true,
      });

      // 添加瓦片
      const [primaryTileUrl, fallbackTileUrl] = getTileUrls(language);
      const tileLayer = L.tileLayer(primaryTileUrl, {
        maxZoom: 19,
        errorTileUrl: fallbackTileUrl,
      });

      tileLayer.on('tileerror', () => {
        if (!cancelled && !tileError) {
          // 主源失败，尝试用备用源替换
          tileLayer.setUrl(fallbackTileUrl);
          setTileError(true);
        }
      });

      tileLayer.on('load', () => {
        if (!cancelled) {
          setMapStatus('ready');
        }
      });

      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;

      // 路线折线
      const latLngs = leafletPoints.map((p) => L.latLng(p.lat, p.lng));
      const polyline = L.polyline(latLngs, {
        color: '#FF6B35',
        weight: 5,
        opacity: 0.92,
        lineCap: 'round',
        lineJoin: 'round',
      });
      polyline.addTo(map);
      polylineRef.current = polyline;

      // 起点标记（绿色带脉冲光环）
      const startIcon = L.divIcon({
        className: 'tc-map-start-marker',
        html: `<div style="width:16px;height:16px;background:#10B981;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(16,185,129,0.25),0 2px 8px rgba(0,0,0,0.2);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([start.lat, start.lng], { icon: startIcon, interactive: false }).addTo(map);

      // 终点标记（红色）
      if (leafletPoints.length > 1) {
        const end = leafletPoints[leafletPoints.length - 1];
        const endIcon = L.divIcon({
          className: 'tc-map-end-marker',
          html: `<div style="width:12px;height:12px;background:#EF4444;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.2);"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });
        L.marker([end.lat, end.lng], { icon: endIcon, interactive: false }).addTo(map);
      }

      // 自适应视野
      map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40], maxZoom: 16 });

      mapRef.current = map;
      setMapStatus('ready');
    };

    // 延迟初始化确保容器尺寸已布局
    const timer = setTimeout(initMap, 80);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      resizeObserverRef.current?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [points, crsHint, language, hasPoints, leafletPoints]);

  // ResizeObserver：容器尺寸变化时通知 Leaflet
  useEffect(() => {
    if (!mapRef.current || !containerRef.current) return;
    const observer = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });
    observer.observe(containerRef.current);
    resizeObserverRef.current = observer;
    return () => observer.disconnect();
  }, [mapStatus]);

  // 语言切换时更新瓦片源
  useEffect(() => {
    if (!tileLayerRef.current || mapStatus !== 'ready') return;
    const [newUrl] = getTileUrls(language);
    tileLayerRef.current.setUrl(newUrl);
    setTileError(false);
  }, [language, mapStatus]);

  // 适应路线按钮
  const handleFitRoute = () => {
    const map = mapRef.current;
    const polyline = polylineRef.current;
    if (!map || !polyline) return;
    map.fitBounds(polyline.getBounds(), { padding: [40, 40], maxZoom: 16 });
  };

  // 缩放按钮
  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  const isReady = mapStatus === 'ready';
  const isLoading = mapStatus === 'loading';
  const isError = mapStatus === 'error';

  return (
    <div className="relative h-full w-full group">
      {/* 地图容器 */}
      <div
        ref={containerRef}
        className="h-full w-full bg-[#e8edf2]"
        aria-label={t('preview.map.loading')}
      />

      {/* ── 加载骨架屏 ── */}
      {isLoading && (
        <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-[#eaf3fa]/90 backdrop-blur-xs">
          {/* 脉冲地图模拟 */}
          <div className="w-48 h-32 rounded-xl bg-white/60 animate-pulse mb-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:16px_16px] opacity-60" />
          </div>
          {/* 加载指示 */}
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full border-2 border-[#4FACFE] border-t-transparent animate-spin" />
            <span className="text-[12px] font-bold text-slate-500">{t('preview.map.loading')}</span>
          </div>
        </div>
      )}

      {/* ── 错误状态 ── */}
      {isError && (
        <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-[#eaf3fa]/95 backdrop-blur-xs gap-3">
          <AlertTriangle size={28} className="text-amber-500" />
          <p className="text-[12px] font-bold text-slate-600 px-6 text-center">{t('preview.map.tiles_failed')}</p>
        </div>
      )}

      {/* ── 无数据 ── */}
      {!hasPoints && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-[#eaf3fa]">
          <p className="text-[12px] text-slate-400">{t('preview.map.no_route_data')}</p>
        </div>
      )}

      {/* ── 地图控件覆盖层（就绪后显示） ── */}
      {isReady && (
        <>
          {/* 右上角：缩放按钮组 */}
          <div className="absolute right-2 top-2 z-[1000] flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleZoomIn}
              className="w-8 h-8 rounded-lg bg-white/95 shadow-md flex items-center justify-center text-slate-600 hover:bg-white active:scale-95 transition-all"
              aria-label={t('preview.map.zoom_in')}
            >
              <span className="text-[16px] font-bold leading-none">+</span>
            </button>
            <button
              onClick={handleZoomOut}
              className="w-8 h-8 rounded-lg bg-white/95 shadow-md flex items-center justify-center text-slate-600 hover:bg-white active:scale-95 transition-all"
              aria-label={t('preview.map.zoom_out')}
            >
              <span className="text-[16px] font-bold leading-none">−</span>
            </button>
          </div>

          {/* 右下角：适应路线按钮 */}
          <button
            onClick={handleFitRoute}
            className="absolute right-2 bottom-2 z-[1000] flex items-center gap-1.5 rounded-lg bg-white/95 shadow-md px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-white active:scale-95 transition-all opacity-0 group-hover:opacity-100"
            aria-label={t('preview.map.fit_route')}
          >
            <Maximize2 size={13} />
            {t('preview.map.fit_route')}
          </button>

          {/* 左下角：瓦片错误提示 */}
          {tileError && (
            <div className="absolute left-2 bottom-2 z-[1000] rounded-lg bg-amber-50/95 px-2 py-1 text-[10px] font-semibold text-amber-700 shadow-sm border border-amber-200">
              ⚠ {t('preview.map.tiles_failed')}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const RoutePreviewScreen: React.FC<RoutePreviewScreenProps> = ({
  onNavigate,
  selectedShapeId,
  generatedRoute,
  isRouteGenerating,
  routeGenerationError,
  onGenerateTemplateRoute,
  onStartGeneratedRoute,
}) => {
  const { t, text, language } = useI18n();
  const [riskConfirmed, setRiskConfirmed] = useState(false);
  const route = generatedRoute;
  const riskLevel = route?.riskLevel || 'low';
  const isHighRisk = riskLevel === 'high';
  const needsConfirm = Boolean(route?.confirmRequired);
  const canStart = Boolean(route) && !isHighRisk && (!needsConfirm || riskConfirmed);
  const riskColor = riskLevel === 'high' ? 'text-rose-600 bg-rose-50 border-rose-100' : riskLevel === 'medium' ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-emerald-700 bg-emerald-50 border-emerald-100';

  if (isRouteGenerating) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_55%,#eef7ff_100%)] px-6 text-center">
        <div className="mb-5 h-12 w-12 rounded-full border-4 border-[#4FACFE] border-t-transparent animate-spin" />
        <h2 className="text-[18px] font-black text-slate-900">{text('正在生成路线', 'Generating route')}</h2>
        <p className="mt-2 text-[12px] leading-5 text-slate-500">{text('正在调用后端生成路线点，并使用高德步行规划做风险抽样。', 'Generating route points and checking walkability.')}</p>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white px-6 text-center">
        <AlertTriangle size={36} className="mb-4 text-amber-500" />
        <h2 className="text-[18px] font-black text-slate-900">{text('暂无可预览路线', 'No route to preview')}</h2>
        <p className="mt-2 text-[12px] text-slate-500">{routeGenerationError || text('请先选择模板或上传图片生成路线。', 'Choose a template or upload an image first.')}</p>
        <button onClick={() => onNavigate('home')} className="mt-6 rounded-full bg-[#4FACFE] px-5 py-2.5 text-[13px] font-bold text-white">
          {text('返回首页', 'Back home')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,#f7fbff_0%,#ffffff_42%,#eef7ff_100%)] text-slate-900 select-none">
      <div className="flex items-center justify-between px-4 pt-[calc(var(--tc-safe-top)+12px)] pb-3">
        <button onClick={() => onNavigate('home')} className="rounded-full p-1.5 text-slate-500 active:bg-slate-100">
          <ArrowLeft size={19} />
        </button>
        <h2 className="text-[16px] font-black">{text('路线预览', 'Route Preview')}</h2>
        <button
          onClick={() => { setRiskConfirmed(false); void onGenerateTemplateRoute(selectedShapeId); }}
          className="rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-[#4FACFE] shadow-sm"
        >
          {text('重新生成', 'Regenerate')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="relative h-[300px] overflow-hidden rounded-[20px] border border-white/80 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <RoutePreviewMap
            points={route.points || []}
            crsHint={route.crsHint}
            language={language}
            t={t}
          />
          <div className="absolute left-3 top-3 z-[1000] rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
            {text('高德步行风险抽样', 'AMap walkability check')}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <RouteIcon size={16} className="mx-auto mb-1 text-[#4FACFE]" />
            <p className="text-[10px] font-bold text-slate-400">{text('距离', 'Distance')}</p>
            <p className="text-[14px] font-black text-slate-900">{((route.meta.distanceM || 0) / 1000).toFixed(2)}km</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <ShieldAlert size={16} className="mx-auto mb-1 text-amber-500" />
            <p className="text-[10px] font-bold text-slate-400">{text('可跑分', 'Run score')}</p>
            <p className="text-[14px] font-black text-slate-900">{route.runnableScore ?? 80}</p>
          </div>
          <div className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <MapPin size={16} className="mx-auto mb-1 text-emerald-500" />
            <p className="text-[10px] font-bold text-slate-400">{text('起点', 'Start')}</p>
            <p className="text-[14px] font-black text-slate-900">{route.startPointStatus?.distanceM ?? 0}m</p>
          </div>
        </div>

        <div className={`mt-4 rounded-2xl border p-4 ${riskColor}`}>
          <div className="flex items-start gap-3">
            {riskLevel === 'low' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            <div>
              <h3 className="text-[14px] font-black">{route.riskSummary || text('路线需要预览确认', 'Route needs review')}</h3>
              <p className="mt-1 text-[12px] leading-5 opacity-80">
                {text('开始导航前请确认路线没有穿越封闭道路、水域或机动车专用路。', 'Check the route before starting navigation.')}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {(route.riskSegments || []).length === 0 ? (
            <div className="rounded-2xl bg-white p-3 text-[12px] font-semibold text-slate-500 shadow-sm">
              {text('未发现明显风险，仍建议实际开跑前确认周边路况。', 'No obvious risk found. Check local road conditions before running.')}
            </div>
          ) : (
            route.riskSegments?.map((segment, index) => (
              <div key={`${segment.type}-${index}`} className="rounded-2xl bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-black text-slate-800">{segment.message}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{segment.level}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-t border-white/80 bg-white/90 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-xl">
        {needsConfirm && !isHighRisk && (
          <button
            onClick={() => setRiskConfirmed((value) => !value)}
            className={`mb-2 flex w-full items-center justify-center gap-2 rounded-2xl border py-2.5 text-[13px] font-bold ${riskConfirmed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
          >
            <CheckCircle2 size={16} />
            {riskConfirmed ? text('已确认风险', 'Risk confirmed') : text('我已预览并确认风险', 'I reviewed the risk')}
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onNavigate('param_adjust')} className="rounded-[28px] border border-slate-200 bg-white py-3 text-[14px] font-black text-slate-700">
            {text('调整起点/距离', 'Adjust')}
          </button>
          <button
            disabled={!canStart}
            onClick={() => void onStartGeneratedRoute(riskConfirmed || !needsConfirm)}
            className="rounded-[28px] bg-linear-to-r from-[#4FACFE] to-[#00F2FE] py-3 text-[14px] font-black text-white shadow-md shadow-blue-500/20 disabled:opacity-40"
          >
            {isHighRisk ? text('高风险阻断', 'Blocked') : text('确认并开始', 'Start')}
          </button>
        </div>
      </div>
    </div>
  );
};


/* ==========================================
   Screen 7: Parameter Adjustment Screen (参数调节界面)
   ========================================== */
interface ParamAdjustScreenProps {
  onNavigate: (screen: ScreenId) => void;
  selectedShapeId: string;
  onGenerateTemplateRoute: (shapeId: string, targetKm?: number) => Promise<void>;
}

export const ParamAdjustScreen: React.FC<ParamAdjustScreenProps> = ({ 
  onNavigate,
  selectedShapeId,
  onGenerateTemplateRoute,
}) => {
  const { t, text } = useI18n();
  const [scale, setScale] = useState(1.5);     // 1x - 3x
  const [rotate, setRotate] = useState(45);     // 0 - 360  
  const [stretch, setStretch] = useState(1.0);  // 0.5 - 2.0
  const [goalDistance, setGoalDistance] = useState(5.0); // 目标距离

  // Calculate dynamic approximate length based on scale
  const calculatedLength = (2.1 * scale * stretch).toFixed(1);

  return (
    <div className="flex flex-col h-full bg-white select-none">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-gray-50">
        <button onClick={() => onNavigate('library')} className="p-1 rounded-full text-gray-400 active:bg-gray-100">
          <ArrowLeft size={19} />
        </button>
        <span className="text-base font-bold text-gray-800">{t('adjust.title', '图形参数调节')}</span>
        <button 
          onClick={() => { setScale(1.5); setRotate(45); setStretch(1.0); }}
          className="text-xs font-semibold text-[#4FACFE] active:opacity-75"
        >
          {t('adjust.reset', '重置')}
        </button>
      </div>

      {/* Centered Map preview container */}
      <div className="flex-1 overflow-hidden relative bg-slate-50 flex items-center justify-center p-4">
        {/* Map grid representation */}
        <div className="absolute inset-0 z-0 opacity-40">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#D1D5DB" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Vector street curves */}
        <div className="absolute inset-x-0 top-1/4 h-2 bg-white rounded-full z-0 pointer-events-none rotate-12 opacity-50"></div>
        <div className="absolute inset-y-0 left-1/3 w-2 bg-white rounded-full z-0 pointer-events-none -rotate-45 opacity-50"></div>

        {/* Interactive Shape display within transform boundaries */}
        <div 
          className="relative w-44 h-44 border-2 border-dashed border-[#4FACFE]/60 rounded-lg flex items-center justify-center group z-10 transition-all shadow-[0_4px_16px_rgba(79,172,254,0.1)] bg-white/40 backdrop-blur-xs"
        >
          {/* Active white grip points */}
          <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-[#4FACFE] rounded-full"></div>
          <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-[#4FACFE] rounded-full"></div>
          <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-[#4FACFE] rounded-full"></div>
          <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-[#4FACFE] rounded-full"></div>
          
          {/* Central Rotating Lever */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-0.5 h-10 bg-[#4FACFE]"></div>
          <div className="absolute -top-[48px] left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#4FACFE] flex items-center justify-center shadow-md hover:scale-110 cursor-grab text-white font-bold leading-none active:scale-95 text-xs">
            <RotateCw size={11} />
          </div>

          {/* SVG Shape component responding dynamically to state transformations */}
          <div 
            style={{ 
              transform: `scale(${scale / 1.5}) rotate(${rotate}deg) scaleX(${stretch})`,
              transition: 'transform 0.15s ease-out'
            }}
            className="w-32 h-32 flex items-center justify-center"
          >
            {selectedShapeId === 'heart' ? (
              <svg viewBox="0 0 100 100" className="w-full h-full text-orange-500 fill-orange-500/10 drop-shadow-[0_0_6px_rgba(255,107,53,0.5)]">
                <path d="M50 30 C30 -10 -5 15 50 85 C105 15 70 -10 50 30 Z" stroke="#FF6B35" strokeWidth="4" />
              </svg>
            ) : selectedShapeId === 'circle' ? (
              <svg viewBox="0 0 100 100" className="w-full h-full text-orange-500 fill-orange-500/10 drop-shadow-[0_0_6px_rgba(255,107,53,0.5)]">
                <circle cx="50" cy="50" r="38" stroke="#FF6B35" strokeWidth="4" />
              </svg>
            ) : selectedShapeId === 'triangle' ? (
              <svg viewBox="0 0 100 100" className="w-full h-full text-orange-500 fill-orange-500/10 drop-shadow-[0_0_6px_rgba(255,107,53,0.5)]">
                <polygon points="50,15 88,85 12,85" stroke="#FF6B35" strokeWidth="4" strokeLinejoin="round" />
              </svg>
            ) : selectedShapeId === 'square' ? (
              <svg viewBox="0 0 100 100" className="w-full h-full text-orange-500 fill-orange-500/10 drop-shadow-[0_0_6px_rgba(255,107,53,0.5)]">
                <rect x="15" y="15" width="70" height="70" rx="8" stroke="#FF6B35" strokeWidth="4" />
              </svg>
            ) : (
              // Default FIVE POINTED STAR
              <svg viewBox="0 0 100 100" className="w-full h-full text-[#FF6B35] fill-orange-500/10 drop-shadow-[0_0_6px_rgba(255,107,53,0.5)]">
                <polygon 
                  points="50,12 63,38 92,42 71,62 76,90 50,77 24,90 29,62 8,42 37,38"
                  stroke="#FF6B35" 
                  strokeWidth="4" 
                  strokeLinejoin="round" 
                />
              </svg>
            )}
          </div>
        </div>

        {/* Right floating adjustment slider dashboard panels */}
        <div className="absolute right-3 top-12 bottom-12 w-[64px] bg-white/70 backdrop-blur-md rounded-2xl p-2.5 border border-white/20 shadow-xs flex flex-col justify-around z-20">
          {/* Slider 1: Scale */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-gray-500">{t('adjust.scale_label', '大小')}</span>
            <div className="relative h-18 my-1 cursor-grab flex items-center justify-center">
              <input 
                type="range" 
                min="1" 
                max="3" 
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="accent-[#4FACFE] h-1.5 rounded-lg appearance-none cursor-pointer w-16 -rotate-90 vertical-range"
              />
            </div>
            <span className="text-[10px] font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{scale.toFixed(1)}x</span>
          </div>

          {/* Slider 2: Rotate */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-gray-500">{t('adjust.rotate_label', '旋转')}</span>
            <div className="relative h-18 my-1 flex items-center justify-center">
              <input 
                type="range" 
                min="0" 
                max="360" 
                step="5"
                value={rotate}
                onChange={(e) => setRotate(parseInt(e.target.value))}
                className="accent-[#4FACFE] h-1.5 rounded-lg appearance-none cursor-pointer w-16 -rotate-90 vertical-range"
              />
            </div>
            <span className="text-[9px] font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{rotate}°</span>
          </div>

          {/* Slider 3: Stretch */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-gray-500">{t('adjust.stretch_label', '拉伸')}</span>
            <div className="relative h-18 my-1 flex items-center justify-center">
              <input 
                type="range" 
                min="0.5" 
                max="2" 
                step="0.1"
                value={stretch}
                onChange={(e) => setStretch(parseFloat(e.target.value))}
                className="accent-[#4FACFE] h-1.5 rounded-lg appearance-none cursor-pointer w-16 -rotate-90 vertical-range"
              />
            </div>
            <span className="text-[9px] font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{stretch.toFixed(1)}x</span>
          </div>
        </div>
      </div>

      {/* Lower length hud and confirm actions */}
      <div className="bg-white px-5 py-4 border-t border-gray-100 flex flex-col space-y-3">
        {/* Length markers and goals */}
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-gray-500">
            {text('预计长度', 'Estimated Length')}: <strong className="text-gray-800 font-extrabold">{calculatedLength} km</strong>
          </span>
          <span className="text-[11px] text-teal-600 font-semibold bg-teal-50 px-2 py-0.5 rounded-full">
            {text('1:1 等比匹配', '1:1 proportional match')}
          </span>
        </div>

        {/* Draggable Target Distance Slider */}
        <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
            <span>{t('adjust.goal_label', '目标距离')}</span>
            <span className="text-[#4FACFE] font-bold">{goalDistance.toFixed(1)} km</span>
          </div>
          <input 
            type="range" 
            min="2.0" 
            max="15.0" 
            step="0.5"
            value={goalDistance}
            onChange={(e) => setGoalDistance(parseFloat(e.target.value))}
            className="w-full accent-[#4FACFE] h-1.5 rounded-lg appearance-none cursor-pointer bg-gray-200"
          />
        </div>

        {/* Apply & Navigate */}
        <button
          onClick={() => void onGenerateTemplateRoute(selectedShapeId, goalDistance)}
          className="w-full py-3.5 rounded-[32px] bg-linear-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-98 transition-all text-white font-extrabold text-[15px] shadow-md shadow-blue-500/20 text-center"
        >
          {text('应用并开始导航', 'Apply and Start Navigation')}
        </button>
      </div>

    </div>
  );
};


/* ==========================================
   Screen 4: Manual Tracing Editor (描边编辑界面)
   ========================================== */
interface TraceEditorScreenProps {
  onNavigate: (screen: ScreenId) => void;
  onGenerateTemplateRoute: (shapeId: string, targetKm?: number) => Promise<void>;
  selectedShapeId: string;
}

type Point = { x: number; y: number };
type Stroke = Point[];

const INITIAL_STROKES: Stroke[] = [
  // Starter pre-guided panda layout lines
  [
    { x: 50, y: 70 }, { x: 55, y: 55 }, { x: 74, y: 48 }, { x: 90, y: 56 },
    { x: 104, y: 72 }, { x: 106, y: 92 }, { x: 92, y: 110 }
  ],
  [
    { x: 154, y: 70 }, { x: 149, y: 55 }, { x: 130, y: 48 }, { x: 114, y: 56 },
    { x: 100, y: 72 }, { x: 98, y: 92 }, { x: 112, y: 110 }
  ]
];

export const TraceEditorScreen: React.FC<TraceEditorScreenProps> = ({ 
  onNavigate,
  onGenerateTemplateRoute,
  selectedShapeId,
}) => {
  const { text } = useI18n();
  const [brushSize, setBrushSize] = useState(6); // width tracker
  const [activeTool, setActiveTool] = useState<'draw' | 'erase' | 'smooth'>('draw');
  // 使用 ref 作为单一数据源，避免 useState + useRef 双重状态管理
  const canvasRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<Stroke[]>(INITIAL_STROKES);
  const historyRef = useRef<Stroke[][]>([]);
  const currentLineRef = useRef<Stroke>([]);
  // 渲染触发器：ref 变化后需要强制重渲染
  const [, setRenderTick] = useState(0);
  const rerender = () => setRenderTick(t => t + 1);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Save current backup to history first.
    const nextHistory = [...historyRef.current, linesRef.current];
    historyRef.current = nextHistory;

    currentLineRef.current = [{ x, y }];
    rerender();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (currentLineRef.current.length === 0 || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'erase') {
      // Find and remove points close to cursor
      linesRef.current = linesRef.current
        .map((line) => line.filter((p) => Math.hypot(p.x - x, p.y - y) > brushSize * 2))
        .filter((line) => line.length > 0);
    } else {
      currentLineRef.current = [...currentLineRef.current, { x, y }];
    }
    rerender();
  };

  const handlePointerUp = () => {
    if (activeTool === 'draw' && currentLineRef.current.length > 0) {
      linesRef.current = [...linesRef.current, currentLineRef.current];
    }
    currentLineRef.current = [];
    rerender();
  };

  const handleUndo = () => {
    if (historyRef.current.length === 0) return;
    const last = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    linesRef.current = last;
    rerender();
  };

  const handleAutoOptimize = () => {
    // Smooth points by averaging neighbors
    linesRef.current = linesRef.current.map((line) => {
      if (line.length < 3) return line;
      return line.map((p, idx) => {
        if (idx === 0 || idx === line.length - 1) return p;
        const prev = line[idx - 1];
        const next = line[idx + 1];
        return {
          x: (prev.x + p.x + next.x) / 3,
          y: (prev.y + p.y + next.y) / 3,
        };
      });
    });
    historyRef.current = [...historyRef.current, linesRef.current];
    rerender();
  };

  return (
    <div className="flex flex-col h-full bg-[#1E1E1E] text-white select-none relative">
      
      {/* 4.1 TOP ACTION BAR */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 bg-[#1A1A1A] border-b border-gray-800">
        <button onClick={() => onNavigate('home')} className="p-1.5 rounded-full text-gray-400 active:text-white transition-colors">
          <ArrowLeft size={19} />
        </button>
        <span className="text-base font-bold text-white tracking-wide">{text('编辑轨迹', 'Edit Route')}</span>
        <button 
          onClick={() => void onGenerateTemplateRoute(selectedShapeId)} 
          className="text-xs font-bold text-[#4FACFE] bg-[#4FACFE]/10 px-3 py-1.5 rounded-full hover:bg-[#4FACFE]/20 active:opacity-75 transition-colors"
        >
          {text('保存', 'Save')}
        </button>
      </div>

      {/* 4.2 INTERACTIVE CANVAS WORKSPACE */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 bg-[#121212]">
        
        {/* Draw Area Box */}
        <div 
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative w-full h-[330px] bg-[#1a1a1a]/80 rounded-[20px] shadow-inner overflow-hidden cursor-crosshair border border-gray-800/60"
        >
          {/* Half transparent Panda outline background image (represented via vector SVG) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-25 pointer-events-none p-6">
            <svg viewBox="0 0 100 100" className="w-full h-full text-white overflow-visible">
              {/* Outer Head circle outline */}
              <circle cx="50" cy="55" r="34" stroke="currentColor" strokeWidth="2" fill="none" />
              {/* Ears */}
              <circle cx="21" cy="27" r="13" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="79" cy="27" r="13" stroke="currentColor" strokeWidth="2" fill="none" />
              {/* Eye patches */}
              <ellipse cx="38" cy="51" rx="8" ry="11" transform="rotate(-15, 38, 51)" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <ellipse cx="62" cy="51" rx="8" ry="11" transform="rotate(15, 62, 51)" stroke="currentColor" strokeWidth="1.5" fill="none" />
              {/* Nose and mouth base */}
              <ellipse cx="50" cy="67" rx="6" ry="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M 50,71 Q 50,74 46,75 M 50,71 Q 50,74 54,75" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>

          {/* SVG Line Tracks Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Draw permanent paths */}
            {linesRef.current.map((line, idx) => (
              <polyline
                key={idx}
                points={line.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#FF6B35"
                strokeWidth={brushSize}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-[0_0_4px_rgba(255,107,53,0.5)]"
                strokeDasharray="4 3"
              />
            ))}

            {/* Current Active drawing trail */}
            {currentLineRef.current.length > 0 && (
              <polyline
                points={currentLineRef.current.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#FF6B35"
                strokeWidth={brushSize}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4 3"
              />
            )}
          </svg>

          {/* Small Simulated Finger indicator helping touch cues */}
          <div className="absolute top-[82px] left-[78px] text-[15px] pointer-events-none animate-pulse">
            👆 <span className="bg-orange-500 text-white text-[8px] px-1 py-0.5 rounded ml-1 font-bold">{text('手势微调中', 'Fine-tuning')}</span>
          </div>
        </div>

        {/* 4.3 FLOATING BRUSH RANGE SLIDER (RIGHT) */}
        <div className="absolute right-3.5 top-8 bottom-8 w-11 bg-[#1F1F1F]/90 backdrop-blur-md rounded-2xl border border-gray-800 flex flex-col justify-around items-center p-2 z-10">
          <span className="text-[9px] font-bold text-gray-400">{text('笔刷', 'Brush')}</span>
          <div className="relative h-20 flex items-center justify-center">
            <input 
              type="range" 
              min="2" 
              max="20"
              value={brushSize} 
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="accent-[#4FACFE] cursor-pointer h-1.5 w-16 -rotate-90 appearance-none bg-gray-700 rounded-full"
            />
          </div>
          <span className="text-[10px] text-gray-300 font-mono font-bold">{brushSize}px</span>
        </div>

        {/* 4.4 FLOATING CHIP OPTIMIZER (TOP RIGHT) */}
        <button
          onClick={handleAutoOptimize}
          className="absolute top-4 left-4 text-xs font-bold bg-[#3B82F6] hover:bg-blue-600 active:scale-95 transition-all text-white px-3 py-1.5 rounded-full flex items-center space-x-1 shadow-md shadow-blue-900/30"
        >
          <Sparkles size={11} />
          <span>{text('自动优化', 'Auto Optimize')}</span>
        </button>
      </div>

      {/* 4.5 GLASSY TOOLS TOOLBAR (BOTTOM BAR) */}
      <div className="bg-[#1A1A1A] border-t border-gray-800/80 px-4 py-4 flex flex-col space-y-4">
        {/* Five sub-tools row */}
        <div className="grid grid-cols-5 gap-1.5 bg-[#252525]/80 p-1.5 rounded-2xl border border-gray-800">
          <button
            onClick={() => setActiveTool('draw')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
              activeTool === 'draw' ? 'bg-[#4FACFE] text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <PenTool size={16} />
            <span className="text-[9px] mt-1 font-medium">{text('绘制', 'Draw')}</span>
          </button>

          <button
            onClick={() => setActiveTool('erase')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
              activeTool === 'erase' ? 'bg-[#E11D48] text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Eraser size={16} />
            <span className="text-[9px] mt-1 font-medium">{text('擦除', 'Erase')}</span>
          </button>

          <button
            onClick={() => setActiveTool('smooth')}
            className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
              activeTool === 'smooth' ? 'bg-[#3BAC6A] text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Maximize2 size={16} />
            <span className="text-[9px] mt-1 font-medium">{text('平滑', 'Smooth')}</span>
          </button>

          <button
            onClick={handleUndo}
            disabled={historyRef.current.length === 0}
            className="flex flex-col items-center justify-center py-2.5 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/5 active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-transform"
          >
            <Undo size={16} />
            <span className="text-[9px] mt-1 font-medium">{text('撤销', 'Undo')}</span>
          </button>

          <button
            onClick={() => {
              // Clear canvas but keep a recoverable snapshot in history.
              historyRef.current = [...historyRef.current, linesRef.current];
              linesRef.current = [];
              currentLineRef.current = [];
              rerender();
            }}
            className="flex flex-col items-center justify-center py-2.5 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-white/5 active:scale-95 transition-transform"
          >
            <RotateCcw size={16} />
            <span className="text-[9px] mt-1 font-medium">{text('重置', 'Reset')}</span>
          </button>
        </div>

        {/* Big submit green button */}
        <button
          onClick={() => void onGenerateTemplateRoute(selectedShapeId)}
          className="w-full py-3.5 rounded-[32px] bg-emerald-500 hover:bg-emerald-600 active:scale-98 transition-all text-white font-extrabold text-[15px] shadow-lg shadow-emerald-950/20 text-center"
        >
          {text('确认路线', 'Confirm Route')}
        </button>
      </div>

    </div>
  );
};

