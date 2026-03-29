import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Upload, Input, Tabs, Form, Modal, message, DatePicker, InputNumber, Select, Spin } from 'antd';
import { getDocs, collection, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { UploadOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import moment from 'moment';

const { TabPane } = Tabs;
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
  merek?: string;
  nomorSeri?: string;
  daya?: number;
}

const InventRusak: React.FC = () => {
  const [data, setData] = useState<InventarisItem[]>([]);
  const [filteredData, setFilteredData] = useState<InventarisItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('umum');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<InventarisItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImageURL, setUploadedImageURL] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  // Fetch data from Firebase
  const fetchData = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'inventarisRusak'));
      const items = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as InventarisItem[];
      setData(items);
      setFilteredData(items);
    } catch (error) {
      message.error('Gagal mengambil data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    const lowercaseValue = value.toLowerCase();
    const filtered = data.filter(item =>
      item.nomorDokumen.toLowerCase().includes(lowercaseValue) ||
      item.deskripsiMaterial.toLowerCase().includes(lowercaseValue) ||
      item.normalisasi.toLowerCase().includes(lowercaseValue)
    );
    setFilteredData(filtered);
  };

  const handleOpenModal = (item: InventarisItem | null) => {
    setEditingItem(item);
    if (item) {
      form.setFieldsValue({
        ...item,
        tanggal: item.tanggal ? moment(item.tanggal) : undefined,
      });
    } else {
      form.resetFields();
    }
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
        const docRef = doc(db, 'inventarisRusak', editingItem.id);
        await updateDoc(docRef, updatedValues);
        message.success('Data berhasil diperbarui');
      } else {
        await addDoc(collection(db, 'inventarisRusak'), updatedValues);
        message.success('Data berhasil ditambahkan');
      }
      setIsModalVisible(false);
      setEditingItem(null);
      fetchData();
    } catch (error) {
      message.error('Gagal memperbarui data');
    }
  };

  const handleUpload = (file: any) => {
    setUploadingImage(true);
    setTimeout(() => {
      setUploadedImageURL([URL.createObjectURL(file)]);
      setUploadingImage(false);
    }, 1000);
    return false;
  };

  const handleDownloadTemplate = () => {
    // Functionality to download a template file
    const link = document.createElement('a');
    link.href = '/path-to-your-template-file.xlsx'; // Add path to your template file
    link.download = 'template.xlsx';
    link.click();
  };

  const umumColumns = [
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
      title: 'Aksi',
      key: 'action',
      render: (_: any, record: InventarisItem) => (
        <Button onClick={() => handleOpenModal(record)}>Edit</Button>
      ),
    },
  ];

  const eksklusifColumns = [
    { title: 'Tanggal', dataIndex: 'tanggal', key: 'tanggal', width: 120 },
    { title: 'Nomor Dokumen', dataIndex: 'nomorDokumen', key: 'nomorDokumen', width: 180 },
    { title: 'Normalisasi', dataIndex: 'normalisasi', key: 'normalisasi', width: 150 },
    { title: 'Deskripsi Material', dataIndex: 'deskripsiMaterial', key: 'deskripsiMaterial', width: 200 },
    { title: 'Merek', dataIndex: 'merek', key: 'merek', width: 150 },
    { title: 'Nomor Seri', dataIndex: 'nomorSeri', key: 'nomorSeri', width: 150 },
    { title: 'Daya (kVA)', dataIndex: 'daya', key: 'daya', width: 100 },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 100 },
    { title: 'Satuan', dataIndex: 'satuan', key: 'satuan', width: 100 },
    { title: 'Lokasi Penyimpanan', dataIndex: 'lokasiPenyimpanan', key: 'lokasiPenyimpanan', width: 200 },
    { title: 'Kondisi', dataIndex: 'kondisi', key: 'kondisi', width: 100 },
    { title: 'Keterangan', dataIndex: 'keterangan', key: 'keterangan', width: 200 },
    {
      title: 'Aksi',
      key: 'action',
      render: (_: any, record: InventarisItem) => (
        <Button onClick={() => handleOpenModal(record)}>Edit</Button>
      ),
    },
  ];

  return (
    <Card title="Inventaris Rusak" className="p-6">
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <Input
          placeholder="Cari Nomor Dokumen atau Material"
          prefix={<SearchOutlined />}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 300 }}
        />
        <div>
          <Upload>
            <Button icon={<UploadOutlined />}>Upload Dokumen</Button>
          </Upload>
          <Button
            icon={<DownloadOutlined />}
            style={{ marginLeft: 8 }}
            onClick={handleDownloadTemplate}
          >
            Download Template
          </Button>
          <Button
            type="primary"
            style={{ marginLeft: 8 }}
            onClick={() => handleOpenModal(null)}
          >
            Tambah Material
          </Button>
        </div>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Umum" key="umum">
          <Table
            columns={umumColumns}
            dataSource={filteredData}
            rowKey="id"
            pagination={{ pageSize: 50 }}
            scroll={{ x: 2000, y: 400 }}
            loading={loading}
          />
        </TabPane>
        <TabPane tab="Eksklusif" key="eksklusif">
          <Table
            columns={eksklusifColumns}
            dataSource={filteredData}
            rowKey="id"
            pagination={{ pageSize: 50 }}
            scroll={{ x: 2000, y: 400 }}
            loading={loading}
          />
        </TabPane>
      </Tabs>

      {/* Modal untuk Edit */}
      <Modal
        title={editingItem ? 'Edit Material' : 'Tambah Material'}
        visible={isModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingItem(null);
          form.resetFields();
        }}
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
          {activeTab === 'eksklusif' && (
            <>
              <Form.Item name="merek" label="Merek">
                <Input />
              </Form.Item>
              <Form.Item name="nomorSeri" label="Nomor Seri">
                <Input />
              </Form.Item>
              <Form.Item name="daya" label="Daya (kVA)">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}

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

export default InventRusak;
