import React from 'react';
import RencanaKedatangan from '../components/RencanaKedatangan';
import { Breadcrumb } from 'antd';
import { HomeOutlined, TruckOutlined, CalendarOutlined } from '@ant-design/icons';

const RencanaKedatanganPage: React.FC = () => {
  return (
    <div className="rencana-kedatangan-page p-4">
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item href="/">
          <HomeOutlined /> Home
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <TruckOutlined /> Monitoring
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <CalendarOutlined /> Rencana Kedatangan Material
        </Breadcrumb.Item>
      </Breadcrumb>
      
      <RencanaKedatangan />
    </div>
  );
};

export default RencanaKedatanganPage;
