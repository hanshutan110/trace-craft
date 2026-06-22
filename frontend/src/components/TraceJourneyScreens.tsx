/**
 * TraceJourneyScreens - re-export barrel
 *
 * 此文件已拆分至 screens/ 目录下的独立文件：
 * - SplashScreen     → screens/SplashScreen.tsx
 * - MyTracesScreen   → screens/MyTracesScreen.tsx
 * - TraceDetailScreen → screens/TraceDetailScreen.tsx
 * - RunHistoryScreen  → screens/RunHistoryScreen.tsx
 * - RunDetailScreen   → screens/RunDetailScreen.tsx
 *
 * 共享工具函数 → screens/trace-journey-utils.tsx
 *
 * 保留此 barrel 文件以兼容可能的外部引用。
 *
 * @deprecated 请直接导入 screens/ 目录下的独立文件
 */
export { SplashScreen } from './screens/SplashScreen';
export { MyTracesScreen } from './screens/MyTracesScreen';
export { TraceDetailScreen } from './screens/TraceDetailScreen';
export { RunHistoryScreen } from './screens/RunHistoryScreen';
export { RunDetailScreen } from './screens/RunDetailScreen';
