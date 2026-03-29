import React, { useState, useEffect } from 'react';
import { 
  Tabs, Card, Table, Input, Button, Upload, Tooltip, Modal, Form, 
  Select, message, Tag, Space, Row, Col, Statistic, Popconfirm
} from 'antd';
import { 
  SearchOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, 
  QrcodeOutlined, UploadOutlined, ExportOutlined, EyeOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import moment from 'moment';

const { TabPane } = Tabs;
const { Option } = Select;

interface MaterialItem {
  id: string;
  nomorWO: string;
  nomorDokumen: string;
  tanggal: string;
  pengembali: string;
  petugas: string;
  kategori: string;
  materialDescription: string;
  quantity: number;
  satuan: string;
  kondisi: string;
  lokasiPenyimpanan: string;
  catatan?: string;
  foto1?: string;
  foto2?: string;
  foto3?: string;
  merek?: string;
  nomorSeri?: string;
  daya?: number;
  jenisBahan?: string; // Besi, Logam Campuran, Alumunium, Custom
  berat?: number; // dalam kg
  jenisMilestone: string;
  collectionName: string;
}

const MonitoringMilestone: React.FC = () => {
  // State untuk data
  const [data, setData] = useState<MaterialItem[]>([]);
  const [filteredData, setFilteredData] = useState<MaterialItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [kondisiFilter, setKondisiFilter] = useState<string | null>(null);
  const [kategoriFilter, setKategoriFilter] = useState<string | null>(null);

  // State untuk loading
  const [loadingData, setLoadingData] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  // Fungsi untuk mengambil data dari semua koleksi
  const fetchAllData = async () => {
    setLoadingData(true);
    try {
      // Fetch data from all four collections
      const [baikUmumSnapshot, rusakUmumSnapshot, baikEksklusifSnapshot, rusakEksklusifSnapshot] = await Promise.all([
        getDocs(collection(db, 'milestoneBaik')),
        getDocs(collection(db, 'milestoneRusak')),
        getDocs(collection(db, 'milestoneBaikEksklusif')),
        getDocs(collection(db, 'milestoneRusakEksklusif'))
      ]);

      // Process data from each collection
      const baikUmumData = baikUmumSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        jenisMilestone: 'baikUmum',
        collectionName: 'milestoneBaik'
      })) as MaterialItem[];

      const rusakUmumData = rusakUmumSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        jenisMilestone: 'rusakUmum',
        collectionName: 'milestoneRusak'
      })) as MaterialItem[];

      const baikEksklusifData = baikEksklusifSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        jenisMilestone: 'baikEksklusif',
        collectionName: 'milestoneBaikEksklusif'
      })) as MaterialItem[];

      const rusakEksklusifData = rusakEksklusifSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        jenisMilestone: 'rusakEksklusif',
        collectionName: 'milestoneRusakEksklusif'
      })) as MaterialItem[];

      // Combine all data
      const allData = [...baikUmumData, ...rusakUmumData, ...baikEksklusifData, ...rusakEksklusifData];
      
      setData(allData);
      applyFilters(allData, activeTab, searchTerm, kondisiFilter, kategoriFilter);
      
      message.success('Data berhasil dimuat');
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Gagal mengambil data milestone');
    } finally {
      setLoadingData(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fungsi untuk menerapkan filter
  const applyFilters = (
    sourceData: MaterialItem[], 
    tab: string, 
    search: string, 
    kondisi: string | null, 
    kategori: string | null
  ) => {
    let result = [...sourceData];
    
    // Filter berdasarkan tab
    if (tab !== 'all') {
      result = result.filter(item => item.jenisMilestone === tab);
    }
    
    // Filter berdasarkan pencarian
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(item => 
        item.nomorDokumen.toLowerCase().includes(searchLower) ||
        item.materialDescription.toLowerCase().includes(searchLower) ||
        item.nomorWO.toLowerCase().includes(searchLower) ||
        (item.nomorSeri && item.nomorSeri.toLowerCase().includes(searchLower))
      );
    }
    
    // Filter berdasarkan kondisi
    if (kondisi) {
      result = result.filter(item => item.kondisi === kondisi);
    }
    
    // Filter berdasarkan kategori
    if (kategori) {
      if (kategori === 'Umum') {
        result = result.filter(item => 
          item.jenisMilestone === 'baikUmum' || 
          item.jenisMilestone === 'rusakUmum'
        );
      } else if (kategori === 'Eksklusif') {
        result = result.filter(item => 
          item.jenisMilestone === 'baikEksklusif' || 
          item.jenisMilestone === 'rusakEksklusif'
        );
      }
    }
    
    setFilteredData(result);
  };

  // Handler untuk perubahan tab
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    applyFilters(data, key, searchTerm, kondisiFilter, kategoriFilter);
  };

  // Handler untuk pencarian
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    applyFilters(data, activeTab, value, kondisiFilter, kategoriFilter);
  };

  // Handler untuk filter kondisi
  const handleKondisiFilter = (value: string | null) => {
    setKondisiFilter(value);
    applyFilters(data, activeTab, searchTerm, value, kategoriFilter);
  };

  // Handler untuk filter kategori
  const handleKategoriFilter = (value: string | null) => {
    setKategoriFilter(value);
    applyFilters(data, activeTab, searchTerm, kondisiFilter, value);
  };

  // Handler untuk hapus
  const handleDelete = async (record: MaterialItem) => {
    try {
      setDeletingId(record.id);
      
      // Hapus dokumen dari Firestore
      const docRef = doc(db, record.collectionName, record.id);
      await deleteDoc(docRef);
      
      // Update data lokal
      const updatedData = data.filter(item => 
        !(item.id === record.id && item.collectionName === record.collectionName)
      );
      
      setData(updatedData);
      applyFilters(updatedData, activeTab, searchTerm, kondisiFilter, kategoriFilter);
      
      message.success('Data berhasil dihapus');
    } catch (error) {
      console.error('Error deleting data:', error);
      message.error('Gagal menghapus data');
    } finally {
      setDeletingId(null);
    }
  };

  // Handler untuk hapus semua
  const handleDeleteAll = async () => {
    if (activeTab === 'all') {
      message.warning('Pilih tab spesifik untuk menghapus semua data');
      return;
    }
    
    try {
      setDeletingAll(true);
      
      let collectionName = '';
      switch (activeTab) {
        case 'baikUmum':
          collectionName = 'milestoneBaik';
          break;
        case 'rusakUmum':
          collectionName = 'milestoneRusak';
          break;
        case 'baikEksklusif':
          collectionName = 'milestoneBaikEksklusif';
          break;
        case 'rusakEksklusif':
          collectionName = 'milestoneRusakEksklusif';
          break;
      }
      
      if (!collectionName) return;
      
      // Ambil semua dokumen dari koleksi
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      // Hapus semua dokumen
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Update data lokal
      const updatedData = data.filter(item => item.collectionName !== collectionName);
      setData(updatedData);
      applyFilters(updatedData, activeTab, searchTerm, kondisiFilter, kategoriFilter);
      
      message.success('Semua data berhasil dihapus');
    } catch (error) {
      console.error('Error deleting all data:', error);
      message.error('Gagal menghapus semua data');
    } finally {
      setDeletingAll(false);
    }
  };

  // Handler untuk export data
  const handleExportData = () => {
    try {
      // Konversi data ke format CSV
      const headers = [
        'Jenis Milestone', 'Nomor WO', 'Nomor Dokumen', 'Tanggal', 
        'Pengembali', 'Petugas', 'Kategori', 'Material Description',
        'Quantity', 'Satuan', 'Kondisi', 'Lokasi Penyimpanan',
        'Merek', 'Nomor Seri', 'Daya (kVA)', 'Jenis Bahan', 'Berat (kg)', 'Catatan'
      ];
      
      const csvRows = [headers.join(',')];
      
      filteredData.forEach(item => {
        const jenisMilestone = getJenisMilestoneLabel(item.jenisMilestone);
        const row = [
          jenisMilestone,
          item.nomorWO || '',
          item.nomorDokumen || '',
          item.tanggal || '',
          item.pengembali || '',
          item.petugas || '',
          item.kategori || '',
          `"${(item.materialDescription || '').replace(/"/g, '""')}"`,
          item.quantity || 0,
          item.satuan || '',
          item.kondisi || '',
          `"${(item.lokasiPenyimpanan || '').replace(/"/g, '""')}"`,
          item.merek || '',
          item.nomorSeri || '',
          item.daya || '',
          item.jenisBahan || 'Besi',
          item.berat?.toFixed(2) || '0.00',
          `"${(item.catatan || '').replace(/"/g, '""')}"`
        ];
        
        csvRows.push(row.join(','));
      });
      
      const csvContent = csvRows.join('\n');
      
      // Buat file CSV dan download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `milestone_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success('Data berhasil diekspor');
    } catch (error) {
      console.error('Error exporting data:', error);
      message.error('Gagal mengekspor data');
    }
  };

  // Fungsi untuk mendapatkan label jenis milestone
  const getJenisMilestoneLabel = (jenisMilestone?: string) => {
    switch (jenisMilestone) {
      case 'baikUmum':
        return 'Baik (Umum)';
      case 'rusakUmum':
        return 'Rusak (Umum)';
      case 'baikEksklusif':
        return 'Baik (Eksklusif)';
      case 'rusakEksklusif':
        return 'Rusak (Eksklusif)';
      default:
        return 'Unknown';
    }
  };

  // Definisi kolom tabel
  const getColumns = () => {
    const baseColumns = [
      { 
        title: 'Jenis', 
        dataIndex: 'jenisMilestone', 
        key: 'jenisMilestone',
        width: 120,
        render: (jenis: string) => {
          if (jenis === 'baikUmum') return <Tag color="green">Baik (Umum)</Tag>;
          if (jenis === 'rusakUmum') return <Tag color="red">Rusak (Umum)</Tag>;
          if (jenis === 'baikEksklusif') return <Tag color="blue">Baik (Eksklusif)</Tag>;
          if (jenis === 'rusakEksklusif') return <Tag color="orange">Rusak (Eksklusif)</Tag>;
          return <Tag>Unknown</Tag>;
        },
        filters: [
          { text: 'Baik (Umum)', value: 'baikUmum' },
          { text: 'Rusak (Umum)', value: 'rusakUmum' },
          { text: 'Baik (Eksklusif)', value: 'baikEksklusif' },
          { text: 'Rusak (Eksklusif)', value: 'rusakEksklusif' },
        ],
        onFilter: (value: any, record: MaterialItem) => record.jenisMilestone === value,
      },
      { title: 'Nomor WO', dataIndex: 'nomorWO', key: 'nomorWO', width: 120 },
      { title: 'Nomor Dokumen', dataIndex: 'nomorDokumen', key: 'nomorDokumen', width: 180 },
      { 
        title: 'Tanggal', 
        dataIndex: 'tanggal', 
        key: 'tanggal', 
        width: 120,
        render: (date: string) => moment(date).format('DD-MM-YYYY'),
        sorter: (a: MaterialItem, b: MaterialItem) => {
          const dateA = new Date(a.tanggal).getTime();
          const dateB = new Date(b.tanggal).getTime();
          return dateA - dateB;
        }
      },
      { title: 'Pengembali', dataIndex: 'pengembali', key: 'pengembali', width: 150 },
      { title: 'Petugas', dataIndex: 'petugas', key: 'petugas', width: 150 },
      { title: 'Kategori', dataIndex: 'kategori', key: 'kategori', width: 150 },
      { title: 'Material Description', dataIndex: 'materialDescription', key: 'materialDescription', width: 200 },
      { 
        title: 'Quantity', 
        dataIndex: 'quantity', 
        key: 'quantity', 
        width: 100,
        sorter: (a: MaterialItem, b: MaterialItem) => a.quantity - b.quantity
      },
      { title: 'Satuan', dataIndex: 'satuan', key: 'satuan', width: 100 },
      { 
        title: 'Kondisi', 
        dataIndex: 'kondisi', 
        key: 'kondisi', 
        width: 100,
        render: (kondisi: string) => {
          if (kondisi === 'Baik') return <Tag color="green">Baik</Tag>;
          if (kondisi === 'Rusak') return <Tag color="red">Rusak</Tag>;
          return <Tag>{kondisi}</Tag>;
        },
        filters: [
          { text: 'Baik', value: 'Baik' },
          { text: 'Rusak', value: 'Rusak' },
        ],
        onFilter: (value: any, record: MaterialItem) => record.kondisi === value,
      },
      { 
        title: 'Jenis Bahan', 
        dataIndex: 'jenisBahan', 
        key: 'jenisBahan', 
        width: 150,
        render: (jenisBahan: string) => jenisBahan || 'Besi',
        filters: [
          { text: 'Besi', value: 'Besi' },
          { text: 'Logam Campuran', value: 'Logam Campuran' },
          { text: 'Alumunium', value: 'Alumunium' },
          { text: 'Custom', value: 'Custom' },
        ],
        onFilter: (value: any, record: MaterialItem) => (record.jenisBahan || 'Besi') === value,
      },
      { 
        title: 'Berat (kg)', 
        dataIndex: 'berat', 
        key: 'berat', 
        width: 120,
        render: (berat: number) => berat?.toFixed(2) || '0.00',
        sorter: (a: MaterialItem, b: MaterialItem) => (a.berat || 0) - (b.berat || 0)
      },
      { title: 'Lokasi Penyimpanan', dataIndex: 'lokasiPenyimpanan', key: 'lokasiPenyimpanan', width: 200 },
    ];

    // Kolom eksklusif yang hanya ditampilkan jika ada data eksklusif
    const exclusiveColumns = [
      { title: 'Merek', dataIndex: 'merek', key: 'merek', width: 150 },
      { title: 'Nomor Seri', dataIndex: 'nomorSeri', key: 'nomorSeri', width: 150 },
      { 
        title: 'Daya (kVA)', 
        dataIndex: 'daya', 
        key: 'daya', 
        width: 120,
        sorter: (a: MaterialItem, b: MaterialItem) => (a.daya || 0) - (b.daya || 0)
      },
      {
        title: 'Foto 1',
        dataIndex: 'foto1',
        key: 'foto1',
        width: 150,
        render: (foto1: string) => foto1 ? <img src={foto1} alt="Foto 1" style={{ maxWidth: 100 }} /> : null,
      },
      {
        title: 'Foto 2',
        dataIndex: 'foto2',
        key: 'foto2',
        width: 150,
        render: (foto2: string) => foto2 ? <img src={foto2} alt="Foto 2" style={{ maxWidth: 100 }} /> : null,
      },
      {
        title: 'Foto 3',
        dataIndex: 'foto3',
        key: 'foto3',
        width: 150,
        render: (foto3: string) => foto3 ? <img src={foto3} alt="Foto 3" style={{ maxWidth: 100 }} /> : null,
      },
    ];

    // Kolom aksi
    const actionColumn = {
      title: 'Aksi',
      key: 'action',
      fixed: 'right' as const,
      width: 200,
      render: (_: any, record: MaterialItem) => (
        <Space size="small">
          <Tooltip title="Lihat Detail">
            <Button
              type="primary"
              icon={<EyeOutlined />}
              size="middle"
              ghost
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="primary"
              icon={<EditOutlined />}
              size="middle"
              ghost
            />
          </Tooltip>
          <Tooltip title="Hapus">
            <Popconfirm
              title="Apakah Anda yakin ingin menghapus data ini?"
              onConfirm={() => handleDelete(record)}
              okText="Ya"
              cancelText="Tidak"
              icon={<InfoCircleOutlined style={{ color: 'red' }} />}
            >
              <Button
                type="primary"
                danger
                icon={<DeleteOutlined />}
                loading={record.id === deletingId}
                size="middle"
                ghost
              />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="Generate QR Code">
            <Button
              type="primary"
              icon={<QrcodeOutlined />}
              size="middle"
              ghost
            />
          </Tooltip>
        </Space>
      ),
    };

    // Selalu tampilkan kolom eksklusif jika tab yang dipilih adalah eksklusif
    const showExclusiveColumns = activeTab === 'baikEksklusif' || activeTab === 'rusakEksklusif' || 
      filteredData.some(item => item.jenisMilestone === 'baikEksklusif' || item.jenisMilestone === 'rusakEksklusif');

    return showExclusiveColumns 
      ? [...baseColumns, ...exclusiveColumns, actionColumn]
      : [...baseColumns, actionColumn];
  };

  // Statistik
  const stats = {
    total: data.length,
    baik: data.filter(item => item.kondisi === 'Baik').length,
    rusak: data.filter(item => item.kondisi === 'Rusak').length,
    umum: data.filter(item => item.jenisMilestone === 'baikUmum' || item.jenisMilestone === 'rusakUmum').length,
    eksklusif: data.filter(item => item.jenisMilestone === 'baikEksklusif' || item.jenisMilestone === 'rusakEksklusif').length,
  };

  return (
    <Card title="Monitoring Milestone" className="p-6">
      {/* Statistik Dashboard */}
      <div style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={4}>
            <Card>
              <Statistic title="Total Milestone" value={stats.total} />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic title="Kondisi Baik" value={stats.baik} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic title="Kondisi Rusak" value={stats.rusak} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic title="Material Umum" value={stats.umum} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic title="Material Eksklusif" value={stats.eksklusif} valueStyle={{ color: '#722ed1' }} />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Tabs */}
      <Tabs defaultActiveKey="all" onChange={handleTabChange}>
        <TabPane tab="Semua Milestone" key="all" />
        <TabPane tab="Baik (Umum)" key="baikUmum" />
        <TabPane tab="Rusak (Umum)" key="rusakUmum" />
        <TabPane tab="Baik (Eksklusif)" key="baikEksklusif" />
        <TabPane tab="Rusak (Eksklusif)" key="rusakEksklusif" />
      </Tabs>

      {/* Filter dan Pencarian */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Input
            placeholder="Cari Nomor Dokumen atau Material"
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 300 }}
          />
          <Select 
            placeholder="Filter Kondisi" 
            style={{ width: 150 }}
            onChange={handleKondisiFilter}
            allowClear
          >
            <Option value="Baik">Baik</Option>
            <Option value="Rusak">Rusak</Option>
          </Select>
          <Select 
            placeholder="Filter Kategori" 
            style={{ width: 150 }}
            onChange={handleKategoriFilter}
            allowClear
          >
            <Option value="Umum">Umum</Option>
            <Option value="Eksklusif">Eksklusif</Option>
          </Select>
        </div>
        <div>
          <Button 
            icon={<ExportOutlined />} 
            onClick={handleExportData} 
            style={{ marginRight: 8 }}
          >
            Export
          </Button>
          <Upload>
            <Button icon={<UploadOutlined />} style={{ marginRight: 8 }}>Import</Button>
          </Upload>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchAllData} 
            loading={loadingData} 
            style={{ marginRight: 8 }}
          >
            Refresh
          </Button>
          <Popconfirm
            title="Apakah Anda yakin ingin menghapus semua data?"
            onConfirm={handleDeleteAll}
            okText="Ya"
            cancelText="Tidak"
            icon={<InfoCircleOutlined style={{ color: 'red' }} />}
          >
            <Button 
              danger 
              loading={deletingAll}
            >
              Hapus Semua
            </Button>
          </Popconfirm>
        </div>
      </div>

      {/* Tabel */}
      <Table
        columns={getColumns()}
        dataSource={filteredData}
        rowKey={(record) => `${record.collectionName}-${record.id}`}
        pagination={{ pageSize: 50 }}
        scroll={{ x: 2500, y: 500 }}
        expandable={{
          expandedRowRender: record => (
            <div style={{ margin: 0 }}>
              <p><strong>Catatan:</strong> {record.catatan || 'Tidak ada catatan'}</p>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                {record.foto1 && <img src={record.foto1} alt="Foto 1" style={{ maxWidth: 200 }} />}
                {record.foto2 && <img src={record.foto2} alt="Foto 2" style={{ maxWidth: 200 }} />}
                {record.foto3 && <img src={record.foto3} alt="Foto 3" style={{ maxWidth: 200 }} />}
              </div>
            </div>
          ),
        }}
        loading={loadingData}
      />
    </Card>
  );
};

export default MonitoringMilestone;
