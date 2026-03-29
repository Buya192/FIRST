import React, { useState, useEffect } from 'react';
import { Table, Upload, Button, message, Form, Input, Modal, Space } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd/es/upload';
import type { RcFile } from 'rc-upload/lib/interface';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { storage, db, auth } from '../utils/firebase';
import dayjs from 'dayjs';

interface Material {
  materialDescription: string;
  normalisasi: string;
  valuationType: string;
  qtyAmbil: number;
  kategori: string;
  merek?: string;
  nomorSeri?: string;
  tahun?: string;
  foto1?: string;
  foto2?: string;
  foto3?: string;
}

interface WorkOrder {
  id: string;
  nomorWO: string;
  nomorReservasi: string;
  tanggal: string;
  pelaksana: string;
  nomorKontrak?: string;
  pekerjaan?: string;
  fungsi?: string;
  nomorSPM?: string;
  arsip?: string;
  materials: Material[];
}

interface Reservasi {
  id: string;
  nomorReservasi: string;
  nomorKontrak?: string;
  deskripsiPekerjaan?: string;
  fungsi?: string;
  nomorSPM?: string;
  [key: string]: any; // Allow any other properties
}

const WOFulfillment: React.FC = (): JSX.Element => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const workOrdersCollection = collection(db, 'workOrders');
      const workOrdersSnapshot = await getDocs(workOrdersCollection);
      const workOrdersData = workOrdersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WorkOrder[];
      
      // Fetch additional data from daftarReservasi for each work order
      const enrichedWorkOrders = await Promise.all(
        workOrdersData.map(async (wo) => {
          try {
            // Try to get additional data from daftarReservasi
            const reservasiCollection = collection(db, 'daftarReservasi');
            const q = query(reservasiCollection);
            const reservasiSnapshot = await getDocs(q);
            
            // Find the matching reservation
            const matchingReservasi = reservasiSnapshot.docs
              .map(doc => {
                const data = doc.data();
                return {
                  id: doc.id,
                  nomorReservasi: data.nomorReservasi || '',
                  nomorKontrak: data.nomorKontrak || '',
                  deskripsiPekerjaan: data.deskripsiPekerjaan || '',
                  fungsi: data.fungsi || '',
                  nomorSPM: data.nomorSPM || '',
                } as Reservasi;
              })
              .find(res => res.nomorReservasi === wo.nomorReservasi);
            
            if (matchingReservasi) {
              return {
                ...wo,
                nomorKontrak: wo.nomorKontrak || matchingReservasi.nomorKontrak || '',
                pekerjaan: wo.pekerjaan || matchingReservasi.deskripsiPekerjaan || '',
                fungsi: wo.fungsi || matchingReservasi.fungsi || '',
                nomorSPM: wo.nomorSPM || matchingReservasi.nomorSPM || '',
              };
            }
            
            return wo;
          } catch (error) {
            console.error('Error enriching work order data:', error);
            return wo;
          }
        })
      );
      
      setWorkOrders(enrichedWorkOrders);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      message.error('Gagal mengambil data work orders');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    accept: 'image/*',
    beforeUpload: (file: RcFile) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('Mohon unggah file gambar');
        return Upload.LIST_IGNORE;
      }

      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        message.error('Gambar harus lebih kecil dari 2MB!');
        return Upload.LIST_IGNORE;
      }

      return false; // Return false to handle upload manually
    },
    maxCount: 1,
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true,
      showDownloadIcon: false,
    },
    listType: 'picture',
  };

  const uploadToFirebaseStorage = async (file: RcFile | undefined, path: string): Promise<string> => {
    if (!file) {
      throw new Error('File tidak ditemukan');
    }

    if (!auth.currentUser) {
      throw new Error('Anda harus login terlebih dahulu');
    }

    try {
      const timestamp = Date.now();
      const fileName = `${auth.currentUser.uid}_${timestamp}_${path}`;
      const storageRef = ref(storage, `wo-photos/${fileName}`);
      
      // Show progress message
      message.loading(`Mengupload foto ${path}...`, 0);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      // Clear progress message
      message.destroy();
      
      return downloadUrl;
    } catch (error) {
      console.error('Error mengunggah file:', error);
      if (error instanceof Error && error.message.includes('storage/unauthorized')) {
        throw new Error('Anda tidak memiliki akses untuk mengunggah file. Silakan login kembali.');
      }
      throw new Error(`Gagal mengunggah foto: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const moveToPersetujuanMaterial = async (workOrder: WorkOrder, updatedMaterial: Material) => {
    try {
      console.log('Moving to Persetujuan Material with data:', workOrder, updatedMaterial);
      
      // Create MR Realization data for approval
      const mrRealizationData = {
        nomorWO: workOrder.nomorWO, // Include the nomorWO field
        nomorReservasi: workOrder.nomorReservasi,
        tglPengambilan: new Date().toISOString(),
        status: 'Completed',
        category: updatedMaterial.kategori,
        pelaksana: workOrder.pelaksana,
        // Add missing fields with default values if not available
        nomorKontrak: workOrder.nomorKontrak || '',
        pekerjaan: workOrder.pekerjaan || '',
        fungsi: workOrder.fungsi || '',
        nomorSPM: workOrder.nomorSPM || '',
        arsip: workOrder.arsip || '',
        approvalStatus: 'Pending', // Set status as pending for approval
        submittedAt: new Date().toISOString(),
        submittedBy: 'PETUGAS LOGISTIK',
        materials: [
          {
            materialDescription: updatedMaterial.materialDescription,
            normalisasi: updatedMaterial.normalisasi,
            valuationType: updatedMaterial.valuationType,
            qtyPermintaan: updatedMaterial.qtyAmbil,
            qtyAmbil: updatedMaterial.qtyAmbil,
            merek: updatedMaterial.merek,
            satuan: 'PCS',
            foto1: updatedMaterial.foto1,
            foto2: updatedMaterial.foto2,
            foto3: updatedMaterial.foto3,
            ...(updatedMaterial.kategori === 'Eksklusif' && {
              nomorSeri: updatedMaterial.nomorSeri,
              tahun: updatedMaterial.tahun,
            }),
          }
        ],
      };

      console.log('MR Realization data to be saved for approval:', mrRealizationData);

      // Check if a record with the same nomorWO already exists
      const mrRealizationRef = collection(db, 'mrRealization');
      const q = query(mrRealizationRef, where('nomorWO', '==', workOrder.nomorWO));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Update existing record
        const existingDoc = querySnapshot.docs[0];
        const existingData = existingDoc.data();
        
        // Merge materials if needed
        const existingMaterials = existingData.materials || [];
        const newMaterial = mrRealizationData.materials[0];
        
        // Check if this material already exists
        const materialExists = existingMaterials.some(
          (m: any) => m.materialDescription === newMaterial.materialDescription
        );
        
        if (!materialExists) {
          existingMaterials.push(newMaterial);
        }
        
        await updateDoc(doc(db, 'mrRealization', existingDoc.id), {
          ...mrRealizationData,
          materials: existingMaterials,
        });
        
        console.log('Document updated in mrRealization with ID:', existingDoc.id);
      } else {
        // Add new record
        const docRef = await addDoc(mrRealizationRef, mrRealizationData);
        console.log('Document added to mrRealization with ID:', docRef.id);
      }

      // Delete from workOrders if all materials are processed
      const remainingMaterials = workOrder.materials.filter(
        (m: Material) => m.materialDescription !== updatedMaterial.materialDescription
      );

      if (remainingMaterials.length === 0) {
        // All materials processed, delete the work order
        await deleteDoc(doc(db, 'workOrders', workOrder.id));
      } else {
        // Update work order with remaining materials
        const workOrderRef = doc(db, 'workOrders', workOrder.id);
        await updateDoc(workOrderRef, { materials: remainingMaterials });
      }

      message.success('Data berhasil dikirim untuk persetujuan');
    } catch (error) {
      console.error('Error moving to Persetujuan Material:', error);
      throw new Error('Gagal mengirim data untuk persetujuan');
    }
  };

  const handleModalOk = async () => {
    try {
      if (!auth.currentUser) {
        message.error('Anda harus login terlebih dahulu');
        return;
      }

      const values = await form.validateFields();
      
      if (!selectedMaterial) {
        message.error('Tidak ada material yang dipilih');
        return;
      }

      // Get files from form
      const foto1File = values.foto1?.fileList?.[0]?.originFileObj;
      const foto2File = values.foto2?.fileList?.[0]?.originFileObj;
      const foto3File = values.foto3?.fileList?.[0]?.originFileObj;

      if (!foto1File || !foto2File || !foto3File) {
        message.error('Mohon unggah semua foto yang diperlukan');
        return;
      }

      try {
        // Upload photos in parallel
        const [foto1Url, foto2Url, foto3Url] = await Promise.all([
          uploadToFirebaseStorage(foto1File, 'foto1'),
          uploadToFirebaseStorage(foto2File, 'foto2'),
          uploadToFirebaseStorage(foto3File, 'foto3'),
        ]);

        const updatedMaterial = {
          ...selectedMaterial,
          ...values,
          foto1: foto1Url,
          foto2: foto2Url,
          foto3: foto3Url,
        };

        // Find the work order
        const workOrder = workOrders.find((wo: WorkOrder) => 
          wo.materials.some((m: Material) => m.materialDescription === selectedMaterial.materialDescription)
        );

        if (!workOrder) {
          throw new Error('Work order tidak ditemukan');
        }

        // Move to Persetujuan Material
        await moveToPersetujuanMaterial(workOrder, updatedMaterial);
        
        message.success('Data berhasil diproses dan dikirim untuk persetujuan');
        setModalVisible(false);
        form.resetFields();
        fetchWorkOrders();
      } catch (uploadError) {
        throw uploadError;
      }
    } catch (error) {
      console.error('Error:', error);
      message.error(error instanceof Error ? error.message : 'Gagal memproses data');
    }
  };

  const handleAction = (material: Material, _workOrder: WorkOrder) => {
    setSelectedMaterial(material);
    form.setFieldsValue({
      materialDescription: material.materialDescription,
      normalisasi: material.normalisasi,
      valuationType: material.valuationType,
      qtyAmbil: material.qtyAmbil,
      merek: material.merek || '',
      nomorSeri: material.nomorSeri || '',
      tahun: material.tahun || '',
    });
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'Nomor WO',
      dataIndex: 'nomorWO',
      key: 'nomorWO',
    },
    {
      title: 'Nomor Reservasi',
      dataIndex: 'nomorReservasi',
      key: 'nomorReservasi',
    },
    {
      title: 'Tanggal',
      dataIndex: 'tanggal',
      key: 'tanggal',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Pelaksana',
      dataIndex: 'pelaksana',
      key: 'pelaksana',
    }
  ];

  // Function to delete all work orders
  const handleDeleteAllData = async () => {
    try {
      // Show confirmation modal
      Modal.confirm({
        title: 'Hapus Semua Data',
        content: 'Apakah Anda yakin ingin menghapus semua data Work Order? Tindakan ini tidak dapat dibatalkan.',
        okText: 'Ya, Hapus Semua',
        okType: 'danger',
        cancelText: 'Batal',
        onOk: async () => {
          setLoading(true);
          try {
            // Get all work orders
            const workOrdersCollection = collection(db, 'workOrders');
            const workOrdersSnapshot = await getDocs(workOrdersCollection);
            
            // Delete each work order
            const deletePromises = workOrdersSnapshot.docs.map(doc => 
              deleteDoc(doc.ref)
            );
            
            await Promise.all(deletePromises);
            
            message.success(`${workOrdersSnapshot.docs.length} Work Order berhasil dihapus`);
            setWorkOrders([]);
          } catch (error) {
            console.error('Error deleting all work orders:', error);
            message.error('Gagal menghapus semua data Work Order');
          } finally {
            setLoading(false);
          }
        }
      });
    } catch (error) {
      console.error('Error in handleDeleteAllData:', error);
      message.error('Terjadi kesalahan saat mencoba menghapus data');
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2>Work Order Fulfillment</h2>
        <Button 
          type="primary" 
          danger 
          onClick={handleDeleteAllData}
        >
          Hapus Semua Data
        </Button>
      </div>
      
      <Table
        columns={[
          ...columns,
          {
            title: 'Materials',
            key: 'materials',
            render: (_, record: WorkOrder) => (
              <Table
                columns={[
                  { title: 'Material Description', dataIndex: 'materialDescription', key: 'materialDescription' },
                  { title: 'Normalisasi', dataIndex: 'normalisasi', key: 'normalisasi' },
                  { title: 'Quantity', dataIndex: 'qtyAmbil', key: 'qtyAmbil' },
                  { title: 'Kategori', dataIndex: 'kategori', key: 'kategori' },
                  {
                    title: 'Aksi',
                    key: 'action',
                    render: (_: any, material: Material) => (
                      <Button type="primary" onClick={() => handleAction(material, record)}>
                        Aksi
                      </Button>
                    ),
                  },
                ]}
                dataSource={record.materials}
                pagination={false}
                rowKey="materialDescription"
                size="small"
                bordered
              />
            ),
          }
        ]}
        dataSource={workOrders}
        loading={loading}
        rowKey="id"
        pagination={{ pageSize: 5 }}
      />

      <Modal
        title="Proses Material"
        visible={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="materialDescription" label="Material Description">
            <Input disabled />
          </Form.Item>
          <Form.Item name="normalisasi" label="Normalisasi">
            <Input disabled />
          </Form.Item>
          <Form.Item name="valuationType" label="Valuation Type">
            <Input disabled />
          </Form.Item>
          <Form.Item name="qtyAmbil" label="Quantity">
            <Input disabled />
          </Form.Item>

          <Form.Item name="merek" label="Merek" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          {selectedMaterial?.kategori === 'Eksklusif' && (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Form.Item name="nomorSeri" label="Nomor Seri" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="tahun" label="Tahun" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Space>
          )}

          <Form.Item
            name="foto1"
            label="Foto I"
            rules={[{ required: true, message: 'Mohon unggah foto' }]}
            extra="Format yang didukung: Semua format gambar kecuali PDF. Ukuran maks: 2MB"
          >
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Unggah</Button>
            </Upload>
          </Form.Item>
          <Form.Item
            name="foto2"
            label="Foto II"
            rules={[{ required: true, message: 'Mohon unggah foto' }]}
            extra="Format yang didukung: Semua format gambar kecuali PDF. Ukuran maks: 2MB"
          >
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Unggah</Button>
            </Upload>
          </Form.Item>
          <Form.Item
            name="foto3"
            label="Foto III"
            rules={[{ required: true, message: 'Mohon unggah foto' }]}
            extra="Format yang didukung: Semua format gambar kecuali PDF. Ukuran maks: 2MB"
          >
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Unggah</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WOFulfillment;
