import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Card,
  Space,
  Row,
  Col,
  Typography,
  Tag,
  Statistic,
  notification,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import dayjs from 'dayjs';
import styles from './PersetujuanMaterial.module.css';

const { Title, Text } = Typography;

interface Material {
  materialDescription: string;
  qtyPermintaan: number;
  qtyAmbil: number;
  merek: string;
  satuan: string;
}

interface MRRealizationData {
  id: string;
  nomorWO: string;
  tglPengambilan: string;
  category: 'Umum' | 'Eksklusif';
  pelaksana: string;
  materials: Material[];
  approvalStatus?: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
}

const PersetujuanMaterial: React.FC = () => {
  const [mrRealizationList, setMRRealizationList] = useState<MRRealizationData[]>([]);
  const [loading, setLoading] = useState(false);

  // Summary statistics
  const [summaryStats, setSummaryStats] = useState({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
  });

  useEffect(() => {
    fetchMRRealizationData();
  }, []);

  useEffect(() => {
    calculateSummaryStats();
  }, [mrRealizationList]);

  const fetchMRRealizationData = async () => {
    setLoading(true);
    try {
      const mrRealizationRef = collection(db, 'mrRealization');
      const querySnapshot = await getDocs(mrRealizationRef);
      
      const _mrData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        approvalStatus: doc.data().approvalStatus || 'Pending',
      })) as MRRealizationData[];
      
      setMRRealizationList(_mrData);
    } catch (error) {
      console.error('Error fetching MR Realization data:', error);
      notification.error({
        message: 'Error',
        description: 'Gagal mengambil data MR Realization',
        placement: 'topRight',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateSummaryStats = () => {
    const totalPending = mrRealizationList.filter(item => 
      item.approvalStatus === 'Pending'
    ).length;
    
    const totalApproved = mrRealizationList.filter(item => 
      item.approvalStatus === 'Approved'
    ).length;
    
    const totalRejected = mrRealizationList.filter(item => 
      item.approvalStatus === 'Rejected'
    ).length;

    setSummaryStats({
      totalPending,
      totalApproved,
      totalRejected,
    });
  };

  const handleApprove = async (mrData: MRRealizationData) => {
    try {
      const currentUser = 'TL LOGISTIK';
      const currentTime = new Date().toISOString();

      const mrRef = doc(db, 'mrRealization', mrData.id);
      await updateDoc(mrRef, {
        approvalStatus: 'Approved',
        approvedBy: currentUser,
        approvedAt: currentTime,
      });

      notification.success({
        message: 'Berhasil Disetujui',
        description: `Material ${mrData.nomorWO} telah disetujui`,
        placement: 'topRight',
      });
      
      fetchMRRealizationData();
    } catch (error) {
      console.error('Error approving material:', error);
      notification.error({
        message: 'Gagal Menyetujui',
        description: 'Terjadi kesalahan saat menyetujui material',
        placement: 'topRight',
      });
    }
  };

  const handleReject = async (mrData: MRRealizationData) => {
    try {
      const currentUser = 'TL LOGISTIK';
      const currentTime = new Date().toISOString();

      const mrRef = doc(db, 'mrRealization', mrData.id);
      await updateDoc(mrRef, {
        approvalStatus: 'Rejected',
        rejectedBy: currentUser,
        rejectedAt: currentTime,
        rejectedReason: 'Ditolak oleh TL Logistik',
      });

      notification.success({
        message: 'Material Ditolak',
        description: `Material ${mrData.nomorWO} telah ditolak`,
        placement: 'topRight',
      });

      fetchMRRealizationData();
    } catch (error) {
      console.error('Error rejecting material:', error);
      notification.error({
        message: 'Gagal Menolak',
        description: 'Terjadi kesalahan saat menolak material',
        placement: 'topRight',
      });
    }
  };

  const columns = [
    {
      title: 'Nomor WO',
      dataIndex: 'nomorWO',
      key: 'nomorWO',
      width: 150,
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Tanggal',
      dataIndex: 'tglPengambilan',
      key: 'tglPengambilan',
      width: 120,
      render: (date: string) => (
        <div>
          {dayjs(date).format('DD/MM/YYYY')}
        </div>
      ),
    },
    {
      title: 'Pelaksana',
      dataIndex: 'pelaksana',
      key: 'pelaksana',
      width: 150,
    },
    {
      title: 'Kategori',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => (
        <Tag color={category === 'Eksklusif' ? 'gold' : 'blue'}>
          {category}
        </Tag>
      ),
    },
    {
      title: 'Material',
      key: 'materials',
      width: 250,
      render: (_: any, record: MRRealizationData) => (
        <div>
          {record.materials.slice(0, 2).map((material, index) => (
            <div key={index} style={{ fontSize: '12px', marginBottom: '2px' }}>
              <Text ellipsis={{ tooltip: material.materialDescription }}>
                {material.materialDescription.substring(0, 40)}...
              </Text>
            </div>
          ))}
          {record.materials.length > 2 && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              +{record.materials.length - 2} material lainnya
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'approvalStatus',
      key: 'approvalStatus',
      width: 120,
      render: (status: string) => {
        let color = 'default';
        let icon = <ClockCircleOutlined />;
        
        if (status === 'Approved') {
          color = 'green';
          icon = <CheckCircleOutlined />;
        } else if (status === 'Rejected') {
          color = 'red';
        } else if (status === 'Pending') {
          color = 'orange';
        }
        
        return (
          <Tag color={color} icon={icon}>
            {status || 'Pending'}
          </Tag>
        );
      },
    },
    {
      title: 'Aksi',
      key: 'action',
      width: 180,
      render: (_: any, record: MRRealizationData) => (
        <Space size="small">
          {record.approvalStatus === 'Pending' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(record)}
              >
                Setujui
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={() => handleReject(record)}
              >
                Tolak
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.headerSection}>
        <Row justify="space-between" align="middle">
      <Col xs={24} sm={16}>
        <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <DashboardOutlined style={{ color: '#1890ff', fontSize: 28 }} />
          Persetujuan Material
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          Kelola persetujuan material dengan sistem modern dan efisien
        </Text>
      </Col>
      <Col xs={24} sm={8}>
        <Space size="middle" style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Card className={styles.summaryCard} bordered={false} hoverable>
            <Statistic
              title="Menunggu Persetujuan"
              value={summaryStats.totalPending}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
          <Card className={styles.summaryCard} bordered={false} hoverable>
            <Statistic
              title="Total Disetujui"
              value={summaryStats.totalApproved}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
          <Card className={styles.summaryCard} bordered={false} hoverable>
            <Statistic
              title="Total Ditolak"
              value={summaryStats.totalRejected}
              prefix={<CloseOutlined style={{ color: '#ff4d4f' }} />}
            />
          </Card>
        </Space>
      </Col>
    </Row>
  </div>

  <Card className={styles.modernTable} bordered={false}>
    <Table
      columns={columns}
      dataSource={mrRealizationList}
      loading={loading}
      rowKey="id"
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} item`,
      }}
      scroll={{ x: 1200 }}
      size="middle"
      bordered
      sticky
    />
  </Card>
</div>
  );
};

