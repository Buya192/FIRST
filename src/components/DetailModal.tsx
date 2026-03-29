import React, { useState, useCallback } from 'react';
import {
  Modal, Tabs, Descriptions, Form, Input, DatePicker, Select, 
  InputNumber, Button, Upload, Card, List, Empty, Tag, 
  Typography, Row, Col, Space, message, Tooltip, Popconfirm,
  Alert, Progress, Spin
} from 'antd';
import {
  InfoCircleOutlined, EditOutlined, FileImageOutlined, 
  FileTextOutlined, MessageOutlined, UploadOutlined,
  DeleteOutlined, EyeOutlined, DownloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../utils/firebase';
import moment from 'moment';
import DocumentUploadManager from './DocumentUploadManager';

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

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
  marketplaceOrderId?: string;
  marketplaceStatus?: string;
  marketplaceLastSync?: string;
}

interface DetailModalProps {
  visible: boolean;
  onClose: () => void;
  item: MonitoringMasukItem | null;
  onRefresh: () => void;
}

interface FileItem {
  uid: string;
  name: string;
  url: string;
  status: 'done' | 'uploading' | 'error';
  percent?: number;
}

const DetailModal: React.FC<DetailModalProps> = ({ 
  visible, 
  onClose, 
  item, 
  onRefresh 
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoFileList, setPhotoFileList] = useState<FileItem[]>([]);

  // Initialize form when item changes
  React.useEffect(() => {
    if (item && visible) {
      form.setFieldsValue({
        ...item,
        tanggal: item.tanggal ? moment(item.tanggal) : undefined,
        tanggalTiba: item.tanggalTiba ? moment(item.tanggalTiba) : undefined,
      });
      
      // Initialize photo file list
      if (item.foto && item.foto.length > 0) {
        const photoFiles = item.foto.map((url, index) => ({
          uid: `photo-${index}`,
          name: `Foto ${index + 1}`,
          url: url,
          status: 'done' as const
        }));
        setPhotoFileList(photoFiles);
      } else {
        setPhotoFileList([]);
      }
    }
  }, [item, visible, form]);

  // Handle form submission for edit
  const handleEditSubmit = async (values: any) => {
    if (!item) return;

    setLoading(true);
    try {
      const updateData = {
        ...values,
        tanggal: values.tanggal ? values.tanggal.format('YYYY-MM-DD') : item.tanggal,
        tanggalTiba: values.tanggalTiba ? values.tanggalTiba.format('YYYY-MM-DD') : item.tanggalTiba,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'transaksiMasuk', item.id), updateData);
      message.success('Data berhasil diperbarui');
      onRefresh();
    } catch (error) {
      console.error('Error updating data:', error);
      message.error('Gagal memperbarui data');
    } finally {
      setLoading(false);
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (file: File) => {
    if (!item) return;

    setUploadingPhotos(true);
    try {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `foto_${timestamp}.${fileExt}`;
      const filePath = `transaksiMasuk/${item.nomorSPBKontrak}/foto/${fileName}`;
      
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload progress: ${progress}%`);
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              
              // Update Firestore with new photo URL
              const currentPhotos = item.foto || [];
              const updatedPhotos = [...currentPhotos, downloadURL];
              
              await updateDoc(doc(db, 'transaksiMasuk', item.id), {
                foto: updatedPhotos,
                updatedAt: serverTimestamp()
              });

              message.success('Foto berhasil diupload');
              onRefresh();
              resolve(downloadURL);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      message.error('Gagal mengupload foto');
      throw error;
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Handle photo deletion
  const handlePhotoDelete = async (photoUrl: string) => {
    if (!item) return;

    try {
      // Delete from storage
      const photoRef = ref(storage, photoUrl);
      await deleteObject(photoRef);

      // Update Firestore
      const updatedPhotos = (item.foto || []).filter(url => url !== photoUrl);
      await updateDoc(doc(db, 'transaksiMasuk', item.id), {
        foto: updatedPhotos,
        updatedAt: serverTimestamp()
      });

      message.success('Foto berhasil dihapus');
      onRefresh();
    } catch (error) {
      console.error('Error deleting photo:', error);
      message.error('Gagal menghapus foto');
    }
  };

  // Get archive status
  const getArchiveStatus = () => {
    if (!item) return { complete: false, missing: [] };
    
    const missing = [];
    if (!item.foto || item.foto.length === 0) missing.push('Foto');
    if (!item.dokumen || item.dokumen.length === 0) missing.push('Dokumen');
    if (!item.nomorTUG3) missing.push('Nomor TUG3');
    if (!item.nomorTUG4) missing.push('Nomor TUG4');
    if (item.qtyDiterima <= 0) missing.push('QTY Diterima');

    return { complete: missing.length === 0, missing };
  };

  if (!item) return null;

  const archiveStatus = getArchiveStatus();

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <InfoCircleOutlined style={{ color: '#1890ff' }} />
          <span>Detail Transaksi - {item.nomorSPBKontrak}</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={1000}
      style={{ top: 20 }}
      bodyStyle={{ padding: 0 }}
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        style={{ padding: '0 24px' }}
      >
        {/* Tab 1: Detail Information */}
        <TabPane 
          tab={
            <span>
              <InfoCircleOutlined />
              Detail Transaksi
            </span>
          } 
          key="1"
        >
          <div style={{ padding: '16px 0' }}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Alert
                  message="Status Arsip"
                  description={
                    archiveStatus.complete 
                      ? "Arsip lengkap - Semua dokumen dan foto tersedia"
                      : `Arsip belum lengkap. Kurang: ${archiveStatus.missing.join(', ')}`
                  }
                  type={archiveStatus.complete ? "success" : "warning"}
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              </Col>
            </Row>

            <Descriptions
              title="Informasi Lengkap"
              bordered
              column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
              size="middle"
            >
              <Descriptions.Item label="Nomor SPB/Kontrak">
                <Text strong>{item.nomorSPBKontrak}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tanggal">
                {moment(item.tanggal).format('DD MMMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Normalisasi">
                {item.normalisasiNumber || <Text type="secondary">-</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Nama Material">
                <Text copyable>{item.namaMaterial}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Fungsi">{item.fungsi}</Descriptions.Item>
              <Descriptions.Item label="Penyedia">{item.penyedia}</Descriptions.Item>
              <Descriptions.Item label="Tanggal Tiba">
                {moment(item.tanggalTiba).format('DD MMMM YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="No PO">
                {item.noPO || <Text type="secondary">-</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="QTY Pesan">
                <Tag color="blue">{item.qtyPesan}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="QTY Diterima">
                <Tag color="green">{item.qtyDiterima}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Nomor TUG 3">
                {item.nomorTUG3 || <Text type="secondary">-</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Nomor TUG 4">
                {item.nomorTUG4 || <Text type="secondary">-</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Jenis Material">
                <Tag color={item.jenisMaterial === 'eksklusif' ? 'purple' : 'cyan'}>
                  {item.jenisMaterial === 'eksklusif' ? 'Eksklusif' : 'Umum'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={
                  item.status === 'selesai' ? 'success' : 
                  item.status === 'proses' ? 'processing' : 'default'
                }>
                  {item.status}
                </Tag>
              </Descriptions.Item>
              {item.marketplaceOrderId && (
                <>
                  <Descriptions.Item label="Marketplace Order ID">
                    <Tag color="blue">{item.marketplaceOrderId}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Marketplace Status">
                    <Tag color="purple">{item.marketplaceStatus}</Tag>
                  </Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="Keterangan" span={2}>
                {item.keterangan || <Text type="secondary">Tidak ada keterangan.</Text>}
              </Descriptions.Item>
            </Descriptions>
          </div>
        </TabPane>

        {/* Tab 2: Edit Data */}
        <TabPane 
          tab={
            <span>
              <EditOutlined />
              Edit Data
            </span>
          } 
          key="2"
        >
          <div style={{ padding: '16px 0' }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleEditSubmit}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="nomorSPBKontrak"
                    label="Nomor SPB/Kontrak"
                    rules={[{ required: true, message: 'Wajib diisi' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="tanggal"
                    label="Tanggal"
                    rules={[{ required: true, message: 'Wajib diisi' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="normalisasiNumber" label="Nomor Normalisasi">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="namaMaterial"
                    label="Nama Material"
                    rules={[{ required: true, message: 'Wajib diisi' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="fungsi"
                    label="Fungsi"
                    rules={[{ required: true, message: 'Wajib diisi' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="penyedia"
                    label="Penyedia"
                    rules={[{ required: true, message: 'Wajib diisi' }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="tanggalTiba"
                    label="Tanggal Tiba"
                    rules={[{ required: true, message: 'Wajib diisi' }]}
                  >
                    <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="noPO" label="No PO">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="qtyPesan"
                    label="QTY Pesan"
                    rules={[{ required: true, message: 'Wajib diisi' }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="qtyDiterima"
                    label="QTY Diterima"
                    rules={[{ required: true, message: 'Wajib diisi' }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="nomorTUG3" label="Nomor TUG 3">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="nomorTUG4" label="Nomor TUG 4">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="jenisMaterial"
                    label="Jenis Material"
                    rules={[{ required: true, message: 'Wajib diisi' }]}
                  >
                    <Select>
                      <Option value="umum">Umum</Option>
                      <Option value="eksklusif">Eksklusif</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="status"
                    label="Status"
                    rules={[{ required: true, message: 'Wajib diisi' }]}
                  >
                    <Select>
                      <Option value="draft">Draft</Option>
                      <Option value="proses">Proses</Option>
                      <Option value="selesai">Selesai</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="keterangan" label="Keterangan">
                    <TextArea rows={3} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => form.resetFields()}>
                    Reset
                  </Button>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    Simpan Perubahan
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        </TabPane>

        {/* Tab 3: Arsip Foto */}
        <TabPane 
          tab={
            <span>
              <FileImageOutlined />
              Arsip Foto ({item.foto?.length || 0})
            </span>
          } 
          key="3"
        >
          <div style={{ padding: '16px 0' }}>
            <Card title="Upload Foto Baru" style={{ marginBottom: 16 }}>
              <Upload.Dragger
                name="file"
                multiple={false}
                accept="image/*"
                showUploadList={false}
                customRequest={async ({ file, onSuccess, onError }) => {
                  try {
                    const url = await handlePhotoUpload(file as File);
                    onSuccess?.(url);
                  } catch (error) {
                    onError?.(error as Error);
                  }
                }}
                disabled={uploadingPhotos}
              >
                <p className="ant-upload-drag-icon">
                  <FileImageOutlined />
                </p>
                <p className="ant-upload-text">
                  {uploadingPhotos ? 'Mengupload...' : 'Klik atau drag foto ke area ini'}
                </p>
                <p className="ant-upload-hint">
                  Support: JPG, PNG, GIF. Maksimal 5MB per file.
                </p>
              </Upload.Dragger>
              {uploadingPhotos && (
                <div style={{ marginTop: 16 }}>
                  <Spin /> <Text>Sedang mengupload foto...</Text>
                </div>
              )}
            </Card>

            <Card title={`Foto Tersimpan (${item.foto?.length || 0})`}>
              {item.foto && item.foto.length > 0 ? (
                <Row gutter={[16, 16]}>
                  {item.foto.map((url, index) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={index}>
                      <Card
                        hoverable
                        cover={
                          <img 
                            alt={`Foto ${index + 1}`} 
                            src={url} 
                            style={{ height: 150, objectFit: 'cover' }}
                          />
                        }
                        actions={[
                          <Tooltip title="Lihat">
                            <Button 
                              type="text" 
                              icon={<EyeOutlined />}
                              onClick={() => window.open(url, '_blank')}
                            />
                          </Tooltip>,
                          <Tooltip title="Download">
                            <Button 
                              type="text" 
                              icon={<DownloadOutlined />}
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = `foto_${index + 1}.jpg`;
                                link.click();
                              }}
                            />
                          </Tooltip>,
                          <Popconfirm
                            title="Yakin ingin menghapus foto ini?"
                            onConfirm={() => handlePhotoDelete(url)}
                            okText="Ya"
                            cancelText="Tidak"
                          >
                            <Tooltip title="Hapus">
                              <Button 
                                type="text" 
                                danger 
                                icon={<DeleteOutlined />}
                              />
                            </Tooltip>
                          </Popconfirm>
                        ]}
                      >
                        <Card.Meta title={`Foto ${index + 1}`} />
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                <Empty 
                  description="Belum ada foto yang diupload"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </div>
        </TabPane>

        {/* Tab 4: Arsip Dokumen */}
        <TabPane 
          tab={
            <span>
              <FileTextOutlined />
              Arsip Dokumen ({item.dokumen?.length || 0})
            </span>
          } 
          key="4"
        >
          <div style={{ padding: '16px 0' }}>
            <DocumentUploadManager 
              item={item}
              onRefresh={onRefresh}
            />
          </div>
        </TabPane>

        {/* Tab 5: Keterangan & Riwayat */}
        <TabPane 
          tab={
            <span>
              <MessageOutlined />
              Keterangan
            </span>
          } 
          key="5"
        >
          <div style={{ padding: '16px 0' }}>
            <Card title="Keterangan Transaksi">
              <Text>
                {item.keterangan || 'Tidak ada keterangan untuk transaksi ini.'}
              </Text>
            </Card>

            <Card title="Informasi Sistem" style={{ marginTop: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Dibuat">
                  {item.createdAt ? moment(item.createdAt.toDate()).format('DD MMMM YYYY, HH:mm') : '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Terakhir Diperbarui">
                  {item.updatedAt ? moment(item.updatedAt.toDate()).format('DD MMMM YYYY, HH:mm') : '-'}
                </Descriptions.Item>
                {item.marketplaceLastSync && (
                  <Descriptions.Item label="Terakhir Sync Marketplace">
                    {moment(item.marketplaceLastSync).format('DD MMMM YYYY, HH:mm')}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default DetailModal;
