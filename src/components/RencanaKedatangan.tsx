import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Input,
  DatePicker,
  Select,
  Row,
  Col,
  Statistic,
  Timeline,
  Badge,
  Tooltip,
  Modal,
  Descriptions,
  Progress,
  Alert,
  Divider,
  message
} from 'antd';
import {
  CalendarOutlined,
  TruckOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  SyncOutlined,
  FilterOutlined,
  ExportOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import moment from 'moment';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface IncomingMaterial {
  id: string;
  nomorDO: string;
  tanggalDO: string;
  nomorPO: string;
  nomorPOAMS: string;
  namaMaterial: string;
  qtyDO: number;
  penyedia: string;
  unitTujuan: string;
  etd: string;
  eta: string;
  namaTransportir: string;
  statusPenerimaan: 'PROCESSED' | 'IN_TRANSIT' | 'DELAYED' | 'ARRIVED';
  parsial: boolean;
  estimasiKedatangan: string;
  progress: number;
  fungsi: string;
  keterangan?: string;
}

const RencanaKedatangan: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<IncomingMaterial[]>([]);
  const [filteredData, setFilteredData] = useState<IncomingMaterial[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<IncomingMaterial | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fungsiFilter, setFungsiFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[moment.Moment, moment.Moment] | null>(null);
  const [editingFungsi, setEditingFungsi] = useState<string | null>(null);
  const [tempFungsi, setTempFungsi] = useState<string>('');
  const [customFungsi, setCustomFungsi] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Mock data - akan diganti dengan data dari marketplace
  const mockData: IncomingMaterial[] = [
    {
      id: '1',
      nomorDO: 'DO202500016239',
      tanggalDO: '2025-05-26',
      nomorPO: 'PO202500004511',
      nomorPOAMS: '0133.PJ/DAN.01.01/F20000000/2025',
      namaMaterial: 'MTR;kWHE;3P;57.7/100V-230/400.5A;0.5;4W',
      qtyDO: 20,
      penyedia: 'PT EDMI INDONESIA',
      unitTujuan: 'PLN UP3 Kupang',
      etd: '2025-06-11',
      eta: '2025-06-21',
      namaTransportir: 'Nusa Citra Terpadu',
      statusPenerimaan: 'IN_TRANSIT',
      parsial: false,
      estimasiKedatangan: '2025-06-21',
      progress: 65,
      fungsi: 'Keandalan',
      keterangan: 'Material dalam perjalanan, estimasi tiba sesuai jadwal'
    },
    {
      id: '2',
      nomorDO: 'DO202500013943',
      tanggalDO: '2025-05-09',
      nomorPO: 'PO202500004258',
      nomorPOAMS: '0110.PJ/DAN.01.01/F20000000/2025',
      namaMaterial: 'MTR;kWH E-PR;1P;230V;5-60A;1;2W',
      qtyDO: 50,
      penyedia: 'PT SMART METER INDONESIA',
      unitTujuan: 'PLN UP3 Kupang',
      etd: '2025-05-28',
      eta: '2025-06-09',
      namaTransportir: 'NUSANTARA CITRA TERPADU',
      statusPenerimaan: 'PROCESSED',
      parsial: false,
      estimasiKedatangan: '2025-06-09',
      progress: 85,
      fungsi: 'Pemasaran',
      keterangan: 'Sedang dalam proses loading di pelabuhan'
    },
    {
      id: '3',
      nomorDO: 'DO202500014302',
      tanggalDO: '2025-05-14',
      nomorPO: 'PO202500004266',
      nomorPOAMS: '0112.PJ/DAN.01.01/F20000000/2025',
      namaMaterial: 'MTR;kWH E;3P;230/400V;5-80A;1;4W',
      qtyDO: 30,
      penyedia: 'PT SUPREME CABLE MANUFACTURING',
      unitTujuan: 'PLN UP3 Kupang',
      etd: '2025-06-11',
      eta: '2025-06-25',
      namaTransportir: 'Bagawanta',
      statusPenerimaan: 'DELAYED',
      parsial: true,
      estimasiKedatangan: '2025-06-27',
      progress: 30,
      fungsi: 'Har',
      keterangan: 'Terjadi keterlambatan karena cuaca buruk'
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterData();
  }, [data, searchText, statusFilter, fungsiFilter, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Simulasi loading data dari marketplace
      await new Promise(resolve => setTimeout(resolve, 1000));
      setData(mockData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...data];

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(item =>
        item.nomorDO.toLowerCase().includes(searchText.toLowerCase()) ||
        item.namaMaterial.toLowerCase().includes(searchText.toLowerCase()) ||
        item.penyedia.toLowerCase().includes(searchText.toLowerCase()) ||
        item.namaTransportir.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.statusPenerimaan === statusFilter);
    }

    // Filter by fungsi
    if (fungsiFilter !== 'all') {
      filtered = filtered.filter(item => item.fungsi === fungsiFilter);
    }

    // Filter by date range
    if (dateRange) {
      filtered = filtered.filter(item => {
        const eta = moment(item.eta);
        return eta.isBetween(dateRange[0], dateRange[1], 'day', '[]');
      });
    }

    setFilteredData(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROCESSED': return 'blue';
      case 'IN_TRANSIT': return 'orange';
      case 'DELAYED': return 'red';
      case 'ARRIVED': return 'green';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PROCESSED': return 'Diproses';
      case 'IN_TRANSIT': return 'Dalam Perjalanan';
      case 'DELAYED': return 'Terlambat';
      case 'ARRIVED': return 'Tiba';
      default: return status;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#52c41a';
    if (progress >= 50) return '#faad14';
    return '#ff4d4f';
  };

  const handleEditFungsi = (id: string, currentFungsi: string) => {
    setEditingFungsi(id);
    setTempFungsi(currentFungsi);
  };

  const handleSaveFungsi = async (id: string) => {
    try {
      let finalFungsi = tempFungsi;
      if (tempFungsi === 'Other' && customFungsi.trim()) {
        finalFungsi = customFungsi.trim();
      }
      
      // Update data
      const updatedData = data.map(item => 
        item.id === id ? { ...item, fungsi: finalFungsi } : item
      );
      setData(updatedData);
      setEditingFungsi(null);
      setTempFungsi('');
      setCustomFungsi('');
      setShowCustomInput(false);
      message.success('Fungsi berhasil diupdate');
    } catch (error) {
      message.error('Gagal mengupdate fungsi');
    }
  };

  const handleCancelEdit = () => {
    setEditingFungsi(null);
    setTempFungsi('');
    setCustomFungsi('');
    setShowCustomInput(false);
  };

  const handleFungsiChange = (value: string) => {
    setTempFungsi(value);
    setShowCustomInput(value === 'Other');
  };

  const columns: ColumnsType<IncomingMaterial> = [
    {
      title: 'No. DO',
      dataIndex: 'nomorDO',
      key: 'nomorDO',
      width: 150,
      render: (text: string, record: IncomingMaterial) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedRecord(record);
            setDetailModalVisible(true);
          }}
          style={{ padding: 0, fontWeight: 'bold' }}
        >
          {text}
        </Button>
      ),
    },
    {
      title: 'Tanggal DO',
      dataIndex: 'tanggalDO',
      key: 'tanggalDO',
      width: 120,
      render: (date: string) => moment(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Material',
      dataIndex: 'namaMaterial',
      key: 'namaMaterial',
      width: 250,
      ellipsis: {
        showTitle: false,
      },
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'QTY DO',
      dataIndex: 'qtyDO',
      key: 'qtyDO',
      width: 80,
      align: 'center',
      render: (qty: number) => (
        <Tag color="blue">{qty}</Tag>
      ),
    },
    {
      title: 'Penyedia',
      dataIndex: 'penyedia',
      key: 'penyedia',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'ETD',
      dataIndex: 'etd',
      key: 'etd',
      width: 100,
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          {moment(date).format('DD/MM')}
        </Space>
      ),
    },
    {
      title: 'ETA',
      dataIndex: 'eta',
      key: 'eta',
      width: 100,
      render: (date: string) => (
        <Space>
          <ClockCircleOutlined />
          {moment(date).format('DD/MM')}
        </Space>
      ),
    },
    {
      title: 'Transportir',
      dataIndex: 'namaTransportir',
      key: 'namaTransportir',
      width: 160,
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'statusPenerimaan',
      key: 'statusPenerimaan',
      width: 120,
      render: (status: string, record: IncomingMaterial) => (
        <Space direction="vertical" size="small">
          <Tag color={getStatusColor(status)}>
            {getStatusText(status)}
          </Tag>
          {record.parsial && (
            <Tag color="purple">Parsial</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      width: 100,
      render: (progress: number) => (
        <Progress
          percent={progress}
          size="small"
          strokeColor={getProgressColor(progress)}
          showInfo={false}
        />
      ),
    },
    {
      title: 'Fungsi',
      dataIndex: 'fungsi',
      key: 'fungsi',
      width: 120,
      render: (fungsi: string) => {
        const getFungsiColor = (fungsi: string) => {
          switch (fungsi) {
            case 'Keandalan': return '#1890ff';
            case 'Har': return '#fa8c16';
            case 'Pemasaran': return '#52c41a';
            default: return '#595959';
          }
        };

        return (
          <span style={{ 
            background: getFungsiColor(fungsi),
            color: 'white',
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'inline-block'
          }}>
            {fungsi}
          </span>
        );
      },
    },
    {
      title: 'Aksi',
      key: 'action',
      width: 120,
      render: (_, record: IncomingMaterial) => (
        <Space>
          <Tooltip title="Lihat Detail">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedRecord(record);
                setDetailModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Edit Fungsi">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setSelectedRecord(record);
                setTempFungsi(record.fungsi);
                setEditModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Lacak Pengiriman">
            <Button
              type="text"
              icon={<TruckOutlined />}
              onClick={() => {
                // Implementasi tracking
                Modal.info({
                  title: 'Tracking Pengiriman',
                  content: `Tracking untuk DO: ${record.nomorDO}`,
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="rencana-kedatangan-container">
      <Card
        title={
          <Space>
            <TruckOutlined />
            <span>Rencana Kedatangan Material</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<SyncOutlined />}
              onClick={loadData}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              icon={<ExportOutlined />}
              type="primary"
            >
              Export
            </Button>
          </Space>
        }
      >

        {/* Modern Compact Filters with Labels */}
        <div style={{ 
          background: '#fafafa', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '16px',
          border: '1px solid #f0f0f0'
        }}>
          <Row gutter={12} align="middle">
            {/* Left side - All filters */}
            <Col span={20}>
              <Row gutter={12} align="middle">
                <Col span={10}>
                  <Search
                    placeholder="Cari DO, material, penyedia, transportir..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                    size="middle"
                  />
                </Col>
                <Col span={4}>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ 
                      background: '#1890ff', 
                      color: 'white', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      Status
                    </span>
                  </div>
                  <Select
                    placeholder="Status"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    style={{ width: '100%' }}
                    size="middle"
                  >
                    <Option value="all">Semua Status</Option>
                    <Option value="PROCESSED">
                      <Space>
                        <Badge color="blue" />
                        Diproses
                      </Space>
                    </Option>
                    <Option value="IN_TRANSIT">
                      <Space>
                        <Badge color="orange" />
                        Dalam Perjalanan
                      </Space>
                    </Option>
                    <Option value="DELAYED">
                      <Space>
                        <Badge color="red" />
                        Terlambat
                      </Space>
                    </Option>
                    <Option value="ARRIVED">
                      <Space>
                        <Badge color="green" />
                        Tiba
                      </Space>
                    </Option>
                  </Select>
                </Col>
                <Col span={4}>
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ 
                      background: '#52c41a', 
                      color: 'white', 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      Fungsi
                    </span>
                  </div>
                  <Select
                    placeholder="Fungsi"
                    value={fungsiFilter}
                    onChange={setFungsiFilter}
                    style={{ width: '100%' }}
                    size="middle"
                  >
                    <Option value="all">Semua Fungsi</Option>
                    <Option value="Keandalan">⚡ Keandalan</Option>
                    <Option value="Har">🔧 Har</Option>
                    <Option value="Pemasaran">📈 Pemasaran</Option>
                    <Option value="Other">✏️ Other</Option>
                  </Select>
                </Col>
                <Col span={6}>
                  <RangePicker
                    placeholder={['ETA Dari', 'ETA Sampai']}
                    value={dateRange as any}
                    onChange={(dates: any) => {
                      if (dates && dates[0] && dates[1]) {
                        setDateRange([moment(dates[0]), moment(dates[1])]);
                      } else {
                        setDateRange(null);
                      }
                    }}
                    style={{ width: '100%' }}
                    size="middle"
                  />
                </Col>
              </Row>
            </Col>
            
            {/* Right side - Summary and Reset */}
            <Col span={4}>
              <Row gutter={8} align="middle">
                <Col span={12}>
                  <Button
                    icon={<FilterOutlined />}
                    onClick={() => {
                      setSearchText('');
                      setStatusFilter('all');
                      setFungsiFilter('all');
                      setDateRange(null);
                    }}
                    size="middle"
                    style={{ width: '100%' }}
                  >
                    Reset
                  </Button>
                </Col>
                <Col span={12}>
                  <div style={{ 
                    textAlign: 'center', 
                    fontSize: '12px', 
                    color: '#666',
                    background: '#f0f0f0',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #d9d9d9'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#1890ff' }}>
                      {filteredData.length} material
                    </div>
                    <div style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
                      {filteredData.filter(item => item.statusPenerimaan === 'DELAYED').length} terlambat
                    </div>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
          
          {/* Filter Indicators */}
          {(statusFilter !== 'all' || fungsiFilter !== 'all' || dateRange) && (
            <Row style={{ marginTop: '12px' }}>
              <Col span={24}>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  <span style={{ marginRight: '8px' }}>Filter aktif:</span>
                  {statusFilter !== 'all' && (
                    <Tag 
                      color="blue" 
                      closable 
                      onClose={() => setStatusFilter('all')}
                      style={{ marginRight: '4px' }}
                    >
                      Status: {getStatusText(statusFilter)}
                    </Tag>
                  )}
                  {fungsiFilter !== 'all' && (
                    <Tag 
                      color="green" 
                      closable 
                      onClose={() => setFungsiFilter('all')}
                      style={{ marginRight: '4px' }}
                    >
                      Fungsi: {fungsiFilter}
                    </Tag>
                  )}
                  {dateRange && (
                    <Tag 
                      color="orange" 
                      closable 
                      onClose={() => setDateRange(null)}
                      style={{ marginRight: '4px' }}
                    >
                      ETA: {dateRange[0].format('DD/MM')} - {dateRange[1].format('DD/MM')}
                    </Tag>
                  )}
                </div>
              </Col>
            </Row>
          )}
        </div>

        {/* Alert for urgent items */}
        {filteredData.some(item => item.statusPenerimaan === 'DELAYED') && (
          <Alert
            message="Perhatian!"
            description={`Ada ${filteredData.filter(item => item.statusPenerimaan === 'DELAYED').length} material yang mengalami keterlambatan`}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Main Table */}
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredData.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} dari ${total} material`,
          }}
          scroll={{ x: 1400 }}
          size="small"
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <TruckOutlined />
            <span>Detail Rencana Kedatangan</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Tutup
          </Button>,
          <Button key="track" type="primary" icon={<TruckOutlined />}>
            Lacak Pengiriman
          </Button>,
        ]}
      >
        {selectedRecord && (
          <div>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Nomor DO" span={1}>
                <strong>{selectedRecord.nomorDO}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Tanggal DO" span={1}>
                {moment(selectedRecord.tanggalDO).format('DD MMMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Nomor PO" span={1}>
                {selectedRecord.nomorPO}
              </Descriptions.Item>
              <Descriptions.Item label="Nomor PO AMS" span={1}>
                {selectedRecord.nomorPOAMS}
              </Descriptions.Item>
              <Descriptions.Item label="Material" span={2}>
                {selectedRecord.namaMaterial}
              </Descriptions.Item>
              <Descriptions.Item label="Penyedia" span={1}>
                {selectedRecord.penyedia}
              </Descriptions.Item>
              <Descriptions.Item label="Unit Tujuan" span={1}>
                {selectedRecord.unitTujuan}
              </Descriptions.Item>
              <Descriptions.Item label="ETD" span={1}>
                {moment(selectedRecord.etd).format('DD MMMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="ETA" span={1}>
                {moment(selectedRecord.eta).format('DD MMMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Transportir" span={1}>
                {selectedRecord.namaTransportir}
              </Descriptions.Item>
              <Descriptions.Item label="Status" span={1}>
                <Space>
                  <Tag color={getStatusColor(selectedRecord.statusPenerimaan)}>
                    {getStatusText(selectedRecord.statusPenerimaan)}
                  </Tag>
                  {selectedRecord.parsial && (
                    <Tag color="purple">Parsial</Tag>
                  )}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            <Divider>Progress Pengiriman</Divider>
            
            <Progress
              percent={selectedRecord.progress}
              strokeColor={getProgressColor(selectedRecord.progress)}
              style={{ marginBottom: 16 }}
            />

            <Timeline>
              <Timeline.Item
                color="green"
                dot={<CheckCircleOutlined />}
              >
                <strong>DO Dibuat</strong>
                <br />
                {moment(selectedRecord.tanggalDO).format('DD MMMM YYYY')}
              </Timeline.Item>
              <Timeline.Item
                color={selectedRecord.progress >= 30 ? "green" : "gray"}
                dot={selectedRecord.progress >= 30 ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
              >
                <strong>Proses Loading</strong>
                <br />
                {selectedRecord.progress >= 30 ? "Selesai" : "Menunggu"}
              </Timeline.Item>
              <Timeline.Item
                color={selectedRecord.progress >= 60 ? "green" : "gray"}
                dot={selectedRecord.progress >= 60 ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
              >
                <strong>Dalam Perjalanan</strong>
                <br />
                {selectedRecord.progress >= 60 ? "Sedang dikirim" : "Belum berangkat"}
              </Timeline.Item>
              <Timeline.Item
                color={selectedRecord.progress >= 100 ? "green" : "gray"}
                dot={selectedRecord.progress >= 100 ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
              >
                <strong>Tiba di Tujuan</strong>
                <br />
                Estimasi: {moment(selectedRecord.estimasiKedatangan).format('DD MMMM YYYY')}
              </Timeline.Item>
            </Timeline>

            {selectedRecord.keterangan && (
              <>
                <Divider>Keterangan</Divider>
                <Alert
                  message={selectedRecord.keterangan}
                  type="info"
                  showIcon
                />
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Fungsi Modal */}
      <Modal
        title={
          <Space>
            <EditOutlined />
            <span>Edit Fungsi Material</span>
          </Space>
        }
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setTempFungsi('');
          setCustomFungsi('');
          setShowCustomInput(false);
        }}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => {
              setEditModalVisible(false);
              setTempFungsi('');
              setCustomFungsi('');
              setShowCustomInput(false);
            }}
          >
            Batal
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            onClick={() => {
              if (selectedRecord) {
                handleSaveFungsi(selectedRecord.id);
                setEditModalVisible(false);
              }
            }}
            disabled={tempFungsi === 'Other' && !customFungsi.trim()}
          >
            Simpan
          </Button>,
        ]}
        width={500}
      >
        {selectedRecord && (
          <div>
            <Alert
              message="Edit Fungsi Material"
              description={`Mengubah fungsi untuk material: ${selectedRecord.namaMaterial}`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                Fungsi Saat Ini:
              </label>
              <span style={{ 
                background: selectedRecord.fungsi === 'Keandalan' ? '#1890ff' : 
                           selectedRecord.fungsi === 'Har' ? '#fa8c16' : 
                           selectedRecord.fungsi === 'Pemasaran' ? '#52c41a' : '#595959',
                color: 'white',
                padding: '6px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'inline-block'
              }}>
                {selectedRecord.fungsi}
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                Pilih Fungsi Baru:
              </label>
              <Select
                value={tempFungsi}
                onChange={handleFungsiChange}
                style={{ width: '100%' }}
                size="large"
                placeholder="Pilih fungsi..."
              >
                <Option value="Keandalan">
                  <Space>
                    <span style={{ color: '#1890ff' }}>⚡</span>
                    <span>Keandalan</span>
                  </Space>
                </Option>
                <Option value="Har">
                  <Space>
                    <span style={{ color: '#fa8c16' }}>🔧</span>
                    <span>Har</span>
                  </Space>
                </Option>
                <Option value="Pemasaran">
                  <Space>
                    <span style={{ color: '#52c41a' }}>📈</span>
                    <span>Pemasaran</span>
                  </Space>
                </Option>
                <Option value="Other">
                  <Space>
                    <span style={{ color: '#595959' }}>✏️</span>
                    <span>Other (Custom)</span>
                  </Space>
                </Option>
              </Select>
            </div>

            {showCustomInput && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                  Masukkan Fungsi Custom:
                </label>
                <Input
                  placeholder="Contoh: Keuangan, IT, dll..."
                  value={customFungsi}
                  onChange={(e) => setCustomFungsi(e.target.value)}
                  size="large"
                />
              </div>
            )}

            {tempFungsi && tempFungsi !== 'Other' && (
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                  Preview Fungsi Baru:
                </label>
                <span style={{ 
                  background: tempFungsi === 'Keandalan' ? '#1890ff' : 
                             tempFungsi === 'Har' ? '#fa8c16' : 
                             tempFungsi === 'Pemasaran' ? '#52c41a' : '#595959',
                  color: 'white',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}>
                  {tempFungsi}
                </span>
              </div>
            )}

            {tempFungsi === 'Other' && customFungsi.trim() && (
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                  Preview Fungsi Custom:
                </label>
                <span style={{ 
                  background: '#595959',
                  color: 'white',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}>
                  {customFungsi.trim()}
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RencanaKedatangan;
