import React, { useState, useEffect } from 'react';
import { Form, Input, DatePicker, InputNumber, Button, Select, message, Card, Row, Col, Table, Tooltip, Popconfirm } from 'antd';
import { PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../utils/firebase';

const { Option } = Select;

interface MaterialData {
  normalisasi: string;
  materialDescription: string;
  satuan: string;
  hargaSatuan: number;
}

interface MaterialEntry {
  key: string;
  kategori: string;
  normalisasi: string;
  materialDescription: string;
  satuan: string;
  quantity: number;
  nilaiMaterial: number;
  kondisi: string;
  keterangan: string;
}

const PengembalianMaterial: React.FC = () => {
  const [form] = Form.useForm();
  const [materialEntries, setMaterialEntries] = useState<MaterialEntry[]>([]);
  const [masterMaterialData, setMasterMaterialData] = useState<MaterialData[]>([]);
  const { getMasterMaterialData, addWorkOrder } = useAppContext();

  useEffect(() => {
    const fetchMasterData = async () => {
      if (getMasterMaterialData) {
        try {
          const data = await getMasterMaterialData();
          setMasterMaterialData(data);
        } catch (error) {
          message.error('Gagal memuat data master material. Silakan coba lagi nanti.');
        }
      }
    };
    fetchMasterData();
  }, [getMasterMaterialData]);

  const handleNormalisasiChange = (value: string) => {
    const materialData = masterMaterialData.find((m) => m.normalisasi === value);
    if (materialData) {
      form.setFieldsValue({
        materialDescription: materialData.materialDescription,
        satuan: materialData.satuan,
      });
    } else {
      form.setFieldsValue({
        materialDescription: '',
        satuan: '',
        nilaiMaterial: null,
      });
    }
  };

  const handleQuantityChange = (value: number | null) => {
    const normalisasi = form.getFieldValue('normalisasi');
    const materialData = masterMaterialData.find((m) => m.normalisasi === normalisasi);
    if (materialData && value) {
      const nilaiMaterial = value * materialData.hargaSatuan;
      form.setFieldsValue({ nilaiMaterial });
    } else {
      form.setFieldsValue({ nilaiMaterial: null });
    }
  };

  const addMaterial = () => {
    form.validateFields().then((values) => {
      const newEntry: MaterialEntry = {
        key: Date.now().toString(),
        kategori: values.kategori,
        normalisasi: values.normalisasi,
        materialDescription: values.materialDescription,
        satuan: values.satuan,
        quantity: values.quantity,
        nilaiMaterial: values.nilaiMaterial,
        kondisi: values.kondisi,
        keterangan: values.keterangan,
      };
      setMaterialEntries([...materialEntries, newEntry]);
      form.resetFields(['kategori', 'normalisasi', 'materialDescription', 'satuan', 'quantity', 'nilaiMaterial']);
    });
  };

  const deleteMaterial = (key: string) => {
    setMaterialEntries(materialEntries.filter((entry) => entry.key !== key));
  };

  const saveMaterialToMilestone = async (material: MaterialEntry) => {
    const dataToSave = {
      tanggal: form.getFieldValue('tanggal').format('YYYY-MM-DD'),
      nomorDokumen: form.getFieldValue('nomorDokumen'),
      normalisasi: material.normalisasi,
      deskripsiMaterial: material.materialDescription,
      quantity: material.quantity,
      satuan: material.satuan,
      merek: material.kategori === 'Material Eksklusif' ? 'Unknown' : '',
      nomorSeri: material.kategori === 'Material Eksklusif' ? 'Unknown' : '',
      daya: material.kategori === 'Material Eksklusif' ? 0 : null,
      lokasiPenyimpanan: 'Unknown',
      kondisi: material.kondisi,
      pengembali: form.getFieldValue('pengembali'),
      foto: [],
      dokumen: 'Unknown',
    };

    try {
      if (material.kondisi === 'Baik') {
        await addDoc(collection(db, 'milestoneBaik'), dataToSave);
        message.success('Data berhasil disimpan ke Milestone Baik');
      } else if (material.kondisi === 'Rusak') {
        await addDoc(collection(db, 'milestoneRusak'), dataToSave);
        message.success('Data berhasil disimpan ke Milestone Rusak');
      }
    } catch (error) {
      message.error('Gagal menyimpan data');
    }
  };

  const handleSubmitWO = async () => {
    if (materialEntries.length === 0) {
      message.error('Tidak ada material yang ditambahkan.');
      return;
    }

    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const nomorWO = `WO001${day}${month}${year}`;

    materialEntries.forEach(saveMaterialToMilestone);

    const duplicatedMaterials = materialEntries.flatMap((entry) =>
      entry.kategori === 'Material Eksklusif'
        ? Array(entry.quantity).fill({ ...entry, quantity: 1 })
        : [entry]
    );

    const workOrderData = {
      nomorWO,
      tanggal: new Date().toISOString().split('T')[0],
      status: 'pending' as 'pending',
      nomorDokumen: form.getFieldValue('nomorDokumen'),
      deskripsiMaterial: duplicatedMaterials.map((m) => m.materialDescription).join(', '),
      pengembali: form.getFieldValue('pengembali'),
      keterangan: form.getFieldValue('keterangan'),
      petugas: 'Petugas Logistik',
      kategori: materialEntries[0]?.kategori,
      materials: duplicatedMaterials,
    };

    try {
      const docRef = await addDoc(collection(db, 'workOrders'), workOrderData);
      const updatedWorkOrderData = { ...workOrderData, id: docRef.id };
      addWorkOrder(updatedWorkOrderData);
      message.success(`Work Order ${nomorWO} berhasil dikirim ke Petugas.`);
      setMaterialEntries([]);
      form.resetFields();
    } catch (error) {
      console.error('Error saving work order:', error);
      message.error('Gagal menyimpan Work Order. Silakan coba lagi.');
    }
  };

  const columns = [
    { title: 'Kategori', dataIndex: 'kategori', key: 'kategori' },
    { title: 'Normalisasi', dataIndex: 'normalisasi', key: 'normalisasi' },
    { title: 'Deskripsi Material', dataIndex: 'materialDescription', key: 'materialDescription' },
    { title: 'Satuan', dataIndex: 'satuan', key: 'satuan' },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
    { title: 'Nilai Material', dataIndex: 'nilaiMaterial', key: 'nilaiMaterial' },
    {
      title: 'Kondisi',
      dataIndex: 'kondisi',
      key: 'kondisi',
      render: (text: string, record: MaterialEntry) => (
        <Select value={text} onChange={(value) => handleKondisiChange(record.key, value)}>
          <Option value="Baik">Baik</Option>
          <Option value="Rusak">Rusak</Option>
        </Select>
      ),
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_: any, record: MaterialEntry) => (
        <Popconfirm title="Yakin ingin menghapus?" onConfirm={() => deleteMaterial(record.key)}>
          <Button type="link" danger>
            Hapus
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const handleKondisiChange = (key: string, kondisi: string) => {
    const updatedMaterials = materialEntries.map((entry) =>
      entry.key === key ? { ...entry, kondisi } : entry
    );
    setMaterialEntries(updatedMaterials);
  };

  return (
    <Card title="Pengembalian Material" className="p-6">
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="tanggal" label="Tanggal" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="nomorDokumen" label="Nomor Dokumen" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="normalisasi" label="Normalisasi" rules={[{ required: true }]}>
              <Input onChange={(e) => handleNormalisasiChange(e.target.value)} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="materialDescription" label="Deskripsi Material">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="satuan" label="Satuan">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="quantity"
              label="Quantity"
              rules={[
                {
                  required: true,
                  validator: (_, value) => {
                    const kategori = form.getFieldValue('kategori');
                    if (kategori === 'Material Eksklusif' && value > 1) {
                      return Promise.reject('Quantity untuk Material Eksklusif tidak boleh lebih dari 1');
                    }
                    return Promise.resolve();
                  },
                },
              ]}
            >
              <InputNumber style={{ width: '100%' }} onChange={handleQuantityChange} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="nilaiMaterial" label="Nilai Material">
              <InputNumber style={{ width: '100%' }} disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="kategori"
              label={
                <span>
                  Kategori{' '}
                  <Tooltip title="Material Eksklusif adalah material yang membutuhkan Nomor Seri seperti trafo, cubicle, dll.">
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </span>
              }
              rules={[{ required: true }]}
            >
              <Select>
                <Option value="Material Umum">Material Umum</Option>
                <Option value="Material Eksklusif">Material Eksklusif</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button type="dashed" onClick={addMaterial} block icon={<PlusOutlined />}>
            Tambah Material
          </Button>
        </Form.Item>

        <Table columns={columns} dataSource={materialEntries} rowKey="key" />

        <Form.Item name="pengembali" label="Pengembali" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item name="keterangan" label="Keterangan" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" onClick={handleSubmitWO}>
            Simpan dan Kirim WO
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default PengembalianMaterial;
