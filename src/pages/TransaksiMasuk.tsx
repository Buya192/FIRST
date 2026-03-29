import React from 'react';
import TransaksiMasukComponent from '../components/TransaksiMasuk';
import { Breadcrumb, Typography } from 'antd';
import { HomeOutlined, InboxOutlined } from '@ant-design/icons';
import { Suspense } from 'react';

const { Title } = Typography;

const TransaksiMasuk: React.FC = () => {
  return (
    <div className="transaksi-masuk-page p-4">
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item href="/">
          <HomeOutlined /> Home
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <InboxOutlined /> Transaksi Masuk
        </Breadcrumb.Item>
      </Breadcrumb>
      
      <div className="mb-4">
        <Title level={2}>
          <InboxOutlined style={{ marginRight: 12 }} /> 
          Transaksi Masuk
        </Title>
        <p className="text-gray-500">
          Form untuk membuat transaksi material masuk baru. Data yang disimpan akan dikirimkan ke WO Penerimaan dan Monitoring Masuk.
        </p>
      </div>
      
      <Suspense fallback={<div className="text-center py-5">Loading...</div>}>
        <TransaksiMasukComponent />
      </Suspense>
    </div>
  );
};

export default TransaksiMasuk;
