import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Card, Checkbox, Divider, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { collection, getDocs, doc, deleteDoc, updateDoc, addDoc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '../utils/firebase';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  storageLocation?: string;
  storageLocationDescription?: string;
  permissions?: {
    [key: string]: boolean;
  };
  isCustomRole?: boolean;
  customRoleName?: string;
  isSuperUser?: boolean; // Added for super user flag
}

interface Role {
  id: string;
  name: string;
  defaultPermissions: {
    [key: string]: boolean;
  };
}

interface StorageLocation {
  id: string;
  storageLocation: string;
  storageLocationDescription: string;
  companyCode: string;
  companyCodeDescription: string;
  plant: string;
  plantDescription: string;
  parentUnit?: string;
}

const MasterUser: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddingCustomRole, setIsAddingCustomRole] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchStorageLocations();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const userList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(userList);
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Failed to fetch users');
    }
    setLoading(false);
  };

  const fetchRoles = async () => {
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
  };

  const fetchStorageLocations = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'masterGudang'));
      const locationList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StorageLocation[];
      setStorageLocations(locationList);
    } catch (error) {
      console.error('Error fetching storage locations:', error);
      message.error('Failed to fetch storage locations');
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    setIsAddingCustomRole(false);
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

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsAddingCustomRole(user.isCustomRole || false);
    form.setFieldsValue({
      ...user,
      permissions: user.permissions || {
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

  const handleDeleteUser = async (user: User) => {
    try {
      await deleteDoc(doc(db, 'users', user.id));
      
      try {
        // Firebase Auth doesn't have a direct getUserByEmail method
        // We would need to use a different approach to get the user by email
        // This is a simplified approach - in a real app, you might need to store the UID separately
        console.log('Attempting to delete Firebase Auth user for email:', user.email);
        // Since we can't directly get a user by email, we'll just log the attempt
        // In a real app, you would need to store the Firebase Auth UID with the user record
      } catch (error) {
        console.error('Error deleting Firebase Auth user:', error);
        // Continue even if Firebase Auth user deletion fails
      }

      message.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      message.error('Failed to delete user');
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Prepare user data
      const userData = {
        name: values.name,
        email: values.email,
        role: values.role,
        storageLocation: values.storageLocation,
        storageLocationDescription: values.storageLocationDescription,
        permissions: values.permissions || {},
        isCustomRole: values.role === 'custom',
        id: editingUser ? editingUser.id : 'temp-id', // Will be replaced with Firebase Auth UID for new users
        customRoleName: values.customRoleName || undefined
      };
      
      // Handle custom role
      if (values.role === 'custom' && values.customRoleName) {
        // Save custom role to roles collection
        const roleData = {
          name: values.customRoleName,
          defaultPermissions: values.permissions || {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const roleDocRef = await addDoc(collection(db, 'roles'), roleData);
        userData.role = roleDocRef.id;
        userData.customRoleName = values.customRoleName;
      }
      
      if (editingUser) {
        // Update existing user - convert to plain object to avoid type issues with updateDoc
        const userDataForUpdate = { ...userData };
        await updateDoc(doc(db, 'users', editingUser.id), userDataForUpdate);
        message.success('User updated successfully');
      } else {
        // Create new user in Firebase Auth
        try {
          const auth = getAuth();
          const userCredential = await createUserWithEmailAndPassword(auth, values.email, 'temppassword');
          const fbUser = userCredential.user;
          
          // Save user data to Firestore
          await setDoc(doc(db, 'users', fbUser.uid), {
            ...userData,
            id: fbUser.uid,
            createdAt: new Date().toISOString()
          });
          
          message.success('User added successfully');
        } catch (error) {
          console.error('Error creating Firebase Auth user:', error);
          message.error('Failed to create user in Firebase Auth');
          return;
        }
      }
      
      setIsModalVisible(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      message.error('Failed to save user: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleRoleChange = (value: string) => {
    setIsAddingCustomRole(value === 'custom');
    
    // Set default permissions based on selected role
    if (value === 'superadmin') {
      form.setFieldsValue({
        permissions: {
          viewInventory: true,
          manageInventory: true,
          approveRequests: true,
          generateReports: true,
          manageUsers: true,
          transferStock: true,
          adjustStock: true,
          createReservation: true,
          createWO: true,
          processWO: true,
          manageRoles: true,
          viewAllLocations: true,
        }
      });
    } else if (value === 'adminLogistik') {
      form.setFieldsValue({
        permissions: {
          viewInventory: true,
          manageInventory: true,
          approveRequests: true,
          generateReports: true,
          manageUsers: true,
          transferStock: true,
          adjustStock: true,
          createReservation: true,
          createWO: true,
          processWO: true,
          manageRoles: true,
          viewAllLocations: true,
        }
      });
    } else if (value === 'petugasLogistik') {
      form.setFieldsValue({
        permissions: {
          viewInventory: true,
          manageInventory: true,
          approveRequests: false,
          generateReports: true,
          manageUsers: false,
          transferStock: true,
          adjustStock: true,
          createReservation: false,
          createWO: true,
          processWO: true,
          manageRoles: false,
          viewAllLocations: false,
        }
      });
    } else if (value === 'user') {
      form.setFieldsValue({
        permissions: {
          viewInventory: true,
          manageInventory: false,
          approveRequests: false,
          generateReports: false,
          manageUsers: false,
          transferStock: false,
          adjustStock: false,
          createReservation: true,
          createWO: false,
          processWO: false,
          manageRoles: false,
          viewAllLocations: false,
        }
      });
    } else if (value !== 'custom') {
      // Set permissions from custom role
      const selectedRole = roles.find(r => r.id === value);
      if (selectedRole) {
        form.setFieldsValue({
          permissions: selectedRole.defaultPermissions
        });
      }
    }
  };

  const handleStorageLocationChange = (value: string) => {
    const selectedLocation = storageLocations.find(loc => loc.storageLocation === value);
    if (selectedLocation) {
      form.setFieldsValue({
        storageLocationDescription: selectedLocation.storageLocationDescription
      });
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string, record: User) => {
        if (record.isCustomRole && record.customRoleName) {
          return record.customRoleName;
        }
        
        if (role === 'superadmin') return 'Super Admin';
        if (role === 'adminLogistik') return 'Admin Logistik';
        if (role === 'petugasLogistik') return 'Petugas Logistik';
        if (role === 'user') return 'User';
        
        // Try to find custom role name
        const customRole = roles.find(r => r.id === role);
        return customRole ? customRole.name : role;
      }
    },
    {
      title: 'Storage Location',
      dataIndex: 'storageLocation',
      key: 'storageLocation',
      render: (loc: string, record: User) => {
        if (record.storageLocationDescription) {
          return `${loc} - ${record.storageLocationDescription}`;
        }
        return loc;
      }
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_: unknown, record: User) => {
        const permCount = record.permissions ? Object.values(record.permissions).filter(Boolean).length : 0;
        return `${permCount} permissions enabled`;
      }
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: User) => (
        <span>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
            style={{ marginRight: 8 }}
          >
            Edit
          </Button>
          <Button
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteUser(record)}
            danger
          >
            Delete
          </Button>
        </span>
      ),
    },
  ];

  return (
    <Card title="Master User" className="p-6">
      <Button 
        icon={<PlusOutlined />}
        onClick={handleAddUser} 
        type="primary" 
        style={{ marginBottom: 16 }}
      >
        Add User
      </Button>
      <Table columns={columns} dataSource={users} rowKey="id" loading={loading} />
      <Modal
        title={editingUser ? 'Edit User' : 'Add User'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Name"
            rules={[
              { required: true, message: 'Please input the name!' },
              { min: 3, message: 'Name must be at least 3 characters' },
            ]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please input the email!' },
              { type: 'email', message: 'Please enter a valid email!' },
            ]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item
            name="storageLocation"
            label="Gudang (Storage Location)"
            rules={[{ required: true, message: 'Please select a storage location!' }]}
            tooltip="Gudang yang akan dikelola oleh user ini. User hanya dapat melihat dan mengelola data untuk gudang ini."
          >
            <Select
              showSearch
              placeholder="Select a storage location"
              optionFilterProp="children"
              onChange={handleStorageLocationChange}
              filterOption={(input, option) =>
                (option?.children as unknown as string).toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {storageLocations.map(location => (
                <Select.Option key={location.id} value={location.storageLocation}>
                  {location.storageLocation} - {location.storageLocationDescription} {location.parentUnit ? `(${location.parentUnit})` : ''}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="storageLocationDescription"
            label="Storage Location Description"
            hidden
          >
            <Input disabled />
          </Form.Item>
          
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Please select a role!' }]}
            tooltip="Role menentukan hak akses default user. Anda dapat menyesuaikan hak akses di bawah."
          >
            <Select onChange={handleRoleChange}>
              <Select.Option value="superadmin">Super Admin</Select.Option>
              <Select.Option value="adminLogistik">Admin Logistik</Select.Option>
              <Select.Option value="petugasLogistik">Petugas Logistik</Select.Option>
              <Select.Option value="user">User</Select.Option>
              {roles.map(role => (
                <Select.Option key={role.id} value={role.id}>
                  {role.name}
                </Select.Option>
              ))}
              <Select.Option value="custom">+ Tambah Role Baru</Select.Option>
            </Select>
          </Form.Item>
          
          {isAddingCustomRole && (
            <Form.Item
              name="customRoleName"
              label="Nama Role Baru"
              rules={[{ required: true, message: 'Please input the role name!' }]}
            >
              <Input />
            </Form.Item>
          )}
          
          <Form.Item 
            label={
              <span>
                Permissions 
                <Tooltip title="Hak akses yang dimiliki user. Centang kotak untuk memberikan akses.">
                  <InfoCircleOutlined style={{ marginLeft: 8 }} />
                </Tooltip>
              </span>
            }
          >
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

export default MasterUser;
