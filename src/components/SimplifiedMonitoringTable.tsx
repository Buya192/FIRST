import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Card, Typography, Tag, Space, Button, Input, Modal, 
  Row, Col, Statistic, Tooltip, message, Empty, Spin, Tabs
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, EyeOutlined, 
  InboxOutlined, CheckCircleOutlined, ClockCircleOutlined,
  CloudOutlined, DatabaseOutlined, GlobalOutlined
} from '@ant-design/icons';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../utils/firebase';
import moment from 'moment';
import DetailModal from './DetailModal';
import styles from './MonitoringMasuk.module.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface MonitoringMasukItem {
  id: string;
  nomorSPBKontrak: string;
  tanggal: string;
  normalisasiNumber: string;
  namaMaterial: string;
  fungsi: string;
  penyedia: string;
  tanggalTiba: string;
  noPO: string;
  qtyPesan: number;
  qtyDiterima: number;
  nomorTUG3?: string;
  nomorTUG4?: string;
  status: 'draft' | 'proses' | 'selesai';
  arsipLengkap: boolean;
  jenisMaterial: 'umum' | 'eksklusif';
  foto?: string[];
  dokumen?: string[];
  keterangan?: string;
  createdAt?: any;
  updatedAt?: any;
  
  // Marketplace integration fields
  marketplaceOrderId?: string;
  marketplaceStatus?: string;
  marketplaceLastSync?: string;
}

const SimplifiedMonitoringTable: React.FC = () => {
  const [dataList, setDataList] = useState<MonitoringMasukItem[]>([]);
  const [filteredList, setFilteredList] = useState<MonitoringMasukItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedItem, setSelectedItem] = useState<MonitoringMasukItem | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch data from Firestore
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(
        query(collection(db, 'transaksiMasuk'), orderBy('tanggal', 'desc'))
      );
      
      const data = querySnapshot.docs.map(docSnapshot => {
        const docData = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...docData,
          normalisasiNumber: docData.normalisasiNumber || '',
          foto: Array.isArray(docData.foto) ? docData.foto : [],
          dokumen: Array.isArray(docData.dokumen) ? docData.dokumen : [],
          status: docData.status || 'draft',
          qtyPesan: docData.qtyPesan || 0,
          qtyDiterima: docData.qtyDiterima || 0,
          keterangan: docData.keterangan || '',
        } as MonitoringMasukItem;
      });

      setDataList(data);
      applyTabFilter(data, activeTab);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Gagal mengambil data monitoring masuk');
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply tab filter
  const applyTabFilter = useCallback((data: MonitoringMasukItem[], tab: string) => {
    let filtered = data;
    
    switch (tab) {
      case 'local':
        filtered = data.filter(item => !item.marketplaceOrderId);
        break;
      case 'marketplace':
        filtered = data.filter(item => item.marketplaceOrderId);
        break;
      case 'all':
      default:
        filtered = data;
        break;
    }
    
    // Apply search filter if exists
    if (searchText) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.nomorSPBKontrak.toLowerCase().includes(searchLower) ||
        item.namaMaterial.toLowerCase().includes(searchLower) ||
        item.penyedia.toLowerCase().includes(searchLower) ||
        item.fungsi.toLowerCase().includes(searchLower) ||
        (item.normalisasiNumber && item.normalisasiNumber.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredList(filtered);
  }, [searchText]);

  // Handle tab change
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    applyTabFilter(dataList, tab);
  }, [dataList, applyTabFilter]);

  // Search functionality
  const handleSearch = useCallback((value: string) => {
    setSearchText(value);
    applyTabFilter(dataList, activeTab);
  }, [dataList, activeTab, applyTabFilter]);

  // Handle row click to open detail modal
  const handleRowClick = useCallback((record: MonitoringMasukItem) => {
    setSelectedItem(record);
    setDetailModalVisible(true);
  }, []);

  // Get status display
  const getStatusDisplay = useCallback((status: string, qtyDiterima: number, qtyPesan: number) => {
    if (status === 'selesai' || qtyDiterima >= qtyPesan) {
      return <Tag color="success" icon={<CheckCircleOutlined />}>Diterima</Tag>;
    } else {
      return <Tag color="processing" icon={<ClockCircleOutlined />}>Progres</Tag>;
    }
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = dataList.length;
    const diterima = dataList.filter(item => 
      item.status === 'selesai' || item.qtyDiterima >= item.qtyPesan
    ).length;
    const progres = total - diterima;
    const marketplaceLinked = dataList.filter(item => item.marketplaceOrderId).length;
    const localOnly = total - marketplaceLinked;

    return { total, diterima, progres, marketplaceLinked, localOnly };
  }, [dataList]);

  // Calculate tab-specific stats
  const getTabStats = useCallback((tab: string) => {
    let data = dataList;
    switch (tab) {
      case 'local':
        data = dataList.filter(item => !item.marketplaceOrderId);
        break;
      case 'marketplace':
        data = dataList.filter(item => item.marketplaceOrderId);
        break;
    }
    
    const total = data.length;
    const diterima = data.filter(item => 
      item.status === 'selesai' || item.qtyDiterima >= item.qtyPesan
    ).length;
    const progres = total - diterima;
    
    return { total, diterima, progres };
  }, [dataList]);

  // Table columns - simplified version
  const columns = [
    {
      title: 'Nomor SPB/Kontrak',
      dataIndex: 'nomorSPBKontrak',
      key: 'nomorSPBKontrak',
      width: 200,
      render: (text: string, record: MonitoringMasukItem) => (
        <div style={{ minWidth: '180px' }}>
          <div style={{ marginBottom: '4px' }}>
            <Button 
              type="link" 
              onClick={() => handleRowClick(record)}
              style={{ 
                padding: 0, 
                height: 'auto', 
                fontWeight: 'bold',
                color: '#1890ff',
                fontSize: '13px',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '170px',
                display: 'block'
              }}
              title={text}
            >
              {text}
            </Button>
          </div>
          {record.marketplaceOrderId && (
            <div>
              <Tag color="blue" style={{ fontSize: '10px', margin: 0 }}>Marketplace</Tag>
            </div>
          )}
        </div>
      ),
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => 
        a.nomorSPBKontrak.localeCompare(b.nomorSPBKontrak),
    },
    {
      title: 'Tanggal',
      dataIndex: 'tanggal',
      key: 'tanggal',
      width: 100,
      render: (date: string) => (
        <Text>{moment(date).format('DD/MM/YY')}</Text>
      ),
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => 
        moment(a.tanggal).valueOf() - moment(b.tanggal).valueOf(),
    },
    {
      title: 'Nama Material',
      dataIndex: 'namaMaterial',
      key: 'namaMaterial',
      width: 250,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text>{text}</Text>
        </Tooltip>
      ),
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => 
        a.namaMaterial.localeCompare(b.namaMaterial),
    },
    {
      title: 'Fungsi',
      dataIndex: 'fungsi',
      key: 'fungsi',
      width: 150,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text>{text}</Text>
        </Tooltip>
      ),
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => 
        a.fungsi.localeCompare(b.fungsi),
    },
    {
      title: 'Penyedia',
      dataIndex: 'penyedia',
      key: 'penyedia',
      width: 180,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text>{text}</Text>
        </Tooltip>
      ),
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => 
        a.penyedia.localeCompare(b.penyedia),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_: any, record: MonitoringMasukItem) => 
        getStatusDisplay(record.status, record.qtyDiterima, record.qtyPesan),
      filters: [
        { text: 'Diterima', value: 'diterima' },
        { text: 'Progres', value: 'progres' },
      ],
      onFilter: (value: any, record: MonitoringMasukItem) => {
        if (value === 'diterima') {
          return record.status === 'selesai' || record.qtyDiterima >= record.qtyPesan;
        } else {
          return record.status !== 'selesai' && record.qtyDiterima < record.qtyPesan;
        }
      },
    },
  ];

  // Render marketplace-specific columns for marketplace tab
  const marketplaceColumns = [
    ...columns,
    {
      title: 'Marketplace Status',
      dataIndex: 'marketplaceStatus',
      key: 'marketplaceStatus',
      width: 150,
      render: (status: string) => (
        <Tag color="purple">{status || 'N/A'}</Tag>
      ),
    },
    {
      title: 'Last Sync',
      dataIndex: 'marketplaceLastSync',
      key: 'marketplaceLastSync',
      width: 120,
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {date ? moment(date).format('DD/MM HH:mm') : 'Never'}
        </Text>
      ),
    },
  ];

  const currentColumns = activeTab === 'marketplace' ? marketplaceColumns : columns;

  return (
    <div className={styles.monitoringMasukPage}>
      {/* Header */}
      <div className={styles.compactHeader}>
        <div className={styles.headerLeft}>
          <Title level={3} className={styles.pageTitle}>
            <InboxOutlined /> Monitoring Material Masuk
          </Title>
        </div>
        <div className={styles.headerRight}>
          <Input.Search
            placeholder="Cari SPB, material, penyedia..."
            allowClear
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            onSearch={handleSearch}
            style={{ width: 300, marginRight: 12 }}
          />
          <Tooltip title="Muat Ulang Data">
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchData} 
              loading={loading}
            >
              Refresh
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Statistics */}
      <div className={styles.statsBar}>
        <div className={styles.statItem}>
          <Text className={styles.statLabel}>Total Transaksi</Text>
          <Text className={styles.statValue}>{stats.total}</Text>
        </div>
        <div className={styles.statItem}>
          <Text className={styles.statLabel}>Diterima</Text>
          <Text className={styles.statValue} style={{ color: '#52c41a' }}>
            {stats.diterima}
          </Text>
        </div>
        <div className={styles.statItem}>
          <Text className={styles.statLabel}>Progres</Text>
          <Text className={styles.statValue} style={{ color: '#1890ff' }}>
            {stats.progres}
          </Text>
        </div>
        <div className={styles.statItem}>
          <Text className={styles.statLabel}>Marketplace</Text>
          <Text className={styles.statValue} style={{ color: '#722ed1' }}>
            {stats.marketplaceLinked}
          </Text>
        </div>
      </div>

      {/* Tabs for Data Source */}
      <Card className={styles.filterSection}>
        <Tabs 
          activeKey={activeTab} 
          onChange={handleTabChange}
          style={{ marginBottom: 16 }}
        >
          <TabPane 
            tab={
              <span>
                <GlobalOutlined />
                Semua Data ({stats.total})
              </span>
            } 
            key="all"
          />
          <TabPane 
            tab={
              <span>
                <DatabaseOutlined />
                Data Lokal ({stats.localOnly})
              </span>
            } 
            key="local"
          />
          <TabPane 
            tab={
              <span>
                <CloudOutlined />
                Marketplace ({stats.marketplaceLinked})
              </span>
            } 
            key="marketplace"
          />
        </Tabs>

        {/* Tab-specific statistics */}
        {activeTab !== 'all' && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic 
                  title="Total" 
                  value={getTabStats(activeTab).total} 
                  valueStyle={{ fontSize: 16 }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="Diterima" 
                  value={getTabStats(activeTab).diterima} 
                  valueStyle={{ fontSize: 16, color: '#52c41a' }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title="Progres" 
                  value={getTabStats(activeTab).progres} 
                  valueStyle={{ fontSize: 16, color: '#1890ff' }}
                />
              </Col>
            </Row>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text>Memuat data monitoring masuk...</Text>
            </div>
          </div>
        ) : filteredList.length === 0 ? (
          <Empty 
            description={
              searchText 
                ? `Tidak ditemukan hasil untuk "${searchText}"` 
                : activeTab === 'marketplace' 
                  ? "Belum ada data dari marketplace. Coba lakukan sync terlebih dahulu."
                  : activeTab === 'local'
                    ? "Belum ada data lokal"
                    : "Belum ada data transaksi masuk"
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            columns={currentColumns}
            dataSource={filteredList}
            rowKey="id"
            scroll={{ x: activeTab === 'marketplace' ? 1200 : 1000 }}
            pagination={{
              pageSize: 15,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} dari ${total} transaksi`,
              showSizeChanger: true,
              pageSizeOptions: ['10', '15', '25', '50'],
              showQuickJumper: true,
            }}
            size="middle"
            bordered={false}
            rowClassName={(record, index) => 
              index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
            }
          />
        )}
      </Card>

      {/* Detail Modal */}
      <DetailModal
        visible={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onRefresh={fetchData}
      />
    </div>
  );
};

export default SimplifiedMonitoringTable;
