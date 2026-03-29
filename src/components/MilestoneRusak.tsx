import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Upload, Input, Tooltip, Form, Modal, message, InputNumber } from 'antd';
import { getDocs, collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { EditOutlined, DeleteOutlined, UploadOutlined, SearchOutlined, ReloadOutlined, QrcodeOutlined, FileImageOutlined } from '@ant-design/icons';
import QRCodeGenerator from './QRCodeGenerator';

interface MaterialItem {
  id: string;
  nomorWO: string;
  nomorDokumen: string;
  tanggal: string;
  pengembali: string;
  petugas: string;
  kategori: string;
  materialDescription: string;
  quantity: number;
  satuan: string;
  kondisi: string;
  lokasiPenyimpanan: string;
  catatan?: string;
  foto1?: string;
  foto2?: string;
  foto3?: string;
}

const MilestoneRusak: React.FC = () => {
  const [data, setData] = useState<MaterialItem[]>([]);
  const [filteredData, setFilteredData] = useState<MaterialItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MaterialItem | null>(null);
  const [selectedQRItem, setSelectedQRItem] = useState<MaterialItem | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [form] = Form.useForm();

  // Fetch data from Firestore
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'milestoneRusak'));
      const materials = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as MaterialItem[];
      setData(materials);
      setFilteredData(materials);
    } catch (error) {
      message.error('Gagal mengambil data.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Search functionality
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const filtered = data.filter(item =>
      item.nomorDokumen.toLowerCase().includes(value.toLowerCase()) ||
      item.materialDescription.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredData(filtered);
  };

  // Editing functionality
  const handleEdit = (item: MaterialItem) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setIsModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      const updatedValues = form.getFieldsValue();
      if (editingItem) {
        const docRef = doc(db, 'milestoneRusak', editingItem.id);
        await updateDoc(docRef, updatedValues);
        message.success('Data berhasil diperbarui');
        setData(prevData =>
          prevData.map(item =>
            item.id === editingItem.id ? { ...item, ...updatedValues } : item
          )
        );
        setFilteredData(prevData =>
          prevData.map(item =>
            item.id === editingItem.id ? { ...item, ...updatedValues } : item
          )
        );
        setIsModalVisible(false);
      }
    } catch (error) {
      message.error('Gagal memperbarui data');
    }
  };

  // Delete functionality
  const handleDelete = async (id: string) => {
    setLoadingDelete(true);
    try {
      const docRef = doc(db, 'milestoneRusak', id);
      await deleteDoc(docRef);
      message.success('Data berhasil dihapus');
      setData(prevData => prevData.filter(item => item.id !== id));
      setFilteredData(prevData => prevData.filter(item => item.id !== id));
    } catch (error) {
      message.error('Gagal menghapus data');
    } finally {
      setLoadingDelete(false);
    }
  };

  // Delete all functionality
  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'milestoneRusak'));
      const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      message.success('Semua data berhasil dihapus');
      setData([]);
      setFilteredData([]);
    } catch (error) {
      message.error('Gagal menghapus semua data');
    } finally {
      setDeletingAll(false);
    }
  };

  // QR Code Generation functionality
  const handleGenerateQR = (item: MaterialItem) => {
    setSelectedQRItem(item);
    setIsQRModalVisible(true);
  };

  // Columns for the Table
  const columns = [
    { title: 'Nomor WO', dataIndex: 'nomorWO', key: 'nomorWO', width: 120 },
    { title: 'Nomor Dokumen', dataIndex: 'nomorDokumen', key: 'nomorDokumen', width: 180 },
    { title: 'Tanggal', dataIndex: 'tanggal', key: 'tanggal', width: 120 },
    { title: 'Pengembali', dataIndex: 'pengembali', key: 'pengembali', width: 150 },
    { title: 'Petugas', dataIndex: 'petugas', key: 'petugas', width: 150 },
    { title: 'Kategori', dataIndex: 'kategori', key: 'kategori', width: 150 },
    { title: 'Material Description', dataIndex: 'materialDescription', key: 'materialDescription', width: 200 },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 100 },
    { title: 'Satuan', dataIndex: 'satuan', key: 'satuan', width: 100 },
    { title: 'Kondisi', dataIndex: 'kondisi', key: 'kondisi', width: 100 },
    { title: 'Lokasi Penyimpanan', dataIndex: 'lokasiPenyimpanan', key: 'lokasiPenyimpanan', width: 200 },
    {
      title: 'Foto 1',
      dataIndex: 'foto1',
      key: 'foto1',
      width: 150,
      render: (foto1: string) => foto1 ? <img src={foto1} alt="Foto 1" style={{ maxWidth: 100 }} /> : <FileImageOutlined />,
    },
    {
      title: 'Foto 2',
      dataIndex: 'foto2',
      key: 'foto2',
      width: 150,
      render: (foto2: string) => foto2 ? <img src={foto2} alt="Foto 2" style={{ maxWidth: 100 }} /> : <FileImageOutlined />,
    },
    {
      title: 'Foto 3',
      dataIndex: 'foto3',
      key: 'foto3',
      width: 150,
      render: (foto3: string) => foto3 ? <img src={foto3} alt="Foto 3" style={{ maxWidth: 100 }} /> : <FileImageOutlined />,
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_: any, record: MaterialItem) => (
        <>
          <Tooltip title="Edit">
            <Button
              icon={<EditOutlined />}
              style={{ marginRight: 8 }}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Hapus">
            <Button
              icon={<DeleteOutlined />}
              danger
              style={{ marginRight: 8 }}
              loading={loadingDelete}
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
          <Tooltip title="Generate QR Code">
            <Button
              icon={<QrcodeOutlined />}
              onClick={() => handleGenerateQR(record)}
            />
          </Tooltip>
        </>
      ),
      width: 200,
    },
  ];

  return (
    <Card title="Milestone Rusak" className="p-6">
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <Input
          placeholder="Cari Nomor Dokumen atau Material"
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 300 }}
        />
        <Upload>
          <Button icon={<UploadOutlined />}>Import Data</Button>
        </Upload>
        <div>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loadingData} style={{ marginRight: 8 }}>
            Refresh
          </Button>
          <Button danger onClick={handleDeleteAll} loading={deletingAll}>
            Hapus Semua Data
          </Button>
        </div>
      </div>
      <div style={{ overflowX: 'auto', width: '100%' }}>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={{ pageSize: 50 }}
          scroll={{ x: 2000, y: 400 }}
          style={{ width: '100%' }}
        />
      </div>

      {/* Modal untuk Edit */}
      <Modal
        title="Edit Material"
        visible={isModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="tanggal" label="Tanggal">
            <Input />
          </Form.Item>
          <Form.Item name="nomorWO" label="Nomor WO">
            <Input />
          </Form.Item>
          <Form.Item name="nomorDokumen" label="Nomor Dokumen">
            <Input />
          </Form.Item>
          <Form.Item name="pengembali" label="Pengembali">
            <Input />
          </Form.Item>
          <Form.Item name="petugas" label="Petugas">
            <Input />
          </Form.Item>
          <Form.Item name="kategori" label="Kategori">
            <Input />
          </Form.Item>
          <Form.Item name="materialDescription" label="Material Description">
            <Input />
          </Form.Item>
          <Form.Item name="quantity" label="Quantity">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="satuan" label="Satuan">
            <Input />
          </Form.Item>
          <Form.Item name="kondisi" label="Kondisi">
            <Input />
          </Form.Item>
          <Form.Item name="lokasiPenyimpanan" label="Lokasi Penyimpanan">
            <Input />
          </Form.Item>
          <Form.Item name="catatan" label="Catatan">
            <Input.TextArea />
          </Form.Item>
          <Form.Item name="foto1" label="Foto 1">
            <Input />
          </Form.Item>
          <Form.Item name="foto2" label="Foto 2">
            <Input />
          </Form.Item>
          <Form.Item name="foto3" label="Foto 3">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal untuk QR Code */}
      <Modal
        title="QR Code"
        visible={isQRModalVisible}
        onCancel={() => setIsQRModalVisible(false)}
        footer={null}
      >
        {selectedQRItem && (
          <QRCodeGenerator data={selectedQRItem} />
        )}
      </Modal>
    </Card>
  );
};

export default MilestoneRusak;
