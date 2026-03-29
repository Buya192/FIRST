import React, { useState, useEffect } from 'react';
import { 
  Card, Tabs, Upload, Button, Table, message, Progress, Alert, 
  Space, Typography, Divider, Modal, Tag, Statistic, Row, Col,
  Tooltip, List, Collapse, Popconfirm
} from 'antd';
import { 
  UploadOutlined, DownloadOutlined,
  DatabaseOutlined, HistoryOutlined, ToolOutlined, StockOutlined,
  EyeOutlined, DeleteOutlined, LockOutlined, UnlockOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { collection, writeBatch, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import logger from '../utils/logger';
import moment from 'moment';
import * as XLSX from 'xlsx';
import styles from './UploadDataCutOff.module.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;

// Interfaces
interface StockCutOffData {
  storageLocation: string;
  storageLocationDescription: string;
  material: string;
  materialDescription: string;
  satuan: string;
  valuationType: string;
  stockNormal: number;
  stockATTBRusak: number;
  stockATTBHandal: number;
  unit: string;
  lastUpdated: string;
}

interface ReservasiCutOffData {
  nomorReservasi: string;
  tanggal: string;
  companyCode: string;
  storageLocationDescription: string;
  fungsi: string;
  pelaksana: string;
  approved: boolean;
  printed: boolean;
  materials: string; // JSON string
  nomorKontrak: string;
  deskripsiPekerjaan: string;
  pemeriksa: string;
}

interface WorkOrderCutOffData {
  nomorWO: string;
  nomorReservasi: string;
  tanggal: string;
  pelaksana: string;
  materials: string; // JSON string
  status: string;
}

interface MasterMaterialData {
  normalisasi: string;
  materialDescription: string;
  satuan: string;
  valuationDescription: string;
  hargaSatuan: number;
  kategori: string;
  jenisBarang: string;
}

interface MasterGudangData {
  companyCode: string;
  companyCodeDescription: string;
  plant: string;
  plantDescription: string;
  storageLocation: string;
  storageLocationDescription: string;
  alamat: string;
  picGudang: string;
}

interface MaterialGroupData {
  groupName: string;
  normalisasi: string;
  materialDescription: string;
  satuan: string;
  stock: number;
  active: boolean;
}

interface TransaksiMasukCutOffData {
  nomorKontrak: string;
  tanggal: string;
  jenisBarang: string;
  materialDescription: string;
  fungsi: string;
  penyedia: string;
  kontakPenyedia: string;
  noHP: string;
  qty: number;
  nilaiKontrak: number;
  nomorPO: string;
  tanggalTerima: string;
  nomorTUG3?: string;
  nomorTUG4?: string;
  status: 'Diterima' | 'Pending' | 'Selesai';
  storageLocation?: string;
  normalisasi?: string;
  satuan?: string;
}

interface UploadProgress {
  total: number;
  processed: number;
  success: number;
  errors: string[];
  isUploading: boolean;
}

interface UploadState {
  isLocked: boolean;
  lastUploadDate: string;
  dataCount: number;
  uploadedBy: string;
  collectionName: string;
}

interface DuplicateInfo {
  found: boolean;
  count: number;
  duplicates: any[];
  action: 'replace' | 'skip' | 'cancel';
}

const UploadDataCutOff: React.FC = () => {
  const [activeTab, setActiveTab] = useState('stock');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    total: 0,
    processed: 0,
    success: 0,
    errors: [],
    isUploading: false
  });
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [currentDataType, setCurrentDataType] = useState<'stock' | 'reservasi' | 'workorders' | 'masterMaterial' | 'masterGudang' | 'materialGroups' | 'transaksiMasuk'>('stock');
  
  // Upload state management
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo>({
    found: false,
    count: 0,
    duplicates: [],
    action: 'replace'
  });
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);
  const [currentData, setCurrentData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Unique keys untuk setiap collection
  const uniqueKeys = {
    stockMaterial: ['storageLocation', 'material'],
    masterMaterial: ['normalisasi'],
    masterGudang: ['storageLocation'],
    materialGroups: ['groupName'],
    daftarReservasi: ['nomorReservasi'],
    workOrders: ['nomorWO']
  };

  // Load upload states saat component mount
  useEffect(() => {
    loadUploadStates();
  }, []);

  // Fungsi untuk load upload states dari localStorage
  const loadUploadStates = () => {
    try {
      const savedStates = localStorage.getItem('uploadStates');
      if (savedStates) {
        setUploadStates(JSON.parse(savedStates));
      }
    } catch (error) {
      console.error('Error loading upload states:', error);
    }
  };

  // Fungsi untuk save upload states ke localStorage
  const saveUploadStates = (states: Record<string, UploadState>) => {
    try {
      localStorage.setItem('uploadStates', JSON.stringify(states));
      setUploadStates(states);
    } catch (error) {
      console.error('Error saving upload states:', error);
    }
  };

  // Fungsi untuk check apakah collection sudah diupload
  const isCollectionUploaded = (collectionName: string): boolean => {
    return uploadStates[collectionName]?.isLocked || false;
  };

  // Fungsi untuk get upload state
  const getUploadState = (collectionName: string): UploadState | null => {
    return uploadStates[collectionName] || null;
  };

  // Fungsi untuk detect duplicates
  const detectDuplicates = async (data: any[], collectionName: string): Promise<DuplicateInfo> => {
    try {
      const existingData = await getDocs(collection(db, collectionName));
      const existingItems = existingData.docs.map(doc => doc.data());
      
      const keys = uniqueKeys[collectionName as keyof typeof uniqueKeys] || [];
      const duplicates: any[] = [];
      
      data.forEach(newItem => {
        const isDuplicate = existingItems.some(existingItem => {
          return keys.every(key => newItem[key] === existingItem[key]);
        });
        
        if (isDuplicate) {
          duplicates.push(newItem);
        }
      });
      
      return {
        found: duplicates.length > 0,
        count: duplicates.length,
        duplicates,
        action: 'replace'
      };
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      return {
        found: false,
        count: 0,
        duplicates: [],
        action: 'replace'
      };
    }
  };

  // Fungsi untuk delete all data
  const deleteAllData = async (collectionName: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, collectionName), where('isInitialData', '==', true));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((document) => {
        batch.delete(document.ref);
      });
      
      await batch.commit();
      
      // Update upload state
      const newStates = { ...uploadStates };
      delete newStates[collectionName];
      saveUploadStates(newStates);
      
      message.success(`Berhasil menghapus ${querySnapshot.docs.length} data dari ${collectionName}`);
    } catch (error) {
      console.error('Error deleting data:', error);
      message.error('Gagal menghapus data');
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk view current data
  const viewCurrentData = async (collectionName: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, collectionName), where('isInitialData', '==', true));
      const querySnapshot = await getDocs(q);
      
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCurrentData(data);
      setShowDataModal(true);
    } catch (error) {
      console.error('Error fetching current data:', error);
      message.error('Gagal mengambil data');
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk export current data
  const exportCurrentData = async (collectionName: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, collectionName), where('isInitialData', '==', true));
      const querySnapshot = await getDocs(q);
      
      const data = querySnapshot.docs.map(doc => {
        const docData = doc.data();
        // Remove metadata fields
        const { isInitialData, migrationDate, createdAt, ...cleanData } = docData;
        return cleanData;
      });
      
      if (data.length === 0) {
        message.warning('Tidak ada data untuk diexport');
        return;
      }
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, collectionName);
      XLSX.writeFile(workbook, `current_${collectionName}_${moment().format('YYYY-MM-DD')}.xlsx`);
      
      message.success(`Data ${collectionName} berhasil diexport`);
    } catch (error) {
      console.error('Error exporting data:', error);
      message.error('Gagal export data');
    } finally {
      setLoading(false);
    }
  };

  // Template data untuk download
  const stockTemplate = [
    {
      'Storage Location': 'KPG1',
      'Storage Location Description': 'Gudang UP3 Kupang',
      'Material': 'MAT001',
      'Material Description': 'Kabel XLPE 20kV',
      'Satuan': 'METER',
      'Valuation Type': 'Standard',
      'Stock Normal': 100,
      'Stock ATTB Rusak': 5,
      'Stock ATTB Handal': 20,
      'Unit': 'UP3 Kupang',
      'Last Updated': '2025-01-01'
    },
    {
      'Storage Location': 'KPG2',
      'Storage Location Description': 'Gudang ULP Kupang',
      'Material': 'MAT002',
      'Material Description': 'Isolator Keramik',
      'Satuan': 'PCS',
      'Valuation Type': 'Standard',
      'Stock Normal': 50,
      'Stock ATTB Rusak': 2,
      'Stock ATTB Handal': 10,
      'Unit': 'ULP Kupang',
      'Last Updated': '2025-01-01'
    }
  ];

  const reservasiTemplate = [
    {
      'nomorReservasi': '085.SPM/KONKUP/PBPD/IV/2025',
      'tanggal': '45777', // Excel date format
      'companyCode': '7811',
      'storageLocationDescription': 'Gudang UP3 Kupang',
      'ketegori': 'PEMASARAN',
      'pelaksana': 'PT.TEON JAYA',
      'approved': 'TRUE',
      'printed': 'FALSE',
      'normalisasi': '3070151',
      'Material Description': 'ISOLATOR;PINPOST;PORC;24KV;;12.5kN',
      'satuan': 'BH',
      'qty permintaan': 485,
      'nomorKontrak': '044.KON/KR/018.PJ.REN/HKM/.02.01/F20030000/2025',
      'deskripsiPekerjaan': 'Konstruksi Jaringan Distribusi untuk layani Pasang Baru Daya 10.5 KVA lokasi Telkomsel desa Netemnanu Oepoli',
      'pemeriksa': 'JOSEPH M TAMBUNAN'
    },
    {
      'nomorReservasi': '085.SPM/KONKUP/PBPD/IV/2025',
      'tanggal': '45777',
      'companyCode': '7811',
      'storageLocationDescription': 'Gudang UP3 Kupang',
      'ketegori': 'PEMASARAN',
      'pelaksana': 'PT.TEON JAYA',
      'approved': 'TRUE',
      'printed': 'FALSE',
      'normalisasi': '3070155',
      'Material Description': 'ISOLATOR;SUSP;PORC;24KV;;70kN',
      'satuan': 'BH',
      'qty permintaan': 123,
      'nomorKontrak': '044.KON/KR/018.PJ.REN/HKM/.02.01/F20030000/2025',
      'deskripsiPekerjaan': 'Konstruksi Jaringan Distribusi untuk layani Pasang Baru Daya 10.5 KVA lokasi Telkomsel desa Netemnanu Oepoli',
      'pemeriksa': 'JOSEPH M TAMBUNAN'
    }
  ];

  const workOrderTemplate = [
    {
      'nomorWO': 'WO-001/2024',
      'nomorReservasi': 'RSV-001/2024',
      'tanggal': '2024-12-01',
      'pelaksana': 'Tim Teknik A',
      'materials': '[{"materialDescription":"Kabel XLPE","normalisasi":"MAT001","qtyAmbil":10}]',
      'status': 'Completed'
    }
  ];

  const masterMaterialTemplate = [
    {
      'normalisasi': '3070151',
      'materialDescription': 'ISOLATOR;PINPOST;PORC;24KV;;12.5kN',
      'satuan': 'BH',
      'valuationDescription': 'Standard Material',
      'hargaSatuan': 150000,
      'kategori': 'Electrical',
      'jenisBarang': 'Material Distribusi'
    },
    {
      'normalisasi': '3030101',
      'materialDescription': 'POLE;STEEL;20kV;CIRCL;12m;200daN;',
      'satuan': 'BTG',
      'valuationDescription': 'Standard Material',
      'hargaSatuan': 2500000,
      'kategori': 'Mechanical',
      'jenisBarang': 'Material Konstruksi'
    }
  ];

  const masterGudangTemplate = [
    {
      'companyCode': '1000',
      'companyCodeDescription': 'PLN UP3 Kupang',
      'plant': 'KPG1',
      'plantDescription': 'UP3 Kupang',
      'storageLocation': 'KPG1',
      'storageLocationDescription': 'Gudang UP3 Kupang',
      'alamat': 'Jl. Palapa No. 27 Oebobo, Kupang',
      'picGudang': 'ADRIANUS HITO'
    },
    {
      'companyCode': '1001',
      'companyCodeDescription': 'PLN ULP Kupang',
      'plant': 'KPG2',
      'plantDescription': 'ULP Kupang',
      'storageLocation': 'KPG2',
      'storageLocationDescription': 'Gudang ULP Kupang',
      'alamat': 'Jl. Veteran, Kupang',
      'picGudang': 'Admin ULP'
    }
  ];

  const materialGroupsTemplate = [
    {
      'Group Name': 'TRANSFORMATOR DISTRIBUSI',
      'Normalisasi': '1030094',
      'Material Description': 'TRF DIS;D3;20kV/400V;3P;25kVA;YZN5;OD',
      'Satuan': 'BH',
      'Active': 'TRUE'
    },
    {
      'Group Name': 'TRANSFORMATOR DISTRIBUSI',
      'Normalisasi': '1030020',
      'Material Description': 'TRF DIS;;20kV/400V;3P;50kVA;DYN5;OD',
      'Satuan': 'BH',
      'Active': 'TRUE'
    },
    {
      'Group Name': 'LBS RECLOSER',
      'Normalisasi': '3210017',
      'Material Description': 'POLE TOP SWITCH;24kV;630A;50kA;LBS 3WAYS',
      'Satuan': 'BH',
      'Active': 'TRUE'
    },
    {
      'Group Name': 'LBS RECLOSER',
      'Normalisasi': '3210020',
      'Material Description': 'POLE TOP SWITCH;24KV;630A;16KA;LBS RTU',
      'Satuan': 'BH',
      'Active': 'TRUE'
    },
    {
      'Group Name': 'CABLE POWER',
      'Normalisasi': '3110058',
      'Material Description': 'CABLE PWR;NYFGBY;4X95mm2;0.6/1kV;UG',
      'Satuan': 'MTR',
      'Active': 'TRUE'
    },
    {
      'Group Name': 'CONDUCTOR',
      'Normalisasi': '3050081',
      'Material Description': 'CONDUCTOR;AAAC;70mm2;',
      'Satuan': 'MTR',
      'Active': 'TRUE'
    }
  ];

  const transaksiMasukTemplate = [
    {
      'Nomor KR/SPBJ': '0002.PJ/LOG.00.01/F20000000/2025',
      'Tanggal': '2025-02-04',
      'Pengadaan': 'TRAFO',
      'Material Description': 'TRF DIS;D3;20kV/400V;3P;160kVA;YZN5;OD',
      'Fungsi': 'PEMASARAN',
      'Penyedia': 'PT SYMPHOS ELECTRIC',
      'Kontak Penyedia': 'HANIKE',
      'No HP': '0811-1383-123',
      'Qty': 7,
      'Rp SPB +PPJ': 574472619,
      'Nomor PO': '8000012587',
      'Tanggal Terima': '2025-03-20',
      'Nomor TUG 3': '',
      'Nomor TUG 4': ''
    },
    {
      'Nomor KR/SPBJ': '0003.PJ/LOG.00.01/F20000000/2025',
      'Tanggal': '2025-02-04',
      'Pengadaan': 'MCB',
      'Material Description': 'MCB;230/400V;1P;4A;50Hz;',
      'Fungsi': 'PEMASARAN',
      'Penyedia': 'PT MEGA CIPTA BANGSA',
      'Kontak Penyedia': 'MAULANA',
      'No HP': '0856-9391-0004',
      'Qty': 1222,
      'Rp SPB +PPJ': 51611781,
      'Nomor PO': '8000012589',
      'Tanggal Terima': '2025-03-13',
      'Nomor TUG 3': '',
      'Nomor TUG 4': ''
    }
  ];

  // Fungsi untuk download template
  const downloadTemplate = (type: 'stock' | 'reservasi' | 'workorders' | 'masterMaterial' | 'masterGudang' | 'materialGroups' | 'transaksiMasuk') => {
    let templateData;
    let fileName;

    switch (type) {
      case 'stock':
        templateData = stockTemplate;
        fileName = 'template_stock_cutoff.xlsx';
        break;
      case 'reservasi':
        templateData = reservasiTemplate;
        fileName = 'template_reservasi_cutoff.xlsx';
        break;
      case 'workorders':
        templateData = workOrderTemplate;
        fileName = 'template_workorders_cutoff.xlsx';
        break;
      case 'masterMaterial':
        templateData = masterMaterialTemplate;
        fileName = 'template_master_material.xlsx';
        break;
      case 'masterGudang':
        templateData = masterGudangTemplate;
        fileName = 'template_master_gudang.xlsx';
        break;
      case 'materialGroups':
        templateData = materialGroupsTemplate;
        fileName = 'template_material_groups.xlsx';
        break;
      case 'transaksiMasuk':
        templateData = transaksiMasukTemplate;
        fileName = 'template_transaksi_masuk.xlsx';
        break;
      default:
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Template_${type}`);
    XLSX.writeFile(workbook, fileName);
    message.success(`Template ${type} berhasil didownload`);
  };

  // Validasi data stock
  const validateStockData = (data: any[]): StockCutOffData[] => {
    return data.map((item, index) => {
      const errors: string[] = [];

      // Validasi required fields
      if (!item['Storage Location']) errors.push(`Row ${index + 1}: Storage Location is required`);
      if (!item['Material']) errors.push(`Row ${index + 1}: Material is required`);
      if (!item['Material Description']) errors.push(`Row ${index + 1}: Material Description is required`);

      // Validasi stock numbers
      const stockNormal = Number(item['Stock Normal']) || 0;
      const stockATTBRusak = Number(item['Stock ATTB Rusak']) || 0;
      const stockATTBHandal = Number(item['Stock ATTB Handal']) || 0;

      if (stockNormal < 0 || stockATTBRusak < 0 || stockATTBHandal < 0) {
        errors.push(`Row ${index + 1}: Stock values cannot be negative`);
      }

      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }

      return {
        storageLocation: item['Storage Location'],
        storageLocationDescription: item['Storage Location Description'] || '',
        material: item['Material'],
        materialDescription: item['Material Description'],
        satuan: item['Satuan'] || 'PCS',
        valuationType: item['Valuation Type'] || 'Standard',
        stockNormal,
        stockATTBRusak,
        stockATTBHandal,
        unit: item['Unit'] || 'UP3 Kupang',
        lastUpdated: item['Last Updated'] || moment().format('YYYY-MM-DD')
      };
    });
  };

  // Fungsi untuk konversi Excel date ke format YYYY-MM-DD
  const convertExcelDate = (excelDate: any): string => {
    if (typeof excelDate === 'number') {
      // Excel date serial number (days since 1900-01-01)
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return moment(date).format('YYYY-MM-DD');
    } else if (typeof excelDate === 'string') {
      // Already a string, try to parse it
      const parsed = moment(excelDate);
      return parsed.isValid() ? parsed.format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
    }
    return moment().format('YYYY-MM-DD');
  };

  // Fungsi untuk konversi data SPM ke format reservasi
  const convertSPMToReservasi = (spmData: any[]): ReservasiCutOffData[] => {
    // Group by Nomor SPM untuk menggabungkan material yang sama
    const groupedBySPM = spmData.reduce((acc, item) => {
      const nomorSPM = item['Nomor SPM'];
      if (!acc[nomorSPM]) {
        acc[nomorSPM] = {
          nomorReservasi: nomorSPM,
          tanggal: convertExcelDate(item['Tanggal Terbit SPM']),
          companyCode: '1000', // Default company code PLN
          storageLocationDescription: 'Gudang UP3 Kupang', // Default storage location
          fungsi: item['Fungsi'] || item['Ketegori'] || 'UMUM',
          pelaksana: item['Pelaksana'],
          approved: true, // SPM yang sudah ada dianggap sudah approved
          printed: false,
          nomorKontrak: item['Kontrak'],
          deskripsiPekerjaan: item['Pekerjaan'],
          pemeriksa: 'Admin Logistik', // Default pemeriksa untuk QR code
          materials: []
        };
      }
      
      // Tambahkan material ke group
      acc[nomorSPM].materials.push({
        materialDescription: item['Nama Material'],
        normalisasi: item['Normalisasi'],
        satuan: item['Satuan'],
        qtyPermintaan: Number(item['Jumlah Kebutuhan']) || 0
      });
      
      return acc;
    }, {} as Record<string, any>);

    // Convert ke array dan stringify materials
    return Object.values(groupedBySPM).map((item: any) => ({
      ...item,
      materials: JSON.stringify(item.materials)
    }));
  };

  // Validasi data reservasi
  const validateReservasiData = (data: any[]): ReservasiCutOffData[] => {
    // Cek apakah ini data SPM (berdasarkan kolom yang ada)
    const isSPMData = data.length > 0 && 
      data[0].hasOwnProperty('Nomor SPM') && 
      data[0].hasOwnProperty('Nama Material') && 
      data[0].hasOwnProperty('Normalisasi');

    if (isSPMData) {
      console.log('Detected SPM data format, converting to reservasi format...');
      return convertSPMToReservasi(data);
    }

    // Cek apakah ini format flat reservasi (berdasarkan kolom yang ada)
    const isFlatReservasiData = data.length > 0 && 
      data[0].hasOwnProperty('nomorReservasi') && 
      data[0].hasOwnProperty('normalisasi') && 
      data[0].hasOwnProperty('Material Description');

    if (isFlatReservasiData) {
      console.log('Detected flat reservasi data format, converting to grouped format...');
      return convertFlatReservasiToGrouped(data);
    }

    // Validasi format reservasi normal (dengan materials JSON)
    return data.map((item, index) => {
      const errors: string[] = [];

      if (!item['nomorReservasi']) errors.push(`Row ${index + 1}: Nomor Reservasi is required`);
      if (!item['tanggal']) errors.push(`Row ${index + 1}: Tanggal is required`);
      if (!item['pelaksana']) errors.push(`Row ${index + 1}: Pelaksana is required`);

      // Validasi JSON materials
      try {
        if (item['materials']) {
          JSON.parse(item['materials']);
        }
      } catch (e) {
        errors.push(`Row ${index + 1}: Invalid materials JSON format`);
      }

      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }

      return {
        nomorReservasi: item['nomorReservasi'],
        tanggal: item['tanggal'],
        companyCode: item['companyCode'] || '1000',
        storageLocationDescription: item['storageLocationDescription'] || '',
        fungsi: item['fungsi'] || item['ketegori'] || '',
        pelaksana: item['pelaksana'],
        approved: item['approved'] === 'TRUE' || item['approved'] === true,
        printed: item['printed'] === 'TRUE' || item['printed'] === true,
        materials: item['materials'] || '[]',
        nomorKontrak: item['nomorKontrak'] || '',
        deskripsiPekerjaan: item['deskripsiPekerjaan'] || '',
        pemeriksa: item['pemeriksa'] || ''
      };
    });
  };

  // Fungsi untuk konversi flat reservasi ke format grouped
  const convertFlatReservasiToGrouped = (flatData: any[]): ReservasiCutOffData[] => {
    // Group by nomorReservasi untuk menggabungkan material yang sama
    const groupedByReservasi = flatData.reduce((acc, item) => {
      const nomorReservasi = item['nomorReservasi'];
      if (!acc[nomorReservasi]) {
        acc[nomorReservasi] = {
          nomorReservasi: nomorReservasi,
          tanggal: convertExcelDate(item['tanggal']),
          companyCode: item['companyCode'] || '7811',
          storageLocationDescription: item['storageLocationDescription'] || 'Gudang UP3 Kupang',
          fungsi: item['ketegori'] || item['fungsi'] || 'UMUM',
          pelaksana: item['pelaksana'],
          approved: item['approved'] === 'TRUE' || item['approved'] === true,
          printed: item['printed'] === 'TRUE' || item['printed'] === true,
          nomorKontrak: item['nomorKontrak'],
          deskripsiPekerjaan: item['deskripsiPekerjaan'],
          pemeriksa: item['pemeriksa'],
          materials: []
        };
      }
      
      // Tambahkan material ke group
      acc[nomorReservasi].materials.push({
        materialDescription: item['Material Description'],
        normalisasi: item['normalisasi'],
        satuan: item['satuan'],
        qtyPermintaan: Number(item['qty permintaan']) || 0
      });
      
      return acc;
    }, {} as Record<string, any>);

    // Convert ke array dan stringify materials
    return Object.values(groupedByReservasi).map((item: any) => ({
      ...item,
      materials: JSON.stringify(item.materials)
    }));
  };

  // Fungsi untuk auto-extract material info dari description
  const extractMaterialInfo = (materialDescription: string) => {
    // Auto-detect satuan berdasarkan jenis material
    let satuan = 'PCS'; // default
    
    if (materialDescription.includes('CABLE') || materialDescription.includes('CONDUCTOR')) {
      satuan = 'MTR';
    } else if (materialDescription.includes('TRF') || materialDescription.includes('TRAFO')) {
      satuan = 'BH';
    } else if (materialDescription.includes('POLE') || materialDescription.includes('TIANG')) {
      satuan = 'BTG';
    } else if (materialDescription.includes('MCB') || materialDescription.includes('ISOLATOR')) {
      satuan = 'BH';
    }
    
    return {
      satuan,
      normalisasi: undefined as string | undefined // Akan di-set jika ditemukan di master material
    };
  };

  // Validasi data transaksi masuk dan konversi ke format MonitoringMasuk
  const validateTransaksiMasukData = (data: any[]): any[] => {
    return data.map((item, index) => {
      const errors: string[] = [];

      // Validasi required fields
      if (!item['Nomor KR/SPBJ']) errors.push(`Row ${index + 1}: Nomor KR/SPBJ is required`);
      if (!item['Material Description']) errors.push(`Row ${index + 1}: Material Description is required`);
      if (!item['Penyedia']) errors.push(`Row ${index + 1}: Penyedia is required`);

      // Validasi numerik
      const qty = Number(item['Qty']) || 0;
      const nilaiKontrak = Number(item['Rp SPB +PPJ']) || 0;

      if (qty <= 0) errors.push(`Row ${index + 1}: Qty must be greater than 0`);
      if (nilaiKontrak <= 0) errors.push(`Row ${index + 1}: Nilai kontrak must be greater than 0`);

      if (errors.length > 0) {
        throw new Error(errors.join('; '));
      }

      // Auto-extract material info
      const materialInfo = extractMaterialInfo(item['Material Description']);

      // Determine status berdasarkan tanggal terima
      let status = 'draft';
      if (item['Tanggal Terima']) {
        status = 'selesai';
      } else if (qty > 0) {
        status = 'proses';
      }

      // Determine jenis material
      const jenisMaterial = item['Pengadaan']?.toLowerCase().includes('eksklusif') ? 'eksklusif' : 'umum';

      // Convert to MonitoringMasuk format
      return {
        nomorSPBKontrak: item['Nomor KR/SPBJ'],
        tanggal: convertExcelDate(item['Tanggal']),
        normalisasiNumber: item['Normalisasi'] || '',
        namaMaterial: item['Material Description'],
        fungsi: item['Fungsi'] || 'UMUM',
        penyedia: item['Penyedia'],
        tanggalTiba: item['Tanggal Terima'] ? convertExcelDate(item['Tanggal Terima']) : convertExcelDate(item['Tanggal']),
        noPO: item['Nomor PO'] || '',
        qtyPesan: qty,
        qtyDiterima: item['Tanggal Terima'] ? qty : 0, // Jika sudah diterima, qty diterima = qty pesan
        nomorTUG3: item['Nomor TUG 3'] || '',
        nomorTUG4: item['Nomor TUG 4'] || '',
        status,
        arsipLengkap: false, // Default false, akan diupdate setelah upload arsip
        jenisMaterial,
        foto: [],
        dokumen: [],
        keterangan: `Import dari data cut off. Nilai kontrak: Rp ${nilaiKontrak.toLocaleString()}. Kontak: ${item['Kontak Penyedia'] || ''} (${item['No HP'] || ''})`,
        // Additional fields for reference
        jenisBarang: item['Pengadaan'] || 'UMUM',
        kontakPenyedia: item['Kontak Penyedia'] || '',
        noHP: item['No HP'] || '',
        nilaiKontrak,
        storageLocation: 'KPG1',
        satuan: materialInfo.satuan
      };
    });
  };

  // Fungsi upload ke Firestore
  const uploadToFirestore = async (data: any[], collectionName: string) => {
    const batch = writeBatch(db);
    let successCount = 0;
    const errors: string[] = [];

    setUploadProgress(prev => ({ ...prev, isUploading: true, total: data.length }));

    try {
      for (let i = 0; i < data.length; i++) {
        try {
          const docRef = doc(collection(db, collectionName));
          const dataWithMeta = {
            ...data[i],
            isInitialData: true,
            migrationDate: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };

          // Untuk stock material, hitung total stock
          if (collectionName === 'stockMaterial') {
            dataWithMeta.totalStock = 
              (dataWithMeta.stockNormal || 0) + 
              (dataWithMeta.stockATTBRusak || 0) + 
              (dataWithMeta.stockATTBHandal || 0);
          }

          // Untuk reservasi, parse materials jika string
          if (collectionName === 'daftarReservasi' && typeof dataWithMeta.materials === 'string') {
            try {
              dataWithMeta.materials = JSON.parse(dataWithMeta.materials);
            } catch (e) {
              dataWithMeta.materials = [];
            }
          }

          batch.set(docRef, dataWithMeta);
          successCount++;

          setUploadProgress(prev => ({ 
            ...prev, 
            processed: i + 1, 
            success: successCount 
          }));
        } catch (error) {
          const errorMsg = `Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.error(`Upload error for row ${i + 1}:`, error);
        }
      }

      await batch.commit();
      
      setUploadProgress(prev => ({ 
        ...prev, 
        isUploading: false, 
        errors 
      }));

      if (errors.length === 0) {
        message.success(`Berhasil mengupload ${successCount} data ke ${collectionName}`);
      } else {
        message.warning(`Upload selesai dengan ${errors.length} error. ${successCount} data berhasil diupload.`);
      }

    } catch (error) {
      setUploadProgress(prev => ({ 
        ...prev, 
        isUploading: false, 
        errors: [...prev.errors, `Batch commit error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }));
      logger.error('Batch upload error:', error);
      message.error('Gagal mengupload data');
    }
  };

  // Fungsi handle upload file
  const handleUpload = (file: File, dataType: 'stock' | 'reservasi' | 'workorders' | 'masterMaterial' | 'masterGudang' | 'materialGroups' | 'transaksiMasuk') => {
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          message.error('File kosong atau format tidak valid');
          return;
        }

        // Validasi data berdasarkan tipe
        let validatedData;
        let collectionName;

        switch (dataType) {
          case 'stock':
            validatedData = validateStockData(jsonData);
            collectionName = 'stockMaterial';
            break;
          case 'reservasi':
            validatedData = validateReservasiData(jsonData);
            collectionName = 'daftarReservasi';
            break;
          case 'workorders':
            validatedData = jsonData; // Implementasi validasi work orders
            collectionName = 'workOrders';
            break;
          case 'masterMaterial':
            validatedData = jsonData.map(item => ({
              normalisasi: item.normalisasi,
              materialDescription: item.materialDescription,
              satuan: item.satuan,
              valuationDescription: item.valuationDescription,
              hargaSatuan: Number(item.hargaSatuan) || 0,
              kategori: item.kategori,
              jenisBarang: item.jenisBarang
            }));
            collectionName = 'masterMaterial';
            break;
          case 'masterGudang':
            validatedData = jsonData.map(item => ({
              companyCode: item.companyCode,
              companyCodeDescription: item.companyCodeDescription,
              plant: item.plant,
              plantDescription: item.plantDescription,
              storageLocation: item.storageLocation,
              storageLocationDescription: item.storageLocationDescription,
              alamat: item.alamat,
              picGudang: item.picGudang
            }));
            collectionName = 'masterGudang';
            break;
          case 'materialGroups':
            // Convert flat material groups data to grouped structure
            const groupedMaterials = jsonData.reduce((acc, item) => {
              const groupName = item['Group Name'];
              if (!acc[groupName]) {
                acc[groupName] = {
                  groupName: groupName,
                  description: `Group untuk ${groupName}`,
                  materials: [],
                  isActive: true
                };
              }
              
              acc[groupName].materials.push({
                normalisasi: item['Normalisasi'],
                materialDescription: item['Material Description'],
                satuan: item['Satuan'],
                isActive: item['Active'] === 'TRUE' || item['Active'] === true
              });
              
              return acc;
            }, {} as Record<string, any>);
            
            validatedData = Object.values(groupedMaterials);
            collectionName = 'materialGroups';
            break;
          case 'transaksiMasuk':
            validatedData = validateTransaksiMasukData(jsonData);
            collectionName = 'transaksiMasuk';
            break;
          default:
            throw new Error('Invalid data type');
        }

        // Set preview data (show first 10 for preview, but store all data)
        setPreviewData(validatedData); // Store ALL data, not just first 10
        setCurrentDataType(dataType);
        setShowPreview(true);

        // Reset upload progress
        setUploadProgress({
          total: 0,
          processed: 0,
          success: 0,
          errors: [],
          isUploading: false
        });

      } catch (error) {
        logger.error('File processing error:', error);
        message.error(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsArrayBuffer(file);
    return false; // Prevent default upload
  };

  // Konfirmasi upload setelah preview
  const confirmUpload = async () => {
    if (previewData.length === 0) return;

    let collectionName;
    switch (currentDataType) {
      case 'stock':
        collectionName = 'stockMaterial';
        break;
      case 'reservasi':
        collectionName = 'daftarReservasi';
        break;
      case 'workorders':
        collectionName = 'workOrders';
        break;
      case 'masterMaterial':
        collectionName = 'masterMaterial';
        break;
      case 'masterGudang':
        collectionName = 'masterGudang';
        break;
      case 'materialGroups':
        collectionName = 'materialGroups';
        break;
      case 'transaksiMasuk':
        collectionName = 'transaksiMasuk';
        break;
      default:
        return;
    }

    // Upload data
    await uploadToFirestore(previewData, collectionName);
    
    // Update upload state setelah upload berhasil
    if (uploadProgress.success > 0) {
      const newUploadState: UploadState = {
        isLocked: true,
        lastUploadDate: new Date().toISOString(),
        dataCount: uploadProgress.success,
        uploadedBy: 'Admin', // Bisa diganti dengan user yang login
        collectionName: collectionName
      };
      
      const newStates = {
        ...uploadStates,
        [collectionName]: newUploadState
      };
      
      saveUploadStates(newStates);
    }
    
    setShowPreview(false);
  };

  // Render preview table berdasarkan tipe data
  const renderPreviewTable = () => {
    if (previewData.length === 0) return null;

    let columns: any[] = [];
    switch (currentDataType) {
      case 'stock':
        columns = [
          { title: 'Storage Location', dataIndex: 'storageLocation', key: 'storageLocation' },
          { title: 'Material', dataIndex: 'material', key: 'material' },
          { title: 'Material Description', dataIndex: 'materialDescription', key: 'materialDescription' },
          { title: 'Stock Normal', dataIndex: 'stockNormal', key: 'stockNormal' },
          { title: 'Stock ATTB Rusak', dataIndex: 'stockATTBRusak', key: 'stockATTBRusak' },
          { title: 'Stock ATTB Handal', dataIndex: 'stockATTBHandal', key: 'stockATTBHandal' },
          { title: 'Unit', dataIndex: 'unit', key: 'unit' }
        ];
        break;
      case 'reservasi':
        columns = [
          { title: 'Nomor Reservasi', dataIndex: 'nomorReservasi', key: 'nomorReservasi' },
          { title: 'Tanggal', dataIndex: 'tanggal', key: 'tanggal' },
          { title: 'Pelaksana', dataIndex: 'pelaksana', key: 'pelaksana' },
          { title: 'Fungsi', dataIndex: 'fungsi', key: 'fungsi' },
          { 
            title: 'Approved', 
            dataIndex: 'approved', 
            key: 'approved',
            render: (approved: boolean) => (
              <Tag color={approved ? 'green' : 'orange'}>
                {approved ? 'Yes' : 'No'}
              </Tag>
            )
          }
        ];
        break;
      case 'workorders':
        columns = [
          { title: 'Nomor WO', dataIndex: 'nomorWO', key: 'nomorWO' },
          { title: 'Nomor Reservasi', dataIndex: 'nomorReservasi', key: 'nomorReservasi' },
          { title: 'Tanggal', dataIndex: 'tanggal', key: 'tanggal' },
          { title: 'Pelaksana', dataIndex: 'pelaksana', key: 'pelaksana' },
          { title: 'Status', dataIndex: 'status', key: 'status' }
        ];
        break;
      case 'masterMaterial':
        columns = [
          { title: 'Normalisasi', dataIndex: 'normalisasi', key: 'normalisasi' },
          { title: 'Material Description', dataIndex: 'materialDescription', key: 'materialDescription' },
          { title: 'Satuan', dataIndex: 'satuan', key: 'satuan' },
          { title: 'Harga Satuan', dataIndex: 'hargaSatuan', key: 'hargaSatuan', render: (value: number) => `Rp ${value.toLocaleString()}` },
          { title: 'Kategori', dataIndex: 'kategori', key: 'kategori' },
          { title: 'Jenis Barang', dataIndex: 'jenisBarang', key: 'jenisBarang' }
        ];
        break;
      case 'masterGudang':
        columns = [
          { title: 'Company Code', dataIndex: 'companyCode', key: 'companyCode' },
          { title: 'Plant', dataIndex: 'plant', key: 'plant' },
          { title: 'Storage Location', dataIndex: 'storageLocation', key: 'storageLocation' },
          { title: 'Storage Description', dataIndex: 'storageLocationDescription', key: 'storageLocationDescription' },
          { title: 'PIC Gudang', dataIndex: 'picGudang', key: 'picGudang' }
        ];
        break;
      case 'materialGroups':
        columns = [
          { title: 'Group Name', dataIndex: 'groupName', key: 'groupName' },
          { title: 'Description', dataIndex: 'description', key: 'description' },
          { 
            title: 'Materials Count', 
            dataIndex: 'materials', 
            key: 'materialsCount',
            render: (materials: any[]) => materials ? materials.length : 0
          },
          { 
            title: 'Active', 
            dataIndex: 'isActive', 
            key: 'isActive',
            render: (isActive: boolean) => (
              <Tag color={isActive ? 'green' : 'red'}>
                {isActive ? 'Active' : 'Inactive'}
              </Tag>
            )
          }
        ];
        break;
      case 'transaksiMasuk':
        columns = [
          { title: 'Nomor Kontrak', dataIndex: 'nomorKontrak', key: 'nomorKontrak' },
          { title: 'Tanggal', dataIndex: 'tanggal', key: 'tanggal' },
          { title: 'Jenis Barang', dataIndex: 'jenisBarang', key: 'jenisBarang' },
          { title: 'Material Description', dataIndex: 'materialDescription', key: 'materialDescription' },
          { title: 'Penyedia', dataIndex: 'penyedia', key: 'penyedia' },
          { title: 'Qty', dataIndex: 'qty', key: 'qty' },
          { title: 'Nilai Kontrak', dataIndex: 'nilaiKontrak', key: 'nilaiKontrak', render: (value: number) => `Rp ${value.toLocaleString()}` },
          { 
            title: 'Status', 
            dataIndex: 'status', 
            key: 'status',
            render: (status: string) => (
              <Tag color={status === 'Diterima' ? 'green' : status === 'Pending' ? 'orange' : 'blue'}>
                {status}
              </Tag>
            )
          }
        ];
        break;
      default:
        columns = [];
    }

    return (
      <Table
        dataSource={previewData.slice(0, 10)} // Only show first 10 for preview
        columns={columns}
        rowKey={(record, index) => index?.toString() || '0'}
        pagination={false}
        scroll={{ x: true }}
        size="small"
      />
    );
  };

  // Render upload status card
  const renderUploadStatusCard = (collectionName: string, title: string) => {
    const uploadState = getUploadState(collectionName);
    const isUploaded = isCollectionUploaded(collectionName);

    return (
      <Card 
        size="small" 
        style={{ 
          backgroundColor: isUploaded ? '#f6ffed' : '#fff7e6', 
          border: `1px solid ${isUploaded ? '#b7eb8f' : '#ffd591'}`,
          marginBottom: 16
        }}
      >
        <Row gutter={16} align="middle">
          <Col span={12}>
            <Space direction="vertical" size="small">
              <Text strong>{title}</Text>
              {isUploaded ? (
                <Space>
                  <Tag color="green" icon={<LockOutlined />}>Uploaded</Tag>
                  <Text type="secondary">
                    {uploadState?.dataCount} records
                  </Text>
                </Space>
              ) : (
                <Tag color="orange" icon={<UnlockOutlined />}>Ready to Upload</Tag>
              )}
              {uploadState?.lastUploadDate && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Last upload: {moment(uploadState.lastUploadDate).format('DD/MM/YYYY HH:mm')}
                </Text>
              )}
            </Space>
          </Col>
          <Col span={12}>
            {isUploaded ? (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Space wrap>
                  <Tooltip title="Lihat data yang sudah diupload">
                    <Button 
                      size="small" 
                      icon={<EyeOutlined />}
                      onClick={() => viewCurrentData(collectionName)}
                      loading={loading}
                    >
                      View
                    </Button>
                  </Tooltip>
                  <Tooltip title="Export data ke Excel">
                    <Button 
                      size="small" 
                      icon={<DownloadOutlined />}
                      onClick={() => exportCurrentData(collectionName)}
                      loading={loading}
                    >
                      Export
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="Hapus semua data?"
                    description="Tindakan ini akan menghapus semua data yang sudah diupload. Apakah Anda yakin?"
                    onConfirm={() => deleteAllData(collectionName)}
                    okText="Ya, Hapus"
                    cancelText="Batal"
                    okButtonProps={{ danger: true }}
                  >
                    <Button 
                      size="small" 
                      danger 
                      icon={<DeleteOutlined />}
                      loading={loading}
                    >
                      Delete All
                    </Button>
                  </Popconfirm>
                </Space>
              </Space>
            ) : (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Belum ada data yang diupload
              </Text>
            )}
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <DatabaseOutlined style={{ marginRight: 8 }} />
        Upload Data Cut Off
      </Title>
      
      <Paragraph>
        Fitur ini digunakan untuk migrasi data existing (sebelum menggunakan aplikasi) ke dalam sistem baru.
        Silakan pilih jenis data yang akan diupload dan download template terlebih dahulu.
      </Paragraph>

      {/* Upload Status Overview */}
      <Card title="Upload Status Overview" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            {renderUploadStatusCard('stockMaterial', 'Stock Material')}
            {renderUploadStatusCard('daftarReservasi', 'Reservasi Historical')}
            {renderUploadStatusCard('workOrders', 'Work Orders Historical')}
          </Col>
          <Col xs={24} md={12}>
            {renderUploadStatusCard('masterMaterial', 'Master Material')}
            {renderUploadStatusCard('masterGudang', 'Master Gudang')}
            {renderUploadStatusCard('materialGroups', 'Material Groups')}
          </Col>
        </Row>
      </Card>

      <Divider />

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane 
          tab={
            <span>
              <StockOutlined />
              Stock Material
            </span>
          } 
          key="stock"
        >
          <Card>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
                  <Statistic
                    title="Stock Material Cut Off"
                    value="3 Jenis Stock"
                    prefix={<StockOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <Text type="secondary">Normal, ATTB Rusak, ATTB Handal</Text>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />}
                    onClick={() => downloadTemplate('stock')}
                    block
                  >
                    Download Template Stock
                  </Button>
                  <Upload
                    beforeUpload={(file) => handleUpload(file, 'stock')}
                    showUploadList={false}
                    accept=".xlsx,.xls,.csv"
                  >
                    <Button icon={<UploadOutlined />} block>
                      Upload Stock Data
                    </Button>
                  </Upload>
                </Space>
              </Col>
            </Row>

            <Divider />

            <Collapse ghost>
              <Panel header="Format Data Stock Material" key="1">
                <List
                  size="small"
                  dataSource={[
                    'Storage Location: Kode lokasi penyimpanan (contoh: KPG1)',
                    'Storage Location Description: Deskripsi lokasi (contoh: Gudang UP3 Kupang)',
                    'Material: Kode material (contoh: MAT001)',
                    'Material Description: Deskripsi material (contoh: Kabel XLPE 20kV)',
                    'Stock Normal: Jumlah stock dalam kondisi normal/baik',
                    'Stock ATTB Rusak: Jumlah stock yang rusak',
                    'Stock ATTB Handal: Jumlah stock cadangan berkualitas tinggi',
                    'Unit: Unit organisasi (contoh: UP3 Kupang, ULP Kupang)'
                  ]}
                  renderItem={item => <List.Item>{item}</List.Item>}
                />
              </Panel>
            </Collapse>
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <HistoryOutlined />
              Reservasi Historical
            </span>
          } 
          key="reservasi"
        >
          <Card>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" style={{ backgroundColor: '#fff7e6', border: '1px solid #ffd591' }}>
                  <Statistic
                    title="Reservasi Historical"
                    value="Data Lama"
                    prefix={<HistoryOutlined />}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                  <Text type="secondary">Reservasi sebelum menggunakan aplikasi</Text>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />}
                    onClick={() => downloadTemplate('reservasi')}
                    block
                  >
                    Download Template Reservasi
                  </Button>
                  <Upload
                    beforeUpload={(file) => handleUpload(file, 'reservasi')}
                    showUploadList={false}
                    accept=".xlsx,.xls,.csv"
                  >
                    <Button icon={<UploadOutlined />} block>
                      Upload Reservasi Data
                    </Button>
                  </Upload>
                </Space>
              </Col>
            </Row>

            <Divider />

            <Alert
              message="Format Materials"
              description="Field 'materials' harus dalam format JSON array. Contoh: [{'materialDescription':'Kabel XLPE','normalisasi':'MAT001','satuan':'METER','qtyPermintaan':10}]"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Alert
              message="Auto-Detect Format SPM"
              description={
                <div>
                  <p><strong>Sistem dapat mendeteksi dan mengkonversi format SPM secara otomatis!</strong></p>
                  <p>Jika Anda mengupload file Excel dengan format SPM (kolom: Nomor SPM, Nama Material, Normalisasi, dll), 
                     sistem akan otomatis mengkonversi ke format reservasi dengan menggabungkan material berdasarkan Nomor SPM.</p>
                  <p><strong>Format SPM yang didukung:</strong></p>
                  <ul style={{ marginLeft: 20, marginTop: 8 }}>
                    <li>Nomor SPM</li>
                    <li>Tanggal Terbit SPM (Excel date atau string)</li>
                    <li>Kontrak</li>
                    <li>Pekerjaan</li>
                    <li>Ketegori/Fungsi</li>
                    <li>Normalisasi</li>
                    <li>Nama Material</li>
                    <li>Jumlah Kebutuhan</li>
                    <li>Satuan</li>
                    <li>Pelaksana</li>
                  </ul>
                </div>
              }
              type="success"
              showIcon
            />
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <ToolOutlined />
              Work Orders Historical
            </span>
          } 
          key="workorders"
        >
          <Card>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" style={{ backgroundColor: '#f0f5ff', border: '1px solid #adc6ff' }}>
                  <Statistic
                    title="Work Orders Historical"
                    value="WO Lama"
                    prefix={<ToolOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <Text type="secondary">Work Orders yang sudah selesai</Text>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />}
                    onClick={() => downloadTemplate('workorders')}
                    block
                  >
                    Download Template Work Orders
                  </Button>
                  <Upload
                    beforeUpload={(file) => handleUpload(file, 'workorders')}
                    showUploadList={false}
                    accept=".xlsx,.xls,.csv"
                  >
                    <Button icon={<UploadOutlined />} block>
                      Upload Work Orders Data
                    </Button>
                  </Upload>
                </Space>
              </Col>
            </Row>
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <DatabaseOutlined />
              Master Material
            </span>
          } 
          key="masterMaterial"
        >
          <Card>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" style={{ backgroundColor: '#f9f0ff', border: '1px solid #d3adf7' }}>
                  <Statistic
                    title="Master Material"
                    value="Data Master"
                    prefix={<DatabaseOutlined />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                  <Text type="secondary">Normalisasi, Harga, Kategori Material</Text>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />}
                    onClick={() => downloadTemplate('masterMaterial')}
                    block
                  >
                    Download Template Master Material
                  </Button>
                  <Upload
                    beforeUpload={(file) => handleUpload(file, 'masterMaterial')}
                    showUploadList={false}
                    accept=".xlsx,.xls,.csv"
                  >
                    <Button icon={<UploadOutlined />} block>
                      Upload Master Material
                    </Button>
                  </Upload>
                </Space>
              </Col>
            </Row>

            <Divider />

            <Collapse ghost>
              <Panel header="Format Data Master Material" key="1">
                <List
                  size="small"
                  dataSource={[
                    'normalisasi: Kode normalisasi PLN (contoh: 3070151)',
                    'materialDescription: Deskripsi lengkap material',
                    'satuan: Unit material (BH, MTR, BTG, dll)',
                    'valuationDescription: Deskripsi valuasi (Standard Material)',
                    'hargaSatuan: Harga per satuan dalam Rupiah',
                    'kategori: Kategori material (Electrical, Mechanical, dll)',
                    'jenisBarang: Jenis barang (Material Distribusi, Konstruksi, dll)'
                  ]}
                  renderItem={item => <List.Item>{item}</List.Item>}
                />
              </Panel>
            </Collapse>
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <StockOutlined />
              Master Gudang
            </span>
          } 
          key="masterGudang"
        >
          <Card>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" style={{ backgroundColor: '#fff2e8', border: '1px solid #ffbb96' }}>
                  <Statistic
                    title="Master Gudang"
                    value="Storage Location"
                    prefix={<StockOutlined />}
                    valueStyle={{ color: '#fa541c' }}
                  />
                  <Text type="secondary">Company Code, Plant, Storage Location</Text>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />}
                    onClick={() => downloadTemplate('masterGudang')}
                    block
                  >
                    Download Template Master Gudang
                  </Button>
                  <Upload
                    beforeUpload={(file) => handleUpload(file, 'masterGudang')}
                    showUploadList={false}
                    accept=".xlsx,.xls,.csv"
                  >
                    <Button icon={<UploadOutlined />} block>
                      Upload Master Gudang
                    </Button>
                  </Upload>
                </Space>
              </Col>
            </Row>

            <Divider />

            <Collapse ghost>
              <Panel header="Format Data Master Gudang" key="1">
                <List
                  size="small"
                  dataSource={[
                    'companyCode: Kode perusahaan (contoh: 1000)',
                    'companyCodeDescription: Deskripsi perusahaan (PLN UP3 Kupang)',
                    'plant: Kode plant (contoh: KPG1)',
                    'plantDescription: Deskripsi plant (UP3 Kupang)',
                    'storageLocation: Kode lokasi penyimpanan (KPG1, KPG2)',
                    'storageLocationDescription: Deskripsi gudang',
                    'alamat: Alamat lengkap gudang',
                    'picGudang: Penanggung jawab gudang'
                  ]}
                  renderItem={item => <List.Item>{item}</List.Item>}
                />
              </Panel>
            </Collapse>
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <DatabaseOutlined />
              Material Groups
            </span>
          } 
          key="materialGroups"
        >
          <Card>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
                  <Statistic
                    title="Material Groups"
                    value="Group Management"
                    prefix={<DatabaseOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <Text type="secondary">Grouping material untuk kemudahan pemilihan</Text>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />}
                    onClick={() => downloadTemplate('materialGroups')}
                    block
                  >
                    Download Template Material Groups
                  </Button>
                  <Upload
                    beforeUpload={(file) => handleUpload(file, 'materialGroups')}
                    showUploadList={false}
                    accept=".xlsx,.xls,.csv"
                  >
                    <Button icon={<UploadOutlined />} block>
                      Upload Material Groups
                    </Button>
                  </Upload>
                </Space>
              </Col>
            </Row>

            <Divider />

            <Alert
              message="Material Groups untuk Reservasi"
              description={
                <div>
                  <p><strong>Fitur ini memungkinkan grouping material untuk memudahkan pemilihan di form reservasi.</strong></p>
                  <p>Setelah upload, user dapat menggunakan fitur "Lihat Material" di form reservasi untuk memilih material berdasarkan group.</p>
                  <p><strong>Format yang didukung:</strong></p>
                  <ul style={{ marginLeft: 20, marginTop: 8 }}>
                    <li>Group Name: Nama group (TRANSFORMATOR DISTRIBUSI, LBS RECLOSER, dll)</li>
                    <li>Normalisasi: Kode material PLN</li>
                    <li>Material Description: Deskripsi lengkap material</li>
                    <li>Satuan: Unit material (BH, MTR, BTG, dll)</li>
                    <li>Stock: Stock awal (default 0)</li>
                    <li>Active: Status aktif (TRUE/FALSE)</li>
                  </ul>
                </div>
              }
              type="success"
              showIcon
            />

            <Collapse ghost>
              <Panel header="Contoh Groups yang Tersedia" key="1">
                <List
                  size="small"
                  dataSource={[
                    'TRANSFORMATOR DISTRIBUSI - Transformator berbagai kapasitas',
                    'LBS RECLOSER - Load Break Switch dan Recloser',
                    'CABLE POWER - Kabel power berbagai jenis',
                    'CONDUCTOR - Konduktor AAAC, ACSR, dll',
                    'ISOLATOR TUMPU - Isolator pin post',
                    'ISOLATOR TARIK - Isolator suspension',
                    'LIGHTNING ARRESTER - Penangkal petir',
                    'FUSE CUT OUT - Fuse dan cut out',
                    'Dan group lainnya sesuai kebutuhan...'
                  ]}
                  renderItem={item => <List.Item>{item}</List.Item>}
                />
              </Panel>
            </Collapse>
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <span>
              <InboxOutlined />
              Transaksi Masuk Historical
            </span>
          } 
          key="transaksiMasuk"
        >
          <Card>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card size="small" style={{ backgroundColor: '#f0f5ff', border: '1px solid #adc6ff' }}>
                  <Statistic
                    title="Transaksi Masuk Historical"
                    value="Data Pengadaan"
                    prefix={<InboxOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                  <Text type="secondary">Data transaksi masuk material dari supplier</Text>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />}
                    onClick={() => downloadTemplate('transaksiMasuk')}
                    block
                  >
                    Download Template Transaksi Masuk
                  </Button>
                  <Upload
                    beforeUpload={(file) => handleUpload(file, 'transaksiMasuk')}
                    showUploadList={false}
                    accept=".xlsx,.xls,.csv"
                  >
                    <Button icon={<UploadOutlined />} block>
                      Upload Transaksi Masuk Data
                    </Button>
                  </Upload>
                </Space>
              </Col>
            </Row>

            <Divider />

            <Alert
              message="Format Transaksi Masuk Material"
              description={
                <div>
                  <p><strong>Fitur ini untuk migrasi data transaksi masuk material dari supplier.</strong></p>
                  <p>Data ini akan terintegrasi dengan MonitoringMasuk.tsx untuk tracking pengadaan material.</p>
                  <p><strong>Format yang didukung:</strong></p>
                  <ul style={{ marginLeft: 20, marginTop: 8 }}>
                    <li>Nomor KR/SPBJ: Nomor kontrak/SPB</li>
                    <li>Tanggal: Tanggal transaksi</li>
                    <li>Pengadaan: Jenis material (TRAFO, MCB, CONDUCTOR, dll)</li>
                    <li>Material Description: Spesifikasi detail material</li>
                    <li>Fungsi: PEMASARAN/KEHANDALAN</li>
                    <li>Penyedia: Nama supplier</li>
                    <li>Kontak Penyedia: Nama contact person</li>
                    <li>No HP: Nomor telepon</li>
                    <li>Qty: Jumlah material</li>
                    <li>Rp SPB +PPJ: Nilai kontrak</li>
                    <li>Nomor PO: Nomor Purchase Order</li>
                    <li>Tanggal Terima: Tanggal penerimaan material</li>
                    <li>Nomor TUG 3: Nomor dokumen TUG 3</li>
                    <li>Nomor TUG 4: Nomor dokumen TUG 4</li>
                  </ul>
                </div>
              }
              type="info"
              showIcon
            />

            <Collapse ghost>
              <Panel header="Auto-Detection Features" key="1">
                <List
                  size="small"
                  dataSource={[
                    'Auto-detect satuan berdasarkan jenis material (CABLE/CONDUCTOR → MTR, TRAFO → BH, dll)',
                    'Auto-mapping jenis material ke kategori standar',
                    'Status otomatis berdasarkan tanggal terima (Diterima/Pending)',
                    'Normalisasi material akan di-link dengan master material jika tersedia',
                    'Validasi data per row dengan error reporting yang detail',
                    'Support Excel date format dan string date format'
                  ]}
                  renderItem={item => <List.Item>{item}</List.Item>}
                />
              </Panel>
            </Collapse>
          </Card>
        </TabPane>
      </Tabs>

      {/* Upload Progress */}
      {uploadProgress.isUploading && (
        <Card style={{ marginTop: 16 }}>
          <Title level={4}>Upload Progress</Title>
          <Progress 
            percent={Math.round((uploadProgress.processed / uploadProgress.total) * 100)}
            status={uploadProgress.isUploading ? 'active' : 'success'}
          />
          <Text>
            {uploadProgress.processed} / {uploadProgress.total} processed
            {uploadProgress.success > 0 && ` (${uploadProgress.success} successful)`}
          </Text>
        </Card>
      )}

      {/* Upload Errors */}
      {uploadProgress.errors.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <Title level={4}>Upload Errors</Title>
          <List
            size="small"
            dataSource={uploadProgress.errors}
            renderItem={error => (
              <List.Item>
                <Text type="danger">{error}</Text>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Preview Modal */}
      <Modal
        title={`Preview Data ${currentDataType.toUpperCase()}`}
        visible={showPreview}
        onOk={confirmUpload}
        onCancel={() => setShowPreview(false)}
        width={1000}
        okText="Confirm Upload"
        cancelText="Cancel"
      >
        <Alert
          message={`Preview ${Math.min(previewData.length, 10)} dari ${previewData.length} total data`}
          description="Periksa data sebelum melakukan upload. Pastikan semua data sudah benar. Hanya 10 data pertama yang ditampilkan untuk preview."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        {renderPreviewTable()}
      </Modal>

      {/* View Current Data Modal */}
      <Modal
        title="Current Uploaded Data"
        visible={showDataModal}
        onCancel={() => setShowDataModal(false)}
        width={1200}
        footer={[
          <Button key="close" onClick={() => setShowDataModal(false)}>
            Close
          </Button>
        ]}
      >
        <Table
          dataSource={currentData}
          columns={[
            { 
              title: 'ID', 
              dataIndex: 'id', 
              key: 'id',
              width: 100,
              render: (text) => text?.substring(0, 8) + '...'
            },
            { 
              title: 'Created At', 
              dataIndex: 'createdAt', 
              key: 'createdAt',
              width: 150,
              render: (text) => text ? moment(text).format('DD/MM/YYYY HH:mm') : '-'
            },
            { 
              title: 'Migration Date', 
              dataIndex: 'migrationDate', 
              key: 'migrationDate',
              width: 150,
              render: (text) => text ? moment(text).format('DD/MM/YYYY HH:mm') : '-'
            },
            { 
              title: 'Data', 
              key: 'data',
              render: (record) => {
                // Remove metadata fields for display
                const { id, isInitialData, migrationDate, createdAt, ...cleanData } = record;
                const dataString = JSON.stringify(cleanData, null, 2);
                return (
                  <div style={{ maxWidth: 300, overflow: 'hidden' }}>
                    <Text code style={{ fontSize: '11px' }}>
                      {dataString.length > 100 ? dataString.substring(0, 100) + '...' : dataString}
                    </Text>
                  </div>
                );
              }
            }
          ]}
          rowKey="id"
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
          }}
          scroll={{ x: true }}
          size="small"
          loading={loading}
        />
      </Modal>
    </div>
  );
};

export default UploadDataCutOff;
