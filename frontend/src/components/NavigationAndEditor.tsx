/**
 * NavigationAndEditor - re-export barrel
 *
 * 此文件已拆分至 screens/ 目录下的独立文件：
 * - MapNavigationScreen   → screens/MapNavigationScreen.tsx
 * - ParamAdjustScreen     → screens/ParamAdjustScreen.tsx
 * - RoutePreviewScreen    → screens/RoutePreviewScreen.tsx
 * - TraceEditorScreen     → screens/TraceEditorScreen.tsx
 *
 * 保留此 barrel 文件以兼容可能的外部引用。
 *
 * @deprecated 请直接导入 screens/ 目录下的独立文件
 */
export { MapNavigationScreen } from './screens/MapNavigationScreen';
export { ParamAdjustScreen } from './screens/ParamAdjustScreen';
export { RoutePreviewScreen } from './screens/RoutePreviewScreen';
export { TraceEditorScreen } from './screens/TraceEditorScreen';
