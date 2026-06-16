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

import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

// 翻译字典：按语言索引
const translations: Record<Language, TextMap> = {
  cn: zhCN,
  en: enUS,
};

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  /** 内联双语辅助函数：根据当前语言返回中文或英文文案 */
  text: (cn: string, en: string) => string;
  languageOptions: Language[];
  languageLabels: Record<Language, string>;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'cn',
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
  text: (cn) => cn,
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

  /** 内联双语辅助函数：根据当前语言返回中文或英文文案 */
  const text = useCallback(
    (cn: string, en: string) => (language === 'en' ? en : cn),
    [language],
  );

  /** 切换语言并持久化到 localStorage，同时更新 HTML lang 属性 */
  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore storage errors and keep runtime state only
    }
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage: handleSetLanguage, t, text, languageOptions, languageLabels }),
    [language, handleSetLanguage, t, text, languageOptions, languageLabels],
  );

  return React.createElement(I18nContext.Provider, { value }, children);
};

export const useI18n = () => useContext(I18nContext);
