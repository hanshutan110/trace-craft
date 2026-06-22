/**
 * DiscoveryScreens - re-export barrel
 *
 * 此文件已拆分至 screens/ 目录下的独立文件：
 * - FavoritesScreen      → screens/FavoritesScreen.tsx
 * - TemplateDetailScreen → screens/TemplateDetailScreen.tsx
 * - SearchScreen         → screens/SearchScreen.tsx
 * - SearchResultScreen   → screens/SearchResultScreen.tsx
 *
 * 共享工具函数 → screens/discovery-utils.tsx
 *
 * 保留此 barrel 文件以兼容可能的外部引用。
 *
 * @deprecated 请直接导入 screens/ 目录下的独立文件
 */
export { FavoritesScreen } from './screens/FavoritesScreen';
export { TemplateDetailScreen } from './screens/TemplateDetailScreen';
export { SearchScreen } from './screens/SearchScreen';
export { SearchResultScreen } from './screens/SearchResultScreen';
