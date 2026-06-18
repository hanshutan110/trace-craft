import { useState, useEffect } from 'react';
import { miniToast } from '../utils';
import { 
  ArrowLeft, 
  Heart, 
  Search, 
  Trash2, 
  User,
  Star,
  ExternalLink
} from 'lucide-react';
import { ScreenId } from '../types';
import { useI18n } from '../i18n';
import { BottomNavBar } from './common/BottomNavBar';
import {
  addFavorite,
  getSearchHints,
  getSelectedTemplateId,
  getTemplate,
  listFavorites,
  removeFavorite,
  searchTraceCraft,
  selectTemplate,
  type RouteTemplateItem,
  type SearchResultItem,
} from '../api/discovery';

function shapeColor(shapeType: string): string {
  const colors: Record<string, string> = {
    heart: 'text-rose-500',
    star: 'text-yellow-500',
    circle: 'text-blue-500',
    triangle: 'text-emerald-500',
    square: 'text-cyan-500',
    hexagon: 'text-violet-500',
  };
  return colors[shapeType] || 'text-slate-500';
}

function shapeIcon(shapeType: string, className: string = 'w-14 h-14') {
  const colorClass = `${className} ${shapeColor(shapeType)}`;
  if (shapeType === 'star') {
    return <svg className={colorClass} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><path d="M 50,15 L 61,38 L 86,41 L 67,58 L 72,83 L 50,70 L 28,83 L 33,58 L 14,41 L 39,38 Z" /></svg>;
  }
  if (shapeType === 'circle') {
    return <svg className={colorClass} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><circle cx="50" cy="50" r="30" /></svg>;
  }
  if (shapeType === 'triangle') {
    return <svg className={colorClass} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><path d="M 50,15 L 85,80 L 15,80 Z" /></svg>;
  }
  if (shapeType === 'square') {
    return <svg className={colorClass} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><rect x="22" y="22" width="56" height="56" /></svg>;
  }
  if (shapeType === 'hexagon') {
    return <svg className={colorClass} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><path d="M 50,15 L 80,32 L 80,68 L 50,85 L 20,68 L 20,32 Z" /></svg>;
  }
  return <svg className={colorClass} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4"><path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" /></svg>;
}

const SEARCH_QUERY_KEY = 'tracecraft_search_query';

// ----------------------------------------------------------------------
// SCREEN 19: Favorites (收藏模板)
// ----------------------------------------------------------------------
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

// ----------------------------------------------------------------------
// SCREEN 20: Template Detail (模板详情)
// ----------------------------------------------------------------------
export function TemplateDetailScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { text } = useI18n();
  const [favorite, setFavorite] = useState(true);
  const [template, setTemplate] = useState<RouteTemplateItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    const templateId = getSelectedTemplateId() || 'tpl-heart';
    getTemplate(templateId)
      .then((item) => {
        if (!cancelled) setTemplate(item);
      })
      .catch(() => {
        if (!cancelled) setTemplate(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shapeType = template?.shapeType || 'heart';
  const title = template ? text(template.title, template.titleEn) : text('爱心挑战', 'Heart Challenge');
  const distanceKm = template?.distanceKm ?? 4.2;
  const usageCount = template?.usageCount ?? 128;
  const toggleFavorite = async () => {
    if (!template) return;
    if (favorite) {
      await removeFavorite('template', template.id);
    } else {
      await addFavorite('template', template.id);
    }
    setFavorite(!favorite);
    miniToast(text(favorite ? '取消收藏' : '已添加收藏', favorite ? 'Removed from favorites' : 'Added to favorites'));
  };

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between overflow-y-auto text-slate-800 animate-fadeIn">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('favorites')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">{text('模板详情', 'Template Detail')}</span>
        <div className="flex space-x-1.5">
          <button onClick={() => miniToast(text('分享模板数据', 'Share template data'))} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <ExternalLink size={16} className="text-slate-600" />
          </button>
          <button onClick={() => { void toggleFavorite(); }} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <Heart size={16} fill={favorite ? 'red' : 'none'} className={favorite ? 'text-red-500' : 'text-slate-600'} />
          </button>
        </div>
      </div>

      {/* Main stats visual template body */}
      <div className="flex-1 overflow-y-auto pb-4 select-none">
        
        {/* Template graphic preview area */}
        <div className="py-6 px-4 flex flex-col items-center justify-center bg-slate-50/50 border-b border-slate-100 relative">
          <div className="w-48 h-48 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center p-3">
            {shapeIcon(shapeType, 'w-36 h-36 drop-shadow-sm animate-pulse')}
          </div>

          <h3 className="text-[20px] font-black text-slate-900 mt-4">{title}</h3>
          <p className="text-[11px] text-[#4FACFE] font-bold mt-1">{text('❤️ 官方推荐跑步打卡艺术经典路线', 'Officially recommended art route for running check-ins')}</p>
        </div>

        {/* Info detail block list */}
        <div className="px-4 mt-4">
          <div className="bg-white p-4 rounded-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-slate-100 space-y-4">
            
            <div className="flex items-center justify-between text-[13px] border-b border-slate-50 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-slate-500">{text('预计跑距', 'Estimated distance')}</span>
              </div>
                <strong className="text-slate-900 font-bold">{distanceKm.toFixed(1)} km</strong>
            </div>

            <div className="flex items-center justify-between text-[13px] border-b border-slate-50 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-slate-500">{text('预计时长', 'Estimated time')}</span>
              </div>
                <strong className="text-slate-900 font-bold">{text('25 分钟', '25 min')}</strong>
            </div>

            <div className="flex items-center justify-between text-[13px] border-b border-slate-50 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-slate-500">{text('已完成', 'Completed')}</span>
              </div>
              <strong className="text-slate-930 text-rose-500 font-extrabold">{text(`${usageCount} 次`, `${usageCount} runs`)}</strong>
            </div>

            <div className="flex items-center justify-between text-[13px]">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-slate-500">{text('创建者', 'Creator')}</span>
              </div>
              <span className="font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">{text('官方认证模板', 'Verified template')}</span>
            </div>

          </div>
        </div>

        {/* Filter tags bubble pills info banner */}
        <div className="px-4 mt-3 flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-500 border border-red-100">{text('🔥 热门推荐', '🔥 Hot pick')}</span>
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-500 border border-rose-100">{text('🍬 甜度饱满', '🍬 Sweet spot')}</span>
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">{text('🌟 新手友好', '🌟 Beginner friendly')}</span>
        </div>

        {/* User outcomes dynamic horizontal list */}
        <div className="px-4 mt-4 text-left">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] font-black text-slate-800">{text('大家跑出来的真实效果', 'Real results from runners')}</span>
            <button onClick={() => { onNavigate('square'); }} className="text-[10px] text-cyan-600 font-semibold hover:underline">{text('查看全广场评价', 'View all community reviews')}</button>
          </div>

          <div className="flex space-x-3 overflow-x-auto pb-1 scrollbar-none">
            {[1, 2, 3].map((val) => (
              <div 
                key={val}
                className="w-[110px] p-2 rounded-xl bg-slate-50 border border-slate-100 text-center flex flex-col items-center space-y-1.5 cursor-pointer shrink-0"
                onClick={() => { miniToast(text(`查看第 ${val} 种使用场景`, `View use case ${val}`)); }}
              >
                <div className="w-12 h-12 bg-white rounded-full border border-slate-100 flex items-center justify-center">
                  {shapeIcon(shapeType, 'w-8 h-8')}
                </div>
                <span className="text-[9px] text-slate-400 font-semibold truncate max-w-full">
                  {text(val === 1 ? '舒适' : val === 2 ? '节奏' : '竞技', val === 1 ? 'Comfort' : val === 2 ? 'Rhythm' : 'Competition')}
                </span>
                <span className="text-[8px] bg-emerald-100/60 text-emerald-600 rounded px-1 scale-95 leading-none">
                  {text(`9${val === 1 ? '7' : val === 2 ? '5' : '4'}% 吻合`, `9${val === 1 ? '7' : val === 2 ? '5' : '4'}% match`)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Bottom Buttons */}
        <div className="px-4 mt-5 grid grid-cols-2 gap-3">
          <button 
            onClick={() => {
              miniToast(text('正在生成大地图实景预览..', 'Generating large map preview...'));
              onNavigate('trace_detail');
            }}
            className="py-3 px-4 border border-slate-200 text-slate-700 bg-white hover:bg-neutral-50 active:scale-98 text-xs font-black rounded-full transition-all text-center uppercase tracking-wider"
          >
            {text('预览完整路线', 'Preview full route')}
          </button>
          <button 
            onClick={() => {
              miniToast(text('已导入该模板，请配置调节变换', 'Template imported. Adjust settings next.'));
              onNavigate('param_adjust');
            }}
            className="py-3 px-4 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-98 text-white text-xs font-black rounded-full shadow-md shadow-cyan-400/20 transition-all text-center uppercase tracking-wider"
          >
            {text('直接使用此模板', 'Use this template')}
          </button>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SCREEN 21: Search (搜索)
// ----------------------------------------------------------------------
export function SearchScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { text } = useI18n();
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [hot, setHot] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    getSearchHints()
      .then((hints) => {
        if (cancelled) return;
        setHistory(hints.history);
        setHot(hints.hot);
        setCategories(hints.categories);
      })
      .catch(() => {
        if (cancelled) return;
        setHistory([]);
        setHot([]);
        setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  const handleSearchTrigger = (val: string) => {
    setQuery(val);
    try {
      localStorage.setItem(SEARCH_QUERY_KEY, val);
    } catch {
      // Result page falls back to default keyword.
    }
    miniToast(text(`正在搜索: ${val}`, `Searching: ${val}`));
    setTimeout(() => {
      onNavigate('search_result');
    }, 450);
  };

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between text-slate-800 animate-fadeIn">
      {/* Top Header Search Input */}
      <div className="px-4 pt-3 pb-2 flex items-center space-x-2 border-b border-gray-50 shrink-0">
        <button onClick={() => onNavigate('home')} className="p-1.5 hover:bg-neutral-100 rounded-full shrink-0">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        
        {/* Input box */}
        <div className="flex-1 bg-slate-50 px-3 py-1.5 rounded-full flex items-center space-x-1 border border-slate-100/80">
          <Search size={14} className="text-slate-400" />
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                handleSearchTrigger(query);
              }
            }}
            placeholder={text('搜索轨迹、模板或用户', 'Search routes, templates, or users')}
            className="bg-transparent border-none text-[12px] placeholder:text-slate-450 focus:outline-none w-full font-medium"
          />
        </div>

        <button 
          onClick={() => {
            if (query.trim()) {
              handleSearchTrigger(query);
            } else {
              onNavigate('home');
            }
          }}
          className="text-[13px] text-cyan-600 font-extrabold px-1"
        >
          {query.trim() ? text('搜索', 'Search') : text('取消', 'Cancel')}
        </button>
      </div>

      {/* Primary search segments scroll context */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-left select-none">
        
        {/* Recent Search history */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] font-black text-slate-900">{text('最近搜索', 'Recent searches')}</span>
            <button 
              onClick={() => { miniToast(text('最近历史搜索记录已清空', 'Recent search history cleared')); }}
              className="text-[11px] text-cyan-600 font-bold hover:underline"
            >
              {text('清空', 'Clear')}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((tag) => (
              <span 
                key={tag}
                onClick={() => handleSearchTrigger(tag)}
                className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-100 text-[11px] text-slate-600 font-medium rounded-full cursor-pointer transition-colors"
              >
                {tag} <span className="text-[9px] text-slate-400 ml-1">×</span>
              </span>
            ))}
          </div>
        </div>

        {/* Hot searches */}
        <div>
          <span className="text-[13px] font-black text-slate-900 block mb-2.5">{text('热门搜索', 'Hot searches')}</span>
          <div className="flex flex-wrap gap-2">
            {hot.map((tag) => (
              <span 
                key={tag}
                onClick={() => handleSearchTrigger(tag)}
                className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-100 text-[11px] text-slate-600 font-bold rounded-full cursor-pointer transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Categories grid */}
        <div>
          <span className="text-[13px] font-black text-slate-900 block mb-2.5">{text('按分类浏览', 'Browse by category')}</span>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat, idx) => {
              const bgGrads = [
                'from-teal-400 to-cyan-500',
                'from-orange-400 to-[#FF8038]',
                'from-rose-400 to-pink-500',
                'from-violet-400 to-purple-500',
                'from-blue-400 to-indigo-500'
              ];
              const useGrad = bgGrads[idx % bgGrads.length];

              return (
                <div 
                  key={cat}
                  onClick={() => handleSearchTrigger(cat)}
                  className={`h-14 rounded-2xl bg-gradient-to-br ${useGrad} p-2 flex items-end justify-start font-black text-white hover:brightness-105 active:scale-95 transition-all text-left truncate cursor-pointer shadow-sm`}
                >
                  <span className="text-[11px] drop-shadow-md tracking-wider">{cat}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SCREEN 22: Search Result (搜索结果)
// ----------------------------------------------------------------------
export function SearchResultScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const { text } = useI18n();
  const [searchTab, setSearchTab] = useState<'all' | 'trace' | 'template' | 'user'>('all');
  const [favoriteStates, setFavoriteStates] = useState<Record<string, boolean>>({
    'cat_result': true,
    'hex_result': false
  });
  const [query, setQuery] = useState(text('五角星', 'Pentagram'));
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let q = text('五角星', 'Pentagram');
    try {
      q = localStorage.getItem(SEARCH_QUERY_KEY) || q;
    } catch {
      // Keep default keyword.
    }
    setQuery(q);
    setLoading(true);
    searchTraceCraft(q, searchTab, 30)
      .then((items) => {
        if (!cancelled) {
          setResults(items);
          const nextFavorites: Record<string, boolean> = {};
          items.forEach((item) => {
            nextFavorites[item.id] = Boolean(item.isFavorited);
          });
          setFavoriteStates(nextFavorites);
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchTab, text]);

  const toggleFavorite = (id: string) => {
    setFavoriteStates(prev => {
      const next = !prev[id];
      const item = results.find((r) => r.id === id);
      if (item?.type === 'template') {
        void (next ? addFavorite('template', id) : removeFavorite('template', id));
      }
      miniToast(next ? text('已收藏', 'Saved') : text('取消收藏', 'Removed from saved'));
      return { ...prev, [id]: next };
    });
  };

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between text-slate-800 animate-fadeIn">
      {/* Search Result Bar */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('search')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        
        {/* Simulated input representing '五角星' */}
        <div 
          onClick={() => onNavigate('search')}
          className="flex-1 mx-3 bg-slate-50 px-3 py-1.5 rounded-full flex items-center space-x-1 border border-slate-100/80 cursor-pointer"
        >
          <Search size={13} className="text-slate-400" />
          <span className="text-[12px] font-bold text-slate-900">{query}</span>
        </div>

        <button onClick={() => onNavigate('home')} className="text-[12px] text-slate-500 hover:text-slate-700 font-semibold">
          {text('取消', 'Cancel')}
        </button>
      </div>

      {/* Filter panel info */}
      <div className="px-4 py-1.5 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 shrink-0 font-semibold border-b border-slate-100/50">
        <span>{text(`找到 ${results.length} 个含有'${query}'的结果`, `Found ${results.length} results containing '${query}'`)}</span>
        <div className="flex space-x-2">
          <button onClick={() => miniToast(text('查看收藏夹', 'Open favorites'))} className="hover:text-cyan-600">{text('打开收藏夹', 'Open favorites')}</button>
          <button onClick={() => { miniToast(text('关闭', 'Close')); }} className="hover:text-cyan-600">{text('关闭', 'Close')}</button>
        </div>
      </div>

      {/* horizontal select tabs */}
      <div className="px-4 py-2.5 flex space-x-2 overflow-x-auto scrollbar-none shrink-0 border-b border-slate-50">
        {(['all', 'trace', 'template', 'user'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSearchTab(tab)}
            className={`px-3.5 py-1 rounded-full text-xs shrink-0 font-bold transition-all ${
              searchTab === tab
                ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white'
                : 'bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100'
            }`}
          >
            {tab === 'all' && text('全部', 'All')}
            {tab === 'trace' && text('轨迹', 'Routes')}
            {tab === 'template' && text('模板', 'Templates')}
            {tab === 'user' && text('用户', 'Users')}
          </button>
        ))}
      </div>

      {/* Search results list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 pb-8 select-none">
        {loading && (
          <div className="py-20 text-center text-[12px] text-slate-400 font-bold">{text('正在搜索...', 'Searching...')}</div>
        )}

        {!loading && results.length === 0 && (
          <div className="py-20 text-center text-[12px] text-slate-400 font-bold">{text('暂无搜索结果', 'No results')}</div>
        )}

        {!loading && results.map((item) => (
          <div
            key={`${item.type}-${item.id}`}
            onClick={() => {
              if (item.type === 'template') {
                selectTemplate(item.id);
                onNavigate('template_detail');
              } else if (item.type === 'route') {
                try {
                  localStorage.setItem('tracecraft_selected_route_id', item.id);
                } catch {
                  // Detail page can still show fallback.
                }
                onNavigate('trace_detail');
              } else {
                onNavigate('profile');
              }
            }}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-[54px] h-[54px] rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                {item.type === 'user' ? <User size={24} className="text-slate-400" /> : shapeIcon(item.shapeType || 'heart', 'w-10 h-10')}
              </div>
              <div className="text-left overflow-hidden">
                <h4 className="text-[14px] font-black text-slate-900 truncate">{item.title}</h4>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="px-1 py-0.2 bg-cyan-50 border border-cyan-200 text-cyan-600 rounded text-[8px] font-bold">
                    {item.type === 'route' && text('轨迹', 'Route')}
                    {item.type === 'template' && text('模板', 'Template')}
                    {item.type === 'user' && text('用户', 'User')}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium font-mono truncate">{item.subtitle}</span>
                </div>
              </div>
            </div>

            {item.type === 'template' ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(item.id);
                }}
                className="p-1.5 hover:bg-slate-100 rounded-full text-rose-500"
              >
                <Heart size={15} fill={favoriteStates[item.id] ? 'red' : 'none'} stroke="currentColor" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  miniToast(item.type === 'user' ? text('查看用户主页', 'Open user profile') : text('打开轨迹详情', 'Open route detail'));
                }}
                className="px-2.5 py-1 border border-cyan-500 text-cyan-600 hover:bg-cyan-50 active:scale-95 text-[10px] font-black rounded-full transition-all"
              >
                {item.type === 'user' ? text('查看', 'View') : text('打开', 'Open')}
              </button>
            )}
          </div>
        ))}

        {/* loader */}
        <p className="text-[11px] text-slate-400 py-4 text-center">
          {text('—— 到底啦！上拉加载更多结果 ——', 'No more results. Pull up to load more.')}
        </p>

      </div>
    </div>
  );
}

