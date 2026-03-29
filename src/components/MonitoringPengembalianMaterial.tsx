import React from 'react';
import { Table } from 'antd';

const columns = [
  {
    title: 'Tahun Perolehan',
    dataIndex: 'tahunPerolehan',
    key: 'tahunPerolehan',
    width: '25%',
  },
  {
    title: 'Umur Pakai',
    dataIndex: 'umurPakai',
    key: 'umurPakai',
    width: '25%',
  },
  {
    title: 'Nilai Perolehan',
    dataIndex: 'nilaiPerolehan',
    key: 'nilaiPerolehan',
    width: '25%',
  },
  {
    title: 'Nilai Material',
    dataIndex: 'nilaiMaterial',
    key: 'nilaiMaterial',
    width: '25%',
  },
];

const MonitoringPengembalianMaterial: React.FC = () => {
  // This is a placeholder for the data. In a real application, you would fetch this data from an API or state management system.
  const data = [
    {
      key: '1',
      tahunPerolehan: 2020,
      umurPakai: 3,
      nilaiPerolehan: 10000000,
      nilaiMaterial: 8000000,
    },
    // Add more data as needed
  ];

  return (
    <div>
      <h1>Monitoring Pengembalian Material ATTB</h1>
      <Table 
        columns={columns} 
        dataSource={data} 
        pagination={false}
        style={{ width: '100%' }}
        className="monitoring-table"
      />
    </div>
  );
};

export default MonitoringPengembalianMaterial;