import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'antd';
import { ExclamationCircleOutlined, HomeOutlined } from '@ant-design/icons';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full px-6 py-8 bg-white shadow-md rounded-lg">
        <div className="text-center">
          <ExclamationCircleOutlined style={{ fontSize: '64px', color: '#faad14', marginBottom: '16px' }} />
          <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-600 mb-4">Page Not Found</h2>
          <p className="text-gray-500 mb-8">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <Link to="/">
            <Button type="primary" size="large" icon={<HomeOutlined />}>
              Go back home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;