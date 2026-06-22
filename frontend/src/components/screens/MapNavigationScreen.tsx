/**
 * MapNavigationScreen - 地图导航界面
 *
 * 从原 NavigationAndEditor.tsx 拆分而来。
 * 功能：Leaflet 真实地图 + 实时导航控制面板
 * - Leaflet 地图显示路线轨迹与已完成路径
 * - 顶部毛玻璃信息栏（剩余距离 / 偏差）
 * - 底部控制栏（暂停/停止/语音切换）
 * - 实时位置上报与状态同步
 *
 * @source 拆分自 components/NavigationAndEditor.tsx
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Pause, 
  Play, 
  Square as StopIcon
} from 'lucide-react';
import L from 'leaflet';
import { GeneratedRoute, ScreenId, SessionState } from '../../types';
import { useI18n } from '../../i18n';
import { finishSession, getCurrentPoint, getSessionState, pauseSession, reportLocation, resumeSession } from '../../api/routes';

interface MapNavigationScreenProps {
  onNavigate: (screen: ScreenId) => void;
  selectedShapeId: string;
  generatedRoute?: GeneratedRoute | null;
  activeSessionId?: string | null;
}

export const MapNavigationScreen: React.FC<MapNavigationScreenProps> = ({ 
  onNavigate,
  selectedShapeId: _selectedShapeId,
  generatedRoute,
  activeSessionId,
}) => {
  const { text } = useI18n();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVoiceOn, setIsVoiceOn] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [navError, setNavError] = useState<string | null>(null);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  
  // Leaflet 地图实例和图层引用
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const completedLayerRef = useRef<L.Polyline | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // 初始化 Leaflet 地图
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const locale = typeof navigator !== 'undefined' ? navigator.language : 'zh-CN';
    const tileUrl = locale.startsWith('zh')
      ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

    const map = L.map(containerRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
    }).setView([39.9087, 116.3975], 15);

    L.tileLayer(tileUrl, {
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 更新路线轨迹和当前位置
  const updateMapLayers = useCallback((route: GeneratedRoute | null | undefined, state: SessionState | null) => {
    const map = mapRef.current;
    if (!map || !route?.points?.length) return;

    const latlngs: L.LatLngExpression[] = route.points.map((p) => [p.lat, p.lng]);

    // 路线总轨迹（橙色）
    if (routeLayerRef.current) {
      routeLayerRef.current.setLatLngs(latlngs);
    } else {
      routeLayerRef.current = L.polyline(latlngs, {
        color: '#FF6B35',
        weight: 4,
        opacity: 0.8,
      }).addTo(map);
    }

    // 已完成路径（绿色）
    const progress = state?.progressPct ?? 0;
    const completedCount = Math.max(1, Math.ceil((progress / 100) * latlngs.length));
    const completedLatLngs = latlngs.slice(0, completedCount);
    if (completedLayerRef.current) {
      completedLayerRef.current.setLatLngs(completedLatLngs);
    } else {
      completedLayerRef.current = L.polyline(completedLatLngs, {
        color: '#10B981',
        weight: 4,
        opacity: 0.9,
      }).addTo(map);
    }

    // 当前位置标记
    const lastPos = state?.lastPosition || route.points[0];
    const latlng: L.LatLngExpression = [lastPos.lat, lastPos.lng];
    if (markerRef.current) {
      markerRef.current.setLatLng(latlng);
    } else {
      const icon = L.divIcon({
        className: 'nav-tracker',
        html: '<div style="width:16px;height:16px;background:#1E40AF;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(59,130,246,0.6);"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      markerRef.current = L.marker(latlng, { icon }).addTo(map);
    }

    // 自适应路线范围
    if (route.bounds) {
      const bounds = L.latLngBounds(
        [route.bounds.minLat, route.bounds.minLng],
        [route.bounds.maxLat, route.bounds.maxLng],
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, []);

  useEffect(() => {
    updateMapLayers(generatedRoute, sessionState);
  }, [generatedRoute, sessionState, updateMapLayers]);
  
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (!activeSessionId) return;
    let cancelled = false;
    const syncState = async () => {
      try {
        const state = await getSessionState(activeSessionId);
        if (!cancelled) {
          setSessionState(state);
          setNavError(null);
        }
      } catch {
        if (!cancelled) setNavError(text('导航状态同步失败', 'Navigation sync failed'));
      }
    };
    void syncState();
    const timer = setInterval(syncState, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeSessionId, text]);

  useEffect(() => {
    if (!activeSessionId || !isPlaying) return;
    let cancelled = false;
    const sendLocation = async () => {
      try {
        const current = await getCurrentPoint();
        const state = await reportLocation(activeSessionId, {
          ...current.point,
          accuracy: current.accuracy,
          ts: Date.now(),
        });
        if (!cancelled && state) {
          setSessionState(state);
          setNavError(null);
        }
      } catch {
        if (!cancelled) setNavError(text('位置上报失败', 'Location report failed'));
      }
    };
    void sendLocation();
    const timer = setInterval(sendLocation, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeSessionId, isPlaying, text]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPct = sessionState?.progressPct ?? 0;
  const progress = Math.max(0, Math.min(1, progressPct / 100));
  const deviation = sessionState?.deviationM ?? 0;
  const plannedKm = (generatedRoute?.meta?.distanceM || 0) / 1000;
  const remainingKm = Math.max(0, plannedKm * (1 - progress));

  const handleToggleSession = async () => {
    if (!activeSessionId) {
      setIsPlaying((value) => !value);
      return;
    }
    if (sessionActionLoading) return;
    setSessionActionLoading(true);
    try {
      const state = isPlaying
        ? await pauseSession(activeSessionId)
        : await resumeSession(activeSessionId);
      setSessionState(state);
      setIsPlaying(!isPlaying);
      setNavError(null);
    } catch {
      setNavError(text('暂停/继续失败，请稍后重试', 'Pause/resume failed, try again'));
    } finally {
      setSessionActionLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!activeSessionId) {
      onNavigate('success');
      return;
    }
    try {
      await finishSession(activeSessionId);
      onNavigate('success');
    } catch {
      setNavError(text('结束跑步失败，请稍后重试', 'Finish failed, try again'));
    };
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 relative select-none overflow-hidden">
      
      {/* Leaflet 真实地图 */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* 2.2 TOP FROSTED BLUR BAR */}
      <div className="absolute top-4 left-4 right-4 z-10 bg-white/70 backdrop-blur-md border border-white/20 rounded-2xl py-3 px-4 flex items-center justify-between shadow-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">{text('剩余距离', 'Remaining Distance')}</span>
          <span className="text-[15px] font-extrabold text-gray-800">
            {remainingKm.toFixed(2)}km
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
        <span>{navError || (sessionState?.needRedirect ? text('偏离路线，请回到最近路线点', 'Off route, return to nearest point') : text('沿当前路线继续前进', 'Continue along current route'))}</span>
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
              {(plannedKm * progress).toFixed(2)}
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
            onClick={() => void handleToggleSession()}
            disabled={sessionActionLoading}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              isPlaying 
                ? 'bg-amber-100 text-amber-600 hover:bg-amber-200 active:scale-95' 
                : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 active:scale-95'
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-emerald-600 ml-0.5" />}
          </button>

          {/* Stop / Complete */}
          <button
            onClick={() => void handleFinish()}
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
