# Implementasi Kirim SAP - Integrasi dengan SAP PLN

## Overview

Implementasi "Kirim SAP" adalah fitur untuk mengirim data MR Realization ke sistem SAP PLN melalui Material Document. Fitur ini terinspirasi dari analisis AGO PLN (Aplikasi Gudang Online) yang menunjukkan bagaimana PLN mengelola mutasi material ke SAP.

## Analisis AGO PLN

Berdasarkan analisis terhadap http://ago.pln.co.id/agodist/#/access/login, kami menemukan:

### Struktur Data AGO PLN
1. **Monitoring Mutasi Material** - Menampilkan kolom "Mat Doc SAP" yang menunjukkan nomor dokumen SAP
2. **Hierarki PLN** - Regional → UIW/UID → UP3 → Gudang
3. **Format Autentikasi** - Menggunakan format `pusat\username` untuk login SAP
4. **Movement Types** - Berbagai jenis transaksi material (201, 261, dll.)

### Workflow AGO PLN
1. **Work Order Creation** - Pembuatan WO untuk pekerjaan
2. **Material Reservation** - Reservasi material untuk WO
3. **Material Issue** - Pengeluaran material dari gudang
4. **SAP Integration** - Pengiriman data ke SAP dengan Material Document

## Arsitektur Implementasi

### Backend (Firebase Functions)

#### 1. SAP Material Document Handler (`admin-functions/src/sap-material-document.ts`)

**Interfaces:**
```typescript
interface SAPMaterialDocumentHeader {
  documentDate: string;        // BLDAT - Document Date
  postingDate: string;         // BUDAT - Posting Date
  documentType: string;        // BLART - Document Type (WE = Goods Issue)
  reference: string;           // XBLNR - Reference Document (Nomor Reservasi)
  headerText: string;          // BKTXT - Header Text
  userName: string;            // USNAM - User Name
  companyCode: string;         // BUKRS - Company Code PLN
}

interface SAPMaterialDocumentItem {
  materialNumber: string;      // MATNR - Material Number (normalisasi)
  plant: string;              // WERKS - Plant (dari fungsi/gudang)
  storageLocation: string;    // LGORT - Storage Location
  movementType: string;       // BWART - Movement Type (201/261)
  quantity: number;           // MENGE - Quantity (qtyAmbil)
  unitOfMeasure: string;      // MEINS - Unit of Measure (satuan)
  batch?: string;             // CHARG - Batch Number (nomorSeri)
  serialNumber?: string;      // SERNR - Serial Number (untuk eksklusif)
  costCenter?: string;        // KOSTL - Cost Center (dari fungsi)
  wbsElement?: string;        // PS_PSP_PNR - WBS Element (nomorKontrak)
  itemText?: string;          // SGTXT - Item Text
}
```

**Key Functions:**
- `mapMRRealizationToSAP()` - Mapping data MR Realization ke format SAP
- `validateSAPMaterialDocument()` - Validasi data sebelum kirim ke SAP
- `createSAPMaterialDocument()` - Firebase Function untuk membuat Material Document
- `batchCreateSAPMaterialDocuments()` - Batch processing multiple MR Realizations

**Mapping Logic:**
```typescript
// Plant mapping berdasarkan fungsi
const plantMapping = {
  'Gd Ry Kupang': '1000',
  'Gd Ry Denpasar': '1001',
  'Gd Ry Mataram': '1002',
  // ...
};

// Movement type berdasarkan kategori
const movementType = category === 'Eksklusif' ? '261' : '201';
```

#### 2. Multiple Authentication Formats

Berdasarkan analisis AGO PLN, sistem mencoba berbagai format autentikasi:
```typescript
const authFormats = [
  `pusat\\${username}:${password}`,     // Format AGO PLN
  `${username}:${password}`,            // Format standar
  `${username.replace(/\./g, '')}:${password}`, // Tanpa titik
  `${client}:${username}:${password}`,  // Dengan client
];
```

### Frontend (React Components)

#### 1. KirimSAP Component (`src/components/KirimSAP.tsx`)

**Features:**
- **SAP Connection Management** - Login/logout ke SAP PLN
- **Data Loading** - Memuat MR Realization yang sudah completed
- **Status Tracking** - Menampilkan status SAP (Belum Terkirim/Terkirim/Error)
- **Preview Functionality** - Preview data SAP sebelum dikirim
- **Batch Processing** - Kirim multiple items sekaligus
- **Progress Monitoring** - Real-time progress untuk batch operations
- **Statistics Dashboard** - Statistik total, terkirim, belum terkirim, error

**Key Components:**
```typescript
// SAP Connection Card
<Card title="Koneksi SAP PLN">
  {isAuthenticated ? (
    <Alert message="Terhubung ke SAP PLN" type="success" />
  ) : (
    <Form onFinish={handleSAPLogin}>
      <Input placeholder="pusat\bastian.taka" />
      <Input.Password placeholder="Password SAP" />
    </Form>
  )}
</Card>

// Statistics Card
<Card title="Statistik">
  <Statistic title="Total" value={statistics.total} />
  <Statistic title="Belum Terkirim" value={statistics.notSent} />
  <Statistic title="Terkirim" value={statistics.sent} />
  <Statistic title="Error" value={statistics.error} />
</Card>
```

#### 2. API Integration (`src/utils/sap-material-document-api.ts`)

**Functions:**
- `createSAPMaterialDocument()` - Kirim single Material Document
- `batchCreateSAPMaterialDocuments()` - Batch processing
- `mapMRRealizationToSAP()` - Frontend mapping function
- `validateSAPMaterialDocument()` - Frontend validation
- `getSAPStatus()` - Mendapatkan status SAP dari data
- `formatSAPDocumentForPreview()` - Format data untuk preview

### Navigation & Routing

#### 1. Sidebar Integration
Menu "Kirim SAP" ditambahkan ke Request Fulfillment:
```typescript
{
  key: 'request-fulfillment',
  icon: <CheckCircleOutlined />,
  label: 'Request Fulfillment',
  children: [
    { key: '/mutasi-keluar', label: 'Mutasi Keluar', icon: <ExportOutlined /> },
    { key: '/mr-realization', label: 'MR Realization', icon: <FileProtectOutlined /> },
    { key: '/kirim-sap', label: 'Kirim SAP', icon: <SendOutlined /> },
  ],
}
```

#### 2. App Routing
Route `/kirim-sap` ditambahkan ke App.tsx:
```typescript
<Route path="kirim-sap" element={<KirimSAP />} />
```

## Data Flow

### 1. MR Realization → SAP Material Document

```
MR Realization Data:
├── nomorReservasi → Reference Document
├── tglPengambilan → Document Date
├── pekerjaan → Header Text
├── pelaksana → Header Text
├── fungsi → Plant & Cost Center
├── category → Movement Type
├── nomorKontrak → WBS Element
└── materials[]
    ├── normalisasi → Material Number
    ├── qtyAmbil → Quantity
    ├── satuan → Unit of Measure
    ├── nomorSeri → Batch/Serial Number
    └── materialDescription → Item Text
```

### 2. SAP Response → Firestore Update

```
SAP Response:
├── MaterialDocument → sapMaterialDocument
├── MaterialDocumentYear → sapFiscalYear
├── DocumentDate → sapSentAt
└── Status → sapStatus
```

## Security & Error Handling

### 1. Authentication
- Firebase Authentication required
- SAP credentials validation
- Multiple auth format attempts
- Connection timeout handling

### 2. Data Validation
- Required field validation
- Business logic validation
- SAP format compliance
- Error logging to Firestore

### 3. Audit Trail
```typescript
// Success audit
await auditRef.set({
  materialDocument: materialDocumentNumber,
  fiscalYear: fiscalYear,
  originalData: sapDocument,
  sapResponse: sapResponse,
  createdBy: context.auth.uid,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  status: 'success'
});

// Error audit
await errorRef.set({
  operation: 'createMaterialDocument',
  error: error.message,
  data: data,
  createdBy: context.auth?.uid,
  createdAt: admin.firestore.FieldValue.serverTimestamp()
});
```

## Usage Workflow

### 1. User Login ke SAP
1. User masuk ke menu "Kirim SAP"
2. Input kredensial SAP PLN (format: `pusat\username`)
3. Sistem test koneksi dengan multiple auth formats
4. Jika berhasil, tampilkan status "Terhubung ke SAP PLN"

### 2. Data Loading & Preview
1. Sistem load MR Realization dengan status "Completed"
2. Tampilkan statistik dan status SAP untuk setiap item
3. User dapat preview data SAP sebelum dikirim
4. Validasi data dilakukan di frontend dan backend

### 3. Pengiriman ke SAP
1. **Single Send**: Kirim satu item dengan tombol "Kirim ke SAP"
2. **Batch Send**: Pilih multiple items dan kirim sekaligus
3. Progress monitoring untuk batch operations
4. Update status di Firestore setelah berhasil/gagal

### 4. Monitoring & Audit
1. Status tracking: Belum Terkirim/Terkirim/Error
2. SAP Document Number disimpan untuk referensi
3. Audit trail lengkap di Firestore
4. Error logging untuk debugging

## SAP Integration Details

### 1. Endpoint SAP
```
/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentHeader
```

### 2. Movement Types
- **201**: Goods issue to cost center (untuk pekerjaan umum)
- **261**: Goods issue to order/project (untuk pekerjaan eksklusif)

### 3. Plant Mapping
```typescript
const plantMapping = {
  'Gd Ry Kupang': '1000',
  'Gd Ry Denpasar': '1001',
  'Gd Ry Mataram': '1002',
  'Gd Ry Sumbawa': '1003',
  'Gd Ry Bima': '1004',
};
```

### 4. Cost Center Mapping
```typescript
const costCenterMapping = {
  'Gd Ry Kupang': 'CC001',
  'Gd Ry Denpasar': 'CC002',
  'Gd Ry Mataram': 'CC003',
};
```

## Future Enhancements

### 1. Advanced Features
- **Real-time Sync** - Automatic sync dengan SAP
- **Retry Mechanism** - Auto retry untuk failed items
- **Bulk Operations** - Mass upload/download
- **Advanced Filtering** - Filter berdasarkan tanggal, status, dll.

### 2. Monitoring & Analytics
- **Dashboard Analytics** - Grafik pengiriman SAP
- **Performance Metrics** - Success rate, response time
- **Alert System** - Notifikasi untuk failed operations
- **Reporting** - Export laporan pengiriman SAP

### 3. Integration Improvements
- **Multiple SAP Systems** - Support multiple SAP environments
- **Custom Mapping** - User-defined plant/cost center mapping
- **Validation Rules** - Configurable business rules
- **Workflow Integration** - Integration dengan approval workflow

## Troubleshooting

### 1. Common Issues
- **Authentication Failed**: Periksa format username dan password
- **Validation Error**: Pastikan semua field required terisi
- **Network Timeout**: Periksa koneksi ke SAP server
- **Data Mapping Error**: Periksa mapping plant/cost center

### 2. Debug Steps
1. Check Firebase Functions logs
2. Verify SAP credentials
3. Test SAP connection manually
4. Check Firestore audit trail
5. Validate data format

### 3. Error Codes
- **401**: Authentication failed
- **400**: Validation error
- **500**: SAP server error
- **timeout**: Network timeout

## Conclusion

Implementasi "Kirim SAP" berhasil mengintegrasikan sistem inventory dengan SAP PLN menggunakan Material Document. Fitur ini memungkinkan:

1. **Seamless Integration** - Integrasi yang mulus dengan SAP PLN
2. **User-Friendly Interface** - Interface yang mudah digunakan
3. **Robust Error Handling** - Penanganan error yang komprehensif
4. **Audit Trail** - Jejak audit yang lengkap
5. **Scalable Architecture** - Arsitektur yang dapat dikembangkan

Implementasi ini mengikuti best practices dan standar industri untuk integrasi SAP, dengan fokus pada reliability, security, dan user experience.
