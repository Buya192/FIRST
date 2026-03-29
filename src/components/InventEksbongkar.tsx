import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Upload, Input, Tooltip, Form, Modal, message, DatePicker, InputNumber, Select, Popconfirm, Spin } from 'antd';
import { getDocs, collection, updateDoc, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { EditOutlined, DeleteOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Option } = Select;

interface InventarisItem {
  id?: string;
  tanggal: string;
  nomorDokumen: string;
  normalisasi: string;
  deskripsiMaterial: string;
  quantity: number;
  satuan: string;
  lokasiPenyimpanan: string;
  kondisi: string;
  keterangan: string;
  foto: string[];
  // Eksklusif fields
  merek?: string;
  nomorSeri?: string;
  daya?: number;
  tahunPembuatan?: number;
  beratTotal?: number;
  beratMinyak?: number;
  nomorLabel?: string;
}

const InventEksbongkar: React.FC = () => {
  const [data, setData] = useState<InventarisItem[]>([]);
  const [filteredData, setFilteredData] = useState<InventarisItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventarisItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageURL, setUploadedImageURL] = useState<string[]>([]);
  const [form] = Form.useForm();

  // Fetch data from Firebase
  const fetchData = async () => {
    const querySnapshot = await getDocs(collection(db, 'inventarisEksBongkar'));
    const items = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as InventarisItem[];
    setData(items);
    setFilteredData(items);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const filtered = data.filter(item =>
      item.nomorDokumen.toLowerCase().includes(value.toLowerCase()) ||
      item.deskripsiMaterial.toLowerCase().includes(value.toLowerCase()) ||
      item.normalisasi.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredData(filtered);
  };

  const handleEdit = (item: InventarisItem) => {
    setEditingItem(item);
    form.setFieldsValue({
      ...item,
      tanggal: moment(item.tanggal),
    });
    setIsModalVisible(true);
  };

  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields();
      const updatedValues = {
        ...values,
        tanggal: values.tanggal.format('YYYY-MM-DD'),
        foto: uploadedImageURL,
      };
      if (editingItem?.id) {
        const docRef = doc(db, 'inventarisEksBongkar', editingItem.id);
        await updateDoc(docRef, updatedValues);
        message.success('Data berhasil diperbarui');
      } else {
        await addDoc(collection(db, 'inventarisEksBongkar'), updatedValues);
        message.success('Data berhasil ditambahkan');
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('Gagal memperbarui data');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const docRef = doc(db, 'inventarisEksBongkar', id);
      await deleteDoc(docRef);
      message.success('Data berhasil dihapus');
      fetchData();
    } catch (error) {
      message.error('Gagal menghapus data');
    }
  };

  const handleDeleteAll = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inventarisEksBongkar'));
      const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      message.success('Semua data berhasil dihapus');
      fetchData();
    } catch (error) {
      message.error('Gagal menghapus semua data');
    }
  };

  const handleUpload = (file: any) => {
    setUploadingImage(true);
    // Simulate upload and set image URL
    setTimeout(() => {
      setUploadedImageURL([URL.createObjectURL(file)]);
      setUploadingImage(false);
    }, 1000);
    return false; // Prevent auto-upload
  };

  const columns = [
    { title: 'Tanggal', dataIndex: 'tanggal', key: 'tanggal', width: 120 },
    { title: 'Nomor Dokumen', dataIndex: 'nomorDokumen', key: 'nomorDokumen', width: 180 },
    { title: 'Normalisasi', dataIndex: 'normalisasi', key: 'normalisasi', width: 150 },
    { title: 'Deskripsi Material', dataIndex: 'deskripsiMaterial', key: 'deskripsiMaterial', width: 200 },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 100 },
    { title: 'Satuan', dataIndex: 'satuan', key: 'satuan', width: 100 },
    { title: 'Lokasi Penyimpanan', dataIndex: 'lokasiPenyimpanan', key: 'lokasiPenyimpanan', width: 200 },
    { title: 'Kondisi', dataIndex: 'kondisi', key: 'kondisi', width: 100 },
    { title: 'Keterangan', dataIndex: 'keterangan', key: 'keterangan', width: 200 },
    {
      title: 'Foto',
      dataIndex: 'foto',
      key: 'foto',
      render: (foto: string[]) => (
        foto?.length ? <img src={foto[0]} alt="Foto" style={{ width: 50, height: 50, objectFit: 'cover' }} /> : <span>Tidak ada foto</span>
      ),
      width: 100,
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_: any, record: InventarisItem) => (
        <>
          <Tooltip title="Edit">
            <Button icon={<EditOutlined />} style={{ marginRight: 8 }} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Popconfirm title="Hapus data ini?" onConfirm={() => handleDelete(record.id!)}>
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
    <Card title="Inventaris Eks Bongkar" className="p-6">
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <Input
          placeholder="Cari Nomor Dokumen atau Material"
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 300 }}
        />
        <Upload>
          <Button icon={<UploadOutlined />}>Upload Dokumen</Button>
        </Upload>
        <div>
          <Button type="primary" onClick={() => setIsModalVisible(true)} style={{ marginRight: 8 }}>Tambah Baru</Button>
          <Button danger onClick={handleDeleteAll}>Delete Semua Data</Button>
        </div>
      </div>
      <Table columns={columns} dataSource={filteredData} rowKey="id" pagination={{ pageSize: 50 }} scroll={{ x: 2000, y: 400 }} />

      {/* Modal untuk Edit */}
      <Modal
        title={editingItem ? 'Edit Material' : 'Tambah Material'}
        visible={isModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => setIsModalVisible(false)}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="tanggal" label="Tanggal" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="nomorDokumen" label="Nomor Dokumen" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="normalisasi" label="Normalisasi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="deskripsiMaterial" label="Deskripsi Material" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="satuan" label="Satuan" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="lokasiPenyimpanan" label="Lokasi Penyimpanan">
            <Input />
          </Form.Item>
          <Form.Item name="kondisi" label="Kondisi">
            <Select>
              <Option value="Baik">Baik</Option>
              <Option value="Rusak">Rusak</Option>
            </Select>
          </Form.Item>
          <Form.Item name="keterangan" label="Keterangan">
            <Input.TextArea rows={3} />
          </Form.Item>

          {/* Eksklusif Fields */}
          <Form.Item name="merek" label="Merek">
            <Input />
          </Form.Item>
          <Form.Item name="nomorSeri" label="Nomor Seri">
            <Input />
          </Form.Item>
          <Form.Item name="daya" label="Daya (kVA)">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="tahunPembuatan" label="Tahun Pembuatan">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="beratTotal" label="Berat Total">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="beratMinyak" label="Berat Minyak">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="nomorLabel" label="Nomor Label">
            <Input />
          </Form.Item>

          <Form.Item label="Upload Foto">
            <Upload beforeUpload={handleUpload} listType="picture" multiple>
              <Button icon={<UploadOutlined />}>Upload Foto</Button>
            </Upload>
            {uploadingImage && <Spin />}
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default InventEksbongkar;
