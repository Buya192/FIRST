import React, { useState, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, message, Space, Popconfirm, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { ColumnsType } from 'antd/es/table';
import { useInventory, InventoryItem } from '../hooks/useInventory';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingSpinner from '../components/LoadingSpinner';
import debounce from 'lodash/debounce';

const { Option } = Select;

const Inventory: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [form] = Form.useForm();

  const queryClient = useQueryClient();
  const { fetchInventory, addItem, updateItem, deleteItem } = useInventory();

  const { data: inventoryData, isLoading, isError } = useQuery('inventory', fetchInventory);

  const addMutation = useMutation(addItem, {
    onSuccess: () => {
      queryClient.invalidateQueries('inventory');
      message.success('Item added successfully');
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(`Failed to add item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const updateMutation = useMutation(updateItem, {
    onSuccess: () => {
      queryClient.invalidateQueries('inventory');
      message.success('Item updated successfully');
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error) => {
      message.error(`Failed to update item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const deleteMutation = useMutation(deleteItem, {
    onSuccess: () => {
      queryClient.invalidateQueries('inventory');
      message.success('Item deleted successfully');
    },
    onError: (error) => {
      message.error(`Failed to delete item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const debouncedSearch = useCallback(
    debounce((value: string) => setSearchTerm(value), 300),
    []
  );

  const filteredData = inventoryData?.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesFilter;
  });

  const columns: ColumnsType<InventoryItem> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)} 
            className="text-blue-600 hover:text-blue-800"
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure you want to delete this item?"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              icon={<DeleteOutlined />} 
              className="text-red-600 hover:text-red-800"
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleAddItem = () => {
    setEditingItem(null);
    setIsModalVisible(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      if (editingItem) {
        updateMutation.mutate({ id: editingItem.id, ...values });
      } else {
        addMutation.mutate(values);
      }
    }).catch((info) => {
      console.log('Validate Failed:', info);
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <div className="text-red-500 text-center mt-8">Error loading inventory data</div>;

  return (
    <ErrorBoundary>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Inventory Management</h1>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddItem}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            Add New Item
          </Button>
        </div>
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <Input
            placeholder="Search items"
            prefix={<SearchOutlined />}
            onChange={(e) => debouncedSearch(e.target.value)}
            className="w-full sm:w-64 mb-4 sm:mb-0"
          />
          <Select 
            defaultValue="all" 
            style={{ width: 120 }} 
            onChange={(value) => setFilterCategory(value)}
            className="w-full sm:w-auto"
          >
            <Option value="all">All Categories</Option>
            <Option value="electronics">Electronics</Option>
            <Option value="furniture">Furniture</Option>
            <Option value="stationery">Stationery</Option>
          </Select>
        </div>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          className="shadow-md rounded-lg overflow-hidden"
        />
        <Modal
          title={editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
          visible={isModalVisible}
          onOk={handleModalOk}
          onCancel={handleModalCancel}
          confirmLoading={addMutation.isLoading || updateMutation.isLoading}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please input the name!' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="quantity"
              label="Quantity"
              rules={[
                { required: true, message: 'Please input the quantity!' },
                { type: 'number', min: 0, message: 'Quantity must be a positive number!' },
              ]}
            >
              <Input type="number" />
            </Form.Item>
            <Form.Item
              name="unit"
              label="Unit"
              rules={[{ required: true, message: 'Please input the unit!' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="category"
              label="Category"
              rules={[{ required: true, message: 'Please select the category!' }]}
            >
              <Select>
                <Option value="electronics">Electronics</Option>
                <Option value="furniture">Furniture</Option>
                <Option value="stationery">Stationery</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="materialDescription"
              label="Material Description"
              rules={[{ required: true, message: 'Please input the material description!' }]}
            >
              <Input.TextArea />
            </Form.Item>
            <Form.Item
              name="warrantyDate"
              label="Warranty Date"
            >
              <Input type="date" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ErrorBoundary>
  );
};

export default Inventory;