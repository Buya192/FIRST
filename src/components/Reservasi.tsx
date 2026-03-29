import React, { useState, useEffect } from 'react';
import { Form, Input, DatePicker, Button, Row, Col, message, Modal, Table, Select, Card, Tag, Typography, Spin, Empty } from 'antd';
import { PrinterOutlined, SaveOutlined, PlusOutlined, DeleteOutlined, DownloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import moment from 'moment';
import styles from './Reservasi.module.css';
import '../styles/reservasi-print.css';
import { getLastReservationNumber } from '../utils/api';
import { db } from '../utils/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import MaterialGroupModal from './MaterialGroupModal';

const { Option } = Select;
const { TextArea } = Input;

interface Material {
  key: number;
  normalisasi: string;
  materialDescription: string;
  satuan: string;
  qtyPermintaan: number;
  stockSiap?: number;
  valuationType?: string;
}

interface MasterGudangItem {
  companyCode: string;
  companyCodeDescription: string;
  plant: string;
  plantDescription: string;
  storageLocation: string;
  storageLocationDescription: string;
}

interface MasterDataItem {
  id: string;
  normalisasi: string;
  materialDescription: string;
  satuan: string;
  valuationDescription: string;
  hargaSatuan: number;
}

interface StockMaterialItem {
  id: string;
  storageLocation: string;
  storageLocationDescription: string;
  material: string;
  materialDescription: string;
  satuan: string;
  valuationType: string;
  stock: number;
  unit: string;
  lastUpdated: string;
  companyCode?: string;
}

const Reservasi: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [printMode, setPrintMode] = useState(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [isPemeriksaModalVisible, setIsPemeriksaModalVisible] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [pemeriksa, setPemeriksa] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [reservationNumber, setReservationNumber] = useState<string>('');
  const [masterGudangData, setMasterGudangData] = useState<MasterGudangItem[]>([]);
  const [masterMaterialData, setMasterMaterialData] = useState<MasterDataItem[]>([]);
  const [filteredMaterialData, setFilteredMaterialData] = useState<MasterDataItem[]>([]);
  const [stockData, setStockData] = useState<Record<string, number>>({});
  const [isStockLoading, setIsStockLoading] = useState(false);
  const [selectedStorageLocation, setSelectedStorageLocation] = useState<string>('');
  const [materialsByLocation, setMaterialsByLocation] = useState<Record<string, MasterDataItem[]>>({});
  const [materialGroupModalVisible, setMaterialGroupModalVisible] = useState(false);

  const { getMasterMaterialData } = useAppContext();

  useEffect(() => {
    // Preload all data at component mount
    const preloadData = async () => {
      try {
        // Start all fetch operations in parallel
        await Promise.all([
          fetchMasterGudangData(),
          fetchMasterMaterialData(),
          fetchStockData()
        ]);
        
        // Cache the material data in localStorage for faster access
        cacheMaterialData();
      } catch (error) {
        console.error('Error preloading data:', error);
      }
    };
    
    // Try to load from cache first
    const loadFromCache = async () => {
      const cachedMaterials = localStorage.getItem('cachedMaterialData');
      const cachedStock = localStorage.getItem('cachedStockData');
      const cacheTimestamp = localStorage.getItem('materialCacheTimestamp');
      
      // Check if cache is valid (less than 1 hour old)
      const isValidCache = cacheTimestamp && 
        (Date.now() - parseInt(cacheTimestamp)) < 3600000; // 1 hour in milliseconds
      
      if (cachedMaterials && cachedStock && isValidCache) {
        try {
          setMasterMaterialData(JSON.parse(cachedMaterials));
          setStockData(JSON.parse(cachedStock));
          console.log('Loaded material data from cache');
          
          // Still fetch in background to update cache
          preloadData();
        } catch (error) {
          console.error('Error loading from cache:', error);
          preloadData();
        }
      } else {
        // No valid cache, load from server
        preloadData();
      }
    };
    
    loadFromCache();
    
    // Manually populate masterGudangData with sample data if it's empty
    // This is a fallback to ensure the dropdown has data to display
    setTimeout(() => {
      if (masterGudangData.length === 0) {
        console.log('No masterGudangData found, adding sample data...');
        const sampleData: MasterGudangItem[] = [
          {
            companyCode: '1000',
            companyCodeDescription: 'PLN UP3 Kupang',
            plant: 'KPG1',
            plantDescription: 'UP3 Kupang',
            storageLocation: 'KPG1',
            storageLocationDescription: 'Gudang UP3 Kupang'
          },
          {
            companyCode: '1001',
            companyCodeDescription: 'PLN ULP Kupang',
            plant: 'KPG2',
            plantDescription: 'ULP Kupang',
            storageLocation: 'KPG2',
            storageLocationDescription: 'Gudang ULP Kupang'
          },
          {
            companyCode: '1002',
            companyCodeDescription: 'PLN ULP Soe',
            plant: 'SOE1',
            plantDescription: 'ULP Soe',
            storageLocation: 'SOE1',
            storageLocationDescription: 'Gudang ULP Soe'
          },
          {
            companyCode: '1003',
            companyCodeDescription: 'PLN ULP Atambua',
            plant: 'ATB1',
            plantDescription: 'ULP Atambua',
            storageLocation: 'ATB1',
            storageLocationDescription: 'Gudang ULP Atambua'
          },
          {
            companyCode: '1004',
            companyCodeDescription: 'PLN ULP Oesao',
            plant: 'OES1',
            plantDescription: 'ULP Oesao',
            storageLocation: 'OES1',
            storageLocationDescription: 'Gudang ULP Oesao'
          },
          {
            companyCode: '1005',
            companyCodeDescription: 'PLN ULP Kefamenanu',
            plant: 'KFM1',
            plantDescription: 'ULP Kefamenanu',
            storageLocation: 'KFM1',
            storageLocationDescription: 'Gudang ULP Kefamenanu'
          }
        ];
        setMasterGudangData(sampleData);
      }
    }, 2000); // Check after 2 seconds
  }, []);
  
  // Cache material data for faster access
  const cacheMaterialData = () => {
    try {
      if (masterMaterialData.length > 0) {
        localStorage.setItem('cachedMaterialData', JSON.stringify(masterMaterialData));
        localStorage.setItem('cachedStockData', JSON.stringify(stockData));
        localStorage.setItem('materialCacheTimestamp', Date.now().toString());
        console.log('Material data cached successfully');
      }
    } catch (error) {
      console.error('Error caching material data:', error);
    }
  };

  // Fetch stock data from stockMaterial collection
  const fetchStockData = async () => {
    setIsStockLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'stockMaterial'));
      const stockMap: Record<string, number> = {};
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        // Use material code as key and stock as value
        if (data.material && data.stock !== undefined) {
          // If material already exists, add to the existing stock
          if (stockMap[data.material]) {
            stockMap[data.material] += data.stock;
          } else {
            stockMap[data.material] = data.stock;
          }
        }
      });
      
      setStockData(stockMap);
      console.log('Stock data loaded:', stockMap);
    } catch (error) {
      console.error('Error fetching stock data:', error);
      message.error('Gagal mengambil data stok material');
    } finally {
      setIsStockLoading(false);
    }
  };

  const fetchMasterGudangData = async () => {
    console.log('Starting fetchMasterGudangData...');
    try {
      // Try to get data from masterGudang collection first
      console.log('Fetching from masterGudang collection...');
      const masterGudangSnapshot = await getDocs(collection(db, 'masterGudang'));
      console.log('masterGudang query completed, docs count:', masterGudangSnapshot.docs.length);
      
      if (masterGudangSnapshot.docs.length > 0) {
        const fetchedData = masterGudangSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            ...data,
            // Ensure these fields exist
            companyCode: data.companyCode || 'N/A',
            companyCodeDescription: data.companyCodeDescription || '',
            plant: data.plant || '',
            plantDescription: data.plantDescription || '',
            storageLocation: data.storageLocation || '',
            storageLocationDescription: data.storageLocationDescription || ''
          } as MasterGudangItem;
        });
        
        console.log('Processed masterGudang data:', fetchedData);
        
        // Filter out items with empty storageLocationDescription
        const validData = fetchedData.filter(item => !!item.storageLocationDescription);
        
        if (validData.length > 0) {
          setMasterGudangData(validData);
          console.log('Storage locations loaded from masterGudang:', validData);
          return validData;
        }
      }
      
      // Fallback to stockMaterial collection
      console.log('Fetching from stockMaterial collection as fallback...');
      const stockSnapshot = await getDocs(collection(db, 'stockMaterial'));
      console.log('stockMaterial query completed, docs count:', stockSnapshot.docs.length);
      
      if (stockSnapshot.docs.length === 0) {
        throw new Error('No data found in both masterGudang and stockMaterial collections');
      }
      
      const stockMaterialData = stockSnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          // Ensure these fields exist
          storageLocation: data.storageLocation || '',
          storageLocationDescription: data.storageLocationDescription || '',
          unit: data.unit || '',
          companyCode: data.companyCode || 'N/A'
        } as StockMaterialItem;
      });
      
      console.log('Processed stockMaterialData:', stockMaterialData);
      
      // Extract unique storage locations
      const uniqueLocations = new Map<string, MasterGudangItem>();
      
      stockMaterialData.forEach(item => {
        // Only add if both storageLocation and storageLocationDescription are not empty
        if (item.storageLocation && 
            item.storageLocationDescription && 
            !uniqueLocations.has(item.storageLocationDescription)) {
          
          console.log('Adding unique location:', item.storageLocationDescription);
          
          // Create a MasterGudangItem from StockMaterialItem
          uniqueLocations.set(item.storageLocationDescription, {
            companyCode: item.companyCode || 'N/A',
            companyCodeDescription: `Company ${item.companyCode || 'N/A'}`,
            plant: item.storageLocation || '',
            plantDescription: item.unit || '',
            storageLocation: item.storageLocation,
            storageLocationDescription: item.storageLocationDescription
          });
        }
      });
      
      const fetchedData = Array.from(uniqueLocations.values());
      console.log('Unique locations extracted:', fetchedData);
      
      if (fetchedData.length === 0) {
        throw new Error('No valid storage locations found in stockMaterial data');
      }
      
      setMasterGudangData(fetchedData);
      console.log('Storage locations loaded from stockMaterial:', fetchedData);
      
      return fetchedData;
    } catch (error) {
      console.error('Error fetching master gudang data:', error);
      message.error('Gagal mengambil data lokasi penyimpanan');
      
      // Create some sample data as last resort
      const sampleData: MasterGudangItem[] = [
        {
          companyCode: '1000',
          companyCodeDescription: 'PLN UP3 Kupang',
          plant: 'KPG1',
          plantDescription: 'UP3 Kupang',
          storageLocation: 'KPG1',
          storageLocationDescription: 'Gudang UP3 Kupang'
        },
        {
          companyCode: '1001',
          companyCodeDescription: 'PLN ULP Kupang',
          plant: 'KPG2',
          plantDescription: 'ULP Kupang',
          storageLocation: 'KPG2',
          storageLocationDescription: 'Gudang ULP Kupang'
        }
      ];
      
      console.log('Using sample data as fallback:', sampleData);
      setMasterGudangData(sampleData);
      return sampleData;
    }
  };

  const fetchMasterMaterialData = async () => {
    try {
      if (getMasterMaterialData) {
        const data = await getMasterMaterialData();
        setMasterMaterialData(data);
      }
    } catch (error) {
      message.error('Gagal mengambil data master material');
    }
  };

  const generateReservationNumber = async () => {
    try {
      const lastNumber = await getLastReservationNumber();
      const nextNumber = lastNumber + 1;
      const formattedNumber = nextNumber.toString().padStart(3, '0');
      const storageLocationDescription = form.getFieldValue('storageLocationDescription') || '';
      const fungsi = form.getFieldValue('fungsi') || '';
      const date = form.getFieldValue('tanggal');
      const monthRoman = date ? convertMonthToRoman(date.month() + 1) : '';
      const year = date ? date.year() : '';
      const fullReservationNumber = `${formattedNumber}/${storageLocationDescription}/${fungsi}/${monthRoman}/${year}`;
      setReservationNumber(fullReservationNumber);
      form.setFieldsValue({ nomorReservasi: fullReservationNumber });
    } catch (error) {
      message.error('Gagal menghasilkan Nomor Reservasi');
    }
  };

  const convertMonthToRoman = (month: number): string => {
    const romanMonths = [
      'I', 'II', 'III', 'IV', 'V', 'VI',
      'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
    ];
    return romanMonths[month - 1] || '';
  };

  const handleStorageLocationChange = (value: string) => {
    const selectedGudang = masterGudangData.find(
      (item) => item.storageLocationDescription === value
    );
    
    if (selectedGudang) {
      setSelectedStorageLocation(selectedGudang.storageLocation);
      
      form.setFieldsValue({
        companyCode: selectedGudang.companyCode,
        storageLocation: selectedGudang.storageLocation,
        plantDescription: selectedGudang.plantDescription,
      });
      
      // Filter materials based on selected storage location
      filterMaterialsByStorageLocation(selectedGudang.storageLocation);
    } else {
      message.error('Data gudang tidak ditemukan');
    }
    
    generateReservationNumber();
  };
  
  // Filter materials based on storage location
  const filterMaterialsByStorageLocation = async (storageLocation: string) => {
    setIsStockLoading(true);
    
    try {
      // Get materials for this storage location from stockMaterial collection
      const querySnapshot = await getDocs(collection(db, 'stockMaterial'));
      const materialsInLocation: Record<string, number> = {};
      
      // Create a map of material codes to stock quantities for this location
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.storageLocation === storageLocation && data.material && data.stock > 0) {
          materialsInLocation[data.material] = (materialsInLocation[data.material] || 0) + data.stock;
        }
      });
      
      // Filter master material data to only include materials available in this location
      const filteredMaterials = masterMaterialData.filter(material => 
        materialsInLocation[material.normalisasi] !== undefined && 
        materialsInLocation[material.normalisasi] > 0
      );
      
      // If no materials found for this location, use all materials
      if (filteredMaterials.length === 0) {
        setFilteredMaterialData(masterMaterialData);
        console.log('No materials found for this location, showing all materials');
      } else {
        setFilteredMaterialData(filteredMaterials);
        console.log(`Found ${filteredMaterials.length} materials for location ${storageLocation}`);
      }
      
      // Update materialsByLocation state
      setMaterialsByLocation(prev => ({
        ...prev,
        [storageLocation]: filteredMaterials
      }));
      
    } catch (error) {
      console.error('Error filtering materials by location:', error);
      message.error('Gagal memfilter material berdasarkan lokasi');
      setFilteredMaterialData(masterMaterialData);
    } finally {
      setIsStockLoading(false);
    }
  };

  const onFinish = () => {
    form.validateFields()
      .then(() => {
        if (materials.length === 0) {
          message.error('Tambahkan material sebelum menyimpan.');
        } else if (materials.some(m => m.qtyPermintaan <= 0)) {
          message.error('Jumlah permintaan material harus lebih dari 0.');
        } else {
          setIsSaveModalVisible(true);
        }
      })
      .catch(() => {
        message.error('Harap isi semua field yang diperlukan.');
      });
  };

  const handleSaveModalOk = () => {
    setIsSaveModalVisible(false);
    setIsPemeriksaModalVisible(true);
  };

  const handleSaveModalCancel = () => {
    setIsSaveModalVisible(false);
  };

  const saveReservationToFirebase = async () => {
    const formValues = form.getFieldsValue();
    const reservationData = {
      nomorReservasi: reservationNumber,
      tanggal: formValues.tanggal ? moment(formValues.tanggal).format('YYYY-MM-DD') : null,
      companyCode: formValues.companyCode,
      storageLocationDescription: formValues.storageLocationDescription,
      fungsi: formValues.fungsi,
      storageLocation: formValues.storageLocation,
      plantDescription: formValues.plantDescription,
      nomorKontrak: formValues.nomorKontrak,
      pelaksana: formValues.pelaksana,
      deskripsiPekerjaan: formValues.deskripsiPekerjaan,
      materials: materials,
      pemeriksa: pemeriksa,
      createdAt: new Date(),
      approved: false,
      printed: false
    };

    try {
      const docRef = await addDoc(collection(db, 'daftarReservasi'), reservationData);
      console.log('Reservasi berhasil disimpan dengan ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saat menyimpan reservasi:', error);
      throw error;
    }
  };

  const handlePemeriksaModalOk = async () => {
    if (!pemeriksa) {
      message.error('Harap masukkan nama pemeriksa.');
      return;
    }
    setIsPemeriksaModalVisible(false);
    
    try {
      await saveReservationToFirebase();
      message.success('Reservasi berhasil disimpan');
      navigate('/daftar-reservasi');
    } catch (error) {
      message.error('Gagal menyimpan reservasi');
    }
  };

  const handlePemeriksaModalCancel = () => {
    setIsPemeriksaModalVisible(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text('Reservasi', 10, 10);
    doc.save('reservasi.pdf');
  };

  const handleNormalisasiChange = (value: string) => {
    console.log('Material input:', value);
    
    // Clear previous data if input is empty
    if (!value.trim()) {
      setSelectedMaterial(null);
      form.setFieldsValue({
        materialDescription: '',
        satuan: '',
      });
      return;
    }
    
    // Find material by normalisasi (exact match first, then partial match)
    let material = masterMaterialData.find((item) => 
      item.normalisasi.toLowerCase() === value.toLowerCase()
    );
    
    // If no exact match, try partial match
    if (!material) {
      material = masterMaterialData.find((item) => 
        item.normalisasi.toLowerCase().includes(value.toLowerCase()) ||
        item.materialDescription.toLowerCase().includes(value.toLowerCase())
      );
    }
    
    if (material) {
      console.log('Material found:', material);
      
      // Get stock data for this material
      const stock = stockData[material.normalisasi] || 0;
      
      // Create selected material object
      const newSelectedMaterial: Material = {
        key: materials.length + 1,
        normalisasi: material.normalisasi,
        materialDescription: material.materialDescription,
        satuan: material.satuan,
        qtyPermintaan: 1,
        stockSiap: stock
      };
      
      // Get valuation type from stockMaterial collection (async)
      const getValuationType = async () => {
        try {
          const querySnapshot = await getDocs(collection(db, 'stockMaterial'));
          let valuationType = '';
          
          // Find the first matching material with the selected storage location
          for (const doc of querySnapshot.docs) {
            const data = doc.data();
            if (data.material === material.normalisasi && 
                (!selectedStorageLocation || data.storageLocation === selectedStorageLocation)) {
              valuationType = data.valuationType || '';
              break;
            }
          }
          
          // Update selected material with valuation type
          setSelectedMaterial({
            ...newSelectedMaterial,
            valuationType: valuationType
          });
        } catch (error) {
          console.error('Error getting valuation type:', error);
          // Use material without valuation type if error occurs
          setSelectedMaterial(newSelectedMaterial);
        }
      };
      
      // Set selected material immediately (without valuation type)
      setSelectedMaterial(newSelectedMaterial);
      
      // Update form fields immediately
      form.setFieldsValue({
        materialDescription: material.materialDescription,
        satuan: material.satuan,
      });
      
      // Get valuation type asynchronously
      getValuationType();
      
    } else {
      console.log('Material not found for input:', value);
      // Clear selected material if not found
      setSelectedMaterial(null);
      form.setFieldsValue({
        materialDescription: '',
        satuan: '',
      });
    }
  };

  const handleAddMaterial = () => {
    if (selectedMaterial) {
      if (materials.some((material) => material.normalisasi === selectedMaterial.normalisasi)) {
        message.error('Material sudah ditambahkan.');
        return;
      }
      setMaterials([...materials, selectedMaterial]);
      setSelectedMaterial(null);
      form.setFieldsValue({ normalisasi: '', materialDescription: '', satuan: '' });
    } else {
      message.error('Silakan pilih material yang valid terlebih dahulu');
    }
  };

  const handleDeleteMaterial = (key: number) => {
    setMaterials(materials.filter((item) => item.key !== key));
  };

  // Handle material selection from groups
  const handleMaterialGroupSelect = (selectedMaterials: any[]) => {
    const newMaterials: Material[] = [];
    
    selectedMaterials.forEach((groupMaterial) => {
      // Check if material already exists
      const existingMaterial = materials.find(m => m.normalisasi === groupMaterial.normalisasi);
      if (!existingMaterial) {
        const newMaterial: Material = {
          key: materials.length + newMaterials.length + 1,
          normalisasi: groupMaterial.normalisasi,
          materialDescription: groupMaterial.materialDescription,
          satuan: groupMaterial.satuan,
          qtyPermintaan: groupMaterial.qtyPermintaan,
          stockSiap: stockData[groupMaterial.normalisasi] || 0
        };
        newMaterials.push(newMaterial);
      }
    });
    
    if (newMaterials.length > 0) {
      setMaterials(prev => [...prev, ...newMaterials]);
      message.success(`${newMaterials.length} material berhasil ditambahkan dari group`);
    } else {
      message.warning('Semua material yang dipilih sudah ada dalam daftar');
    }
  };

  const renderForm = () => (
    <Form form={form} layout="vertical" onFinish={onFinish} className={styles.reservasiForm}>
      <Card title="Informasi Reservasi" className={styles.card}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Nomor Reservasi" name="nomorReservasi" rules={[{ required: true, message: 'Silakan masukkan Nomor Reservasi' }]}>
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Tanggal" name="tanggal" rules={[{ required: true, message: 'Silakan pilih Tanggal' }]}>
              <DatePicker style={{ width: '100%' }} onChange={generateReservationNumber} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Company Code" name="companyCode" rules={[{ required: true, message: 'Silakan masukkan Company Code' }]}>
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Storage Location Description" name="storageLocationDescription" rules={[{ required: true, message: 'Silakan pilih Storage Location Description' }]}>
              <Select showSearch placeholder="Pilih Storage Location Description" onChange={handleStorageLocationChange}>
                {masterGudangData.map((item, index) => (
                  <Option key={index} value={item.storageLocationDescription}>{item.storageLocationDescription}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Fungsi" name="fungsi" rules={[{ required: true, message: 'Silakan masukkan Fungsi' }]}>
              <Input onChange={generateReservationNumber} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Storage Location" name="storageLocation" rules={[{ required: true, message: 'Silakan masukkan Storage Location' }]}>
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Plant Description" name="plantDescription" rules={[{ required: true, message: 'Silakan masukkan Plant Description' }]}>
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Nomor Kontrak" name="nomorKontrak" rules={[{ required: true, message: 'Silakan masukkan Nomor Kontrak' }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Pelaksana" name="pelaksana" rules={[{ required: true, message: 'Silakan masukkan Pelaksana' }]}>
              <Input />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Deskripsi Pekerjaan" className={styles.card}>
        <Row gutter={16} align="middle">
          <Col span={24}>
            <Form.Item label="Deskripsi Pekerjaan" name="deskripsiPekerjaan" rules={[{ required: true, message: 'Silakan masukkan Deskripsi Pekerjaan' }]}>
              <TextArea rows={4} />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Tambah Material" className={styles.card}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Form.Item label="Normalisasi" name="normalisasi">
              <Input 
                placeholder="Cari normalisasi atau deskripsi material"
                onChange={(e) => handleNormalisasiChange(e.target.value)}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Material Description" name="materialDescription">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Satuan" name="satuan">
              <Input disabled />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Button onClick={handleAddMaterial} icon={<PlusOutlined />} className={styles.addButton}>
              Tambah Material
            </Button>
          </Col>
          <Col span={12}>
            <Button 
              type="primary" 
              icon={<InfoCircleOutlined />}
              onClick={() => {
                const storageLocationDesc = form.getFieldValue('storageLocationDescription');
                if (!storageLocationDesc) {
                  message.warning('Silakan pilih Storage Location Description terlebih dahulu');
                  return;
                }
                setMaterialGroupModalVisible(true);
              }}
              className={styles.addButton}
              title="Lihat Material berdasarkan Group"
            >
              Lihat Material
            </Button>
          </Col>
        </Row>
      </Card>

      <Card title="Daftar Material" className={styles.card}>
        <Table
          dataSource={materials}
          columns={[
            { title: 'No. Urut', dataIndex: 'key', key: 'key', width: '10%' },
            { title: 'Normalisasi', dataIndex: 'normalisasi', key: 'normalisasi', width: '20%' },
            { title: 'Material Description', dataIndex: 'materialDescription', key: 'materialDescription', width: '30%' },
            { title: 'Satuan', dataIndex: 'satuan', key: 'satuan', width: '10%' },
            {
              title: 'QTY Permintaan',
              dataIndex: 'qtyPermintaan',
              key: 'qtyPermintaan',
              width: '15%',
              render: (text, record) => (
                <Input
                  type="number"
                  value={text}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setMaterials((prevMaterials) =>
                      prevMaterials.map((material) =>
                        material.key === record.key ? { ...material, qtyPermintaan: value } : material
                      )
                    );
                  }}
                />
              ),
            },
            {
              title: 'Action',
              key: 'action',
              width: '15%',
              render: (_, record) => (
                <Button icon={<DeleteOutlined />} danger onClick={() => handleDeleteMaterial(record.key)}>Delete</Button>
              ),
            },
          ]}
          pagination={false}
          bordered
        />
      </Card>

      <Form.Item style={{ marginTop: 24 }}>
        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
        >
          Simpan Reservasi
        </Button>
      </Form.Item>
    </Form>
  );

  const renderPrintView = () => (
    <div className={styles.printView}>
      {/* Print view content */}
    </div>
  );

  return (
    <div className={styles.reservasiContainer}>
      <div className={styles.reservasiContent}>
        {printMode ? (
          <>
            {renderPrintView()}
            <div className={styles.actionButtons}>
              <Button onClick={() => setPrintMode(false)} className={styles.button}>
                Kembali ke Form
              </Button>
              <Button onClick={handlePrint} icon={<PrinterOutlined />} className={styles.button}>
                Cetak
              </Button>
              <Button onClick={generatePDF} icon={<DownloadOutlined />} className={styles.button}>
                Download PDF
              </Button>
            </div>
          </>
        ) : (
          renderForm()
        )}
      </div>
      <Modal
        title="Konfirmasi Reservasi"
        visible={isSaveModalVisible}
        onOk={handleSaveModalOk}
        onCancel={handleSaveModalCancel}
      >
        <p>Apakah Anda yakin ingin menyimpan reservasi ini?</p>
      </Modal>
      <Modal
        title="Masukkan Nama Pemeriksa"
        visible={isPemeriksaModalVisible}
        onOk={handlePemeriksaModalOk}
        onCancel={handlePemeriksaModalCancel}
      >
        <Input
          placeholder="Nama Pemeriksa"
          value={pemeriksa}
          onChange={(e) => setPemeriksa(e.target.value)}
        />
      </Modal>
      
      {/* Material Group Modal */}
      <MaterialGroupModal
        visible={materialGroupModalVisible}
        onClose={() => setMaterialGroupModalVisible(false)}
        onSelectMaterials={handleMaterialGroupSelect}
        selectedStorageLocation={selectedStorageLocation}
        storageLocationDescription={form.getFieldValue('storageLocationDescription')}
        companyCode={form.getFieldValue('companyCode')}
        plantDescription={form.getFieldValue('plantDescription')}
      />
    </div>
  );
};

export default Reservasi;
