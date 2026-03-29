import React, { useState } from 'react';
import { 
  Form, Input, DatePicker, message, 
  Button, Card, Row, Col, InputNumber, Radio, Alert
} from 'antd';
import { 
  SaveOutlined, SendOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import moment from 'moment';

interface TransaksiMasukFormData {
  nomorSPBKontrak: string;
  tanggal: moment.Moment;
  normalisasiNumber: string;
  namaMaterial: string;
  fungsi: string;
  penyedia: string;
  tanggalTiba: moment.Moment;
  noPO: string;
  qtyPesan: number;
  jenisMaterial: 'umum' | 'eksklusif';
}

const TransaksiMasuk: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedTransaksiId, setSavedTransaksiId] = useState<string | null>(null);
  const [formModified, setFormModified] = useState(false);
  
  // Monitor form changes
  const onFormChange = () => {
    // If a transaction has been saved, mark the form as modified
    if (savedTransaksiId) {
      setFormModified(true);
    }
  };

  const handleSubmit = async (values: TransaksiMasukFormData) => {
    try {
      setLoading(true);
      
      // Prepare data for Firestore
      const transaksiData = {
        ...values,
        tanggal: values.tanggal.format('YYYY-MM-DD'),
        tanggalTiba: values.tanggalTiba.format('YYYY-MM-DD'),
        normalisasiNumber: values.normalisasiNumber || '',
        qtyDiterima: 0, // Will be filled by logistics officer
        status: 'draft',
        arsipLengkap: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add to transaksiMasuk collection
      const docRef = await addDoc(collection(db, 'transaksiMasuk'), transaksiData);
      
      console.log('Transaksi added successfully with ID:', docRef.id);
      message.success('Transaksi berhasil ditambahkan dan tersimpan di Monitoring Masuk');
      setSuccess(true);
      setSavedTransaksiId(docRef.id);
      setFormModified(false); // Reset form modification flag
      
      // TIDAK mereset form setelah simpan, agar data bisa dikirim ke WO Penerimaan
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
      
    } catch (error) {
      console.error('Error saving transaksi:', error);
      message.error(`Gagal menyimpan transaksi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWO = async () => {
    try {
      if (!savedTransaksiId) {
        message.warning('Silakan simpan transaksi terlebih dahulu sebelum mengirim ke WO Penerimaan');
        return;
      }
      
      setLoading(true);
      
      // Get the saved transaksi document
      const transaksiDocRef = doc(db, 'transaksiMasuk', savedTransaksiId);
      const values = form.getFieldsValue();
      
      // Create a new WO in workOrdersPenerimaan collection
      const woData = {
        nomorWO: `WO-${Date.now().toString().slice(-6)}`,
        nomorDokumen: values.nomorSPBKontrak,
        tanggal: values.tanggal.format('YYYY-MM-DD'),
        status: 'pending',
        deskripsiMaterial: values.namaMaterial,
        kategori: values.jenisMaterial === 'eksklusif' ? 'Material Eksklusif' : 'Material Umum',
        petugas: '',
        materials: [
          {
            key: `material-${Date.now()}`,
            materialDescription: values.namaMaterial,
            quantity: values.qtyPesan,
            qtyDiterima: 0, // To be filled by logistics officer
            satuan: 'Unit',
            kondisi: 'Baik',
            normalisasiNumber: values.normalisasiNumber,
            fungsi: values.fungsi,
            penyedia: values.penyedia,
            noPO: values.noPO
          }
        ],
        keterangan: '',
        transaksiMasukId: savedTransaksiId, // Store the TransaksiMasuk ID in the WO
        createdAt: serverTimestamp()
      };

      // Add WO to workOrdersPenerimaan collection
      const woRef = await addDoc(collection(db, 'workOrdersPenerimaan'), woData);
      
      // Update transaksi with WO reference and change status
      await updateDoc(transaksiDocRef, {
        woId: woRef.id,
        status: 'proses',
        updatedAt: serverTimestamp()
      });

      message.success('Work Order berhasil dibuat dan dikirim ke petugas logistik.');
      setSuccess(true);
      
      // Reset form and state after successful submission
      form.resetFields();
      setSavedTransaksiId(null); // Reset saved transaction ID
      setFormModified(false); // Reset form modification flag
      
      // Set default values
      form.setFieldsValue({
        tanggal: moment(),
        tanggalTiba: moment(),
        jenisMaterial: 'umum',
        qtyPesan: 1
      });
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
      
    } catch (error) {
      console.error('Error sending WO:', error);
      message.error(`Gagal membuat Work Order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      title="Form Transaksi Masuk"
      className="shadow-sm"
      bordered={false}
    >
      {success && (
        <Alert
          message="Transaksi Berhasil Disimpan"
          description="Data transaksi telah berhasil disimpan dan siap untuk diproses."
          type="success"
          showIcon
          closable
          className="mb-4"
        />
      )}
      
      <Form 
        form={form} 
        layout="vertical" 
        onFinish={handleSubmit}
        onFieldsChange={onFormChange}
        initialValues={{
          tanggal: moment(),
          tanggalTiba: moment(),
          jenisMaterial: 'umum',
          qtyPesan: 1
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              name="nomorSPBKontrak" 
              label="Nomor SPB/Kontrak" 
              rules={[{ required: true, message: 'Nomor SPB/Kontrak wajib diisi' }]}
            >
              <Input placeholder="Masukkan nomor SPB/Kontrak" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              name="tanggal" 
              label="Tanggal" 
              rules={[{ required: true, message: 'Tanggal wajib diisi' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              name="normalisasiNumber" 
              label="Normalisasi" 
              rules={[{ required: false }]}
            >
              <Input placeholder="Masukkan nomor normalisasi" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              name="namaMaterial" 
              label="Nama Material" 
              rules={[{ required: true, message: 'Nama material wajib diisi' }]}
            >
              <Input placeholder="Masukkan nama material" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              name="fungsi" 
              label="Fungsi" 
              rules={[{ required: true, message: 'Fungsi wajib diisi' }]}
            >
              <Input placeholder="Masukkan fungsi" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              name="penyedia" 
              label="Penyedia" 
              rules={[{ required: true, message: 'Penyedia wajib diisi' }]}
            >
              <Input placeholder="Masukkan penyedia" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              name="tanggalTiba" 
              label="Tanggal Tiba" 
              rules={[{ required: true, message: 'Tanggal tiba wajib diisi' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD-MM-YYYY" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              name="noPO" 
              label="No PO" 
              rules={[{ required: true, message: 'No PO wajib diisi' }]}
            >
              <Input placeholder="Masukkan nomor PO" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item 
              name="qtyPesan" 
              label="QTY Pesan" 
              rules={[{ required: true, message: 'QTY pesan wajib diisi' }]}
            >
              <InputNumber style={{ width: '100%' }} min={1} placeholder="Masukkan jumlah pesanan" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item 
              name="jenisMaterial" 
              label="Jenis Material" 
              rules={[{ required: true, message: 'Jenis material wajib diisi' }]}
            >
              <Radio.Group>
                <Radio value="umum">Material Umum</Radio>
                <Radio value="eksklusif">Material Eksklusif</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
        </Row>

        <div className="flex justify-end mt-4">
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            disabled={loading || (savedTransaksiId !== null && !formModified)}
            icon={<SaveOutlined />}
            style={{ marginRight: 8 }}
            title={savedTransaksiId && !formModified ? 'Transaksi sudah tersimpan' : 'Simpan transaksi'}
          >
            Simpan Transaksi
          </Button>
          <Button 
            type="primary" 
            onClick={handleSendWO} 
            loading={loading}
            disabled={!savedTransaksiId}
            icon={<SendOutlined />}
            style={{ backgroundColor: savedTransaksiId ? '#52c41a' : '#b7eb8f' }}
            title={!savedTransaksiId ? 'Simpan transaksi terlebih dahulu' : 'Kirim ke WO Penerimaan'}
          >
            Kirim ke WO Penerimaan
          </Button>
        </div>
      </Form>
      
      <div className="mt-4">
        <Alert
          message="Informasi"
          description={
            <div>
              <p>Form ini digunakan untuk membuat transaksi material masuk baru.</p>
              <p>Setelah menyimpan transaksi, Anda dapat mengirimkannya ke WO Penerimaan untuk diproses lebih lanjut.</p>
              <p>Data yang disimpan juga akan muncul di Monitoring Masuk.</p>
            </div>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      </div>
    </Card>
  );
};

export default TransaksiMasuk;
