/**
 * TraceCraft 国际化模块
 *
 * 功能：
 *   1. 提供中英文翻译文案（zh-CN / en-US）
 *   2. 从后端 /v1/maps/config 接口获取语言配置
 *   3. 使用 React Context 提供 useI18n() 钩子
 *   4. 语言偏好持久化到 localStorage
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'cn' | 'en';

export type TextMap = Record<string, string>;

export interface LocaleConfig {
  supportedLanguages: Language[];
  fallbackLanguage: Language;
  labels: Record<Language, string>;
}

// localStorage 语言偏好存储键
const STORAGE_KEY = 'tracecraft_language';
// 后端语言配置接口地址
const CONFIG_ENDPOINTS = ['/v1/maps/config'];
const DEFAULT_LANGUAGE_OPTIONS: Language[] = ['cn', 'en'];
const DEFAULT_LANGUAGE_LABELS: Record<Language, string> = {
  cn: '中文',
  en: 'English',
};
const DEFAULT_LOCALE_CONFIG: LocaleConfig = {
  supportedLanguages: DEFAULT_LANGUAGE_OPTIONS,
  fallbackLanguage: 'cn',
  labels: DEFAULT_LANGUAGE_LABELS,
};

/** 将后端 locale 代码（如 zh-CN）映射为前端 Language 类型（cn/en） */
function mapBackendLocaleToLanguage(locale: unknown): Language | null {
  if (typeof locale !== 'string') return null;
  const lower = locale.toLowerCase();
  if (lower.startsWith('zh')) return 'cn';
  if (lower.startsWith('en')) return 'en';
  return null;
}

/** 语言列表去重 */
function dedupeLanguages(values: Language[]): Language[] {
  return values.filter((value, index, arr) => arr.indexOf(value) === index);
}

/**
 * 清洗后端返回的语言配置
 * 提取支持语言列表、回退语言、语言标签
 * 异常数据时回退到默认配置
 */
function sanitizeLocaleConfig(raw: unknown): LocaleConfig {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_LOCALE_CONFIG;
  }

  const payload = raw as Record<string, unknown>;
  const locales = Array.isArray(payload.locales) ? payload.locales : [];
  const supported = dedupeLanguages(
    locales
      .map((item) => mapBackendLocaleToLanguage(item))
      .filter((item): item is Language => item !== null),
  );

  const labelsFromPayload = Array.isArray(payload.localeLabels)
    ? payload.localeLabels
    : Array.isArray(payload.labels)
      ? payload.labels
      : [];
  const labelsFromServer = labelsFromPayload.reduce((acc, entry) => {
    if (!entry || typeof entry !== 'object') {
      return acc;
    }
    const { code, label } = entry as { code: string; label?: string };
    const mapped = mapBackendLocaleToLanguage(code);
    if (!mapped || typeof label !== 'string' || !label.trim()) {
      return acc;
    }
    acc[mapped] = label;
    return acc;
  }, {} as Partial<Record<Language, string>>);

  const supportedLanguages = supported.length > 0 ? supported : DEFAULT_LANGUAGE_OPTIONS;
  const fallbackCandidate = mapBackendLocaleToLanguage(payload.localeFallback);
  const fallbackLanguage =
    fallbackCandidate && supportedLanguages.includes(fallbackCandidate)
      ? fallbackCandidate
      : supportedLanguages.includes('cn')
        ? 'cn'
        : supportedLanguages[0];

  return {
    supportedLanguages,
    fallbackLanguage,
    labels: { ...DEFAULT_LANGUAGE_LABELS, ...(labelsFromServer as Record<Language, string>) },
  };
}

/** 从后端接口获取语言配置，失败时使用本地默认值 */
export const resolveLocaleConfig = async (): Promise<LocaleConfig> => {
  for (const endpoint of CONFIG_ENDPOINTS) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        continue;
      }
      const payload = await response.json();
      return sanitizeLocaleConfig(payload);
    } catch {
      continue;
    }
  }
  return DEFAULT_LOCALE_CONFIG;
};

/** 从 localStorage 读取已保存的语言偏好 */
function getPersistedLanguage(): Language | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === 'en' ? 'en' : raw === 'cn' ? 'cn' : null;
  } catch {
    return null;
  }
}

// ===== 中文翻译文案 =====
const zhCN: TextMap = {
  'app.title': 'TraceCraft',
  'app.subtitle': '释放城市中的运动体验',
  'app.enter': '立即进入',
  'home.title': '追踪App',
  'home.settings_title': '设置',
  'home.profile': '个人中心',
  'home.upload_card_title': '上传图片',
  'home.upload_card_desc': '轻松生成你的路线地图',
  'home.select_shape_title': '选择形状',
  'home.select_shape_desc': '选择模板，快速创建你的跑步路线',
  'home.quick_templates': '热门模板',
  'home.quick_templates_action': '查看全部',
  'home.recent_records': '最近记录',
  'home.nav.home': '首页',
  'home.nav.traces': '我的轨迹',
  'home.nav.profile': '个人中心',
  'quick.title': '快速模板',
  'quick.back': '返回',
  'quick.upload_more': '上传自定义图片',
  'quick.recent': '最近使用',
  'library.title': '全局模板选择',
  'library.tab.recommend': '推荐',
  'library.tab.base': '基础模板',
  'library.tab.animal': '动物',
  'library.tab.text': '文字',
  'library.tab.holiday': '节日',
  'library.search_hint': '搜索',
  'library.card.distance_unit': 'km',
  'library.more': '更多',
  'library.more_cards': '滑动查看更多',
  'library.footer_hint': '向下滑动可浏览更多热门模板',

  'shape.circle': '圆形',
  'shape.triangle': '三角形',
  'shape.star': '五角星',
  'shape.heart': '爱心',
  'shape.square': '方形',
  'shape.cat': '猫咪',
  'shape.more_distance': '更多',

  'map.title': '地图导航',
  'map.distance_label': '剩余距离',
  'map.deviation_label': '偏离',
  'map.deviation_value': '偏离',
  'map.notice': '保持',
  'map.pace_label': '配速',
  'map.avg_speed_label': '当前速度',
  'map.time_label': '配速',
  'map.elapsed_label': '时长',
  'map.stop': '结束',
  'map.voice_on': '语音',
  'map.voice_off': '静音',

  'adjust.title': '形状参数',
  'adjust.scale_label': '尺寸',
  'adjust.rotate_label': '旋转',
  'adjust.stretch_label': '拉伸',
  'adjust.reset': '重置',
  'adjust.length': '长度',
  'adjust.length_unit': 'km',
  'adjust.goal_label': '目标长度',
  'adjust.apply': '应用并继续',

  'profile.title': '个人中心',
  'profile.stats_distance': '完成距离',
  'profile.stats_time': '累计时间',
  'profile.stats_traces': '完成轨迹',
  'profile.section_content': '我的内容',
  'profile.section_other': '其他',
  'profile.item.traces': '我的轨迹列表',
  'profile.item.history': '历史记录',
  'profile.item.favorites': '收藏模板',
  'profile.item.settings': '设置',
  'profile.item.about': '关于我们',
  'profile.item.feedback': '反馈与帮助',
  'profile.btn_logout': '退出登录',
  'profile.bottom_home': '首页',
  'profile.bottom_traces': '我的轨迹',

  'settings.title': '设置',
  'settings.back': '返回',
  'settings.section_common': '通用设置',
  'settings.section_map': '地图偏好',
  'settings.section_app': '应用信息',
  'settings.lang': '语言',
  'settings.distance_unit': '距离单位',
  'settings.voice': '语音播报',
  'settings.vibrate': '偏移震动',
  'settings.map_style': '地图样式',
  'settings.line_thickness': '轨迹线粗细',
  'settings.current_version': '当前版本',
  'settings.version_check': '版本检查',
  'settings.service_protocol': '服务条款',
  'settings.privacy': '隐私政策',
  'settings.clear_cache': '清空缓存',
  'settings.cache_value': '缓存',
  'settings.lang_cn': '中文',
  'settings.lang_en': 'English',
  'settings.light': '浅色',
  'settings.dark': '卫星',
  'settings.thin': '细',
  'settings.normal': '中',
  'settings.thick': '粗',
  'settings.return': '返回',
  'settings.select': '已选择',
  'settings.cancel': '取消',
  'settings.on': '开启',
  'settings.off': '关闭',

  'splash.loading_to_login': '正在自动识别并跳转登录...',
  'splash.tap_to_enter': '跳过并进入应用',
};

// ===== 英文翻译文案 =====
const enUS: TextMap = {
  'app.title': 'TraceCraft',
  'app.subtitle': 'Generate your running route from city images',
  'app.enter': 'Enter App',
  'home.title': 'TraceCraft',
  'home.settings_title': 'Settings',
  'home.profile': 'Profile',
  'home.upload_card_title': 'Upload Photo',
  'home.upload_card_desc': 'Upload a picture and generate a route quickly',
  'home.select_shape_title': 'Select Shape',
  'home.select_shape_desc': 'Use a template or custom sketch',
  'home.quick_templates': 'Quick Templates',
  'home.quick_templates_action': 'View All',
  'home.recent_records': 'Recent Records',
  'home.nav.home': 'Home',
  'home.nav.traces': 'My Traces',
  'home.nav.profile': 'Profile',
  'quick.title': 'Quick Templates',
  'quick.back': 'Back',
  'quick.upload_more': 'Upload Custom Image',
  'quick.recent': 'Recent',
  'library.title': 'Template Library',
  'library.tab.recommend': 'Recommend',
  'library.tab.base': 'Basic',
  'library.tab.animal': 'Animal',
  'library.tab.text': 'Text',
  'library.tab.holiday': 'Holiday',
  'library.search_hint': 'Search',
  'library.card.distance_unit': 'km',
  'library.more': 'More',
  'library.more_cards': 'Swipe to view more',
  'library.footer_hint': 'Keep scrolling to explore more templates',

  'shape.circle': 'Circle',
  'shape.triangle': 'Triangle',
  'shape.star': 'Star',
  'shape.heart': 'Heart',
  'shape.square': 'Square',
  'shape.cat': 'Cat',
  'shape.more_distance': 'More',

  'map.title': 'Navigation',
  'map.distance_label': 'Remaining',
  'map.deviation_label': 'Deviation',
  'map.deviation_value': 'Deviation',
  'map.notice': 'Ahead 150m turn right',
  'map.pace_label': 'Pace',
  'map.avg_speed_label': 'Current Pace',
  'map.time_label': 'Pace',
  'map.elapsed_label': 'Duration',
  'map.stop': 'Stop',
  'map.voice_on': 'Voice',
  'map.voice_off': 'Mute',

  'adjust.title': 'Shape Adjustment',
  'adjust.scale_label': 'Scale',
  'adjust.rotate_label': 'Rotate',
  'adjust.stretch_label': 'Stretch',
  'adjust.reset': 'Reset',
  'adjust.length': 'Length',
  'adjust.length_unit': 'km',
  'adjust.goal_label': 'Target Distance',
  'adjust.apply': 'Apply',

  'profile.title': 'Profile',
  'profile.stats_distance': 'Distance',
  'profile.stats_time': 'Duration',
  'profile.stats_traces': 'Completed',
  'profile.section_content': 'My Content',
  'profile.section_other': 'Others',
  'profile.item.traces': 'My Traces',
  'profile.item.history': 'History',
  'profile.item.favorites': 'Favorites',
  'profile.item.settings': 'Settings',
  'profile.item.about': 'About',
  'profile.item.feedback': 'Feedback',
  'profile.btn_logout': 'Logout',
  'profile.bottom_home': 'Home',
  'profile.bottom_traces': 'My Traces',

  'settings.title': 'Settings',
  'settings.back': 'Back',
  'settings.section_common': 'General',
  'settings.section_map': 'Map',
  'settings.section_app': 'App Info',
  'settings.lang': 'Language',
  'settings.distance_unit': 'Distance Unit',
  'settings.voice': 'Voice Guide',
  'settings.vibrate': 'Deviation Vibration',
  'settings.map_style': 'Map Style',
  'settings.line_thickness': 'Line Width',
  'settings.current_version': 'Current Version',
  'settings.version_check': 'Version Check',
  'settings.service_protocol': 'Service Terms',
  'settings.privacy': 'Privacy Policy',
  'settings.clear_cache': 'Clear Cache',
  'settings.cache_value': 'Cache',
  'settings.lang_cn': '中文',
  'settings.lang_en': 'English',
  'settings.light': 'Light',
  'settings.dark': 'Satellite',
  'settings.thin': 'Thin',
  'settings.normal': 'Normal',
  'settings.thick': 'Thick',
  'settings.return': 'Back',
  'settings.select': 'Selected',
  'settings.cancel': 'Cancel',
  'settings.on': 'On',
  'settings.off': 'Off',

  'splash.loading_to_login': 'Auto loading, moving to login...',
  'splash.tap_to_enter': 'Skip to Home',
};

// 翻译字典：按语言索引
const translations: Record<Language, TextMap> = {
  cn: zhCN,
  en: enUS,
};

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  languageOptions: Language[];
  languageLabels: Record<Language, string>;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'cn',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
  languageOptions: DEFAULT_LANGUAGE_OPTIONS,
  languageLabels: DEFAULT_LANGUAGE_LABELS,
});

/**
 * I18n Provider 组件
 *
 * 1. 初始化时从后端获取语言配置
 * 2. 恢复 localStorage 中保存的语言偏好
 * 3. 提供 t() 翻译函数和 setLanguage() 切换函数
 * 4. 同步更新 document.documentElement.lang 属性
 */
export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [languageOptions, setLanguageOptions] = useState<LocaleConfig['supportedLanguages']>(DEFAULT_LANGUAGE_OPTIONS);
  const [languageLabels, setLanguageLabels] = useState<LocaleConfig['labels']>(DEFAULT_LANGUAGE_LABELS);
  const [language, setLanguage] = useState<Language>(() => {
    return getPersistedLanguage() || 'cn';
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const config = await resolveLocaleConfig();
        if (!active) return;

        setLanguageOptions(config.supportedLanguages);
        setLanguageLabels(config.labels);

        const saved = getPersistedLanguage();
        const next = saved && config.supportedLanguages.includes(saved)
          ? saved
          : config.fallbackLanguage;
        setLanguage(next);
      } catch {
        setLanguageOptions(DEFAULT_LANGUAGE_OPTIONS);
        setLanguageLabels(DEFAULT_LANGUAGE_LABELS);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  /** 翻译函数：根据 key 查找当前语言的文案，未找到时使用 fallback 或 key 本身 */
  const t = useCallback(
    (key: string, fallback?: string) => {
      return translations[language][key] || fallback || key;
    },
    [language],
  );

  /** 切换语言并持久化到 localStorage，同时更新 HTML lang 属性 */
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore storage errors and keep runtime state only
    }
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  };

  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage: handleSetLanguage, t, languageOptions, languageLabels }),
    [language, handleSetLanguage, t, languageOptions, languageLabels],
  );

  return React.createElement(I18nContext.Provider, { value }, children);
};

export const useI18n = () => useContext(I18nContext);
