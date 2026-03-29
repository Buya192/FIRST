import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Table, Card, Typography, Tabs, Tag, Space,
  Button, Tooltip, Input, Modal, Popconfirm, message,
  Form, Row, Col, Descriptions, DatePicker, Select, Progress,
  Upload, List, Empty, Alert, Spin, Statistic
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined,
  InboxOutlined, SyncOutlined, EyeOutlined, EditOutlined, DeleteOutlined,
  FileImageOutlined, FileAddOutlined, DownloadOutlined, FileOutlined,
  SolutionOutlined, ContainerOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { collection, getDocs, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import moment from 'moment'; // Pastikan moment.js terinstal: npm install moment
import 'moment/locale/id'; // Opsional: untuk format tanggal lokal
import styles from './MonitoringMasuk.module.css'; // Import CSS Module
import { db, storage } from '../utils/firebase'; // Pastikan path ini benar

// Konfigurasi moment.js (opsional, untuk bahasa Indonesia)
moment.locale('id');

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Dragger } = Upload;
const { Option } = Select;

interface MonitoringMasukItem {
  id: string;
  nomorSPBKontrak: string;
  tanggal: string; // Format YYYY-MM-DD
  normalisasiNumber: string;
  namaMaterial: string;
  fungsi: string;
  penyedia: string;
  tanggalTiba: string; // Format YYYY-MM-DD
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
  createdAt?: { seconds: number; nanoseconds: number; }; // Firebase Timestamp
  updatedAt?: { seconds: number; nanoseconds: number; }; // Firebase Timestamp
}

// Helper function to convert Firebase Timestamp to Date or Moment
const firebaseTimestampToMoment = (timestamp: any) => {
  if (timestamp && typeof timestamp.seconds === 'number') {
    return moment.unix(timestamp.seconds);
  }
  return undefined;
};

// Helper function to check if archive is complete
const isArchiveComplete = (record: MonitoringMasukItem): boolean => {
  const hasFoto = Boolean(record.foto && record.foto.length > 0);
  const hasDokumen = Boolean(record.dokumen && record.dokumen.length > 0);
  const hasNomorTUG3 = Boolean(record.nomorTUG3 && record.nomorTUG3.trim() !== '');
  const hasNomorTUG4 = Boolean(record.nomorTUG4 && record.nomorTUG4.trim() !== '');
  const hasQtyDiterima = record.qtyDiterima > 0;
  // Perlu perhatikan apakah semua status arsip *harus* ada untuk dianggap lengkap.
  // Jika 'qtyDiterima' tidak wajib, hapus dari kondisi ini.
  return hasFoto && hasDokumen && hasNomorTUG3 && hasNomorTUG4 && hasQtyDiterima;
};

// Component Utama
export const MonitoringMasuk: React.FC = () => {
  const [dataList, setDataList] = useState<MonitoringMasukItem[]>([]);
  const [filteredList, setFilteredList] = useState<MonitoringMasukItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // Menggunakan 'all' untuk semua data

  // Modal states
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [arsipModalVisible, setArsipModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MonitoringMasukItem | null>(null);

  // Form state
  const [form] = Form.useForm();

  // Upload states for new files
  const [fotoNewFiles, setFotoNewFiles] = useState<any[]>([]);
  const [dokumenNewFiles, setDokumenNewFiles] = useState<any[]>([]);

  // Loading state for individual uploads
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);


  // Fetch data from Firestore
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'transaksiMasuk'));
      const data = querySnapshot.docs.map(docSnapshot => {
        const docData = docSnapshot.data();
        const processedData = {
          id: docSnapshot.id,
          ...docData,
          normalisasiNumber: docData.normalisasiNumber || '',
          foto: Array.isArray(docData.foto) ? docData.foto : [],
          dokumen: Array.isArray(docData.dokumen) ? docData.dokumen : [],
          status: docData.status || 'draft',
          qtyPesan: docData.qtyPesan || 0,
          qtyDiterima: docData.qtyDiterima || 0,
          keterangan: docData.keterangan || '',
        } as MonitoringMasukItem;

        // Auto-update arsipLengkap status in DB if inconsistent
        const shouldBeComplete = isArchiveComplete(processedData);
        if (processedData.arsipLengkap !== shouldBeComplete) {
          const docRef = doc(db, 'transaksiMasuk', processedData.id);
          updateDoc(docRef, {
            arsipLengkap: shouldBeComplete,
        updatedAt: serverTimestamp() as any
          }).catch(err => console.error("Error updating arsipLengkap status:", err));
          processedData.arsipLengkap = shouldBeComplete; // Update local state for consistency
        }
        return processedData;
      });

      // Sort by createdAt (if available) or tanggal, newest first
      data.sort((a, b) => {
        const dateA = firebaseTimestampToMoment(a.createdAt) || moment(a.tanggal);
        const dateB = firebaseTimestampToMoment(b.createdAt) || moment(b.tanggal);
        return dateB.valueOf() - dateA.valueOf();
      });

      setDataList(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Gagal mengambil data monitoring masuk');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply filtering based on activeTab and dataList
  useEffect(() => {
    let currentFilteredList = dataList;
    if (activeTab === 'proses') {
      currentFilteredList = dataList.filter(item => item.status === 'proses');
    } else if (activeTab === 'selesai') {
      currentFilteredList = dataList.filter(item => item.status === 'selesai');
    } else if (activeTab === 'arsipLengkap') {
      currentFilteredList = dataList.filter(item => isArchiveComplete(item));
    } else if (activeTab === 'arsipBelumLengkap') {
      currentFilteredList = dataList.filter(item => !isArchiveComplete(item));
    }
    setFilteredList(currentFilteredList);
  }, [dataList, activeTab]);


  // Calculate statistics
  const stats = useMemo(() => {
    return {
      total: dataList.length,
      draft: dataList.filter(item => item.status === 'draft').length,
      proses: dataList.filter(item => item.status === 'proses').length,
      selesai: dataList.filter(item => item.status === 'selesai').length,
      arsipLengkap: dataList.filter(item => isArchiveComplete(item)).length,
      arsipBelumLengkap: dataList.filter(item => !isArchiveComplete(item)).length
    };
  }, [dataList]);

  const handleSearch = (value: string) => {
    const searchLower = value.toLowerCase().trim();
    if (!searchLower) {
      // If search is cleared, reapply tab filter
      handleTabChange(activeTab);
      return;
    }

    const filtered = dataList.filter(item =>
      item.nomorSPBKontrak.toLowerCase().includes(searchLower) ||
      item.namaMaterial.toLowerCase().includes(searchLower) ||
      (item.normalisasiNumber && item.normalisasiNumber.toLowerCase().includes(searchLower)) ||
      item.penyedia.toLowerCase().includes(searchLower) ||
      item.fungsi.toLowerCase().includes(searchLower) ||
      (item.noPO && item.noPO.toLowerCase().includes(searchLower)) ||
      (item.nomorTUG3 && item.nomorTUG3.toLowerCase().includes(searchLower)) ||
      (item.nomorTUG4 && item.nomorTUG4.toLowerCase().includes(searchLower))
    );
    setFilteredList(filtered);
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    // Filtering logic is now handled by the useEffect after dataList/activeTab changes
  };

  // UI Helper: Get Status Tag
  const getStatusTag = useCallback((status: MonitoringMasukItem['status']) => {
    switch (status) {
      case 'draft':
        return <Tag color="gold" icon={<FileAddOutlined />}>Draft</Tag>;
      case 'proses':
        return <Tag color="blue" icon={<SyncOutlined spin />}>Proses</Tag>;
      case 'selesai':
        return <Tag color="green" icon={<CheckCircleOutlined />}>Selesai</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  }, []);

  // UI Helper: Get Arsip Status Tag
  const getArsipStatusTag = useCallback((record: MonitoringMasukItem) => {
    const reasons = [];
    if (!record.foto || record.foto.length === 0) reasons.push('Foto belum diunggah');
    if (!record.dokumen || record.dokumen.length === 0) reasons.push('Dokumen belum diunggah');
    if (!record.nomorTUG3 || record.nomorTUG3.trim() === '') reasons.push('Nomor TUG3 belum diisi');
    if (!record.nomorTUG4 || record.nomorTUG4.trim() === '') reasons.push('Nomor TUG4 belum diisi');
    if (record.qtyDiterima <= 0) reasons.push('QTY Diterima belum diisi');

    const complete = reasons.length === 0;
    if (complete) {
      return (
        <Tag icon={<CheckCircleOutlined />} color="success" className={styles.arsipLengkap}>
          <span className={styles.arsipText}>Lengkap</span>
        </Tag>
      );
    } else {
      return (
        <Tooltip title={<ul style={{ margin: 0, paddingLeft: 20 }}>{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}>
          <Tag icon={<CloseCircleOutlined />} color="error" className={styles.arsipBelumLengkap}>
            <span className={styles.arsipText}>Belum Lengkap</span>
          </Tag>
        </Tooltip>
      );
    }
  }, []);

  // --- MODAL HANDLERS ---
  const handleViewDetail = useCallback((record: MonitoringMasukItem) => {
    setSelectedItem(record);
    setDetailModalVisible(true);
  }, []);

  const handleViewArsip = useCallback((record: MonitoringMasukItem) => {
    setSelectedItem(record);
    setArsipModalVisible(true);
  }, []);

  const handleEdit = useCallback((record: MonitoringMasukItem) => {
    setSelectedItem(record);
    // Reset file lists for new uploads
    setFotoNewFiles([]);
    setDokumenNewFiles([]);

    // Set form fields with current values, converting dates to Moment objects
    form.setFieldsValue({
      ...record,
      tanggal: record.tanggal ? moment(record.tanggal) : undefined,
      tanggalTiba: record.tanggalTiba ? moment(record.tanggalTiba) : undefined,
    });
    setEditModalVisible(true);
  }, [form]);

  const handleDelete = async (id: string) => {
    try {
      // Optionally, delete associated files from Storage first
      const itemToDelete = dataList.find(item => item.id === id);
      if (itemToDelete) {
        // Delete fotos
        if (itemToDelete.foto && itemToDelete.foto.length > 0) {
          await Promise.all(itemToDelete.foto.map(url => deleteObject(ref(storage, url)).catch(e => console.warn("Failed to delete photo:", e))));
        }
        // Delete dokumen
        if (itemToDelete.dokumen && itemToDelete.dokumen.length > 0) {
          await Promise.all(itemToDelete.dokumen.map(url => deleteObject(ref(storage, url)).catch(e => console.warn("Failed to delete document:", e))));
        }
      }

      await deleteDoc(doc(db, 'transaksiMasuk', id));
      message.success('Transaksi berhasil dihapus!');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting transaction:', error);
      message.error('Gagal menghapus transaksi.');
    }
  };

  // --- FILE UPLOAD HANDLERS ---
  const beforeUploadImage = (file: any) => {
    const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
    if (!isJpgOrPng) {
      message.error('Anda hanya dapat mengunggah file JPG/PNG!');
    }
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Ukuran foto harus kurang dari 5MB!');
    }
    return isJpgOrPng && isLt5M;
  };

  const beforeUploadDocument = (file: any) => {
    const isValidType =
      file.type === 'application/pdf' ||
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/vnd.ms-excel' ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (!isValidType) {
      message.error('Format file tidak didukung. Gunakan PDF, DOC, DOCX, XLS, atau XLSX.');
    }
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('Ukuran dokumen harus kurang dari 10MB!');
    }
    return isValidType && isLt10M;
  };

  const handleUploadChange = (type: 'foto' | 'dokumen', info: any) => {
    if (type === 'foto') {
      setFotoNewFiles(info.fileList);
    } else {
      setDokumenNewFiles(info.fileList);
    }
  };

  // Custom upload function for Firebase Storage
  const customUploadRequest = async (options: any, itemType: 'foto' | 'dokumen') => {
    const { file, onSuccess, onError, onProgress } = options;
    const path = `transaksiMasuk/${selectedItem!.id}/${itemType}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress({ percent: progress });
      },
      (error) => {
        console.error(`Error uploading ${itemType}:`, error);
        let errorMessage = `Gagal mengunggah ${itemType}`;
        // Add more detailed error messages based on Firebase Storage error codes
        if (error.code === 'storage/unauthorized') errorMessage = 'Anda tidak memiliki izin untuk mengunggah file ini.';
        else if (error.code === 'storage/canceled') errorMessage = 'Unggahan dibatalkan.';
        else if (error.code === 'storage/object-not-found') errorMessage = 'File tidak ditemukan di server.';
        else if (error.code === 'storage/quota-exceeded') errorMessage = 'Kuota penyimpanan terlampaui.';

        message.error(errorMessage);
        onError(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          message.success(`${file.name} berhasil diunggah.`);
          onSuccess(downloadURL, file); // Pass URL back to Ant Design
        } catch (error) {
          console.error(`Error getting download URL for ${itemType}:`, error);
          message.error('Berhasil mengunggah file tetapi gagal mendapatkan URL unduhan.');
          onError(error);
        }
      }
    );
  };

  const handleDeleteExistingFile = async (url: string, type: 'foto' | 'dokumen') => {
    if (!selectedItem) return;

    try {
      // Delete from storage
      const fileRef = ref(storage, url);
      await deleteObject(fileRef);

      // Update state and Firestore
      const updatedList = type === 'foto'
        ? selectedItem.foto?.filter(f => f !== url) || []
        : selectedItem.dokumen?.filter(d => d !== url) || [];

      await updateDoc(doc(db, 'transaksiMasuk', selectedItem.id), {
        [type]: updatedList,
        updatedAt: serverTimestamp() as any
      });

      // Update selectedItem state to reflect the change
      setSelectedItem(prev => ({
        ...(prev as MonitoringMasukItem),
        [type]: updatedList,
      }));

      message.success('File berhasil dihapus!');
      fetchData(); // Re-fetch to update global data and stats
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      message.error(`Gagal menghapus ${type}.`);
    }
  };


  // --- FORM SUBMISSION ---
  const handleEditSubmit = async (values: any) => {
    if (!selectedItem) {
      message.error('Tidak ada item yang dipilih untuk diperbarui.');
      return;
    }

    setLoading(true); // Main loading indicator for form submission
    setIsUploadingFiles(true); // Separate loading for file uploads

    try {
      const updateData: Partial<MonitoringMasukItem> = {
        nomorSPBKontrak: values.nomorSPBKontrak,
        tanggal: values.tanggal ? values.tanggal.format('YYYY-MM-DD') : undefined,
        normalisasiNumber: values.normalisasiNumber || '',
        namaMaterial: values.namaMaterial,
        fungsi: values.fungsi,
        penyedia: values.penyedia,
        tanggalTiba: values.tanggalTiba ? values.tanggalTiba.format('YYYY-MM-DD') : undefined,
        noPO: values.noPO,
        qtyPesan: values.qtyPesan,
        qtyDiterima: values.qtyDiterima,
        nomorTUG3: values.nomorTUG3 || '',
        nomorTUG4: values.nomorTUG4 || '',
        jenisMaterial: values.jenisMaterial,
        status: values.status,
        keterangan: values.keterangan || '',
        updatedAt: serverTimestamp() as any
      };

      let newFotoUrls: string[] = [];
      if (fotoNewFiles.length > 0) {
        newFotoUrls = await Promise.all(
          fotoNewFiles.map(async (file) => {
            const path = `transaksiMasuk/${selectedItem.id}/foto/${Date.now()}_${file.name}`;
            return await uploadFile(file.originFileObj, path);
          })
        );
      }

      let newDokumenUrls: string[] = [];
      if (dokumenNewFiles.length > 0) {
        newDokumenUrls = await Promise.all(
          dokumenNewFiles.map(async (file) => {
            const path = `transaksiMasuk/${selectedItem.id}/dokumen/${Date.now()}_${file.name}`;
            return await uploadFile(file.originFileObj, path);
          })
        );
      }

      // Combine existing files with newly uploaded ones
      updateData.foto = [...(selectedItem.foto || []), ...newFotoUrls];
      updateData.dokumen = [...(selectedItem.dokumen || []), ...newDokumenUrls];

      // Re-evaluate arsipLengkap based on potentially updated data
      updateData.arsipLengkap = isArchiveComplete({ ...selectedItem, ...updateData } as MonitoringMasukItem);

      await updateDoc(doc(db, 'transaksiMasuk', selectedItem.id), updateData);

      message.success('Data transaksi berhasil diperbarui!');
      setEditModalVisible(false);
      setFotoNewFiles([]); // Clear new files after successful upload
      setDokumenNewFiles([]);
      fetchData(); // Refresh data in table
    } catch (error) {
      console.error('Error updating data:', error);
      message.error(`Gagal memperbarui data: ${error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal.'}`);
    } finally {
      setLoading(false);
      setIsUploadingFiles(false);
    }
  };

  // Helper for single file upload (used in handleEditSubmit)
  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress can be handled here if needed, but not directly shown per file in main form
        },
        (error) => {
          reject(error);
        },
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

  // --- TABLE COLUMNS DEFINITION ---
  const columns = useMemo(() => [
    {
      title: 'Nomor SPB/Kontrak',
      dataIndex: 'nomorSPBKontrak',
      key: 'nomorSPBKontrak',
      width: 160,
      render: (text: string) => (
        <Tooltip title={text}>
          <span style={{ fontWeight: 'bold', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {text}
          </span>
        </Tooltip>
      ),
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => a.nomorSPBKontrak.localeCompare(b.nomorSPBKontrak),
    },
    {
      title: 'Tanggal',
      dataIndex: 'tanggal',
      key: 'tanggal',
      width: 110,
      render: (date: string) => moment(date).format('DD/MM/YY'),
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => moment(a.tanggal).valueOf() - moment(b.tanggal).valueOf(),
    },
    {
      title: 'Normalisasi',
      dataIndex: 'normalisasiNumber',
      key: 'normalisasiNumber',
      width: 130,
      render: (text: string) => (
        <Tooltip title={text || 'Tidak ada nomor normalisasi'}>
          <Tag color={text ? 'geekblue' : 'default'} icon={<ContainerOutlined />} className={styles.compactTag}>
            {text || '-'}
          </Tag>
        </Tooltip>
      ),
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => (a.normalisasiNumber || '').localeCompare(b.normalisasiNumber || ''),
    },
    {
      title: 'Nama Material',
      dataIndex: 'namaMaterial',
      key: 'namaMaterial',
      width: 220,
      ellipsis: true,
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => a.namaMaterial.localeCompare(b.namaMaterial),
    },
    {
      title: 'Fungsi',
      dataIndex: 'fungsi',
      key: 'fungsi',
      width: 130,
      ellipsis: true,
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => a.fungsi.localeCompare(b.fungsi),
    },
    {
      title: 'Penyedia',
      dataIndex: 'penyedia',
      key: 'penyedia',
      width: 150,
      ellipsis: true,
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => a.penyedia.localeCompare(b.penyedia),
    },
    {
      title: 'Tiba',
      dataIndex: 'tanggalTiba',
      key: 'tanggalTiba',
      width: 110,
      render: (date: string) => moment(date).format('DD/MM/YY'),
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => moment(a.tanggalTiba).valueOf() - moment(b.tanggalTiba).valueOf(),
    },
    {
      title: 'No PO',
      dataIndex: 'noPO',
      key: 'noPO',
      width: 110,
      ellipsis: true,
      render: (text: string) => <Tooltip title={text}>{text || '-'}</Tooltip>,
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => (a.noPO || '').localeCompare(b.noPO || ''),
    },
    {
      title: 'QTY (Diterima/Pesan)',
      key: 'qty',
      width: 150,
      render: (_: any, record: MonitoringMasukItem) => (
        <div className={styles.qtyCell}>
          <span>
            <Tag color={record.qtyDiterima >= record.qtyPesan ? "success" : "processing"} className={styles.compactTag}>
              {record.qtyDiterima}
            </Tag> / <Tag color="default" className={styles.compactTag}>{record.qtyPesan}</Tag>
          </span>
          {record.qtyPesan > 0 && (
            <Progress
              percent={Math.round((record.qtyDiterima / record.qtyPesan) * 100)}
              size="small"
              status={record.qtyDiterima >= record.qtyPesan ? "success" : (record.qtyDiterima > 0 ? "normal" : "exception")}
              className={styles.compactProgress}
            />
          )}
        </div>
      ),
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => (a.qtyDiterima / a.qtyPesan) - (b.qtyDiterima / b.qtyPesan),
    },
    {
      title: 'TUG 3',
      dataIndex: 'nomorTUG3',
      key: 'nomorTUG3',
      width: 120,
      render: (text: string) => <Tooltip title={text || 'Belum ada TUG3'}><Tag icon={<SolutionOutlined />} color={text ? "cyan" : "default"} className={styles.compactTag}>{text || '-'}</Tag></Tooltip>,
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => (a.nomorTUG3 || '').localeCompare(b.nomorTUG3 || ''),
    },
    {
      title: 'TUG 4',
      dataIndex: 'nomorTUG4',
      key: 'nomorTUG4',
      width: 120,
      render: (text: string) => <Tooltip title={text || 'Belum ada TUG4'}><Tag icon={<SolutionOutlined />} color={text ? "purple" : "default"} className={styles.compactTag}>{text || '-'}</Tag></Tooltip>,
      sorter: (a: MonitoringMasukItem, b: MonitoringMasukItem) => (a.nomorTUG4 || '').localeCompare(b.nomorTUG4 || ''),
    },
    {
      title: 'Jenis',
      dataIndex: 'jenisMaterial',
      key: 'jenisMaterial',
      width: 100,
      render: (jenis: string) => jenis === 'eksklusif' ?
        <Tag color="volcano" className={styles.compactTag}>Eksklusif</Tag> :
        <Tag color="lime" className={styles.compactTag}>Umum</Tag>,
      filters: [
        { text: 'Umum', value: 'umum' },
        { text: 'Eksklusif', value: 'eksklusif' },
      ],
      onFilter: (value: any, record: MonitoringMasukItem) => record.jenisMaterial === value,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      fixed: 'left' as const,
      render: (status: MonitoringMasukItem['status']) => getStatusTag(status),
      filters: [
        { text: 'Draft', value: 'draft' },
        { text: 'Proses', value: 'proses' },
        { text: 'Selesai', value: 'selesai' },
      ],
      onFilter: (value: any, record: MonitoringMasukItem) => record.status === value,
    },
    {
      title: 'Arsip',
      key: 'arsip',
      width: 140,
      fixed: 'right' as const,
      render: (_: any, record: MonitoringMasukItem) => getArsipStatusTag(record),
      filters: [
        { text: 'Lengkap', value: true },
        { text: 'Belum Lengkap', value: false },
      ],
      onFilter: (value: any, record: MonitoringMasukItem) => isArchiveComplete(record) === value,
    },
    {
      title: 'Media',
      key: 'media',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: MonitoringMasukItem) => {
        const fotoCount = record.foto?.length || 0;
        const dokumenCount = record.dokumen?.length || 0;
        return (
          <Space direction="vertical" size="small" style={{ alignItems: 'center' }}>
            {fotoCount > 0 ? (
              <Tooltip title={`${fotoCount} foto tersedia. Klik untuk lihat.`}>
                <Button
                  type="text"
                  size="small"
                  icon={<FileImageOutlined style={{ color: '#1890ff' }} />}
                  onClick={() => handleViewArsip(record)}
                  className={styles.actionButton}
                >
                  {fotoCount} Foto
                </Button>
              </Tooltip>
            ) : (
              <Tag className={styles.compactTag} style={{ width: '100%', textAlign: 'center' }}>No Foto</Tag>
            )}
            {dokumenCount > 0 ? (
              <Tooltip title={`${dokumenCount} dokumen tersedia. Klik untuk lihat.`}>
                <Button
                  type="text"
                  size="small"
                  icon={<FileOutlined style={{ color: '#52c41a' }} />}
                  onClick={() => handleViewArsip(record)}
                  className={styles.actionButton}
                >
                  {dokumenCount} Dok
                </Button>
              </Tooltip>
            ) : (
              <Tag className={styles.compactTag} style={{ width: '100%', textAlign: 'center' }}>No Dok</Tag>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Aksi',
      key: 'action',
      fixed: 'right' as const,
      width: 150,
      render: (_: any, record: MonitoringMasukItem) => (
        <Space size="small">
          <Tooltip title="Lihat Detail">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined style={{ color: '#1890ff' }} />}
              onClick={() => handleViewDetail(record)}
              className={styles.actionButton}
            />
          </Tooltip>
          <Tooltip title="Edit Data & Arsip">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined style={{ color: '#faad14' }} />}
              onClick={() => handleEdit(record)}
              className={styles.actionButton}
            />
          </Tooltip>
          <Tooltip title="Hapus Transaksi">
            <Popconfirm
              title="Yakin ingin menghapus transaksi ini?"
              description="Tindakan ini tidak dapat dibatalkan. Semua data terkait juga akan dihapus."
              onConfirm={() => handleDelete(record.id)}
              okText="Ya, Hapus"
              cancelText="Batal"
              placement="topRight"
            >
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                className={styles.actionButton}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    }
  ], [getStatusTag, getArsipStatusTag, handleViewDetail, handleViewArsip, handleEdit, handleDelete]);


  return (
    <div className={styles.monitoringMasukPage}>
      {/* Compact Header */}
      <div className={styles.compactHeader}>
        <div className={styles.headerLeft}>
          <Title level={3} className={styles.pageTitle}>
            <InboxOutlined /> Monitoring Transaksi Masuk
          </Title>
        </div>
        <div className={styles.headerRight}>
          <Input.Search
            placeholder="Cari transaksi..."
            allowClear
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 250, marginRight: 12 }}
          />
          <Tooltip title="Muat Ulang Data">
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>
              Refresh
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Compact Stats Bar */}
      <div className={styles.statsBar}>
        <Statistic title={<span className={styles.statLabel}>Total Transaksi</span>} value={stats.total} className={styles.statItem} />
        <Statistic title={<span className={styles.statLabel}>Dalam Proses</span>} value={stats.proses} valueStyle={{ color: '#722ed1' }} className={styles.statItem} />
        <Statistic title={<span className={styles.statLabel}>Selesai</span>} value={stats.selesai} valueStyle={{ color: '#52c41a' }} className={styles.statItem} />
        <Statistic title={<span className={styles.statLabel}>Arsip Belum Lengkap</span>} value={stats.arsipBelumLengkap} valueStyle={{ color: '#ff4d4f' }} className={styles.statItem} />
      </div>

      {/* Filter Section and Table */}
      <div className={styles.filterSection}>
        <div className={styles.filterHeader}>
          <Select
            value={activeTab}
            onChange={handleTabChange}
            style={{ width: 220 }}
            placeholder="Filter berdasarkan status"
            className={styles.filterSelect}
          >
            <Option value="all">
              <span className={styles.tabBadge}><FileTextOutlined /> Semua ({stats.total})</span>
            </Option>
            <Option value="proses">
              <span className={styles.tabBadge}><SyncOutlined spin /> Proses ({stats.proses})</span>
            </Option>
            <Option value="selesai">
              <span className={styles.tabBadge}><CheckCircleOutlined /> Selesai ({stats.selesai})</span>
            </Option>
            <Option value="arsipLengkap">
              <span className={styles.tabBadge}><CheckCircleOutlined /> Arsip Lengkap ({stats.arsipLengkap})</span>
            </Option>
            <Option value="arsipBelumLengkap">
              <span className={styles.tabBadge}><CloseCircleOutlined /> Arsip Belum Lengkap ({stats.arsipBelumLengkap})</span>
            </Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={filteredList}
          rowKey="id"
          scroll={{ x: 1800 }} // Sesuaikan lebar scroll sesuai kebutuhan
          pagination={{
            pageSize: 10,
            showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} item`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showQuickJumper: true,
            className: styles.antPagination, // Gunakan class untuk styling pagination
          }}
          loading={loading}
          size="middle"
          className={styles.antTableWrapper} // Class untuk wrapper tabel
          bordered={false} // Ant Design Table sudah memiliki border
        />
      </div>

      {/* Modal Detail */}
      <Modal
        title={
          <div className={styles.modalTitle}>
            <EyeOutlined />
            <span>Detail Transaksi</span>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        maskClosable={false}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Tutup
          </Button>
        ]}
        width={800}
      >
        {selectedItem ? (
          <Descriptions
            title={`Informasi Lengkap Transaksi ${selectedItem.nomorSPBKontrak}`}
            bordered
            column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
            size="middle"
          >
            <Descriptions.Item label="Nomor SPB/Kontrak"><Text strong>{selectedItem.nomorSPBKontrak}</Text></Descriptions.Item>
            <Descriptions.Item label="Tanggal">{moment(selectedItem.tanggal).format('DD MMMM YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Normalisasi">{selectedItem.normalisasiNumber || <Text type="secondary">-</Text>}</Descriptions.Item>
            <Descriptions.Item label="Nama Material"><Text copyable>{selectedItem.namaMaterial}</Text></Descriptions.Item>
            <Descriptions.Item label="Fungsi">{selectedItem.fungsi}</Descriptions.Item>
            <Descriptions.Item label="Penyedia">{selectedItem.penyedia}</Descriptions.Item>
            <Descriptions.Item label="Tanggal Tiba">{moment(selectedItem.tanggalTiba).format('DD MMMM YYYY')}</Descriptions.Item>
            <Descriptions.Item label="No PO">{selectedItem.noPO || <Text type="secondary">-</Text>}</Descriptions.Item>
            <Descriptions.Item label="QTY Pesan"><Tag color="blue" className={styles.compactTag}>{selectedItem.qtyPesan}</Tag></Descriptions.Item>
            <Descriptions.Item label="QTY Diterima"><Tag color="green" className={styles.compactTag}>{selectedItem.qtyDiterima}</Tag></Descriptions.Item>
            <Descriptions.Item label="Nomor TUG 3">{selectedItem.nomorTUG3 || <Text type="secondary">-</Text>}</Descriptions.Item>
            <Descriptions.Item label="Nomor TUG 4">{selectedItem.nomorTUG4 || <Text type="secondary">-</Text>}</Descriptions.Item>
            <Descriptions.Item label="Jenis Material">
              {selectedItem.jenisMaterial === 'eksklusif' ?
                <Tag color="purple" className={styles.compactTag}>Eksklusif</Tag> :
                <Tag color="cyan" className={styles.compactTag}>Umum</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="Status">{getStatusTag(selectedItem.status)}</Descriptions.Item>
            <Descriptions.Item label="Status Arsip">{getArsipStatusTag(selectedItem)}</Descriptions.Item>
            <Descriptions.Item label="Dibuat Pada">
              {firebaseTimestampToMoment(selectedItem.createdAt)?.format('DD MMMM YYYY, HH:mm') || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Terakhir Diperbarui">
              {firebaseTimestampToMoment(selectedItem.updatedAt)?.format('DD MMMM YYYY, HH:mm') || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Keterangan" span={2}>
              {selectedItem.keterangan || <Text type="secondary">Tidak ada keterangan.</Text>}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Empty description="Tidak ada data untuk ditampilkan." />
        )}
      </Modal>

      {/* Modal Arsip */}
      <Modal
        title={
          <div className={styles.modalTitle}>
            <FileImageOutlined />
            <span>Arsip Dokumen & Foto</span>
          </div>
        }
        open={arsipModalVisible}
        onCancel={() => setArsipModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setArsipModalVisible(false)}>
            Tutup
          </Button>
        ]}
        width={800}
      >
        {selectedItem ? (
          <Tabs defaultActiveKey="1" className={styles.filterTabs}>
            <TabPane tab="Foto" key="1">
              {selectedItem.foto && selectedItem.foto.length > 0 ? (
                <div>
                  <p>Total foto: {selectedItem.foto.length}
                    <Tooltip title="Geser untuk melihat semua foto">
                      <InfoCircleOutlined style={{ marginLeft: 8, color: 'rgba(0,0,0,0.45)' }} />
                    </Tooltip>
                  </p>
                  <div style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '10px' }}>
                    <Space size={16} wrap={false}>
                      {selectedItem.foto.map((url, index) => (
                        <Card
                          key={index}
                          hoverable
                          style={{ width: 220, flexShrink: 0 }}
                          cover={<img alt={`Foto ${index + 1}`} src={url} style={{ height: 180, objectFit: 'cover' }} />}
                          actions={[
                            <Tooltip title="Unduh Foto">
                              <a href={url} target="_blank" rel="noopener noreferrer" download>
                                <DownloadOutlined key="download" />
                              </a>
                            </Tooltip>
                          ]}
                        >
                          <Card.Meta title={`Foto ${index + 1}`} />
                        </Card>
                      ))}
                    </Space>
                  </div>
                </div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span>
                      Belum ada **foto** yang diunggah untuk transaksi ini.
                    </span>
                  }
                />
              )}
            </TabPane>
            <TabPane tab="Dokumen" key="2">
              {selectedItem.dokumen && selectedItem.dokumen.length > 0 ? (
                <div>
                  <p>Total dokumen: {selectedItem.dokumen.length}</p>
                  <List
                    itemLayout="horizontal"
                    dataSource={selectedItem.dokumen}
                    renderItem={(url, index) => (
                      <List.Item
                        actions={[
                          <Tooltip title="Unduh Dokumen">
                            <Button type="link" icon={<DownloadOutlined />} onClick={() => window.open(url, '_blank')}>
                              Unduh
                            </Button>
                          </Tooltip>
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<FileOutlined style={{ fontSize: 28, color: '#1890ff' }} />}
                          title={`Dokumen ${index + 1}`}
                          description={url.split('/').pop() || 'Nama file tidak diketahui'}
                        />
                      </List.Item>
                    )}
                  />
                </div>
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span>
                      Belum ada **dokumen** yang diunggah untuk transaksi ini.
                    </span>
                  }
                />
              )}
            </TabPane>
          </Tabs>
        ) : (
          <Empty description="Tidak ada item yang dipilih." />
        )}
      </Modal>

      {/* Modal Edit */}
      <Modal
        title={
          <div className={styles.modalTitle}>
            <EditOutlined />
            <span>Edit Data Transaksi</span>
          </div>
        }
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null} // Custom footer buttons
        width={850} // Lebar modal edit
        maskClosable={false}
      >
        {selectedItem ? (
          <Spin spinning={isUploadingFiles} tip="Mengunggah file..." size="large">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleEditSubmit}
              initialValues={{
                ...selectedItem,
                tanggal: selectedItem.tanggal ? moment(selectedItem.tanggal) : undefined,
                tanggalTiba: selectedItem.tanggalTiba ? moment(selectedItem.tanggalTiba) : undefined,
              }}
            >
              <Tabs defaultActiveKey="1" className={styles.filterTabs}>
                <TabPane tab="Informasi Dasar" key="1">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="nomorSPBKontrak"
                        label="Nomor SPB/Kontrak"
                        rules={[{ required: true, message: 'Wajib diisi' }]}
                      >
                        <Input placeholder="Contoh: SPB/KTR/2024/001" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="tanggal"
                        label="Tanggal Transaksi"
                        rules={[{ required: true, message: 'Wajib diisi' }]}
                      >
                        <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="normalisasiNumber"
                        label="Nomor Normalisasi (Opsional)"
                      >
                        <Input placeholder="Contoh: NOR/2024/0123" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="namaMaterial"
                        label="Nama Material"
                        rules={[{ required: true, message: 'Wajib diisi' }]}
                      >
                        <Input placeholder="Contoh: Semen Portland Tipe 1" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="fungsi"
                        label="Fungsi Material"
                        rules={[{ required: true, message: 'Wajib diisi' }]}
                      >
                        <Input placeholder="Contoh: Konstruksi Bangunan" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="penyedia"
                        label="Penyedia Material"
                        rules={[{ required: true, message: 'Wajib diisi' }]}
                      >
                        <Input placeholder="Contoh: PT. Bangun Jaya" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="tanggalTiba"
                        label="Tanggal Tiba Material"
                        rules={[{ required: true, message: 'Wajib diisi' }]}
                      >
                        <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="noPO"
                        label="Nomor PO"
                        rules={[{ required: true, message: 'Wajib diisi' }]}
                      >
                        <Input placeholder="Contoh: PO/2024/005" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="qtyPesan"
                        label="QTY Dipesan"
                        rules={[{ required: true, message: 'Wajib diisi' }]}
                      >
                        <Input type="number" min={0} placeholder="Jumlah yang dipesan" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="qtyDiterima"
                        label="QTY Diterima"
                        rules={[{ required: true, message: 'Wajib diisi' }]}
                      >
                        <Input type="number" min={0} placeholder="Jumlah yang diterima" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="nomorTUG3"
                        label="Nomor TUG 3"
                        rules={[{ required: true, message: 'Wajib diisi' }]}
                      >
                        <Input placeholder="Contoh: TUG3/2024/001" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="nomorTUG4"
                        label="Nomor TUG 4"
                        rules={[{ required: true, message: 'Wajib diisi' }]}
                      >
                        <Input placeholder="Contoh: TUG4/2024/002" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="jenisMaterial"
                        label="Jenis Material"
                        rules={[{ required: true, message: 'Wajib diisi' }]}
                      >
                        <Select placeholder="Pilih jenis material">
                          <Option value="umum">Umum</Option>
                          <Option value="eksklusif">Eksklusif</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="status"
                        label="Status Transaksi"
                        rules={[{ required: true, message: 'Wajib diisi' }]}
                      >
                        <Select placeholder="Pilih status transaksi">
                          <Option value="draft">Draft</Option>
                          <Option value="proses">Proses</Option>
                          <Option value="selesai">Selesai</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item
                        name="keterangan"
                        label="Keterangan Tambahan (Opsional)"
                      >
                        <Input.TextArea rows={3} placeholder="Tambahkan catatan atau detail lainnya..." />
                      </Form.Item>
                    </Col>
                  </Row>
                </TabPane>

                <TabPane tab="Manajemen Arsip" key="2">
                  <Alert
                    message="Penting: Kelengkapan Arsip"
                    description="Kelengkapan arsip (foto dan dokumen) akan mempengaruhi status arsip transaksi ini. Pastikan Anda mengunggah semua yang diperlukan."
                    type="info"
                    showIcon
                    className="mb-4"
                    icon={<InfoCircleOutlined />}
                  />

                  {/* Existing Photos Section */}
                  <div className="mb-4">
                    <Title level={5}><FileImageOutlined /> Foto yang Sudah Diunggah</Title>
                    {selectedItem.foto && selectedItem.foto.length > 0 ? (
                      <Row gutter={[16, 16]}>
                        {selectedItem.foto.map((url, index) => (
                          <Col xs={24} sm={12} md={8} key={index}>
                            <Card
                              hoverable
                              cover={<img alt={`Foto ${index + 1}`} src={url} style={{ height: 120, objectFit: 'cover' }} />}
                              actions={[
                                <Tooltip title="Lihat/Unduh">
                                  <a href={url} target="_blank" rel="noopener noreferrer" download>
                                    <EyeOutlined />
                                  </a>
                                </Tooltip>,
                                <Popconfirm
                                  title="Yakin ingin menghapus foto ini?"
                                  onConfirm={() => handleDeleteExistingFile(url, 'foto')}
                                  okText="Ya"
                                  cancelText="Tidak"
                                  placement="topRight"
                                >
                                  <DeleteOutlined style={{ color: 'red' }} />
                                </Popconfirm>,
                              ]}
                            >
                              <Card.Meta title={`Foto ${index + 1}`} />
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Belum ada foto yang diunggah."
                      />
                    )}
                  </div>

                  {/* New Photo Upload */}
                  <Form.Item
                    label="Unggah Foto Baru"
                    extra="Format: JPG, PNG. Maks: 5MB per file."
                  >
                    <Dragger
                      name="file"
                      multiple
                      listType="picture"
                      beforeUpload={beforeUploadImage}
                      onChange={(info) => handleUploadChange('foto', info)}
                      fileList={fotoNewFiles}
                      onRemove={(file) => {
                        const newFileList = fotoNewFiles.filter(f => f.uid !== file.uid);
                        setFotoNewFiles(newFileList);
                        return true;
                      }}
                      customRequest={(options) => customUploadRequest(options, 'foto')}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">Klik atau seret foto ke area ini untuk mengunggah</p>
                      <p className="ant-upload-hint">Unggah foto material untuk dokumentasi visual.</p>
                    </Dragger>
                  </Form.Item>

                  {/* Existing Documents Section */}
                  <div className="mb-4 mt-5">
                    <Title level={5}><FileOutlined /> Dokumen yang Sudah Diunggah</Title>
                    {selectedItem.dokumen && selectedItem.dokumen.length > 0 ? (
                      <List
                        itemLayout="horizontal"
                        dataSource={selectedItem.dokumen}
                        renderItem={(url, index) => (
                          <List.Item
                            actions={[
                              <Tooltip title="Unduh Dokumen">
                                <Button type="link" icon={<DownloadOutlined />} onClick={() => window.open(url, '_blank')}>
                                  Unduh
                                </Button>
                              </Tooltip>,
                              <Popconfirm
                                title="Yakin ingin menghapus dokumen ini?"
                                onConfirm={() => handleDeleteExistingFile(url, 'dokumen')}
                                okText="Ya"
                                cancelText="Tidak"
                                placement="topRight"
                              >
                                <Button type="link" danger icon={<DeleteOutlined />}>
                                  Hapus
                                </Button>
                              </Popconfirm>
                            ]}
                          >
                            <List.Item.Meta
                              avatar={<FileOutlined style={{ fontSize: 28, color: '#007bff' }} />}
                              title={`Dokumen ${index + 1}`}
                              description={url.split('/').pop() || 'Nama file tidak diketahui'}
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Belum ada dokumen yang diunggah."
                      />
                    )}
                  </div>

                  {/* New Document Upload */}
                  <Form.Item
                    label="Unggah Dokumen Baru"
                    extra="Format: PDF, DOC, DOCX, XLS, XLSX. Maks: 10MB per file."
                  >
                    <Dragger
                      name="file"
                      multiple
                      listType="text"
                      beforeUpload={beforeUploadDocument}
                      onChange={(info) => handleUploadChange('dokumen', info)}
                      fileList={dokumenNewFiles}
                      onRemove={(file) => {
                        const newFileList = dokumenNewFiles.filter(f => f.uid !== file.uid);
                        setDokumenNewFiles(newFileList);
                        return true;
                      }}
                      customRequest={(options) => customUploadRequest(options, 'dokumen')}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">Klik atau seret dokumen ke area ini untuk mengunggah</p>
                      <p className="ant-upload-hint">Unggah dokumen pendukung (surat jalan, invoice, dll).</p>
                    </Dragger>
                  </Form.Item>
                </TabPane>
              </Tabs>

              <Form.Item className="mt-5">
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button onClick={() => setEditModalVisible(false)} disabled={isUploadingFiles}>
                    Batal
                  </Button>
                  <Button type="primary" htmlType="submit" loading={loading || isUploadingFiles}>
                    Simpan Perubahan
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </Spin>
        ) : (
          <Empty description="Tidak ada item yang dipilih untuk diedit." />
        )}
      </Modal>
    </div>
  );
};
