import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Share2, 
  MoreVertical, 
  Send, 
  Heart, 
  MessageCircle, 
  Star,
  User, 
  UserPlus, 
  UserCheck,
  Search, 
  Bell, 
  Settings, 
  Volume2, 
  CheckCircle,
  ExternalLink,
  ChevronRight,
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
// SCREEN 23: Trace Share Preview (轨迹分享预览页)
// ----------------------------------------------------------------------
export function TraceShareScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [description, setDescription] = useState('');
  const [topicTags, setTopicTags] = useState<string[]>([]);

  const handlePublish = () => {
    miniToast('轨迹路线成功发布至公开社区！');
    setTimeout(() => {
      onNavigate('square');
    }, 400);
  };

  const handleSelectTag = (tag: string) => {
    if (topicTags.includes(tag)) {
      setTopicTags(prev => prev.filter(t => t !== tag));
    } else {
      setTopicTags(prev => [...prev, tag]);
    }
  };

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between overflow-y-auto text-slate-800 animate-fadeIn select-none">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('success')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">分享轨迹</span>
        <button 
          onClick={handlePublish}
          className="text-14px text-cyan-600 font-extrabold px-1.5 py-0.5 rounded-full hover:bg-cyan-50"
        >
          发布
        </button>
      </div>

      {/* Share Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        
        {/* CENTER HIGH-END SHARE CARD PREVIEW */}
        <div className="bg-white p-4 rounded-[24px] shadow-[0_10px_25px_rgba(0,0,0,0.06)] border border-slate-100 max-w-[290px] mx-auto text-center relative overflow-hidden flex flex-col items-stretch space-y-3">
          
          {/* Card Top Branding */}
          <div className="flex items-center justify-between text-left pb-2 border-b border-slate-50">
            <div className="flex items-center space-x-1.5">
              <div className="w-5 h-5 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] rounded-md flex items-center justify-center font-black text-white text-[9px]">
                TC
              </div>
              <span className="text-[10px] font-black text-slate-800">轨迹工坊</span>
            </div>
            <span className="text-[8px] text-slate-400 font-mono">刚刚创作</span>
          </div>

          {/* Card Content Route */}
          <div className="h-[105px] bg-slate-50 rounded-xl relative flex items-center justify-center border border-slate-100">
            <svg className="w-24 h-24 text-rose-500 animate-pulse" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4.5">
              <path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" />
            </svg>
            <span className="absolute bottom-1.5 left-2 bg-slate-900/80 text-white text-[8px] px-1.5 rounded font-mono">
              5.01 km
            </span>
          </div>

          <div>
            <h4 className="text-[14px] font-black text-slate-900">爱心挑战</h4>
            <p className="text-[9px] text-slate-400 mt-1 font-mono">用时 32:15 | 配速 6'27" /km</p>
          </div>

          {/* Card User Info Footer */}
          <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-left">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-205 flex items-center justify-center">
                <User size={12} className="text-slate-400" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-900">跑者小明</p>
                <p className="text-[7px] text-slate-400 leading-none">跑出你的专属形状</p>
              </div>
            </div>

            {/* Small dynamic mock QR code */}
            <div className="w-7 h-7 bg-slate-100 border border-slate-200 p-0.5 rounded flex flex-wrap gap-[1px]">
              {[...Array(9)].map((_, i) => (
                <div key={i} className={`w-[7px] h-[7px] ${i % 3 === 0 || i === 7 || i === 2 ? 'bg-slate-800' : 'bg-transparent'}`}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Edit fields option */}
        <div className="space-y-4 pt-2">
          
          {/* Note Input */}
          <div>
            <span className="text-[13px] font-black text-slate-900 block mb-1.5">编辑分享内容</span>
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-start space-x-1.5">
              <textarea 
                className="bg-transparent border-none w-full text-[12px] text-slate-800 placeholder:text-slate-400 focus:outline-none min-h-[50px] resize-none leading-relaxed"
                placeholder="分享你的跑步心情或打卡故事..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Hashtag choices */}
          <div>
            <p className="text-[11px] text-slate-400 font-semibold mb-1.5">推荐热门话题标签:</p>
            <div className="flex flex-wrap gap-2">
              {['#爱心跑', '#轨迹规划', '#跑步打卡', '#极速运动'].map(tag => {
                const selected = topicTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => handleSelectTag(tag)}
                    className={`px-3 py-1 rounded-full text-[10.5px] font-extrabold transition-all border ${
                      selected 
                        ? 'bg-cyan-100/60 border-cyan-300 text-cyan-600' 
                        : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Social Platforms Selection */}
          <div>
            <span className="text-[13px] font-black text-slate-900 block mb-3">分享到第三方平台</span>
            <div className="grid grid-cols-5 gap-1.5 text-center">
              
              <button 
                onClick={() => miniToast('已唤起微信好友共享通道')}
                className="flex flex-col items-center space-y-1.5 cursor-pointer group"
              >
                <div className="w-[45px] h-[45px] rounded-full bg-emerald-500 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center text-white shadow-xs">
                  微信
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-none">微信</span>
              </button>

              <button 
                onClick={() => miniToast('已唤起朋友圈多图分享面板')}
                className="flex flex-col items-center space-y-1.5 cursor-pointer group"
              >
                <div className="w-[45px] h-[45px] rounded-full bg-sky-500 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center text-white shadow-xs">
                  圈子
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-none">朋友圈</span>
              </button>

              <button 
                onClick={() => miniToast('已导入小红书卡片发布面板')}
                className="flex flex-col items-center space-y-1.5 cursor-pointer group"
              >
                <div className="w-[45px] h-[45px] rounded-full bg-rose-500 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center text-white shadow-xs">
                  红书
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-none">小红书</span>
              </button>

              <button 
                onClick={() => miniToast('已开启抖音精美音乐原片合成')}
                className="flex flex-col items-center space-y-1.5 cursor-pointer group"
              >
                <div className="w-[45px] h-[45px] rounded-full bg-slate-900 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center text-white shadow-xs">
                  抖音
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-none">抖音</span>
              </button>

              <button 
                onClick={() => miniToast('轨迹成果长图已保存至个人相册')}
                className="flex flex-col items-center space-y-1.5 cursor-pointer group"
              >
                <div className="w-[45px] h-[45px] rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center text-slate-600 shadow-xs">
                  相册
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-none">存相册</span>
              </button>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// SCREEN 24: Square / Community Feed (公开广场)
// ----------------------------------------------------------------------
export function SquareScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [activeTab, setActiveTab] = useState<'recommend' | 'hot' | 'latest' | 'follow'>('recommend');

  const cards = [
    {
      id: 'post_1',
      author: '跑者小美',
      title: '爱心跑',
      likes: 128,
      comments: 23,
      dist: '5.0km',
      height: 'h-[110px]',
      svg: (
        <svg className="w-16 h-16 text-rose-500 animate-pulse" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5">
          <path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" />
        </svg>
      )
    },
    {
      id: 'post_2',
      author: '星星行者',
      title: '星形挑战',
      likes: 95,
      comments: 12,
      dist: '5.0km',
      height: 'h-[100px]',
      svg: (
        <svg className="w-16 h-16 text-yellow-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5">
          <path d="M 50,15 L 61,38 L 86,41 L 67,58 L 72,83 L 50,70 L 28,83 L 33,58 L 14,41 L 39,38 Z" />
        </svg>
      )
    },
    {
      id: 'post_3',
      author: '猫跑',
      title: '小猫跑',
      likes: 203,
      comments: 45,
      dist: '5.0km',
      height: 'h-[120px]',
      svg: (
        <svg className="w-16 h-16 text-orange-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5">
          <path d="M 20,80 Q 25,40 35,40 Q 40,25 50,40 Q 60,25 65,40 Q 75,40 80,80 Q 50,85 20,80" />
        </svg>
      )
    },
    {
      id: 'post_4',
      author: '环湖高手',
      title: '环湖跑',
      likes: 67,
      comments: 8,
      dist: '3.5km',
      height: 'h-[95px]',
      svg: (
        <svg className="w-16 h-16 text-blue-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5">
          <circle cx="50" cy="50" r="28" />
        </svg>
      )
    }
  ];

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between text-slate-800 animate-fadeIn select-none">
      
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <div className="w-10"></div> {/* spacer */}
        <span className="text-[18px] font-black text-slate-900 tracking-tight">发现广场</span>
        <div className="flex space-x-1 shrink-0">
          <button onClick={() => onNavigate('search')} className="p-1 hover:bg-neutral-100 rounded-full">
            <Search size={18} className="text-slate-600" />
          </button>
          <button onClick={() => onNavigate('notifications')} className="p-1 hover:bg-neutral-100 rounded-full relative">
            <Bell size={18} className="text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
          </button>
        </div>
      </div>

      {/* Tabs list shrink-0 */}
      <div className="px-4 py-2 flex space-x-1.5 overflow-x-auto scrollbar-none shrink-0 border-b border-slate-50/60 bg-white">
        {(['recommend', 'hot', 'latest', 'follow'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              activeTab === tab
                ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white shadow-sm'
                : 'bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tab === 'recommend' && '为你推荐'}
            {tab === 'hot' && '热门作品'}
            {tab === 'latest' && '新鲜出炉'}
            {tab === 'follow' && '我的关注'}
          </button>
        ))}
      </div>

      {/* Waterfall Grid List 2 Column scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-16">
        <div className="grid grid-cols-2 gap-3">
          {cards.map(item => (
            <div
              key={item.id}
              onClick={() => onNavigate('post_detail')}
              className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99] group relative"
            >
              {/* Graphic container */}
              <div className={`${item.height} bg-slate-50 flex items-center justify-center p-3 relative select-none border-b border-slate-50 shrink-0`}>
                {item.svg}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    miniToast(`已追加喜欢：“${item.title}”`);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 hover:bg-white shadow-xs flex items-center justify-center text-rose-500 hover:text-red-600 transition-colors z-10"
                >
                  <Heart size={12} fill="none" />
                </button>
              </div>

              {/* description footer */}
              <div className="p-3 text-left">
                <h4 className="text-[13px] font-black text-slate-900 group-hover:text-cyan-600 transition-colors">{item.title}</h4>
                
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-semibold">
                  <span className="flex items-center space-x-1 max-w-[50px] truncate">
                    <User size={10} />
                    <span className="truncate">{item.author}</span>
                  </span>
                  <span>📍 {item.dist}</span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pb-0.5 font-bold border-t border-slate-50/50 pt-2 text-[#4FACFE]">
                  <span>❤️ {item.likes}赞</span>
                  <span>💬 {item.comments}评</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-400 py-4 text-center">
          —— 🍀 正在为您算法推荐更多绝美作品 ——
        </p>
      </div>

      {/* Sticky footer bottom */}
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
// SCREEN 25: Community Post Detail (作品详情页--社区)
// ----------------------------------------------------------------------
export function PostDetailScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [likesCount, setLikesCount] = useState(128);
  const [hasLiked, setHasLiked] = useState(false);
  const [comments, setComments] = useState([
    { id: 'c1', user: '跑者小明', avatar: 'M', time: '1小时前', text: '这个路线太棒了！我也要试试' },
    { id: 'c2', user: '跑步小白', avatar: 'X', time: '30分钟前', text: '请问在这个小区附近跑步红绿灯多吗？' }
  ]);

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    const newComment = {
      id: Date.now().toString(),
      user: '运动家(我)',
      avatar: '我',
      time: '刚刚',
      text: commentInput.trim()
    };
    setComments(prev => [newComment, ...prev]);
    setCommentInput('');
    miniToast('您的跑步留言发布成功！');
  };

  const handleLike = () => {
    if (hasLiked) {
      setLikesCount(prev => prev - 1);
      setHasLiked(false);
      miniToast('取消点赞');
    } else {
      setLikesCount(prev => prev + 1);
      setHasLiked(true);
      miniToast('作品点赞成功！❤️');
    }
  };

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between overflow-y-auto text-slate-800 animate-fadeIn select-none">
      {/* Top Bar Navigation */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('square')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[14px] font-bold text-slate-900">社区作品详情</span>
        <button onClick={() => miniToast('已打开操作卡片')} className="p-1 hover:bg-neutral-100 rounded-full">
          <MoreVertical size={18} className="text-slate-600" />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto pb-4">
        
        {/* Author info block */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600">
              美
            </div>
            <div className="text-left">
              <h4 className="text-[14px] font-bold text-slate-900">跑者小美</h4>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">2小时前发布 · 北京奥森</p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsFollowing(!isFollowing);
              miniToast(isFollowing ? '已取消关注' : '成功关注跑者小美！');
            }}
            className={`px-3.5 py-1 text-xs font-bold rounded-full border transition-all ${
              isFollowing 
                ? 'bg-slate-100 border-slate-200 text-slate-550' 
                : 'border-cyan-500 text-cyan-600 hover:bg-cyan-50 active:scale-95'
            }`}
          >
            {isFollowing ? '已关注' : '关注'}
          </button>
        </div>

        {/* Map Preview Area */}
        <div className="h-[200px] bg-slate-50 border-b border-slate-100 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:18px_18px] opacity-50"></div>
          
          <svg className="w-40 h-40 text-rose-500 drop-shadow-md relative z-10" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4">
            <path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" />
            <circle cx="50" cy="75" r="4.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Post metrics card */}
        <div className="px-4 mt-3">
          <div className="bg-white p-4 rounded-[24px] shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-slate-100">
            <h3 className="text-[17px] font-black text-slate-900 text-left">暖冬爱心跑打卡！</h3>
            <p className="text-[12px] text-slate-500 mt-1 lines-relaxed text-left">
              今天迎着阳光在奥体公园跑了一个正正圆圆的大爱心，路线超平整，贴合度94%！推荐给周边的跑友们！
            </p>

            <div className="grid grid-cols-3 gap-2 text-center pt-3 mt-3 border-t border-slate-50 select-none">
              <div className="border-r border-slate-100">
                <span className="text-[15px] font-extrabold text-slate-900">5.01 km</span>
                <p className="text-[9px] text-slate-400 mt-0.5">里程</p>
              </div>
              <div className="border-r border-slate-100">
                <span className="text-[15px] font-extrabold text-slate-900">32:15</span>
                <p className="text-[9px] text-slate-400 mt-0.5">时间</p>
              </div>
              <div>
                <span className="text-[15px] font-extrabold text-slate-900">6'27" /km</span>
                <p className="text-[9px] text-slate-400 mt-0.5">平均配速</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-3 select-none">
              <span className="px-2 py-0.5 bg-red-50 text-red-500 text-[9px] font-bold rounded">🔥 热门推荐</span>
              <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[9px] font-bold rounded">❤️ 专属心形</span>
            </div>
          </div>
        </div>

        {/* Liking comment interaction toolbar */}
        <div className="px-6 py-3 border-y border-slate-50 mt-4 flex items-center justify-around select-none">
          <button 
            onClick={handleLike}
            className="flex items-center space-x-2.5 text-slate-500 group"
          >
            <Heart size={20} fill={hasLiked ? 'red' : 'none'} className={hasLiked ? 'text-red-500' : 'text-slate-500 group-hover:text-red-500'} />
            <span className="text-[13px] font-bold">{likesCount} 点赞</span>
          </button>
          
          <button 
            onClick={() => miniToast('已滑至底部评论输入框')}
            className="flex items-center space-x-2.5 text-slate-500 hover:text-cyan-500"
          >
            <MessageCircle size={20} />
            <span className="text-[13px] font-bold">{comments.length} 评论</span>
          </button>
          
          <button 
            onClick={() => { miniToast('该路线已成功保存并在本地收藏'); }}
            className="flex items-center space-x-2.5 text-slate-500 hover:text-yellow-500"
          >
            <Star size={20} />
            <span className="text-[13px] font-bold">459 收藏</span>
          </button>
        </div>

        {/* Comment segment lists */}
        <div className="px-4 mt-4 text-left">
          <span className="text-[13px] font-black text-slate-900 block mb-3">
            评论留言 ({comments.length})
          </span>

          {/* New message input inline */}
          <form onSubmit={handleSendComment} className="flex items-center space-x-2 mb-4 bg-slate-50 pl-3 pr-1 py-1 rounded-full border border-slate-100">
            <input 
              type="text" 
              value={commentInput} 
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="说点什么，为她点个赞..."
              className="bg-transparent border-none text-[11px] placeholder:text-slate-400 focus:outline-none w-full font-medium"
            />
            <button 
              type="submit"
              className="w-8 h-8 rounded-full bg-cyan-500 hover:brightness-105 active:scale-95 text-white flex items-center justify-center shrink-0 transition-all shadow-xs"
            >
              <Send size={11} className="relative left-[0.5px]" strokeWidth={2.5} />
            </button>
          </form>

          {/* lists view */}
          <div className="space-y-3 pb-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-2.5 border-b border-slate-50/60 pb-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-205 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                  {comment.avatar}
                </div>
                <div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-[12px] font-bold text-slate-900">{comment.user}</span>
                    <span className="text-[9px] text-slate-400 font-mono">{comment.time}</span>
                  </div>
                  <p className="text-[11.5px] text-slate-700 mt-1 lines-relaxed">{comment.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom sticked action toolbar */}
      <div className="p-3 bg-white border-t border-slate-100 flex items-center space-x-3 shrink-0">
        <button 
          onClick={() => {
            miniToast('已导入该模板，请配置调节变换');
            onNavigate('param_adjust');
          }}
          className="flex-1 py-2.5 bg-gradient-to-r from-[#4FACFE] to-[#00F2FE] hover:brightness-105 active:scale-95 select-none transition-all text-white font-extrabold text-xs rounded-full shadow-md shadow-cyan-400/20 text-center uppercase tracking-wider"
        >
          使用此模板开跑
        </button>
        <button 
          onClick={() => {
            setIsFollowing(!isFollowing);
            miniToast(isFollowing ? '已取消关注' : '关注作者成功！');
          }}
          className="py-2.5 px-4 border border-slate-200 text-slate-755 text-xs font-black rounded-full text-center hover:bg-neutral-50 active:bg-slate-100 transition-colors"
        >
          {isFollowing ? '已关注' : '关注作者'}
        </button>
      </div>

    </div>
  );
}

// ----------------------------------------------------------------------
// SCREEN 26: Message notification Screen (消息通知页)
// ----------------------------------------------------------------------
export function NotificationsScreen({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [activeTab, setActiveTab] = useState<'all' | 'like' | 'comment' | 'follow' | 'sys'>('all');
  const [showEmpty, setShowEmpty] = useState(false);
  const [unreads, setUnreads] = useState<Record<string, boolean>>({
    'n1': true,
    'n2': true,
    'n4': true
  });

  const [followBacks, setFollowBacks] = useState<Record<string, boolean>>({
    'white': false
  });

  const [msgList, setMsgList] = useState([
    {
      id: 'n1',
      type: 'like',
      author: '跑者小明',
      actionText: '赞了你的作品',
      target: '“爱心挑战”',
      time: '5分钟前',
      unread: true,
      hasThumbnail: true,
      thumbnailSvg: (
        <svg className="w-7 h-7 text-rose-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6">
          <path d="M 50,75 C 10,40 25,10 50,35 C 75,10 90,40 50,75 Z" />
        </svg>
      )
    },
    {
      id: 'n2',
      type: 'comment',
      author: '星星行者',
      actionText: '评论了你的作品',
      target: '“这个路线太有意思了，下午就跑！”',
      time: '1小时前',
      unread: true,
      hasThumbnail: true,
      thumbnailSvg: (
        <svg className="w-7 h-7 text-yellow-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6">
          <path d="M 50,15 L 61,38 L 86,41 L 67,58 L 72,83 L 50,70 L 28,83 L 33,58 L 14,41 L 39,38 Z" />
        </svg>
      )
    },
    {
      id: 'n3',
      type: 'follow',
      author: '跑步小白',
      actionText: '关注了你',
      target: '',
      time: '2小时前',
      unread: false,
      hasThumbnail: false
    },
    {
      id: 'n4',
      type: 'sys',
      author: '系统通知',
      actionText: '',
      target: '欢迎加入轨迹工坊！快去创作你的第一条跑图创意吧！',
      time: '昨天',
      unread: true,
      hasThumbnail: false
    },
    {
      id: 'n5',
      type: 'like',
      author: '环湖高手',
      actionText: '赞了你的作品',
      target: '“环湖跑”',
      time: '昨天',
      unread: false,
      hasThumbnail: true,
      thumbnailSvg: (
        <svg className="w-7 h-7 text-blue-500" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6">
          <circle cx="50" cy="50" r="28" />
        </svg>
      )
    }
  ]);

  const handleMarkAllRead = () => {
    setUnreads({});
    miniToast('所有未读系统通知已被标记为已读！');
  };

  const filtered = msgList.filter(m => {
    if (activeTab === 'like') return m.type === 'like';
    if (activeTab === 'comment') return m.type === 'comment';
    if (activeTab === 'follow') return m.type === 'follow';
    if (activeTab === 'sys') return m.type === 'sys';
    return true;
  });

  return (
    <div className="w-full h-full bg-[#FFFFFF] flex flex-col justify-between text-slate-800 animate-fadeIn select-none">
      
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100 shrink-0 bg-white">
        <button onClick={() => onNavigate('square')} className="p-1 hover:bg-neutral-100 rounded-full">
          <ArrowLeft size={18} className="text-slate-700" />
        </button>
        <span className="text-[16px] font-bold text-slate-900">消息通知</span>
        <div className="flex items-center space-x-1.5 shrink-0">
          <button 
            onClick={() => {
              setShowEmpty(!showEmpty);
              miniToast(showEmpty ? '切换至有消息列表' : '切换至空信箱状态');
            }} 
            className="text-[10px] text-cyan-600 font-extrabold hover:underline"
          >
            {showEmpty ? '恢复消息' : '置空模拟'}
          </button>
          <button onClick={() => miniToast('已打开通知设置')} className="p-1 hover:bg-neutral-100 rounded-full">
            <Settings size={16} className="text-slate-650" />
          </button>
        </div>
      </div>

      {/* Categories Horizontal TAB shrink-0 */}
      <div className="px-4 py-2 flex space-x-1.5 overflow-x-auto scrollbar-none shrink-0 border-b border-slate-50 bg-white">
        {(['all', 'like', 'comment', 'follow', 'sys'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded-full text-xs shrink-0 font-bold transition-all ${
              activeTab === tab
                ? 'bg-linear-to-r from-[#4FACFE] to-[#00F2FE] text-white'
                : 'bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tab === 'all' && '全部'}
            {tab === 'like' && '点赞'}
            {tab === 'comment' && '评论'}
            {tab === 'follow' && '新粉'}
            {tab === 'sys' && '系统'}
          </button>
        ))}
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto">
        {showEmpty || filtered.length === 0 ? (
          
          /* EMPTY NOTIFICATIONS STATE */
          <div className="py-28 flex flex-col items-center justify-center text-center px-6 animate-pulse select-none space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
              <svg className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <div>
              <p className="text-[16px] font-bold text-slate-800">暂无消息通知</p>
              <p className="text-[12px] text-slate-400 mt-1 max-w-xs leading-normal">
                收到来自其他跑友的点赞、作品评论或关注后，全闭环事件会在这里推送显示哦！
              </p>
            </div>
          </div>

        ) : (
          
          /* MESSAGES LISTED ROW */
          <div className="divide-y divide-slate-100/70">
            {filtered.map(m => {
              const hasUnreadDot = unreads[m.id];

              return (
                <div 
                  key={m.id}
                  onClick={() => {
                    // Mark single clicked unread as read
                    if (hasUnreadDot) {
                      setUnreads(prev => {
                        const next = { ...prev };
                        delete next[m.id];
                        return next;
                      });
                    }
                    if (m.type === 'like' || m.type === 'comment') {
                      onNavigate('post_detail');
                    }
                  }}
                  className={`p-3.5 flex items-center justify-between text-left hover:bg-slate-50/50 cursor-pointer transition-colors relative ${
                    hasUnreadDot ? 'bg-cyan-50/20' : 'bg-white'
                  }`}
                >
                  {/* Left blue unread dot element */}
                  {hasUnreadDot && (
                    <span className="absolute left-2 w-2 h-2 rounded-full bg-[#4FACFE]"></span>
                  )}

                  <div className="flex items-start space-x-3 pl-1 overflow-hidden">
                    {/* User Avatar icon */}
                    {m.type === 'sys' ? (
                      <div className="w-[42px] h-[42px] rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600 shrink-0">
                        <Volume2 size={18} />
                      </div>
                    ) : (
                      <div className="w-[42px] h-[42px] rounded-full bg-slate-100 border border-slate-205 flex items-center justify-center shrink-0 text-slate-400 font-bold text-sm">
                        {m.author[0]}
                      </div>
                    )}

                    <div className="text-left overflow-hidden">
                      <p className="text-[13px] text-slate-900 font-bold">
                        <span>{m.author}</span>
                        {m.actionText && (
                          <span className="text-slate-400 font-medium text-[12.5px] ml-1">{m.actionText}</span>
                        )}
                      </p>
                      <p className="text-[12px] text-slate-600 truncate max-w-[170px] mt-0.5 leading-normal">
                        {m.target}
                      </p>
                      <span className="text-[9.5px] text-slate-400 mt-1 block font-mono font-medium leading-none">
                        {m.time}
                      </span>
                    </div>
                  </div>

                  {/* Right segment action/thumbnail */}
                  <div className="shrink-0 flex items-center">
                    {m.hasThumbnail && m.thumbnailSvg && (
                      <div className="w-[42px] h-[42px] bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        {m.thumbnailSvg}
                      </div>
                    )}

                    {m.type === 'follow' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const active = followBacks['white'];
                          setFollowBacks(prev => ({ ...prev, 'white': !active }));
                          miniToast(!active ? '已成互粉状态！' : '已取消关注');
                        }}
                        className={`text-[10px] font-extrabold px-3 py-1 rounded-full border transition-all ${
                          followBacks['white']
                            ? 'bg-slate-100 border-slate-200 text-slate-450'
                            : 'border-cyan-500 text-cyan-600 hover:bg-cyan-50 active:scale-95'
                        }`}
                      >
                        {followBacks['white'] ? '已互粉' : '回关'}
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom mark as read action bar */}
      {!showEmpty && Object.keys(unreads).length > 0 && (
        <div className="px-4 py-2 border-t border-slate-50 text-center bg-white shrink-0">
          <button 
            onClick={handleMarkAllRead}
            className="text-[12px] text-cyan-600 hover:text-cyan-700 font-black hover:underline"
          >
            ✓ 一键标记所有消息为已读
          </button>
        </div>
      )}
      
    </div>
  );
}
