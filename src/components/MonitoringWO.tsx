import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message } from 'antd';
import { useAppContext } from '../context/AppContext';

interface WorkOrder {
  id: string;
  nomorWO: string;
  tanggal: string;
  status: 'pending' | 'verified' | 'completed';
  nomorAsset: string;
  deskripsiMaterial: string;
  petugas: string;
}

const MonitoringWO: React.FC = () => {
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
        status: 'pending',
        nomorAsset: 'ASSET001',
        deskripsiMaterial: 'Material A',
        petugas: 'John Doe',
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
    {
      title: 'Aksi',
      key: 'action',
      render: (text: string, record: WorkOrder) => (
        <Button onClick={() => handleVerify(record)} disabled={record.status !== 'pending' || user?.role !== 'petugas_gudang'}>
          Verifikasi
        </Button>
      ),
    },
  ];

  const handleVerify = (wo: WorkOrder) => {
    setSelectedWO(wo);
    setIsModalVisible(true);
  };

  const handleModalOk = () => {
    form.validateFields().then((values) => {
      // Update work order status and details
      const updatedWorkOrders = workOrders.map((wo) =>
        wo.id === selectedWO?.id ? { ...wo, status: 'verified', ...values } : wo
      );
      setWorkOrders(updatedWorkOrders);
      setIsModalVisible(false);
      form.resetFields();
      message.success('Work Order berhasil diverifikasi');
    });
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Monitoring Work Order</h1>
      <Table columns={columns} dataSource={workOrders} />
      <Modal
        title="Verifikasi Work Order"
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="keterangan" label="Keterangan" rules={[{ required: true, message: 'Mohon isi keterangan' }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MonitoringWO;