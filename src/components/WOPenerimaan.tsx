import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Modal, Space, Tag, message, Form, Input, 
  InputNumber, Card, Tabs, Typography, Alert,
  Badge, Progress, Empty
} from 'antd';
import { 
  DeleteOutlined, EditOutlined, PlusOutlined, 
  CheckCircleOutlined, CloseCircleOutlined, 
  InfoCircleOutlined, ReloadOutlined,
  CameraOutlined, FileImageOutlined, LoadingOutlined,
  LoginOutlined
} from '@ant-design/icons';
import { collection, getDocs, doc, deleteDoc, updateDoc, getDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, storage } from '../utils/firebase';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import moment from 'moment';
import { useAppContext } from '../context/AppContext';

const { TabPane } = Tabs;
const { Text, Title } = Typography;

interface FileItem {
  uid: string;
  name: string;
  url: string;
  status: 'done' | 'uploading' | 'error';
  percent?: number;
  response?: any;
  thumbUrl?: string;
}

interface Material {
  key: string;
  materialDescription: string;
  quantity: number;
  qtyDiterima?: number;
  satuan: string;
  kondisi: string;
  normalisasiNumber?: string;
  fungsi?: string;
  penyedia?: string;
  noPO?: string;
}

interface WOPenerimaan {
  id: string;
  nomorWO: string;
  nomorDokumen: string;
  tanggal: string;
  status: 'pending' | 'completed';
  deskripsiMaterial: string;
  petugas: string;
  kategori: string;
  materials: Material[];
  keterangan: string;
  transaksiMasukId?: string;
  foto?: string[];
  createdAt?: any;
}

const WOPenerimaan: React.FC = () => {
  const { user } = useAppContext();
  const [form] = Form.useForm();
  const [woList, setWoList] = useState<WOPenerimaan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessModalVisible, setIsProcessModalVisible] = useState(false);
  const [selectedWO, setSelectedWO] = useState<WOPenerimaan | null>(null);
  const [fotoFileList, setFotoFileList] = useState<FileItem[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [searchText, setSearchText] = useState('');
  const [filteredWoList, setFilteredWoList] = useState<WOPenerimaan[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress] = useState<number>(0);
  const [authError] = useState<boolean>(false);

  useEffect(() => {
    fetchWOPenerimaan();
  }, []);

  // Filter WO list when search text changes
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredWoList(woList);
      return;
    }

    const searchLower = searchText.toLowerCase();
    const filtered = woList.filter(wo => 
      wo.nomorWO.toLowerCase().includes(searchLower) ||
      wo.nomorDokumen.toLowerCase().includes(searchLower) ||
      wo.deskripsiMaterial.toLowerCase().includes(searchLower) ||
      wo.kategori.toLowerCase().includes(searchLower)
    );
    
    setFilteredWoList(filtered);
  }, [searchText, woList]);

  const fetchWOPenerimaan = async () => {
    try {
      setLoading(true);
      setUploadError(null);
      
      const querySnapshot = await getDocs(collection(db, 'workOrdersPenerimaan'));
      const woData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WOPenerimaan));
      
      // Sort by date (newest first)
      woData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(a.tanggal);
        const dateB = b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(b.tanggal);
        return dateB.getTime() - dateA.getTime();
      });
      
      setWoList(woData);
      setFilteredWoList(woData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching WO Penerimaan:', error);
      message.error('Gagal mengambil data WO Penerimaan');
      setLoading(false);
    }
  };

  const handleDeleteWO = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'workOrdersPenerimaan', id));
      message.success('WO Penerimaan berhasil dihapus');
      fetchWOPenerimaan();
    } catch (error) {
      console.error('Error deleting WO Penerimaan:', error);
      message.error('Gagal menghapus WO Penerimaan');
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'pending':
        return <Tag color="processing">Pending</Tag>;
      case 'completed':
        return <Tag color="success">Completed</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  // Fungsi ini dihapus karena tidak digunakan
  
  const handleProcessWO = (record: WOPenerimaan) => {
    console.log('Processing WO:', record.id);
    setSelectedWO(record);
    
    // Check if there are saved photos in localStorage
    try {
      const savedPhotos = localStorage.getItem(`wo_foto_${record.id}`);
      if (savedPhotos) {
        console.log('Found saved photos in localStorage');
        const parsedPhotos = JSON.parse(savedPhotos);
        if (Array.isArray(parsedPhotos) && parsedPhotos.length > 0) {
          console.log('Setting saved photos from localStorage:', parsedPhotos);
          setFotoFileList(parsedPhotos);
        } else {
          console.log('No valid photos found in localStorage, setting empty array');
          setFotoFileList([]);
        }
      } else {
        console.log('No saved photos found in localStorage, setting empty array');
        setFotoFileList([]);
      }
    } catch (error) {
      console.warn('Error retrieving saved photos from localStorage:', error);
      setFotoFileList([]);
    }
    
    // Initialize form with material data
    if (record.materials && record.materials.length > 0) {
      const material = record.materials[0];
      form.setFieldsValue({
        qtyDiterima: material.qtyDiterima || material.quantity,
        keterangan: record.keterangan || ''
      });
    }
    
    setIsProcessModalVisible(true);
    setActiveTab('1');
  };

  const handleCompleteWO = async (values: any) => {
    if (!selectedWO) {
      message.error('Tidak ada Work Order yang dipilih');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Starting WO completion process for WO ID:', selectedWO.id);
      console.log('Form values:', values);
      console.log('Current foto file list:', fotoFileList);
      
      // Validate that we have at least one photo
      if (fotoFileList.length === 0) {
        message.warning('Harap upload minimal 1 foto material');
        setLoading(false);
        setActiveTab('2'); // Switch to foto tab
        return;
      }
      
      // Check if any photos are still uploading
      const isUploading = fotoFileList.some(file => file.status === 'uploading');
      if (isUploading) {
        message.warning('Mohon tunggu hingga semua foto selesai diupload');
        setLoading(false);
        return;
      }
      
      // Get all URLs from files with status 'done'
      const doneFiles = fotoFileList.filter(file => file.status === 'done');
      console.log(`Found ${doneFiles.length} files with status 'done' out of ${fotoFileList.length} total files`);
      
      if (doneFiles.length === 0) {
        message.warning('Tidak ada foto yang berhasil diupload. Harap upload ulang foto.');
        setLoading(false);
        setActiveTab('2'); // Switch to foto tab
        return;
      }
      
      // Extract URLs, with fallback for any missing URLs
      const photoUrls = doneFiles.map(file => {
        if (!file.url || file.url.trim() === '') {
          console.warn(`File ${file.name} has no URL, using placeholder`);
          return 'https://firebasestorage.googleapis.com/v0/b/placeholder-image.jpg';
        }
        return file.url;
      });
      
      console.log('Photo URLs to be saved:', photoUrls);
      
      console.log('Valid photo URLs to be saved:', photoUrls);
      
      // Update the material in the WO
      const updatedMaterials = selectedWO.materials.map(material => ({
        ...material,
        qtyDiterima: values.qtyDiterima
      }));
      
      console.log('Updating WO with materials:', updatedMaterials);
      
      // Prepare the transaction data
      const transaksiData = {
        nomorSPBKontrak: selectedWO.nomorDokumen,
        tanggal: selectedWO.tanggal,
        tanggalTiba: selectedWO.tanggal, // Use same date if not available
        namaMaterial: selectedWO.deskripsiMaterial,
        fungsi: selectedWO.materials[0]?.fungsi || '',
        penyedia: selectedWO.materials[0]?.penyedia || '',
        noPO: selectedWO.materials[0]?.noPO || '',
        normalisasiNumber: selectedWO.materials[0]?.normalisasiNumber || '',
        status: 'selesai',
        qtyDiterima: values.qtyDiterima,
        qtyPesan: selectedWO.materials[0]?.quantity || values.qtyDiterima,
        foto: photoUrls,
        arsipLengkap: photoUrls.length > 0,
        jenisMaterial: selectedWO.kategori === 'Material Eksklusif' ? 'eksklusif' : 'umum',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        keterangan: values.keterangan || ''
      };
      
      // Ensure all required fields are present
      if (!transaksiData.nomorSPBKontrak || !transaksiData.tanggal || 
          !transaksiData.namaMaterial || !transaksiData.qtyDiterima) {
        throw new Error('Data transaksi tidak lengkap');
      }
      
      // Ensure photo URLs are valid
      if (!photoUrls.every(url => url && url.trim() !== '')) {
        throw new Error('URL foto tidak valid');
      }
      
      // Update the TransaksiMasuk if it exists
      if (selectedWO.transaksiMasukId) {
        console.log('Updating related TransaksiMasuk ID:', selectedWO.transaksiMasukId);
        const transaksiRef = doc(db, 'transaksiMasuk', selectedWO.transaksiMasukId);
        
        try {
          const transaksiDoc = await getDoc(transaksiRef);
          
          if (transaksiDoc.exists()) {
            // Prepare data for update
            const transaksiUpdateData = {
              status: 'selesai',
              qtyDiterima: values.qtyDiterima,
              foto: photoUrls,
              arsipLengkap: photoUrls.length > 0,
              updatedAt: serverTimestamp(),
              keterangan: values.keterangan || ''
            };
            
            console.log('Updating TransaksiMasuk with data:', transaksiUpdateData);
            
            // Update TransaksiMasuk
            await updateDoc(transaksiRef, transaksiUpdateData);
            console.log('TransaksiMasuk updated successfully');
          } else {
            console.warn('TransaksiMasuk document does not exist:', selectedWO.transaksiMasukId);
            
            // Create a new TransaksiMasuk document
            console.log('Creating new TransaksiMasuk document with data:', transaksiData);
            await addDoc(collection(db, 'transaksiMasuk'), transaksiData);
            console.log('New TransaksiMasuk document created successfully');
          }
        } catch (transaksiError) {
          console.error('Error updating TransaksiMasuk:', transaksiError);
          throw transaksiError;
        }
      } else {
        // If there's no TransaksiMasuk ID, create a new TransaksiMasuk document
        console.log('Creating new TransaksiMasuk document with data:', transaksiData);
        await addDoc(collection(db, 'transaksiMasuk'), transaksiData);
        console.log('New TransaksiMasuk document created successfully');
      }
      
      // Delete the WO after successfully updating/creating TransaksiMasuk
      await deleteDoc(doc(db, 'workOrdersPenerimaan', selectedWO.id));
      console.log('WO deleted successfully after completion');
      
      // Reset form and close modal
      form.resetFields();
      setFotoFileList([]);
      setIsProcessModalVisible(false);
      
      // Show success message
      message.success('Work Order berhasil diselesaikan dan data tersimpan ke Monitoring Masuk');
      
      // Refresh WO list
      fetchWOPenerimaan();
      
      // Clear local storage backup
      localStorage.removeItem(`wo_foto_${selectedWO.id}`);
      
    } catch (error) {
      console.error('Error completing WO:', error);
      message.error(`Gagal menyelesaikan Work Order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      title: 'Nomor WO', 
      dataIndex: 'nomorWO', 
      key: 'nomorWO',
      width: 150
    },
    { 
      title: 'Nomor Dokumen', 
      dataIndex: 'nomorDokumen', 
      key: 'nomorDokumen',
      width: 150
    },
    { 
      title: 'Tanggal', 
      dataIndex: 'tanggal', 
      key: 'tanggal',
      width: 100,
      render: (tanggal: string) => moment(tanggal).format('DD-MM-YYYY')
    },
    { 
      title: 'Deskripsi Material', 
      dataIndex: 'deskripsiMaterial', 
      key: 'deskripsiMaterial',
      width: 200
    },
    { 
      title: 'Kategori', 
      dataIndex: 'kategori', 
      key: 'kategori',
      width: 150,
      render: (kategori: string) => kategori === 'Material Eksklusif' ? 
        <Tag color="blue">Eksklusif</Tag> : 
        <Tag color="green">Umum</Tag>
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: 'Aksi',
      key: 'actions',
      fixed: 'right' as const,
      width: 150,
      render: (_: any, record: WOPenerimaan) => (
        <Space>
          {record.status === 'pending' && (
            <Button 
              type="primary"
              icon={<EditOutlined />} 
              onClick={() => handleProcessWO(record)}
              title="Proses WO"
              style={{ backgroundColor: '#52c41a' }}
            />
          )}
          <Button 
            icon={<DeleteOutlined />} 
            onClick={() => handleDeleteWO(record.id)} 
            danger
            title="Hapus"
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <FileImageOutlined style={{ fontSize: '24px', marginRight: '12px', color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>Work Order Penerimaan</Title>
          </div>
        }
        extra={
          <Space>
            <Input.Search
              placeholder="Cari nomor WO, dokumen, atau material..."
              allowClear
              enterButton
              style={{ width: 300 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchWOPenerimaan}
              title="Refresh data"
            >
              Refresh
            </Button>
          </Space>
        }
        className="shadow-sm"
        bordered={false}
      >
        {woList.length === 0 && !loading ? (
          <Empty 
            description="Tidak ada Work Order Penerimaan" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table 
            columns={columns} 
            dataSource={filteredWoList} 
            rowKey="id" 
            loading={loading}
            scroll={{ x: 1200 }}
            pagination={{ 
              pageSize: 10,
              showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} item`
            }}
          />
        )}
      </Card>

      {/* Process WO Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <EditOutlined style={{ fontSize: '20px', marginRight: '10px', color: '#1890ff' }} />
            <span>Proses Work Order</span>
          </div>
        }
        open={isProcessModalVisible}
        onCancel={() => setIsProcessModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setIsProcessModalVisible(false)}>
            <CloseCircleOutlined /> Batal
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={() => {
              // Validate photos before submitting
              console.log('Validating photos before submitting. Current fotoFileList:', fotoFileList);
              if (fotoFileList.length === 0) {
                message.warning('Harap upload minimal 1 foto material');
                setActiveTab('2'); // Switch to foto tab
                return;
              }
              
              // Check if any photos are still uploading
              const isUploading = fotoFileList.some(file => file.status === 'uploading');
              if (isUploading) {
                message.warning('Mohon tunggu hingga semua foto selesai diupload');
                return;
              }
              
              // Check if all photos have URLs
              const validFiles = fotoFileList.filter(file => file.url && file.status === 'done');
              const invalidFiles = fotoFileList.filter(file => !file.url || file.status !== 'done');
              
              if (validFiles.length === 0) {
                message.warning('Tidak ada foto yang berhasil diupload. Harap upload ulang foto.');
                return;
              }
              
              if (invalidFiles.length > 0) {
                message.warning('Beberapa foto belum selesai diupload. Harap tunggu atau upload ulang.');
                return;
              }
              
              form.submit();
            }}
            loading={loading}
            icon={<CheckCircleOutlined />}
          >
            Simpan
          </Button>,
        ]}
        width={800}
        centered
        maskClosable={false}
        className="wo-process-modal"
      >
        {selectedWO && (
          <div>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <Title level={5}>Informasi Work Order</Title>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 50%', marginBottom: 8 }}>
                    <Text strong>Nomor WO:</Text> {selectedWO.nomorWO}
                  </div>
                  <div style={{ flex: '1 1 50%', marginBottom: 8 }}>
                    <Text strong>Nomor Dokumen:</Text> {selectedWO.nomorDokumen}
                  </div>
                  <div style={{ flex: '1 1 50%', marginBottom: 8 }}>
                    <Text strong>Tanggal:</Text> {moment(selectedWO.tanggal).format('DD-MM-YYYY')}
                  </div>
                  <div style={{ flex: '1 1 50%', marginBottom: 8 }}>
                    <Text strong>Material:</Text> {selectedWO.deskripsiMaterial}
                  </div>
                  <div style={{ flex: '1 1 50%', marginBottom: 8 }}>
                    <Text strong>Kategori:</Text> {selectedWO.kategori}
                  </div>
                </div>
              </div>
            </Card>

            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane tab="Data Penerimaan" key="1">
                <Form 
                  form={form} 
                  onFinish={handleCompleteWO} 
                  layout="vertical"
                >
                  <Form.Item 
                    name="qtyDiterima" 
                    label="Jumlah Diterima" 
                    rules={[{ required: true, message: 'Masukkan jumlah yang diterima' }]}
                  >
                    <InputNumber 
                      style={{ width: '100%' }} 
                      min={1} 
                      placeholder="Masukkan jumlah yang diterima"
                    />
                  </Form.Item>

                  <Form.Item 
                    name="keterangan" 
                    label="Keterangan"
                  >
                    <Input.TextArea 
                      rows={4} 
                      placeholder="Masukkan keterangan (opsional)"
                    />
                  </Form.Item>
                </Form>
              </TabPane>
              <TabPane tab="Upload Foto" key="2">
                <Form layout="vertical">
                  {authError && (
                    <Alert
                      message="Login Diperlukan"
                      description={
                        <div>
                          <p>Anda harus login untuk mengupload foto.</p>
                          <Button 
                            type="primary" 
                            icon={<LoginOutlined />}
                            onClick={() => {
                              // Redirect to login page or show login modal
                              message.info('Silakan login terlebih dahulu');
                            }}
                          >
                            Login
                          </Button>
                        </div>
                      }
                      type="warning"
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}
                  
                  <Form.Item 
                    label={
                      <span>
                        <CameraOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                        Foto Material <Text type="secondary">(Maks. 3 foto)</Text>
                      </span>
                    }
                    help={
                      <Text type="secondary">
                        Format yang didukung: JPG, PNG, GIF. Ukuran maksimal: 5MB per foto.
                      </Text>
                    }
                  >
                    <div className="upload-container" style={{ border: '1px dashed #d9d9d9', padding: '20px', borderRadius: '8px' }}>
                      <div style={{ marginBottom: 16 }}>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,image/gif"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setUploadLoading(true);
                              setUploadError(null);
                              
                              const file = e.target.files[0];
                              console.log(`Selected file: ${file.name}`);
                              
                              // Create a unique ID for this file
                              const fileId = Date.now().toString();
                              
                              // Add file to list with uploading status
                              const newFile: FileItem = {
                                uid: fileId,
                                name: file.name,
                                status: 'uploading',
                                url: '',
                                percent: 0
                              };
                              
                              // Update file list
                              setFotoFileList(prev => [...prev, newFile]);
                              
                              // Create a unique filename
                              const timestamp = Date.now();
                              const fileExt = file.name.split('.').pop() || 'jpg';
                              const uniqueFileName = `manual-${timestamp}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
                              const filePath = `wo-photos/${uniqueFileName}`;
                              
                              // Create storage reference
                              const storageRef = ref(storage, filePath);
                              
                              // Upload file
                              const uploadTask = uploadBytesResumable(storageRef, file);
                              
                              // Track upload progress
                              uploadTask.on(
                                'state_changed',
                                (snapshot) => {
                                  // Calculate progress
                                  const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                                  console.log(`Upload progress: ${progress}%`);
                                  
                                  // Update file list with progress
                                  setFotoFileList(prev => 
                                    prev.map(item => 
                                      item.uid === fileId ? { ...item, percent: progress } : item
                                    )
                                  );
                                },
                                (error) => {
                                  // Handle error
                                  console.error('Upload error:', error);
                                  setUploadError(error.message);
                                  
                                  // Update file status to error
                                  setFotoFileList(prev => 
                                    prev.map(item => 
                                      item.uid === fileId ? { ...item, status: 'error' } : item
                                    )
                                  );
                                  
                                  setUploadLoading(false);
                                  message.error(`Gagal mengupload foto: ${error.message}`);
                                },
                                async () => {
                                  try {
                                    // Get download URL
                                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                    console.log('File available at', downloadURL);
                                    
                                    // Update file item
                                    setFotoFileList(prev => 
                                      prev.map(item => 
                                        item.uid === fileId ? { 
                                          ...item, 
                                          status: 'done', 
                                          url: downloadURL,
                                          percent: 100
                                        } : item
                                      )
                                    );
                                    
                                    setUploadLoading(false);
                                    message.success('Foto berhasil diupload');
                                    
                                    // Clear the file input
                                    e.target.value = '';
                                  } catch (error) {
                                    console.error('Error getting download URL:', error);
                                    
                                    // Update file status to error
                                    setFotoFileList(prev => 
                                      prev.map(item => 
                                        item.uid === fileId ? { ...item, status: 'error' } : item
                                      )
                                    );
                                    
                                    setUploadLoading(false);
                                    message.error(`Gagal mendapatkan URL foto: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                    
                                    // Clear the file input
                                    e.target.value = '';
                                  }
                                }
                              );
                            }
                          }}
                          disabled={uploadLoading || fotoFileList.length >= 3}
                          style={{ display: 'none' }}
                          id="file-upload"
                        />
                        <label htmlFor="file-upload">
                          <Button
                            icon={uploadLoading ? <LoadingOutlined /> : <PlusOutlined />}
                            loading={uploadLoading}
                            disabled={fotoFileList.length >= 3}
                            style={{ marginRight: 8 }}
                            onClick={() => document.getElementById('file-upload')?.click()}
                          >
                            {uploadLoading ? 'Uploading...' : 'Pilih Foto'}
                          </Button>
                          <span style={{ color: '#999' }}>
                            {fotoFileList.length}/3 foto
                          </span>
                        </label>
                      </div>
                      
                      {/* Display uploaded files */}
                      <div style={{ marginBottom: 16 }}>
                        {fotoFileList.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {fotoFileList.map((file) => (
                              <div key={file.uid} style={{ 
                                border: '1px solid #d9d9d9', 
                                borderRadius: '4px', 
                                padding: '8px', 
                                width: '150px',
                                position: 'relative'
                              }}>
                                {file.status === 'done' && file.url ? (
                                  <div>
                                    <img 
                                      src={file.url} 
                                      alt={file.name} 
                                      style={{ width: '100%', height: '100px', objectFit: 'cover' }} 
                                    />
                                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#999', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                      {file.name}
                                    </div>
                                    <Button 
                                      type="text" 
                                      danger 
                                      icon={<DeleteOutlined />} 
                                      size="small"
                                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,255,255,0.7)' }}
                                      onClick={() => {
                                        setFotoFileList(prev => prev.filter(item => item.uid !== file.uid));
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div>
                                    <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
                                      {file.status === 'uploading' ? (
                                        <div style={{ textAlign: 'center' }}>
                                          <LoadingOutlined style={{ fontSize: '24px' }} />
                                          <div style={{ marginTop: '8px' }}>{file.percent}%</div>
                                        </div>
                                      ) : (
                                        <div style={{ textAlign: 'center', color: '#ff4d4f' }}>
                                          <CloseCircleOutlined style={{ fontSize: '24px' }} />
                                          <div style={{ marginTop: '8px' }}>Error</div>
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#999', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                      {file.name}
                                    </div>
                                    <Button 
                                      type="text" 
                                      danger 
                                      icon={<DeleteOutlined />} 
                                      size="small"
                                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,255,255,0.7)' }}
                                      onClick={() => {
                                        setFotoFileList(prev => prev.filter(item => item.uid !== file.uid));
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Empty description="Belum ada foto yang diupload" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                      </div>
                      
                      <Alert
                        message="Petunjuk Upload"
                        description={
                          <ul style={{ paddingLeft: 20 }}>
                            <li>Klik tombol Pilih Foto untuk memilih file</li>
                            <li>Tunggu hingga proses upload selesai sebelum mengupload foto berikutnya</li>
                            <li>Pastikan foto berhasil diupload sebelum menyimpan</li>
                            <li>Minimal 1 foto harus diupload untuk menyelesaikan WO</li>
                          </ul>
                        }
                        type="info"
                        showIcon
                      />
                    </div>
                    
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center' }}>
                      <Badge 
                        status={fotoFileList.length > 0 ? "success" : "warning"} 
                        text={
                          <Text 
                            type={fotoFileList.length > 0 ? "success" : "warning"}
                            strong
                          >
                            {fotoFileList.length}/3 foto diupload
                          </Text>
                        } 
                      />
                    </div>
                    
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div style={{ marginTop: 16 }}>
                        <Progress 
                          percent={uploadProgress} 
                          status="active" 
                          strokeColor={{ 
                            '0%': '#108ee9',
                            '100%': '#87d068',
                          }}
                        />
                      </div>
                    )}
                    
                    {uploadError && (
                      <Alert
                        message="Error Upload"
                        description={uploadError}
                        type="error"
                        showIcon
                        closable
                        style={{ marginTop: 16 }}
                        onClose={() => setUploadError(null)}
                      />
                    )}
                  </Form.Item>
                  
                  <Alert
                    message={
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        <InfoCircleOutlined style={{ marginRight: 8 }} /> 
                        Foto Material
                      </span>
                    }
                    description="Upload foto material untuk dokumentasi penerimaan. Foto akan disimpan sebagai arsip dan dikirimkan ke Transaksi Masuk. Minimal 1 foto harus diupload untuk menyelesaikan WO."
                    type="info"
                    showIcon
                    style={{ marginTop: 16 }}
                  />
                </Form>
              </TabPane>
            </Tabs>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WOPenerimaan;
