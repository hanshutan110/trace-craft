/**
 * RoutePreviewScreen - 路线预览与风险确认界面
 *
 * 从原 NavigationAndEditor.tsx 拆分而来。
 * 功能：基于 Leaflet 的真实地图路线预览
 * - GCJ-02 / BD-09 → WGS-84 坐标转换工具函数
 * - RoutePreviewMap 子组件：Leaflet 瓦片地图渲染
 * - 路线距离/可跑分/起点距离信息卡片
 * - 风险等级标识与确认面板
 * - 重新生成 / 调整参数 / 确认开始导航
 *
 * @source 拆分自 components/NavigationAndEditor.tsx
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { 
  ArrowLeft, 
  Maximize2, 
  ShieldAlert,
  MapPin,
  Route as RouteIcon,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { CrsType, GeneratedRoute, GeoPoint, ScreenId } from '../../types';
import { useI18n } from '../../i18n';

/* ── 坐标转换常量与工具函数 ── */
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

/* ── RoutePreviewMap 子组件：Leaflet 地图预览 ── */

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
          {/* 脉冲地图状态 */}
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

/* ── RoutePreviewScreen 主组件 ── */

interface RoutePreviewScreenProps {
  onNavigate: (screen: ScreenId) => void;
  selectedShapeId: string;
  generatedRoute: GeneratedRoute | null;
  isRouteGenerating: boolean;
  routeGenerationError: string | null;
  onGenerateTemplateRoute: (shapeId: string, targetKm?: number) => Promise<void>;
  onStartGeneratedRoute: (riskConfirmed: boolean) => Promise<void>;
}

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
