import React from 'react';
import { Typography, Card, Row, Col } from 'antd';
import { DashboardOutlined, ShoppingCartOutlined, BarChartOutlined, SettingOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

export const MainPage: React.FC = () => (
  <div className="p-6">
    <Title level={2} className="mb-6 text-center text-gray-800">Welcome to FIRST - Inventory Management System</Title>
    <Paragraph className="text-center text-lg text-gray-600 mb-8">
      Manage your inventory efficiently with our comprehensive solution.
    </Paragraph>

    <Row gutter={[16, 16]} className="mb-8">
      <Col xs={24} sm={12} md={6}>
        <Card className="h-full shadow-md hover:shadow-lg transition-shadow duration-300">
          <DashboardOutlined className="text-4xl text-blue-500 mb-4" />
          <Title level={4}>Dashboard</Title>
          <Paragraph>Get an overview of your inventory status and key metrics.</Paragraph>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card className="h-full shadow-md hover:shadow-lg transition-shadow duration-300">
          <ShoppingCartOutlined className="text-4xl text-green-500 mb-4" />
          <Title level={4}>Transactions</Title>
          <Paragraph>Manage incoming and outgoing materials with ease.</Paragraph>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card className="h-full shadow-md hover:shadow-lg transition-shadow duration-300">
          <BarChartOutlined className="text-4xl text-yellow-500 mb-4" />
          <Title level={4}>Reports</Title>
          <Paragraph>Generate and view detailed reports on your inventory.</Paragraph>
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card className="h-full shadow-md hover:shadow-lg transition-shadow duration-300">
          <SettingOutlined className="text-4xl text-purple-500 mb-4" />
          <Title level={4}>Settings</Title>
          <Paragraph>Customize the system to fit your specific needs.</Paragraph>
        </Card>
      </Col>
    </Row>

    <Paragraph className="text-center text-gray-600">
      Get started by navigating through the menu on the left. If you need any assistance, please contact our support team.
    </Paragraph>
  </div>
);

export default MainPage;