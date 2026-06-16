/**
 * TraceCraft 前端类型定义
 *
 * 共享类型（GeoPoint、Route、Session 等）从 shared/types.ts 统一导入，
 * 此文件仅定义前端独有的类型（屏幕 ID、UI 组件数据结构等）。
 */

// ===== 从 shared 重新导出前后端共享类型 =====
export type {
  GeoPoint,
  RouteRiskLevel,
  RouteRiskSegment,
  RouteStartPointStatus,
  Route,
  RouteBounds,
  RouteMeta,
  SessionStatus,
  SessionState,
  FinishResult,
  MapProvider,
  CrsType,
  ApiResponse,
} from '../../shared/types';

// ===== 前端独有类型 =====

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
  | 'route_preview' // 9.1 路线预览与风险确认
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

/** 预设图形类型 */
export type ShapeType = 'circle' | 'triangle' | 'square' | 'star' | 'heart' | 'hexagon' | 'plus' | 'cat';

/** 预设图形模板（如五角星、心形等） */
export interface PresetShape {
  id: string;
  name: string;
  englishName: string;
  gradient: string;
  description: string;
  distance: number;
  iconType: ShapeType;
  isHot?: boolean;
}

/** 跑步历史记录 */
export interface HistoryRecord {
  id: string;
  name: string;
  distance: string;
  time: string;
  date: string;
  shapeType: ShapeType;
}

/** 前端使用的路线类型（Route 的别名，保持向后兼容） */
export type GeneratedRoute = import('../../shared/types').Route;
