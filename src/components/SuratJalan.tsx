import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  message,
  Card,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Row,
  Col,
  Typography,
} from 'antd';
import {
  PrinterOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

const { Option } = Select;
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

interface SuratJalanData {
  id?: string;
  nomorSJ: string;
  tanggal: string;
  nomorWO: string;
  nomorReservasi: string;
  nomorKontrak: string;
  pekerjaan: string;
  tujuan: string;
  pelaksana: string;
  yangMengangkut: string;
  petugasGudang: string;
  jenisKendaraan: string;
  nomorPolisi: string;
  materials: Material[];
  catatan?: string;
  createdAt: string;
}

const SuratJalan: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [suratJalanList, setSuratJalanList] = useState<SuratJalanData[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('list');

  useEffect(() => {
    fetchCompletedWorkOrders();
    fetchSuratJalanList();
  }, []);

  const fetchCompletedWorkOrders = async () => {
    setLoading(true);
    try {
      const mrRealizationRef = collection(db, 'mrRealization');
      const querySnapshot = await getDocs(mrRealizationRef);
      
      const completedWOs: WorkOrder[] = [];
      
      for (const doc of querySnapshot.docs) {
        const data = doc.data();
        
        if (data.approvalStatus === 'Approved') {
          try {
            const suratJalanRef = collection(db, 'suratJalan');
            const sjQuery = query(suratJalanRef, where('nomorWO', '==', data.nomorWO || doc.id));
            const sjSnapshot = await getDocs(sjQuery);
            
            if (sjSnapshot.empty) {
              completedWOs.push({
                id: doc.id,
                nomorWO: data.nomorWO || doc.id,
                nomorReservasi: data.nomorReservasi || '',
                tanggal: data.tglPengambilan || data.tanggal || '',
                pelaksana: data.pelaksana || '',
                nomorKontrak: data.nomorKontrak || '002.spbj/up3-kupang/2024',
                pekerjaan: data.pekerjaan || '',
                fungsi: data.fungsi || '',
                materials: data.materials || [],
              });
            }
          } catch (queryError) {
            console.warn('Error checking existing Surat Jalan for WO:', data.nomorWO, queryError);
            completedWOs.push({
              id: doc.id,
              nomorWO: data.nomorWO || doc.id,
              nomorReservasi: data.nomorReservasi || '',
              tanggal: data.tglPengambilan || data.tanggal || '',
              pelaksana: data.pelaksana || '',
              nomorKontrak: data.nomorKontrak || '002.spbj/up3-kupang/2024',
              pekerjaan: data.pekerjaan || '',
              fungsi: data.fungsi || '',
              materials: data.materials || [],
            });
          }
        }
      }
      
      setWorkOrders(completedWOs);
    } catch (error) {
      console.error('Error fetching completed work orders:', error);
      message.error('Gagal mengambil data work orders: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchSuratJalanList = async () => {
    try {
      const suratJalanRef = collection(db, 'suratJalan');
      const querySnapshot = await getDocs(suratJalanRef);
      
      const sjList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as SuratJalanData[];
      
      setSuratJalanList(sjList);
    } catch (error) {
      console.error('Error fetching surat jalan list:', error);
      message.error('Gagal mengambil daftar surat jalan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const generateNomorSJ = (): string => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const romanMonth = romanMonths[month - 1];
    
    const sequence = (suratJalanList.length + 1).toString().padStart(3, '0');
    
    return `${sequence}/SJ.KUANINO/UP3KUP/${romanMonth}/${year}`;
  };

  const handleCreateSJ = (workOrder: WorkOrder) => {
    setSelectedWO(workOrder);
    const nomorSJ = generateNomorSJ();
    
    form.setFieldsValue({
      nomorSJ,
      tanggal: dayjs(),
      nomorWO: workOrder.nomorWO,
      nomorReservasi: workOrder.nomorReservasi,
      nomorKontrak: workOrder.nomorKontrak || '002.spbj/up3-kupang/2024',
      pekerjaan: workOrder.pekerjaan,
      tujuan: 'Univ. Pertahanan Atambua',
      pelaksana: workOrder.pelaksana,
      yangMengangkut: 'PT. NAPTUN TEKNIK',
      petugasGudang: 'ADRIANUS HITO',
      jenisKendaraan: 'TRUK',
      nomorPolisi: '',
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

      if (!values.nomorSJ || !values.tanggal || !values.nomorWO) {
        message.error('Field wajib harus diisi');
        return;
      }

      const suratJalanData: SuratJalanData = {
        nomorSJ: values.nomorSJ,
        tanggal: values.tanggal.toISOString(),
        nomorWO: values.nomorWO,
        nomorReservasi: values.nomorReservasi || '',
        nomorKontrak: values.nomorKontrak || '002.spbj/up3-kupang/2024',
        pekerjaan: values.pekerjaan || '',
        tujuan: values.tujuan || 'Univ. Pertahanan Atambua',
        pelaksana: values.pelaksana || '',
        yangMengangkut: values.yangMengangkut || 'PT. NAPTUN TEKNIK',
        petugasGudang: values.petugasGudang || 'ADRIANUS HITO',
        jenisKendaraan: values.jenisKendaraan || 'TRUK',
        nomorPolisi: values.nomorPolisi || '',
        materials: selectedWO.materials || [],
        catatan: values.catatan || '',
        createdAt: new Date().toISOString(),
      };

      const suratJalanRef = collection(db, 'suratJalan');
      await addDoc(suratJalanRef, suratJalanData);

      message.success('Surat Jalan berhasil dibuat');
      setModalVisible(false);
      form.resetFields();
      setSelectedWO(null);
      
      await fetchCompletedWorkOrders();
      await fetchSuratJalanList();
    } catch (error) {
      console.error('Error creating surat jalan:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          message.error('Tidak memiliki izin untuk membuat surat jalan');
        } else if (error.message.includes('network')) {
          message.error('Masalah koneksi jaringan. Silakan coba lagi.');
        } else {
          message.error('Gagal membuat surat jalan: ' + error.message);
        }
      } else {
        message.error('Gagal membuat surat jalan: Terjadi kesalahan yang tidak diketahui');
      }
    }
  };

  const handlePrint = (sj: SuratJalanData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Popup diblokir. Silakan izinkan popup untuk mencetak.');
      return;
    }
    
    const templateHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Surat Jalan - ${sj.nomorSJ}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #333; background: white; max-width: 210mm; margin: 0 auto; padding: 15mm; }
          .document-container { width: 100%; min-height: 297mm; background: white; position: relative; }
          .header-section { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #1e40af; }
          .company-info { text-align: left; }
          .company-name { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 2px; }
          .company-subtitle { font-size: 11px; color: #666; margin-bottom: 1px; }
          .company-unit { font-size: 16px; font-weight: bold; color: #1e40af; }
          .document-number { text-align: right; font-size: 11px; color: #666; }
          .document-number strong { color: #1e40af; font-size: 12px; }
          .document-title { text-align: center; margin: 25px 0; }
          .title-main { font-size: 18px; font-weight: bold; color: #1e40af; letter-spacing: 1px; margin-bottom: 8px; }
          .title-sub { font-size: 14px; color: #666; font-weight: normal; }
          .info-section { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #1e40af; }
          .date-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; }
          .date-item { display: flex; align-items: center; gap: 8px; }
          .date-label { font-weight: 500; color: #666; }
          .date-value { font-weight: bold; color: #1e40af; }
          .document-info { margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
          .document-info h4 { font-size: 13px; font-weight: bold; color: #1e40af; margin-bottom: 8px; }
          .document-details { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; }
          .detail-item { font-size: 11px; }
          .detail-label { font-weight: 500; color: #666; }
          .detail-value { font-weight: bold; color: #333; }
          .material-section { margin: 25px 0; }
          .section-title { font-size: 14px; font-weight: bold; color: #1e40af; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0; }
          .material-table { width: 100%; border-collapse: collapse; border: 2px solid #1e40af; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .material-table th { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; font-weight: bold; padding: 12px 8px; text-align: center; font-size: 11px; border-bottom: 2px solid #1e40af; }
          .material-table td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; vertical-align: top; }
          .material-row:nth-child(even) { background-color: #f8fafc; }
          .text-center { text-align: center; }
          .material-desc { font-weight: 500; color: #333; }
          .keterangan { font-style: italic; color: #666; }
          .transport-info { background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9; }
          .transport-info p { margin-bottom: 8px; font-size: 12px; }
          .transport-info strong { color: #0ea5e9; }
          .signature-section { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
          .signature-date { text-align: right; margin-bottom: 30px; font-size: 12px; color: #666; }
          .signature-date strong { color: #1e40af; }
          .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 20px; }
          .signature-box { text-align: center; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa; }
          .signature-title { font-weight: bold; font-size: 12px; color: #1e40af; margin-bottom: 50px; }
          .signature-name { font-weight: bold; font-size: 11px; color: #333; border-top: 1px solid #333; padding-top: 5px; margin-top: 40px; }
          .signature-role { font-size: 10px; color: #666; margin-top: 5px; }
          .footer { margin-top: 40px; padding-top: 15px; border-top: 2px solid #1e40af; text-align: center; font-size: 10px; color: #666; }
          .footer-address { font-weight: 500; margin-bottom: 5px; }
          .footer-contact { font-size: 9px; }
          @media print { body { margin: 0; padding: 10mm; font-size: 11px; } .document-container { box-shadow: none; border: none; } .material-table { box-shadow: none; } .signature-box { border: 1px solid #333; background: white; } }
          @page { size: A4; margin: 10mm; }
        </style>
      </head>
      <body>
        <div class="document-container">
          <div class="header-section">
            <div class="company-info">
              <div class="company-name">PLN</div>
              <div class="company-subtitle">UIW NUSA TENGGARA TIMUR</div>
              <div class="company-unit">UP3 KUPANG</div>
            </div>
            <div class="document-number">
              <strong>Nomor: ${sj.nomorSJ}</strong><br>
              <span>Tanggal: ${dayjs(sj.tanggal).format('DD/MM/YYYY')}</span>
            </div>
          </div>
          
          <div class="document-title">
            <div class="title-main">TANDA TERIMA MATERIAL DARI GUDANG</div>
            <div class="title-sub">Material Delivery Receipt</div>
          </div>
          
          <div class="info-section">
            <div class="date-info">
              <div class="date-item">
                <span class="date-label">Pada hari ini:</span>
                <span class="date-value">${dayjs(sj.tanggal).format('dddd')}</span>
              </div>
              <div class="date-item">
                <span class="date-label">Tanggal:</span>
                <span class="date-value">${dayjs(sj.tanggal).format('DD.MM.YYYY')}</span>
              </div>
              <div class="date-item">
                <span class="date-label">Jam:</span>
                <span class="date-value">${dayjs(sj.tanggal).format('HH:mm')} WITA</span>
              </div>
            </div>
            
            <div class="document-info">
              <h4>Telah diterima material sesuai:</h4>
              <div class="document-details">
                <div class="detail-item">
                  <span class="detail-label">• Nomor SPM:</span>
                  <span class="detail-value">${sj.nomorWO}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">• Nomor Kontrak:</span>
                  <span class="detail-value">${sj.nomorKontrak}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">• Pekerjaan:</span>
                  <span class="detail-value">${sj.pekerjaan}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">• Tujuan:</span>
                  <span class="detail-value">${sj.tujuan}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="material-section">
            <div class="section-title">Daftar Material</div>
            <table class="material-table">
              <thead>
                <tr>
                  <th style="width: 8%;">NO</th>
                  <th style="width: 40%;">NAMA MATERIAL</th>
                  <th style="width: 12%;">SATUAN</th>
                  <th style="width: 12%;">VOLUME</th>
                  <th style="width: 28%;">KETERANGAN</th>
                </tr>
              </thead>
              <tbody>
                ${sj.materials.map((material, index) => `
                  <tr class="material-row">
                    <td class="text-center">${index + 1}</td>
                    <td class="material-desc">${material.materialDescription}</td>
                    <td class="text-center">${material.satuan || 'PCS'}</td>
                    <td class="text-center">${material.qtyAmbil}</td>
                    <td class="keterangan">Perubahan Daya ke 555kVA lokasi Univ.Pertahanan Atambua</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="transport-info">
            <p><strong>Dari Gudang PDP:</strong> Kuanino - Dalam keadaan <strong>BAIK dan GENAP</strong></p>
            <p><strong>Diangkut dengan kendaraan Nomor Polisi:</strong> ${sj.nomorPolisi || '_______________'}</p>
            <p><strong>Jenis Kendaraan:</strong> ${sj.jenisKendaraan}</p>
          </div>
          
          <div class="signature-section">
            <div class="signature-date">
              Kupang, <strong>${dayjs(sj.tanggal).format('DD MMMM YYYY')}</strong>
            </div>
            
            <div class="signature-grid">
              <div class="signature-box">
                <div class="signature-title">YANG MENGANGKUT</div>
                <div class="signature-name">${sj.yangMengangkut}</div>
                <div class="signature-role">Pihak Pelaksana</div>
              </div>
              
              <div class="signature-box">
                <div class="signature-title">PETUGAS GUDANG</div>
                <div class="signature-name">${sj.petugasGudang}</div>
                <div class="signature-role">PLN UP3 Kupang</div>
              </div>
            </div>
          </div>
          
          <div class="footer">
            <div class="footer-address">
              Jalan Palapa No. 27 Oebobo, Kupang 85111, Nusa Tenggara Timur
            </div>
            <div class="footer-contact">
              Website: www.pln.co.id/ntt | Fax: (0380) 832198 | Telp: (0380) 821217
            </div>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 1000);
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(templateHTML);
    printWindow.document.close();
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
          icon={<TruckOutlined />}
          onClick={() => handleCreateSJ(record)}
        >
          Buat Surat Jalan
        </Button>
      ),
    },
  ];

  const suratJalanColumns = [
    {
      title: 'Nomor Surat Jalan',
      dataIndex: 'nomorSJ',
      key: 'nomorSJ',
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
      title: 'Tujuan',
      dataIndex: 'tujuan',
      key: 'tujuan',
    },
    {
      title: 'Yang Mengangkut',
      dataIndex: 'yangMengangkut',
      key: 'yangMengangkut',
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (_: any, record: SuratJalanData) => (
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
              Daftar Surat Jalan
            </Button>
            <Button
              type={activeTab === 'create' ? 'primary' : 'default'}
              onClick={() => setActiveTab('create')}
            >
              Buat Surat Jalan
            </Button>
          </Space>
        </div>

        {activeTab === 'list' && (
          <div>
            <Title level={4}>Daftar Surat Jalan</Title>
            <Table
              columns={suratJalanColumns}
              dataSource={suratJalanList}
              loading={loading}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </div>
        )}

        {activeTab === 'create' && (
          <div>
            <Title level={4}>Work Orders Siap untuk Surat Jalan</Title>
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

      <Modal
        title="Buat Surat Jalan"
        visible={modalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
          setSelectedWO(null);
        }}
        width={800}
        okText="Simpan"
        cancelText="Batal"
        confirmLoading={loading}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="nomorSJ"
                label="Nomor Surat Jalan"
                rules={[{ required: true, message: 'Nomor Surat Jalan harus diisi' }]}
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
              <Form.Item name="tujuan" label="Tujuan">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="pekerjaan" label="Pekerjaan">
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="yangMengangkut" label="Yang Mengangkut">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="petugasGudang" label="Petugas Gudang">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="jenisKendaraan" label="Jenis Kendaraan">
                <Select>
                  <Option value="TRUK">TRUK</Option>
                  <Option value="MOBIL">MOBIL</Option>
                  <Option value="MOTOR">MOTOR</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="nomorPolisi" 
                label="Nomor Polisi"
                rules={[{ required: true, message: 'Nomor Polisi harus diisi' }]}
              >
                <Input placeholder="Contoh: DH 1234 AB" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="catatan" label="Catatan Tambahan">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SuratJalan;
