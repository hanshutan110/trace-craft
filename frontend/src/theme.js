export const THEME_KEYS = {
  light: 'light',
  deepDark: 'deepDark',
  onboard: 'onboard',
};

export const THEME_LABELS = {
  [THEME_KEYS.light]: '轻色系统',
  [THEME_KEYS.deepDark]: '深色系统',
  [THEME_KEYS.onboard]: '引导高亮',
};

export const THEME_PAGE_GROUPS = {
  [THEME_KEYS.light]: [
    '实时导航界面',
    '快速模板页',
    '目标完成页',
    '选择图形页面',
    '图形模板选择页',
    '首页',
  ],
  [THEME_KEYS.deepDark]: [
    '参数调节页面',
    '轨迹编辑页',
    '轨迹行程加载页',
  ],
  [THEME_KEYS.onboard]: [
    '引导页面',
  ],
};

export const TRACECRAFT_THEMES = {
  [THEME_KEYS.light]: {
    name: 'Light',
    bg: '#F5F7FA',
    surface: '#FFFFFF',
    text: '#111827',
    textSub: '#6B7280',
    textOnPrimary: '#1B2B4A',
    primary: '#4171BB',
    primaryHover: '#3560A8',
    border: '#DCE2EE',
    shadow: 'rgba(17,24,39,0.08)',
    inputBg: '#FFFFFF',
    inputBorder: '#CBD5E1',
    buttonText: '#0F172A',
    status: '#111827',
  },
  [THEME_KEYS.deepDark]: {
    name: 'DeepDark',
    bg: '#0D121A',
    surface: '#141B25',
    text: '#EAF1FF',
    textSub: '#A7B7CE',
    textOnPrimary: '#0D121A',
    primary: '#4D6DFF',
    primaryHover: '#3D5EDB',
    border: '#273343',
    shadow: 'rgba(0,0,0,0.45)',
    inputBg: '#0F1726',
    inputBorder: '#273343',
    buttonText: '#EAF1FF',
    status: '#EAF1FF',
  },
  [THEME_KEYS.onboard]: {
    name: 'Onboard',
    bg: '#EDF3FF',
    surface: '#FFFFFF',
    text: '#1B2B4A',
    textSub: '#3D4A66',
    textOnPrimary: '#1B2B4A',
    primary: '#4171BB',
    primaryHover: '#3560A8',
    border: '#C9D7F1',
    shadow: 'rgba(17,24,39,0.12)',
    inputBg: '#FFFFFF',
    inputBorder: '#C9D7F1',
    buttonText: '#EAF1FF',
    status: '#1B2B4A',
  },
};

export const getTheme = (key) => TRACECRAFT_THEMES[key] || TRACECRAFT_THEMES[THEME_KEYS.light];

