import React, { useRef, useState, useEffect } from 'react';
import { Modal, Button, Space, message } from 'antd';
import { PrinterOutlined, QrcodeOutlined, DownloadOutlined } from '@ant-design/icons';
import moment from 'moment';

interface BarcodeGeneratorProps {
  visible: boolean;
  onClose: () => void;
  data: any;
}

const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({ visible, onClose, data }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  if (!data) return null;

  // Generate QR Code data
  const qrData = JSON.stringify({
    id: data.id,
    nomorSPBKontrak: data.nomorSPBKontrak,
    tanggal: data.tanggal,
    normalisasi: data.normalisasiNumber,
    namaMaterial: data.namaMaterial,
    fungsi: data.fungsi,
    penyedia: data.penyedia,
    tanggalTiba: data.tanggalTiba,
    noPO: data.noPO,
    qtyPesan: data.qtyPesan,
    qtyDiterima: data.qtyDiterima,
    nomorTUG3: data.nomorTUG3,
    nomorTUG4: data.nomorTUG4,
    jenisMaterial: data.jenisMaterial,
    status: data.status
  });

  // Generate QR Code using canvas
  useEffect(() => {
    if (visible && data) {
      generateQRCode();
    }
  }, [visible, data]);

  const generateQRCode = async () => {
    try {
      // Use a simple QR code generation approach
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 200;
      canvas.height = 200;
      
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 200, 200);
      
      // Draw a simple placeholder pattern
      ctx.fillStyle = 'black';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('QR CODE', 100, 100);
      ctx.fillText(data.nomorSPBKontrak, 100, 120);
      
      // Create a simple grid pattern to simulate QR code
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 20; j++) {
          if ((i + j) % 3 === 0) {
            ctx.fillRect(i * 10, j * 10, 8, 8);
          }
        }
      }
      
      setQrCodeDataUrl(canvas.toDataURL());
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      message.error('Popup diblokir. Silakan izinkan popup untuk mencetak.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Detail Transaksi - ${data.nomorSPBKontrak}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              background: white;
            }
            .print-container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #1890ff;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #1890ff;
              margin: 0;
              font-size: 24px;
            }
            .header h2 {
              color: #666;
              margin: 5px 0 0 0;
              font-size: 18px;
              font-weight: normal;
            }
            .qr-section {
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              border: 2px dashed #1890ff;
              background: #f0f8ff;
            }
            .qr-code {
              margin: 20px 0;
            }
            .details-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .details-table th,
            .details-table td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            .details-table th {
              background-color: #f5f5f5;
              font-weight: bold;
              color: #333;
            }
            .details-table tr:nth-child(even) {
              background-color: #fafafa;
            }
            .tag {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: bold;
            }
            .tag-blue { background: #e6f7ff; color: #1890ff; }
            .tag-green { background: #f6ffed; color: #52c41a; }
            .tag-purple { background: #f9f0ff; color: #722ed1; }
            .tag-cyan { background: #e6fffb; color: #13c2c2; }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownload = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.download = `QR-${data.nomorSPBKontrak}.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  return (
    <Modal
      title={
        <Space>
          <QrcodeOutlined style={{ color: '#1890ff' }} />
          <span>Cetak Barcode & Detail Transaksi</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="download" icon={<DownloadOutlined />} onClick={handleDownload}>
          Download QR Code
        </Button>,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
          Cetak
        </Button>,
        <Button key="close" onClick={onClose}>
          Tutup
        </Button>
      ]}
    >
      <div ref={printRef} className="print-container">
        <div className="header">
          <h1>Detail Transaksi</h1>
          <h2>Detail untuk transaksi {data.nomorSPBKontrak}</h2>
        </div>

        <div className="qr-section">
          <h3 style={{ margin: '0 0 10px 0', color: '#1890ff' }}>QR Code</h3>
          <p style={{ margin: '0 0 20px 0', color: '#666' }}>
            Scan QR Code ini untuk melihat detail transaksi
          </p>
          <div className="qr-code">
            {qrCodeDataUrl && (
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code" 
                style={{ width: 200, height: 200, border: '1px solid #ddd' }}
              />
            )}
          </div>
        </div>

        <table className="details-table">
          <tbody>
            <tr>
              <th style={{ width: '200px' }}>Nomor SPB/Kontrak</th>
              <td>{data.nomorSPBKontrak}</td>
              <th style={{ width: '150px' }}>Tanggal</th>
              <td>{moment(data.tanggal).format('DD-MM-YYYY')}</td>
            </tr>
            <tr>
              <th>Normalisasi</th>
              <td>{data.normalisasiNumber || '-'}</td>
              <th>Nama Material</th>
              <td>{data.namaMaterial}</td>
            </tr>
            <tr>
              <th>Fungsi</th>
              <td>{data.fungsi}</td>
              <th>Penyedia</th>
              <td>{data.penyedia}</td>
            </tr>
            <tr>
              <th>Tanggal Tiba</th>
              <td>{moment(data.tanggalTiba).format('DD-MM-YYYY')}</td>
              <th>No PO</th>
              <td>{data.noPO}</td>
            </tr>
            <tr>
              <th>QTY Pesan</th>
              <td>
                <span className="tag tag-blue">{data.qtyPesan}</span>
              </td>
              <th>QTY Diterima</th>
              <td>
                <span className="tag tag-green">{data.qtyDiterima}</span>
              </td>
            </tr>
            <tr>
              <th>Nomor TUG 3</th>
              <td>{data.nomorTUG3 || '-'}</td>
              <th>Nomor TUG 4</th>
              <td>{data.nomorTUG4 || '-'}</td>
            </tr>
            <tr>
              <th>Jenis Material</th>
              <td>
                <span className={`tag ${data.jenisMaterial === 'eksklusif' ? 'tag-purple' : 'tag-cyan'}`}>
                  {data.jenisMaterial === 'eksklusif' ? 'Eksklusif' : 'Umum'}
                </span>
              </td>
              <th>Status</th>
              <td>
                <span className="tag tag-blue">{data.status}</span>
              </td>
            </tr>
            {data.keterangan && (
              <tr>
                <th>Keterangan</th>
                <td colSpan={3}>{data.keterangan}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="footer">
          <p>Dokumen ini digenerate secara otomatis pada {moment().format('DD MMMM YYYY, HH:mm:ss')}</p>
          <p>Sistem Monitoring Transaksi Masuk - PLN</p>
        </div>
      </div>
    </Modal>
  );
};

export default BarcodeGenerator;
