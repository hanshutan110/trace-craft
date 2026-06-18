import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {ConfigProvider, App as AntApp} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#116149',
          borderRadius: 6,
          fontFamily: '"Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif',
        },
        components: {
          Layout: {
            siderBg: '#0f1f1a',
            triggerBg: '#0f1f1a',
          },
          Card: {
            borderRadiusLG: 6,
          },
        },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
