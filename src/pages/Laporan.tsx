import React from 'react';
import { Button, DatePicker } from 'antd';

const { RangePicker } = DatePicker;

const Laporan: React.FC = () => {
  const generateReport = () => {
    console.log('Generating report...');
  };

  return (
    <div>
      <h1>Laporan</h1>
      <RangePicker style={{ marginRight: 16 }} />
      <Button type="primary" onClick={generateReport}>Generate Laporan</Button>
    </div>
  );
};

export default Laporan;