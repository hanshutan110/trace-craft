/**
 * AuthScreens - re-export barrel
 *
 * 此文件已拆分至 screens/ 目录下的独立文件：
 * - OnboardingScreen → screens/OnboardingScreen.tsx
 * - LoginScreen      → screens/LoginScreen.tsx
 *
 * 保留此 barrel 文件以兼容可能的外部引用。
 *
 * @deprecated 请直接导入 screens/ 目录下的独立文件
 */
export { OnboardingScreen } from './screens/OnboardingScreen';
export { LoginScreen } from './screens/LoginScreen';
