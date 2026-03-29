import React, { useState, useEffect } from 'react';
import {
  Button,
  Table,
  message,
  Card,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Tag,
  Checkbox,
  Space,
  Row,
  Col,
  DatePicker,
  Tooltip,
  Pagination,
  Radio,
  Alert,
} from 'antd';
import type { ColumnType } from 'antd/es/table';
import type { FormListFieldData } from 'antd/es/form';
import { 
  SearchOutlined, 
  FilterOutlined, 
  InfoCircleOutlined, 
  ReloadOutlined,
  CloseOutlined,
  SaveOutlined,
  SendOutlined,
  UndoOutlined
} from '@ant-design/icons';
// import { useAppContext } from '../context/AppContext';
import logger from '../utils/logger';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import styles from './MutasiKeluar.module.css';

const { Option } = Select;

interface MaterialHistory {
  date: string;
  qtyDilayani: number;
  normalisasi: string;
  materialDescription: string;
  status: string;
  adminName?: string;
  woNumber?: string;
}

interface Material {
  materialDescription: string;
  qtyPermintaan: number;
  qtyDilayani: number;
  normalisasi: string;
  valuationType: string;
  fungsi: string;
  satuan: string;
  selected?: boolean;
  qtyAmbil?: number;
  status?: string;
  kategori?: string;
  id?: string;
  history?: MaterialHistory[];
  useSameNormalization?: boolean;
  newNormalization?: string;
  newMaterialDescription?: string;
}

interface Reservasi {
  id: string;
  nomorReservasi: string;
  tanggal: string;
  status: string;
  pelaksana: string;
  nomorKontrak: string;
  fungsi: string;
  deskripsiPekerjaan: string;
  materials: Material[];
}

interface WOData {
  nomorWO: string;
  nomorReservasi: string;
  tanggal: string;
  tanggalDilayani?: string;
  pelaksana: string;
  materials: {
    materialDescription: string;
    normalisasi: string;
    valuationType: string;
    qtyAmbil: number;
    kategori: string;
    merek?: string;
    nomorSeri?: string;
    tahun?: string;
  }[];
}

interface MasterDataItem {
  id: string;
  normalisasi: string;
  materialDescription: string;
  satuan: string;
  valuationDescription?: string;
  hargaSatuan?: number;
}

const MutasiKeluar: React.FC = () => {
  // Gunakan appContext jika diperlukan, jika tidak, hapus
  // const appContext = useAppContext();
  const [reservasiList, setReservasiList] = useState<Reservasi[]>([]);
  const [filteredReservasi, setFilteredReservasi] = useState<Reservasi[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReservasi, setSelectedReservasi] = useState<Reservasi | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'reservasi' | 'detail'>('reservasi');
  const [form] = Form.useForm<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [materialHistory, setMaterialHistory] = useState<{ [key: string]: MaterialHistory[] }>({});
  const [masterMaterialData, setMasterMaterialData] = useState<MasterDataItem[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [fungsiFilter, setFungsiFilter] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [filterVisible, setFilterVisible] = useState<boolean>(false);
  const [uniqueFungsi, setUniqueFungsi] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  // State untuk modal pembatalan material dengan status Complete
  const [cancelCompleteModalVisible, setCancelCompleteModalVisible] = useState(false);
  const [materialToCancel, setMaterialToCancel] = useState<{ index: number; material: Material } | null>(null);
  const [selectedHistoryEntries, setSelectedHistoryEntries] = useState<string[]>([]);
  const [cancelMode, setCancelMode] = useState<'all' | 'selected'>('all');
  
  // Fungsi untuk menangani pembatalan material dengan status Complete
  const handleCancelCompleteMaterial = (index: number, material: Material) => {
    setMaterialToCancel({ index, material });
    setSelectedHistoryEntries([]);
    setCancelMode('all');
    setCancelCompleteModalVisible(true);
  };
  
  // Fungsi untuk menangani perubahan mode pembatalan
  const handleCancelModeChange = (mode: 'all' | 'selected') => {
    setCancelMode(mode);
    if (mode === 'all') {
      setSelectedHistoryEntries([]);
    }
  };
  
  // Fungsi untuk menangani pemilihan entri historis
  const handleHistoryEntrySelect = (entryId: string, checked: boolean) => {
    if (checked) {
      setSelectedHistoryEntries(prev => [...prev, entryId]);
    } else {
      setSelectedHistoryEntries(prev => prev.filter(id => id !== entryId));
    }
  };
  
  // Fungsi untuk melakukan pembatalan material dengan status Complete
  const confirmCancelCompleteMaterial = () => {
    if (!materialToCancel) return;
    
    const { index, material } = materialToCancel;
    const materials = form.getFieldValue('materials');
    
    if (cancelMode === 'all') {
      // Reset status dan qty dilayani
      materials[index].qtyDilayani = 0;
      materials[index].status = 'Belum Dilayani';
      
      // Hapus semua history material
      setMaterialHistory(prev => {
        const newHistory = { ...prev };
        if (newHistory[material.materialDescription]) {
          newHistory[material.materialDescription] = [];
        }
        return newHistory;
      });
    } else {
      // Pembatalan berdasarkan historis yang dipilih
      const history = materialHistory[material.materialDescription] || [];
      
      // Filter history yang tidak dibatalkan
      const remainingHistory = history.filter((entry, idx) => 
        !selectedHistoryEntries.includes(`${entry.date}-${idx}`)
      );
      
      // Hitung total qty dilayani dari history yang tersisa
      const totalQtyDilayani = remainingHistory.reduce((sum, entry) => sum + entry.qtyDilayani, 0);
      
      // Update status berdasarkan qty yang tersisa
      let newStatus = 'Belum Dilayani';
      if (totalQtyDilayani > 0) {
        newStatus = totalQtyDilayani >= material.qtyPermintaan ? 'Complete' : 'Proses';
      }
      
      // Update material
      materials[index].qtyDilayani = totalQtyDilayani;
      materials[index].status = newStatus;
      
      // Update history material
      setMaterialHistory(prev => {
        const newHistory = { ...prev };
        if (newHistory[material.materialDescription]) {
          newHistory[material.materialDescription] = remainingHistory;
        }
        return newHistory;
      });
    }
    
    // Update form
    form.setFieldsValue({ materials });
    
    // Tutup modal
    setCancelCompleteModalVisible(false);
    
    // Tampilkan pesan sukses
    message.success('Material berhasil dibatalkan sesuai pilihan Anda');
  };
  useEffect(() => {
    fetchReservasi();
    fetchMasterMaterialData();
  }, []);

  const fetchMasterMaterialData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'masterMaterial'));
      const fetchedData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          normalisasi: data.normalisasi,
          materialDescription: data.materialDescription,
          satuan: data.satuan,
        } as MasterDataItem;
      });
      setMasterMaterialData(fetchedData);
    } catch (error) {
      message.error('Gagal mengambil data master material');
    }
  };

  const fetchReservasi = async () => {
    setLoading(true);
    try {
      const reservasiCollection = collection(db, 'daftarReservasi');
      const reservasiSnapshot = await getDocs(reservasiCollection);
      
      // Transformasi data untuk memastikan struktur yang benar
      const reservasiData = [];
      
      for (const doc of reservasiSnapshot.docs) {
        const data = doc.data();
        
        // Cek apakah ini adalah data reservasi yang valid
        if (data.nomorReservasi) {
          // Buat objek reservasi dengan struktur yang benar
          const reservasi: Reservasi = {
            id: doc.id,
            nomorReservasi: data.nomorReservasi || '',
            nomorKontrak: data.nomorKontrak || '',
            tanggal: data.tanggal || new Date().toISOString(),
            status: data.status || 'Pending',
            pelaksana: data.pelaksana || '',
            fungsi: data.fungsi || '',
            deskripsiPekerjaan: data.deskripsiPekerjaan || '',
            materials: Array.isArray(data.materials) ? data.materials : [],
          };
          
          reservasiData.push(reservasi);
        }
      }
      
      // Log untuk debugging
      console.log('Fetched and transformed reservasi data:', reservasiData);
      
      setReservasiList(reservasiData);
      setFilteredReservasi(reservasiData);
    } catch (error) {
      logger.error('MutasiKeluar: Error fetching reservasi data', error);
      message.error('Gagal mengambil data reservasi');
    } finally {
      setLoading(false);
    }
  };

  // Extract unique fungsi values for filter
  useEffect(() => {
    const uniqueFungsiValues = Array.from(
      new Set(reservasiList.map((reservasi) => reservasi.fungsi))
    ).filter(Boolean);
    setUniqueFungsi(uniqueFungsiValues);
  }, [reservasiList]);

  // Apply all filters
  useEffect(() => {
    let filtered = [...reservasiList];

    // Apply search query filter
    if (searchQuery.trim() !== '') {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (reservasi) =>
          reservasi.nomorReservasi.toLowerCase().includes(lowerCaseQuery) ||
          reservasi.nomorKontrak.toLowerCase().includes(lowerCaseQuery) ||
          reservasi.pelaksana.toLowerCase().includes(lowerCaseQuery)
      );
    }

    // Apply date range filter
    if (dateRange[0] && dateRange[1]) {
      filtered = filtered.filter((reservasi) => {
        const reservasiDate = dayjs(reservasi.tanggal);
        return (
          reservasiDate.isAfter(dateRange[0], 'day') || reservasiDate.isSame(dateRange[0], 'day')
        ) && (
          reservasiDate.isBefore(dateRange[1], 'day') || reservasiDate.isSame(dateRange[1], 'day')
        );
      });
    }

    // Apply fungsi filter
    if (fungsiFilter) {
      filtered = filtered.filter((reservasi) => reservasi.fungsi === fungsiFilter);
    }

    setFilteredReservasi(filtered);
  }, [searchQuery, dateRange, fungsiFilter, reservasiList]);

  const handleDateRangeChange = (dates: any) => {
    setDateRange(dates);
  };

  const handleFungsiFilterChange = (value: string) => {
    setFungsiFilter(value);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDateRange([null, null]);
    setFungsiFilter('');
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
  };

  const handleService = (record: Reservasi) => {
    setSelectedReservasi(record);
    setActiveTab('detail');
    const materialsWithStatus = record.materials.map((material: Material) => {
      const qtyDilayani = material.qtyDilayani || 0;
      let status = 'Belum Dilayani';
      if (qtyDilayani > 0) {
        status = qtyDilayani === material.qtyPermintaan ? 'Complete' : 'Proses';
      }
      return { ...material, status };
    });
    form.setFieldsValue({
      nomorReservasi: record.nomorReservasi,
      nomorKontrak: record.nomorKontrak,
      deskripsiPekerjaan: record.deskripsiPekerjaan,
      pelaksana: record.pelaksana,
      fungsi: record.fungsi,
      materials: materialsWithStatus,
    });
  };

  const handleSendWO = async () => {
    try {
      // Validasi form
      const values = await form.validateFields();
      console.log('Form values before sending WO:', values);
      
      // Cek apakah form sudah disubmit
      if (!isSubmitted) {
        message.warning('Silakan klik Submit terlebih dahulu sebelum mengirim WO');
        return;
      }
      
      // Cek apakah ada material yang dipilih
      const selectedMaterials = values.materials.filter((m: Material) => m.selected);
      if (selectedMaterials.length === 0) {
        message.warning('Pilih minimal satu material untuk dikirim ke WO');
        return;
      }
      
      // Cek apakah semua material yang dipilih memiliki qty yang valid
      const invalidQty = selectedMaterials.some((m: Material) => !m.qtyAmbil || m.qtyAmbil <= 0);
      if (invalidQty) {
        message.warning('Masukkan jumlah qty yang valid untuk semua material yang dipilih');
        return;
      }

      // Buat data WO dengan format nomor yang berurutan
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
      
      // Convert month to Roman numeral
      const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
      const romanMonth = romanMonths[month - 1];
      
      let woData: WOData;
      
      try {
        // Get the last WO number for this year to determine the next sequence
        const workOrdersCollection = collection(db, 'workOrders');
        const workOrdersSnapshot = await getDocs(workOrdersCollection);
        const thisYearWOs = workOrdersSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((wo: any) => {
            const woDate = new Date(wo.tanggal);
            return woDate.getFullYear() === year;
          });
        
        // Extract sequence numbers and find the highest
        let maxSequence = 0;
        thisYearWOs.forEach((wo: any) => {
          if (wo.nomorWO && typeof wo.nomorWO === 'string') {
            const match = wo.nomorWO.match(/^(\d+)\/MatKeluar/);
            if (match && match[1]) {
              const sequence = parseInt(match[1], 10);
              if (!isNaN(sequence) && sequence > maxSequence) {
                maxSequence = sequence;
              }
            }
          }
        });
        
        // Generate the next sequence number
        const nextSequence = maxSequence + 1;
        const sequenceFormatted = nextSequence.toString().padStart(3, '0');
        
        // Create the WO number in the required format
        const nomorWO = `${sequenceFormatted}/MatKeluar/${romanMonth}/${year}`;
        
        console.log(`Generated WO number: ${nomorWO}`);
        
        // Create the WO data object
        woData = {
          nomorWO: nomorWO,
          nomorReservasi: values.nomorReservasi,
          tanggal: currentDate.toISOString(),
          tanggalDilayani: currentDate.toISOString(),
          pelaksana: selectedReservasi?.pelaksana || '',
          materials: selectedMaterials.map((material: Material) => {
            // Pastikan semua nilai memiliki default yang valid
            const materialDescription = 
              material.useSameNormalization === false && material.newMaterialDescription
                ? material.newMaterialDescription || material.materialDescription || ''
                : material.materialDescription || '';
                
            const normalisasi = 
              material.useSameNormalization === false && material.newNormalization
                ? material.newNormalization || material.normalisasi || ''
                : material.normalisasi || '';
                
            return {
              materialDescription,
              normalisasi,
              valuationType: material.valuationType || '',
              qtyAmbil: Number(material.qtyAmbil) || 0,
              kategori: material.kategori || 'Umum',
              merek: '',
              ...(material.kategori === 'Eksklusif' && {
                nomorSeri: '',
                tahun: '',
              }),
            };
          }),
        };

        console.log('Sending WO data:', woData);
        
        // Simpan ke Firestore
        await addDoc(workOrdersCollection, woData);
      } catch (error) {
        console.error('Error generating WO number:', error);
        throw new Error('Gagal membuat nomor WO');
      }

      // Tampilkan pesan sukses
      message.success('Work Order berhasil dikirim');
      
      // Reset status submit, tutup modal dan refresh tampilan detail
      setIsSubmitted(false);
      setModalVisible(false);
      
      // Update form dengan tanggal dilayani
      form.setFieldsValue({
        tanggalDilayani: dayjs(currentDate).format('DD/MM/YYYY HH:mm')
      });
      
      handleService(selectedReservasi!);
    } catch (error) {
      logger.error('Error sending work order:', error);
      message.error('Gagal mengirim work order: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleModalOk = async () => {
    try {
      // Validasi form
      const values = await form.validateFields();
      console.log('Form values before processing:', values);
      
      // Cek apakah ada material yang dipilih
      const selectedMaterials = values.materials.filter((m: Material) => m.selected);
      if (selectedMaterials.length === 0) {
        message.warning('Pilih minimal satu material untuk dilayani');
        return;
      }
      
      // Cek apakah semua material yang dipilih memiliki qty yang valid
      const invalidQty = selectedMaterials.some((m: Material) => !m.qtyAmbil || m.qtyAmbil <= 0);
      if (invalidQty) {
        message.warning('Masukkan jumlah qty yang valid untuk semua material yang dipilih');
        return;
      }
      
      // Proses update material
      const updatedMaterials = values.materials.map((material: Material) => {
        if (material.selected) {
          // Pastikan qtyAmbil adalah angka yang valid
          const qtyAmbil = Number(material.qtyAmbil) || 0;
          // Hitung total qty dilayani
          const qtyDilayani = (Number(material.qtyDilayani) || 0) + qtyAmbil;
          
          // Tentukan status berdasarkan qty
          let status = 'Belum Dilayani';
          if (qtyDilayani > 0) {
            status = qtyDilayani >= material.qtyPermintaan ? 'Complete' : 'Proses';
          }

          // Tentukan normalisasi yang digunakan
          const normalizationUsed =
            material.useSameNormalization === false
              ? material.newNormalization || material.normalisasi
              : material.normalisasi;

          // Tentukan deskripsi material yang digunakan
          const materialDescriptionUsed =
            material.useSameNormalization === false
              ? material.newMaterialDescription || material.materialDescription
              : material.materialDescription;

          // Buat entri history
          const historyEntry: MaterialHistory = {
            date: new Date().toISOString(),
            qtyDilayani: qtyAmbil,
            normalisasi: normalizationUsed,
            materialDescription: materialDescriptionUsed,
            status,
          };

          // Update history material
          const currentHistory = materialHistory[material.materialDescription] || [];
          setMaterialHistory((prev) => ({
            ...prev,
            [material.materialDescription]: [...currentHistory, historyEntry],
          }));

          console.log(`Updating material: ${material.materialDescription}, qtyAmbil: ${qtyAmbil}, qtyDilayani: ${qtyDilayani}`);

          // Return material yang sudah diupdate
          return {
            ...material,
            qtyDilayani,
            status,
            normalisasi: material.normalisasi, // Tetap simpan normalisasi lama
            materialDescription: material.materialDescription, // Tetap simpan deskripsi lama
            newNormalization: normalizationUsed,
            newMaterialDescription: materialDescriptionUsed,
            history: [...(material.history || []), historyEntry],
          };
        } else {
          return material;
        }
      });

      // Cek apakah semua material sudah dilayani sepenuhnya
      const isFullyServed = updatedMaterials.every(
        (m: Material) => (m.qtyDilayani || 0) >= (m.qtyPermintaan || 0)
      );

      // Buat objek reservasi yang diupdate
      const updatedReservasi: Reservasi = {
        ...selectedReservasi!,
        materials: updatedMaterials,
        status: isFullyServed ? 'Dilayani' : 'Proses',
      };

      // Update state reservasi list
      setReservasiList((prev: Reservasi[]) =>
        prev.map((res) => (res.id === selectedReservasi?.id ? updatedReservasi : res))
      );

      // Simpan tanggal dilayani
      const currentDate = new Date().toISOString();
      
      // Tampilkan pesan sukses
      message.success('Reservasi berhasil diperbarui');
      
      // Set status submitted dan refresh tampilan detail tanpa menutup modal
      setIsSubmitted(true);
      
      // Update form dengan tanggal dilayani
      form.setFieldsValue({
        tanggalDilayani: dayjs(currentDate).format('DD/MM/YYYY HH:mm')
      });
      
      handleService(updatedReservasi);
    } catch (error) {
      logger.error('Error updating reservasi:', error);
      message.error('Gagal memperbarui reservasi: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleContinue = (record: Reservasi) => {
    setSelectedReservasi(record);
    setModalVisible(true);
    const materialsWithSelection = record.materials.map((material) => ({
      ...material,
      selected: false,
      kategori: material.kategori || 'Umum',
      valuationType: material.valuationType || '',
      fungsi: material.fungsi || '',
      useSameNormalization: true,
    }));
    form.setFieldsValue({
      nomorReservasi: record.nomorReservasi,
      nomorKontrak: record.nomorKontrak,
      fungsi: record.fungsi,
      pelaksana: record.pelaksana,
      deskripsiPekerjaan: record.deskripsiPekerjaan,
      materials: materialsWithSelection,
    });
    
    // Cek apakah ada material dengan status Complete
    const hasCompleteMaterials = record.materials.some(material => {
      const qtyDilayani = material.qtyDilayani || 0;
      return qtyDilayani === material.qtyPermintaan;
    });
    
    // Tampilkan notifikasi jika ada material dengan status Complete
    if (hasCompleteMaterials) {
      setTimeout(() => {
        message.warning({
          content: (
            <div>
              <p><strong>Perhatian:</strong> Beberapa material memiliki status Complete.</p>
              <p>Anda harus membatalkan status Complete terlebih dahulu untuk dapat mengedit material tersebut.</p>
              <p>Klik pada checkbox material untuk melihat opsi pembatalan.</p>
            </div>
          ),
          duration: 8,
          style: {
            marginTop: '20px',
            backgroundColor: '#fffbe6',
            border: '1px solid #ffe58f',
            padding: '10px'
          }
        });
      }, 500);
    }
  };

  const handleTabChange = (tab: 'reservasi' | 'detail') => {
    setActiveTab(tab);
    if (tab === 'reservasi') {
      setSelectedReservasi(null);
      form.resetFields();
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const renderExpandedRow = (record: FormListFieldData) => {
    const material = form.getFieldValue(['materials', record.name]);
    const history = materialHistory[material.materialDescription] || [];

    if (history.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
          <p>Belum ada riwayat layanan untuk material ini</p>
        </div>
      );
    }

    return (
      <div style={{ padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
        <h4 style={{ marginBottom: '16px', color: '#1890ff' }}>Riwayat Layanan Material</h4>
        <Table
          dataSource={history}
          pagination={false}
          rowKey={(record, index) => `${record.date}-${index}`}
          size="small"
          bordered
          columns={[
            {
              title: 'Tanggal',
              dataIndex: 'date',
              key: 'date',
              render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
            },
            {
              title: 'Qty Dilayani',
              dataIndex: 'qtyDilayani',
              key: 'qtyDilayani',
              align: 'center',
            },
            {
              title: 'Normalisasi',
              dataIndex: 'normalisasi',
              key: 'normalisasi',
            },
            {
              title: 'Deskripsi Material',
              dataIndex: 'materialDescription',
              key: 'materialDescription',
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              align: 'center',
              render: (status: string | undefined) => <Tag color={statusColor(status)}>{status || ''}</Tag>,
            },
          ]}
        />
      </div>
    );
  };

  const statusColor = (status: string | undefined): string => {
    if (!status) return 'default';
    if (status === 'Complete' || status === 'Dilayani') return 'green';
    if (status === 'Proses') return 'orange';
    if (status === 'Belum Dilayani' || status === 'Pending') return 'red';
    return 'default';
  };

  const columns: ColumnType<Reservasi>[] = [
    {
      title: 'Nomor Reservasi',
      dataIndex: 'nomorReservasi',
      key: 'nomorReservasi',
      width: 250,
      onCell: () => ({
        style: {
          whiteSpace: 'normal',
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          maxHeight: '60px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        },
      }),
      render: (text: string, record: Reservasi) => (
        <Tooltip title={text} placement="topLeft" overlayStyle={{ maxWidth: '400px' }}>
          <Button type="link" onClick={() => handleService(record)} style={{ padding: 0, textAlign: 'left' }}>
            {text}
          </Button>
        </Tooltip>
      ),
    },
    {
      title: 'Nomor Kontrak',
      dataIndex: 'nomorKontrak',
      key: 'nomorKontrak',
      width: 250,
      onCell: () => ({
        style: {
          whiteSpace: 'normal',
          wordWrap: 'break-word',
          wordBreak: 'break-word',
          maxHeight: '60px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        },
      }),
      render: (text: string) => (
        <Tooltip title={text} placement="topLeft" overlayStyle={{ maxWidth: '400px' }}>
          <span className={styles.ellipsisText}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Tanggal',
      dataIndex: 'tanggal',
      key: 'tanggal',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string | undefined) => <Tag color={statusColor(status)}>{status || ''}</Tag>,
      filters: [
        { text: 'Complete', value: 'Complete' },
        { text: 'Proses', value: 'Proses' },
        { text: 'Belum Dilayani', value: 'Belum Dilayani' },
        { text: 'Dilayani', value: 'Dilayani' },
        { text: 'Pending', value: 'Pending' },
      ],
      onFilter: (value: any, record: Reservasi) => record.status === value,
    },
    {
      title: 'Pelaksana',
      dataIndex: 'pelaksana',
      key: 'pelaksana',
      width: 150,
      sorter: (a: Reservasi, b: Reservasi) => a.pelaksana.localeCompare(b.pelaksana),
    },
    {
      title: 'Aksi',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_: any, record: Reservasi) => (
        <Button onClick={() => handleContinue(record)} type="primary">
          {record.status === 'Pending' ? 'Layani' : 'Lanjutkan'}
        </Button>
      ),
    },
  ];

  return (
    <Card title="Mutasi Keluar" className={styles.container}>
      <div className={styles.tabNavigation}>
        <Button
          className={`${styles.tabButton} ${activeTab === 'reservasi' ? styles.active : ''}`}
          onClick={() => handleTabChange('reservasi')}
        >
          Daftar Reservasi
        </Button>
        <Button
          className={`${styles.tabButton} ${activeTab === 'detail' ? styles.active : ''}`}
          disabled={!selectedReservasi}
          onClick={() => setActiveTab('detail')}
        >
          Detail Material
        </Button>
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'reservasi' && (
          <motion.div
            key="reservasi-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <motion.div
                className={styles.searchBarContainer}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Row gutter={16} align="middle">
                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Input
                      placeholder="Cari Nomor Reservasi, Kontrak, atau Pelaksana"
                      prefix={<SearchOutlined />}
                      value={searchQuery}
                      onChange={handleSearch}
                      className={styles.searchBar}
                      allowClear
                    />
                  </Col>
                  <Col xs={24} sm={12} md={8} lg={6}>
                    <Tooltip title="Tampilkan/Sembunyikan Filter">
                      <Button 
                        type="default" 
                        icon={<FilterOutlined />} 
                        onClick={() => setFilterVisible(!filterVisible)}
                        className={filterVisible ? styles.activeFilterButton : ''}
                      >
                        Filter
                      </Button>
                    </Tooltip>
                  </Col>
                </Row>
                
                {filterVisible && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className={styles.filterContainer}
                  >
                    <Row gutter={16} align="middle">
                      <Col xs={24} sm={12} md={8} lg={6}>
                        <Form.Item label="Rentang Tanggal" style={{ marginBottom: 8 }}>
                          <DatePicker.RangePicker 
                            value={dateRange as any}
                            onChange={handleDateRangeChange}
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8} lg={6}>
                        <Form.Item label="Fungsi" style={{ marginBottom: 8 }}>
                          <Select
                            placeholder="Pilih Fungsi"
                            value={fungsiFilter}
                            onChange={handleFungsiFilterChange}
                            style={{ width: '100%' }}
                            allowClear
                          >
                            {uniqueFungsi.map((fungsi) => (
                              <Option key={fungsi} value={fungsi}>
                                {fungsi}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8} lg={6}>
                        <Form.Item label="Item per Halaman" style={{ marginBottom: 8 }}>
                          <Select
                            value={pageSize}
                            onChange={handlePageSizeChange}
                            style={{ width: '100%' }}
                          >
                            <Option value={10}>10</Option>
                            <Option value={20}>20</Option>
                            <Option value={50}>50</Option>
                            <Option value={100}>100</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12} md={8} lg={6}>
                        <Button 
                          type="primary" 
                          icon={<ReloadOutlined />} 
                          onClick={handleResetFilters}
                          style={{ marginTop: 24 }}
                        >
                          Reset Filter
                        </Button>
                      </Col>
                    </Row>
                  </motion.div>
                )}
              </motion.div>

              <div className={styles.tableWrapper}>
                {/* Tabel kustom untuk mengatasi masalah rendering */}
                <table className={styles.customTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '20%' }}>Nomor Reservasi</th>
                      <th style={{ width: '20%' }}>Nomor Kontrak</th>
                      <th style={{ width: '10%' }}>Tanggal</th>
                      <th style={{ width: '10%' }}>Status</th>
                      <th style={{ width: '15%' }}>Pelaksana</th>
                      <th style={{ width: '15%' }}>Deskripsi Pekerjaan</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '16px' }}>
                          Loading...
                        </td>
                      </tr>
                    ) : filteredReservasi.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '16px' }}>
                          Tidak ada data
                        </td>
                      </tr>
                    ) : (
                      filteredReservasi.map((record) => (
                        <tr 
                          key={record.id}
                          className={selectedReservasi && record.id === selectedReservasi.id ? styles.highlightRow : ''}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <Button 
                              type="link" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleService(record);
                              }} 
                              style={{ padding: 0, textAlign: 'left' }}
                            >
                              <Tooltip title={record.nomorReservasi} placement="topLeft">
                                <span className={styles.ellipsisText}>{record.nomorReservasi}</span>
                              </Tooltip>
                            </Button>
                          </td>
                          <td>
                            <Tooltip title={record.nomorKontrak} placement="topLeft">
                              <span className={styles.ellipsisText}>{record.nomorKontrak}</span>
                            </Tooltip>
                          </td>
                          <td>{dayjs(record.tanggal).format('DD/MM/YYYY')}</td>
                          <td>
                            <Tag color={statusColor(record.status)}>{record.status || ''}</Tag>
                          </td>
                          <td>{record.pelaksana}</td>
                          <td>
                            <Tooltip title={record.deskripsiPekerjaan} placement="topLeft">
                              <span className={styles.ellipsisText}>{record.deskripsiPekerjaan}</span>
                            </Tooltip>
                          </td>
                          <td className={styles.actionCell}>
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleContinue(record);
                              }} 
                              type="primary"
                              style={{ 
                                width: '100%', 
                                backgroundColor: record.status === 'Complete' || record.status === 'Dilayani' ? '#52c41a' : undefined,
                                borderColor: record.status === 'Complete' || record.status === 'Dilayani' ? '#52c41a' : undefined
                              }}
                            >
                              {record.status === 'Pending' ? 'Layani' : 
                               record.status === 'Complete' || record.status === 'Dilayani' ? 'Complete' : 'Lanjutkan'}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                
                {/* Pagination */}
                <div className={styles.paginationControls}>
                  <Pagination
                    total={filteredReservasi.length}
                    pageSize={pageSize}
                    showTotal={(total, range) => `${range[0]}-${range[1]} dari ${total} item`}
                    showSizeChanger={false}
                  />
                </div>
              </div>
            </Space>
          </motion.div>
        )}

        {activeTab === 'detail' && selectedReservasi && (
          <motion.div
            key="detail-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={styles.detailContainer}
          >
            <Card>
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="nomorReservasi" label="Nomor Reservasi">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="nomorKontrak" label="Nomor Kontrak">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="deskripsiPekerjaan" label="Deskripsi Pekerjaan">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="pelaksana" label="Pelaksana">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="fungsi" label="Fungsi">
                      <Input disabled />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.List name="materials">
                  {(fields) => (
                    <>
                      <Table
                        dataSource={fields}
                        pagination={false}
                        rowKey="key"
                        style={{ marginTop: 16 }}
                        bordered
                        scroll={{ x: 1200 }}
                        expandable={{
                          expandedRowRender: renderExpandedRow,
                        }}
                      >
                        <Table.Column
                          title="Normalisasi"
                          dataIndex="normalisasi"
                          key="normalisasi"
                          width={150}
                          render={(_, field) => (
                            <Form.Item
                              name={[field.name, 'normalisasi']}
                              style={{ marginBottom: 0 }}
                            >
                              <Input disabled />
                            </Form.Item>
                          )}
                        />
                        <Table.Column
                          title="Deskripsi Material"
                          dataIndex="materialDescription"
                          key="materialDescription"
                          width={200}
                          render={(_, field) => (
                            <Form.Item
                              name={[field.name, 'materialDescription']}
                              style={{ marginBottom: 0 }}
                            >
                              <Input disabled />
                            </Form.Item>
                          )}
                        />
                        <Table.Column
                          title="QTY Permintaan"
                          dataIndex="qtyPermintaan"
                          key="qtyPermintaan"
                          width={120}
                          render={(_, field) => (
                            <Form.Item
                              name={[field.name, 'qtyPermintaan']}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber disabled style={{ width: '100%' }} />
                            </Form.Item>
                          )}
                        />
                        <Table.Column
                          title="Qty Dilayani"
                          dataIndex="qtyDilayani"
                          key="qtyDilayani"
                          width={120}
                          render={(_, field) => (
                            <Form.Item
                              name={[field.name, 'qtyDilayani']}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber disabled style={{ width: '100%' }} />
                            </Form.Item>
                          )}
                        />
                        <Table.Column
                          title="Sisa"
                          dataIndex="sisa"
                          key="sisa"
                          width={100}
                          render={(_, field) => {
                            const qtyPermintaan =
                              form.getFieldValue(['materials', field.name, 'qtyPermintaan']) || 0;
                            const qtyDilayani =
                              form.getFieldValue(['materials', field.name, 'qtyDilayani']) || 0;
                            const sisa = qtyPermintaan - qtyDilayani;
                            return <span>{sisa}</span>;
                          }}
                        />
                        <Table.Column
                          title="Status"
                          dataIndex="status"
                          key="status"
                          width={150}
                          render={(_, field) => (
                            <Form.Item
                              name={[field.name, 'status']}
                              style={{ marginBottom: 0 }}
                            >
                              <Input disabled />
                            </Form.Item>
                          )}
                        />
                      </Table>
                    </>
                  )}
                </Form.List>
              </Form>
            </Card>
          </motion.div>
        )}
      </div>

      <Modal
        title={
          <div>
            <span>Detail Reservasi</span>
            <Tooltip title="Pilih material yang akan dilayani, isi jumlah yang akan dilayani, dan klik Submit untuk menyimpan">
              <InfoCircleOutlined style={{ marginLeft: 8, color: 'white' }} />
            </Tooltip>
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={1200}
        className={styles.modernModal}
        maskClosable={true}
        keyboard={true}
        destroyOnClose={false}
        centered
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button 
              key="cancel" 
              onClick={() => setModalVisible(false)}
              icon={<CloseOutlined />}
              style={{ marginRight: 8 }}
            >
              Cancel
            </Button>
            <Button 
              key="submit" 
              type="primary" 
              onClick={handleModalOk} 
              className={styles.submitBtn}
              icon={<SaveOutlined />}
              style={{ marginRight: 8 }}
            >
              Submit
            </Button>
            <Button 
              key="sendWO" 
              type="primary" 
              onClick={handleSendWO} 
              className={styles.woBtn}
              icon={<SendOutlined />}
            >
              Kirim WO
            </Button>
          </div>
        }
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="nomorReservasi" label="Nomor Reservasi">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="nomorKontrak" label="Nomor Kontrak">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="fungsi" label="Fungsi">
                  <Input disabled />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="pelaksana" label="Pelaksana">
                  <Input disabled />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="deskripsiPekerjaan" label="Deskripsi Pekerjaan">
                  <Input.TextArea rows={3} disabled />
                </Form.Item>
              </Col>
            </Row>
            <Form.List name="materials">
              {(fields) => (
                <>
                  <Table
                    dataSource={fields}
                    pagination={false}
                    rowKey="key"
                    className={styles.modalTable}
                    bordered
                    scroll={{ x: 1500, y: 400 }}
                    expandable={{
                      expandedRowRender: renderExpandedRow,
                    }}
                    size="middle"
                  >
                    <Table.Column
                      title="Pilih"
                      dataIndex="selected"
                      key="selected"
                      width={60}
                      render={(_, field) => (
                        <Form.Item
                          shouldUpdate={(prevValues, curValues) => true}
                          noStyle
                        >
                          {({ getFieldValue, setFieldsValue }) => {
                            const material = getFieldValue(['materials', field.name]);
                            const isComplete = material?.status === 'Complete';
                            
                            return (
                              <Form.Item
                                name={[field.name, 'selected']}
                                valuePropName="checked"
                                style={{ marginBottom: 0 }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  {isComplete ? (
                                    <Button 
                                      type="link" 
                                      icon={<UndoOutlined />} 
                                      onClick={() => handleCancelCompleteMaterial(field.name, material)}
                                      style={{ padding: 0, marginRight: 8 }}
                                      title="Batalkan status Complete"
                                    />
                                  ) : null}
                                  <Checkbox 
                                    disabled={isComplete}
                                    onChange={(e) => {
                                      // Jika material berstatus Complete, tampilkan notifikasi
                                      if (isComplete) {
                                        // Tampilkan modal konfirmasi pembatalan
                                        Modal.confirm({
                                          title: 'Material Berstatus Complete',
                                          content: 'Material ini sudah berstatus Complete. Anda harus membatalkan status Complete terlebih dahulu untuk dapat mengedit material ini.',
                                          okText: 'Batalkan Status',
                                          cancelText: 'Batal',
                                          onOk: () => {
                                            handleCancelCompleteMaterial(field.name, material);
                                          }
                                        });
                                      }
                                    }}
                                  />
                                </div>
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      )}
                    />
                    <Table.Column
                      title="Valuation Type"
                      dataIndex="valuationType"
                      key="valuationType"
                      width={150}
                      render={(_, field) => (
                        <Form.Item
                          shouldUpdate={(prevValues, curValues) =>
                            prevValues.materials[field.name].selected !==
                            curValues.materials[field.name].selected
                          }
                          noStyle
                        >
                          {({ getFieldValue }) => {
                            const selected = getFieldValue(['materials', field.name, 'selected']);
                            return (
                              <Form.Item
                                name={[field.name, 'valuationType']}
                                style={{ marginBottom: 0 }}
                                rules={[
                                  { required: selected, message: 'Required' },
                                ]}
                              >
                                <Input disabled={!selected} />
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      )}
                    />
                    <Table.Column
                      title="Fungsi"
                      dataIndex="fungsi"
                      key="fungsi"
                      width={150}
                      render={(_, field) => (
                        <Form.Item
                          shouldUpdate={(prevValues, curValues) =>
                            prevValues.materials[field.name].selected !==
                            curValues.materials[field.name].selected
                          }
                          noStyle
                        >
                          {({ getFieldValue }) => {
                            const selected = getFieldValue(['materials', field.name, 'selected']);
                            return (
                              <Form.Item
                                name={[field.name, 'fungsi']}
                                style={{ marginBottom: 0 }}
                              >
                                <Input disabled={!selected} />
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      )}
                    />
                    <Table.Column
                      title="Layani dengan Normalisasi yang Sama?"
                      dataIndex="useSameNormalization"
                      key="useSameNormalization"
                      width={200}
                      render={(_, field) => (
                        <Form.Item
                          shouldUpdate={(prevValues, curValues) => {
                            const prevSelected = prevValues.materials[field.name].selected;
                            const curSelected = curValues.materials[field.name].selected;
                            return prevSelected !== curSelected;
                          }}
                          noStyle
                        >
                          {({ getFieldValue }) => {
                            const selected = getFieldValue(['materials', field.name, 'selected']);
                            return (
                              <Form.Item
                                name={[field.name, 'useSameNormalization']}
                                style={{ marginBottom: 0 }}
                                initialValue={true}
                                rules={[{ required: selected, message: 'Required' }]}
                              >
                                <Select
                                  placeholder="Pilih"
                                  disabled={!selected}
                                >
                                  <Option value={true}>Ya</Option>
                                  <Option value={false}>Tidak</Option>
                                </Select>
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      )}
                    />
                    <Table.Column
                      title="Normalisasi Lama"
                      dataIndex="normalisasi"
                      key="normalisasiLama"
                      width={150}
                      render={(_, field) => (
                        <Form.Item
                          name={[field.name, 'normalisasi']}
                          style={{ marginBottom: 0 }}
                        >
                          <Input disabled />
                        </Form.Item>
                      )}
                    />
                    <Table.Column
                      title="Deskripsi Material Lama"
                      dataIndex="materialDescription"
                      key="materialDescriptionLama"
                      width={200}
                      render={(_, field) => (
                        <Form.Item
                          name={[field.name, 'materialDescription']}
                          style={{ marginBottom: 0 }}
                        >
                          <Input disabled />
                        </Form.Item>
                      )}
                    />
                    <Table.Column
                      title="Normalisasi Baru"
                      dataIndex="newNormalization"
                      key="newNormalization"
                      width={150}
                      render={(_, field) => (
                        <Form.Item
                          shouldUpdate={(prevValues, curValues) => {
                            const prevUseSameNormalization =
                              prevValues.materials[field.name].useSameNormalization;
                            const curUseSameNormalization =
                              curValues.materials[field.name].useSameNormalization;
                            const prevSelected = prevValues.materials[field.name].selected;
                            const curSelected = curValues.materials[field.name].selected;
                            return (
                              prevUseSameNormalization !== curUseSameNormalization ||
                              prevSelected !== curSelected
                            );
                          }}
                          noStyle
                        >
                          {({ getFieldValue }) => {
                            const selected = getFieldValue(['materials', field.name, 'selected']);
                            const useSameNormalization = getFieldValue([
                              'materials',
                              field.name,
                              'useSameNormalization',
                            ]);
                            if (!selected || useSameNormalization !== false) {
                              return (
                                <Form.Item
                                  name={[field.name, 'newNormalization']}
                                  style={{ marginBottom: 0 }}
                                >
                                  <Input disabled />
                                </Form.Item>
                              );
                            }
                            return (
                              <Form.Item
                                name={[field.name, 'newNormalization']}
                                style={{ marginBottom: 0 }}
                                rules={[{ required: true, message: 'Masukkan normalisasi baru' }]}
                              >
                                <Select
                                  showSearch
                                  placeholder="Pilih Normalisasi"
                                  onChange={(value: string) => {
                                    const material = masterMaterialData.find(
                                      (item) => item.normalisasi === value
                                    );
                                    const newMaterialDescription = material
                                      ? material.materialDescription
                                      : '';
                                    form.setFieldsValue({
                                      materials: form.getFieldValue('materials').map(
                                        (item: any, index: number) =>
                                          index === field.name
                                            ? {
                                                ...item,
                                                newNormalization: value,
                                                newMaterialDescription,
                                              }
                                            : item
                                      ),
                                    });
                                  }}
                                >
                                  {masterMaterialData.map((item) => (
                                    <Option key={item.id} value={item.normalisasi}>
                                      {item.normalisasi}
                                    </Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      )}
                    />
                    <Table.Column
                      title="Deskripsi Material Baru"
                      dataIndex="newMaterialDescription"
                      key="newMaterialDescription"
                      width={200}
                      render={(_, field) => (
                        <Form.Item
                          shouldUpdate={(prevValues, curValues) => {
                            const prevNewMaterialDescription =
                              prevValues.materials[field.name].newMaterialDescription;
                            const curNewMaterialDescription =
                              curValues.materials[field.name].newMaterialDescription;
                            return prevNewMaterialDescription !== curNewMaterialDescription;
                          }}
                          noStyle
                        >
                          {({ getFieldValue }) => {
                            const newMaterialDescription = getFieldValue([
                              'materials',
                              field.name,
                              'newMaterialDescription',
                            ]);
                            return (
                              <Form.Item
                                name={[field.name, 'newMaterialDescription']}
                                style={{ marginBottom: 0 }}
                              >
                                <Input value={newMaterialDescription} disabled />
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      )}
                    />
                    <Table.Column
                      title="QTY Permintaan"
                      dataIndex="qtyPermintaan"
                      key="qtyPermintaan"
                      width={120}
                      render={(_, field) => (
                        <Form.Item
                          name={[field.name, 'qtyPermintaan']}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber disabled style={{ width: '100%' }} />
                        </Form.Item>
                      )}
                    />
                    <Table.Column
                      title="Qty Dilayani"
                      dataIndex="qtyAmbil"
                      key="qtyAmbil"
                      width={120}
                      render={(_, field) => (
                        <Form.Item
                          shouldUpdate={(prevValues, curValues) =>
                            prevValues.materials[field.name].selected !==
                            curValues.materials[field.name].selected
                          }
                          noStyle
                        >
                          {({ getFieldValue, setFieldsValue }) => {
                            const selected = getFieldValue(['materials', field.name, 'selected']);
                            const maxQty = getFieldValue(['materials', field.name, 'qtyPermintaan']) -
                                    (getFieldValue(['materials', field.name, 'qtyDilayani']) || 0);
                            
                            return (
                              <Form.Item
                                name={[field.name, 'qtyAmbil']}
                                style={{ marginBottom: 0 }}
                                rules={[
                                  { required: selected, message: 'Masukkan Qty' },
                                ]}
                                initialValue={0}
                              >
                                <InputNumber
                                  min={0}
                                  max={maxQty}
                                  style={{ width: '100%', backgroundColor: selected ? '#fff' : '#f5f5f5' }}
                                  disabled={!selected}
                                  onChange={(value) => {
                                    // Pastikan nilai tidak undefined atau null
                                    const safeValue = value === null || value === undefined ? 0 : value;
                                    
                                    // Update nilai di form
                                    const materials = form.getFieldValue('materials');
                                    if (materials && materials[field.name]) {
                                      materials[field.name].qtyAmbil = safeValue;
                                      form.setFieldsValue({ materials });
                                      
                                      // Log untuk debugging
                                      console.log(`Updated qtyAmbil for material ${field.name} to ${safeValue}`);
                                    }
                                  }}
                                  onFocus={(e) => {
                                    // Pilih semua teks saat input mendapatkan fokus
                                    e.target.select();
                                  }}
                                />
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      )}
                    />
                    <Table.Column
                      title="Sisa"
                      dataIndex="sisa"
                      key="sisa"
                      width={100}
                      render={(_, field) => {
                        const qtyPermintaan =
                          form.getFieldValue(['materials', field.name, 'qtyPermintaan']) || 0;
                        const qtyDilayani =
                          form.getFieldValue(['materials', field.name, 'qtyDilayani']) || 0;
                        const sisa = qtyPermintaan - qtyDilayani;
                        return <span>{sisa}</span>;
                      }}
                    />
                    <Table.Column
                      title="Kategori"
                      dataIndex="kategori"
                      key="kategori"
                      width={150}
                      render={(_, field) => (
                        <Form.Item
                          shouldUpdate={(prevValues, curValues) =>
                            prevValues.materials[field.name].selected !==
                            curValues.materials[field.name].selected
                          }
                          noStyle
                        >
                          {({ getFieldValue }) => {
                            const selected = getFieldValue(['materials', field.name, 'selected']);
                            return (
                              <Form.Item
                                name={[field.name, 'kategori']}
                                style={{ marginBottom: 0 }}
                              >
                                <Select disabled={!selected}>
                                  <Option value="Umum">Umum</Option>
                                  <Option value="Eksklusif">Eksklusif</Option>
                                </Select>
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      )}
                    />
                  </Table>
                </>
              )}
            </Form.List>
          </Form>
        </motion.div>
      </Modal>

      {/* Modal untuk konfirmasi pembatalan material dengan status Complete */}
      <Modal
        title="Konfirmasi Pembatalan Material"
        open={cancelCompleteModalVisible}
        onCancel={() => setCancelCompleteModalVisible(false)}
        onOk={confirmCancelCompleteMaterial}
        okText="Batalkan Material"
        cancelText="Batal"
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Radio.Group 
            value={cancelMode} 
            onChange={(e) => handleCancelModeChange(e.target.value)}
            style={{ marginBottom: 16 }}
          >
            <Radio value="all">Batalkan Semua Riwayat</Radio>
            <Radio value="selected">Batalkan Berdasarkan Historis</Radio>
          </Radio.Group>
          
          {cancelMode === 'all' ? (
            <Alert
              message="Perhatian"
              description="Semua riwayat layanan untuk material ini akan dihapus dan status akan direset menjadi 'Belum Dilayani'."
              type="warning"
              showIcon
            />
          ) : materialToCancel && (
            <>
              <Alert
                message="Pilih Riwayat yang Akan Dibatalkan"
                description="Pilih entri historis yang ingin dibatalkan. Status material akan dihitung ulang berdasarkan entri yang tersisa."
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              <Table
                dataSource={materialHistory[materialToCancel.material.materialDescription] || []}
                pagination={false}
                rowKey={(record, index) => `${record.date}-${index}`}
                size="small"
                bordered
                style={{ marginTop: 16 }}
                rowSelection={{
                  type: 'checkbox',
                  selectedRowKeys: selectedHistoryEntries,
                  onChange: (selectedRowKeys) => {
                    setSelectedHistoryEntries(selectedRowKeys as string[]);
                  }
                }}
                columns={[
                  {
                    title: 'Tanggal',
                    dataIndex: 'date',
                    key: 'date',
                    render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
                  },
                  {
                    title: 'Qty Dilayani',
                    dataIndex: 'qtyDilayani',
                    key: 'qtyDilayani',
                    align: 'center',
                  },
                  {
                    title: 'Normalisasi',
                    dataIndex: 'normalisasi',
                    key: 'normalisasi',
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    align: 'center',
                    render: (status: string | undefined) => <Tag color={statusColor(status)}>{status || ''}</Tag>,
                  },
                ]}
              />
              
              {selectedHistoryEntries.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Alert
                    message={`${selectedHistoryEntries.length} entri historis akan dibatalkan`}
                    type="warning"
                    showIcon
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </Card>
  );
};

export default MutasiKeluar;
