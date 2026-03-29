import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message } from 'antd';
import { useAppContext } from '../context/AppContext';

interface WorkOrder {
  id: string;
  nomorWO: string;
  tanggal: string;
  status: 'verified' | 'completed';
  nomorAsset: string;
  deskripsiMaterial: string;
  petugas: string;
  tahunPerolehan: number;
  umurPakai: number;
  nilaiPerolehan: number;
  nilaiMaterial: number;
}

const WOFinalisasiAkuntansi: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [form] = Form.useForm();
  const { user } = useAppContext();

  useEffect(() => {
    // Fetch work orders from API or context
    // This is a placeholder. Replace with actual data fetching logic.
    const mockData: WorkOrder[] = [
      {
        id: '1',
        nomorWO: 'WO001',
        tanggal: '2023-05-15',
        status: 'verified',
        nomorAsset: 'ASSET001',
        deskripsiMaterial: 'Material A',
        petugas: 'John Doe',
        tahunPerolehan: 2020,
        umurPakai: 3,
        nilaiPerolehan: 10000000,
        nilaiMaterial: 8000000,
      },
      // Add more mock data as needed
    ];
    setWorkOrders(mockData);
  }, []);

  const columns = [
    { title: 'Nomor WO', dataIndex: 'nomorWO', key: 'nomorWO' },
    { title: 'Tanggal', dataIndex: 'tanggal', key: 'tanggal' },
    { title: 'Status', dataIndex: 'status', key: 'status' },
    { title: 'Nomor Asset', dataIndex: 'nomorAsset', key: 'nomorAsset' },
    { title: 'Deskripsi Material', dataIndex: 'deskripsiMaterial', key: 'deskripsiMaterial' },
    { title: 'Petugas', dataIndex: 'petugas', key: 'petugas' },
    { title: 'Tahun Perolehan', dataIndex: 'tahunPerolehan', key: 'tahunPerolehan' },
    { title: 'Umur Pakai', dataIndex: 'umurPakai', key: 'umurPakai' },
    { title: 'Nilai Perolehan', dataIndex: 'nilaiPerolehan', key: 'nilaiPerolehan' },
    { title: 'Nilai Material', dataIndex: 'nilaiMaterial', key: 'nilaiMaterial' },
    {
      title: 'Aksi',
      key: 'action',
      render: (text: string, record: WorkOrder) => (
        <Button onClick={() => handleFinalize(record)} disabled={record.status === 'completed' || user?.role !== 'akuntansi'}>
          Finalisasi
        </Button>
      ),
    },
  ];

  const handleFinalize = (wo: WorkOrder) => {
    setSelectedWO(wo);
    setIsModalVisible(true);
    form.setFieldsValue(wo);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      // Update work order status and details
      const updatedWorkOrders = workOrders.map((wo) =>
        wo.id === selectedWO?.id ? { ...wo, status: 'completed', ...values } : wo
      );
      setWorkOrders(updatedWorkOrders);
      setIsModalVisible(false);
      form.resetFields();
      message.success('Work Order berhasil difinalisasi');
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">WO Finalisasi Akuntansi</h1>
      <Table columns={columns} dataSource={workOrders} />
      <Modal
        title="Finalisasi Work Order"
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="tahunPerolehan" label="Tahun Perolehan" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="umurPakai" label="Umur Pakai" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="nilaiPerolehan" label="Nilai Perolehan" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="nilaiMaterial" label="Nilai Material" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="keterangan" label="Keterangan" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WOFinalisasiAkuntansi;