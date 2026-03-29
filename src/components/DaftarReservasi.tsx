import React, { useState, useEffect, useMemo } from 'react';
import { 
  Table, Card, message, Button, Modal, Tag, DatePicker, Space,
  Drawer, Progress, Statistic, Typography, Row, Col, Select,
  Timeline, Empty, Alert, Breadcrumb, Tooltip, Input, Dropdown,
  Tabs
} from 'antd';
import { 
  CheckOutlined, FilePdfOutlined, SearchOutlined,
  HomeOutlined, DashboardOutlined, FilterOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CloseOutlined,
  InboxOutlined, ReloadOutlined, CalendarOutlined, EyeOutlined,
  DownOutlined
} from '@ant-design/icons';
import styled from '@emotion/styled';
import { 
  collection, getDocs, doc, updateDoc, query, where, 
  CollectionReference, Query, addDoc, orderBy 
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import logger from '../utils/logger';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import styles from './DaftarReservasi.module.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// Styled Components with modern design
const Container = styled.div`
  padding: 24px;
  background: #f8faff;
  min-height: 100vh;
  max-width: 1600px;
  margin: 0 auto;
  
  .ant-card {
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    border: none;
    margin-bottom: 16px;
    background: white;
    
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    }
  }

  .ant-table-wrapper {
    margin-top: -8px;
  }

  .ant-table {
    background: transparent;
  }

  .ant-table-container {
    border-radius: 12px;
    overflow: hidden;
  }

  .ant-pagination {
    margin-top: 16px;
    padding: 8px 0;
  }

  .ant-input-affix-wrapper {
    border-radius: 8px;
    border: 1px solid #e8e8e8;
    
    &:hover, &:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
    }
  }

  .ant-select {
    .ant-select-selector {
      border-radius: 8px;
      border: 1px solid #e8e8e8;
      
      &:hover {
        border-color: #667eea;
      }
    }
  }

  .ant-picker {
    border-radius: 8px;
    border: 1px solid #e8e8e8;
    
    &:hover {
      border-color: #667eea;
    }
  }
`;

const StyledCard = styled(Card)`
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: none;
  transition: all 0.3s ease;
  margin-bottom: 16px;
  background: white;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  }

  .ant-card-body {
    padding: 16px;
  }

  &.table-card {
    .ant-card-body {
      padding: 0;
    }
  }

  .ant-table-wrapper {
    margin: 0;
  }

  .ant-table-container {
    border-radius: 12px;
    overflow: hidden;
  }

  .ant-table-thead > tr > th {
    background: #f8faff;
    font-weight: 600;
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    
    &::before {
      display: none;
    }
  }

  .ant-table-tbody > tr > td {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  .ant-table-tbody > tr:last-child > td {
    border-bottom: none;
  }
`;

const StatusBadge = styled(Tag)`
  font-weight: 600;
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: none;
`;

// Modern gradient cards with colors from the example
const StatisticCard = styled(Card)`
  border-radius: 16px;
  border: none;
  transition: all 0.3s ease;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  }
  
  .ant-statistic-title {
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
  }
  
  .ant-statistic-content {
    color: white;
    font-weight: 700;
  }
  
  &.total-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  
  &.approved-card {
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  }
  
  &.pending-card {
    background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
    
    .ant-statistic-title {
      color: rgba(0, 0, 0, 0.7);
    }
    
    .ant-statistic-content {
      color: #333;
    }
  }
`;

const ModernTable = styled(Table)`
  .ant-table {
    border-radius: 16px;
    overflow: visible;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  }

  .ant-table-container {
    overflow-x: auto;
    &::-webkit-scrollbar {
      height: 8px;
    }
    &::-webkit-scrollbar-thumb {
      background: #d9d9d9;
      border-radius: 4px;
    }
    &::-webkit-scrollbar-track {
      background: #f0f0f0;
      border-radius: 4px;
    }
  }
  
  .ant-table-thead > tr > th {
    background: #f8faff;
    color: #1a1a1a;
    font-weight: 600;
    border: none;
    padding: 12px 16px;
    font-size: 14px;
    
    &::before {
      display: none;
    }
  }
  
  .ant-table-tbody > tr > td {
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    transition: all 0.3s ease;
  }
  
  .ant-table-tbody > tr {
    transition: all 0.3s ease;
    
    &:hover > td {
      background: #f8faff;
    }
    
    &:last-child > td {
      border-bottom: none;
    }
  }

  .ant-table-column-sorter {
    color: #8c8c8c;
  }

  .ant-table-column-title {
    position: relative;
    z-index: 1;
  }

  .ant-table-filter-trigger {
    color: #8c8c8c;
    
    &:hover {
      color: #1890ff;
    }
  }
`;

const FilterDropdown = styled(Dropdown)`
  .ant-btn {
    border-radius: 8px;
    height: 40px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    border: 1px solid #d9d9d9;
    
    &:hover {
      border-color: #667eea;
      color: #667eea;
    }
  }
`;

// Interfaces
interface Material {
  materialDescription: string;
  normalisasi: string;
  satuan: string;
  qtyPermintaan: number;
  qtyRealisasi?: number;
  status?: 'Pending' | 'Approved' | 'Rejected';
  keterangan?: string;
}

interface Reservasi {
  id: string;
  nomorReservasi: string;
  tanggal: string;
  companyCode: string;
  storageLocationDescription: string;
  fungsi: string;
  pelaksana: string;
  approved: boolean;
  printed: boolean;
  materials: Material[];
  nomorKontrak: string;
  deskripsiPekerjaan: string;
  pemeriksa: string;
  status?: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  approvedAt?: string;
  completionPercentage?: number;
  timeline?: {
    date: string;
    status: string;
    operator: string;
    notes?: string;
  }[];
}

// Helper Functions
const getStatusColor = (status?: string) => {
  switch (status) {
    case 'Approved':
      return 'green';
    case 'Pending':
      return 'orange';
    case 'Rejected':
      return 'red';
    default:
      return 'default';
  }
};

const calculateCompletionPercentage = (materials: Material[]) => {
  if (!materials.length) return 0;
  const approvedCount = materials.filter(m => m.status === 'Approved').length;
  return Math.round((approvedCount / materials.length) * 100);
};

const DaftarReservasi: React.FC = () => {
  // State
  const [reservasi, setReservasi] = useState<Reservasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [selectedReservasi, setSelectedReservasi] = useState<Reservasi | null>(null);
  const [searchDate, setSearchDate] = useState<dayjs.Dayjs | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterPelaksana, setFilterPelaksana] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');

  // Stats
  const stats = useMemo(() => {
    const total = reservasi.length;
    const approved = reservasi.filter(r => r.approved).length;
    const pending = total - approved;
    const completionRate = total ? Math.round((approved / total) * 100) : 0;

    return { total, approved, pending, completionRate };
  }, [reservasi]);

  // Effects - Initialize with today's data
  useEffect(() => {
    const today = dayjs();
    setSearchDate(today);
    fetchReservasi(today);
  }, []);

  // Modern ERP Data Processing
  const fetchReservasi = async (date?: dayjs.Dayjs) => {
    try {
      setLoading(true);
      const reservasiCollection = collection(db, 'daftarReservasi');
      
      // Build query with modern ERP standards
      let reservasiQuery: CollectionReference | Query = query(
        reservasiCollection,
        orderBy('tanggal', 'desc') // Most recent first
      );

      // Apply date filter only if specified
      if (date) {
        const startOfDay = date.startOf('day').toDate();
        const endOfDay = date.endOf('day').toDate();
        reservasiQuery = query(
          reservasiCollection,
          where('tanggal', '>=', startOfDay),
          where('tanggal', '<=', endOfDay),
          orderBy('tanggal', 'desc')
        );
      }

      const reservasiSnapshot = await getDocs(reservasiQuery);
      
      // Process data with ERP standards
      const reservasiList = reservasiSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // Normalize date handling
        let normalizedDate: string;
        if (data.tanggal?.toDate) {
          normalizedDate = data.tanggal.toDate().toISOString();
        } else if (data.tanggal instanceof Date) {
          normalizedDate = data.tanggal.toISOString();
        } else if (typeof data.tanggal === 'string') {
          normalizedDate = new Date(data.tanggal).toISOString();
        } else {
          normalizedDate = new Date().toISOString();
        }

        return {
          id: doc.id,
          ...data,
          tanggal: normalizedDate,
          completionPercentage: calculateCompletionPercentage(data.materials || []),
          status: data.approved ? 'Approved' : 'Pending',
          timeline: data.timeline || [
            {
              date: normalizedDate,
              status: 'Created',
              operator: 'System',
              notes: 'Reservasi dibuat'
            }
          ]
        } as Reservasi;
      });

      // Sort by date descending (most recent first)
      const sortedList = reservasiList.sort((a, b) => 
        new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
      );

      setReservasi(sortedList);
      
      // Log for debugging
      logger.info(`Fetched ${sortedList.length} reservasi records`, {
        dateFilter: date ? date.format('YYYY-MM-DD') : 'all',
        recordCount: sortedList.length
      });
      
    } catch (error) {
      logger.error('Error fetching reservasi:', error);
      message.error('Gagal mengambil data reservasi');
      setReservasi([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleApprove = (record: Reservasi) => {
    setSelectedReservasi(record);
    setApproveModalVisible(true);
  };

  const confirmApprove = async () => {
    if (!selectedReservasi) return;

    try {
      const reservasiRef = doc(db, 'daftarReservasi', selectedReservasi.id);
      const now = new Date().toISOString();
      
      await updateDoc(reservasiRef, {
        approved: true,
        approvedBy: 'Current User', // Replace with actual user
        approvedAt: now,
        status: 'Approved',
        timeline: [
          ...(selectedReservasi.timeline || []),
          {
            date: now,
            status: 'Approved',
            operator: 'Current User', // Replace with actual user
            notes: 'Reservasi disetujui'
          }
        ]
      });

      message.success('Reservasi berhasil diapprove');
      setApproveModalVisible(false);
      if (searchDate) {
        fetchReservasi(searchDate);
      } else {
        fetchReservasi();
      }
    } catch (error) {
      logger.error('Error approving reservasi:', error);
      message.error('Gagal mengapprove reservasi');
    }
  };

  const handleDateSearch = (date: dayjs.Dayjs | null) => {
    setSearchDate(date);
    if (date) {
      fetchReservasi(date);
    } else {
      fetchReservasi();
    }
  };

  const handleShowDetail = (record: Reservasi) => {
    setSelectedReservasi(record);
    setDrawerVisible(true);
  };

  const handlePrint = (record: Reservasi) => {
    const printContent = `
      <html>
        <head>
          <title>Print Reservasi</title>
          <style>
            @media print {
              @page {
                size: A4 landscape;
                margin: 10mm;
              }
            }
            body {
              font-family: 'Arial', sans-serif;
              font-size: 14px;
              color: #333;
              margin: 0;
              padding: 10px;
            }
            .container {
              max-width: 100%;
              margin: 0 auto;
              padding: 10px;
              background-color: #f9f9f9;
              border-radius: 10px;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 20px;
            }
            .header img {
              width: 70px;
              height: 30px;
              margin-right: 15px;
            }
            .header-text {
              flex-grow: 1;
            }
            .header-text h1 {
              font-size: 14px;
              margin: 0;
              font-weight: bold;
            }
            .header-text p {
              font-size: 14px;
              margin: 3px 0;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 4px;
              text-align: left;
            }
            th {
              background-color: #4CAF50;
              color: white;
            }
            tr:hover {
              background-color: #f1f1f1;
            }
            .footer {
              display: flex;
              justify-content: flex-end;
              align-items: center;
              margin-top: 10px;
              position: relative;
              height: 100px;
            }
            .signature {
              text-align: right;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .signature img {
              width: 60px;
              height: 60px;
              margin-bottom: 5px;
            }
            .signature p {
              margin: 0;
              font-size: 12px;
              text-align: center;
            }
            .page-number {
              display: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="/src/assets/Logo_PLN.svg.png" alt="PLN Logo"/>
              <div class="header-text">                
                <h1>Reservasi Kebutuhan Material</h1>
                <p>No: ${record.nomorReservasi}</p>
              </div>
            </div>
            <table>
              <tr>
                <th>Tanggal</th>
                <td>${dayjs(record.tanggal).format('DD/MM/YYYY')}</td>
                <th>Company Code</th>
                <td>${record.companyCode}</td>
              </tr>
              <tr>
                <th>Storage Location</th>
                <td>${record.storageLocationDescription}</td>
                <th>Fungsi</th>
                <td>${record.fungsi}</td>
              </tr>
            </table>
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Material Description</th>
                  <th>Normalisasi</th>
                  <th>Satuan</th>
                  <th>QTY Permintaan</th>
                  <th>QTY Diberikan</th>
                  <th>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                ${record.materials
                  .map(
                    (material, index) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td>${material.materialDescription}</td>
                      <td>${material.normalisasi}</td>
                      <td>${material.satuan}</td>
                      <td>${material.qtyPermintaan}</td>
                      <td>${material.qtyRealisasi || ''}</td>
                      <td>${material.keterangan || ''}</td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
            <p><strong>Pelaksanaan:</strong> ${record.pelaksana}</p>
            <p><strong>Nomor Kontrak:</strong> ${record.nomorKontrak}</p>
            <p><strong>Pekerjaan:</strong> ${record.deskripsiPekerjaan}</p>
            <div class="footer">
              <div class="signature">
                <p>${dayjs().format('DD MMMM YYYY')}</p>
                <p><strong>PEMERIKSA</strong></p>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${record.pemeriksa}" alt="QR Code"/>
                <p>${record.pemeriksa}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } else {
      message.error('Gagal membuka jendela cetak. Pastikan pop-up tidak diblokir oleh browser Anda.');
    }
  };

  // Filtered data
  const filteredData = useMemo(() => {
    let data = reservasi;

    // Filter by active filter (dropdown selection)
    if (activeFilter === 'pending') {
      data = data.filter(item => !item.approved);
    } else if (activeFilter === 'approved') {
      data = data.filter(item => item.approved);
    }

    return data.filter(item => {
      // Filter by status
      if (filterStatus.length && !filterStatus.includes(item.status || 'Pending')) {
        return false;
      }
      // Filter by pelaksana
      if (filterPelaksana.length && !filterPelaksana.includes(item.pelaksana)) {
        return false;
      }
      // Filter by search text (kontrak, nomor reservasi, pekerjaan)
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchesNomor = item.nomorReservasi.toLowerCase().includes(searchLower);
        const matchesKontrak = item.nomorKontrak.toLowerCase().includes(searchLower);
        const matchesPekerjaan = item.deskripsiPekerjaan.toLowerCase().includes(searchLower);
        
        if (!matchesNomor && !matchesKontrak && !matchesPekerjaan) {
          return false;
        }
      }
      return true;
    });
  }, [reservasi, activeFilter, filterStatus, filterPelaksana, searchText]);

  // Dropdown menu for filter selection
  const filterMenu = {
    items: [
      {
        key: 'all',
        label: (
          <Space>
            <InboxOutlined />
            Semua Reservasi ({reservasi.length})
          </Space>
        ),
        onClick: () => setActiveFilter('all'),
      },
      {
        key: 'pending',
        label: (
          <Space>
            <ClockCircleOutlined />
            Menunggu Approval ({reservasi.filter(r => !r.approved).length})
          </Space>
        ),
        onClick: () => setActiveFilter('pending'),
      },
      {
        key: 'approved',
        label: (
          <Space>
            <CheckCircleOutlined />
            Sudah Disetujui ({reservasi.filter(r => r.approved).length})
          </Space>
        ),
        onClick: () => setActiveFilter('approved'),
      },
    ],
  };

  const getFilterLabel = () => {
    switch (activeFilter) {
      case 'pending':
        return (
          <Space>
            <ClockCircleOutlined />
            Menunggu Approval ({reservasi.filter(r => !r.approved).length})
          </Space>
        );
      case 'approved':
        return (
          <Space>
            <CheckCircleOutlined />
            Sudah Disetujui ({reservasi.filter(r => r.approved).length})
          </Space>
        );
      default:
        return (
          <Space>
            <InboxOutlined />
            Semua Reservasi ({reservasi.length})
          </Space>
        );
    }
  };

  // Render functions
  const renderDrawerContent = () => {
    if (!selectedReservasi) return null;

    return (
      <div>
        <StyledCard>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Text strong>Nomor Reservasi:</Text>
              <div>{selectedReservasi.nomorReservasi}</div>
            </Col>
            <Col span={12}>
              <Text strong>Tanggal:</Text>
              <div>{dayjs(selectedReservasi.tanggal).format('DD/MM/YYYY')}</div>
            </Col>
            <Col span={12}>
              <Text strong>Pelaksana:</Text>
              <div>{selectedReservasi.pelaksana}</div>
            </Col>
            <Col span={12}>
              <Text strong>Status:</Text>
              <div>
                <StatusBadge color={getStatusColor(selectedReservasi.status)}>
                  {selectedReservasi.status || 'Pending'}
                </StatusBadge>
              </div>
            </Col>
            <Col span={12}>
              <Text strong>Company Code:</Text>
              <div>{selectedReservasi.companyCode}</div>
            </Col>
            <Col span={12}>
              <Text strong>Storage Location:</Text>
              <div>{selectedReservasi.storageLocationDescription}</div>
            </Col>
            <Col span={24}>
              <Text strong>Deskripsi Pekerjaan:</Text>
              <div>{selectedReservasi.deskripsiPekerjaan}</div>
            </Col>
          </Row>
        </StyledCard>

        <Tabs defaultActiveKey="materials">
          <TabPane tab="Materials" key="materials">
            <Table
              dataSource={selectedReservasi.materials}
              columns={[
                {
                  title: 'Material Description',
                  dataIndex: 'materialDescription',
                  key: 'materialDescription',
                },
                {
                  title: 'Normalisasi',
                  dataIndex: 'normalisasi',
                  key: 'normalisasi',
                },
                {
                  title: 'Satuan',
                  dataIndex: 'satuan',
                  key: 'satuan',
                },
                {
                  title: 'Qty Permintaan',
                  dataIndex: 'qtyPermintaan',
                  key: 'qtyPermintaan',
                },
                {
                  title: 'Qty Realisasi',
                  dataIndex: 'qtyRealisasi',
                  key: 'qtyRealisasi',
                  render: (value: any) => value || '-',
                },
                {
                  title: 'Status',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status: string) => (
                    <StatusBadge color={getStatusColor(status)}>
                      {status || 'Pending'}
                    </StatusBadge>
                  ),
                },
              ]}
              pagination={false}
              size="small"
            />
          </TabPane>
          <TabPane tab="Timeline" key="timeline">
            <Timeline>
              {selectedReservasi.timeline?.map((item, index) => (
                <Timeline.Item key={index}>
                  <Text strong>{item.status}</Text>
                  <br />
                  <Text type="secondary">
                    <CalendarOutlined style={{ marginRight: 8 }} />
                    {dayjs(item.date).format('DD/MM/YYYY HH:mm')}
                  </Text>
                  <br />
                  <Text>Operator: {item.operator}</Text>
                  {item.notes && (
                    <>
                      <br />
                      <Text type="secondary">{item.notes}</Text>
                    </>
                  )}
                </Timeline.Item>
              ))}
            </Timeline>
          </TabPane>
          <TabPane tab="Realisasi per Pelaksana" key="realization">
            <Alert
              message="Realisasi Material"
              description="Tab ini menampilkan detail realisasi pengambilan material berdasarkan pelaksana."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card size="small">
                  <Statistic
                    title="Progress Realisasi"
                    value={selectedReservasi.completionPercentage || 0}
                    suffix="%"
                    prefix={<CheckCircleOutlined />}
                  />
                  <Progress 
                    percent={selectedReservasi.completionPercentage || 0}
                    status={selectedReservasi.approved ? 'success' : 'active'}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </div>
    );
  };

  return (
    <Container>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item href="/">
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item>Daftar Reservasi</Breadcrumb.Item>
      </Breadcrumb>

      {/* Stats Cards */}
      <StyledCard>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <StatisticCard className="total-card">
              <Statistic
                title="Total Reservasi"
                value={stats.total}
                prefix={<InboxOutlined />}
              />
            </StatisticCard>
          </Col>
          <Col xs={24} sm={8}>
            <StatisticCard className="approved-card">
              <Statistic
                title="Approved"
                value={stats.approved}
                prefix={<CheckCircleOutlined />}
              />
            </StatisticCard>
          </Col>
          <Col xs={24} sm={8}>
            <StatisticCard className="pending-card">
              <Statistic
                title="Pending"
                value={stats.pending}
                prefix={<ClockCircleOutlined />}
              />
            </StatisticCard>
          </Col>
        </Row>
      </StyledCard>

      {/* Filters */}
      <StyledCard className="filter-card">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} lg={8}>
            <Input.Search
              placeholder="Cari nomor reservasi..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
              style={{ width: '100%' }}
            />
          </Col>
          <Col xs={24} lg={6}>
            <DatePicker.RangePicker
              onChange={(dates) => {
                if (dates && dates[0]) {
                  setSearchDate(dates[0]);
                  fetchReservasi(dates[0]);
                } else {
                  setSearchDate(null);
                  fetchReservasi();
                }
              }}
              style={{ width: '100%' }}
              size="large"
              format="DD/MM/YYYY"
              placeholder={['Tanggal Awal', 'Tanggal Akhir']}
            />
          </Col>
          <Col xs={24} sm={4}>
            <Select
              mode="multiple"
              placeholder="Filter status"
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={setFilterStatus}
              size="large"
              options={[
                { label: 'Pending', value: 'Pending' },
                { label: 'Approved', value: 'Approved' },
                { label: 'Rejected', value: 'Rejected' },
              ]}
            />
          </Col>
          <Col xs={24} sm={4}>
            <Select
              mode="multiple"
              placeholder="Filter pelaksana"
              style={{ width: '100%' }}
              value={filterPelaksana}
              onChange={setFilterPelaksana}
              size="large"
              options={[...new Set(reservasi.map(r => r.pelaksana))].map(p => ({
                label: p,
                value: p,
              }))}
            />
          </Col>
          <Col xs={24} sm={4}>
            <Button 
              type="primary"
              icon={<FilterOutlined />}
              size="large"
              style={{ borderRadius: '8px', width: '100%' }}
              onClick={() => {
                setSearchDate(null);
                setSearchText('');
                setFilterStatus([]);
                setFilterPelaksana([]);
                setActiveFilter('all');
                fetchReservasi();
              }}
            >
              Reset Filter
            </Button>
          </Col>
        </Row>
      </StyledCard>

      {/* Modern Table Section */}
      <StyledCard bodyStyle={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <FilterDropdown menu={filterMenu} trigger={['click']}>
            <Button type="default" size="middle" style={{ 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              height: '36px',
              boxShadow: 'none',
              border: '1px solid #e8e8e8'
            }}>
              {getFilterLabel()}
              <DownOutlined style={{ fontSize: '12px' }} />
            </Button>
          </FilterDropdown>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Menampilkan {filteredData.length} dari {reservasi.length} reservasi
          </Text>
        </div>

        <ModernTable 
          dataSource={filteredData}
          columns={[
            {
              title: 'Nomor Reservasi',
              dataIndex: 'nomorReservasi',
              key: 'nomorReservasi',
              render: (text: string) => <Text strong>{text}</Text>,
              sorter: (a: any, b: any) => a.nomorReservasi.localeCompare(b.nomorReservasi),
              width: 150,
            },
            {
              title: 'Tanggal',
              dataIndex: 'tanggal',
              key: 'tanggal',
              render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
              sorter: (a: any, b: any) => dayjs(a.tanggal).unix() - dayjs(b.tanggal).unix(),
              width: 120,
            },
            {
              title: 'Kontrak',
              dataIndex: 'nomorKontrak',
              key: 'nomorKontrak',
              render: (text: string) => (
                <Text ellipsis={{ tooltip: text }}>
                  {text}
                </Text>
              ),
              sorter: (a: any, b: any) => a.nomorKontrak.localeCompare(b.nomorKontrak),
              width: 150,
            },
            {
              title: 'Pekerjaan',
              dataIndex: 'deskripsiPekerjaan',
              key: 'deskripsiPekerjaan',
              render: (text: string) => (
                <Text ellipsis={{ tooltip: text }}>
                  {text.length > 50 ? `${text.substring(0, 50)}...` : text}
                </Text>
              ),
              sorter: (a: any, b: any) => a.deskripsiPekerjaan.localeCompare(b.deskripsiPekerjaan),
              width: 200,
            },
            {
              title: 'Pelaksana',
              dataIndex: 'pelaksana',
              key: 'pelaksana',
              sorter: (a: any, b: any) => a.pelaksana.localeCompare(b.pelaksana),
              width: 150,
            },
            {
              title: 'Status',
              key: 'status',
              render: (_: any, record: any) => (
                <StatusBadge color={getStatusColor((record as Reservasi).status)}>
                  {(record as Reservasi).status || 'Pending'}
                </StatusBadge>
              ),
              filters: [
                { text: 'Pending', value: 'Pending' },
                { text: 'Approved', value: 'Approved' },
                { text: 'Rejected', value: 'Rejected' },
              ],
              onFilter: (value: any, record: any) => (record as Reservasi).status === value,
              width: 100,
            },
            {
              title: 'Actions',
              key: 'actions',
              render: (_: any, record: any) => (
                <Space>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApprove(record as Reservasi);
                    }}
                    disabled={(record as Reservasi).approved}
                    style={{ borderRadius: '6px' }}
                  >
                    Approve
                  </Button>
                  <Button
                    type="default"
                    size="small"
                    icon={<FilePdfOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrint(record as Reservasi);
                    }}
                    disabled={!(record as Reservasi).approved}
                    style={{ borderRadius: '6px' }}
                  >
                    Print
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowDetail(record as Reservasi);
                    }}
                    style={{ borderRadius: '6px' }}
                  >
                    Detail
                  </Button>
                </Space>
              ),
              width: 200,
              fixed: 'right',
            },
          ]}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total: any, range: any) => `${range[0]}-${range[1]} dari ${total} items`,
            style: { 
              marginTop: '16px',
              padding: '8px 0'
            },
            itemRender: (page, type, originalElement) => {
              if (type === 'prev') {
                return <Button type="text" size="small">Previous</Button>;
              }
              if (type === 'next') {
                return <Button type="text" size="small">Next</Button>;
              }
              return originalElement;
            }
          }}
          scroll={{ x: 1200 }}
          onRow={(record: any) => ({
            onClick: () => handleShowDetail(record),
            style: { cursor: 'pointer' }
          })}
          size="middle"
        />
      </StyledCard>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <Text strong>Detail Reservasi:</Text>
            <Text>{selectedReservasi?.nomorReservasi}</Text>
          </Space>
        }
        width={900}
        open={drawerVisible}
        onCancel={() => setDrawerVisible(false)}
        footer={null}
        centered
        style={{ borderRadius: '12px' }}
      >
        {renderDrawerContent()}
      </Modal>

      {/* Approve Modal */}
      <Modal
        title="Konfirmasi Persetujuan"
        open={approveModalVisible}
        onOk={confirmApprove}
        onCancel={() => setApproveModalVisible(false)}
        okText="Setujui"
        cancelText="Batal"
        centered
        style={{ borderRadius: '12px' }}
      >
        <p>Apakah Anda yakin ingin menyetujui reservasi ini?</p>
      </Modal>
    </Container>
  );
};

export default DaftarReservasi;
