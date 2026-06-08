import React, { useState } from 'react';
import { Alert, Button, ScrollView, Text, TextInput, View } from 'react-native';
import { createRouteFromImage, adjustRoute, startRun, getRunState, finishRun } from './src/services/api';

const fakeImage = {
  uri: 'placeholder',
  name: 'trace-image.png',
  type: 'image/png',
};

export default function App() {
  const [routeId, setRouteId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [targetKm, setTargetKm] = useState('3');
  const [status, setStatus] = useState('未开始');
  const [stateText, setStateText] = useState('');

  const doCreate = async () => {
    setStatus('创建中...');
    try {
      const result = await createRouteFromImage({
        userId: 'demo',
        file: fakeImage,
        targetKm: Number(targetKm),
      });
      if (!result?.ok || !result.route) {
        Alert.alert('创建失败', result?.error || '接口异常');
        setStatus('失败');
        return;
      }
      setRouteId(result.route.id);
      setStateText(`routeId: ${result.route.id} | 距离: ${Math.round(result.route.meta.distanceM)}m`);
      setStatus('已创建');
    } catch (e) {
      Alert.alert('创建失败', String(e.message || e));
      setStatus('失败');
    }
  };

  const doAdjust = async () => {
    if (!routeId) {
      Alert.alert('提示', '请先创建路线');
      return;
    }
    try {
      const result = await adjustRoute({ routeId, targetKm: Number(targetKm) });
      if (!result?.ok || !result.route) {
        Alert.alert('调整失败', result?.error || '接口异常');
        return;
      }
      setStateText(`已调整: ${Math.round(result.route.meta.distanceM)}m | pointsVersion: ${result.route.pointsVersion}`);
    } catch (e) {
      Alert.alert('调整失败', String(e.message || e));
    }
  };

  const doStart = async () => {
    if (!routeId) {
      Alert.alert('提示', '请先创建路线');
      return;
    }
    try {
      const result = await startRun({ routeId, userId: 'demo' });
      if (!result?.ok || !result.session) {
        Alert.alert('启动失败', result?.error || '接口异常');
        return;
      }
      const id = result.session.id;
      setSessionId(id);
      setStatus('导航中');
      const timer = setInterval(async () => {
        const state = await getRunState({ sessionId: id });
        if (state.ok) {
          setStateText(`状态: ${state.state.status}，偏离: ${state.state.deviationM}m，进度: ${state.state.progressPct}%`);
        }
      }, 2000);
      setTimeout(async () => {
        clearInterval(timer);
        const finish = await finishRun({
          sessionId: id,
          actualPath: [
            { lat: 31.2304, lng: 121.4737 },
            { lat: 31.2310, lng: 121.4745 },
          ],
        });
        if (finish.ok) {
          setStatus('已完成');
          setStateText(`完成: 实际${finish.result.metrics.actualDistanceM}m，计划${finish.result.metrics.plannedDistanceM}m`);
        }
      }, 6000);
    } catch (e) {
      Alert.alert('启动失败', String(e.message || e));
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>TraceCraft MVP</Text>
      <Button title="1. 创建路线（占位）" onPress={doCreate} />
      <Text>路线ID：{routeId || '--'}</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput
          style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 8, width: 120, height: 40 }}
          value={targetKm}
          onChangeText={setTargetKm}
          keyboardType="numeric"
          placeholder="公里数"
        />
        <Button title="2. 调整公里数" onPress={doAdjust} />
      </View>

      <Text>状态：{status}</Text>
      <Text style={{ color: '#555' }}>sessionId：{sessionId || '--'}</Text>
      <Button title="3. 开始导航（占位）" onPress={doStart} />
      <Text>{stateText}</Text>
      <Text style={{ color: '#666' }}>当前为接口联调占位入口，不展示 GPX 文件。</Text>
    </ScrollView>
  );
}
