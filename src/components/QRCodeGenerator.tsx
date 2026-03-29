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
          <title>Print QR Code - ${data.normalisasiNumber || data.nomorDokumen}</title>
          <style>
            @page {
              size: 100mm 150mm; /* Standar ukuran label barcode (4x6 inch) */
              margin: 0;
            }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              margin: 0;
              padding: 10px;
              background-color: #fff;
            }
            .label-container {
              width: 100%;
              max-width: 90mm;
              padding: 15px;
              box-sizing: border-box;
              border: 2px solid #000;
              border-radius: 8px;
              text-align: center;
            }
            .header-section {
              display: flex;
              align-items: center;
              justify-content: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .header-section img {
              height: 40px;
              width: 40px;
              border-radius: 50%;
              margin-right: 15px;
            }
            .header-section h2 {
              margin: 0;
              font-size: 18px;
              font-weight: 800;
              color: #000;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .qr-wrapper {
              margin: 15px 0;
            }
            .info-section {
              text-align: left;
              margin-top: 15px;
              border-top: 1px dashed #000;
              padding-top: 15px;
            }
            .info-row {
              margin-bottom: 8px;
              display: flex;
              flex-direction: column;
            }
            .info-label {
              font-size: 11px;
              color: #555;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .info-value {
              font-size: 14px;
              font-weight: 700;
              color: #000;
            }
            .highlight-value {
              font-size: 18px;
              font-weight: 900;
              background-color: #f0f0f0;
              padding: 4px 8px;
              display: inline-block;
              border-radius: 4px;
              margin-top: 4px;
              border: 1px solid #ccc;
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <div class="header-section">
              <img src="/logo.jpg" alt="Logo" />
              <h2>LABEL MATERIAL</h2>
            </div>

            <div class="qr-wrapper" id="printQRCode"></div>

            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Normalisasi / Material ID</span>
                <span class="info-value highlight-value">${data.normalisasiNumber || data.nomorDokumen}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Deskripsi Material</span>
                <span class="info-value" style="font-size: 13px;">${data.deskripsiMaterial}</span>
              </div>
              <div class="info-row" style="flex-direction: row; justify-content: space-between; margin-top: 10px;">
                <div>
                  <span class="info-label">Quantity</span><br/>
                  <span class="info-value">${data.quantity} ${data.satuan}</span>
                </div>
                <div style="text-align: right;">
                  <span class="info-label">Kondisi</span><br/>
                  <span class="info-value">${data.kondisi}</span>
                </div>
              </div>
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
