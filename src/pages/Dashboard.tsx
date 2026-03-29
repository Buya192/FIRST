import React from 'react';
import logger from '../utils/logger';

const Dashboard: React.FC = () => {
  logger.info('Dashboard: Rendering');

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to the Dashboard</p>
      {/* Add more dashboard content here */}
    </div>
  );
};

export default React.memo(Dashboard);