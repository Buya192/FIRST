import React from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import logger from '../utils/logger';

const Login: React.FC = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    // Simulate login process
    logger.info('Login: Simulating login process');
    // Redirect to dashboard after login
    navigate('/');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Button
        type="primary"
        onClick={handleLogin}
        size="large"
      >
        Login
      </Button>
    </div>
  );
};

export default Login;