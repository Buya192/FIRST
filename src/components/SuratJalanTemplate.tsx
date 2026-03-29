import React from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

interface Material {
  materialDescription: string;
  normalisasi: string;
  valuationType: string;
  qtyPermintaan: number;
  qtyAmbil: number;
  merek: string;
  satuan: string;
}

interface SuratJalanData {
  id?: string;
  nomorSJ: string;
  tanggal: string;
  nomorWO: string;
  nomorReservasi: string;
  nomorKontrak: string;
  pekerjaan: string;
  tujuan: string;
  pelaksana: string;
  yangMengangkut: string;
  petugasGudang: string;
  jenisKendaraan: string;
  nomorPolisi: string;
  materials: Material[];
  catatan?: string;
  createdAt: string;
}

interface SuratJalanTemplateProps {
  data: SuratJalanData;
}

const SuratJalanTemplate: React.FC<SuratJalanTemplateProps> = ({ data }) => {
  return (
    <div style={{ 
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '12px',
      lineHeight: '1.4',
      color: '#333',
      background: 'white',
      maxWidth: '210mm',
      margin: '0 auto',
      padding: '15mm',
      minHeight: '297mm'
    }}>
      {/* Header Section */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '25px',
        paddingBottom: '15px',
        borderBottom: '2px solid #1e40af'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img 
            src="/src/assets/Logo_PLN.svg.png" 
            alt="PLN Logo" 
            style={{ width: '60px', height: '60px', objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af', marginBottom: '2px' }}>
              PLN
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '1px' }}>
              UIW NUSA TENGGARA TIMUR
            </div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e40af' }}>
              UP3 KUPANG
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '11px', color: '#666' }}>
          <strong style={{ color: '#1e40af', fontSize: '12px' }}>Nomor: {data.nomorSJ}</strong><br />
          <span>Tanggal: {dayjs(data.tanggal).format('DD/MM/YYYY')}</span>
        </div>
      </div>

      {/* Document Title */}
      <div style={{ textAlign: 'center', margin: '25px 0' }}>
        <div style={{
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#1e40af',
          letterSpacing: '1px',
          marginBottom: '8px'
        }}>
          TANDA TERIMA MATERIAL DARI GUDANG
        </div>
        <div style={{ fontSize: '14px', color: '#666', fontWeight: 'normal' }}>
          Material Delivery Receipt
        </div>
      </div>

      {/* Info Section */}
      <div style={{
        background: '#f8fafc',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        borderLeft: '4px solid #1e40af'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '500', color: '#666' }}>Pada hari ini:</span>
            <span style={{ fontWeight: 'bold', color: '#1e40af' }}>
              {dayjs(data.tanggal).format('dddd')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '500', color: '#666' }}>Tanggal:</span>
            <span style={{ fontWeight: 'bold', color: '#1e40af' }}>
              {dayjs(data.tanggal).format('DD.MM.YYYY')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '500', color: '#666' }}>Jam:</span>
            <span style={{ fontWeight: 'bold', color: '#1e40af' }}>
              {dayjs(data.tanggal).format('HH:mm')} WITA
            </span>
          </div>
        </div>

        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af', marginBottom: '8px' }}>
            Telah diterima material sesuai:
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '8px'
          }}>
            <div style={{ fontSize: '11px' }}>
              <span style={{ fontWeight: '500', color: '#666' }}>• Nomor SPM:</span>{' '}
              <span style={{ fontWeight: 'bold', color: '#333' }}>{data.nomorWO}</span>
            </div>
            <div style={{ fontSize: '11px' }}>
              <span style={{ fontWeight: '500', color: '#666' }}>• Nomor Kontrak:</span>{' '}
              <span style={{ fontWeight: 'bold', color: '#333' }}>{data.nomorKontrak}</span>
            </div>
            <div style={{ fontSize: '11px' }}>
              <span style={{ fontWeight: '500', color: '#666' }}>• Pekerjaan:</span>{' '}
              <span style={{ fontWeight: 'bold', color: '#333' }}>{data.pekerjaan}</span>
            </div>
            <div style={{ fontSize: '11px' }}>
              <span style={{ fontWeight: '500', color: '#666' }}>• Tujuan:</span>{' '}
              <span style={{ fontWeight: 'bold', color: '#333' }}>{data.tujuan}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Material Table */}
      <div style={{ margin: '25px 0' }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#1e40af',
          marginBottom: '15px',
          paddingBottom: '5px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          Daftar Material
        </div>
        
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '2px solid #1e40af',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <thead>
            <tr>
              <th style={{
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                color: 'white',
                fontWeight: 'bold',
                padding: '12px 8px',
                textAlign: 'center',
                fontSize: '11px',
                borderBottom: '2px solid #1e40af',
                width: '8%'
              }}>
                NO
              </th>
              <th style={{
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                color: 'white',
                fontWeight: 'bold',
                padding: '12px 8px',
                textAlign: 'center',
                fontSize: '11px',
                borderBottom: '2px solid #1e40af',
                width: '40%'
              }}>
                NAMA MATERIAL
              </th>
              <th style={{
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                color: 'white',
                fontWeight: 'bold',
                padding: '12px 8px',
                textAlign: 'center',
                fontSize: '11px',
                borderBottom: '2px solid #1e40af',
                width: '12%'
              }}>
                SATUAN
              </th>
              <th style={{
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                color: 'white',
                fontWeight: 'bold',
                padding: '12px 8px',
                textAlign: 'center',
                fontSize: '11px',
                borderBottom: '2px solid #1e40af',
                width: '12%'
              }}>
                VOLUME
              </th>
              <th style={{
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                color: 'white',
                fontWeight: 'bold',
                padding: '12px 8px',
                textAlign: 'center',
                fontSize: '11px',
                borderBottom: '2px solid #1e40af',
                width: '28%'
              }}>
                KETERANGAN
              </th>
            </tr>
          </thead>
          <tbody>
            {data.materials.map((material, index) => (
              <tr key={index} style={{
                backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white'
              }}>
                <td style={{
                  padding: '10px 8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontSize: '11px',
                  textAlign: 'center',
                  verticalAlign: 'top'
                }}>
                  {index + 1}
                </td>
                <td style={{
                  padding: '10px 8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#333',
                  verticalAlign: 'top'
                }}>
                  {material.materialDescription}
                </td>
                <td style={{
                  padding: '10px 8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontSize: '11px',
                  textAlign: 'center',
                  verticalAlign: 'top'
                }}>
                  {material.satuan || 'PCS'}
                </td>
                <td style={{
                  padding: '10px 8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontSize: '11px',
                  textAlign: 'center',
                  verticalAlign: 'top'
                }}>
                  {material.qtyAmbil}
                </td>
                <td style={{
                  padding: '10px 8px',
                  borderBottom: '1px solid #e2e8f0',
                  fontSize: '11px',
                  fontStyle: 'italic',
                  color: '#666',
                  verticalAlign: 'top'
                }}>
                  Perubahan Daya ke 555kVA lokasi Univ.Pertahanan Atambua
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Transport Info */}
      <div style={{
        background: '#f0f9ff',
        padding: '15px',
        borderRadius: '8px',
        margin: '20px 0',
        borderLeft: '4px solid #0ea5e9'
      }}>
        <p style={{ marginBottom: '8px', fontSize: '12px' }}>
          <strong style={{ color: '#0ea5e9' }}>Dari Gudang PDP:</strong> Kuanino - Dalam keadaan <strong>BAIK dan GENAP</strong>
        </p>
        <p style={{ marginBottom: '8px', fontSize: '12px' }}>
          <strong style={{ color: '#0ea5e9' }}>Diangkut dengan kendaraan Nomor Polisi:</strong> {data.nomorPolisi || '_______________'}
        </p>
        <p style={{ marginBottom: '0', fontSize: '12px' }}>
          <strong style={{ color: '#0ea5e9' }}>Jenis Kendaraan:</strong> {data.jenisKendaraan}
        </p>
      </div>

      {/* Signature Section */}
      <div style={{
        marginTop: '40px',
        paddingTop: '20px',
        borderTop: '1px solid #e2e8f0'
      }}>
        <div style={{
          textAlign: 'right',
          marginBottom: '30px',
          fontSize: '12px',
          color: '#666'
        }}>
          Kupang, <strong style={{ color: '#1e40af' }}>
            {dayjs(data.tanggal).format('DD MMMM YYYY')}
          </strong>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          marginTop: '20px'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '15px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: '#fafafa'
          }}>
            <div style={{
              fontWeight: 'bold',
              fontSize: '12px',
              color: '#1e40af',
              marginBottom: '50px'
            }}>
              YANG MENGANGKUT
            </div>
            <div style={{
              fontWeight: 'bold',
              fontSize: '11px',
              color: '#333',
              borderTop: '1px solid #333',
              paddingTop: '5px',
              marginTop: '40px'
            }}>
              {data.yangMengangkut}
            </div>
            <div style={{
              fontSize: '10px',
              color: '#666',
              marginTop: '5px'
            }}>
              Pihak Pelaksana
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            padding: '15px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            background: '#fafafa'
          }}>
            <div style={{
              fontWeight: 'bold',
              fontSize: '12px',
              color: '#1e40af',
              marginBottom: '50px'
            }}>
              PETUGAS GUDANG
            </div>
            <div style={{
              fontWeight: 'bold',
              fontSize: '11px',
              color: '#333',
              borderTop: '1px solid #333',
              paddingTop: '5px',
              marginTop: '40px'
            }}>
              {data.petugasGudang}
            </div>
            <div style={{
              fontSize: '10px',
              color: '#666',
              marginTop: '5px'
            }}>
              PLN UP3 Kupang
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '40px',
        paddingTop: '15px',
        borderTop: '2px solid #1e40af',
        textAlign: 'center',
        fontSize: '10px',
        color: '#666'
      }}>
        <div style={{ fontWeight: '500', marginBottom: '5px' }}>
          Jalan Palapa No. 27 Oebobo, Kupang 85111, Nusa Tenggara Timur
        </div>
        <div style={{ fontSize: '9px' }}>
          Website: www.pln.co.id/ntt | Fax: (0380) 832198 | Telp: (0380) 821217
        </div>
      </div>
    </div>
  );
};

export default SuratJalanTemplate;
