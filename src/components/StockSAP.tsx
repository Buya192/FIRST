import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Select, Form, Card, Spin, Alert, Typography, Space } from 'antd';
import { SearchOutlined, SyncOutlined, DatabaseOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { getSAPMaterialStock, SAPMaterialStock, testSAPConnection } from '../utils/sap-api';
import logger from '../utils/logger';

const { Title } = Typography;
const { Option } = Select;

interface StockSAPProps {}

const StockSAP: React.FC<StockSAPProps> = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stocks, setStocks] = useState<SAPMaterialStock[]>([]);
  const [form] = Form.useForm();
  
  // State untuk SAP login
  const [sapUsername, setSapUsername] = useState<string>('');
  const [sapPassword, setSapPassword] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sapLoginForm] = Form.useForm();

  // Kolom untuk tabel
  const columns = [
    {
      title: 'Material',
      dataIndex: 'Material',
      key: 'Material',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => a.Material.localeCompare(b.Material),
    },
    {
      title: 'Nama Material',
      dataIndex: 'MaterialName',
      key: 'MaterialName',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => a.MaterialName.localeCompare(b.MaterialName),
    },
    {
      title: 'Plant',
      dataIndex: 'Plant',
      key: 'Plant',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => a.Plant.localeCompare(b.Plant),
    },
    {
      title: 'Storage Location',
      dataIndex: 'StorageLocation',
      key: 'StorageLocation',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => a.StorageLocation.localeCompare(b.StorageLocation),
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
    },
    {
      title: 'Tipe Stok',
      dataIndex: 'InventoryStockType',
      key: 'InventoryStockType',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => a.InventoryStockType.localeCompare(b.InventoryStockType),
    },
    {
      title: 'Satuan',
      dataIndex: 'MaterialBaseUnit',
      key: 'MaterialBaseUnit',
    },
    {
      title: 'Kuantitas',
      dataIndex: 'MatlWrhsStkQtyInMatlBaseUnit',
      key: 'MatlWrhsStkQtyInMatlBaseUnit',
      sorter: (a: SAPMaterialStock, b: SAPMaterialStock) => a.MatlWrhsStkQtyInMatlBaseUnit - b.MatlWrhsStkQtyInMatlBaseUnit,
      render: (value: number) => value.toLocaleString(),
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
      render: (value: number) => (value ? value.toLocaleString() : '0'),
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
      render: (value: number) => (value ? value.toLocaleString() : '0'),
    },
  ];

  // State untuk menyimpan format autentikasi yang berhasil
  const [authFormat, setAuthFormat] = useState<number | null>(null);

  // Fungsi untuk menangani login SAP
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
        setAuthFormat(result.format || null);
        logger.info(`StockSAP: Successfully authenticated with SAP using format ${result.format}`);
      } else {
        setAuthError('Gagal terhubung ke SAP. Periksa kredensial Anda.');
        logger.error('StockSAP: Failed to authenticate with SAP', result.message);
      }
    } catch (err) {
      setAuthError('Terjadi kesalahan saat menghubungkan ke SAP.');
      logger.error('StockSAP: Error authenticating with SAP', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Fungsi untuk memuat data stok SAP
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
      // Sertakan kredensial SAP
      const stocksData = await getSAPMaterialStock(
        materialId, 
        plant, 
        storageLocation, 
        sapUsername, 
        sapPassword
      );
      setStocks(stocksData);
      logger.info(`StockSAP: Fetched ${stocksData.length} SAP stocks`);
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
              <DatabaseOutlined /> Stock SAP
            </Title>
          </div>

          <Card title="SAP Connection" style={{ marginBottom: '16px' }}>
            {isAuthenticated ? (
              <Alert
                message="Connected to SAP"
                description={
                  <div>
                    <p>Logged in as <strong>{sapUsername}</strong></p>
                    {authFormat && <p>Connection format: {authFormat}</p>}
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
                      setAuthFormat(null);
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
                  message="SAP Login Instructions"
                  description={
                    <div>
                      <p>Coba beberapa format username berikut:</p>
                      <ol>
                        <li>Username SAP biasa (contoh: <code>ariantara.putra</code>)</li>
                        <li>ID numerik (contoh: <code>71948408</code>)</li>
                        <li>Username tanpa domain (jika menggunakan format <code>domain\username</code>)</li>
                        <li>Username tanpa titik (contoh: <code>ariantaraputra</code>)</li>
                      </ol>
                      <p>Sistem akan mencoba beberapa format autentikasi secara otomatis.</p>
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
                        placeholder="Enter SAP username" 
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
                      Connect to SAP
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </Card>

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
                <Input placeholder="Masukkan Plant" />
              </Form.Item>

              <Form.Item
                name="storageLocation"
                label="Storage Location"
                style={{ flex: 1, minWidth: '200px' }}
              >
                <Input placeholder="Masukkan Storage Location" />
              </Form.Item>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <Button onClick={handleReset}>Reset</Button>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
                loading={loading}
              >
                Cari
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
                pagination={{ pageSize: 10 }}
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
                          <strong>Total</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>
                          <strong>{totalQuantity.toLocaleString()}</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={2}>
                          <strong>{totalBlocked.toLocaleString()}</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3}>
                          <strong>{totalTransit.toLocaleString()}</strong>
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
