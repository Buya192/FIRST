import React from 'react';
import { EnhancedMonitoringMasukWithSync } from '../components/EnhancedMonitoringMasukWithSync';
import { Breadcrumb } from 'antd';
import { HomeOutlined, InboxOutlined, CloudSyncOutlined } from '@ant-design/icons';
import { Suspense } from 'react';

const MonitoringMasuk: React.FC = () => {
  return (
    <div className="monitoring-masuk-page p-4">
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item href="/">
          <HomeOutlined /> Home
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <InboxOutlined /> Monitoring Transaksi Masuk
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <CloudSyncOutlined /> PLN Marketplace Integration
        </Breadcrumb.Item>
      </Breadcrumb>
      
      <Suspense fallback={<div className="text-center py-5">Loading Enhanced Monitoring...</div>}>
        <EnhancedMonitoringMasukWithSync />
      </Suspense>
    </div>
  );
};

export default MonitoringMasuk;
