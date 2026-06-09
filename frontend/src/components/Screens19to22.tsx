import { useState } from 'react';
import { 
  ArrowLeft, 
  Heart, 
  Search, 
  Trash2, 
  ChevronRight, 
  CheckCircle,
  Sparkles,
  Flame,
  User,
  Star,
  MapPin,
  Clock,
  ExternalLink,
  Sliders,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { ScreenId } from '../types';

function miniToast(msg: string) {
  const t = document.createElement('div');
  t.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900/95 text-slate-100 px-4 py-2 rounded-xl text-xs font-bold shadow-lg z-50 border border-slate-705 whitespace-nowrap animate-bounce';
  t.innerText = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// ----------------------------------------------------------------------
// SCREEN 19: Favorites (收藏模板页)
// ----------------------------------------------------------------------
export function FavoritesScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [showEmpty, setShowEmpty] = useState<boolean>(false);
  const [favoriteList, setFavoriteList] = useState([
    { id: 'f1', title: '爱心挑战', dist: '约4.2公里', usage: '128次', icon: 'heart', color: 'text-rose-500' },
    { id: 'f2', title: '星形挑战', dist: '约5.0公里', usage: '95次', icon: 'star', color: 'text-yellow-500' },
    { id: 'f3', title: '环湖跑', dist: '约3.5公里', usage: '203次', icon: 'circle', color: 'text-blue-500' },
    { id: 'f4', title: '小猫跑', dist: '约5.0公里', usage: '47次', icon: 'cat', color: 'text-orange-500' }
  ]);

  const handleRemove = (id: string, name: string) => {
    setFavoriteList(prev => prev.filter(item => item.id !== id));
    miniToast(`已移除收藏：“${name}”`);
  };

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between text-slate-800 animate-fadeIn">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('profile')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">我的收藏</span>
        <button 
          onClick={() => {
            setShowEmpty(!showEmpty);
            miniToast(showEmpty ? '已切换至“有内容数据状态”' : '已切换至“空数据提示状态”');
          }}
          className="text-xs text-cyan-600 font-extrabold hover:underline"
        >
          {showEmpty ? '恢复数据' : '置空模拟'}
        </button>
      </div>

      <div className="bg-cyan-50/50 py-2 border-b border-cyan-100/40 text-center shrink-0">
        <p className="text-[11px] text-cyan-600 font-bold select-none">
          ✨ 已收藏 {showEmpty ? 0 : favoriteList.length} 个轨迹模板 · 双击移除
        </p>
      </div>

      {/* Grid or Empty view */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-16">
        {showEmpty || favoriteList.length === 0 ? (
          /* EMPTY VIEW */
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 px-6 animate-pulse select-none">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
              <Star size={36} fill="none" className="stroke-[1.5]" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-slate-800">暂无收藏</p>
              <p className="text-[12px] text-slate-400 mt-1 max-w-xs">
                去公开广场或者寻航推荐里找一找美丽的路线灵感吧！
              </p>
            </div>
            <button 
              onClick={() => onNavigate('square')}
              className="px-5 py-2.5 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-95 transition-all text-white font-extrabold text-xs rounded-full shadow-md shadow-cyan-400/20"
            >
              去广场发现灵感
            </button>
          </div>
        ) : (
          /* 2x2 GRID VIEW */
          <div className="grid grid-cols-2 gap-3.5 select-none">
            {favoriteList.map((item) => (
              <div 
                key={item.id}
                onClick={() => onNavigate('template_detail')}
                className="bg-white p-3 rounded-[16px] border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-2 hover:shadow-md hover:border-slate-200 transition-all cursor-pointer relative group"
              >
                {/* SVG mock path top */}
                <div className="h-[90px] rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100 overflow-hidden shrink-0">
                  {item.icon === 'heart' && (
                    <svg className="w-14 h-14 text-rose-500 animate-pulse" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
                      <path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" />
                    </svg>
                  )}
                  {item.icon === 'star' && (
                    <svg className="w-14 h-14 text-yellow-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
                      <path d="M 50,15 L 61,38 L 86,41 L 67,58 L 72,83 L 50,70 L 28,83 L 33,58 L 14,41 L 39,38 Z" />
                    </svg>
                  )}
                  {item.icon === 'circle' && (
                    <svg className="w-14 h-14 text-blue-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
                      <circle cx="50" cy="50" r="30" />
                    </svg>
                  )}
                  {item.icon === 'cat' && (
                    <svg className="w-14 h-14 text-orange-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
                      <path d="M 20,80 Q 25,40 35,40 Q 40,25 50,40 Q 60,25 65,40 Q 75,40 80,80 Q 50,85 20,80" />
                    </svg>
                  )}
                </div>

                <div>
                  <h4 className="text-[13px] font-black text-slate-900 truncate leading-none mt-1">{item.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{item.dist}</p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                  <span className="text-[10px] text-rose-500 font-bold flex items-center gap-0.5">
                    ❤️ {item.usage}
                  </span>
                  
                  {/* use button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      miniToast(`已应用模板：“${item.title}”`);
                      onNavigate('param_adjust');
                    }}
                    className="px-2.5 py-1 border border-cyan-500 text-cyan-500 hover:bg-cyan-50 active:scale-95 text-[10px] font-black rounded-full transition-all"
                  >
                    开跑
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

      {/* Sticky footer navigation */}
      <div className="sticky bottom-0 h-14 bg-white border-t border-slate-100 flex items-center justify-around text-slate-400 text-[10px] select-none shrink-0 z-35 font-semibold">
        <button onClick={() => onNavigate('home')} className="flex flex-col items-center justify-center flex-1 py-1 hover:text-slate-750">
          <svg className="w-5 h-5 mb-0.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
          主页
        </button>
        <button onClick={() => onNavigate('my_traces')} className="flex flex-col items-center justify-center flex-1 py-1 hover:text-slate-750">
          <svg className="w-5 h-5 mb-0.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
          我的轨迹
        </button>
        <button onClick={() => onNavigate('profile')} className="flex flex-col items-center justify-center flex-1 py-1 text-cyan-500 font-extrabold">
          <svg className="w-5 h-5 mb-0.5 text-cyan-500" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          个人中心
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SCREEN 20: Template Detail (模板详情页)
// ----------------------------------------------------------------------
export function TemplateDetailScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [favorite, setFavorite] = useState(true);

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between overflow-y-auto text-slate-800 animate-fadeIn">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('favorites')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">模板详情</span>
        <div className="flex space-x-1.5">
          <button onClick={() => miniToast('分享模板数据')} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <ExternalLink size={16} className="text-slate-600" />
          </button>
          <button onClick={() => { setFavorite(!favorite); miniToast(favorite ? '已取消收藏' : '已添加至我的收藏'); }} className="p-1.5 hover:bg-neutral-100 rounded-full">
            <Heart size={16} fill={favorite ? 'red' : 'none'} className={favorite ? 'text-red-500' : 'text-slate-600'} />
          </button>
        </div>
      </div>

      {/* Main stats visual template body */}
      <div className="flex-1 overflow-y-auto pb-4 select-none">
        
        {/* Template graphic preview area */}
        <div className="py-6 px-4 flex flex-col items-center justify-center bg-slate-50/50 border-b border-slate-100 relative">
          <div className="w-48 h-48 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center p-3">
            <svg className="w-36 h-36 text-rose-500 drop-shadow-sm animate-pulse" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
              <path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" />
            </svg>
          </div>

          <h3 className="text-[20px] font-black text-slate-900 mt-4">爱心挑战</h3>
          <p className="text-[11px] text-[#4FACFE] font-bold mt-1">❤️ 官方推荐跑步打卡艺术经典路线</p>
        </div>

        {/* Info detail block list */}
        <div className="px-4 mt-4">
          <div className="bg-white p-4 rounded-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-slate-100 space-y-4">
            
            <div className="flex items-center justify-between text-[13px] border-b border-slate-50 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-slate-500">预估跑距</span>
              </div>
              <strong className="text-slate-900 font-bold">约 4.2 公里</strong>
            </div>

            <div className="flex items-center justify-between text-[13px] border-b border-slate-50 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-slate-500">预计时长</span>
              </div>
              <strong className="text-slate-900 font-bold">约 25 分钟</strong>
            </div>

            <div className="flex items-center justify-between text-[13px] border-b border-slate-50 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-slate-500">已被完成</span>
              </div>
              <strong className="text-slate-930 text-rose-500 font-extrabold">128 次使用</strong>
            </div>

            <div className="flex items-center justify-between text-[13px]">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-slate-500">创建者</span>
              </div>
              <span className="font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">官方认证模板</span>
            </div>

          </div>
        </div>

        {/* Filter tags bubble pills info banner */}
        <div className="px-4 mt-3 flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-500 border border-red-100">🔥 热门推荐</span>
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-500 border border-rose-100">❤️ 甜度饱满</span>
          <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">✅ 新手友好</span>
        </div>

        {/* User outcomes dynamic horizontal list */}
        <div className="px-4 mt-4 text-left">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] font-black text-slate-800">大家跑出来的真实效果</span>
            <button onClick={() => { onNavigate('square'); }} className="text-[10px] text-cyan-600 font-semibold hover:underline">查看全广场评价</button>
          </div>

          <div className="flex space-x-3 overflow-x-auto pb-1 scrollbar-none">
            {[1, 2, 3].map((val) => (
              <div 
                key={val}
                className="w-[110px] p-2 rounded-xl bg-slate-50 border border-slate-100 text-center flex flex-col items-center space-y-1.5 cursor-pointer shrink-0"
                onClick={() => { miniToast(`查看第 ${val} 名用户跑步返图`); }}
              >
                <div className="w-12 h-12 bg-white rounded-full border border-slate-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-rose-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6">
                    <path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" />
                  </svg>
                </div>
                <span className="text-[9px] text-slate-400 font-semibold truncate max-w-full">
                  {val === 1 ? '跑者小美' : val === 2 ? '星星行者' : '微光运动家'}
                </span>
                <span className="text-[8px] bg-emerald-100/60 text-emerald-600 rounded px-1 scale-95 leading-none">
                  9{val === 1 ? '7' : val === 2 ? '5' : '4'}% 吻合
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Bottom Buttons */}
        <div className="px-4 mt-5 grid grid-cols-2 gap-3">
          <button 
            onClick={() => {
              miniToast('为您模拟生成大地图实景预览...');
              onNavigate('nav');
            }}
            className="py-3 px-4 border border-slate-200 text-slate-700 bg-white hover:bg-neutral-50 active:scale-98 text-xs font-black rounded-full transition-all text-center uppercase tracking-wider"
          >
            预览完整路线
          </button>
          <button 
            onClick={() => {
              miniToast('已导入该模板，请配置调节变换');
              onNavigate('param_adjust');
            }}
            className="py-3 px-4 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-98 text-white text-xs font-black rounded-full shadow-md shadow-cyan-400/20 transition-all text-center uppercase tracking-wider"
          >
            直接使用此模板
          </button>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SCREEN 21: Search (搜索页)
// ----------------------------------------------------------------------
export function SearchScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [query, setQuery] = useState('');
  const historyList = ['小猫跑', '爱心挑战', '五角星', '环湖跑'];
  const hotList = ['🔥 五角星', '🔥 心形', '圆形', '三角形', '正方形'];
  const categories = ['基础图形', '动物', '文字', '节日', '自定义'];

  const handleSearchTrigger = (val: string) => {
    setQuery(val);
    miniToast(`正在发起搜索: “${val}”`);
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
            placeholder="搜索轨迹、模板或用户"
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
          {query.trim() ? '搜索' : '取消'}
        </button>
      </div>

      {/* Primary search segments scroll context */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-left select-none">
        
        {/* Recent Search history */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[13px] font-black text-slate-900">最近搜索</span>
            <button 
              onClick={() => { miniToast('最近历史搜索记录已清空'); }}
              className="text-[11px] text-cyan-600 font-bold hover:underline"
            >
              清空
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {historyList.map((tag) => (
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
          <span className="text-[13px] font-black text-slate-900 block mb-2.5">热门搜索</span>
          <div className="flex flex-wrap gap-2">
            {hotList.map((tag) => (
              <span 
                key={tag}
                onClick={() => handleSearchTrigger(tag.replace('🔥 ', ''))}
                className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-100 text-[11px] text-slate-600 font-bold rounded-full cursor-pointer transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Categories grid */}
        <div>
          <span className="text-[13px] font-black text-slate-900 block mb-2.5">按分类浏览</span>
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

        {/* Popular recommendation preview list */}
        <div>
          <span className="text-[13px] font-black text-slate-900 block mb-2">热门推荐</span>
          <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none">
            {['五角星', '爱心'].map((name, i) => (
              <div 
                key={name}
                onClick={() => handleSearchTrigger(name)}
                className="w-28 p-2 bg-white rounded-2xl border border-slate-100 shadow-[0_3px_10px_rgba(0,0,0,0.02)] shrink-0 cursor-pointer hover:shadow-md transition-shadow text-center flex flex-col items-center space-y-1"
              >
                <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center">
                  <Star size={14} className={i === 0 ? 'text-yellow-500' : 'text-rose-500'} fill="currentColor" />
                </div>
                <span className="text-[11px] font-black text-slate-900">{name === '五角星' ? '经典五角星' : '爱心挑战'}</span>
                <span className="text-[8px] text-slate-400">{i === 0 ? '1288次跑步' : '980次跑步'}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SCREEN 22: Search Result (搜索结果页)
// ----------------------------------------------------------------------
export function SearchResultScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [searchTab, setSearchTab] = useState<'all' | 'trace' | 'template' | 'user'>('all');
  const [favoriteStates, setFavoriteStates] = useState<Record<string, boolean>>({
    'cat_result': true,
    'hex_result': false
  });

  const toggleFavorite = (id: string) => {
    setFavoriteStates(prev => {
      const next = !prev[id];
      miniToast(next ? '已成功添加至收藏' : '已取消收藏');
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
        
        {/* Simulated input representing "五角星" */}
        <div 
          onClick={() => onNavigate('search')}
          className="flex-1 mx-3 bg-slate-50 px-3 py-1.5 rounded-full flex items-center space-x-1 border border-slate-100/80 cursor-pointer"
        >
          <Search size={13} className="text-slate-400" />
          <span className="text-[12px] font-bold text-slate-900">五角星</span>
        </div>

        <button onClick={() => onNavigate('home')} className="text-[12px] text-slate-500 hover:text-slate-700 font-semibold">
          取消
        </button>
      </div>

      {/* Filter panel info */}
      <div className="px-4 py-1.5 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 shrink-0 font-semibold border-b border-slate-100/50">
        <span>找到 23 个含有“五角星”的结果</span>
        <div className="flex space-x-2">
          <button onClick={() => miniToast('已触发过滤器')} className="hover:text-cyan-600">筛选 ▿</button>
          <button onClick={() => miniToast('已切换排序')} className="hover:text-cyan-600">最佳匹配 ▿</button>
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
            {tab === 'all' && '全部'}
            {tab === 'trace' && '轨迹'}
            {tab === 'template' && '模板'}
            {tab === 'user' && '用户'}
          </button>
        ))}
      </div>

      {/* Search results list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 pb-8 select-none">
        
        {/* RESULT 1: TRACK */}
        {(searchTab === 'all' || searchTab === 'trace') && (
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
                <h4 className="text-[14px] font-black text-slate-900">五角星挑战</h4>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="px-1 py-0.2 bg-cyan-50 border border-cyan-200 text-cyan-600 rounded text-[8px] font-bold">轨迹</span>
                  <span className="text-[11px] text-slate-500 font-medium font-mono">5.0 公里 · 128 次使用</span>
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
        {(searchTab === 'all' || searchTab === 'template') && (
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
                <h4 className="text-[14px] font-black text-slate-900">星形模板</h4>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="px-1 py-0.2 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded text-[8px] font-bold">模板</span>
                  <span className="text-[11px] text-slate-500 font-medium font-mono">5.0 公里 · 官方认证</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                miniToast('已导入该模板，请配置调节变换');
                onNavigate('param_adjust');
              }}
              className="px-2.5 py-1 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-95 text-xs text-white font-extrabold rounded-full transition-all"
            >
              使用
            </button>
          </div>
        )}

        {/* RESULT 3: USER */}
        {(searchTab === 'all' || searchTab === 'user') && (
          <div 
            onClick={() => miniToast('已打开跑者小明的个人主页')}
            className="p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-2xl shadow-xs flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center space-x-3">
              <div className="w-[54px] h-[54px] rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-100/60 text-slate-400">
                <User size={24} />
              </div>
              <div className="text-left">
                <h4 className="text-[14px] font-black text-slate-900">跑者小明</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">128 粉丝 · 15 个轨迹创作</p>
              </div>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                miniToast('已成功关注跑者小明');
              }}
              className="px-3 py-1 border border-cyan-500 hover:bg-cyan-50 active:scale-95 text-[10.5px] text-cyan-600 font-extrabold rounded-full transition-all"
            >
              关注
            </button>
          </div>
        )}

        {/* RESULT 4: ANOTHER TRACK */}
        {(searchTab === 'all' || searchTab === 'trace') && (
          <div 
            onClick={() => { miniToast('打开六边形战士轨迹'); onNavigate('trace_detail'); }}
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
                <h4 className="text-[14px] font-black text-slate-900">六边形战士</h4>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="px-1 py-0.2 bg-cyan-50 border border-cyan-200 text-cyan-600 rounded text-[8px] font-bold">轨迹</span>
                  <span className="text-[11px] text-slate-500 font-medium font-mono">4.8公里 · 67 次使用</span>
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
          —— 到底啦！上拉加载更多结果 ——
        </p>

      </div>
    </div>
  );
}
