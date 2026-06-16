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
  'home.title': '轨迹工坊',
  'home.settings_title': '设置',
  'home.profile': '个人中心',
  'home.upload_card_title': '上传图片',
  'home.upload_card_desc': '轻松生成你的路线地图',
  'home.select_shape_title': '选择形状',
  'home.select_shape_desc': '选择模板，快速创建你的跑步路线',
  'home.quick_templates': '热门模板',
  'home.quick_templates_action': '查看全部',
  'home.recent_records': '最近记录',
  'home.upload_card_hint': '支持 JPG / PNG',
  'home.select_shape_hint': '三角形 / 圆形 / 星形',
  'home.circle_distance': '3.5km',
  'home.triangle_distance': '3.0km',
  'home.star_distance': '5km',
  'home.heart_distance': '4.2km',
  'home.square_distance': '4.0km',
  'home.more': '更多',
  'home.recent_title': '最近使用',
  'home.recent_cat_name': '小猫跑',
  'home.recent_cat_desc': '上次消耗 350千卡 | 2026-06-08',
  'home.recent_star_name': '星形极限速跑',
  'home.recent_star_desc': '耗时 22:40 | 2026-05-30',
  'home.recent_heart_name': '爱心跑表白',
  'home.recent_heart_desc': '耗时 28:10 | 2026-05-24',
  'home.nav.home': '首页',
  'home.nav.traces': '我的轨迹',
  'home.nav.profile': '个人中心',
  'onboarding.title': '轨迹工坊 App',
  'onboarding.subtitle': '用汗水在地图上作画',
  'onboarding.step1_title': '1. 上传图片',
  'onboarding.step1_desc': '任意图片转换',
  'onboarding.step2_title': '2. 生成轨迹',
  'onboarding.step2_desc1': 'AI 智能提取运动路径，',
  'onboarding.step2_desc2': '或点击手动描边绘制。',
  'onboarding.step3_title': '3. 跟着跑！',
  'onboarding.step3_desc': '语音偏差实时指流',
  'onboarding.cta': '开始体验',
  'onboarding.has_account': '已有账号？',
  'onboarding.login': '登录',
  'auth.wechat_login': '微信一键登录',
  'auth.douyin_login': '抖音一键登录',
  'auth.or': '或',
  'auth.phone_login': '手机号登录',
  'auth.login_agree_prefix': '登录即表示同意',
  'auth.user_agreement': '《用户协议》',
  'auth.and': '和',
  'auth.privacy_policy': '《隐私政策》',
  'auth.logging_in': '正在登录您的轨迹工坊...',
  'auth.phone_login_title': '手机号快捷登录',
  'auth.phone_label': '中国大陆手机号 (+86)',
  'auth.phone_placeholder': '请输入11位手机号码',
  'auth.sms_label': '短信验证码',
  'auth.sms_placeholder': '验证码',
  'auth.sending': '发送中',
  'auth.reget_code': '重新获取',
  'auth.get_code': '获取验证码',
  'auth.submit_phone_login': '授权并绑定登录（测试直通）',
  'auth.privacy_title': '轨迹工坊隐私政策说明',
  'auth.agreement_title': '轨迹工坊用户服务协议',
  'auth.updated_at': '更新日期：2026年6月9日',
  'auth.doc_p1': '欢迎阁下使用"轨迹工坊"运动绘图寻航应用软件！',
  'auth.doc_p2': '为了保障您的合法合法权益，请务必仔细阅读本文件。我们深度关注您的个人信息和隐私数据保护：',
  'auth.doc_p3': '1. 我们仅在您使用"手动描边(4)"或"图片寻回(9)"以及位置跟踪时访问您的地理坐标，且采用最严格的脱敏算法保密，坚决不上送任何社交无关机密。',
  'auth.doc_p4': '2. 账号绑定基于微信/抖音官方静默授权流程，提供一键免密码注册，不采集不索要明文账户密码。',
  'auth.doc_p5': '3. 您有随时清除本地生成图片缓存(13)以及彻底注销本人账号权利。',
  'auth.brand_subtitle': '跑出你的专属形状',
  'auth.doc_agree': '已阅并同意',
  'quick.title': '快速模板',
  'quick.back': '返回',
  'quick.upload_more': '上传自定义图片',
  'quick.recent': '最近使用',
  'quick.frequent_title': '最近经常完成',
  'quick.card.heart': '爱心路线',
  'quick.card.star': '星形挑战',
  'quick.card.circle': '环湖路线',
  'quick.card.triangle': '三角冲刺',
  'quick.card.square': '方形地图',
  'quick.card.heart_dist': '约4.2km',
  'quick.card.star_dist': '约5km',
  'quick.card.circle_dist': '约3.5km',
  'quick.card.triangle_dist': '约3km',
  'quick.card.square_dist': '约4km',
  'quick.recent.heart': '心形',
  'quick.recent.star': '五角星',
  'quick.recent.lake': '环湖',
  'quick.recent.3runs': '3次跑步',
  'quick.recent.2runs': '2次跑步',
  'quick.recent.4runs': '4次跑步',
  'library.title': '全局模板选择',
  'library.tab.recommend': '推荐',
  'library.tab.base': '基础图形',
  'library.tab.animal': '动物',
  'library.tab.text': '文字',
  'library.tab.holiday': '节日',
  'library.search_hint': '搜索',
  'library.select_title': '选择图形模板',
  'library.item.circle': '圆形',
  'library.item.triangle': '三角形',
  'library.item.star': '五角星',
  'library.item.square': '正方形',
  'library.item.heart': '心形',
  'library.item.hexagon': '六边形',
  'library.item.cat': '小猫路线',
  'library.item.panda': '熊猫脚印',
  'library.item.love': 'LOVE字母',
  'library.item.run': 'RUN',
  'library.item.tree': '圣诞树',
  'library.item.moon': '中秋圆月',
  'library.item.circle_km': '约3.5km',
  'library.item.triangle_km': '约3.0km',
  'library.item.star_km': '约5km',
  'library.item.square_km': '约4公里',
  'library.item.heart_km': '约4.2km',
  'library.item.hexagon_km': '约4.8km',
  'library.item.cat_km': '5.1km',
  'library.item.panda_km': '6.5km',
  'library.item.love_km': '8.2km',
  'library.item.run_km': '4.5km',
  'library.item.tree_km': '6.4km',
  'library.item.moon_km': '3.8km',
  'library.footer_swipe': '滑动查看更多，支持通过AI在自定义画布中描绘。',
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
  'profile.badge': '中级达人',
  'profile.signature': '个性签名: 用汗水在水泥地上书写画作',
  'profile.signature_edit_toast': '个性签名修改',
  'profile.edit': '修改',
  'profile.section_content': '我的内容',
  'profile.section_other': '其他',
  'profile.item.traces': '我的轨迹列表',
  'profile.item.history': '历史记录',
  'profile.item.favorites': '收藏模板',
  'profile.item.settings': '设置',
  'profile.item.about': '关于我们',
  'profile.item.feedback': '反馈与帮助',
  'profile.btn_logout': '退出登录',
  'profile.qr_title': '轨迹工坊跑者名片',
  'profile.qr_desc': '扫码一键添加跑友 / 跟踪他的轨迹作品',
  'profile.nickname': '跑者小明',
  'profile.qr_subtitle': '累计跑量 328km | 中级达人',
  'profile.save_qr': '保存至系统相册',
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
  'settings.km': '公里',
  'settings.mile': '英里',
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
  'settings.bound_wechat': '已绑定微信',
  'settings.voice_on': '语音已开启',
  'settings.voice_off': '语音已关闭',
  'settings.vibrate_on': '震动已开启',
  'settings.vibrate_off': '震动已关闭',
  'settings.latest': '已是最新版本',
  'settings.switch_language_title': '切换显示语言 (Switch Language)',
  'settings.switch_cn_toast': '已切换显示为: 简体中文',
  'settings.switch_en_toast': 'Switched language to English',
  'settings.map_sheet_title': '切换底层地图网样式',
  'settings.map_light_option': '浅色模式地图 (矢量网格)',
  'settings.map_satellite_option': '遥感卫星高清图 (街道重叠)',
  'settings.thickness_sheet_title': '修改地图发光轨迹线粗细',
  'settings.thickness_thin_option': '精致极细 (1.5px)',
  'settings.thickness_mid_option': '中等粗细 (3.5px)',
  'settings.thickness_thick_option': '醒目超粗 (6.0px)',

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
  'home.upload_card_hint': 'JPG / PNG supported',
  'home.select_shape_hint': 'Triangle / Circle / Star',
  'home.circle_distance': '3.5km',
  'home.triangle_distance': '3.0km',
  'home.star_distance': '5km',
  'home.heart_distance': '4.2km',
  'home.square_distance': '4.0km',
  'home.more': 'More',
  'home.recent_title': 'Recently Used',
  'home.recent_cat_name': 'Cat Run',
  'home.recent_cat_desc': 'Last burn 350 kcal | 2026-06-08',
  'home.recent_star_name': 'Star Speed Run',
  'home.recent_star_desc': '22:40 | 2026-05-30',
  'home.recent_heart_name': 'Heart Run',
  'home.recent_heart_desc': '28:10 | 2026-05-24',
  'home.nav.home': 'Home',
  'home.nav.traces': 'My Traces',
  'home.nav.profile': 'Profile',
  'onboarding.title': 'TraceCraft App',
  'onboarding.subtitle': 'Draw on the map with every run',
  'onboarding.step1_title': '1. Upload Photo',
  'onboarding.step1_desc': 'Any image can be converted',
  'onboarding.step2_title': '2. Generate Route',
  'onboarding.step2_desc1': 'AI extracts the route automatically,',
  'onboarding.step2_desc2': 'or draw it manually.',
  'onboarding.step3_title': '3. Start Running!',
  'onboarding.step3_desc': 'Voice guidance with live deviation',
  'onboarding.cta': 'Get Started',
  'onboarding.has_account': 'Already have an account?',
  'onboarding.login': 'Log In',
  'auth.wechat_login': 'WeChat Login',
  'auth.douyin_login': 'Douyin Login',
  'auth.or': 'or',
  'auth.phone_login': 'Phone Login',
  'auth.login_agree_prefix': 'By logging in you agree to',
  'auth.user_agreement': 'Terms of Service',
  'auth.and': 'and',
  'auth.privacy_policy': 'Privacy Policy',
  'auth.logging_in': 'Logging into TraceCraft...',
  'auth.phone_login_title': 'Phone Login',
  'auth.phone_label': 'Mainland China phone (+86)',
  'auth.phone_placeholder': 'Enter 11-digit mobile number',
  'auth.sms_label': 'SMS Code',
  'auth.sms_placeholder': 'Code',
  'auth.sending': 'Sending',
  'auth.reget_code': 'Resend',
  'auth.get_code': 'Get Code',
  'auth.submit_phone_login': 'Authorize and bind login (test pass-through)',
  'auth.privacy_title': 'TraceCraft Privacy Policy',
  'auth.agreement_title': 'TraceCraft Terms of Service',
  'auth.updated_at': 'Updated: 2026-06-09',
  'auth.doc_p1': 'Welcome to TraceCraft route-drawing and navigation app!',
  'auth.doc_p2': 'Please read this document carefully to protect your legal rights and privacy:',
  'auth.doc_p3': '1. We only access your location while using manual drawing, image route generation, or location tracking, and we anonymize it strictly.',
  'auth.doc_p4': '2. Account binding uses official silent authorization from WeChat/Douyin and does not collect plaintext passwords.',
  'auth.doc_p5': '3. You can clear generated image cache and permanently delete your account at any time.',
  'auth.brand_subtitle': 'Shape your own route',
  'auth.doc_agree': 'Read and accept',
  'quick.title': 'Quick Templates',
  'quick.back': 'Back',
  'quick.upload_more': 'Upload Custom Image',
  'quick.recent': 'Recent',
  'quick.frequent_title': 'Frequently Completed',
  'quick.card.heart': 'Heart Route',
  'quick.card.star': 'Star Challenge',
  'quick.card.circle': 'Lake Loop',
  'quick.card.triangle': 'Triangle Sprint',
  'quick.card.square': 'Square Map',
  'quick.card.heart_dist': '~4.2 km',
  'quick.card.star_dist': '~5 km',
  'quick.card.circle_dist': '~3.5 km',
  'quick.card.triangle_dist': '~3 km',
  'quick.card.square_dist': '~4 km',
  'quick.recent.heart': 'Heart',
  'quick.recent.star': 'Star',
  'quick.recent.lake': 'Lake Loop',
  'quick.recent.3runs': '3 runs',
  'quick.recent.2runs': '2 runs',
  'quick.recent.4runs': '4 runs',
  'library.title': 'Template Library',
  'library.tab.recommend': 'Recommended',
  'library.tab.base': 'Basic Shapes',
  'library.tab.animal': 'Animals',
  'library.tab.text': 'Text',
  'library.tab.holiday': 'Holidays',
  'library.search_hint': 'Search',
  'library.select_title': 'Select Shape Template',
  'library.item.circle': 'Circle',
  'library.item.triangle': 'Triangle',
  'library.item.star': 'Star',
  'library.item.square': 'Square',
  'library.item.heart': 'Heart',
  'library.item.hexagon': 'Hexagon',
  'library.item.cat': 'Cat Route',
  'library.item.panda': 'Panda Tracks',
  'library.item.love': 'LOVE Letters',
  'library.item.run': 'RUN',
  'library.item.tree': 'Christmas Tree',
  'library.item.moon': 'Mid-Autumn Moon',
  'library.item.circle_km': '~3.5 km',
  'library.item.triangle_km': '~3.0 km',
  'library.item.star_km': '~5 km',
  'library.item.square_km': '~4 km',
  'library.item.heart_km': '~4.2 km',
  'library.item.hexagon_km': '~4.8 km',
  'library.item.cat_km': '5.1 km',
  'library.item.panda_km': '6.5 km',
  'library.item.love_km': '8.2 km',
  'library.item.run_km': '4.5 km',
  'library.item.tree_km': '6.4 km',
  'library.item.moon_km': '3.8 km',
  'library.footer_swipe': 'Swipe to view more and draw on a custom canvas with AI.',
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
  'profile.badge': 'Intermediate',
  'profile.signature': 'Signature: Draw with sweat on concrete',
  'profile.signature_edit_toast': 'Signature edited',
  'profile.edit': 'Edit',
  'profile.section_content': 'My Content',
  'profile.section_other': 'Other',
  'profile.item.traces': 'My Traces',
  'profile.item.history': 'History',
  'profile.item.favorites': 'Favorites',
  'profile.item.settings': 'Settings',
  'profile.item.about': 'About',
  'profile.item.feedback': 'Feedback',
  'profile.btn_logout': 'Logout',
  'profile.qr_title': 'Runner Card',
  'profile.qr_desc': 'Scan to add a runner and follow their works',
  'profile.nickname': 'Runner Xiao Ming',
  'profile.qr_subtitle': '328 km total | Intermediate',
  'profile.save_qr': 'Save to Photos',
  'profile.bottom_home': 'Home',
  'profile.bottom_traces': 'My Traces',

  'settings.title': 'Settings',
  'settings.back': 'Back',
  'settings.section_common': 'General Settings',
  'settings.section_map': 'Map Preferences',
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
  'settings.lang_cn': 'Chinese',
  'settings.lang_en': 'English',
  'settings.km': 'km',
  'settings.mile': 'mile',
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
  'settings.bound_wechat': 'WeChat linked',
  'settings.voice_on': 'Voice on',
  'settings.voice_off': 'Voice off',
  'settings.vibrate_on': 'Vibration on',
  'settings.vibrate_off': 'Vibration off',
  'settings.latest': 'Up to date',
  'settings.switch_language_title': 'Switch Language',
  'settings.switch_cn_toast': 'Language switched to Simplified Chinese',
  'settings.switch_en_toast': 'Language switched to English',
  'settings.map_sheet_title': 'Map Style',
  'settings.map_light_option': 'Light Map (vector)',
  'settings.map_satellite_option': 'Satellite View (street overlay)',
  'settings.thickness_sheet_title': 'Route Line Width',
  'settings.thickness_thin_option': 'Thin (1.5px)',
  'settings.thickness_mid_option': 'Medium (3.5px)',
  'settings.thickness_thick_option': 'Bold (6.0px)',

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
