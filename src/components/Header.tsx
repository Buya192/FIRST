import React, { useCallback, useMemo } from 'react';
import { Layout, Button } from 'antd';
import { MenuUnfoldOutlined, MenuFoldOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import logger from '../utils/logger';
import logoApp from '../assets/logo app.png';

const { Header } = Layout;

interface HeaderProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

const AppHeader: React.FC<HeaderProps> = React.memo(({ collapsed, toggleSidebar }) => {
  const { user, logout } = useAppContext();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    logger.info('Header: Logout initiated');
    try {
      await logout();
      logger.info('Header: Logout successful');
      navigate('/login');
    } catch (error) {
      logger.error('Header: Logout failed:', error);
    }
  }, [logout, navigate]);

  const logoElement = useMemo(() => (
    <div className="flex items-center">
      <img src="/logo.jpg" alt="Logo" className="h-8 ml-4 mr-2" style={{ borderRadius: '50%' }} />
      <h1 className="text-white text-lg font-bold">FIRST</h1>
    </div>
  ), []);

  const userElement = useMemo(() => (
    <div className="flex items-center">
      <span className="text-white mr-4">{user?.email}</span>
      <div className="w-8 h-8 rounded-full bg-gray-300 mr-2"></div>
    </div>
  ), [user?.email]);

  logger.info('Header: Rendering');

  return (
    <Header className="bg-teal-600 p-0 flex justify-between items-center sticky top-0 z-50 transition-colors duration-300 ease-in-out shadow-md">
      {logoElement}
      <div className="flex items-center">
        {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
          className: 'trigger text-white text-xl mr-4 cursor-pointer hover:text-gray-200 transition-colors duration-200',
          onClick: toggleSidebar,
        })}
        {userElement}
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          className="text-white hover:text-gray-200 mr-4 transition-colors duration-200"
        >
          Logout
        </Button>
      </div>
    </Header>
  );
});

AppHeader.displayName = 'AppHeader';

export default AppHeader;
