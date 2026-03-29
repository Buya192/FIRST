import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Typography, Tabs, Badge, Tag, Space, 
  Button, Tooltip, Input, Modal, message, Alert,
  Row, Col, Statistic, Switch, Progress, Spin
} from 'antd';
import { 
  SearchOutlined, ReloadOutlined, SyncOutlined,
  CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined,
  InboxOutlined, EyeOutlined, EditOutlined, DeleteOutlined,
  CloudSyncOutlined, LinkOutlined, ExclamationCircleOutlined,
  ClockCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import SimplifiedMonitoringTable from './SimplifiedMonitoringTable';
import { marketplaceSync } from '../services/marketplaceSync';
import moment from 'moment';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

interface SyncStats {
  isConnected: boolean;
  lastSyncTime: Date | null;
  connectionStatus: string;
}

interface SyncResult {
  success: boolean;
  newItems: number;
  updatedItems: number;
  errors: string[];
}

export const EnhancedMonitoringMasukWithSync: React.FC = () => {
  const [syncStats, setSyncStats] = useState<SyncStats>({
    isConnected: false,
    lastSyncTime: null,
    connectionStatus: 'Disconnected'
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncInterval, setSyncInterval] = useState<NodeJS.Timeout | null>(null);
  const [realApiMode, setRealApiMode] = useState(true);

  useEffect(() => {
    // Initialize sync stats and set real API mode by default
    marketplaceSync.setRealApiMode(true);
    updateSyncStats();
    
    // Cleanup interval on unmount
    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, []);

  const updateSyncStats = () => {
    const stats = marketplaceSync.getSyncStats();
    setSyncStats(stats);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const connected = await marketplaceSync.connect();
      if (connected) {
        const modeText = realApiMode ? 'Real API' : 'Mock Mode';
        message.success(`✅ Connected to PLN Marketplace (${modeText})`);
        updateSyncStats();
      } else {
        message.error('❌ Failed to connect to PLN Marketplace');
      }
    } catch (error) {
      message.error(`Connection failed: ${error}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    marketplaceSync.disconnect();
    setAutoSyncEnabled(false);
    if (syncInterval) {
      clearInterval(syncInterval);
      setSyncInterval(null);
    }
    updateSyncStats();
    message.info('🔌 Disconnected from PLN Marketplace');
  };

  const handleSync = async () => {
    if (!syncStats.isConnected) {
      message.warning('Please connect to PLN Marketplace first');
      return;
    }

    setIsSyncing(true);
    try {
      const result = await marketplaceSync.syncFromMarketplace();
      setLastSyncResult(result);
      updateSyncStats();
      
      if (result.success) {
        message.success(
          `✅ Sync completed: ${result.newItems} new items, ${result.updatedItems} updated`
        );
      } else {
        message.warning(
          `⚠️ Sync completed with errors: ${result.errors.length} errors`
        );
      }
    } catch (error) {
      message.error(`Sync failed: ${error}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAutoSyncToggle = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    
    if (enabled && syncStats.isConnected) {
      // Start auto sync every 5 minutes
      const interval = setInterval(() => {
        handleSync();
      }, 5 * 60 * 1000);
      setSyncInterval(interval);
      message.info('🔄 Auto-sync enabled (every 5 minutes)');
    } else {
      if (syncInterval) {
        clearInterval(syncInterval);
        setSyncInterval(null);
      }
      message.info('⏸️ Auto-sync disabled');
    }
  };

  const handleRealApiModeToggle = (enabled: boolean) => {
    if (syncStats.isConnected) {
      message.warning('Please disconnect first before changing API mode');
      return;
    }
    
    setRealApiMode(enabled);
    marketplaceSync.setRealApiMode(enabled);
    message.info(`🔧 API Mode switched to: ${enabled ? 'Real API' : 'Demo Mode'}`);
  };

  const renderSyncStatusCard = () => (
    <Card 
      size="small"
      style={{ 
        marginBottom: 16,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <Row align="middle" justify="space-between" gutter={[16, 8]}>
        {/* Left Section - Status & Info */}
        <Col xs={24} sm={12} md={10}>
          <Space size="large">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <CloudSyncOutlined style={{ fontSize: '16px', marginRight: '6px', color: '#1890ff' }} />
              <Text strong style={{ fontSize: '14px' }}>PLN Marketplace:</Text>
              <Tag 
                color={syncStats.isConnected ? 'success' : 'error'}
                style={{ marginLeft: 4 }}
              >
                {syncStats.isConnected ? 'Connected' : 'Disconnected'}
              </Tag>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <ClockCircleOutlined style={{ fontSize: '14px', marginRight: '4px', color: '#666' }} />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Last: {syncStats.lastSyncTime ? moment(syncStats.lastSyncTime).format('DD/MM HH:mm') : 'Never'}
              </Text>
            </div>
          </Space>
        </Col>

        {/* Center Section - Controls */}
        <Col xs={24} sm={12} md={8}>
          <Space>
            {!syncStats.isConnected ? (
              <Button 
                type="primary" 
                size="small"
                icon={<LinkOutlined />}
                loading={isConnecting}
                onClick={handleConnect}
              >
                Connect
              </Button>
            ) : (
              <Button 
                danger 
                size="small"
                icon={<CloseCircleOutlined />}
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            )}
            
            <Button
              size="small"
              icon={isSyncing ? <Spin size="small" /> : <SyncOutlined />}
              loading={isSyncing}
              disabled={!syncStats.isConnected}
              onClick={handleSync}
            >
              Sync
            </Button>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Text style={{ fontSize: '12px', marginRight: 4 }}>Auto:</Text>
              <Switch
                size="small"
                checked={autoSyncEnabled}
                onChange={handleAutoSyncToggle}
                disabled={!syncStats.isConnected}
              />
            </div>
          </Space>
        </Col>

        {/* Right Section - API Mode */}
        <Col xs={24} sm={24} md={6}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <Text style={{ fontSize: '12px', marginRight: 6 }}>Mode:</Text>
            <Switch
              size="small"
              checked={realApiMode}
              onChange={handleRealApiModeToggle}
              disabled={syncStats.isConnected}
              checkedChildren="Real"
              unCheckedChildren="Demo"
            />
          </div>
        </Col>
      </Row>

      {/* Sync Result - Only show if exists */}
      {lastSyncResult && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
          <Space size="large" wrap>
            <Text style={{ fontSize: '12px' }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
              {lastSyncResult.newItems} new
            </Text>
            <Text style={{ fontSize: '12px' }}>
              <SyncOutlined style={{ color: '#1890ff', marginRight: 4 }} />
              {lastSyncResult.updatedItems} updated
            </Text>
            {lastSyncResult.errors.length > 0 && (
              <Tooltip 
                title={
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Sync Errors:</div>
                    {lastSyncResult.errors.map((error, index) => (
                      <div key={index} style={{ fontSize: '11px', marginBottom: 2 }}>
                        • {error}
                      </div>
                    ))}
                  </div>
                }
                placement="bottomLeft"
              >
                <Text type="danger" style={{ fontSize: '12px', cursor: 'pointer' }}>
                  <ExclamationCircleOutlined style={{ marginRight: 4 }} />
                  {lastSyncResult.errors.length} errors
                </Text>
              </Tooltip>
            )}
            <Button 
              type="text" 
              size="small" 
              icon={<CloseCircleOutlined />}
              onClick={() => setLastSyncResult(null)}
              style={{ padding: 0, height: 'auto' }}
            />
          </Space>
        </div>
      )}
    </Card>
  );


  return (
    <div className="p-6">
      {/* Marketplace Integration Status */}
      {renderSyncStatusCard()}
      
      {/* Simplified Monitoring Table Component */}
      <SimplifiedMonitoringTable />
    </div>
  );
};

export default EnhancedMonitoringMasukWithSync;
