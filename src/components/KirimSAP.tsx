import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  message,
  Space,
  Modal,
  Card,
  Alert,
  Typography,
  Progress,
  Tag,
  Checkbox,
  Tooltip,
  Descriptions,
  Spin,
  Input,
  Form,
  Divider,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  SendOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  UserOutlined,
  LockOutlined
} from '@ant-design/icons';
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { testSAPConnection } from '../utils/sap-api-enhanced';
import {
  batchCreateSAPMaterialDocuments,
  mapMRRealizationToSAP,
  validateSAPMaterialDocument,
  formatSAPDocumentForPreview,
  getSAPStatus,
  getSAPStatusText,
  getSAPStatusColor,
  SAPMaterialDocument,
  BatchSAPResponse
} from '../utils/sap-material-document-api';
import logger from '../utils/logger';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface WorkOrder {
  id: string;
  nomorWO?: string;
  nomorReservasi: string;
  tglPengambilan: string;
  status: string;
  category: 'Umum' | 'Eksklusif';
  nomorKontrak: string;
  pekerjaan: string;
  pelaksana: string;
  fungsi: string;
  materials: Array<{
    materialDescription: string;
    normalisasi: string;
    valuationType: string;
    qtyPermintaan: number;
    qtyAmbil: number;
    merek: string;
    nomorSeri?: string;
    tahun?: string;
    satuan: string;
  }>;
  // SAP fields
  sapMaterialDocument?: string;
  sapFiscalYear?: string;
  sapSentAt?: any;
  sapStatus?: string;
}

const KirimSAP: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<WorkOrder[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [progressModalVisible, setProgressModalVisible] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');
  const [batchResults, setBatchResults] = useState<BatchSAPResponse | null>(null);
  
  // SAP Connection state
  const [sapUsername, setSapUsername] = useState<string>('');
  const [sapPassword, setSapPassword] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<any>({});
  const [sapLoginForm] = Form.useForm();

  // Statistics
  const [statistics, setStatistics] = useState({
    total: 0,
    notSent: 0,
    sent: 0,
    error: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateStatistics();
  }, [data]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const mrRealizationRef = collection(db, 'mrRealization');
      const q = query(mrRealizationRef, where('status', '==', 'Completed'));
      const querySnapshot = await getDocs(q);
      
      const fetchedData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        category: doc.data().category === 'Eksklusif' ? 'Eksklusif' : 'Umum',
      } as WorkOrder));
      
      setData(fetchedData);
      logger.info(`KirimSAP: Loaded ${fetchedData.length} completed work orders`);
    } catch (error) {
      logger.error('KirimSAP: Error fetching data', error);
      message.error('Gagal memuat data MR Realization');
    }
    setLoading(false);
  };

  const calculateStatistics = () => {
    const stats = {
      total: data.length,
      notSent: 0,
      sent: 0,
      error: 0
    };

    data.forEach(item => {
      const status = getSAPStatus(item);
      switch (status) {
        case 'sent':
          stats.sent++;
          break;
        case 'error':
          stats.error++;
          break;
        case 'not_sent':
        default:
          stats.notSent++;
          break;
      }
    });

    setStatistics(stats);
  };

  const handleSAPLogin = async (values: any) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      setSapUsername(values.sapUsername);
      setSapPassword(values.sapPassword);
      
      const result = await testSAPConnection(values.sapUsername, values.sapPassword);
      
      if (result.success) {
        setIsAuthenticated(true);
        setConnectionInfo({
          authFormat: result.authFormat,
          baseUrl: result.baseUrl,
          urlIndex: result.urlIndex
        });
        message.success('Berhasil terhubung ke SAP PLN');
        logger.info(`KirimSAP: Successfully authenticated with SAP using format ${result.authFormat}`);
      } else {
        setAuthError(result.message || 'Gagal terhubung ke SAP. Periksa kredensial Anda.');
        logger.error('KirimSAP: Failed to authenticate with SAP', result.message);
      }
    } catch (err) {
      setAuthError('Terjadi kesalahan saat menghubungkan ke SAP.');
      logger.error('KirimSAP: Error authenticating with SAP', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePreview = (record: WorkOrder) => {
    try {
      const sapDocument = mapMRRealizationToSAP(record);
      const validation = validateSAPMaterialDocument(sapDocument);
      const formattedData = formatSAPDocumentForPreview(sapDocument);
      
      setPreviewData({
        workOrder: record,
        sapDocument: formattedData,
        validation
      });
      setPreviewModalVisible(true);
    } catch (error) {
      message.error('Gagal membuat preview data SAP');
      logger.error('KirimSAP: Error creating preview', error);
    }
  };

  const handleSingleSend = async (record: WorkOrder) => {
    if (!isAuthenticated) {
      message.error('Anda harus terhubung ke SAP terlebih dahulu');
      return;
    }

    try {
      const sapDocument = mapMRRealizationToSAP(record);
      const validation = validateSAPMaterialDocument(sapDocument);
      
      if (!validation.isValid) {
        message.error(`Validasi gagal: ${validation.errors.join(', ')}`);
        return;
      }

      setLoading(true);
      const result = await batchCreateSAPMaterialDocuments([record], sapUsername, sapPassword);
      
      if (result.success && result.results.length > 0 && result.results[0].success) {
        message.success(`Material Document ${result.results[0].materialDocument} berhasil dibuat di SAP`);
        await fetchData(); // Refresh data
      } else {
        const errorMsg = result.errorDetails[0]?.error || 'Gagal mengirim ke SAP';
        message.error(errorMsg);
      }
    } catch (error) {
      message.error('Terjadi kesalahan saat mengirim ke SAP');
      logger.error('KirimSAP: Error sending single item', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSend = async () => {
    if (!isAuthenticated) {
      message.error('Anda harus terhubung ke SAP terlebih dahulu');
      return;
    }

    if (selectedRowKeys.length === 0) {
      message.error('Pilih minimal satu item untuk dikirim');
      return;
    }

    const selectedItems = data.filter(item => selectedRowKeys.includes(item.id));
    const notSentItems = selectedItems.filter(item => getSAPStatus(item) === 'not_sent');
    
    if (notSentItems.length === 0) {
      message.error('Tidak ada item yang belum terkirim dalam pilihan');
      return;
    }

    // Validate all items first
    const validationErrors: string[] = [];
    notSentItems.forEach((item, index) => {
      try {
        const sapDocument = mapMRRealizationToSAP(item);
        const validation = validateSAPMaterialDocument(sapDocument);
        if (!validation.isValid) {
          validationErrors.push(`Item ${index + 1} (${item.nomorReservasi}): ${validation.errors.join(', ')}`);
        }
      } catch (error) {
        validationErrors.push(`Item ${index + 1} (${item.nomorReservasi}): Error mapping data`);
      }
    });

    if (validationErrors.length > 0) {
      Modal.error({
        title: 'Validasi Gagal',
        content: (
          <div>
            <p>Beberapa item tidak valid:</p>
            <ul>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        ),
        width: 600
      });
      return;
    }

    // Show confirmation
    Modal.confirm({
      title: 'Konfirmasi Kirim ke SAP',
      content: `Anda akan mengirim ${notSentItems.length} item ke SAP PLN. Lanjutkan?`,
      onOk: async () => {
        setProgressModalVisible(true);
        setProgress(0);
        setProgressText('Memulai proses pengiriman...');

        try {
          const result = await batchCreateSAPMaterialDocuments(notSentItems, sapUsername, sapPassword);
          
          setProgress(100);
          setProgressText('Proses selesai');
          setBatchResults(result);
          
          // Refresh data
          await fetchData();
          
          // Clear selection
          setSelectedRowKeys([]);
          
          if (result.success) {
            message.success(`Berhasil mengirim ${result.processed} item ke SAP`);
          } else {
            message.warning(`Proses selesai dengan ${result.errors} error`);
          }
        } catch (error) {
          setProgressText('Terjadi kesalahan');
          message.error('Gagal mengirim batch ke SAP');
          logger.error('KirimSAP: Error in batch send', error);
        }
      }
    });
  };

  const columns = [
    {
      title: 'Pilih',
      key: 'select',
      width: 60,
      render: (_: any, record: WorkOrder) => {
        const status = getSAPStatus(record);
        return (
          <Checkbox
            disabled={status === 'sent'}
            checked={selectedRowKeys.includes(record.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRowKeys([...selectedRowKeys, record.id]);
              } else {
                setSelectedRowKeys(selectedRowKeys.filter(key => key !== record.id));
              }
            }}
          />
        );
      }
    },
    {
      title: 'Status SAP',
      key: 'sapStatus',
      width: 120,
      render: (_: any, record: WorkOrder) => {
        const status = getSAPStatus(record);
        const statusText = getSAPStatusText(status);
        const statusColor = getSAPStatusColor(status);
        
        return (
          <Tag color={statusColor} icon={
            status === 'sent' ? <CheckCircleOutlined /> :
            status === 'error' ? <CloseCircleOutlined /> :
            <ExclamationCircleOutlined />
          }>
            {statusText}
          </Tag>
        );
      }
    },
    {
      title: 'Nomor WO',
      key: 'nomorWO',
      width: 150,
      render: (_: any, record: WorkOrder) => record.nomorWO || record.id
    },
    {
      title: 'Nomor Reservasi',
      dataIndex: 'nomorReservasi',
      key: 'nomorReservasi',
      width: 150
    },
    {
      title: 'Tanggal Pengambilan',
      dataIndex: 'tglPengambilan',
      key: 'tglPengambilan',
      width: 150,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Kategori',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => (
        <Tag color={category === 'Eksklusif' ? 'purple' : 'blue'}>
          {category}
        </Tag>
      )
    },
    {
      title: 'Pekerjaan',
      dataIndex: 'pekerjaan',
      key: 'pekerjaan',
      width: 200
    },
    {
      title: 'Pelaksana',
      dataIndex: 'pelaksana',
      key: 'pelaksana',
      width: 150
    },
    {
      title: 'Fungsi',
      dataIndex: 'fungsi',
      key: 'fungsi',
      width: 150
    },
    {
      title: 'Jumlah Material',
      key: 'materialCount',
      width: 120,
      render: (_: any, record: WorkOrder) => record.materials?.length || 0
    },
    {
      title: 'SAP Doc',
      key: 'sapDocument',
      width: 120,
      render: (_: any, record: WorkOrder) => {
        return record.sapMaterialDocument ? (
          <Tooltip title={`Fiscal Year: ${record.sapFiscalYear}`}>
            <Text code>{record.sapMaterialDocument}</Text>
          </Tooltip>
        ) : '-';
      }
    },
    {
      title: 'Aksi',
      key: 'action',
      width: 150,
      render: (_: any, record: WorkOrder) => {
        const status = getSAPStatus(record);
        
        return (
          <Space>
            <Tooltip title="Preview Data SAP">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handlePreview(record)}
              />
            </Tooltip>
            {status === 'not_sent' && (
              <Tooltip title="Kirim ke SAP">
                <Button
                  type="text"
                  icon={<SendOutlined />}
                  onClick={() => handleSingleSend(record)}
                  disabled={!isAuthenticated}
                />
              </Tooltip>
            )}
            {status === 'error' && (
              <Tooltip title="Kirim Ulang ke SAP">
                <Button
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={() => handleSingleSend(record)}
                  disabled={!isAuthenticated}
                />
              </Tooltip>
            )}
          </Space>
        );
      }
    }
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
    getCheckboxProps: (record: WorkOrder) => ({
      disabled: getSAPStatus(record) === 'sent'
    })
  };

  return (
    <div className="kirim-sap-container">
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2}>
              <SendOutlined /> Kirim SAP
            </Title>
            <Text type="secondary">Kirim data MR Realization ke SAP PLN</Text>
          </div>

          {/* Statistics */}
          <Card title="Statistik" size="small">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Total"
                  value={statistics.total}
                  prefix={<DatabaseOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Belum Terkirim"
                  value={statistics.notSent}
                  valueStyle={{ color: '#faad14' }}
                  prefix={<ExclamationCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Terkirim"
                  value={statistics.sent}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Error"
                  value={statistics.error}
                  valueStyle={{ color: '#ff4d4f' }}
                  prefix={<CloseCircleOutlined />}
                />
              </Col>
            </Row>
          </Card>

          {/* SAP Connection */}
          <Card title="Koneksi SAP PLN" size="small">
            {isAuthenticated ? (
              <Alert
                message="Terhubung ke SAP PLN"
                description={
                  <div>
                    <p>User: <strong>{sapUsername}</strong></p>
                    {connectionInfo.authFormat && <p>Auth format: {connectionInfo.authFormat}</p>}
                    {connectionInfo.baseUrl && <p>Base URL: {connectionInfo.baseUrl}</p>}
                  </div>
                }
                type="success"
                showIcon
                action={
                  <Button 
                    size="small" 
                    danger 
                    onClick={() => {
                      setIsAuthenticated(false);
                      setSapUsername('');
                      setSapPassword('');
                      setConnectionInfo({});
                      sapLoginForm.resetFields();
                    }}
                  >
                    Disconnect
                  </Button>
                }
              />
            ) : (
              <>
                <Alert
                  message="Koneksi SAP PLN Diperlukan"
                  description="Masukkan kredensial SAP PLN untuk mengirim data Material Document"
                  type="warning"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
                
                <Form
                  form={sapLoginForm}
                  layout="inline"
                  onFinish={handleSAPLogin}
                >
                  <Form.Item
                    name="sapUsername"
                    rules={[{ required: true, message: 'Username SAP diperlukan!' }]}
                  >
                    <Input 
                      prefix={<UserOutlined />} 
                      placeholder="pusat\bastian.taka" 
                      style={{ width: 200 }}
                    />
                  </Form.Item>

                  <Form.Item
                    name="sapPassword"
                    rules={[{ required: true, message: 'Password SAP diperlukan!' }]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined />}
                      placeholder="Password SAP" 
                      style={{ width: 200 }}
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={authLoading}
                    >
                      Connect SAP
                    </Button>
                  </Form.Item>
                </Form>

                {authError && (
                  <Alert 
                    message={authError} 
                    type="error" 
                    showIcon 
                    style={{ marginTop: '16px' }} 
                  />
                )}
              </>
            )}
          </Card>

          {/* Actions */}
          <Card size="small">
            <Space>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleBatchSend}
                disabled={!isAuthenticated || selectedRowKeys.length === 0}
              >
                Kirim Terpilih ke SAP ({selectedRowKeys.length})
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchData}
                loading={loading}
              >
                Refresh Data
              </Button>
            </Space>
          </Card>

          {/* Table */}
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            rowSelection={rowSelection}
            scroll={{ x: 1500 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} items`
            }}
          />
        </Space>
      </Card>

      {/* Preview Modal */}
      <Modal
        title="Preview Data SAP"
        visible={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        footer={null}
        width={800}
      >
        {previewData && (
          <div>
            <Descriptions title="Work Order Info" bordered size="small">
              <Descriptions.Item label="Nomor Reservasi">
                {previewData.workOrder.nomorReservasi}
              </Descriptions.Item>
              <Descriptions.Item label="Pekerjaan">
                {previewData.workOrder.pekerjaan}
              </Descriptions.Item>
              <Descriptions.Item label="Pelaksana">
                {previewData.workOrder.pelaksana}
              </Descriptions.Item>
              <Descriptions.Item label="Kategori">
                {previewData.workOrder.category}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions title="SAP Document Header" bordered size="small">
              {Object.entries(previewData.sapDocument.header).map(([key, value]) => (
                <Descriptions.Item key={key} label={key}>
                  {value as string}
                </Descriptions.Item>
              ))}
            </Descriptions>

            <Divider />

            <Title level={5}>SAP Document Items</Title>
            <Table
              dataSource={previewData.sapDocument.items}
              columns={Object.keys(previewData.sapDocument.items[0] || {}).map(key => ({
                title: key,
                dataIndex: key,
                key: key
              }))}
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
            />

            {!previewData.validation.isValid && (
              <>
                <Divider />
                <Alert
                  message="Validasi Gagal"
                  description={
                    <ul>
                      {previewData.validation.errors.map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  }
                  type="error"
                  showIcon
                />
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Progress Modal */}
      <Modal
        title="Progress Pengiriman ke SAP"
        visible={progressModalVisible}
        onCancel={() => setProgressModalVisible(false)}
        footer={batchResults ? [
          <Button key="close" onClick={() => setProgressModalVisible(false)}>
            Tutup
          </Button>
        ] : null}
        closable={!!batchResults}
        maskClosable={false}
      >
        <div>
          <Progress percent={progress} status={progress === 100 ? 'success' : 'active'} />
          <p style={{ marginTop: '16px' }}>{progressText}</p>
          
          {batchResults && (
            <div style={{ marginTop: '16px' }}>
              <Alert
                message={`Proses Selesai: ${batchResults.processed} berhasil, ${batchResults.errors} error`}
                type={batchResults.errors === 0 ? 'success' : 'warning'}
                showIcon
              />
              
              {batchResults.results.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <Title level={5}>Hasil Detail:</Title>
                  {batchResults.results.map((result, index) => (
                    <div key={index} style={{ marginBottom: '8px' }}>
                      {result.success ? (
                        <Text type="success">
                          ✓ {result.mrId}: Material Document {result.materialDocument}
                        </Text>
                      ) : (
                        <Text type="danger">
                          ✗ {result.mrId}: {result.error}
                        </Text>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default KirimSAP;
