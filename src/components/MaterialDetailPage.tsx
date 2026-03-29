import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';  // Firebase Firestore API
import { db } from '../utils/firebase';  // Firebase config dari file yang sudah Anda sediakan
import { Spin, Alert, Table } from 'antd';  // Ant Design untuk spinner dan alert

interface MaterialItem {
  id: string;
  deskripsiMaterial: string;
  dokumen: string;
  foto: string[];
  kondisi: string;
  lokasiPenyimpanan: string;
  merek: string;
  nomorDokumen: string;
  nomorSeri: string;
  normalisasi: string;
  pengembali: string;
  quantity: number;
  satuan: string;
  tanggal: string;
  daya: string | null;  // null jika tidak ada daya
}

const MaterialDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();  // Ambil ID dari URL
  const [material, setMaterial] = useState<MaterialItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const docRef = doc(db, 'milestoneBaik', id!);  // Menggunakan koleksi 'milestoneBaik'
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setMaterial({ id: docSnap.id, ...docSnap.data() } as MaterialItem);
        } else {
          setError('Data material tidak ditemukan.');
        }
      } catch (error) {
        setError('Gagal mengambil data material. Silakan coba lagi.');
        console.error('Error fetching material:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaterial();
  }, [id]);

  if (loading) {
    return <Spin tip="Loading data..."></Spin>;  // Loading spinner
  }

  if (error) {
    return <Alert message={error} type="error" showIcon />;  // Tampilkan pesan error jika ada
  }

  if (!material) {
    return <p>Data tidak ditemukan!</p>;  // Jika data material tidak ditemukan
  }

  // Tampilkan detail material dalam tabel
  return (
    <div>
      <h1>Detail Material</h1>
      <Table
        dataSource={[
          { key: '1', field: 'Tanggal', value: material.tanggal },
          { key: '2', field: 'Nomor Dokumen', value: material.nomorDokumen },
          { key: '3', field: 'Normalisasi', value: material.normalisasi },
          { key: '4', field: 'Deskripsi Material', value: material.deskripsiMaterial },
          { key: '5', field: 'Quantity', value: material.quantity },
          { key: '6', field: 'Satuan', value: material.satuan },
          { key: '7', field: 'Kondisi', value: material.kondisi },
          { key: '8', field: 'Lokasi Penyimpanan', value: material.lokasiPenyimpanan },
          { key: '9', field: 'Pengembali', value: material.pengembali },
          { key: '10', field: 'Merek', value: material.merek || 'N/A' },
          { key: '11', field: 'Nomor Seri', value: material.nomorSeri || 'N/A' },
          { key: '12', field: 'Daya', value: material.daya ? material.daya : 'N/A' },
          { key: '13', field: 'Dokumen', value: material.dokumen || 'Unknown' }
        ]}
        columns={[
          { title: 'Field', dataIndex: 'field', key: 'field' },
          { title: 'Value', dataIndex: 'value', key: 'value' }
        ]}
        pagination={false}
        bordered
      />
    </div>
  );
};

export default MaterialDetailPage;
