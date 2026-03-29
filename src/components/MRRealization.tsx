import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, Tag, Timeline, Table, Drawer, Progress,
  Button, message, Space, Statistic, Select, DatePicker,
  Row, Col, Typography, Breadcrumb, Collapse, Tabs, Empty, Alert
} from 'antd';
import { RangePickerProps } from 'antd/lib/date-picker';
import styled from '@emotion/styled';
import { 
  FileExcelOutlined, NumberOutlined, ClockCircleOutlined,
  CheckCircleOutlined, WarningOutlined, HomeOutlined,
  FilterOutlined, CalendarOutlined, InboxOutlined, ReloadOutlined
} from '@ant-design/icons';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import styles from './MRRealization.module.css';

// Tipe untuk material dari WOFulfillment
interface WOFulfillmentMaterial {
  materialDescription: string;
  normalisasi: string;
  valuationType: string;
  qtyPermintaan?: number;
  qtyAmbil: number;
  merek?: string;
  satuan?: string;
  foto1?: string;
  foto2?: string;
  foto3?: string;
  nomorSeri?: string;
  tahun?: string;
}

// Tipe untuk data MR Realization (sesuai dengan data dari WOFulfillment)
interface MRRealizationData {
  id: string;
  nomorWO: string;
  nomorReservasi: string;
  tanggal: string;
  tglPengambilan?: string;
  submittedAt?: string;
  nomorKontrak?: string;
  pekerjaan?: string;
  fungsi?: string;
  pelaksana: string;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  submittedBy?: string;
  category?: 'Umum' | 'Eksklusif';
  materials: WOFulfillmentMaterial[];
  // Computed fields for display
  status?: 'Completed' | 'Pending' | 'Rejected';
  completionPercentage?: number;
  timeline?: {
    date: string;
    status: string;
    operator: string;
    notes?: string;
  }[];
}

// Styled components
const StyledCard = styled(Card)`
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-radius: 16px;
  margin-bottom: 24px;
  border: none;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
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

const ProgressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 120px;
`;

const StatusContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterContainer = styled.div`
  margin-bottom: 24px;
`;

const StatisticCard = styled(Card)`
  margin-bottom: 16px;
  border-radius: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(102, 126, 234, 0.3);
  }
  
  .ant-card-body {
    padding: 24px;
  }
  
  .ant-statistic-title {
    color: rgba(255, 255, 255, 0.8);
    font-weight: 500;
    margin-bottom: 8px;
  }
  
  .ant-statistic-content {
    color: white;
  }
`;

const TimelineItem = styled(Timeline.Item)`
  padding: 16px;
  
  .ant-timeline-item-content {
    margin-left: 16px;
  }
`;

const HeaderCard = styled(StyledCard)`
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  
  .ant-card-body {
    padding: 24px 32px;
  }
`;

const { Panel } = Collapse;
const { TabPane } = Tabs;

// Fungsi utilitas
const getStatusColor = (status?: string) => {
  switch (status) {
    case 'Completed':
    case 'Approved':
      return 'green';
    case 'In Progress':
      return 'blue';
    case 'Pending':
      return 'orange';
    case 'Rejected':
      return 'red';
    case 'Draft':
      return 'default';
    case 'Accepted':
      return 'purple';
    default:
      return 'default';
  }
};

// Fungsi untuk transform data dari WOFulfillment ke format display
const transformMRData = (rawData: any): MRRealizationData => {
  const transformed: MRRealizationData = {
    id: rawData.id,
    nomorWO: rawData.nomorWO || '',
    nomorReservasi: rawData.nomorReservasi || '',
    tanggal: rawData.tanggal || rawData.tglPengambilan || '',
    tglPengambilan: rawData.tglPengambilan,
    submittedAt: rawData.submittedAt,
    nomorKontrak: rawData.nomorKontrak || '',
    pekerjaan: rawData.pekerjaan || '',
    fungsi: rawData.fungsi || '',
    pelaksana: rawData.pelaksana || '',
    approvalStatus: rawData.approvalStatus || 'Pending',
    submittedBy: rawData.submittedBy,
    category: rawData.category || 'Umum',
    materials: rawData.materials || [],
    // Computed fields
    status: rawData.approvalStatus === 'Approved' ? 'Completed' : 
           rawData.approvalStatus === 'Rejected' ? 'Rejected' : 'Pending',
    completionPercentage: rawData.approvalStatus === 'Approved' ? 100 : 
                         rawData.approvalStatus === 'Pending' ? 50 : 0,
    timeline: [
      {
        date: rawData.submittedAt || rawData.tanggal || new Date().toISOString(),
        status: 'Submitted',
        operator: rawData.submittedBy || 'System',
        notes: 'Material submitted for approval'
      },
      ...(rawData.approvalStatus === 'Approved' ? [{
        date: new Date().toISOString(),
        status: 'Approved',
        operator: 'TL Logistik',
        notes: 'Material approved'
      }] : []),
      ...(rawData.approvalStatus === 'Rejected' ? [{
        date: new Date().toISOString(),
        status: 'Rejected',
        operator: 'TL Logistik',
        notes: 'Material rejected'
      }] : [])
    ]
  };

  return transformed;
};

// Komponen MRRealization
const MRRealization: React.FC = () => {
  const [mrData, setMrData] = useState<MRRealizationData[]>([]);
  const [selectedMR, setSelectedMR] = useState<MRRealizationData | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<('Completed' | 'Pending' | 'Rejected')[]>([]);
  const [filterCategory, setFilterCategory] = useState<('Umum' | 'Eksklusif')[]>([]);
  const [filterDateRange, setFilterDateRange] = useState<[string, string]>(['', '']);
  const [loading, setLoading] = useState(true);

  const handleDateChange: RangePickerProps['onChange'] = (_dates, dateStrings: [string, string]) => {
    if (dateStrings) {
      setFilterDateRange(dateStrings);
    }
  };

  // Fungsi untuk mengambil data MR dari collection mrRealization
  const fetchMrData = async () => {
    try {
      setLoading(true);

      // Log current user info for debugging
      const authModule = await import('firebase/auth');
      const user = authModule.getAuth().currentUser;
      console.log('Current user:', user?.email);

      const mrRef = collection(db, 'mrRealization');
      const q = query(mrRef, orderBy('submittedAt', 'desc'));
      const querySnapshot = await getDocs(q);

      console.log('Firestore querySnapshot size:', querySnapshot.size);
      
      const data: MRRealizationData[] = [];
      querySnapshot.forEach((doc) => {
        const rawData = { id: doc.id, ...doc.data() };
        console.log('Raw document data:', rawData);
        
        // Transform data to match display format
        const transformedData = transformMRData(rawData);
        data.push(transformedData);
      });
      
      setMrData(data);
      console.log('Transformed MR data:', data);
      
      // Show info message if no data found
      if (data.length === 0) {
        console.log('No MR data found in Firestore');
      }
    } catch (error) {
      message.error('Failed to fetch MR data');
      console.error('Error fetching MR data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk membuka detail MR
  const showMrDetail = (mr: MRRealizationData) => {
    setSelectedMR(mr);
    setDrawerVisible(true);
  };

  // Fungsi untuk menutup drawer
  const onCloseDrawer = () => {
    setSelectedMR(null);
    setDrawerVisible(false);
  };

  // Fungsi untuk menerapkan filter
  const applyFilters = (data: MRRealizationData[]) => {
    return data.filter((mr) => {
      // Filter tanggal
      if (filterDateRange[0] && filterDateRange[1]) {
        const startDate = dayjs(filterDateRange[0]);
        const endDate = dayjs(filterDateRange[1]);
        const mrDate = dayjs(mr.tanggal);
        if (mrDate.isBefore(startDate) || mrDate.isAfter(endDate)) {
          return false;
        }
      }

      // Filter status
      if (filterStatus.length > 0 && mr.status && !filterStatus.includes(mr.status)) {
        return false;
      }

      // Filter category
      if (filterCategory.length > 0 && mr.category && !filterCategory.includes(mr.category)) {
        return false;
      }

      return true;
    });
  };

  // Fungsi untuk export ke Excel
  const exportToExcel = () => {
    const exportData = filteredData.map(mr => ({
      'Nomor WO': mr.nomorWO,
      'Nomor Reservasi': mr.nomorReservasi,
      'Tanggal': dayjs(mr.tanggal).format('DD/MM/YYYY'),
      'Pelaksana': mr.pelaksana,
      'Status': mr.status,
      'Category': mr.category,
      'Completion': `${mr.completionPercentage || 0}%`,
      'Materials Count': mr.materials?.length || 0
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MR Realization');
    XLSX.writeFile(wb, 'mr_realization.xlsx');
  };

  // Fungsi untuk menghitung statistik
  const calculateStats = (data: MRRealizationData[]) => {
    return {
      total: data.length,
      completed: data.filter(mr => mr.status === 'Completed').length,
      pending: data.filter(mr => mr.status === 'Pending').length,
      approved: data.filter(mr => mr.approvalStatus === 'Approved').length
    };
  };

  useEffect(() => {
    fetchMrData();
  }, []);

  const filteredData = useMemo(() => applyFilters(mrData), [mrData, filterStatus, filterCategory, filterDateRange]);
  const stats = useMemo(() => calculateStats(filteredData), [filteredData]);

  const clearFilters = () => {
    setFilterStatus([]);
    setFilterCategory([]);
    setFilterDateRange(['', '']);
  };

  const renderDrawerContent = () => {
    if (!selectedMR) return null;

    return (
      <div>
        <StyledCard>
          <Typography.Title level={4} style={{ marginBottom: 16 }}>
            {selectedMR.nomorWO}
          </Typography.Title>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Typography.Text strong>Nomor Reservasi: </Typography.Text>
              <Typography.Text>{selectedMR.nomorReservasi}</Typography.Text>
            </div>
            <div>
              <Typography.Text strong>Pekerjaan: </Typography.Text>
              <Typography.Text>{selectedMR.pekerjaan || '-'}</Typography.Text>
            </div>
            <div>
              <Typography.Text strong>Fungsi: </Typography.Text>
              <Typography.Text>{selectedMR.fungsi || '-'}</Typography.Text>
            </div>
            <div>
              <Typography.Text strong>Pelaksana: </Typography.Text>
              <Typography.Text>{selectedMR.pelaksana}</Typography.Text>
            </div>
            <div>
              <Typography.Text strong>Status: </Typography.Text>
              <StatusBadge color={getStatusColor(selectedMR.status)}>
                {selectedMR.status}
              </StatusBadge>
            </div>
            <div>
              <Typography.Text strong>Approval Status: </Typography.Text>
              <StatusBadge color={getStatusColor(selectedMR.approvalStatus)}>
                {selectedMR.approvalStatus}
              </StatusBadge>
            </div>
            <div>
              <Typography.Text strong>Category: </Typography.Text>
              <Tag color={selectedMR.category === 'Eksklusif' ? 'gold' : 'blue'}>
                {selectedMR.category}
              </Tag>
            </div>
            {selectedMR.completionPercentage && (
              <div>
                <Typography.Text strong>Completion: </Typography.Text>
                <Progress 
                  percent={selectedMR.completionPercentage} 
                  size="small" 
                  style={{ width: 200, marginLeft: 8 }}
                />
              </div>
            )}
          </Space>
        </StyledCard>

        <Tabs defaultActiveKey="1">
          <TabPane tab="Timeline" key="1">
            <Timeline>
              {selectedMR.timeline?.map((item, index) => (
                <TimelineItem key={index}>
                  <Space direction="vertical" size="small">
                    <Typography.Text strong>{item.status}</Typography.Text>
                    <Typography.Text type="secondary">
                      <CalendarOutlined style={{ marginRight: 8 }} />
                      {dayjs(item.date).format('DD MMM YYYY HH:mm')}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      Operator: {item.operator}
                    </Typography.Text>
                    {item.notes && (
                      <Typography.Text type="secondary" italic>
                        Notes: {item.notes}
                      </Typography.Text>
                    )}
                  </Space>
                </TimelineItem>
              ))}
            </Timeline>
          </TabPane>
          <TabPane tab="Materials" key="2">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {selectedMR.materials?.map((material, index) => (
                <StyledCard key={index} size="small">
                  <Typography.Text strong>{material.materialDescription}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">
                    Normalisasi: {material.normalisasi}
                  </Typography.Text>
                  <br />
                  <Typography.Text>
                    Qty: {material.qtyAmbil} {material.satuan || 'PCS'}
                  </Typography.Text>
                  <br />
                  {material.merek && (
                    <>
                      <Typography.Text>
                        Merek: {material.merek}
                      </Typography.Text>
                      <br />
                    </>
                  )}
                  {material.nomorSeri && (
                    <>
                      <Typography.Text>
                        No. Seri: {material.nomorSeri}
                      </Typography.Text>
                      <br />
                    </>
                  )}
                  {material.tahun && (
                    <>
                      <Typography.Text>
                        Tahun: {material.tahun}
                      </Typography.Text>
                      <br />
                    </>
                  )}
                  <div style={{ marginTop: 8 }}>
                    {[material.foto1, material.foto2, material.foto3].filter(Boolean).map((foto, fotoIndex) => (
                      <img 
                        key={fotoIndex}
                        src={foto} 
                        alt={`Foto ${fotoIndex + 1}`}
                        style={{ 
                          width: 60, 
                          height: 60, 
                          objectFit: 'cover', 
                          marginRight: 8,
                          borderRadius: 4,
                          border: '1px solid #d9d9d9'
                        }}
                      />
                    ))}
                  </div>
                </StyledCard>
              ))}
            </Space>
          </TabPane>
        </Tabs>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item href="/">
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item>MR Realization</Breadcrumb.Item>
      </Breadcrumb>

      {/* Header with export button */}
      <HeaderCard>
        <Space size="middle" align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>MR Realization</Typography.Title>
          <Button type="primary" icon={<FileExcelOutlined />} onClick={exportToExcel}>
            Export Excel
          </Button>
        </Space>
      </HeaderCard>

      {/* Filter */}
      <FilterContainer>
        <Collapse 
          ghost 
          expandIconPosition="end" 
          defaultActiveKey={['1']}
        >
          <Panel 
            header={
              <Space>
                <FilterOutlined />
                <Typography.Text strong>Filters</Typography.Text>
                {(filterStatus.length > 0 || filterCategory.length > 0 || filterDateRange[0] || filterDateRange[1]) && (
                  <Tag color="blue">Active</Tag>
                )}
              </Space>
            } 
            key="1"
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <DatePicker.RangePicker
                    onChange={handleDateChange}
                    placeholder={['Start Date', 'End Date']}
                    style={{ width: '100%' }}
                    value={filterDateRange[0] ? [dayjs(filterDateRange[0]), dayjs(filterDateRange[1])] : null}
                  />
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Select
                    mode="multiple"
                    placeholder="Filter Status"
                    value={filterStatus}
                    onChange={(value) => setFilterStatus(value)}
                    options={[
                      { value: 'Completed', label: 'Completed' },
                      { value: 'Pending', label: 'Pending' },
                      { value: 'Rejected', label: 'Rejected' }
                    ]}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Select
                    mode="multiple"
                    placeholder="Filter Category"
                    value={filterCategory}
                    onChange={(value) => setFilterCategory(value)}
                    options={[
                      { value: 'Umum', label: 'Umum' },
                      { value: 'Eksklusif', label: 'Eksklusif' }
                    ]}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col xs={24} sm={12} md={8} lg={6} style={{ display: 'flex', alignItems: 'center' }}>
                  <Button 
                    onClick={clearFilters} 
                    type="default" 
                    danger
                    disabled={!filterStatus.length && !filterCategory.length && !filterDateRange[0] && !filterDateRange[1]}
                  >
                    Clear Filters
                  </Button>
                </Col>
              </Row>
            </Space>
          </Panel>
        </Collapse>
      </FilterContainer>

      {/* Statistik */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <StatisticCard hoverable>
            <Statistic
              title="Total MR"
              value={stats.total}
              prefix={<NumberOutlined style={{ color: 'white' }} />}
              valueStyle={{ color: 'white', fontWeight: 'bold' }}
            />
          </StatisticCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatisticCard hoverable>
            <Statistic
              title="Completed"
              value={stats.completed}
              prefix={<CheckCircleOutlined style={{ color: 'white' }} />}
              valueStyle={{ color: 'white', fontWeight: 'bold' }}
            />
          </StatisticCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatisticCard hoverable>
            <Statistic
              title="Pending"
              value={stats.pending}
              prefix={<WarningOutlined style={{ color: 'white' }} />}
              valueStyle={{ color: 'white', fontWeight: 'bold' }}
            />
          </StatisticCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatisticCard hoverable>
            <Statistic
              title="Approved"
              value={stats.approved}
              prefix={<ClockCircleOutlined style={{ color: 'white' }} />}
              valueStyle={{ color: 'white', fontWeight: 'bold' }}
            />
          </StatisticCard>
        </Col>
      </Row>

      {/* Alert untuk debugging */}
      {!loading && mrData.length === 0 && (
        <Alert
          message="No Data Found"
          description="Tidak ada data MR Realization ditemukan di database. Data akan muncul setelah material diproses melalui WO Fulfillment dan disetujui di Persetujuan Material."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            <Space>
              <Button size="small" icon={<ReloadOutlined />} onClick={fetchMrData}>
                Refresh
              </Button>
            </Space>
          }
        />
      )}

      {/* Tabel MR */}
      <StyledCard>
        <Table
          columns={[
            {
              title: 'Nomor WO',
              dataIndex: 'nomorWO',
              key: 'nomorWO',
              sorter: (a, b) => (a.nomorWO || '').localeCompare(b.nomorWO || ''),
              render: (text) => <Typography.Text strong>{text}</Typography.Text>,
            },
            {
              title: 'Nomor Reservasi',
              dataIndex: 'nomorReservasi',
              key: 'nomorReservasi',
              sorter: (a, b) => (a.nomorReservasi || '').localeCompare(b.nomorReservasi || ''),
            },
            {
              title: 'Tanggal',
              dataIndex: 'tanggal',
              key: 'tanggal',
              render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
            },
            {
              title: 'Pelaksana',
              dataIndex: 'pelaksana',
              key: 'pelaksana',
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              filters: [
                { text: 'Completed', value: 'Completed' },
                { text: 'Pending', value: 'Pending' },
                { text: 'Rejected', value: 'Rejected' }
              ],
              onFilter: (value, record) => record.status === value,
              render: (status) => (
                <StatusContainer>
                  <StatusBadge color={getStatusColor(status)}>
                    {status}
                  </StatusBadge>
                </StatusContainer>
              ),
            },
            {
              title: 'Approval Status',
              dataIndex: 'approvalStatus',
              key: 'approvalStatus',
              filters: [
                { text: 'Pending', value: 'Pending' },
                { text: 'Approved', value: 'Approved' },
                { text: 'Rejected', value: 'Rejected' }
              ],
              onFilter: (value, record) => record.approvalStatus === value,
              render: (status) => (
                <StatusContainer>
                  <StatusBadge color={getStatusColor(status)}>
                    {status}
                  </StatusBadge>
                </StatusContainer>
              ),
            },
            {
              title: 'Category',
              dataIndex: 'category',
              key: 'category',
              filters: [
                { text: 'Umum', value: 'Umum' },
                { text: 'Eksklusif', value: 'Eksklusif' }
              ],
              onFilter: (value, record) => record.category === value,
              render: (category) => (
                <Tag color={category === 'Eksklusif' ? 'gold' : 'blue'}>
                  {category || 'Umum'}
                </Tag>
              ),
            },
            {
              title: 'Materials',
              dataIndex: 'materials',
              key: 'materials',
              render: (materials) => (
                <Typography.Text>
                  {materials?.length || 0} item(s)
                </Typography.Text>
              ),
            },
            {
              title: 'Completion',
              dataIndex: 'completionPercentage',
              key: 'completionPercentage',
              sorter: (a, b) => (a.completionPercentage || 0) - (b.completionPercentage || 0),
              render: (percentage) => (
                <ProgressContainer>
                  <Progress
                    percent={percentage || 0}
                    size="small"
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    showInfo={false}
                    style={{ minWidth: 80 }}
                  />
                  <Typography.Text style={{ minWidth: 40, textAlign: 'right' }}>
                    {percentage ? `${percentage.toFixed(1)}%` : '0%'}
                  </Typography.Text>
                </ProgressContainer>
              ),
            },
          ]}
          dataSource={filteredData}
          loading={loading}
          rowKey="id"
          locale={{
            emptyText: (
              <Empty
                image={<InboxOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
                description={
                  <Space direction="vertical" size="middle">
                    <Typography.Text type="secondary">
                      {mrData.length === 0 
                        ? "Belum ada data MR Realization"
                        : "Tidak ada data yang sesuai dengan filter"
                      }
                    </Typography.Text>
                  </Space>
                }
              />
            )
          }}
          onRow={(record) => ({
            onClick: () => showMrDetail(record),
            style: { 
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            },
            onMouseEnter: (e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.backgroundColor = '';
            }
          })}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
          }}
          scroll={{ x: 'max-content' }}
        />
      </StyledCard>

      {/* Drawer Detail MR */}
      <Drawer
        title={
          <Space>
            <Typography.Text strong>MR Detail: </Typography.Text>
            <Typography.Text>{selectedMR?.nomorWO}</Typography.Text>
          </Space>
        }
        placement="right"
        onClose={onCloseDrawer}
        open={drawerVisible}
        width={window.innerWidth > 768 ? "50%" : "90%"}
        styles={{
          body: { paddingBottom: 80 },
          header: { 
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            borderBottom: '1px solid #e8e8e8'
          }
        }}
      >
        {renderDrawerContent()}
      </Drawer>
    </div>
  );
};

export default MRRealization;
