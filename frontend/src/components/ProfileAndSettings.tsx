/**
 * ProfileAndSettings - re-export barrel
 *
 * 此文件已拆分至 screens/ 目录下的独立文件：
 * - ProfileScreen  → screens/ProfileScreen.tsx
 * - SettingsScreen → screens/SettingsScreen.tsx
 *
 * 共享工具函数 → screens/profile-settings-utils.tsx
 *
 * 保留此 barrel 文件以兼容可能的外部引用。
 *
 * @deprecated 请直接导入 screens/ 目录下的独立文件
 */
export { ProfileScreen } from './screens/ProfileScreen';
export { SettingsScreen } from './screens/SettingsScreen';
