import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, message } from 'antd';
import { useAppContext } from '../hooks/useAppContext';
import { InventoryItem } from '../hooks/useInventory';

const { Option } = Select;

const InputMaterial: React.FC = () => {
  const [form] = Form.useForm();
  const { addInventoryItem } = useAppContext();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: Omit<InventoryItem, 'id'>) => {
    setLoading(true);
    try {
      await addInventoryItem(values);
      message.success('Material added successfully');
      form.resetFields();
    } catch (error) {
      console.error('Error adding material:', error);
      message.error('Failed to add material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Input Material</h2>
      <Form
        form={form}
        name="inputMaterial"
        onFinish={onFinish}
        layout="vertical"
      >
        <Form.Item
          name="name"
          label="Material Name"
          rules={[{ required: true, message: 'Please input the material name!' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[{ required: true, message: 'Please input the description!' }]}
        >
          <Input.TextArea />
        </Form.Item>

        <Form.Item
          name="quantity"
          label="Quantity"
          rules={[{ required: true, message: 'Please input the quantity!' }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="unit"
          label="Unit"
          rules={[{ required: true, message: 'Please select the unit!' }]}
        >
          <Select>
            <Option value="pcs">Pieces</Option>
            <Option value="kg">Kilograms</Option>
            <Option value="m">Meters</Option>
            <Option value="l">Liters</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: true, message: 'Please input the category!' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} className="w-full">
            Add Material
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default InputMaterial;