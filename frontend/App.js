import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  adjustRoute,
  createRouteFromImage,
  finishRun,
  getRunState,
  resolveLocaleConfig,
  startRun,
} from './src/services/api';
import { t, DEFAULT_LOCALE, LOCALES, getLocaleLabel } from './src/i18n/strings';
import {
  THEME_KEYS,
  THEME_LABELS,
  THEME_PAGE_GROUPS,
  getTheme,
} from './src/theme';

const fakeImage = {
  uri: 'placeholder',
  name: 'trace-image.png',
  type: 'image/png',
};

export default function App() {
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [localeList, setLocaleList] = useState(LOCALES);
  const [localeLabels, setLocaleLabels] = useState({});
  const [isLocaleReady, setIsLocaleReady] = useState(false);
  const [routeId, setRouteId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [targetKm, setTargetKm] = useState('3');
  const [statusKey, setStatusKey] = useState('statusIdle');
  const [stateText, setStateText] = useState('');
  const [themeKey, setThemeKey] = useState(THEME_KEYS.light);

  const copy = useMemo(() => ({
    locale,
    t: (key) => t(locale, key),
  }), [locale]);
  const theme = useMemo(() => getTheme(themeKey), [themeKey]);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const getLocaleText = (code) => localeLabels[code] || getLocaleLabel(code);

  useEffect(() => {
    (async () => {
      try {
        const config = await resolveLocaleConfig();
        const locales = Array.isArray(config.locales) && config.locales.length > 0 ? config.locales : LOCALES;
        setLocaleList(locales);
        if (Array.isArray(config.localeLabels)) {
          const labels = {};
          config.localeLabels.forEach((entry) => {
            if (entry && entry.code) {
              labels[entry.code] = entry.label;
            }
          });
          setLocaleLabels(labels);
        }
        const fallback = config.localeFallback || DEFAULT_LOCALE;
        const normalizedFallback = locales.includes(fallback) ? fallback : locales[0] || DEFAULT_LOCALE;
        if (!locales.includes(locale)) {
          setLocale(normalizedFallback);
        }
      } catch (_e) {
        setLocaleList(LOCALES);
      } finally {
        setIsLocaleReady(true);
      }
    })();
  }, []);

  const doCreate = async () => {
    try {
      const result = await createRouteFromImage({
        userId: 'demo',
        file: fakeImage,
        targetKm: Number(targetKm),
        locale,
      });
      if (!result?.ok || !result.route) {
        Alert.alert(copy.t('errRouteCreate'), result?.error || copy.t('errRequest'));
        return;
      }
      setRouteId(result.route.id);
      setSessionId('');
      setStatusKey('statusIdle');
      setStateText(`routeId: ${result.route.id} | ${Math.round(result.route.meta.distanceM)}m`);
    } catch (e) {
      Alert.alert(copy.t('errRouteCreate'), String(e.message || e));
    }
  };

  const doAdjust = async () => {
    if (!routeId) {
      Alert.alert(copy.t('tipNeedRoute'), copy.t('tipNeedRoute'));
      return;
    }
    try {
      const result = await adjustRoute({ routeId, targetKm: Number(targetKm) });
      if (!result?.ok || !result.route) {
        Alert.alert(copy.t('errAdjustFail'), result?.error || copy.t('errRequest'));
        return;
      }
      setStateText(`adjusted: ${Math.round(result.route.meta.distanceM)}m`);
    } catch (e) {
      Alert.alert(copy.t('errAdjustFail'), String(e.message || e));
    }
  };

  const doStart = async () => {
    if (!routeId) {
      Alert.alert(copy.t('tipNeedRoute'), copy.t('tipNeedRoute'));
      return;
    }
    try {
      const result = await startRun({ routeId, userId: 'demo' });
      if (!result?.ok || !result.session) {
        Alert.alert(copy.t('tipNeedRoute'), result?.error || copy.t('errRequest'));
        return;
      }
      const id = result.session.id;
      setSessionId(id);
      setStatusKey('statusRunning');
      const timer = setInterval(async () => {
        const state = await getRunState({ sessionId: id });
        if (state.ok) {
          setStateText(`status=${state.state.status} | deviation=${state.state.deviationM}m | progress=${state.state.progressPct}%`);
        }
      }, 2000);
      setTimeout(async () => {
        clearInterval(timer);
        const finish = await finishRun({
          sessionId: id,
          actualPath: [{ lat: 31.2304, lng: 121.4737 }, { lat: 31.231, lng: 121.4745 }],
        });
        if (finish.ok) {
          setStatusKey('statusFinished');
          setStateText(`done: ${finish.result.metrics.actualDistanceM}m / ${finish.result.metrics.plannedDistanceM}m`);
        }
      }, 6000);
    } catch (e) {
      Alert.alert(copy.t('errRequest'), String(e.message || e));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>{copy.t('appTitle')}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>页面主题</Text>
        <Text style={styles.small}>{THEME_PAGE_GROUPS[themeKey].join(' / ')}</Text>
        <View style={styles.row}>
          {Object.values(THEME_KEYS).map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => setThemeKey(key)}
              style={[
                styles.badge,
                themeKey === key && styles.badgeActive,
                themeKey === key && { borderColor: theme.primary },
              ]}
            >
              <Text style={themeKey === key ? styles.badgeTextActive : styles.badgeText}>{THEME_LABELS[key]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{copy.t('labelLanguage')}</Text>
        {isLocaleReady ? null : <Text style={styles.tiny}>Loading locales...</Text>}
        {localeList.map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setLocale(item)}
            style={[styles.badge, locale === item && styles.badgeActive]}
          >
            <Text style={locale === item ? styles.badgeTextActive : styles.badgeText}>{getLocaleText(item)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.buttonWrap}>
          <Button title={copy.t('btnCreateRoute')} color={theme.primary} onPress={doCreate} />
        </View>
      </View>
      <View style={styles.buttonWrap}>
        <Button title={copy.t('btnAdjustRoute')} color={theme.primary} onPress={doAdjust} />
      </View>
      <TextInput
        style={styles.input}
        value={targetKm}
        onChangeText={setTargetKm}
        placeholder={copy.t('labelDistance')}
        placeholderTextColor={theme.textSub}
        keyboardType="numeric"
      />

      <Text style={styles.text}>
        {copy.t('labelRouteId')}: {routeId || copy.t('labelNoRoute')}
      </Text>
      <Text style={styles.text}>
        {copy.t('labelSessionId')}: {sessionId || copy.t('labelNoSession')}
      </Text>

      <View style={styles.row}>
        <View style={styles.buttonWrap}>
          <Button title={copy.t('btnStartRun')} color={theme.primary} onPress={doStart} />
        </View>
        <View style={styles.buttonWrap}>
          <Button title={copy.t('btnFinishRun')} color={theme.primaryHover} onPress={() => {}} />
        </View>
      </View>

      <Text style={styles.status}>{copy.t(statusKey)}</Text>
      <Text style={styles.text}>{stateText}</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>设计图主题建议同步说明</Text>
        <Text style={styles.small}>深色组：{THEME_PAGE_GROUPS[THEME_KEYS.deepDark].join('、')}</Text>
        <Text style={styles.small}>浅色组：{THEME_PAGE_GROUPS[THEME_KEYS.light].join('、')}</Text>
        <Text style={styles.small}>引导页：{THEME_PAGE_GROUPS[THEME_KEYS.onboard].join('、')}</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  wrap: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    fontWeight: '700',
    color: theme.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  tiny: {
    color: theme.textSub,
    fontSize: 12,
    marginLeft: 6,
  },
  label: {
    fontWeight: '700',
    color: theme.text,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    width: 140,
    height: 40,
    color: theme.text,
    backgroundColor: theme.inputBg,
  },
  text: {
    marginTop: 6,
    color: theme.text,
  },
  small: {
    fontSize: 12,
    color: theme.textSub,
    marginTop: 2,
  },
  status: {
    marginTop: 8,
    color: theme.status,
    fontWeight: '700',
  },
  badge: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  badgeActive: {
    backgroundColor: `${theme.primary}20`,
    borderColor: theme.primary,
  },
  badgeText: {
    color: theme.text,
  },
  badgeTextActive: {
    color: theme.textOnPrimary,
    fontWeight: '700',
  },
  buttonWrap: {
    minWidth: 100,
    marginBottom: 6,
  },
  card: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    backgroundColor: theme.surface,
    padding: 12,
    shadowColor: theme.shadow,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },
  cardTitle: {
    color: theme.text,
    fontWeight: '700',
    marginBottom: 4,
  },
});
