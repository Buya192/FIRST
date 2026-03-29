import React from 'react';
import { Form, Select, Button } from 'antd';

const { Option } = Select;

const Pengaturan: React.FC = () => {
  const onFinish = (values: any) => {
    console.log('Received values:', values);
  };

  return (
    <div>
      <h1>Pengaturan</h1>
      <Form name="pengaturan" onFinish={onFinish} layout="vertical">
        <Form.Item name="bahasa" label="Bahasa" rules={[{ required: true }]}>
          <Select placeholder="Pilih bahasa">
            <Option value="id">Bahasa Indonesia</Option>
            <Option value="en">English</Option>
          </Select>
        </Form.Item>
        <Form.Item name="tema" label="Tema" rules={[{ required: true }]}>
          <Select placeholder="Pilih tema">
            <Option value="light">Terang</Option>
            <Option value="dark">Gelap</Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">Simpan Pengaturan</Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Pengaturan;