import React from 'react';
import { FaBoxes, FaExchangeAlt, FaChartLine, FaClipboardList } from 'react-icons/fa';

const Dashboard: React.FC = () => {
  // Mock data for dashboard stats
  const stats = [
    { title: 'Total Inventory', value: 1234, icon: FaBoxes, color: 'bg-blue-500' },
    { title: 'Transactions Today', value: 56, icon: FaExchangeAlt, color: 'bg-green-500' },
    { title: 'Active Reservations', value: 23, icon: FaClipboardList, color: 'bg-yellow-500' },
    { title: 'Low Stock Items', value: 7, icon: FaChartLine, color: 'bg-red-500' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className={`${stat.color} rounded-full p-3 mr-4`}>
                <stat.icon className="text-white text-2xl" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-700">{stat.title}</h2>
                <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Transactions</h2>
          {/* Add a table or list of recent transactions here */}
          <p className="text-gray-600">No recent transactions to display.</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Inventory Status</h2>
          {/* Add a chart or graph showing inventory status here */}
          <p className="text-gray-600">Inventory status chart coming soon.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
