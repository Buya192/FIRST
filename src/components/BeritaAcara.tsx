import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  message,
  Card,
  Modal,
  Form,
  Input,

  DatePicker,
  Space,
  Row,
  Col,
  Typography,

} from 'antd';
import {
  PrinterOutlined,


  PlusOutlined,
} from '@ant-design/icons';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import dayjs from 'dayjs';
import 'dayjs/locale/id';



const { TextArea } = Input;
const { Title } = Typography;

dayjs.locale('id');

interface Material {
  materialDescription: string;
  normalisasi: string;
  valuationType: string;
  qtyPermintaan: number;
  qtyAmbil: number;
  merek: string;
  satuan: string;
}

interface WorkOrder {
  id: string;
  nomorWO: string;
  nomorReservasi: string;
  tanggal: string;
  pelaksana: string;
  nomorKontrak?: string;
  pekerjaan?: string;
  fungsi?: string;
  materials: Material[];
}

interface BeritaAcaraData {
  id?: string;
  nomorBA: string;
  tanggal: string;
  nomorWO: string;
  nomorReservasi: string;
  nomorKontrak: string;
  pekerjaan: string;
  lokasi: string;
  pelaksana: string;
  pihakPertama: string;
  pihakKedua: string;
  materials: Material[];
  catatan?: string;
  createdAt: string;
}

const BeritaAcara: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [beritaAcaraList, setBeritaAcaraList] = useState<BeritaAcaraData[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [selectedBA, setSelectedBA] = useState<BeritaAcaraData | null>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('list');

  useEffect(() => {
    fetchCompletedWorkOrders();
    fetchBeritaAcaraList();
  }, []);

  const fetchCompletedWorkOrders = async () => {
    setLoading(true);
    try {
      // Ambil data dari MR Realization yang sudah completed
      const mrRealizationRef = collection(db, 'mrRealization');
      const querySnapshot = await getDocs(mrRealizationRef);
      
      const completedWOs: WorkOrder[] = [];
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        
        // Check if BA already exists for this WO
        const beritaAcaraRef = collection(db, 'beritaAcara');
        const baQuery = query(beritaAcaraRef, where('nomorWO', '==', data.nomorWO || doc.id));
        const baSnapshot = await getDocs(baQuery);
        
        // Only include if BA doesn't exist yet
        if (baSnapshot.empty) {
          completedWOs.push({
            id: doc.id,
            nomorWO: data.nomorWO || doc.id,
            nomorReservasi: data.nomorReservasi || '',
            tanggal: data.tglPengambilan || data.tanggal || '',
            pelaksana: data.pelaksana || '',
            nomorKontrak: data.nomorKontrak || '',
            pekerjaan: data.pekerjaan || '',
            fungsi: data.fungsi || '',
            materials: data.materials || [],
          });
        }
      }
      
      setWorkOrders(completedWOs);
    } catch (error) {
      console.error('Error fetching completed work orders:', error);
      message.error('Gagal mengambil data work orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchBeritaAcaraList = async () => {
    try {
      const beritaAcaraRef = collection(db, 'beritaAcara');
      const querySnapshot = await getDocs(beritaAcaraRef);
      
      const baList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as BeritaAcaraData[];
      
      setBeritaAcaraList(baList);
    } catch (error) {
      console.error('Error fetching berita acara list:', error);
      message.error('Gagal mengambil daftar berita acara');
    }
  };

  const generateNomorBA = (): string => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    // Convert month to Roman numeral
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const romanMonth = romanMonths[month - 1];
    
    // Generate sequence number (this should be incremented based on existing BAs)
    const sequence = (beritaAcaraList.length + 1).toString().padStart(3, '0');
    
    return `${sequence}/LOG.KUANINO/UP3KUP/${romanMonth}/${year}`;
  };

  const handleCreateBA = (workOrder: WorkOrder) => {
    setSelectedWO(workOrder);
    const nomorBA = generateNomorBA();
    
    form.setFieldsValue({
      nomorBA,
      tanggal: dayjs(),
      nomorWO: workOrder.nomorWO,
      nomorReservasi: workOrder.nomorReservasi,
      nomorKontrak: workOrder.nomorKontrak,
      pekerjaan: workOrder.pekerjaan,
      lokasi: 'Univ. Pertahanan Atambua',
      pelaksana: workOrder.pelaksana,
      pihakPertama: 'TL.LOGISTIK UP3 KUPANG',
      pihakKedua: 'PT. NAPTUN TEKNIK',
    });
    
    setModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (!selectedWO) {
        message.error('Work Order tidak ditemukan');
        return;
      }

      const beritaAcaraData: BeritaAcaraData = {
        nomorBA: values.nomorBA,
        tanggal: values.tanggal.toISOString(),
        nomorWO: values.nomorWO,
        nomorReservasi: values.nomorReservasi,
        nomorKontrak: values.nomorKontrak,
        pekerjaan: values.pekerjaan,
        lokasi: values.lokasi,
        pelaksana: values.pelaksana,
        pihakPertama: values.pihakPertama,
        pihakKedua: values.pihakKedua,
        materials: selectedWO.materials,
        catatan: values.catatan || '',
        createdAt: new Date().toISOString(),
      };

      // Save to Firestore
      const beritaAcaraRef = collection(db, 'beritaAcara');
      await addDoc(beritaAcaraRef, beritaAcaraData);

      message.success('Berita Acara berhasil dibuat');
      setModalVisible(false);
      form.resetFields();
      
      // Refresh data
      fetchCompletedWorkOrders();
      fetchBeritaAcaraList();
    } catch (error) {
      console.error('Error creating berita acara:', error);
      message.error('Gagal membuat berita acara');
    }
  };

  const handlePrint = (ba: BeritaAcaraData) => {
    setSelectedBA(ba);
    setPrintModalVisible(true);
  };

  const handlePrintDocument = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && selectedBA) {
      const printContent = generatePrintContent(selectedBA);
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const generatePrintContent = (ba: BeritaAcaraData): string => {
    const materialsTable = ba.materials.map((material, index) => `
      <tr>
        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
        <td style="border: 1px solid #000; padding: 8px;">${material.materialDescription}</td>
        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${material.qtyAmbil}</td>
        <td style="border: 1px solid #000; padding: 8px; text-align: center;">${material.satuan || 'PCS'}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Berita Acara Serah Terima Barang</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { float: right; margin-bottom: 20px; }
          .title { font-size: 18px; font-weight: bold; text-align: center; margin: 20px 0; }
          .content { margin: 20px 0; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .table th, .table td { border: 1px solid #000; padding: 8px; }
          .signature { margin-top: 50px; }
          .signature-box { display: inline-block; width: 45%; text-align: center; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <img src="/src/assets/Logo_PLN.svg.png" alt="PLN Logo" style="height: 60px;">
            <div style="text-align: center; margin-top: 10px;">
              <strong>PLN</strong><br>
              <small>UIW NUSA TENGGARA TIMUR</small><br>
              <strong>UP3 KUPANG</strong>
            </div>
          </div>
          <div style="clear: both;"></div>
        </div>

        <div class="title">
          BERITA ACARA<br>
          SERAH TERIMA BARANG<br>
          <strong>NOMOR: ${ba.nomorBA}</strong>
        </div>

        <div class="content">
          <p>Pada Hari ini ${dayjs(ba.tanggal).format('dddd')} Tanggal ${dayjs(ba.tanggal).format('DD MMMM YYYY')}, kami yang bertandatangan dibawah ini sudah melakukan pengambilan Material Distribusi Utama dengan Nomor: <strong>${ba.nomorWO}</strong> tanggal ${dayjs(ba.tanggal).format('DD MMMM YYYY')}, kontrak: <strong>${ba.nomorKontrak}</strong></p>
          
          <p>Pekerjaan ${ba.pekerjaan} ke ${ba.lokasi}, sebagai berikut:</p>

          <table class="table">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th>NO</th>
                <th>NAMA MATERIAL</th>
                <th>JUMLAH</th>
                <th>SATUAN</th>
              </tr>
            </thead>
            <tbody>
              ${materialsTable}
            </tbody>
          </table>

          <p>Diambil di lokasi Logistik KUANINO Diangkut dengan jenis kendaraan TRUK.</p>

          <div style="margin: 30px 0;">
            <strong>Catatan:</strong>
            <ol>
              <li>Material yang sudah diambil dalam kondisi baik</li>
              <li>Material yang sudah diambil merupakan tanggungjawab dari Pihak Kedua (Vendor Pelaksana) apabila terjadi kehilangan dan kerusakan.</li>
            </ol>
          </div>

          <div class="signature">
            <div class="signature-box">
              <strong>PIHAK PERTAMA</strong><br>
              <strong>${ba.pihakPertama}</strong><br><br><br><br>
              <strong>(ADRIANUS HITO)</strong>
            </div>
            <div class="signature-box" style="float: right;">
              <strong>PIHAK KEDUA</strong><br>
              <strong>${ba.pihakKedua}</strong><br><br><br><br>
              <strong>(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</strong>
            </div>
            <div style="clear: both;"></div>
          </div>
        </div>

        <div style="margin-top: 50px; font-size: 12px;">
          <hr>
          Jalan Palapa No. 27 Oebobo, Kupang 85111, Nusa Tenggara Timur
        </div>
      </body>
      </html>
    `;
  };

  const workOrderColumns = [
    {
      title: 'Nomor WO',
      dataIndex: 'nomorWO',
      key: 'nomorWO',
    },
    {
      title: 'Nomor Reservasi',
      dataIndex: 'nomorReservasi',
      key: 'nomorReservasi',
    },
    {
      title: 'Tanggal',
      dataIndex: 'tanggal',
      key: 'tanggal',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Pelaksana',
      dataIndex: 'pelaksana',
      key: 'pelaksana',
    },
    {
      title: 'Pekerjaan',
      dataIndex: 'pekerjaan',
      key: 'pekerjaan',
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_: any, record: WorkOrder) => (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleCreateBA(record)}
        >
          Buat BA
        </Button>
      ),
    },
  ];

  const beritaAcaraColumns = [
    {
      title: 'Nomor BA',
      dataIndex: 'nomorBA',
      key: 'nomorBA',
    },
    {
      title: 'Tanggal',
      dataIndex: 'tanggal',
      key: 'tanggal',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Nomor WO',
      dataIndex: 'nomorWO',
      key: 'nomorWO',
    },
    {
      title: 'Pelaksana',
      dataIndex: 'pelaksana',
      key: 'pelaksana',
    },
    {
      title: 'Pekerjaan',
      dataIndex: 'pekerjaan',
      key: 'pekerjaan',
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_: any, record: BeritaAcaraData) => (
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          onClick={() => handlePrint(record)}
        >
          Cetak
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '16px' }}>
          <Space>
            <Button
              type={activeTab === 'list' ? 'primary' : 'default'}
              onClick={() => setActiveTab('list')}
            >
              Daftar Berita Acara
            </Button>
            <Button
              type={activeTab === 'create' ? 'primary' : 'default'}
              onClick={() => setActiveTab('create')}
            >
              Buat Berita Acara
            </Button>
          </Space>
        </div>

        {activeTab === 'list' && (
          <div>
            <Title level={4}>Daftar Berita Acara</Title>
            <Table
              columns={beritaAcaraColumns}
              dataSource={beritaAcaraList}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </div>
        )}

        {activeTab === 'create' && (
          <div>
            <Title level={4}>Work Orders Siap untuk Berita Acara</Title>
            <Table
              columns={workOrderColumns}
              dataSource={workOrders}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </div>
        )}
      </Card>

      {/* Modal for creating Berita Acara */}
      <Modal
        title="Buat Berita Acara Serah Terima Barang"
        visible={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={800}
        okText="Simpan"
        cancelText="Batal"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="nomorBA"
                label="Nomor Berita Acara"
                rules={[{ required: true, message: 'Nomor BA harus diisi' }]}
              >
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tanggal"
                label="Tanggal"
                rules={[{ required: true, message: 'Tanggal harus diisi' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nomorWO" label="Nomor WO">
                <Input disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nomorReservasi" label="Nomor Reservasi">
                <Input disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="nomorKontrak" label="Nomor Kontrak">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lokasi" label="Lokasi">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="pekerjaan" label="Pekerjaan">
            <Input />
          </Form.Item>

          <Form.Item name="pelaksana" label="Pelaksana">
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="pihakPertama" label="Pihak Pertama">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="pihakKedua" label="Pihak Kedua">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="catatan" label="Catatan Tambahan">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Print Preview Modal */}
      <Modal
        title="Preview Berita Acara"
        visible={printModalVisible}
        onCancel={() => setPrintModalVisible(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setPrintModalVisible(false)}>
            Tutup
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrintDocument}>
            Cetak
          </Button>,
        ]}
      >
        {selectedBA && (
          <div style={{ maxHeight: '500px', overflow: 'auto' }}>
            <div dangerouslySetInnerHTML={{ __html: generatePrintContent(selectedBA) }} />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BeritaAcara;
