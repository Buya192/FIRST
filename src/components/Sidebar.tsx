import React, { useMemo, useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import {
  DashboardOutlined,
  DatabaseOutlined,
  CalendarOutlined,
  UserOutlined,
  HomeOutlined,
  ExportOutlined,
  StockOutlined,
  ImportOutlined,
  RollbackOutlined,
  MonitorOutlined,
  FileSearchOutlined,
  AuditOutlined,
  ToolOutlined,
  AppstoreOutlined,
  GoogleOutlined,
  LogoutOutlined,
  ProfileOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import logger from '../utils/logger';

const { Sider } = Layout;
const { SubMenu } = Menu;

interface SidebarProps {
  collapsed: boolean;
}

// Tipe data untuk menu item
interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  link?: string;
  children?: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loginWithGoogle, logout } = useAppContext();
  const [showAllItems] = useState(true);

  // Menu items, termasuk Milestone Rusak dan Milestone Baik
  const menuItems: MenuItem[] = useMemo(() => [
    { key: '/', icon: <DashboardOutlined />, label: 'Dashboard', link: '/' },
    {
      key: 'master',
      icon: <DatabaseOutlined />,
      label: 'Master',
      children: [
        { key: '/master-data', label: 'Master Data', link: '/master-data', icon: <DatabaseOutlined /> },
        { key: '/master-gudang', label: 'Master Gudang', link: '/master-gudang', icon: <HomeOutlined /> },
        { key: '/master-user', label: 'Master User', link: '/master-user', icon: <UserOutlined /> },
        { key: '/master-stock-awal', label: 'Master Stock Awal', link: '/master-stock-awal', icon: <StockOutlined /> },
        { key: '/upload-data-cutoff', label: 'Upload Data Cut Off', link: '/upload-data-cutoff', icon: <ImportOutlined /> },
      ],
    },
    {
      key: 'material-management',
      icon: <ProfileOutlined />,
      label: 'Material Management',
      children: [
        { key: '/reservasi', label: 'Reservasi', link: '/reservasi', icon: <CalendarOutlined /> },
        { key: '/daftar-reservasi', label: 'Daftar Reservasi', link: '/daftar-reservasi', icon: <FileSearchOutlined /> },
        { key: '/status-layanan-reservasi', label: 'Status Layanan Reservasi', link: '/status-layanan-reservasi', icon: <BarChartOutlined /> },
        { key: '/stock-material', label: 'Stock Material', link: '/stock-material', icon: <StockOutlined /> },
        { key: '/stock-sap', label: 'Stock SAP', link: '/stock-sap', icon: <DatabaseOutlined /> },
      ],
    },
    {
      key: 'request-fulfillment',
      icon: <CheckCircleOutlined />,
      label: 'Request Fulfillment',
      children: [
        { key: '/mutasi-keluar', label: 'Mutasi Keluar', link: '/mutasi-keluar', icon: <ExportOutlined /> },
        { key: '/mr-realization', label: 'MR Realization', link: '/mr-realization', icon: <FileProtectOutlined /> },
        { key: '/persetujuan-material', label: 'Persetujuan Material', link: '/persetujuan-material', icon: <SafetyOutlined /> },
        { key: '/berita-acara', label: 'Berita Acara', link: '/berita-acara', icon: <FileDoneOutlined /> },
        { key: '/surat-jalan', label: 'Surat Jalan', link: '/surat-jalan', icon: <FileTextOutlined /> },
      ],
    },
    {
      key: 'transaksi',
      icon: <ExportOutlined />,
      label: 'Transaksi',
      children: [
        { key: '/transaksi-masuk', label: 'Transaksi Masuk', link: '/transaksi-masuk', icon: <ImportOutlined /> },
        { key: '/pengembalian-material', label: 'Pengembalian Material', link: '/pengembalian-material', icon: <RollbackOutlined /> },
      ],
    },
    {
      key: 'monitoring',
      icon: <MonitorOutlined />,
      label: 'Monitoring',
      children: [
        {
          key: 'wo-material-pengembalian',
          label: 'WO Material Pengembalian',
          icon: <FileSearchOutlined />,
          children: [
            { key: '/wo-petugas-logistik', label: 'WO Petugas Logistik', link: '/wo-petugas-logistik', icon: <ToolOutlined /> },
            { key: '/wo-finalisasi-akuntansi', label: 'WO Finalisasi Akuntansi', link: '/wo-finalisasi-akuntansi', icon: <AuditOutlined /> },
          ],
        },
        { key: '/wo-fulfillment', label: 'WO Fulfillment', link: '/wo-fulfillment', icon: <FileDoneOutlined /> },
        { key: '/wo-penerimaan', label: 'WO Penerimaan', link: '/wo-penerimaan', icon: <ImportOutlined /> },
        { key: '/monitoring-masuk', label: 'Monitoring Masuk', link: '/monitoring-masuk', icon: <FileSearchOutlined /> },
        { key: '/rencana-kedatangan', label: 'Rencana Kedatangan', link: '/rencana-kedatangan', icon: <CalendarOutlined /> },
        { key: '/monitoring-milestone', label: 'Monitoring Milestone', link: '/monitoring-milestone', icon: <FileSearchOutlined /> },
        // Submenu Milestone Status sudah digantikan oleh menu Monitoring Milestone
      ],
    },
    {
      key: 'inventarisasi',
      icon: <AppstoreOutlined />,  // Ikon untuk menu Inventarisasi
      label: 'Inventarisasi',
      children: [
        { key: '/invent-rusak', label: 'Invent Rusak', link: '/invent-rusak', icon: <ToolOutlined /> },
        { key: '/invent-normal', label: 'Invent Normal', link: '/invent-normal', icon: <ToolOutlined /> },
        { key: '/invent-eks-bongkar', label: 'Invent Eks Bongkar', link: '/invent-eks-bongkar', icon: <ToolOutlined /> },
      ],
    },
  ], []);

  // Filter menu berdasarkan peran pengguna
  const filteredMenuItems = useMemo(() => {
    logger.info('Sidebar: Filtering menu items');
    return menuItems.map(item => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(() => showAllItems),
        };
      }
      return item;
    });
  }, [menuItems, showAllItems]);

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (error) {
      logger.error('Error logging in with Google:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      logger.error('Error logging out:', error);
    }
  };

  logger.info('Sidebar: Rendering', { pathname: location.pathname });

  return (
    <Sider trigger={null} collapsible collapsed={collapsed} className="min-h-screen">
      <div className="h-8 m-4 bg-opacity-60" />
      {!user ? (
        <div style={{ padding: '0 16px', marginBottom: '16px' }}>
          <Button
            type="primary"
            icon={<GoogleOutlined />}
            onClick={handleGoogleLogin}
            style={{ width: '100%' }}
          >
            Login with Google
          </Button>
        </div>
      ) : (
        <div style={{ padding: '0 16px', marginBottom: '16px' }}>
          <Button
            type="primary"
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ width: '100%' }}
          >
            Logout
          </Button>
        </div>
      )}
      <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]}>
        {filteredMenuItems.map(item => {
          if (item.children) {
            return (
              <SubMenu key={item.key} icon={item.icon} title={item.label}>
                {item.children.map(child => {
                  if (child.children) {
                    return (
                      <SubMenu key={child.key} icon={child.icon} title={child.label}>
                        {child.children.map((grandchild: MenuItem) => (
                          <Menu.Item key={grandchild.key} icon={grandchild.icon}>
                            <Link to={grandchild.link || '/default-path'}>{grandchild.label}</Link>
                          </Menu.Item>
                        ))}
                      </SubMenu>
                    );
                  }
                  return (
                    <Menu.Item key={child.key} icon={child.icon}>
                      <Link to={child.link || '/default-path'}>{child.label}</Link>
                    </Menu.Item>
                  );
                })}
              </SubMenu>
            );
          }
          return (
            <Menu.Item key={item.key} icon={item.icon}>
              <Link to={item.link || '/default-path'}>{item.label}</Link>
            </Menu.Item>
          );
        })}
      </Menu>
    </Sider>
  );
};

export default Sidebar;
