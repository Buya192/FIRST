import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Spin } from 'antd';

const PrivateRoute: React.FC = () => {
  const { user, loading } = useAppContext();

  useEffect(() => {
    console.log('PrivateRoute: Rendered', { user: user?.email, loading });
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      console.log(`PrivateRoute: Render time - ${endTime - startTime}ms`);
    };
  }, [user, loading]);

  if (loading) {
    console.log('PrivateRoute: Loading');
    return <Spin size="large" className="global-spinner" />;
  }

  if (!user) {
    console.log('PrivateRoute: User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  console.log('PrivateRoute: User authenticated, rendering outlet');
  return <Outlet />;
};

export default React.memo(PrivateRoute);