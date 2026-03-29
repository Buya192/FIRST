import React from 'react';
import { ConfigProvider } from 'antd';

// Impor gaya Ant Design
import 'antd/dist/reset.css';

interface AntdProviderProps {
  children: React.ReactNode;
}

const AntdProvider: React.FC<AntdProviderProps> = ({ children }) => {
  return (
    <ConfigProvider>
      {children}
    </ConfigProvider>
  );
};

export default AntdProvider;