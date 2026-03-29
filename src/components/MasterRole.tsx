import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Checkbox, message, Card, Divider } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

interface Role {
  id: string;
  name: string;
  defaultPermissions: {
    [key: string]: boolean;
  };
  createdAt: string;
}

const MasterRole: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'roles'));
      const roleList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Role[];
      setRoles(roleList);
    } catch (error) {
      console.error('Error fetching roles:', error);
      message.error('Failed to fetch roles');
    }
    setLoading(false);
  };

  const handleAddRole = () => {
    setEditingRole(null);
    form.resetFields();
    // Set default permissions
    form.setFieldsValue({
      permissions: {
        viewInventory: true,
        manageInventory: false,
        approveRequests: false,
        generateReports: false,
        manageUsers: false,
        transferStock: false,
        adjustStock: false,
        createReservation: false,
        createWO: false,
        processWO: false,
        manageRoles: false,
        viewAllLocations: false,
      }
    });
    setIsModalVisible(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    form.setFieldsValue({
      name: role.name,
      permissions: role.defaultPermissions
    });
    setIsModalVisible(true);
  };

  const handleDeleteRole = async (role: Role) => {
    try {
      await deleteDoc(doc(db, 'roles', role.id));
      message.success('Role deleted successfully');
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      message.error('Failed to delete role');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      const roleData: {
        name: string;
        defaultPermissions: { [key: string]: boolean };
        updatedAt: string;
        createdAt?: string;
      } = {
        name: values.name,
        defaultPermissions: values.permissions || {},
        updatedAt: new Date().toISOString()
      };
      
      if (editingRole) {
        await updateDoc(doc(db, 'roles', editingRole.id), roleData);
        message.success('Role updated successfully');
      } else {
        roleData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'roles'), roleData);
        message.success('Role added successfully');
      }
      setIsModalVisible(false);
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      message.error('Failed to save role');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_: unknown, record: Role) => {
        const permCount = Object.values(record.defaultPermissions || {}).filter(Boolean).length;
        return `${permCount} permissions enabled`;
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: Role) => (
        <span>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEditRole(record)}
            style={{ marginRight: 8 }}
          >
            Edit
          </Button>
          <Button
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteRole(record)}
            danger
          >
            Delete
          </Button>
        </span>
      ),
    },
  ];

  return (
    <Card title="Master Role" className="p-6">
      <Button 
        icon={<PlusOutlined />} 
        onClick={handleAddRole} 
        type="primary" 
        style={{ marginBottom: 16 }}
      >
        Add Role
      </Button>
      <Table columns={columns} dataSource={roles} rowKey="id" loading={loading} />
      <Modal
        title={editingRole ? 'Edit Role' : 'Add Role'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Role Name"
            rules={[
              { required: true, message: 'Please input the role name!' },
              { min: 3, message: 'Name must be at least 3 characters' },
            ]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item label="Permissions">
            <div style={{ border: '1px solid #f0f0f0', padding: '16px', borderRadius: '4px' }}>
              <h4>Inventaris</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                <Form.Item name={['permissions', 'viewInventory']} valuePropName="checked" noStyle>
                  <Checkbox>Lihat Inventaris</Checkbox>
                </Form.Item>
                <Form.Item name={['permissions', 'manageInventory']} valuePropName="checked" noStyle>
                  <Checkbox>Kelola Inventaris</Checkbox>
                </Form.Item>
                <Form.Item name={['permissions', 'transferStock']} valuePropName="checked" noStyle>
                  <Checkbox>Transfer Stok</Checkbox>
                </Form.Item>
                <Form.Item name={['permissions', 'adjustStock']} valuePropName="checked" noStyle>
                  <Checkbox>Penyesuaian Stok</Checkbox>
                </Form.Item>
              </div>
              
              <Divider style={{ margin: '8px 0' }} />
              
              <h4>Transaksi</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                <Form.Item name={['permissions', 'createReservation']} valuePropName="checked" noStyle>
                  <Checkbox>Buat Reservasi</Checkbox>
                </Form.Item>
                <Form.Item name={['permissions', 'approveRequests']} valuePropName="checked" noStyle>
                  <Checkbox>Setujui Permintaan</Checkbox>
                </Form.Item>
                <Form.Item name={['permissions', 'createWO']} valuePropName="checked" noStyle>
                  <Checkbox>Buat Work Order</Checkbox>
                </Form.Item>
                <Form.Item name={['permissions', 'processWO']} valuePropName="checked" noStyle>
                  <Checkbox>Proses Work Order</Checkbox>
                </Form.Item>
              </div>
              
              <Divider style={{ margin: '8px 0' }} />
              
              <h4>Laporan & Administrasi</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <Form.Item name={['permissions', 'generateReports']} valuePropName="checked" noStyle>
                  <Checkbox>Buat Laporan</Checkbox>
                </Form.Item>
                <Form.Item name={['permissions', 'manageUsers']} valuePropName="checked" noStyle>
                  <Checkbox>Kelola Pengguna</Checkbox>
                </Form.Item>
                <Form.Item name={['permissions', 'manageRoles']} valuePropName="checked" noStyle>
                  <Checkbox>Kelola Role</Checkbox>
                </Form.Item>
                <Form.Item name={['permissions', 'viewAllLocations']} valuePropName="checked" noStyle>
                  <Checkbox>Lihat Semua Lokasi</Checkbox>
                </Form.Item>
              </div>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default MasterRole;
