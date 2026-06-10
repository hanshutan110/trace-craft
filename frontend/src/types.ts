/**
 * TraceCraft 前端类型定义
 *
 * ScreenId —— 应用内所有屏幕的唯一标识符
 * PresetShape —— 预设图形模板数据结构
 * HistoryRecord —— 跑步历史记录数据结构
 */

/** 应用屏幕 ID 枚举，对应各个功能页面 */
export type ScreenId =
  | 'home'          // 1. 主界面
  | 'nav'           // 2. 导航界面
  | 'success'       // 3. 成功分享页
  | 'editor'        // 4. 描边编辑页
  | 'onboarding'    // 5. 首次引导页
  | 'bottomsheet'   // 6. 图形选择弹窗
  | 'param_adjust'  // 7. 参数调节页
  | 'quick_cards'   // 8. 快速模板页
  | 'loading'       // 9. 图片生成加载中
  | 'library'       // 10. 预设图形选择页
  | 'login'         // 11. 注册登录页
  | 'profile'       // 12. 个人中心页
  | 'settings'      // 13. 设置页
  | 'splash'        // 14. 启动页 (Splash)
  | 'my_traces'     // 15. 我的轨迹列表页
  | 'trace_detail'  // 16. 轨迹详情页
  | 'run_history'   // 17. 历史跑步记录页
  | 'run_detail'    // 18. 单次跑步详情页
  | 'favorites'     // 19. 收藏模板页
  | 'template_detail' // 20. 模板详情页
  | 'search'        // 21. 搜索页
  | 'search_result' // 22. 搜索结果页
  | 'trace_share'   // 23. 轨迹分享预览页
  | 'square'        // 24. 公开广场/社区页
  | 'post_detail'   // 25. 作品详情页（社区）
  | 'notifications'; // 26. 消息通知页

/** 预设图形模板（如五角星、心形等） */
export interface PresetShape {
  id: string;
  name: string;
  englishName: string;
  gradient: string;
  description: string;
  distance: number;
  iconType: 'circle' | 'triangle' | 'square' | 'star' | 'heart' | 'hexagon' | 'plus';
  isHot?: boolean;
}

/** 跑步历史记录 */
export interface HistoryRecord {
  id: string;
  name: string;
  distance: string;
  time: string;
  date: string;
  shapeType: string;
}
