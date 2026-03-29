import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, Button, Modal, Form, Input, message, Upload, Popconfirm, Tooltip, 
  Card, Row, Col, Statistic, Select, Space, Tabs, DatePicker, Tag, Typography, Spin, Empty,
  Dropdown, Menu, Badge
} from 'antd';
import { 
  EditOutlined, DeleteOutlined, SaveOutlined, FileTextOutlined, 
  SearchOutlined, InfoCircleOutlined, PlusOutlined, DownloadOutlined,
  FilterOutlined, ReloadOutlined, BarChartOutlined, StockOutlined,
  SyncOutlined, AppstoreOutlined, WarningOutlined, RiseOutlined,
  FileExcelOutlined, FilePdfOutlined, DownOutlined, CalendarOutlined,
  QrcodeOutlined
} from '@ant-design/icons';
import QRCodeGenerator from './QRCodeGenerator';
import { collection, doc, deleteDoc, updateDoc, addDoc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAppContext } from '../context/AppContext';
import Papa from 'papaparse';
import moment from 'moment';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend } from 'chart.js';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

const { Title: TitleTypography, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface StockMaterialItem {
  id: string;
  storageLocation: string;
  storageLocationDescription: string;
  material: string;
  materialDescription: string;
  satuan: string;
  valuationType: string;
  // 3 jenis stock terpisah
  stockNormal: number;
  stockATTBRusak: number;
  stockATTBHandal: number;
  totalStock: number; // computed: Normal + ATTBRusak + ATTBHandal
  // Legacy field untuk backward compatibility
  stock?: number;
  unit: string; // UP3 Kupang, ULP Kupang, ULP Soe, etc.
  lastUpdated: string;
  // Migration tracking
  isInitialData?: boolean;
  migrationDate?: string;
}

interface MasterStockAwalItem {
  id: string;
  storageLocation: string;
  storageLocationDescription: string;
  material: string;
  materialDescription: string;
  satuan: string;
  valuationType: string;
  stock: number;
}

interface MasterGudangItem {
  id: string;
  companyCode: string;
  companyCodeDescription: string;
  plant: string;
  plantDescription: string;
  storageLocation: string;
  storageLocationDescription: string;
}

// Define the units under UP3 Kupang
const units = [
  'UP3 Kupang',
  'ULP Kupang',
  'ULP Soe',
  'ULP Atambua',
  'ULP Oesao',
  'ULP Kefamenanu',
  'Lainnya'
];

const StockMaterial: React.FC = () => {
  const [form] = Form.useForm();
  const { updateAppData } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<StockMaterialItem | null>(null);
  const [searchText, setSearchText] = useState('');
  const [localData, setLocalData] = useState<StockMaterialItem[]>([]);
  const [filteredData, setFilteredData] = useState<StockMaterialItem[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [activeTab, setActiveTab] = useState('all');
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<moment.Moment | null>(null);
  const [dateRange, setDateRange] = useState<[moment.Moment | null, moment.Moment | null]>([null, null]);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedQrData, setSelectedQrData] = useState<any>(null);

  // Statistics state
  const [stats, setStats] = useState({
    totalItems: 0,
    totalStock: 0,
    locationDistribution: {} as Record<string, number>,
    materialDistribution: {} as Record<string, number>
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'stockMaterial'));
      const fetchedData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockMaterialItem));
      setLocalData(fetchedData);
      
      // Apply any existing filters
      if (searchText || selectedUnit || selectedLocation || activeTab !== 'all' || selectedDate || (dateRange[0] && dateRange[1])) {
        applyFilters(searchText, selectedUnit, selectedLocation, activeTab, selectedDate, dateRange);
      } else {
        setFilteredData(fetchedData);
        calculateStats(fetchedData);
      }
      
      console.log('Fetched data:', fetchedData);
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [searchText, selectedUnit, selectedLocation, activeTab, selectedDate, dateRange]);

  useEffect(() => {
    console.log('StockMaterial component mounted');
    fetchData();
    return () => {
      console.log('StockMaterial component unmounted');
    };
  }, [fetchData]);

  // Extract unique storage locations for the dropdown
  useEffect(() => {
    if (localData.length > 0) {
      const locations = [...new Set(localData.map(item => item.storageLocationDescription))]
        .filter(loc => loc) // Remove empty values
        .sort((a, b) => a.localeCompare(b));
      setLocationOptions(locations);
    }
  }, [localData]);

  const calculateStats = (data: StockMaterialItem[]) => {
    const totalItems = data.length;
    const totalStock = data.reduce((sum, item) => sum + (item.totalStock || item.stock || 0), 0);
    
    // Calculate location distribution
    const locationDistribution: Record<string, number> = {};
    data.forEach(item => {
      const stockValue = item.totalStock || item.stock || 0;
      if (locationDistribution[item.storageLocationDescription]) {
        locationDistribution[item.storageLocationDescription] += stockValue;
      } else {
        locationDistribution[item.storageLocationDescription] = stockValue;
      }
    });
    
    // Calculate material distribution (top 5 materials)
    const materialDistribution: Record<string, number> = {};
    data.forEach(item => {
      const stockValue = item.totalStock || item.stock || 0;
      if (materialDistribution[item.materialDescription]) {
        materialDistribution[item.materialDescription] += stockValue;
      } else {
        materialDistribution[item.materialDescription] = stockValue;
      }
    });
    
    setStats({
      totalItems,
      totalStock,
      locationDistribution,
      materialDistribution
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'stockMaterial', id));
      message.success('Item deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      message.error('Failed to delete item');
    }
  };

  const handleSave = async (item: StockMaterialItem) => {
    try {
      if (item.id) {
        const { id, ...itemData } = item;
        await updateDoc(doc(db, 'stockMaterial', id), itemData);
      } else {
        await addDoc(collection(db, 'stockMaterial'), {
          ...item,
          lastUpdated: moment().format('YYYY-MM-DD')
        });
      }
      message.success('Item saved successfully');
      fetchData();
    } catch (error) {
      console.error('Error saving item:', error);
      message.error('Failed to save item');
    }
  };

  const handleEdit = (record: StockMaterialItem) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingItem) {
        await handleSave({ 
          ...editingItem, 
          ...values, 
          lastUpdated: moment().format('YYYY-MM-DD') 
        });
      } else {
        await handleSave({ 
          ...values, 
          id: '', 
          lastUpdated: moment().format('YYYY-MM-DD') 
        } as StockMaterialItem);
      }
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error saving item:', error);
      message.error('Failed to save item');
    }
  };

  const handleUpload = (info: any) => {
    const { file } = info;
    
    Papa.parse(file, {
      complete: async (results: Papa.ParseResult<any>) => {
        try {
          setLoading(true);
          console.log('Parsed CSV data:', results.data);
          
          if (results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors);
            message.error('Error parsing CSV file. Please check the file format.');
            return;
          }

          const batch = writeBatch(db);
          let validRowCount = 0;
          (results.data as any[]).forEach((row: any, index: number) => {
            if (Object.values(row).some(value => value !== "")) {
              const newItem = {
                storageLocation: row['Storage Location'] || '',
                storageLocationDescription: row['Storage Location Description'] || '',
                material: row['Material'] || '',
                materialDescription: row['Material Description'] || '',
                satuan: row['Satuan'] || '',
                valuationType: row['Valuation Type'] || '',
                stock: parseFloat(row['Stock']) || 0,
                unit: row['Unit'] || 'UP3 Kupang',
                lastUpdated: moment().format('YYYY-MM-DD')
              };

              console.log(`Processing row ${index}:`, newItem);

              const docRef = doc(collection(db, 'stockMaterial'));
              batch.set(docRef, newItem);
              validRowCount++;
            } else {
              console.log(`Skipping empty row at index ${index}`);
            }
          });

          await batch.commit();
          message.success(`${file.name} uploaded successfully. ${validRowCount} valid rows processed.`);
          await fetchData();
        } catch (error) {
          console.error('Error uploading CSV:', error);
          message.error(`${file.name} upload failed.`);
        } finally {
          setLoading(false);
        }
      },
      header: true,
      skipEmptyLines: true,
      error: (error: any) => {
        console.error('CSV parsing error:', error);
        message.error('Error parsing CSV file. Please check the file format.');
      },
    });
  };

  // Function to extract unit from Storage Location Description
  const extractUnitFromDescription = (description: string): string => {
    const descLower = description.toLowerCase();
    
    // Special case for Gudang Ar Kupang - this should be ULP Kupang
    if (descLower.includes('gd ar kupang') || descLower.includes('gudang ar kupang')) 
      return 'ULP Kupang';
    
    // More specific pattern matching to avoid false positives
    if (descLower.includes('ulp kupang') || (descLower.includes('kupang') && descLower.includes('ulp'))) 
      return 'ULP Kupang';
    
    if (descLower.includes('ulp soe') || (descLower.includes('soe') && !descLower.includes('up3'))) 
      return 'ULP Soe';
    
    if (descLower.includes('ulp atambua') || (descLower.includes('atambua') && !descLower.includes('up3'))) 
      return 'ULP Atambua';
    
    if (descLower.includes('ulp oesao') || (descLower.includes('oesao') && !descLower.includes('up3'))) 
      return 'ULP Oesao';
    
    if (descLower.includes('ulp kefamenanu') || (descLower.includes('kefamenanu') && !descLower.includes('up3'))) 
      return 'ULP Kefamenanu';
    
    if (descLower.includes('ulp kalabahi') || (descLower.includes('kalabahi') && !descLower.includes('up3'))) 
      return 'ULP Kalabahi';
    
    if (descLower.includes('ulp sabu') || descLower.includes('sabu raijua') || 
        (descLower.includes('sabu') && !descLower.includes('up3')) || 
        (descLower.includes('raijua') && !descLower.includes('up3'))) 
      return 'ULP Sabu Raijua';
    
    // If description contains "kupang" but not "up3", it's likely ULP Kupang
    if (descLower.includes('kupang') && !descLower.includes('up3')) 
      return 'ULP Kupang';
    
    // If no match, use default
    return 'UP3 Kupang';
  };

  // Function to extract unit from Plant Description
  const extractUnitFromPlantDescription = (plantDesc: string): string => {
    if (plantDesc.includes('UP3 Kupang')) return 'UP3 Kupang';
    // Add more logic if needed for other plant descriptions
    return plantDesc;
  };

  // Function to sync data from masterStockAwal to stockMaterial
  const syncFromMasterStock = async () => {
    try {
      setLoading(true);
      
      // 1. Get data from masterGudang for mapping
      const gudangSnapshot = await getDocs(collection(db, 'masterGudang'));
      const gudangData = gudangSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterGudangItem));
      
      // Create mapping from storage location to unit
      const storageToUnitMap: Record<string, { unit: string, locationDesc: string }> = {};
      gudangData.forEach(item => {
        storageToUnitMap[item.storageLocation] = {
          unit: item.plantDescription, // UP3 Kupang
          locationDesc: item.storageLocationDescription // Storage location description
        };
      });
      
      // 2. Get data from masterStockAwal
      const stockAwalSnapshot = await getDocs(collection(db, 'masterStockAwal'));
      const masterStockData = stockAwalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterStockAwalItem));
      
      if (masterStockData.length === 0) {
        message.info('No data found in Master Stock Awal');
        setLoading(false);
        return;
      }
      
      // 3. Convert to StockMaterialItem format
      const batch = writeBatch(db);
      let count = 0;
      
      // Delete existing data if needed
      const stockSnapshot = await getDocs(collection(db, 'stockMaterial'));
      stockSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // 4. Add new data
      masterStockData.forEach(item => {
        // Determine unit based on storage location
        let unit = 'UP3 Kupang'; // Default unit
        let unitSource = 'default';
        
        if (storageToUnitMap[item.storageLocation]) {
          // If storage location exists in mapping, use unit from mapping
          const mappedUnit = extractUnitFromPlantDescription(storageToUnitMap[item.storageLocation].unit);
          unit = mappedUnit;
          unitSource = 'mapping';
          console.log(`Item ${item.material} (${item.storageLocation}): Using mapped unit: ${mappedUnit} from ${storageToUnitMap[item.storageLocation].unit}`);
        } else {
          // If not in mapping, try to extract from storage location description
          const extractedUnit = extractUnitFromDescription(item.storageLocationDescription);
          unit = extractedUnit;
          unitSource = 'extraction';
          console.log(`Item ${item.material} (${item.storageLocation}): Extracted unit: ${extractedUnit} from "${item.storageLocationDescription}"`);
        }
        
        // Additional check for specific storage locations
        if (item.storageLocationDescription.toLowerCase().includes('kupang') && 
            !item.storageLocationDescription.toLowerCase().includes('up3') && 
            unit === 'UP3 Kupang') {
          unit = 'ULP Kupang';
          console.log(`Item ${item.material}: Overriding to ULP Kupang based on description containing 'kupang'`);
        }
        
        // Log the final unit assignment
        console.log(`Final unit assignment for ${item.material} (${item.storageLocation} - ${item.storageLocationDescription}): ${unit} (source: ${unitSource})`);
        
        const newItem = {
          storageLocation: item.storageLocation || '',
          storageLocationDescription: item.storageLocationDescription || '',
          material: item.material || '',
          materialDescription: item.materialDescription || '',
          satuan: item.satuan || '',
          valuationType: item.valuationType || '',
          stock: item.stock || 0,
          unit: unit,
          lastUpdated: moment().format('YYYY-MM-DD')
        };
        
        const docRef = doc(collection(db, 'stockMaterial'));
        batch.set(docRef, newItem);
        count++;
      });
      
      await batch.commit();
      message.success(`Successfully synced ${count} items from Master Stock Awal`);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error syncing from master stock:', error);
      message.error('Failed to sync data from Master Stock Awal');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const batch = writeBatch(db);
      localData.forEach((item: StockMaterialItem) => {
        const docRef = doc(db, 'stockMaterial', item.id);
        batch.delete(docRef);
      });
      await batch.commit();
      message.success('All documents deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting all documents:', error);
      message.error('Failed to delete all documents');
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    applyFilters(value, selectedUnit, selectedLocation, activeTab, selectedDate, dateRange);
  };

  const handleUnitChange = (value: string) => {
    setSelectedUnit(value);
    applyFilters(searchText, value, selectedLocation, activeTab, selectedDate, dateRange);
  };

  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
    applyFilters(searchText, selectedUnit, value, activeTab, selectedDate, dateRange);
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    applyFilters(searchText, selectedUnit, selectedLocation, key, selectedDate, dateRange);
  };

  const handleDateChange = (date: any) => {
    setSelectedDate(date ? moment(date.valueOf()) : null);
    // Reset date range if single date is selected
    if (date) setDateRange([null, null]);
    applyFilters(searchText, selectedUnit, selectedLocation, activeTab, date ? moment(date.valueOf()) : null, [null, null]);
  };

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      const momentDates: [moment.Moment | null, moment.Moment | null] = [
        dates[0] ? moment(dates[0].valueOf()) : null,
        dates[1] ? moment(dates[1].valueOf()) : null
      ];
      setDateRange(momentDates);
      // Reset single date if date range is selected
      if (momentDates[0] || momentDates[1]) setSelectedDate(null);
      applyFilters(searchText, selectedUnit, selectedLocation, activeTab, null, momentDates);
    } else {
      setDateRange([null, null]);
      applyFilters(searchText, selectedUnit, selectedLocation, activeTab, null, [null, null]);
    }
  };

  const applyFilters = (
    search: string, 
    unit: string, 
    location: string, 
    tab: string,
    date: moment.Moment | null = null,
    dateRange: [moment.Moment | null, moment.Moment | null] = [null, null]
  ) => {
    let result = [...localData];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        item => 
          item.storageLocation.toLowerCase().includes(searchLower) ||
          item.storageLocationDescription.toLowerCase().includes(searchLower) ||
          item.material.toLowerCase().includes(searchLower) ||
          item.materialDescription.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply unit filter
    if (unit) {
      result = result.filter(item => item.unit === unit);
    }
    
    // Apply storage location filter
    if (location) {
      result = result.filter(item => item.storageLocationDescription === location);
    }
    
    // Apply date filter (single date)
    if (date) {
      const dateStr = date.format('YYYY-MM-DD');
      result = result.filter(item => item.lastUpdated === dateStr);
    }
    
    // Apply date range filter
    if (dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      result = result.filter(item => {
        const itemDate = item.lastUpdated;
        return itemDate >= startDate && itemDate <= endDate;
      });
    }
    
    // Apply tab filter
    if (tab !== 'all') {
      // Example: filter by stock level or other criteria based on tab
      if (tab === 'low') {
        result = result.filter(item => (item.totalStock || item.stock || 0) < 10); // Example threshold
      } else if (tab === 'high') {
        result = result.filter(item => (item.totalStock || item.stock || 0) >= 100); // Example threshold
      }
    }
    
    setFilteredData(result);
    calculateStats(result);
  };

  const exportToCSV = () => {
    const csvData = filteredData.map(item => ({
      'Storage Location': item.storageLocation,
      'Storage Location Description': item.storageLocationDescription,
      'Material': item.material,
      'Material Description': item.materialDescription,
      'Satuan': item.satuan,
      'Valuation Type': item.valuationType,
      'Stock': item.stock,
      'Unit': item.unit,
      'Last Updated': item.lastUpdated
    }));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `stock_material_${moment().format('YYYYMMDD_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      title: 'Storage Location',
      dataIndex: 'storageLocation',
      key: 'storageLocation',
      sorter: (a: StockMaterialItem, b: StockMaterialItem) => a.storageLocation.localeCompare(b.storageLocation),
    },
    {
      title: 'Storage Location Description',
      dataIndex: 'storageLocationDescription',
      key: 'storageLocationDescription',
      filters: locationOptions.map(location => ({ text: location, value: location })),
      onFilter: (value: any, record: StockMaterialItem) => record.storageLocationDescription === value,
      sorter: (a: StockMaterialItem, b: StockMaterialItem) => a.storageLocationDescription.localeCompare(b.storageLocationDescription),
    },
    {
      title: 'Material',
      dataIndex: 'material',
      key: 'material',
      sorter: (a: StockMaterialItem, b: StockMaterialItem) => a.material.localeCompare(b.material),
    },
    {
      title: 'Material Description',
      dataIndex: 'materialDescription',
      key: 'materialDescription',
    },
    {
      title: 'Satuan',
      dataIndex: 'satuan',
      key: 'satuan',
    },
    {
      title: 'Valuation Type',
      dataIndex: 'valuationType',
      key: 'valuationType',
    },
    {
      title: 'Stock',
      dataIndex: 'stock',
      key: 'stock',
      sorter: (a: StockMaterialItem, b: StockMaterialItem) => (a.totalStock || a.stock || 0) - (b.totalStock || b.stock || 0),
      render: (stock: number, record: StockMaterialItem) => {
        const stockValue = record.totalStock || stock || 0;
        return (
          <Tag color={stockValue < 10 ? 'red' : stockValue < 50 ? 'orange' : 'green'}>
            {stockValue}
          </Tag>
        );
      },
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      filters: units.map(unit => ({ text: unit, value: unit })),
      onFilter: (value: any, record: StockMaterialItem) => record.unit === value,
    },
    {
      title: 'Last Updated',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      render: (date: string) => moment(date).format('DD-MM-YYYY'),
      sorter: (a: StockMaterialItem, b: StockMaterialItem) => moment(a.lastUpdated).unix() - moment(b.lastUpdated).unix(),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: StockMaterialItem) => (
        <Space size="small">
          <Button icon={<QrcodeOutlined />} onClick={(e) => {
            e.stopPropagation();
            setSelectedQrData({
              nomorDokumen: record.id,
              deskripsiMaterial: record.materialDescription,
              normalisasiNumber: record.material,
              quantity: record.totalStock || record.stock || 0,
              satuan: record.satuan,
              kondisi: 'Baik',
              status: 'Aktif'
            });
            setQrModalVisible(true);
          }} title="Print QR Code" />
          <Button icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEdit(record); }} />
          <Button icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }} danger />
        </Space>
      ),
    },
  ];

  const uploadProps = {
    name: 'file',
    accept: '.csv',
    customRequest: handleUpload,
    showUploadList: false,
  };

  // Prepare chart data - sort by value (highest to lowest)
  const sortedLocations = Object.entries(stats.locationDistribution)
    .sort((a, b) => b[1] - a[1])  // Sort from highest to lowest
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {} as Record<string, number>);
  
  const chartData = {
    labels: Object.keys(sortedLocations),
    datasets: [
      {
        label: 'Stock per Storage Location',
        data: Object.values(sortedLocations),
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(199, 199, 199, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(199, 199, 199, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Distribusi Stock per Storage Location',
      },
    },
  };

  return (
    <div className="p-6">
      <TitleTypography level={3} className="mb-4">
        <StockOutlined className="mr-2" /> Stock Material
      </TitleTypography>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Total Items"
              value={stats.totalItems}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Total Stock"
              value={stats.totalStock}
              prefix={<StockOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Card bordered={false}>
            <Statistic
              title="Storage Locations"
              value={Object.keys(stats.locationDistribution).length}
              prefix={<BarChartOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Chart */}
      <Card className="mb-4" style={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
        <div style={{ height: '300px' }}>
          {Object.keys(stats.locationDistribution).length > 0 ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <Empty description="No data available for chart" />
          )}
        </div>
      </Card>

      {/* Filter and Actions */}
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button icon={<PlusOutlined />} onClick={handleAdd} type="primary">
            Add
          </Button>
          <Tooltip title="Upload CSV file containing stock material data">
            <Upload {...uploadProps}>
              <Button icon={<FileTextOutlined />}>Upload CSV</Button>
            </Upload>
          </Tooltip>
          <Button icon={<SaveOutlined />} onClick={() => {
            updateAppData();
            message.success('All changes saved');
          }}>
            Save All Changes
          </Button>
          <Popconfirm
            title="Are you sure you want to delete all documents?"
            onConfirm={handleDeleteAll}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} danger>
              Delete All Documents
            </Button>
          </Popconfirm>
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item key="excel" onClick={exportToCSV}>
                  <FileExcelOutlined /> Download Excel
                </Menu.Item>
                <Menu.Item key="pdf" onClick={exportToCSV}>
                  <FilePdfOutlined /> Download PDF
                </Menu.Item>
              </Menu>
            }
            trigger={['click']}
          >
            <Button icon={<DownloadOutlined />}>
              Download <DownOutlined />
            </Button>
          </Dropdown>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Refresh
          </Button>
          <Popconfirm
            title="Sync from Master Stock Awal"
            description="This will replace all current Stock Material data with data from Master Stock Awal. Continue?"
            onConfirm={syncFromMasterStock}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<SyncOutlined />}>
              Sync from Master Stock
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {/* Filters */}
      <div 
        style={{ 
          position: 'sticky', 
          top: 0, 
          zIndex: 10, 
          padding: '16px', 
          backgroundColor: '#fff', 
          borderBottom: '1px solid #f0f0f0',
          marginBottom: '16px',
          borderRadius: '0 0 8px 8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}
      >
        <Space wrap>
          <Input
            placeholder="Search"
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 200 }}
            prefix={<SearchOutlined />}
            allowClear
          />
          <Select
            placeholder="Select Storage Location"
            style={{ width: 250 }}
            onChange={handleLocationChange}
            allowClear
            defaultValue=""
          >
            <Option key="all" value="">All Storage Locations</Option>
            {locationOptions.map(location => (
              <Option key={location} value={location}>{location}</Option>
            ))}
          </Select>
          <DatePicker
            placeholder="Select Date"
            onChange={(date) => handleDateChange(date)}
            allowClear
            style={{ width: 150 }}
            format="DD-MM-YYYY"
          />
          <DatePicker.RangePicker
            placeholder={['Start Date', 'End Date']}
            onChange={(dates) => handleDateRangeChange(dates)}
            allowClear
            style={{ width: 250 }}
            format="DD-MM-YYYY"
          />
          <Tooltip title="Filter helps you narrow down the data based on specific criteria">
            <InfoCircleOutlined style={{ marginLeft: 8 }} />
          </Tooltip>
        </Space>
      </div>

      {/* Stock Filter Cards */}
      <div className="mb-4">
        <Row gutter={[8, 8]}>
          <Col xs={24} sm={8}>
            <Card 
              hoverable
              style={{ 
                backgroundColor: activeTab === 'all' ? '#1890ff' : '#f0f2f5',
                color: activeTab === 'all' ? 'white' : 'rgba(0, 0, 0, 0.65)',
                textAlign: 'center',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: activeTab === 'all' ? '0 4px 12px rgba(24, 144, 255, 0.3)' : 'none',
                padding: '8px',
                height: '80px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
              onClick={() => handleTabChange('all')}
            >
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                <AppstoreOutlined style={{ marginRight: 4 }} />
                All Stock
              </div>
              {activeTab === 'all' && (
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: 4 }}>
                  {stats.totalItems}
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card 
              hoverable
              style={{ 
                backgroundColor: activeTab === 'low' ? '#ff4d4f' : '#f0f2f5',
                color: activeTab === 'low' ? 'white' : 'rgba(0, 0, 0, 0.65)',
                textAlign: 'center',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: activeTab === 'low' ? '0 4px 12px rgba(255, 77, 79, 0.3)' : 'none',
                padding: '8px',
                height: '80px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
              onClick={() => handleTabChange('low')}
            >
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                <WarningOutlined style={{ marginRight: 4 }} />
                Low Stock
              </div>
              {activeTab === 'low' && (
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: 4 }}>
                  {localData.filter(item => (item.totalStock || item.stock || 0) < 10).length}
                </div>
              )}
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card 
              hoverable
              style={{ 
                backgroundColor: activeTab === 'high' ? '#52c41a' : '#f0f2f5',
                color: activeTab === 'high' ? 'white' : 'rgba(0, 0, 0, 0.65)',
                textAlign: 'center',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: activeTab === 'high' ? '0 4px 12px rgba(82, 196, 26, 0.3)' : 'none',
                padding: '8px',
                height: '80px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
              onClick={() => handleTabChange('high')}
            >
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                <RiseOutlined style={{ marginRight: 4 }} />
                High Stock
              </div>
              {activeTab === 'high' && (
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: 4 }}>
                  {localData.filter(item => (item.totalStock || item.stock || 0) >= 100).length}
                </div>
              )}
            </Card>
          </Col>
        </Row>
      </div>

      {/* Data Table */}
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1300, y: 500 }}
        pagination={{ 
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Total ${total} items`
        }}
        sticky={{ offsetHeader: 0 }}
        onRow={() => ({
          style: {
            cursor: 'pointer',
            transition: 'background-color 0.3s',
          },
          onMouseEnter: (e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.backgroundColor = '';
          },
        })}
        style={{ 
          borderRadius: '8px', 
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
        }}
      />

      {/* Add/Edit Modal */}
      <Modal
        title={editingItem ? 'Edit Item' : 'Add Item'}
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="storageLocation"
                label="Storage Location"
                rules={[{ required: true, message: 'Please input the Storage Location!' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="storageLocationDescription"
                label="Storage Location Description"
                rules={[{ required: true, message: 'Please select or input the Storage Location Description!' }]}
              >
                <Select
                  placeholder="Select or input a storage location"
                  showSearch
                  allowClear
                  optionFilterProp="children"
                  filterOption={(input, option) => {
                    const optionValue = option?.value?.toString() || '';
                    return optionValue.toLowerCase().includes(input.toLowerCase());
                  }}
                  dropdownRender={menu => (
                    <div>
                      {menu}
                      <div style={{ display: 'flex', flexWrap: 'nowrap', padding: 8 }}>
                        <Input
                          style={{ flex: 'auto' }}
                          placeholder="Enter custom location"
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value && !locationOptions.includes(value)) {
                              form.setFieldsValue({ storageLocationDescription: value });
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                >
                  {locationOptions.map(location => (
                    <Option key={location} value={location}>{location}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="material"
                label="Material"
                rules={[{ required: true, message: 'Please input the Material!' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="materialDescription"
                label="Material Description"
                rules={[{ required: true, message: 'Please input the Material Description!' }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="satuan"
                label="Satuan"
                rules={[{ required: true, message: 'Please input the Satuan!' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="valuationType"
                label="Valuation Type"
                rules={[{ required: true, message: 'Please input the Valuation Type!' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="stock"
                label="Stock"
                rules={[{ required: true, message: 'Please input the Stock!' }]}
              >
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="unit"
            label="Unit"
            rules={[{ required: true, message: 'Please select the Unit!' }]}
          >
            <Select placeholder="Select a unit">
              {units.map(unit => (
                <Option key={unit} value={unit}>{unit}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* QR Code Modal */}
      <Modal
        title="Print Material Barcode"
        visible={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={null}
        width={400}
      >
        {selectedQrData && <QRCodeGenerator data={selectedQrData} />}
      </Modal>
    </div>
  );
};

export default StockMaterial;
