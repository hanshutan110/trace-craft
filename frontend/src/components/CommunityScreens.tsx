/**
 * CommunityScreens - re-export barrel
 *
 * 此文件已拆分至 screens/ 目录下的独立文件：
 * - TraceShareScreen    → screens/TraceShareScreen.tsx
 * - SquareScreen        → screens/SquareScreen.tsx
 * - PostDetailScreen    → screens/PostDetailScreen.tsx
 * - NotificationsScreen → screens/NotificationsScreen.tsx
 *
 * 共享工具函数 → screens/community-utils.tsx
 *
 * 保留此 barrel 文件以兼容可能的外部引用。
 *
 * @deprecated 请直接导入 screens/ 目录下的独立文件
 */
export { TraceShareScreen } from './screens/TraceShareScreen';
export { SquareScreen } from './screens/SquareScreen';
export { PostDetailScreen } from './screens/PostDetailScreen';
export { NotificationsScreen } from './screens/NotificationsScreen';
