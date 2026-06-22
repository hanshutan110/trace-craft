/**
 * SearchScreen - 搜索页
 *
 * 从原 DiscoveryScreens.tsx 拆分而来。
 * 功能：全局搜索入口页面，展示最近搜索历史、热门搜索标签和分类浏览网格。
 * 输入关键词后跳转到 SearchResultScreen 展示结果。
 *
 * @source 拆分自 components/DiscoveryScreens.tsx (SCREEN 21)
 */
import { useState, useEffect } from 'react';
import { miniToast } from '../../utils';
import { ArrowLeft, Search } from 'lucide-react';
import { ScreenId } from '../../types';
import { useI18n } from '../../i18n';
import { getSearchHints } from '../../api/discovery';
import { SEARCH_QUERY_KEY } from './discovery-utils';

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
