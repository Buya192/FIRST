import React, { useState, useEffect } from 'react';
import { Card, Table, DatePicker, Space, Row, Col, Tabs } from 'antd';
import { Line } from '@ant-design/charts';
import { collection, query, where, getDocs, CollectionReference, Query } from 'firebase/firestore';
import { db } from '../utils/firebase';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface Material {
  materialDescription: string;
  qtyPermintaan: number;
  qtyDilayani: number;
}

interface Reservasi {
  id: string;
  nomorReservasi: string;
  tanggal: string;
  status: string;
  pelaksana: string;
  materials: Material[];
}

const StatusLayananReservasi: React.FC = () => {
  const [reservations, setReservations] = useState<Reservasi[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[moment.Moment, moment.Moment] | null>(null);

  useEffect(() => {
    fetchReservations();
  }, [dateRange]);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const reservasiCollection = collection(db, 'daftarReservasi');
      let reservasiQuery: CollectionReference | Query = reservasiCollection;

      if (dateRange) {
        const [startDate, endDate] = dateRange;
        reservasiQuery = query(
          reservasiCollection,
          where('tanggal', '>=', startDate.toDate()),
          where('tanggal', '<=', endDate.toDate())
        );
      }

      const reservasiSnapshot = await getDocs(reservasiQuery);
      const reservasiList = reservasiSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        materials: doc.data().materials.map((material: Material) => ({
          ...material,
          qtyDilayani: material.qtyDilayani || 0,
        })),
      } as Reservasi));
      setReservations(reservasiList);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Nomor Reservasi',
      dataIndex: 'nomorReservasi',
      key: 'nomorReservasi',
    },
    {
      title: 'Tanggal',
      dataIndex: 'tanggal',
      key: 'tanggal',
      render: (date: string) => moment(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Pelaksana',
      dataIndex: 'pelaksana',
      key: 'pelaksana',
    },
  ];

  const materialColumns = [
    {
      title: 'Material',
      dataIndex: 'materialDescription',
      key: 'materialDescription',
    },
    {
      title: 'Qty Permintaan',
      dataIndex: 'qtyPermintaan',
      key: 'qtyPermintaan',
    },
    {
      title: 'Qty Dilayani',
      dataIndex: 'qtyDilayani',
      key: 'qtyDilayani',
    },
    {
      title: 'Sisa',
      key: 'sisa',
      render: (record: Material) => record.qtyPermintaan - record.qtyDilayani,
    },
  ];

  const getChartData = () => {
    const data = reservations.reduce((acc, reservation) => {
      const date = moment(reservation.tanggal).format('YYYY-MM-DD');
      const existingDate = acc.find(item => item.date === date);
      if (existingDate) {
        existingDate.count += 1;
      } else {
        acc.push({ date, count: 1 });
      }
      return acc;
    }, [] as { date: string; count: number }[]);

    return data.sort((a, b) => moment(a.date).diff(moment(b.date)));
  };

  const config = {
    data: getChartData(),
    xField: 'date',
    yField: 'count',
    point: {
      size: 5,
      shape: 'diamond',
    },
    label: {
      style: {
        fill: '#aaa',
      },
    },
  };

  const getMaterialSummary = () => {
    const summary: { [key: string]: { total: number; dilayani: number } } = {};
    reservations.forEach(reservation => {
      reservation.materials.forEach(material => {
        if (!summary[material.materialDescription]) {
          summary[material.materialDescription] = { total: 0, dilayani: 0 };
        }
        summary[material.materialDescription].total += material.qtyPermintaan;
        summary[material.materialDescription].dilayani += material.qtyDilayani;
      });
    });
    return Object.entries(summary).map(([material, data]) => ({
      material,
      total: data.total,
      dilayani: data.dilayani,
      sisa: data.total - data.dilayani,
    }));
  };

  return (
    <Card title="Status Layanan Reservasi">
      <Space direction="vertical" style={{ width: '100%' }}>
        <RangePicker
          onChange={(dates) => setDateRange(dates as [moment.Moment, moment.Moment])}
          style={{ marginBottom: 16 }}
        />
        <Tabs defaultActiveKey="1">
          <TabPane tab="Visualisasi Data" key="1">
            <Row gutter={16}>
              <Col span={12}>
                <Card title="Grafik Tren Reservasi">
                  <Line {...config} />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Ringkasan Statistik">
                  <p>Total Reservasi: {reservations.length}</p>
                  <p>Reservasi Aktif: {reservations.filter(r => r.status === 'Pending').length}</p>
                  <p>Reservasi Selesai: {reservations.filter(r => r.status === 'Approved').length}</p>
                </Card>
              </Col>
            </Row>
          </TabPane>
          <TabPane tab="Reservasi Diproses" key="2">
            <Table
              columns={columns}
              dataSource={reservations.filter(r => r.status === 'Approved')}
              rowKey="id"
              loading={loading}
              expandable={{
                expandedRowRender: (record) => (
                  <Table
                    columns={materialColumns}
                    dataSource={record.materials}
                    pagination={false}
                    rowKey="materialDescription"
                  />
                ),
              }}
            />
          </TabPane>
          <TabPane tab="Laporan Rinci" key="3">
            <Table
              columns={[
                { title: 'Material', dataIndex: 'material', key: 'material' },
                { title: 'Total Permintaan', dataIndex: 'total', key: 'total' },
                { title: 'Total Dilayani', dataIndex: 'dilayani', key: 'dilayani' },
                { title: 'Sisa', dataIndex: 'sisa', key: 'sisa' },
              ]}
              dataSource={getMaterialSummary()}
              rowKey="material"
              loading={loading}
            />
          </TabPane>
          <TabPane tab="Reservasi Aktif" key="4">
            <Table
              columns={columns}
              dataSource={reservations.filter(r => r.status === 'Pending')}
              rowKey="id"
              loading={loading}
              expandable={{
                expandedRowRender: (record) => (
                  <Table
                    columns={materialColumns}
                    dataSource={record.materials}
                    pagination={false}
                    rowKey="materialDescription"
                  />
                ),
              }}
            />
          </TabPane>
        </Tabs>
      </Space>
    </Card>
  );
};

export default StatusLayananReservasi;
