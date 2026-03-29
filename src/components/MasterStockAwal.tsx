import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, message, Upload, Popconfirm, Tooltip, Switch } from 'antd';
import { EditOutlined, DeleteOutlined, SaveOutlined, FileTextOutlined, DeleteFilled, SearchOutlined, InfoCircleOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { collection, doc, deleteDoc, updateDoc, addDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAppContext } from '../context/AppContext';
import Papa from 'papaparse';
import moment from 'moment';

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

// Define interface for MasterGudangItem
interface MasterGudangItem {
  id: string;
  companyCode: string;
  companyCodeDescription: string;
  plant: string;
  plantDescription: string;
  storageLocation: string;
  storageLocationDescription: string;
}

const MasterStockAwal: React.FC = () => {
  const [form] = Form.useForm();
  const { updateAppData } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterStockAwalItem | null>(null);
  const [searchText, setSearchText] = useState('');
  const [localData, setLocalData] = useState<MasterStockAwalItem[]>([]);
  const [autoSync, setAutoSync] = useState(true);

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

  // Function to sync data to StockMaterial
  const syncToStockMaterial = async (data: MasterStockAwalItem[]) => {
    try {
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
      
      // Batch write to stockMaterial
      const batch = writeBatch(db);
      let count = 0;
      
      // Add new data
      data.forEach(item => {
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
      message.success(`Successfully synced ${count} items to Stock Material`);
      return count;
    } catch (error) {
      console.error('Error syncing to Stock Material:', error);
      message.error('Failed to sync data to Stock Material');
      return 0;
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'masterStockAwal'));
      const fetchedData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterStockAwalItem));
      setLocalData(fetchedData);
      console.log('Fetched data:', fetchedData);
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('MasterStockAwal component mounted');
    fetchData();
    return () => {
      console.log('MasterStockAwal component unmounted');
    };
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'masterStockAwal', id));
      message.success('Item deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      message.error('Failed to delete item');
    }
  };

  const handleSave = async (item: MasterStockAwalItem) => {
    try {
      if (item.id) {
        const { id, ...itemData } = item;
        await updateDoc(doc(db, 'masterStockAwal', id), itemData);
      } else {
        await addDoc(collection(db, 'masterStockAwal'), item);
      }
      message.success('Item saved successfully');
      fetchData();
    } catch (error) {
      console.error('Error saving item:', error);
      message.error('Failed to save item');
    }
  };

  const handleEdit = (record: MasterStockAwalItem) => {
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
        await handleSave({ ...editingItem, ...values });
      } else {
        await handleSave(values as MasterStockAwalItem);
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
      complete: async (results) => {
        try {
          setLoading(true);
          console.log('Parsed CSV data:', results.data);
          
          if (results.errors.length > 0) {
            console.error('CSV parsing errors:', results.errors);
            message.error('Error parsing CSV file. Please check the file format.');
            return;
          }

          // Process data for masterStockAwal
          const batch = writeBatch(db);
          let validRowCount = 0;
          const processedItems: MasterStockAwalItem[] = [];
          
          (results.data as any[]).forEach((row: any, index: number) => {
            if (Object.values(row).some(value => value !== "")) {
              const newItem = {
                id: '', // Temporary ID for processing
                storageLocation: row['Storage Location'] || '',
                storageLocationDescription: row['Storage Location Description'] || '',
                material: row['Material'] || '',
                materialDescription: row['Material Description'] || '',
                satuan: row['Satuan'] || '',
                valuationType: row['Valuation Type'] || '',
                stock: parseFloat(row['Stock']) || 0,
              };

              console.log(`Processing row ${index}:`, newItem);

              const docRef = doc(collection(db, 'masterStockAwal'));
              batch.set(docRef, {
                storageLocation: newItem.storageLocation,
                storageLocationDescription: newItem.storageLocationDescription,
                material: newItem.material,
                materialDescription: newItem.materialDescription,
                satuan: newItem.satuan,
                valuationType: newItem.valuationType,
                stock: newItem.stock,
              });
              
              // Add to processed items for syncing
              processedItems.push({...newItem, id: docRef.id});
              
              validRowCount++;
            } else {
              console.log(`Skipping empty row at index ${index}`);
            }
          });

          await batch.commit();
          message.success(`${file.name} uploaded successfully. ${validRowCount} valid rows processed.`);
          
          // Sync to StockMaterial if autoSync is enabled
          if (autoSync && processedItems.length > 0) {
            await syncToStockMaterial(processedItems);
          }
          
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
  
  // Function to manually sync all data to StockMaterial
  const handleSyncAll = async () => {
    try {
      setLoading(true);
      await syncToStockMaterial(localData);
      setLoading(false);
    } catch (error) {
      console.error('Error syncing all data:', error);
      message.error('Failed to sync all data to Stock Material');
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      const batch = writeBatch(db);
      localData.forEach((item: MasterStockAwalItem) => {
        const docRef = doc(db, 'masterStockAwal', item.id);
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
  };

  const filteredData = localData.filter(
    (item: MasterStockAwalItem) =>
      item.storageLocation.toLowerCase().includes(searchText.toLowerCase()) ||
      item.material.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: 'Storage Location',
      dataIndex: 'storageLocation',
      key: 'storageLocation',
    },
    {
      title: 'Storage Location Description',
      dataIndex: 'storageLocationDescription',
      key: 'storageLocationDescription',
    },
    {
      title: 'Material',
      dataIndex: 'material',
      key: 'material',
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
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: MasterStockAwalItem) => (
        <span>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ marginRight: 8 }}>
            Edit
          </Button>
          <Button icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} style={{ marginRight: 8 }} danger>
            Delete
          </Button>
        </span>
      ),
    },
  ];

  const uploadProps = {
    name: 'file',
    accept: '.csv',
    customRequest: handleUpload,
    showUploadList: false,
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Master Stock Awal</h1>
      <div style={{ marginBottom: 16 }}>
        <Button icon={<PlusOutlined />} onClick={handleAdd} style={{ marginRight: 8 }}>
          Add
        </Button>
        <Tooltip title="Upload CSV file containing master stock awal data">
          <Upload {...uploadProps}>
            <Button icon={<FileTextOutlined />}>Upload CSV</Button>
          </Upload>
        </Tooltip>
        <Button icon={<SaveOutlined />} onClick={() => {
          updateAppData();
          message.success('All changes saved');
        }} style={{ marginLeft: 8 }}>
          Save All Changes
        </Button>
        <Popconfirm
          title="Are you sure you want to delete all documents?"
          onConfirm={handleDeleteAll}
          okText="Yes"
          cancelText="No"
        >
          <Button icon={<DeleteFilled />} danger style={{ marginLeft: 8 }}>
            Delete All Documents
          </Button>
        </Popconfirm>
        <Popconfirm
          title="Sync all data to Stock Material?"
          onConfirm={handleSyncAll}
          okText="Yes"
          cancelText="No"
        >
          <Button icon={<SyncOutlined />} style={{ marginLeft: 8 }}>
            Sync to Stock Material
          </Button>
        </Popconfirm>
        <Input
          placeholder="Search"
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 200, marginLeft: 8 }}
          prefix={<SearchOutlined />}
        />
        <Tooltip title="Upload a CSV file with columns: Storage Location, Storage Location Description, Material, Material Description, Satuan, Valuation Type, Stock">
          <InfoCircleOutlined style={{ marginLeft: 8 }} />
        </Tooltip>
      </div>
      
      <div style={{ marginBottom: 16 }}>
        <span style={{ marginRight: 8 }}>Auto-sync to Stock Material:</span>
        <Switch 
          checked={autoSync} 
          onChange={(checked) => setAutoSync(checked)} 
          checkedChildren="On" 
          unCheckedChildren="Off"
        />
        <Tooltip title="When enabled, data will be automatically synced to Stock Material when uploaded">
          <InfoCircleOutlined style={{ marginLeft: 8 }} />
        </Tooltip>
      </div>
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
      />
      <Modal
        title={editingItem ? 'Edit Item' : 'Add Item'}
        visible={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="storageLocation"
            label="Storage Location"
            rules={[{ required: true, message: 'Please input the Storage Location!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="storageLocationDescription"
            label="Storage Location Description"
            rules={[{ required: true, message: 'Please input the Storage Location Description!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="material"
            label="Material"
            rules={[{ required: true, message: 'Please input the Material!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="materialDescription"
            label="Material Description"
            rules={[{ required: true, message: 'Please input the Material Description!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="satuan"
            label="Satuan"
            rules={[{ required: true, message: 'Please input the Satuan!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="valuationType"
            label="Valuation Type"
            rules={[{ required: true, message: 'Please input the Valuation Type!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="stock"
            label="Stock"
            rules={[{ required: true, message: 'Please input the Stock!' }]}
          >
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MasterStockAwal;
