import React from 'react';
import { Form, Input, Button, Select, DatePicker, Table } from 'antd';

const { Option } = Select;

const TransaksiMaterial: React.FC = () => {
  const onFinish = (values: any) => {
    console.log('Received values:', values);
  };

  const columns = [
    { title: 'Tanggal', dataIndex: 'tanggal', key: 'tanggal' },
    { title: 'Jenis Material', dataIndex: 'jenisMaterial', key: 'jenisMaterial' },
    { title: 'Jumlah', dataIndex: 'jumlah', key: 'jumlah' },
    { title: 'Satuan', dataIndex: 'satuan', key: 'satuan' },
    { title: 'Keterangan', dataIndex: 'keterangan', key: 'keterangan' },
  ];

  const data = [
    { key: 1, tanggal: '2024-03-15', jenisMaterial: 'Besi', jumlah: 100, satuan: 'kg', keterangan: 'Material Masuk' },
    { key: 2, tanggal: '2024-03-16', jenisMaterial: 'Kayu', jumlah: 50, satuan: 'batang', keterangan: 'Material Keluar' },
  ];

  return (
    <div>
      <h1>Transaksi Material</h1>
      <Form name="transaksi_material" onFinish={onFinish} layout="vertical">
        <Form.Item name="jenisMaterial" label="Jenis Material" rules={[{ required: true }]}>
          <Select placeholder="Pilih jenis material">
            <Option value="besi">Besi</Option>
            <Option value="kayu">Kayu</Option>
            <Option value="semen">Semen</Option>
          </Select>
        </Form.Item>
        <Form.Item name="jumlah" label="Jumlah" rules={[{ required: true }]}>
          <Input type="number" />
        </Form.Item>
        <Form.Item name="tanggal" label="Tanggal Transaksi" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="keterangan" label="Keterangan">
          <Input.TextArea />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">Simpan Transaksi</Button>
        </Form.Item>
      </Form>
      <Table columns={columns} dataSource={data} />
    </div>
  );
};

export default TransaksiMaterial;