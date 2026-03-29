import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Select, Form, Card, Spin, Alert, Typography, Space, Statistic, Row, Col } from 'antd';
import { SearchOutlined, SyncOutlined, DatabaseOutlined, LockOutlined, UserOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { getSAPMaterialStock, SAPMaterialStock, testSAPConnection, getPLNHierarchy, formatStockData, calculateStockSummary, SAPResponse, PLNHierarchy } from '../utils/sap-api-enhanced';
import logger from '../utils/logger';

const { Title, Text } = Typography;
const { Option } = Select;

interface StockSAPProps {}

const StockSAP: React.FC<StockSAPProps> = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stocks, setStocks] = useState<SAPMaterialStock[]>([]);
  const [form] = Form.useForm();
  
  // State untuk SAP login berdasarkan analisis AGO PLN
  const [sapUsername, setSapUsername] = useState<string>('');
  const [sapPassword, setSapPassword] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sapLoginForm] = Form.useForm();
  
  // State untuk informasi koneksi SAP
  const [connectionInfo, setConnectionInfo] = useState<{
    authFormat?: number;
    baseUrl?: string;
    urlIndex?: number;
  }>({});
  
  // State untuk hierarki PLN
  const [plnHierarchy, setPlnHierarchy] = useState<PLNHierarchy>({
    plants: [],
    storageLocations: []
  });
  
  // State untuk summary data seperti di AGO PLN
  const [stockSummary, setStockSummary] = useState<any>(null);

  // Kolom untuk tabel berdasarkan analisis AGO PLN
  const columns = [
    {
      title: 'Material',
      dataIndex: 'Material',
      key: 'Material',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => a.Material.localeCompare(b.Material),
      width: 120,
    },
    {
      title: 'Nama Material',
      dataIndex: 'MaterialName',
      key: 'MaterialName',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => a.MaterialName.localeCompare(b.MaterialName),
      width: 200,
    },
    {
      title: 'Plant',
      dataIndex: 'Plant',
      key: 'Plant',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => a.Plant.localeCompare(b.Plant),
      width: 100,
    },
    {
      title: 'Storage Location',
      dataIndex: 'StorageLocation',
      key: 'StorageLocation',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => a.StorageLocation.localeCompare(b.StorageLocation),
      width: 120,
    },
    {
      title: 'Batch',
      dataIndex: 'BatchNumber',
      key: 'BatchNumber',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => {
        if (!a.BatchNumber) return -1;
        if (!b.BatchNumber) return 1;
        return a.BatchNumber.localeCompare(b.BatchNumber);
      },
      width: 100,
    },
    {
      title: 'Tipe Stok',
      dataIndex: 'InventoryStockType',
      key: 'InventoryStockType',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => a.InventoryStockType.localeCompare(b.InventoryStockType),
      width: 120,
    },
    {
      title: 'Satuan',
      dataIndex: 'MaterialBaseUnit',
      key: 'MaterialBaseUnit',
      width: 80,
    },
    {
      title: 'Kuantitas',
      dataIndex: 'MatlWrhsStkQtyInMatlBaseUnit',
      key: 'MatlWrhsStkQtyInMatlBaseUnit',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => a.MatlWrhsStkQtyInMatlBaseUnit - b.MatlWrhsStkQtyInMatlBaseUnit,
      render: (value: number) => (
        <Text strong style={{ color: value > 0 ? '#52c41a' : '#ff4d4f' }}>
          {value.toLocaleString('id-ID')}
        </Text>
      ),
      width: 120,
    },
    {
      title: 'Stok Terblokir',
      dataIndex: 'BlockedStockQuantity',
      key: 'BlockedStockQuantity',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => {
        const aValue = a.BlockedStockQuantity || 0;
        const bValue = b.BlockedStockQuantity || 0;
        return aValue - bValue;
      },
      render: (value: number) => (
        <Text style={{ color: value > 0 ? '#faad14' : '#8c8c8c' }}>
          {(value || 0).toLocaleString('id-ID')}
        </Text>
      ),
      width: 120,
    },
    {
      title: 'Stok Dalam Transit',
      dataIndex: 'StockInTransitQuantity',
      key: 'StockInTransitQuantity',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => {
        const aValue = a.StockInTransitQuantity || 0;
        const bValue = b.StockInTransitQuantity || 0;
        return aValue - bValue;
      },
      render: (value: number) => (
        <Text style={{ color: value > 0 ? '#1890ff' : '#8c8c8c' }}>
          {(value || 0).toLocaleString('id-ID')}
        </Text>
      ),
      width: 120,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record: SAPMaterialStock) => {
        const quantity = record.MatlWrhsStkQtyInMatlBaseUnit;
        if (quantity > 0) {
          return <Text style={{ color: '#52c41a' }}>Available</Text>;
        } else {
          return <Text style={{ color: '#ff4d4f' }}>Empty</Text>;
        }
      },
      width: 80,
    },
  ];

  // Fungsi untuk menangani login SAP berdasarkan format AGO PLN
  const handleSAPLogin = async (values: any) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      // Simpan kredensial di state
      setSapUsername(values.sapUsername);
      setSapPassword(values.sapPassword);
      
      // Panggil fungsi untuk tes koneksi SAP
      const result = await testSAPConnection(values.sapUsername, values.sapPassword);
      
      if (result.success) {
        setIsAuthenticated(true);
        setConnectionInfo({
          authFormat: result.authFormat,
          baseUrl: result.baseUrl,
          urlIndex: result.urlIndex
        });
        
        // Load PLN hierarchy setelah berhasil login
        try {
          const hierarchyResult = await getPLNHierarchy(values.sapUsername, values.sapPassword);
          if (hierarchyResult.success && hierarchyResult.data) {
            setPlnHierarchy(hierarchyResult.data);
          }
        } catch (hierarchyError) {
          console.warn('Failed to load PLN hierarchy:', hierarchyError);
        }
        
        logger.info(`StockSAP: Successfully authenticated with SAP using format ${result.authFormat}`);
      } else {
        setAuthError(result.message || 'Gagal terhubung ke SAP. Periksa kredensial Anda.');
        logger.error('StockSAP: Failed to authenticate with SAP', result.message);
      }
    } catch (err) {
      setAuthError('Terjadi kesalahan saat menghubungkan ke SAP.');
      logger.error('StockSAP: Error authenticating with SAP', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Fungsi untuk memuat data stok SAP dengan enhanced features
  const fetchSAPStocks = async (values: any) => {
    if (!isAuthenticated) {
      setError('Anda harus terhubung ke SAP terlebih dahulu.');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      logger.info('StockSAP: Fetching SAP stocks', values);
      const { materialId, plant, storageLocation } = values;
      
      // Panggil enhanced API
      const result = await getSAPMaterialStock(
        materialId, 
        plant, 
        storageLocation, 
        sapUsername, 
        sapPassword
      );
      
      if (result.success && result.data) {
        const stocksData = result.data;
        setStocks(stocksData);
        
        // Hitung summary seperti di AGO PLN
        const summary = calculateStockSummary(stocksData);
        setStockSummary(summary);
        
        logger.info(`StockSAP: Fetched ${stocksData.length} SAP stocks`);
        
        if (result.fromCache) {
          setError('Data diambil dari cache karena koneksi SAP bermasalah.');
        }
      } else {
        setError(result.error || 'Gagal memuat data stok SAP.');
      }
    } catch (err) {
      logger.error('StockSAP: Error fetching SAP stocks', err);
      setError('Gagal memuat data stok SAP. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk menangani submit form
  const handleSearch = (values: any) => {
    fetchSAPStocks(values);
  };

  // Fungsi untuk mereset form
  const handleReset = () => {
    form.resetFields();
    setStocks([]);
    setStockSummary(null);
  };

  // Memuat data saat komponen dimount
  useEffect(() => {
    logger.info('StockSAP: Component mounted');
    return () => {
      logger.info('StockSAP: Component unmounted');
    };
  }, []);

  return (
    <div className="stock-sap-container">
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={2}>
              <DatabaseOutlined /> Stock SAP PLN
            </Title>
            <Text type="secondary">Terintegrasi dengan AGO PLN</Text>
          </div>

          <Card title="SAP Connection" style={{ marginBottom: '16px' }}>
            {isAuthenticated ? (
              <Alert
                message="Connected to SAP PLN"
                description={
                  <div>
                    <p>Logged in as <strong>{sapUsername}</strong></p>
                    {connectionInfo.authFormat && <p>Auth format: {connectionInfo.authFormat}</p>}
                    {connectionInfo.baseUrl && <p>Base URL: {connectionInfo.baseUrl}</p>}
                    <p>Status: <Text style={{ color: '#52c41a' }}>Active</Text></p>
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
                      setPlnHierarchy({ plants: [], storageLocations: [] });
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
                  message="SAP PLN Login Instructions"
                  description={
                    <div>
                      <p>Berdasarkan analisis AGO PLN, gunakan format berikut:</p>
                      <ol>
                        <li>Format domain: <code>pusat\username</code> (contoh: <code>pusat\bastian.taka</code>)</li>
                        <li>Username biasa: <code>username</code> (contoh: <code>bastian.taka</code>)</li>
                        <li>Username tanpa titik: <code>bastiantaka</code></li>
                        <li>ID numerik PLN jika ada</li>
                      </ol>
                      <p>Sistem akan mencoba beberapa format autentikasi dan URL SAP PLN secara otomatis.</p>
                    </div>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
                
                <Form
                  form={sapLoginForm}
                  layout="vertical"
                  onFinish={handleSAPLogin}
                >
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <Form.Item
                      name="sapUsername"
                      label="SAP Username"
                      style={{ flex: 1, minWidth: '200px' }}
                      rules={[{ required: true, message: 'Please input your SAP username!' }]}
                    >
                      <Input 
                        prefix={<UserOutlined className="site-form-item-icon" />} 
                        placeholder="pusat\bastian.taka atau bastian.taka" 
                      />
                    </Form.Item>

                    <Form.Item
                      name="sapPassword"
                      label="SAP Password"
                      style={{ flex: 1, minWidth: '200px' }}
                      rules={[{ required: true, message: 'Please input your SAP password!' }]}
                    >
                      <Input.Password 
                        prefix={<LockOutlined className="site-form-item-icon" />}
                        placeholder="Enter SAP password" 
                      />
                    </Form.Item>
                  </div>

                  {authError && <Alert message={authError} type="error" showIcon style={{ marginBottom: '16px' }} />}

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={authLoading}
                    >
                      Connect to SAP PLN
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </Card>

          {/* Summary Statistics seperti di AGO PLN */}
          {stockSummary && (
            <Card title="Stock Summary" style={{ marginBottom: '16px' }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="Total Materials"
                    value={stockSummary.totalMaterials}
                    prefix={<InfoCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Total Quantity"
                    value={stockSummary.totalQuantity}
                    formatter={(value) => value?.toLocaleString('id-ID')}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Available Materials"
                    value={stockSummary.availableMaterials}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Empty Materials"
                    value={stockSummary.emptyMaterials}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Col>
              </Row>
            </Card>
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSearch}
            initialValues={{
              materialId: '',
              plant: '',
              storageLocation: '',
            }}
          >
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Form.Item
                name="materialId"
                label="Material ID"
                style={{ flex: 1, minWidth: '200px' }}
              >
                <Input placeholder="Masukkan Material ID" />
              </Form.Item>

              <Form.Item
                name="plant"
                label="Plant"
                style={{ flex: 1, minWidth: '200px' }}
              >
                <Select placeholder="Pilih Plant" allowClear showSearch>
                  {plnHierarchy.plants.map(plant => (
                    <Option key={plant} value={plant}>{plant}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="storageLocation"
                label="Storage Location"
                style={{ flex: 1, minWidth: '200px' }}
              >
                <Select placeholder="Pilih Storage Location" allowClear showSearch>
                  {plnHierarchy.storageLocations.map(location => (
                    <Option key={location} value={location}>{location}</Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button onClick={handleReset}>Reset</Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                loading={loading}
                disabled={!isAuthenticated}
              >
                Cari Stock SAP
              </Button>
            </div>
          </Form>

          {error && <Alert message={error} type="error" showIcon />}

          <div className="table-container">
            <Spin spinning={loading}>
              <Table
                columns={columns}
                dataSource={stocks.map((stock, index) => ({ ...stock, key: index }))}
                bordered
                size="middle"
                scroll={{ x: 'max-content' }}
                pagination={{ 
                  pageSize: 20,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
                }}
                summary={(pageData) => {
                  let totalQuantity = 0;
                  let totalBlocked = 0;
                  let totalTransit = 0;

                  pageData.forEach(({ MatlWrhsStkQtyInMatlBaseUnit, BlockedStockQuantity, StockInTransitQuantity }) => {
                    totalQuantity += MatlWrhsStkQtyInMatlBaseUnit || 0;
                    totalBlocked += BlockedStockQuantity || 0;
                    totalTransit += StockInTransitQuantity || 0;
                  });

                  return (
                    <>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={7}>
                          <strong>Total (Current Page)</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>
                          <Text strong style={{ color: '#3f8600' }}>
                            {totalQuantity.toLocaleString('id-ID')}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2}>
                          <Text strong style={{ color: '#faad14' }}>
                            {totalBlocked.toLocaleString('id-ID')}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3}>
                          <Text strong style={{ color: '#1890ff' }}>
                            {totalTransit.toLocaleString('id-ID')}
                          </Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4}>
                          <Text strong>-</Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </>
                  );
                }}
              />
            </Spin>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default StockSAP;
