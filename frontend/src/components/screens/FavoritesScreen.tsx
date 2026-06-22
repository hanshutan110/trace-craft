/**
 * FavoritesScreen - 收藏模板
 *
 * 从原 DiscoveryScreens.tsx 拆分而来。
 * 功能：展示用户收藏的轨迹模板列表（2列网格），支持删除操作和空态展示。
 * 点击模板跳转到模板详情页。
 *
 * @source 拆分自 components/DiscoveryScreens.tsx (SCREEN 19)
 */
import { useState, useEffect } from 'react';
import { miniToast } from '../../utils';
import { ArrowLeft, Star, Trash2 } from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';
import { BottomNavBar } from '../common/BottomNavBar';
import {
  listFavorites,
  removeFavorite,
  selectTemplate,
  type RouteTemplateItem,
} from '../../api/discovery';
import { shapeIcon } from './discovery-utils';

export function FavoritesScreen({
  onNavigate,
  activeNavbarTab,
  setActiveNavbarTab,
}: {
  onNavigate: (screen: ScreenId) => void;
  activeNavbarTab: 'home' | 'traces' | 'profile';
  setActiveNavbarTab: (tab: 'home' | 'traces' | 'profile') => void;
}) {
  const { text } = useI18n();
  const [showEmpty, setShowEmpty] = useState<boolean>(false);
  const [favoriteList, setFavoriteList] = useState<RouteTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listFavorites()
      .then((items) => {
        if (!cancelled) setFavoriteList(items.map((item) => item.template).filter(Boolean) as RouteTemplateItem[]);
      })
      .catch(() => {
        if (!cancelled) setFavoriteList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRemove = async (id: string, name: string) => {
    await removeFavorite('template', id);
    setFavoriteList(prev => prev.filter(item => item.id !== id));
    miniToast(text(`已删除 ${name}`, `Removed ${name}`));
  };

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between text-slate-800 animate-fadeIn">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('profile')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">{text('我的收藏', 'My Favorites')}</span>
        <button 
          onClick={() => {
            setShowEmpty(!showEmpty);
            miniToast(showEmpty ? text('显示收藏数据', 'Show saved items') : text('临时查看空态', 'Preview empty state'));
          }}
          className="text-xs text-cyan-600 font-extrabold hover:underline"
        >
          {showEmpty ? text('恢复数据', 'Restore data') : text('查看空态', 'Empty state')}
        </button>
      </div>

      <div className="bg-cyan-50/50 py-2 border-b border-cyan-100/40 text-center shrink-0">
        <p className="text-[11px] text-cyan-600 font-bold select-none">
          {text(`已收${showEmpty ? 0 : favoriteList.length} 个轨迹模板 双击移除`, `Saved ${showEmpty ? 0 : favoriteList.length} templates. Double-click to remove.`)}
        </p>
      </div>

      {/* Grid or Empty view */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-[calc(96px+env(safe-area-inset-bottom))]">
        {loading ? (
          <div className="py-24 text-center text-[12px] text-slate-400 font-bold">{text('正在加载收藏...', 'Loading favorites...')}</div>
        ) : showEmpty || favoriteList.length === 0 ? (
          /* EMPTY VIEW */
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 px-6 animate-pulse select-none">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
              <Star size={36} fill="none" className="stroke-[1.5]" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-slate-800">{text('暂无收藏', 'No favorites yet')}</p>
              <p className="text-[12px] text-slate-400 mt-1 max-w-xs">
                {text('去广场或者推荐里找一找美丽的路线灵感吧！', 'Find route ideas in Discover or Recommendations.')}
              </p>
            </div>
            <button 
              onClick={() => onNavigate('square')}
              className="px-5 py-2.5 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-95 transition-all text-white font-extrabold text-xs rounded-full shadow-md shadow-cyan-400/20"
            >
              {text('去广场发现灵感', 'Find inspiration in Discover')}
            </button>
          </div>
        ) : (
          /* 2x2 GRID VIEW */
          <div className="grid grid-cols-2 gap-3.5 select-none">
            {favoriteList.map((item) => (
              <div 
                key={item.id}
                onClick={() => {
                  selectTemplate(item.id);
                  onNavigate('template_detail');
                }}
                className="bg-white p-3 rounded-[16px] border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-2 hover:shadow-md hover:border-slate-200 transition-all cursor-pointer relative group"
              >
                {/* SVG path preview */}
                <div className="h-[90px] rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 overflow-hidden shrink-0">
                  {shapeIcon(item.shapeType)}
                </div>

                <div>
                  <h4 className="text-[13px] font-black text-slate-900 truncate leading-none mt-1">{text(item.title, item.titleEn)}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{item.distanceKm.toFixed(1)}km</p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                    <span className="text-[10px] text-rose-500 font-bold flex items-center gap-0.5">
                    ❤️ {item.usageCount}
                  </span>
                  
                  {/* use button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      selectTemplate(item.id);
                      miniToast(`open detail: ${item.title}`);
                      onNavigate('param_adjust');
                    }}
                    className="px-2.5 py-1 border border-cyan-500 text-cyan-500 hover:bg-cyan-50 active:scale-95 text-[10px] font-black rounded-full transition-all"
                  >
                    {text('开始', 'Start')}
                  </button>
                </div>

                {/* Double click helper label */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(item.id, item.title);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xs"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavBar
        onNavigate={onNavigate}
        activeNavbarTab={activeNavbarTab}
        setActiveNavbarTab={setActiveNavbarTab}
        iconSize={20}
        labelClassName="text-[10px] font-medium mt-1"
      />

    </div>
  );
}
