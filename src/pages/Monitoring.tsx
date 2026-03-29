import React from 'react';
import { Table } from 'antd';

const Monitoring: React.FC = () => {
  const columns = [
    { title: 'Tanggal', dataIndex: 'tanggal', key: 'tanggal' },
    { title: 'Jenis Material', dataIndex: 'jenisMaterial', key: 'jenisMaterial' },
    { title: 'Jumlah', dataIndex: 'jumlah', key: 'jumlah' },
    { title: 'Satuan', dataIndex: 'satuan', key: 'satuan' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
  ];

  const data = [
    { key: 1, tanggal: '2024-03-15', jenisMaterial: 'Besi', jumlah: 100, satuan: 'kg', status: 'Masuk' },
    { key: 2, tanggal: '2024-03-16', jenisMaterial: 'Kayu', jumlah: 50, satuan: 'batang', status: 'Keluar' },
  ];

  return (
    <div>
      <h1>Monitoring</h1>
      <Table columns={columns} dataSource={data} />
    </div>
  );
};

export default Monitoring;