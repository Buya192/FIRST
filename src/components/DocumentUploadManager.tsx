import React, { useState, useCallback } from 'react';
import {
  Card, Upload, Button, List, Empty, Modal, Form, Input, Select,
  Typography, Space, message, Tooltip, Popconfirm, Row, Col,
  Tag, Alert, Progress, Spin
} from 'antd';
import {
  UploadOutlined, FileTextOutlined, DeleteOutlined, 
  EyeOutlined, DownloadOutlined, EditOutlined,
  FileAddOutlined, FilePdfOutlined, FileWordOutlined,
  FileExcelOutlined, FileImageOutlined
} from '@ant-design/icons';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../utils/firebase';

const { Text, Title } = Typography;
const { Option } = Select;

interface MonitoringMasukItem {
  id: string;
  nomorSPBKontrak: string;
  dokumen?: DocumentItem[];
  [key: string]: any;
}

interface DocumentItem {
  id: string;
  originalFileName: string;
  customName: string;
  documentType: DocumentType;
  uploadDate: string;
  fileUrl: string;
  fileSize: number;
  uploadedBy?: string;
  mimeType?: string;
}

type DocumentType = 'TUG3' | 'TUG4' | 'SuratJalan' | 'Invoice' | 'BeritaAcara' | 'Lainnya';

interface DocumentUploadManagerProps {
  item: MonitoringMasukItem;
  onRefresh: () => void;
}

interface CustomNamingModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (customName: string, documentType: DocumentType) => void;
  originalFileName: string;
  loading: boolean;
}

const CustomNamingModal: React.FC<CustomNamingModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  originalFileName,
  loading
}) => {
  const [form] = Form.useForm();

  const handleSubmit = (values: { customName: string; documentType: DocumentType }) => {
    onSubmit(values.customName, values.documentType);
  };

  const generateSuggestedName = (type: DocumentType) => {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suggestions = {
      TUG3: `TUG3_Material_${timestamp}`,
      TUG4: `TUG4_Material_${timestamp}`,
      SuratJalan: `SuratJalan_${timestamp}`,
      Invoice: `Invoice_${timestamp}`,
      BeritaAcara: `BeritaAcara_${timestamp}`,
      Lainnya: `Dokumen_${timestamp}`
    };
    return suggestions[type];
  };

  return (
    <Modal
      title="Beri Nama Dokumen"
      open={visible}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={500}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          documentType: 'Lainnya',
          customName: originalFileName.replace(/\.[^/.]+$/, "")
        }}
      >
        <Alert
          message="Informasi File"
          description={`File asli: ${originalFileName}`}
          type="info"
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          name="documentType"
          label="Jenis Dokumen"
          rules={[{ required: true, message: 'Pilih jenis dokumen' }]}
        >
          <Select 
            placeholder="Pilih jenis dokumen"
            onChange={(value: DocumentType) => {
              const suggestedName = generateSuggestedName(value);
              form.setFieldsValue({ customName: suggestedName });
            }}
          >
            <Option value="TUG3">TUG 3</Option>
            <Option value="TUG4">TUG 4</Option>
            <Option value="SuratJalan">Surat Jalan</Option>
            <Option value="Invoice">Invoice</Option>
            <Option value="BeritaAcara">Berita Acara</Option>
            <Option value="Lainnya">Lainnya</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="customName"
          label="Nama Dokumen"
          rules={[
            { required: true, message: 'Nama dokumen wajib diisi' },
            { min: 3, message: 'Nama dokumen minimal 3 karakter' },
            { max: 100, message: 'Nama dokumen maksimal 100 karakter' },
            { 
              pattern: /^[a-zA-Z0-9_\-\s]+$/, 
              message: 'Hanya boleh menggunakan huruf, angka, underscore, dash, dan spasi' 
            }
          ]}
        >
          <Input 
            placeholder="Masukkan nama dokumen"
            suffix={
              <Tooltip title="Nama ini akan digunakan untuk menyimpan dokumen">
                <FileTextOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
              </Tooltip>
            }
          />
        </Form.Item>

        <Alert
          message="Tips Penamaan"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Gunakan nama yang deskriptif dan mudah dicari</li>
              <li>Sertakan tanggal jika diperlukan (YYYY-MM-DD)</li>
              <li>Hindari karakter khusus seperti /, \, :, *, ?, ", &lt;, &gt;, |</li>
            </ul>
          }
          type="info"
          showIcon={false}
          style={{ marginTop: 8 }}
        />
      </Form>
    </Modal>
  );
};

const DocumentUploadManager: React.FC<DocumentUploadManagerProps> = ({ 
  item, 
  onRefresh 
}) => {
  const [uploading, setUploading] = useState(false);
  const [customNamingVisible, setCustomNamingVisible] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Get file icon based on mime type
  const getFileIcon = (mimeType?: string, fileName?: string) => {
    if (!mimeType && !fileName) return <FileTextOutlined />;
    
    const type = mimeType || '';
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    
    if (type.includes('pdf') || ext === 'pdf') return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    if (type.includes('word') || ['doc', 'docx'].includes(ext)) return <FileWordOutlined style={{ color: '#1890ff' }} />;
    if (type.includes('excel') || type.includes('spreadsheet') || ['xls', 'xlsx'].includes(ext)) return <FileExcelOutlined style={{ color: '#52c41a' }} />;
    if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return <FileImageOutlined style={{ color: '#722ed1' }} />;
    
    return <FileTextOutlined />;
  };

  // Get document type color
  const getDocumentTypeColor = (type: DocumentType) => {
    const colors = {
      TUG3: 'blue',
      TUG4: 'purple',
      SuratJalan: 'green',
      Invoice: 'orange',
      BeritaAcara: 'cyan',
      Lainnya: 'default'
    };
    return colors[type];
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    if (!allowedTypes.includes(file.type)) {
      message.error('Format file tidak didukung. Gunakan PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, atau GIF.');
      return false;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      message.error('Ukuran file maksimal 10MB.');
      return false;
    }

    setPendingFile(file);
    setCustomNamingVisible(true);
    return false; // Prevent auto upload
  };

  // Handle custom naming submission
  const handleCustomNamingSubmit = async (customName: string, documentType: DocumentType) => {
    if (!pendingFile) return;

    setUploading(true);
    try {
      const timestamp = Date.now();
      const fileExt = pendingFile.name.split('.').pop() || 'pdf';
      const fileName = `${customName}.${fileExt}`;
      const filePath = `transaksiMasuk/${item.nomorSPBKontrak}/dokumen/${documentType}/${fileName}`;
      
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, pendingFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload error:', error);
          message.error('Gagal mengupload dokumen');
          setUploading(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Create document item
            const newDocument: DocumentItem = {
              id: `doc_${timestamp}`,
              originalFileName: pendingFile.name,
              customName: customName,
              documentType: documentType,
              uploadDate: new Date().toISOString(),
              fileUrl: downloadURL,
              fileSize: pendingFile.size,
              mimeType: pendingFile.type,
              uploadedBy: 'current_user' // You can get this from auth context
            };

            // Update Firestore
            const currentDocuments = item.dokumen || [];
            const updatedDocuments = [...currentDocuments, newDocument];
            
            await updateDoc(doc(db, 'transaksiMasuk', item.id), {
              dokumen: updatedDocuments,
              updatedAt: serverTimestamp()
            });

            message.success('Dokumen berhasil diupload');
            onRefresh();
            
            // Reset states
            setCustomNamingVisible(false);
            setPendingFile(null);
            setUploadProgress(0);
          } catch (error) {
            console.error('Error saving document:', error);
            message.error('Gagal menyimpan informasi dokumen');
          } finally {
            setUploading(false);
          }
        }
      );
    } catch (error) {
      console.error('Error uploading document:', error);
      message.error('Gagal mengupload dokumen');
      setUploading(false);
    }
  };

  // Handle document deletion
  const handleDocumentDelete = async (document: DocumentItem) => {
    try {
      // Delete from storage
      const docRef = ref(storage, document.fileUrl);
      await deleteObject(docRef);

      // Update Firestore
      const updatedDocuments = (item.dokumen || []).filter(doc => doc.id !== document.id);
      await updateDoc(doc(db, 'transaksiMasuk', item.id), {
        dokumen: updatedDocuments,
        updatedAt: serverTimestamp()
      });

      message.success('Dokumen berhasil dihapus');
      onRefresh();
    } catch (error) {
      console.error('Error deleting document:', error);
      message.error('Gagal menghapus dokumen');
    }
  };

  // Handle document download
  const handleDocumentDownload = (document: DocumentItem) => {
    const link = window.document.createElement('a');
    link.href = document.fileUrl;
    link.download = `${document.customName}.${document.originalFileName.split('.').pop()}`;
    link.click();
  };

  return (
    <div>
      {/* Upload Section */}
      <Card title="Upload Dokumen Baru" style={{ marginBottom: 16 }}>
        <Upload.Dragger
          name="file"
          multiple={false}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
          showUploadList={false}
          beforeUpload={handleFileSelect}
          disabled={uploading}
        >
          <p className="ant-upload-drag-icon">
            <FileAddOutlined />
          </p>
          <p className="ant-upload-text">
            {uploading ? 'Mengupload...' : 'Klik atau drag dokumen ke area ini'}
          </p>
          <p className="ant-upload-hint">
            Support: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF. Maksimal 10MB per file.
          </p>
        </Upload.Dragger>
        
        {uploading && (
          <div style={{ marginTop: 16 }}>
            <Progress percent={Math.round(uploadProgress)} status="active" />
            <Text type="secondary">Mengupload dokumen...</Text>
          </div>
        )}
      </Card>

      {/* Documents List */}
      <Card title={`Dokumen Tersimpan (${item.dokumen?.length || 0})`}>
        {item.dokumen && item.dokumen.length > 0 ? (
          <List
            itemLayout="horizontal"
            dataSource={item.dokumen}
            renderItem={(document: DocumentItem) => (
              <List.Item
                actions={[
                  <Tooltip title="Lihat/Download">
                    <Button 
                      type="text" 
                      icon={<EyeOutlined />}
                      onClick={() => window.open(document.fileUrl, '_blank')}
                    />
                  </Tooltip>,
                  <Tooltip title="Download">
                    <Button 
                      type="text" 
                      icon={<DownloadOutlined />}
                      onClick={() => handleDocumentDownload(document)}
                    />
                  </Tooltip>,
                  <Popconfirm
                    title="Yakin ingin menghapus dokumen ini?"
                    onConfirm={() => handleDocumentDelete(document)}
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
                <List.Item.Meta
                  avatar={getFileIcon(document.mimeType, document.originalFileName)}
                  title={
                    <Space>
                      <Text strong>{document.customName}</Text>
                      <Tag color={getDocumentTypeColor(document.documentType)}>
                        {document.documentType}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Text type="secondary">
                        File asli: {document.originalFileName}
                      </Text>
                      <br />
                      <Text type="secondary">
                        Ukuran: {formatFileSize(document.fileSize)} • 
                        Upload: {new Date(document.uploadDate).toLocaleDateString('id-ID')}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty 
            description="Belum ada dokumen yang diupload"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      {/* Custom Naming Modal */}
      <CustomNamingModal
        visible={customNamingVisible}
        onCancel={() => {
          setCustomNamingVisible(false);
          setPendingFile(null);
        }}
        onSubmit={handleCustomNamingSubmit}
        originalFileName={pendingFile?.name || ''}
        loading={uploading}
      />
    </div>
  );
};

export default DocumentUploadManager;
