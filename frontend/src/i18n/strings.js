export const DEFAULT_LOCALE = 'zh-CN';

export const LOCALES = ['zh-CN', 'en-US'];
export const LOCALE_LABELS = {
  'zh-CN': '\u4e2d\u6587',
  'en-US': 'English',
};

export const STRINGS = {
  'zh-CN': {
    appTitle: 'TraceCraft',
    btnCreateRoute: '\u751f\u6210\u8def\u7ebf',
    btnAdjustRoute: '\u91cd\u7b97\u8def\u7ebf',
    btnStartRun: '\u5f00\u59cb\u5bfc\u822a',
    btnFinishRun: '\u7ed3\u675f',
    labelLanguage: '\u8bed\u8a00',
    labelRouteId: 'Route ID',
    labelSessionId: 'Session ID',
    labelNoRoute: '\u672a\u5efa\u7acb',
    labelNoSession: '\u672a\u5f00\u59cb',
    labelDistance: '\u76ee\u6807\u516c\u91cc\u6570',
    statusIdle: '\u7b49\u5f85',
    statusRunning: '\u5bfc\u822a\u4e2d',
    statusFinished: '\u5b8c\u6210',
    tipNeedRoute: '\u8bf7\u5148\u521b\u5efa\u8def\u7ebf',
    errRouteCreate: '\u521b\u5efa\u8def\u7ebf\u5931\u8d25',
    errAdjustFail: '\u91cd\u7b97\u5931\u8d25',
    errRebaseFail: '\u91cd\u4f4d\u7f6e\u5931\u8d25',
    errRequest: '\u8bf7\u6c42\u5931\u8d25',
    kmDefault: '3',
  },
  'en-US': {
    appTitle: 'TraceCraft',
    btnCreateRoute: 'Create route',
    btnAdjustRoute: 'Recalculate distance',
    btnStartRun: 'Start run',
    btnFinishRun: 'Finish run',
    labelLanguage: 'Language',
    labelRouteId: 'Route ID',
    labelSessionId: 'Session ID',
    labelNoRoute: 'not ready',
    labelNoSession: 'not started',
    labelDistance: 'Target distance',
    statusIdle: 'Idle',
    statusRunning: 'Running',
    statusFinished: 'Finished',
    tipNeedRoute: 'Please create a route first',
    errRouteCreate: 'Create route failed',
    errAdjustFail: 'Recalculate failed',
    errRebaseFail: 'Rebase failed',
    errRequest: 'Request failed',
    kmDefault: '3',
  },
};

export const getLocaleLabel = (locale) => {
  const key = locale && LOCALE_LABELS[locale] ? locale : DEFAULT_LOCALE;
  return LOCALE_LABELS[key] || key;
};

export const t = (locale, key) => {
  const dict = STRINGS[locale] || STRINGS[DEFAULT_LOCALE];
  return dict[key] || STRINGS[DEFAULT_LOCALE][key] || key;
};
