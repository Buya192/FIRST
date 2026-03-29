import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, Timeline, Table, Tag, Space, Typography, Row, Col, 
  Statistic, Progress, Button, Modal, Tabs, Calendar, Alert,
  Badge, Tooltip, notification, Spin, Empty, Divider
} from 'antd';
import { 
  InboxOutlined, ClockCircleOutlined, CheckCircleOutlined,
  WarningOutlined, TruckOutlined, CalendarOutlined,
  SyncOutlined, BellOutlined, EyeOutlined, ReloadOutlined
} from '@ant-design/icons';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import styles from './EnhancedMonitoringMasuk.module.css';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// Interfaces untuk marketplace integration
interface MarketplaceData {
  id: string;
  supplier: string;
  etd: string; // Estimated Time Departure
  eta: string; // Estimated Time Arrival
  rating: string;
  statusPenerimaan: 'PROCCESSED' | 'PENDING' | 'DELIVERED' | 'SHIPPED' | 'DELAYED';
  materialDescription?: string;
  nomorPO?: string;
  trackingNumber?: string;
  currentLocation?: string;
  
  // Sync metadata
  lastSyncedAt: string;
  source: 'marketplace' | 'manual';
  syncDirection: 'pull' | 'push';
}

interface TransaksiMasuk {
  id: string;
  nomorKontrak: string;
  tanggal: string;
  jenisBarang: string;
  materialDescription: string;
  fungsi: string;
  penyedia: string;
  kontakPenyedia: string;
  noHP: string;
  qty: number;
  nilaiKontrak: number;
  nomorPO: string;
  tanggalTerima?: string;
  status: 'Diterima' | 'Pending' | 'Selesai';
  
  // Marketplace integration
  marketplaceData?: MarketplaceData;
  isMarketplaceLinked: boolean;
}

interface DeliveryNotification {
  id: string;
  type: 'status_change' | 'eta_update' | 'delivery_scheduled' | 'delay_alert';
  materialId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
}

const EnhancedMonitoringMasuk: React.FC = () => {
  // State management
  const [transaksiMasuk, setTransaksiMasuk] = useState<TransaksiMasuk[]>([]);
  const [marketplaceData, setMarketplaceData] = useState<MarketplaceData[]>([]);
  const [notifications, setNotifications] = useState<DeliveryNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [selectedMaterial, setSelectedMaterial] = useState<TransaksiMasuk | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Real-time listeners
  useEffect(() => {
    const unsubscribeTransaksi = onSnapshot(
      query(collection(db, 'transaksiMasuk'), orderBy('tanggal', 'desc')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as TransaksiMasuk[];
        setTransaksiMasuk(data);
        setLoading(false);
      }
    );

    const unsubscribeMarketplace = onSnapshot(
      collection(db, 'marketplaceSync'),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MarketplaceData[];
        setMarketplaceData(data);
      }
    );

    const unsubscribeNotifications = onSnapshot(
      query(
        collection(db, 'deliveryNotifications'),
        where('isRead', '==', false),
        orderBy('createdAt', 'desc')
      ),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DeliveryNotification[];
        setNotifications(data);
        
        // Show new notifications
        data.forEach(notif => {
          if (notif.priority === 'high') {
            notification.warning({
              message: 'Material Tracking Alert',
              description: notif.message,
              placement: 'topRight',
              duration: 0
            });
          }
        });
      }
    );

    return () => {
      unsubscribeTransaksi();
      unsubscribeMarketplace();
      unsubscribeNotifications();
    };
  }, []);

  // Merge transaksi dengan marketplace data
  const enhancedTransaksi = useMemo(() => {
    return transaksiMasuk.map(transaksi => {
      const marketplaceMatch = marketplaceData.find(mp => 
        mp.nomorPO === transaksi.nomorPO || 
        mp.supplier.toLowerCase().includes(transaksi.penyedia.toLowerCase())
      );
      
      return {
        ...transaksi,
        marketplaceData: marketplaceMatch,
        isMarketplaceLinked: !!marketplaceMatch
      };
    });
  }, [transaksiMasuk, marketplaceData]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = enhancedTransaksi.length;
    const linked = enhancedTransaksi.filter(t => t.isMarketplaceLinked).length;
    const pending = enhancedTransaksi.filter(t => t.status === 'Pending').length;
    const delivered = enhancedTransaksi.filter(t => t.status === 'Diterima').length;
    
    return { total, linked, pending, delivered };
  }, [enhancedTransaksi]);

  // Sync functions
  const syncWithMarketplace = async () => {
    setSyncStatus('syncing');
    try {
      // Call backend API untuk sync dengan marketplace
      await fetch('/api/sync-marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      setSyncStatus('success');
      notification.success({
        message: 'Sync Successful',
        description: 'Data berhasil disinkronisasi dengan marketplace PLN'
      });
    } catch (error) {
      setSyncStatus('error');
      notification.error({
        message: 'Sync Failed',
        description: 'Gagal sinkronisasi dengan marketplace PLN'
      });
    }
  };

  const updateMarketplaceStatus = async (materialId: string, status: string) => {
    try {
      await fetch('/api/update-marketplace-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialId, status })
      });
      
      notification.success({
        message: 'Status Updated',
        description: 'Status berhasil diupdate di marketplace PLN'
      });
    } catch (error) {
      notification.error({
        message: 'Update Failed',
        description: 'Gagal update status di marketplace PLN'
      });
    }
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Diterima':
      case 'DELIVERED':
        return 'green';
      case 'Pending':
      case 'PENDING':
        return 'orange';
      case 'PROCCESSED':
        return 'blue';
      case 'DELAYED':
        return 'red';
      default:
        return 'default';
    }
  };

  const getEtaStatus = (eta: string) => {
    const etaDate = dayjs(eta);
    const now = dayjs();
    const diffDays = etaDate.diff(now, 'days');
    
    if (diffDays < 0) return { color: 'red', text: 'Overdue' };
    if (diffDays <= 3) return { color: 'orange', text: 'Due Soon' };
    return { color: 'green', text: 'On Track' };
  };

  // Table columns
  const columns = [
    {
      title: 'Material',
      dataIndex: 'materialDescription',
      key: 'material',
      render: (text: string, record: TransaksiMasuk) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary">PO: {record.nomorPO}</Text>
          {record.isMarketplaceLinked && (
            <Badge 
              count="Linked" 
              style={{ backgroundColor: '#52c41a', marginLeft: 8 }}
            />
          )}
        </div>
      )
    },
    {
      title: 'Supplier',
      dataIndex: 'penyedia',
      key: 'supplier',
      render: (text: string, record: TransaksiMasuk) => (
        <div>
          <Text>{text}</Text>
          {record.marketplaceData && (
            <>
              <br />
              <Text type="secondary">
                Rating: {record.marketplaceData.rating || 'N/A'}
              </Text>
            </>
          )}
        </div>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (record: TransaksiMasuk) => (
        <Space direction="vertical" size="small">
          <Tag color={getStatusColor(record.status)}>
            {record.status}
          </Tag>
          {record.marketplaceData && (
            <Tag color={getStatusColor(record.marketplaceData.statusPenerimaan)}>
              MP: {record.marketplaceData.statusPenerimaan}
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: 'ETA',
      key: 'eta',
      render: (record: TransaksiMasuk) => {
        if (!record.marketplaceData?.eta) return '-';
        
        const etaStatus = getEtaStatus(record.marketplaceData.eta);
        return (
          <div>
            <Text>{dayjs(record.marketplaceData.eta).format('DD MMM YYYY')}</Text>
            <br />
            <Tag color={etaStatus.color}>
              {etaStatus.text}
            </Tag>
          </div>
        );
      }
    },
    {
      title: 'Qty & Value',
      key: 'qtyValue',
      render: (record: TransaksiMasuk) => (
        <div>
          <Text strong>{record.qty.toLocaleString()}</Text>
          <br />
          <Text type="secondary">
            Rp {record.nilaiKontrak.toLocaleString()}
          </Text>
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: TransaksiMasuk) => (
        <Space>
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedMaterial(record);
              setDetailModalVisible(true);
            }}
          >
            Detail
          </Button>
          {record.isMarketplaceLinked && record.status === 'Pending' && (
            <Button 
              size="small" 
              type="primary"
              onClick={() => updateMarketplaceStatus(record.id, 'DELIVERED')}
            >
              Konfirmasi Terima
            </Button>
          )}
        </Space>
      )
    }
  ];

  // Calendar cell renderer untuk delivery schedule
  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const deliveries = enhancedTransaksi.filter(t => 
      t.marketplaceData?.eta && 
      dayjs(t.marketplaceData.eta).format('YYYY-MM-DD') === dateStr
    );
    
    if (deliveries.length === 0) return null;
    
    return (
      <div className={styles.calendarCell}>
        <Badge 
          count={deliveries.length} 
          style={{ backgroundColor: '#1890ff' }}
        />
        <div className={styles.deliveryList}>
          {deliveries.slice(0, 2).map(delivery => (
            <div key={delivery.id} className={styles.deliveryItem}>
              <Text ellipsis style={{ fontSize: '11px' }}>
                {delivery.penyedia}
              </Text>
            </div>
          ))}
          {deliveries.length > 2 && (
            <Text type="secondary" style={{ fontSize: '10px' }}>
              +{deliveries.length - 2} more
            </Text>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text>Loading material tracking data...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header dengan sync status */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={18}>
          <Title level={2}>
            <InboxOutlined style={{ marginRight: 8 }} />
            Enhanced Material Tracking
          </Title>
        </Col>
        <Col span={6} style={{ textAlign: 'right' }}>
          <Space>
            <Button 
              icon={<SyncOutlined spin={syncStatus === 'syncing'} />}
              onClick={syncWithMarketplace}
              loading={syncStatus === 'syncing'}
            >
              Sync Marketplace
            </Button>
            <Badge count={notifications.length}>
              <Button icon={<BellOutlined />}>
                Notifications
              </Button>
            </Badge>
          </Space>
        </Col>
      </Row>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Materials"
              value={stats.total}
              prefix={<InboxOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Marketplace Linked"
              value={stats.linked}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={`/ ${stats.total}`}
            />
            <Progress 
              percent={Math.round((stats.linked / stats.total) * 100)} 
              size="small" 
              showInfo={false}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Pending Delivery"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Delivered"
              value={stats.delivered}
              prefix={<TruckOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Sync Status Alert */}
      {syncStatus !== 'idle' && (
        <Alert
          message={
            syncStatus === 'syncing' ? 'Syncing with PLN Marketplace...' :
            syncStatus === 'success' ? 'Successfully synced with marketplace' :
            'Failed to sync with marketplace'
          }
          type={
            syncStatus === 'syncing' ? 'info' :
            syncStatus === 'success' ? 'success' : 'error'
          }
          showIcon
          style={{ marginBottom: 16 }}
          closable={syncStatus !== 'syncing'}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultActiveKey="1">
        <TabPane 
          tab={
            <span>
              <InboxOutlined />
              Material Tracking
            </span>
          } 
          key="1"
        >
          <Card>
            <Table
              columns={columns}
              dataSource={enhancedTransaksi}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `${range[0]}-${range[1]} of ${total} materials`
              }}
              scroll={{ x: 'max-content' }}
            />
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <CalendarOutlined />
              Delivery Schedule
            </span>
          } 
          key="2"
        >
          <Card>
            <Calendar 
              dateCellRender={dateCellRender}
              headerRender={({ value, type, onChange, onTypeChange }) => (
                <div style={{ padding: 8 }}>
                  <Row gutter={8} align="middle">
                    <Col>
                      <Button 
                        onClick={() => onChange(value.clone().subtract(1, type))}
                      >
                        Previous
                      </Button>
                    </Col>
                    <Col flex="auto" style={{ textAlign: 'center' }}>
                      <Title level={4} style={{ margin: 0 }}>
                        {value.format(type === 'month' ? 'MMMM YYYY' : 'YYYY')}
                      </Title>
                    </Col>
                    <Col>
                      <Button 
                        onClick={() => onChange(value.clone().add(1, type))}
                      >
                        Next
                      </Button>
                    </Col>
                  </Row>
                </div>
              )}
            />
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <TruckOutlined />
              Live Tracking
            </span>
          } 
          key="3"
        >
          <Card>
            <Timeline>
              {enhancedTransaksi
                .filter(t => t.isMarketplaceLinked)
                .slice(0, 10)
                .map(material => (
                <Timeline.Item 
                  key={material.id}
                  color={getStatusColor(material.marketplaceData?.statusPenerimaan || '')}
                >
                  <div>
                    <Text strong>{material.materialDescription}</Text>
                    <br />
                    <Space>
                      <Text type="secondary">{material.penyedia}</Text>
                      <Tag color={getStatusColor(material.marketplaceData?.statusPenerimaan || '')}>
                        {material.marketplaceData?.statusPenerimaan}
                      </Tag>
                    </Space>
                    <br />
                    {material.marketplaceData?.eta && (
                      <Text type="secondary">
                        ETA: {dayjs(material.marketplaceData.eta).format('DD MMM YYYY')}
                      </Text>
                    )}
                    {material.marketplaceData?.currentLocation && (
                      <>
                        <br />
                        <Text type="secondary">
                          📍 {material.marketplaceData.currentLocation}
                        </Text>
                      </>
                    )}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
            
            {enhancedTransaksi.filter(t => t.isMarketplaceLinked).length === 0 && (
              <Empty 
                description="No marketplace-linked materials found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </Card>
        </TabPane>
      </Tabs>

      {/* Detail Modal */}
      <Modal
        title={`Material Detail: ${selectedMaterial?.materialDescription}`}
        visible={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={null}
      >
        {selectedMaterial && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small" title="Basic Information">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>PO Number: </Text>
                      <Text>{selectedMaterial.nomorPO}</Text>
                    </div>
                    <div>
                      <Text strong>Supplier: </Text>
                      <Text>{selectedMaterial.penyedia}</Text>
                    </div>
                    <div>
                      <Text strong>Quantity: </Text>
                      <Text>{selectedMaterial.qty.toLocaleString()}</Text>
                    </div>
                    <div>
                      <Text strong>Value: </Text>
                      <Text>Rp {selectedMaterial.nilaiKontrak.toLocaleString()}</Text>
                    </div>
                  </Space>
                </Card>
              </Col>
              <Col span={12}>
                {selectedMaterial.isMarketplaceLinked ? (
                  <Card size="small" title="Marketplace Data">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>Status: </Text>
                        <Tag color={getStatusColor(selectedMaterial.marketplaceData?.statusPenerimaan || '')}>
                          {selectedMaterial.marketplaceData?.statusPenerimaan}
                        </Tag>
                      </div>
                      {selectedMaterial.marketplaceData?.eta && (
                        <div>
                          <Text strong>ETA: </Text>
                          <Text>{dayjs(selectedMaterial.marketplaceData.eta).format('DD MMM YYYY')}</Text>
                        </div>
                      )}
                      {selectedMaterial.marketplaceData?.rating && (
                        <div>
                          <Text strong>Supplier Rating: </Text>
                          <Text>{selectedMaterial.marketplaceData.rating}</Text>
                        </div>
                      )}
                      <div>
                        <Text strong>Last Sync: </Text>
                        <Text type="secondary">
                          {dayjs(selectedMaterial.marketplaceData?.lastSyncedAt).fromNow()}
                        </Text>
                      </div>
                    </Space>
                  </Card>
                ) : (
                  <Card size="small" title="Marketplace Integration">
                    <Empty 
                      description="Not linked to marketplace"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                    <Button type="primary" style={{ marginTop: 16 }}>
                      Link to Marketplace
                    </Button>
                  </Card>
                )}
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EnhancedMonitoringMasuk;
