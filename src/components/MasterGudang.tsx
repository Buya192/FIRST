import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, message, Upload, Popconfirm, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, SaveOutlined, FileTextOutlined, DeleteFilled, SearchOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { collection, doc, deleteDoc, updateDoc, addDoc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAppContext } from '../context/AppContext';
import Papa from 'papaparse';

interface MasterGudangItem {
  id: string;
  companyCode: string;
  companyCodeDescription: string;
  plant: string;
  plantDescription: string;
  storageLocation: string;
  storageLocationDescription: string;
  parentUnit?: string;
}

const MasterGudang: React.FC = () => {
  const [form] = Form.useForm();
  const { appState, updateAppData } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterGudangItem | null>(null);
  const [searchText, setSearchText] = useState('');
  const [localData, setLocalData] = useState<MasterGudangItem[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'masterGudang'));
      const fetchedData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterGudangItem));
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
    console.log('MasterGudang component mounted');
    fetchData();
    return () => {
      console.log('MasterGudang component unmounted');
    };
  }, [fetchData]);

  useEffect(() => {
    console.log('AppState masterGudang updated:', appState.masterGudang);
    setLocalData(appState.masterGudang);
  }, [appState.masterGudang]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'masterGudang', id));
      message.success('Item deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      message.error('Failed to delete item');
    }
  };

  const handleSave = async (item: MasterGudangItem) => {
    try {
      if (item.id) {
        const { id, ...itemData } = item;
        await updateDoc(doc(db, 'masterGudang', id), itemData);
      } else {
        await addDoc(collection(db, 'masterGudang'), item);
      }
      message.success('Item saved successfully');
      fetchData();
    } catch (error) {
      console.error('Error saving item:', error);
      message.error('Failed to save item');
    }
  };

  const handleEdit = (record: MasterGudangItem) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingItem) {
        await handleSave({ ...editingItem, ...values });
      } else {
        await handleSave(values as MasterGudangItem);
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

          const batch = writeBatch(db);
          let validRowCount = 0;
          (results.data as any[]).forEach((row: any, index: number) => {
            // Check if row has any data
            if (Object.values(row).some(value => value !== "")) {
              const newItem = {
                companyCode: row['Company Code'] || '',
                companyCodeDescription: row['Company Code Description'] || '',
                plant: row['Plant'] || '',
                plantDescription: row['Plant Description'] || '',
                storageLocation: row['Storage Location'] || '',
                storageLocationDescription: row['Storage Location Description'] || '',
                parentUnit: row['Parent Unit'] || '',
              };

              console.log(`Processing row ${index}:`, newItem);

              const docRef = doc(collection(db, 'masterGudang'));
              batch.set(docRef, newItem);
              validRowCount++;
            } else {
              console.log(`Skipping empty row at index ${index}`);
            }
          });

          await batch.commit();
          message.success(`${file.name} uploaded successfully. ${validRowCount} valid rows processed.`);
          await fetchData();
          console.log('After upload and fetchData, localData:', localData);
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

  const handleDeleteAll = async () => {
    try {
      const batch = writeBatch(db);
      localData.forEach((item: MasterGudangItem) => {
        const docRef = doc(db, 'masterGudang', item.id);
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
    (item: MasterGudangItem) =>
      item.companyCode.toLowerCase().includes(searchText.toLowerCase()) ||
      item.companyCodeDescription.toLowerCase().includes(searchText.toLowerCase())
  );

  console.log('Filtered data:', filteredData);

  const columns = [
    {
      title: 'Company Code',
      dataIndex: 'companyCode',
      key: 'companyCode',
    },
    {
      title: 'Company Code Description',
      dataIndex: 'companyCodeDescription',
      key: 'companyCodeDescription',
    },
    {
      title: 'Plant',
      dataIndex: 'plant',
      key: 'plant',
    },
    {
      title: 'Plant Description',
      dataIndex: 'plantDescription',
      key: 'plantDescription',
    },
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
      title: 'Parent Unit',
      dataIndex: 'parentUnit',
      key: 'parentUnit',
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: MasterGudangItem) => (
        <span>
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} style={{ marginRight: 8 }}>
            Edit
          </Button>
          <Button icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} style={{ marginRight: 8 }} danger>
            Delete
          </Button>
          <Button icon={<SaveOutlined />} onClick={() => handleSave(record)} type="primary">
            Save
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
      <h1 className="text-2xl font-bold mb-4">Master Gudang</h1>
      <div style={{ marginBottom: 16 }}>
        <Tooltip title="Upload CSV file containing master gudang data">
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
        <Input
          placeholder="Search"
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 200, marginLeft: 8 }}
          prefix={<SearchOutlined />}
        />
        <Tooltip title="Upload a CSV file with columns: Company Code, Company Code Description, Plant, Plant Description, Storage Location, Storage Location Description">
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
            name="companyCode"
            label="Company Code"
            rules={[{ required: true, message: 'Please input the Company Code!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="companyCodeDescription"
            label="Company Code Description"
            rules={[{ required: true, message: 'Please input the Company Code Description!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="plant"
            label="Plant"
            rules={[{ required: true, message: 'Please input the Plant!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="plantDescription"
            label="Plant Description"
            rules={[{ required: true, message: 'Please input the Plant Description!' }]}
          >
            <Input />
          </Form.Item>
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
            name="parentUnit"
            label="Parent Unit (e.g. UP3 Kupang)"
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MasterGudang;
