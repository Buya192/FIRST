import React, { useState, useCallback, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Row, Col, Upload, Spin, Progress, Divider } from 'antd';
import { useAppContext } from '../context/AppContext';
import { UploadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { collection, doc, writeBatch, serverTimestamp, onSnapshot, query, where, getDoc, updateDoc, Firestore, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, realTimeDb } from '../utils/firebase';
import { ref as realtimeRef, set } from 'firebase/database';
import debounce from 'lodash/debounce';
import { WorkOrder, MaterialEntry, AppState } from '../context/AppContext';
import { UploadFile } from 'antd/lib/upload/interface';

const { Option } = Select;
const { confirm } = Modal;

const WOPetugasLogistik: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialEntry | null>(null);
  const [fileList1, setFileList1] = useState<UploadFile[]>([]);
  const [fileList2, setFileList2] = useState<UploadFile[]>([]);
  const [fileList3, setFileList3] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();
  const { appState, setAppState } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number[]>([0, 0, 0]);
  const [saveProgress, setSaveProgress] = useState(0);
  const [tableLoading, setTableLoading] = useState(true);
  const [dataSource, setDataSource] = useState<MaterialEntry[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'workOrders'), where('status', '!=', 'completed')),
      (snapshot) => {
        const updatedWorkOrders: WorkOrder[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nomorWO: data.nomorWO,
            nomorDokumen: data.nomorDokumen,
            tanggal: data.tanggal,
            status: data.status as "completed" | "pending" | "verified",
            nomorAsset: data.nomorAsset,
            deskripsiMaterial: data.deskripsiMaterial,
            pengembali: data.pengembali,
            petugas: data.petugas,
            kategori: data.kategori,
            materials: data.materials,
            keterangan: data.keterangan,
          };
        });
        setAppState(prevState => ({
          ...prevState,
          workOrders: updatedWorkOrders
        }));
        setTableLoading(false);
      },
      (error) => {
        console.error("Error fetching work orders:", error);
        message.error("Failed to fetch work orders. Please try again.");
        setTableLoading(false);
      }
    );

    return () => unsubscribe();
  }, [setAppState]);

  useEffect(() => {
    const newDataSource = appState.workOrders?.flatMap(wo =>
      wo.materials.map(material => ({
        ...material,
        nomorWO: wo.nomorWO,
        nomorDokumen: wo.nomorDokumen,
        tanggal: wo.tanggal,
        pengembali: wo.pengembali,
        woId: wo.id,
      }))
    ) || [];
    setDataSource(newDataSource);
  }, [appState.workOrders]);

  const handleVerify = (material: MaterialEntry) => {
    if (!material) return;

    setSelectedMaterial(material);
    setIsModalVisible(true);

    form.setFieldsValue({
      nomorWO: material.nomorWO || '',
      nomorDokumen: material.nomorDokumen || '',
      pengembali: material.pengembali || '',
      materialDescription: material.materialDescription || '',
      quantity: material.quantity || 1,
      satuan: material.satuan || '',
      kondisi: material.kondisi || 'Baik',
      kategori: material.kategori || '',
      lokasiPenyimpanan: material.lokasiPenyimpanan || '',
      catatan: material.catatan || '',
      merek: (material as any).merek || '',
      nomorSeri: (material as any).nomorSeri || '',
      daya: (material as any).daya || '',
    });
  };

  const uploadFile = async (file: File, index: number) => {
    const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(prev => {
            const newProgress = [...prev];
            newProgress[index] = progress;
            return newProgress;
          });
        },
        (error) => reject(error),
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  };

  const handleModalOk = () => {
    confirm({
      title: 'Apakah Anda yakin ingin menyimpan data ini?',
      icon: <ExclamationCircleOutlined />,
      content: 'Data yang disimpan akan dipindahkan ke milestone yang sesuai.',
      onOk() {
        saveVerifiedMaterial();
      },
    });
  };

  const saveVerifiedMaterial = async () => {
    setIsLoading(true);
    setSaveProgress(0);
    try {
      const values = await form.validateFields();
      if (!selectedMaterial) {
        throw new Error('Material tidak terpilih');
      }

      // Upload files in parallel
      const [foto1, foto2, foto3] = await Promise.all([
        fileList1.length > 0 ? uploadFile(fileList1[0].originFileObj as File, 0) : null,
        fileList2.length > 0 ? uploadFile(fileList2[0].originFileObj as File, 1) : null,
        fileList3.length > 0 ? uploadFile(fileList3[0].originFileObj as File, 2) : null,
      ]);

      setSaveProgress(50);

      const verifiedMaterial = {
        ...selectedMaterial,
        ...values,
        foto1,
        foto2,
        foto3,
        verifiedAt: serverTimestamp(),
        // Pastikan jenisBahan dan berat selalu ada dalam data yang disimpan
        jenisBahan: values.jenisBahan || 'Besi',
        berat: values.berat || 0,
      };

      let collectionName = '';
      if (verifiedMaterial.kondisi === 'Baik') {
        collectionName = verifiedMaterial.kategori === 'Material Eksklusif' ? 'milestoneBaikEksklusif' : 'milestoneBaik';
      } else {
        collectionName = verifiedMaterial.kategori === 'Material Eksklusif' ? 'milestoneRusakEksklusif' : 'milestoneRusak';
      }

      const batch = writeBatch(db);

      // Add to milestone collection
      const newDocRef = doc(collection(db, collectionName));
      batch.set(newDocRef, verifiedMaterial);

      // Update work order
      if (selectedMaterial.woId) {
        const workOrderRef = doc(db, 'workOrders', selectedMaterial.woId);
        const workOrder = appState.workOrders.find(wo => wo.id === selectedMaterial.woId);
        if (workOrder) {
          let updatedMaterials = [...workOrder.materials];
          const materialIndex = updatedMaterials.findIndex(m => m.key === selectedMaterial.key);
          
          if (materialIndex !== -1) {
            if (selectedMaterial.kategori === 'Material Eksklusif' && updatedMaterials[materialIndex].quantity > 1) {
              // Decrease quantity by 1 for Material Eksklusif
              updatedMaterials[materialIndex] = {
                ...updatedMaterials[materialIndex],
                quantity: updatedMaterials[materialIndex].quantity - 1
              };
            } else {
              // Remove the material completely for non-Eksklusif or if quantity is 1
              updatedMaterials = updatedMaterials.filter(m => m.key !== selectedMaterial.key);
            }
          }

          const newStatus = updatedMaterials.length === 0 ? 'completed' as const : 'pending' as const;
          batch.update(workOrderRef, { 
            materials: updatedMaterials,
            status: newStatus
          });
        }
      }

      // Commit the batch
      await batch.commit();

      setSaveProgress(75);

      // Update Realtime Database
      const realtimeDbRef = realtimeRef(realTimeDb, `milestones/${collectionName}/${newDocRef.id}`);
      await set(realtimeDbRef, verifiedMaterial);

      setSaveProgress(100);

      message.success(`Material berhasil diverifikasi dan dipindahkan ke milestone ${collectionName}.`);
      setIsModalVisible(false);
      form.resetFields();
      setFileList1([]);
      setFileList2([]);
      setFileList3([]);
      setUploadProgress([0, 0, 0]);
      setSaveProgress(0);

      // Update local state
      setAppState((prevState: AppState) => {
        const updatedWorkOrders = prevState.workOrders.map(wo => {
          if (wo.id === selectedMaterial.woId) {
            let updatedMaterials = [...wo.materials];
            const materialIndex = updatedMaterials.findIndex(m => m.key === selectedMaterial.key);
            
            if (materialIndex !== -1) {
              if (selectedMaterial.kategori === 'Material Eksklusif' && updatedMaterials[materialIndex].quantity > 1) {
                updatedMaterials[materialIndex] = {
                  ...updatedMaterials[materialIndex],
                  quantity: updatedMaterials[materialIndex].quantity - 1
                };
              } else {
                updatedMaterials = updatedMaterials.filter(m => m.key !== selectedMaterial.key);
              }
            }

            const newStatus: "completed" | "pending" | "verified" = updatedMaterials.length === 0 ? 'completed' : 'pending';
            return { ...wo, materials: updatedMaterials, status: newStatus };
          }
          return wo;
        });
        return {
          ...prevState,
          workOrders: updatedWorkOrders
        };
      });
    } catch (error) {
      console.error('Error verifying material:', error);
      message.error('Gagal memverifikasi material: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setFileList1([]);
    setFileList2([]);
    setFileList3([]);
    setUploadProgress([0, 0, 0]);
    setSaveProgress(0);
  };

  const handleFileChange = useCallback(
    debounce((info: any, setFileList: React.Dispatch<React.SetStateAction<UploadFile[]>>) => {
      setFileList(info.fileList.slice(-1));
    }, 300),
    []
  );

  const handleDelete = (material: MaterialEntry) => {
    confirm({
      title: 'Apakah Anda yakin ingin menghapus material ini?',
      icon: <ExclamationCircleOutlined />,
      content: 'Material yang dihapus tidak dapat dikembalikan.',
      onOk() {
        deleteMaterial(material);
      },
    });
  };

  const deleteMaterial = async (material: MaterialEntry) => {
    setIsLoading(true);
    try {
      if (!material.woId) {
        throw new Error('Work Order ID tidak ditemukan');
      }
      // Find the work order
      const workOrderRef = doc(db, 'workOrders', material.woId);
      const workOrderSnapshot = await getDoc(workOrderRef);
      if (!workOrderSnapshot.exists()) {
        throw new Error('Work Order tidak ditemukan');
      }
      const workOrderData = workOrderSnapshot.data() as WorkOrder;

      // Remove the material from the materials array
      const updatedMaterials = workOrderData.materials.filter(m => m.key !== material.key);

      // Update the work order
      await updateDoc(workOrderRef, {
        materials: updatedMaterials,
        status: updatedMaterials.length === 0 ? 'completed' as const : workOrderData.status,
      });

      // Update local state
      setAppState((prevState: AppState) => {
        const updatedWorkOrders = prevState.workOrders.map(wo => {
          if (wo.id === material.woId) {
            const newStatus: "completed" | "pending" | "verified" = updatedMaterials.length === 0 ? 'completed' : wo.status;
            return { ...wo, materials: updatedMaterials, status: newStatus };
          }
          return wo;
        });
        return {
          ...prevState,
          workOrders: updatedWorkOrders
        };
      });

      message.success('Material berhasil dihapus.');
    } catch (error) {
      console.error('Error deleting material:', error);
      message.error('Gagal menghapus material: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { title: 'Nomor WO', dataIndex: 'nomorWO', key: 'nomorWO', width: 120 },
    { title: 'Nomor Dokumen', dataIndex: 'nomorDokumen', key: 'nomorDokumen', width: 150 },
    { title: 'Tanggal', dataIndex: 'tanggal', key: 'tanggal', width: 100 },
    { title: 'Material Description', dataIndex: 'materialDescription', key: 'materialDescription', width: 200 },
    { title: 'Pengembali', dataIndex: 'pengembali', key: 'pengembali', width: 150 },
    { title: 'Kondisi', dataIndex: 'kondisi', key: 'kondisi', width: 100 },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 100 },
    {
      title: 'Aksi',
      key: 'action',
      fixed: 'right' as const,
      width: 200,
      render: (_: any, record: MaterialEntry) => (
        <>
          <Button onClick={() => handleVerify(record)} style={{ marginRight: 8 }}>Verifikasi</Button>
          <Button onClick={() => handleDelete(record)} danger>Hapus</Button>
        </>
      ),
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">WO Petugas Logistik</h1>
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey={(record) => `${record.woId}-${record.key}`}
        loading={tableLoading}
        scroll={{ x: 1200 }}
      />
      <Modal
        title="Verifikasi Material"
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
        okText="Simpan"
        cancelText="Batal"
        width={1000}
        confirmLoading={isLoading}
      >
        <Spin spinning={isLoading}>
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="nomorWO" label="Nomor WO">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="nomorDokumen" label="Nomor Dokumen">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="pengembali" label="Pengembali">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="materialDescription" label="Material Description">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="quantity" label="Quantity">
                  <InputNumber style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="satuan" label="Satuan">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            {selectedMaterial?.kategori === 'Material Eksklusif' && (
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="merek" label="Merek">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="nomorSeri" label="Nomor Seri">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="daya" label="Daya (kVA)">
                    <InputNumber style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            )}
            
            <Divider orientation="left">Informasi Bahan</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="jenisBahan" 
                  label="Jenis Bahan" 
                  rules={[{ required: true, message: 'Pilih jenis bahan' }]}
                  initialValue="Besi"
                >
                  <Select>
                    <Option value="Besi">Besi</Option>
                    <Option value="Logam Campuran">Logam Campuran</Option>
                    <Option value="Alumunium">Alumunium</Option>
                    <Option value="Custom">Custom</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  name="berat" 
                  label="Berat (kg)" 
                  rules={[{ required: true, message: 'Masukkan berat material' }]}
                  initialValue={0}
                >
                  <InputNumber style={{ width: '100%' }} min={0} step={0.1} precision={2} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="kondisi" label="Kondisi">
                  <Select>
                    <Option value="Baik">Baik</Option>
                    <Option value="Rusak">Rusak</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="lokasiPenyimpanan" label="Lokasi Penyimpanan">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="catatan" label="Catatan (Sesuai/Tidak Sesuai)">
              <Input.TextArea />
            </Form.Item>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="foto1" label="Foto 1">
                  <Upload
                    onChange={(info) => handleFileChange(info, setFileList1)}
                    fileList={fileList1}
                    maxCount={1}
                    beforeUpload={() => false}
                  >
                    <Button icon={<UploadOutlined />}>Upload Foto 1</Button>
                  </Upload>
                  {uploadProgress[0] > 0 && uploadProgress[0] < 100 && (
                    <Progress percent={Math.round(uploadProgress[0])} />
                  )}
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="foto2" label="Foto 2">
                  <Upload
                    onChange={(info) => handleFileChange(info, setFileList2)}
                    fileList={fileList2}
                    maxCount={1}
                    beforeUpload={() => false}
                  >
                    <Button icon={<UploadOutlined />}>Upload Foto 2</Button>
                  </Upload>
                  {uploadProgress[1] > 0 && uploadProgress[1] < 100 && (
                    <Progress percent={Math.round(uploadProgress[1])} />
                  )}
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="foto3" label="Foto 3">
                  <Upload
                    onChange={(info) => handleFileChange(info, setFileList3)}
                    fileList={fileList3}
                    maxCount={1}
                    beforeUpload={() => false}
                  >
                    <Button icon={<UploadOutlined />}>Upload Foto 3</Button>
                  </Upload>
                  {uploadProgress[2] > 0 && uploadProgress[2] < 100 && (
                    <Progress percent={Math.round(uploadProgress[2])} />
                  )}
                </Form.Item>
              </Col>
            </Row>
          </Form>
          {saveProgress > 0 && (
            <Progress percent={saveProgress} status="active" />
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default WOPetugasLogistik;
