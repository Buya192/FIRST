import React, { useState, useEffect } from 'react';
import { 
  Modal, Row, Col, List, Input, Checkbox, Button, Space, Typography, 
  Card, Tag, message, Empty, Spin, Alert
} from 'antd';
import { 
  SearchOutlined, DatabaseOutlined, CheckOutlined, 
  InfoCircleOutlined, ShoppingCartOutlined
} from '@ant-design/icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../utils/firebase';
import styled from '@emotion/styled';

const { Title, Text } = Typography;
const { Search } = Input;

// Interfaces
interface MaterialGroupItem {
  normalisasi: string;
  materialDescription: string;
  satuan: string;
  stock?: number;
  isActive: boolean;
}

interface MaterialGroup {
  id: string;
  groupName: string;
  description: string;
  materials: MaterialGroupItem[];
  isActive: boolean;
}

interface SelectedMaterial extends MaterialGroupItem {
  qtyPermintaan: number;
}

interface MaterialGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMaterials: (materials: SelectedMaterial[]) => void;
  // Context props untuk stock berdasarkan storage location
  selectedStorageLocation?: string;
  storageLocationDescription?: string;
  companyCode?: string;
  plantDescription?: string;
}

// Styled Components
const StyledCard = styled(Card)`
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 8px;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
  
  &.selected {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
`;

const MaterialCard = styled(Card)`
  margin-bottom: 8px;
  border-radius: 8px;
  
  .ant-card-body {
    padding: 12px;
  }
  
  &.selected {
    background-color: #e6f7ff;
    border-color: #1890ff;
  }
`;

const GroupListContainer = styled.div`
  height: 400px;
  overflow-y: auto;
  padding-right: 8px;
`;

const MaterialListContainer = styled.div`
  height: 400px;
  overflow-y: auto;
  padding-right: 8px;
`;

const PreviewContainer = styled.div`
  max-height: 200px;
  overflow-y: auto;
  background-color: #fafafa;
  border-radius: 6px;
  padding: 12px;
  margin-top: 16px;
`;

const MaterialGroupModal: React.FC<MaterialGroupModalProps> = ({
  visible,
  onClose,
  onSelectMaterials,
  selectedStorageLocation,
  storageLocationDescription,
  companyCode,
  plantDescription
}) => {
  const [materialGroups, setMaterialGroups] = useState<MaterialGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<MaterialGroup | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<SelectedMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupSearchText, setGroupSearchText] = useState('');
  const [materialSearchText, setMaterialSearchText] = useState('');

  // Fetch stock data for specific storage location
  const fetchLocationStock = async (storageLocation?: string) => {
    try {
      let stockQuery;
      if (storageLocation) {
        stockQuery = query(
          collection(db, 'stockMaterial'),
          where('storageLocation', '==', storageLocation)
        );
      } else {
        stockQuery = collection(db, 'stockMaterial');
      }
      
      const stockSnapshot = await getDocs(stockQuery);
      const stockMap: Record<string, number> = {};
      
      stockSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.material && data.stock !== undefined) {
          stockMap[data.material] = (stockMap[data.material] || 0) + data.stock;
        }
      });
      
      console.log(`Stock data for location ${storageLocation}:`, stockMap);
      return stockMap;
    } catch (error) {
      console.error('Error fetching location stock:', error);
      return {};
    }
  };

  // Fetch material groups with location-specific stock
  const fetchMaterialGroupsWithStock = async () => {
    setLoading(true);
    try {
      // 1. Fetch material groups
      const querySnapshot = await getDocs(collection(db, 'materialGroups'));
      const groups: MaterialGroup[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        groups.push({
          id: doc.id,
          groupName: data.groupName,
          description: data.description || `Group untuk ${data.groupName}`,
          materials: data.materials || [],
          isActive: data.isActive !== false
        });
      });
      
      // 2. Fetch stock data for selected storage location
      const stockMap = await fetchLocationStock(selectedStorageLocation);
      
      // 3. Combine groups with location-specific stock
      const groupsWithStock = groups.map(group => ({
        ...group,
        materials: group.materials.map(material => ({
          ...material,
          stock: stockMap[material.normalisasi] || 0
        }))
      }));
      
      setMaterialGroups(groupsWithStock.filter(group => group.isActive));
      console.log('Material groups with stock loaded:', groupsWithStock);
    } catch (error) {
      console.error('Error fetching material groups:', error);
      message.error('Gagal mengambil data material groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchMaterialGroupsWithStock();
    }
  }, [visible, selectedStorageLocation]);

  // Filter groups based on search
  const filteredGroups = materialGroups.filter(group =>
    group.groupName.toLowerCase().includes(groupSearchText.toLowerCase()) ||
    group.description.toLowerCase().includes(groupSearchText.toLowerCase())
  );

  // Filter materials based on search
  const filteredMaterials = selectedGroup?.materials.filter(material =>
    material.materialDescription.toLowerCase().includes(materialSearchText.toLowerCase()) ||
    material.normalisasi.toLowerCase().includes(materialSearchText.toLowerCase())
  ) || [];

  // Handle group selection
  const handleGroupSelect = (group: MaterialGroup) => {
    setSelectedGroup(group);
    setMaterialSearchText('');
  };

  // Handle material checkbox change
  const handleMaterialSelect = (material: MaterialGroupItem, checked: boolean) => {
    if (checked) {
      const newMaterial: SelectedMaterial = {
        ...material,
        qtyPermintaan: 1 // Default quantity
      };
      setSelectedMaterials(prev => [...prev, newMaterial]);
    } else {
      setSelectedMaterials(prev => 
        prev.filter(m => m.normalisasi !== material.normalisasi)
      );
    }
  };

  // Handle quantity change
  const handleQuantityChange = (normalisasi: string, quantity: number) => {
    setSelectedMaterials(prev =>
      prev.map(material =>
        material.normalisasi === normalisasi
          ? { ...material, qtyPermintaan: quantity }
          : material
      )
    );
  };

  // Handle confirm selection
  const handleConfirm = () => {
    if (selectedMaterials.length === 0) {
      message.warning('Silakan pilih minimal satu material');
      return;
    }
    
    onSelectMaterials(selectedMaterials);
    handleClose();
  };

  // Handle close modal
  const handleClose = () => {
    setSelectedGroup(null);
    setSelectedMaterials([]);
    setGroupSearchText('');
    setMaterialSearchText('');
    onClose();
  };

  // Check if material is selected
  const isMaterialSelected = (normalisasi: string) => {
    return selectedMaterials.some(m => m.normalisasi === normalisasi);
  };

  return (
    <Modal
      title={
        <Space direction="vertical" size="small">
          <Space>
            <DatabaseOutlined />
            <span>Pilih Material Berdasarkan Group</span>
          </Space>
          {storageLocationDescription && (
            <Tag color="blue" style={{ fontSize: '12px' }}>
              📍 {storageLocationDescription} ({selectedStorageLocation})
            </Tag>
          )}
        </Space>
      }
      visible={visible}
      onCancel={handleClose}
      width={1200}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Batal
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          icon={<CheckOutlined />}
          onClick={handleConfirm}
          disabled={selectedMaterials.length === 0}
        >
          Tambah {selectedMaterials.length} Material
        </Button>
      ]}
    >
      <Row gutter={16}>
        {/* Left Panel - Groups */}
        <Col span={8}>
          <Card 
            title={
              <Space>
                <DatabaseOutlined />
                <span>Material Groups</span>
              </Space>
            }
            size="small"
          >
            <Search
              placeholder="Cari group..."
              value={groupSearchText}
              onChange={(e) => setGroupSearchText(e.target.value)}
              style={{ marginBottom: 16 }}
              allowClear
            />
            
            <GroupListContainer>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 16 }}>Loading groups...</div>
                </div>
              ) : filteredGroups.length === 0 ? (
                <Empty 
                  description="Tidak ada group yang ditemukan"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                filteredGroups.map((group) => (
                  <StyledCard
                    key={group.id}
                    size="small"
                    className={selectedGroup?.id === group.id ? 'selected' : ''}
                    onClick={() => handleGroupSelect(group)}
                  >
                    <div>
                      <Text strong>{group.groupName}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {group.materials.length} materials
                      </Text>
                    </div>
                  </StyledCard>
                ))
              )}
            </GroupListContainer>
          </Card>
        </Col>

        {/* Right Panel - Materials */}
        <Col span={16}>
          <Card 
            title={
              <Space>
                <ShoppingCartOutlined />
                <span>
                  {selectedGroup ? selectedGroup.groupName : 'Pilih Group'}
                </span>
              </Space>
            }
            size="small"
          >
            {selectedGroup ? (
              <>
                <Search
                  placeholder="Cari material..."
                  value={materialSearchText}
                  onChange={(e) => setMaterialSearchText(e.target.value)}
                  style={{ marginBottom: 16 }}
                  allowClear
                />
                
                <MaterialListContainer>
                  {filteredMaterials.length === 0 ? (
                    <Empty 
                      description="Tidak ada material yang ditemukan"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  ) : (
                    filteredMaterials.map((material) => {
                      const isSelected = isMaterialSelected(material.normalisasi);
                      const selectedMaterial = selectedMaterials.find(m => m.normalisasi === material.normalisasi);
                      
                      return (
                        <MaterialCard
                          key={material.normalisasi}
                          size="small"
                          className={isSelected ? 'selected' : ''}
                        >
                          <Row align="middle">
                            <Col span={2}>
                              <Checkbox
                                checked={isSelected}
                                onChange={(e) => handleMaterialSelect(material, e.target.checked)}
                              />
                            </Col>
                            <Col span={16}>
                              <div>
                                <Text strong>{material.normalisasi}</Text>
                                <br />
                                <Text style={{ fontSize: '12px' }}>
                                  {material.materialDescription}
                                </Text>
                                <br />
                                <Tag color="blue">{material.satuan}</Tag>
                                {material.stock !== undefined && (
                                  <Tag color={material.stock > 0 ? 'green' : 'red'}>
                                    {storageLocationDescription ? 
                                      `Stock di ${storageLocationDescription}: ${material.stock}` : 
                                      `Stock: ${material.stock}`
                                    }
                                  </Tag>
                                )}
                              </div>
                            </Col>
                            <Col span={6}>
                              {isSelected && (
                                <Input
                                  type="number"
                                  min={1}
                                  value={selectedMaterial?.qtyPermintaan || 1}
                                  onChange={(e) => handleQuantityChange(
                                    material.normalisasi, 
                                    Number(e.target.value) || 1
                                  )}
                                  placeholder="Qty"
                                  size="small"
                                />
                              )}
                            </Col>
                          </Row>
                        </MaterialCard>
                      );
                    })
                  )}
                </MaterialListContainer>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <InfoCircleOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                <div style={{ marginTop: 16, color: '#999' }}>
                  Pilih group di sebelah kiri untuk melihat material
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Preview Selected Materials */}
      {selectedMaterials.length > 0 && (
        <PreviewContainer>
          <Title level={5}>
            <CheckOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            Material Terpilih ({selectedMaterials.length})
          </Title>
          <Row gutter={[8, 8]}>
            {selectedMaterials.map((material) => (
              <Col key={material.normalisasi}>
                <Tag 
                  color="blue" 
                  style={{ marginBottom: 4 }}
                  closable
                  onClose={() => handleMaterialSelect(material, false)}
                >
                  {material.normalisasi} (Qty: {material.qtyPermintaan})
                </Tag>
              </Col>
            ))}
          </Row>
        </PreviewContainer>
      )}

      {/* Info Alert */}
      <Alert
        message="Cara Penggunaan"
        description={
          <div>
            <p><strong>Langkah-langkah:</strong></p>
            <ol style={{ marginLeft: 16, marginBottom: 8 }}>
              <li>Pilih group material di panel kiri</li>
              <li>Centang material yang diinginkan di panel kanan</li>
              <li>Atur quantity sesuai kebutuhan</li>
              <li>Klik 'Tambah Material' untuk menambahkan ke form reservasi</li>
            </ol>
            {storageLocationDescription && (
              <p style={{ marginTop: 8, marginBottom: 0 }}>
                <strong>📍 Stock ditampilkan khusus untuk gudang: {storageLocationDescription}</strong>
              </p>
            )}
          </div>
        }
        type="info"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Modal>
  );
};

export default MaterialGroupModal;
