/**
 * SearchResultScreen - 搜索结果页
 *
 * 从原 DiscoveryScreens.tsx 拆分而来。
 * 功能：展示搜索结果列表，支持按全部/轨迹/模板/用户分类筛选。
 * 结果项支持收藏、查看详情等操作。
 *
 * @source 拆分自 components/DiscoveryScreens.tsx (SCREEN 22)
 */
import { useState, useEffect } from 'react';
import { miniToast } from '../../utils';
import { ArrowLeft, Heart, Search, User } from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';
import {
  addFavorite,
  removeFavorite,
  searchTraceCraft,
  selectTemplate,
  type SearchResultItem,
} from '../../api/discovery';
import { shapeIcon, SEARCH_QUERY_KEY } from './discovery-utils';

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
        
        {/* Simulated input representing search query */}
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
        
        {/* RESULT 1: TRACK */}
        {false && (searchTab === 'all' || searchTab === 'trace') && (
          <div 
            onClick={() => onNavigate('trace_detail')}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center space-x-3">
              <div className="w-[54px] h-[54px] rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                <svg className="w-10 h-10 text-yellow-500 animate-pulse" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
                  <path d="M 50,15 L 61,38 L 86,41 L 67,58 L 72,83 L 50,70 L 28,83 L 33,58 L 14,41 L 39,38 Z" />
                </svg>
              </div>
              <div className="text-left">
                <h4 className="text-[14px] font-black text-slate-900">{text('五角星挑战', 'Pentagram Challenge')}</h4>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="px-1 py-0.2 bg-cyan-50 border border-cyan-200 text-cyan-600 rounded text-[8px] font-bold">{text('轨迹', 'Route')}</span>
                  <span className="text-[11px] text-slate-500 font-medium font-mono">{text('5.0 公里 路 128 次使用', '5.0 km route, used 128 times')}</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite('cat_result');
              }}
              className="p-1.5 hover:bg-slate-100 rounded-full text-rose-500"
            >
              <Heart size={15} fill={favoriteStates['cat_result'] ? 'red' : 'none'} stroke="currentColor" />
            </button>
          </div>
        )}

        {/* RESULT 2: TEMPLATE */}
        {false && (searchTab === 'all' || searchTab === 'template') && (
          <div 
            onClick={() => onNavigate('template_detail')}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center space-x-3">
              <div className="w-[54px] h-[54px] rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                <svg className="w-10 h-10 text-cyan-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
                  <path d="M 50,15 L 61,38 L 86,41 L 67,58 L 72,83 L 50,70 L 28,83 L 33,58 L 14,41 L 39,38 Z" />
                </svg>
              </div>
              <div className="text-left">
                <h4 className="text-[14px] font-black text-slate-900">{text('星舰模板', 'Starship Template')}</h4>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="px-1 py-0.2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded text-[8px] font-bold">{text('模板', 'Template')}</span>
                  <span className="text-[11px] text-slate-500 font-medium font-mono">{text('5.0 公里 路 官方认证', '5.0 km route, verified')}</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                miniToast(text('打开模板设置', 'Open template settings'));
                onNavigate('param_adjust');
              }}
              className="px-2.5 py-1 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-95 text-xs text-white font-extrabold rounded-full transition-all"
            >
              {text('使用', 'Use')}
            </button>
          </div>
        )}

        {/* RESULT 3: USER */}
        {false && (searchTab === 'all' || searchTab === 'user') && (
          <div 
            onClick={() => {
              miniToast(text('查看用户主页', 'Open user profile'));
              onNavigate('profile');
            }}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center space-x-3">
              <div className="w-[54px] h-[54px] rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-100/60 text-slate-400">
                <User size={24} />
              </div>
              <div className="text-left">
                <h4 className="text-[14px] font-black text-slate-900">{text('跑者小王', 'Runner Xiao Wang')}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{text('128 粉丝 · 15 个轨迹创作', '128 followers · 15 route creations')}</p>
              </div>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                miniToast(text('收藏成功', 'Saved successfully'));
              }}
              className="px-3 py-1 border border-cyan-500 hover:bg-cyan-50 active:scale-95 text-[10.5px] text-cyan-600 font-extrabold rounded-full transition-all"
            >
              {text('关注', 'Follow')}
            </button>
          </div>
        )}

        {/* RESULT 4: ANOTHER TRACK */}
        {false && (searchTab === 'all' || searchTab === 'trace') && (
          <div 
            onClick={() => { miniToast(text('打开轨迹详情', 'Open route detail')); onNavigate('trace_detail'); }}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center space-x-3">
              <div className="w-[54px] h-[54px] rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                {/* Hexagon shape */}
                <svg className="w-10 h-10 text-cyan-600" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
                  <path d="M 50,15 L 80,32 L 80,68 L 50,85 L 20,68 L 20,32 Z" />
                </svg>
              </div>
              <div className="text-left">
                <h4 className="text-[14px] font-black text-slate-900">{text('六边形挑战', 'Hexagon Challenge')}</h4>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="px-1 py-0.2 bg-cyan-50 border border-cyan-200 text-cyan-600 rounded text-[8px] font-bold">{text('轨迹', 'Route')}</span>
                  <span className="text-[11px] text-slate-500 font-medium font-mono">{text('4.8公里 路 67 次使用', '4.8 km route, used 67 times')}</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite('hex_result');
              }}
              className="p-1.5 hover:bg-slate-100 rounded-full text-rose-500"
            >
              <Heart size={15} fill={favoriteStates['hex_result'] ? 'red' : 'none'} stroke="currentColor" />
            </button>
          </div>
        )}

        {/* loader */}
        <p className="text-[11px] text-slate-400 py-4 text-center">
          {text('—— 到底啦！上拉加载更多结果 ——', 'No more results. Pull up to load more.')}
        </p>

      </div>
    </div>
  );
}
