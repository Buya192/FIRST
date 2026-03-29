import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button, message } from 'antd';
import { PrinterOutlined, DownloadOutlined } from '@ant-design/icons';

interface QRCodeData {
  nomorDokumen: string;
  deskripsiMaterial: string;
  normalisasiNumber?: string;
  quantity: number;
  satuan: string;
  kondisi: string;
  status?: string;
}

const QRCodeGenerator: React.FC<{ data: QRCodeData }> = ({ data }) => {
  const qrCodeValue = JSON.stringify(data);

  const handlePrint = () => {
    try {
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        message.error('Pop-up diblokir oleh browser. Mohon izinkan pop-up untuk mencetak barcode.');
        return;
      }
      
      printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Code</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .qr-container {
              text-align: center;
              border: 1px solid #ddd;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .info {
              margin-top: 20px;
              text-align: left;
            }
            .info p {
              margin: 5px 0;
            }
            h2 {
              margin-top: 0;
              color: #1890ff;
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>Material Barcode</h2>
            <div id="printQRCode"></div>
            <div class="info">
              <p><strong>Nomor SPB/Kontrak:</strong> ${data.nomorDokumen}</p>
              <p><strong>Material:</strong> ${data.deskripsiMaterial}</p>
              <p><strong>Normalisasi:</strong> ${data.normalisasiNumber || '-'}</p>
              <p><strong>QTY:</strong> ${data.quantity} ${data.satuan}</p>
              <p><strong>Kondisi:</strong> ${data.kondisi}</p>
              <p><strong>Status:</strong> ${data.status || 'Aktif'}</p>
            </div>
          </div>
          <script src="https://unpkg.com/react@17/umd/react.production.min.js"></script>
          <script src="https://unpkg.com/react-dom@17/umd/react-dom.production.min.js"></script>
          <script src="https://unpkg.com/qrcode.react@3.1.0/lib/index.min.js"></script>
          <script>
            // Fallback if external scripts fail to load
            window.onerror = function() {
              document.getElementById('printQRCode').innerHTML = 
                '<img src="data:image/svg+xml;base64,' + btoa(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><text x="10" y="20" fill="red">QR Code tidak dapat dimuat</text></svg>'
                ) + '" />';
              return true;
            };
            
            // Render QR code when scripts are loaded
            window.onload = function() {
              try {
                ReactDOM.render(
                  React.createElement(QRCodeSVG, { value: ${JSON.stringify(qrCodeValue)}, size: 256 }),
                  document.getElementById('printQRCode')
                );
                
                // Print after a delay to ensure QR code is rendered
                setTimeout(() => {
                  window.print();
                  // Optional: Close window after printing
                  // setTimeout(() => window.close(), 500);
                }, 1000);
              } catch (e) {
                console.error('Error rendering QR code:', e);
                document.getElementById('printQRCode').innerHTML = 'Error rendering QR code. Please try again.';
              }
            };
          </script>
        </body>
      </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Error opening print window:', error);
      message.error('Gagal membuka jendela cetak. Silakan coba lagi.');
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        border: '1px solid #f0f0f0', 
        borderRadius: '8px', 
        padding: '20px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        backgroundColor: '#fff'
      }}>
        <QRCodeSVG value={qrCodeValue} size={256} />
        <div style={{ marginTop: 16 }}>
          <Button 
            type="primary" 
            size="large"
            icon={<PrinterOutlined />}
            onClick={handlePrint} 
            style={{ marginTop: 16 }}
          >
            Cetak Barcode
          </Button>
          <Button 
            style={{ marginTop: 16, marginLeft: 8 }} 
            icon={<DownloadOutlined />}
            onClick={() => {
              const canvas = document.createElement("canvas");
              const svg = document.querySelector('svg');
              const svgData = new XMLSerializer().serializeToString(svg!);
              const img = new Image();
              img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d")!;
                ctx.drawImage(img, 0, 0);
                const a = document.createElement("a");
                a.download = `barcode-${data.nomorDokumen}.png`;
                a.href = canvas.toDataURL("image/png");
                a.click();
              };
              img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
            }}
          >
            Unduh Gambar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
