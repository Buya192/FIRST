import React, { useEffect, useState, useCallback } from 'react';
import { Table, Card, Button, Upload, Input, Tooltip, Form, Modal, message, InputNumber, Spin, Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, UploadOutlined, SaveOutlined, InfoCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import Papa from 'papaparse';
import { useAppContext, InventoryItem } from '../context/AppContext';
import moment from 'moment';
import { RcFile } from 'antd/lib/upload';

const { Search } = Input;

const InventNormal: React.FC = () => {
  const { 
    inventory: data, 
    fetchInventory, 
    addInventoryItem, 
    updateInventoryItem, 
    deleteInventoryItem 
  } = useAppContext();
  
  const [filteredData, setFilteredData] = useState<InventoryItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageURL, setUploadedImageURL] = useState<string>('');
  const [form] = Form.useForm();
  const [csvData, setCSVData] = useState<InventoryItem[]>([]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    setFilteredData(data);
  }, [data]);

  const handleSearch = useCallback((value: string) => {
    const lowercaseValue = value.toLowerCase();
    const filtered = data.filter((item: InventoryItem) =>
      item.materialDescription.toLowerCase().includes(lowercaseValue) ||
      item.name.toLowerCase().includes(lowercaseValue)
    );
    setFilteredData(filtered);
  }, [data]);

  const handleEdit = useCallback((item: InventoryItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      ...item,
      warrantyDate: item.warrantyDate ? moment(item.warrantyDate) : undefined,
    });
    setUploadedImageURL(item.description || '');
    setIsModalVisible(true);
  }, [form]);

  const handleSaveEdit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      const updatedValues = {
        ...values,
        warrantyDate: values.warrantyDate ? values.warrantyDate.format('YYYY-MM-DD') : undefined,
        description: uploadedImageURL || values.description,
      };
      if (editingItem?.id) {
        await updateInventoryItem(editingItem.id, updatedValues);
        message.success('Data berhasil diperbarui');
      } else {
        await addInventoryItem(updatedValues);
        message.success('Data berhasil ditambahkan');
      }
      setIsModalVisible(false);
      setUploadedImageURL('');
      fetchInventory();
    } catch (error) {
      message.error('Gagal memperbarui data');
    }
  }, [form, editingItem, uploadedImageURL, updateInventoryItem, addInventoryItem, fetchInventory]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteInventoryItem(id);
      message.success('Data berhasil dihapus');
      fetchInventory();
    } catch (error) {
      message.error('Gagal menghapus data');
    }
  }, [deleteInventoryItem, fetchInventory]);

  const handleUpload = useCallback((file: RcFile) => {
    setUploadingImage(true);
    // In a real-world scenario, you would upload the file to a server here
    // and get back a URL. For this example, we're just using a local object URL.
    setTimeout(() => {
      setUploadedImageURL(URL.createObjectURL(file));
      setUploadingImage(false);
    }, 1000);
    return false; // Prevent auto-upload
  }, []);

  const handleCSVUpload = useCallback((file: RcFile) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setCSVData(results.data as InventoryItem[]);
        message.success('CSV berhasil diunggah. Klik "Simpan Semua Dokumen" untuk menyimpan data.');
      },
      encoding: "UTF-8"
    });
    return false; // Prevent auto-upload
  }, []);

  const handleSaveAllDocuments = useCallback(async () => {
    try {
      for (const item of csvData) {
        await addInventoryItem(item);
      }
      message.success('Semua data berhasil disimpan');
      fetchInventory();
      setCSVData([]);
    } catch (error) {
      message.error('Gagal menyimpan semua data');
    }
  }, [csvData, addInventoryItem, fetchInventory]);

  const handleDeleteAll = useCallback(async () => {
    try {
      for (const item of data) {
        if (item.id) {
          await deleteInventoryItem(item.id);
        }
      }
      message.success('Semua data berhasil dihapus');
      fetchInventory();
    } catch (error) {
      message.error('Gagal menghapus semua data');
    }
  }, [data, deleteInventoryItem, fetchInventory]);

  const handleDownloadTemplate = useCallback(() => {
    const headers = ['name', 'quantity', 'materialDescription', 'warrantyDate', 'description'];
    const csvContent = Papa.unparse({
      fields: headers,
      data: []
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'template_inventaris_normal.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  const columns = [
    { title: 'Material Description', dataIndex: 'materialDescription', key: 'materialDescription', width: 180 },
    { title: 'Normalisasi', dataIndex: 'name', key: 'name', width: 150 },
    { title: 'Stock', dataIndex: 'quantity', key: 'quantity', width: 100 },
    { title: 'Lokasi Penyimpanan', dataIndex: 'description', key: 'description', width: 200 },
    {
      title: 'Foto',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => (
        description && description.startsWith('http') ? 
          <img src={description} alt="Foto" style={{ width: 50, height: 50, objectFit: 'cover' }} /> 
          : 
          <span>Tidak ada foto</span>
      ),
      width: 100,
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_: any, record: InventoryItem) => (
        <>
          <Tooltip title="Edit">
            <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ marginRight: 8 }} />
          </Tooltip>
          <Popconfirm
            title="Apakah Anda yakin ingin menghapus item ini?"
            onConfirm={() => handleDelete(record.id)}
            okText="Ya"
            cancelText="Tidak"
          >
            <Tooltip title="Hapus">
              <Button icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </>
      ),
      width: 150,
    },
  ];

  return (
    <Card title="Inventaris Normal" className="p-6">
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Search
          placeholder="Cari Material Description atau Normalisasi"
          onSearch={handleSearch}
          style={{ width: 300 }}
        />
        <div>
          <Tooltip title="Format file: CSV dengan encoding UTF-8">
            <InfoCircleOutlined style={{ marginRight: 8 }} />
          </Tooltip>
          <Upload beforeUpload={handleCSVUpload} accept=".csv">
            <Button icon={<UploadOutlined />} style={{ marginRight: 8 }}>Upload CSV</Button>
          </Upload>
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate} style={{ marginRight: 8 }}>
            Download Template
          </Button>
          <Button 
            type="primary" 
            icon={<SaveOutlined />} 
            onClick={handleSaveAllDocuments} 
            disabled={csvData.length === 0}
            style={{ marginRight: 8 }}
          >
            Simpan Semua Dokumen
          </Button>
          <Popconfirm
            title="Apakah Anda yakin ingin menghapus semua data?"
            onConfirm={handleDeleteAll}
            okText="Ya"
            cancelText="Tidak"
          >
            <Button danger icon={<DeleteOutlined />} style={{ marginRight: 8 }}>
              Hapus Semua
            </Button>
          </Popconfirm>
          <Button type="primary" onClick={() => setIsModalVisible(true)}>
            Tambah Baru
          </Button>
        </div>
      </div>
      <Table columns={columns} dataSource={filteredData} rowKey="id" pagination={{ pageSize: 50 }} scroll={{ x: 1500, y: 400 }} />

      <Modal
        title={editingItem ? 'Edit Material' : 'Tambah Material'}
        visible={isModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingItem(null);
          setUploadedImageURL('');
          form.resetFields();
        }}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="materialDescription" label="Material Description" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Normalisasi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="quantity" label="Stock" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="Lokasi Penyimpanan">
            <Input />
          </Form.Item>

          <Form.Item label="Upload Foto">
            <Upload 
              beforeUpload={handleUpload} 
              listType="picture-card"
              showUploadList={false}
            >
              {uploadedImageURL ? (
                <img src={uploadedImageURL} alt="uploaded" style={{ width: '100%' }} />
              ) : (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              )}
            </Upload>
            {uploadingImage && <Spin />}
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default InventNormal;
