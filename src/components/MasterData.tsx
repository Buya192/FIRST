import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { doc, deleteDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAppContext, MasterDataItem } from '../context/AppContext';
import logger from '../utils/logger';
import { ColumnType } from 'antd/es/table';

const MasterData: React.FC = () => {
  const [form] = Form.useForm();
  const { getMasterMaterialData } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterDataItem | null>(null);
  const [masterMaterialData, setMasterMaterialData] = useState<MasterDataItem[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (getMasterMaterialData) {
        const data = await getMasterMaterialData();
        setMasterMaterialData(data);
        logger.info(`MasterData: Data fetched, item count: ${data.length}`);
      }
    } catch (error) {
      logger.error('MasterData: Failed to fetch master material data:', error);
      message.error('Failed to load master data');
    } finally {
      setLoading(false);
    }
  }, [getMasterMaterialData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'masterData', id));
      message.success('Item deleted successfully');
      setMasterMaterialData(prevData => prevData.filter(item => item.id !== id));
      logger.info(`MasterData: Item deleted, id: ${id}`);
    } catch (error) {
      logger.error('MasterData: Error deleting item:', error);
      message.error('Failed to delete item');
    }
  };

  const handleSave = async (item: MasterDataItem) => {
    try {
      if (item.id) {
        const { id, ...itemData } = item;
        await updateDoc(doc(db, 'masterData', id), itemData);
        logger.info(`MasterData: Item updated, id: ${id}`);
      } else {
        const docRef = await addDoc(collection(db, 'masterData'), item);
        logger.info(`MasterData: New item added, id: ${docRef.id}`);
      }
      message.success('Item saved successfully');
      fetchData();
      setIsModalVisible(false);
    } catch (error) {
      logger.error('MasterData: Error saving item:', error);
      message.error('Failed to save item');
    }
  };

  const columns: ColumnType<MasterDataItem>[] = [
    { title: 'Normalisasi', dataIndex: 'normalisasi', key: 'normalisasi' },
    { title: 'Material Description', dataIndex: 'materialDescription', key: 'materialDescription' },
    { title: 'Satuan', dataIndex: 'satuan', key: 'satuan' },
    { title: 'Valuation Description', dataIndex: 'valuationDescription', key: 'valuationDescription' },
    { title: 'Harga Satuan', dataIndex: 'hargaSatuan', key: 'hargaSatuan' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ marginRight: 8 }} />
          <Button icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} danger />
        </>
      ),
    },
  ];

  const handleEdit = (record: MasterDataItem) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleSearch = (value: string) => {
    const filteredData = masterMaterialData.filter(
      item => item.normalisasi.toLowerCase().includes(value.toLowerCase()) ||
               item.materialDescription.toLowerCase().includes(value.toLowerCase())
    );
    setMasterMaterialData(filteredData);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Master Data</h1>
      <Input.Search
        placeholder="Search data"
        onSearch={handleSearch}
        style={{ marginBottom: 16 }}
      />
      <Table
        columns={columns}
        dataSource={masterMaterialData}
        loading={loading}
        rowKey="id"
      />
      <Modal
        title={editingItem ? "Edit Item" : "Add New Item"}
        visible={isModalVisible}
        onOk={() => {
          form.validateFields().then(values => {
            handleSave({ ...editingItem, ...values } as MasterDataItem);
          });
        }}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="normalisasi" label="Normalisasi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="materialDescription" label="Material Description" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="satuan" label="Satuan" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="valuationDescription" label="Valuation Description" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="hargaSatuan" label="Harga Satuan" rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MasterData;
