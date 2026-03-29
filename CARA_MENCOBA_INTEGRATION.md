# 🚀 CARA MENCOBA PLN MARKETPLACE INTEGRATION

## 📋 PANDUAN STEP-BY-STEP

### 🎯 **Option 1: Test Demo Script (Paling Mudah)**

#### Step 1: Jalankan Demo Real Data
```bash
node demo-real-marketplace-integration.js
```

**Hasil yang akan muncul:**
```
🚀 Real PLN Marketplace Integration Demo
📊 Successfully mapped 3 items
📦 Total Quantity Ordered: 7,503
🏢 Unique Suppliers: 3
✅ 100% success rate
```

---

### 🎯 **Option 2: Test di React Application**

#### Step 1: Start React Application
```bash
npm start
# atau
yarn start
# atau
npm run dev
```

#### Step 2: Buka Browser
- Buka `http://localhost:3000` (atau port yang ditampilkan)
- Login ke aplikasi jika diperlukan

#### Step 3: Navigate ke MonitoringMasuk
1. Klik menu **"Monitoring"** di sidebar
2. Pilih **"Monitoring Transaksi Masuk"**
3. Anda akan melihat **Enhanced MonitoringMasuk** dengan dashboard PLN Marketplace

#### Step 4: Test Integration
1. **Lihat Dashboard Integration** di bagian atas halaman
2. **Klik tombol "Connect"** untuk connect ke PLN Marketplace
3. **Tunggu 2 detik** - status akan berubah menjadi "Connected (Mock Mode)"
4. **Klik "Sync Now"** untuk sync data
5. **Lihat hasil sync** di notification dan alert

---

### 🎯 **Option 3: Test Individual Components**

#### Test 1: Marketplace Sync Service
```javascript
// Buka browser console di halaman MonitoringMasuk
import { marketplaceSync } from './src/services/marketplaceSync';

// Test connection
await marketplaceSync.connect();

// Test sync
const result = await marketplaceSync.syncFromMarketplace();
console.log(result);
```

#### Test 2: Check Component Integration
1. Buka **Developer Tools** (F12)
2. Go to **Console** tab
3. Lihat log messages saat melakukan sync
4. Check **Network** tab untuk melihat API calls (jika ada)

---

### 🎯 **Option 4: Visual Testing**

#### Yang Harus Anda Lihat:

1. **Dashboard PLN Marketplace Integration** di atas halaman MonitoringMasuk:
   ```
   🔗 PLN Marketplace Integration
   ├── Connection Status: Disconnected/Connected
   ├── Last Sync: Never/timestamp
   ├── Auto Sync: ON/OFF toggle
   └── [Connect] [Sync Now] buttons
   ```

2. **Setelah Connect**:
   ```
   ✅ Connection Status: Connected (Mock Mode)
   🔄 Auto Sync toggle aktif
   📊 Sync statistics muncul
   ```

3. **Setelah Sync**:
   ```
   ✅ Success notification
   📊 "X new items, Y updated"
   📈 Last sync time updated
   ```

---

### 🎯 **Option 5: Check Files & Code**

#### Files Yang Bisa Diperiksa:
1. **`src/services/marketplaceSync.ts`** - Core sync logic
2. **`src/components/EnhancedMonitoringMasukWithSync.tsx`** - UI component
3. **`src/pages/MonitoringMasuk.tsx`** - Updated page
4. **`demo-real-marketplace-integration.js`** - Working demo

#### Code Yang Bisa Dijalankan:
```bash
# Test demo script
node demo-real-marketplace-integration.js

# Check TypeScript compilation
npx tsc --noEmit

# Run React app
npm start
```

---

### 🎯 **Option 6: Manual Testing Checklist**

#### ✅ Checklist Testing:
- [ ] Demo script berjalan tanpa error
- [ ] React app bisa start
- [ ] Halaman MonitoringMasuk bisa dibuka
- [ ] Dashboard integration terlihat
- [ ] Tombol Connect berfungsi
- [ ] Status berubah ke "Connected"
- [ ] Tombol Sync Now berfungsi
- [ ] Notification muncul setelah sync
- [ ] Auto sync toggle bisa diaktifkan
- [ ] Data mapping terlihat di console

---

### 🎯 **Troubleshooting**

#### Jika Ada Error:

1. **Import Error**:
   ```bash
   npm install
   # atau
   yarn install
   ```

2. **TypeScript Error**:
   ```bash
   npx tsc --noEmit
   ```

3. **React App Tidak Start**:
   ```bash
   npm install
   npm start
   ```

4. **Component Tidak Muncul**:
   - Check browser console untuk error
   - Pastikan file `EnhancedMonitoringMasukWithSync.tsx` ada
   - Check import di `MonitoringMasuk.tsx`

---

### 🎯 **Expected Results**

#### Demo Script Output:
```
🚀 Real PLN Marketplace Integration Demo
📊 Real PLN Marketplace Data Analysis:
   Total Records: 556
   Current Page Items: 3
📋 Mapped Data Results:
   1. DO202500018602 - TRF DIS D3 20kV...
   2. DO202500018724 - CABLE PWR NYY...
   3. DO202500017014 - MTR kWH E PR...
📊 Data Mapping Summary:
   ✅ Successfully mapped 3 items
🎉 Demo completed successfully!
```

#### React App UI:
```
PLN Marketplace Integration Dashboard
├── 🔗 Connection Status: Connected (Mock Mode)
├── 🕐 Last Sync: 11/06 19:05
├── 🔄 Auto Sync: ON (Every 5 minutes)
└── [Disconnect] [Sync Now] buttons

Alert: "✅ Sync completed: 3 new items, 0 updated"
```

---

### 🎯 **Quick Start (Paling Cepat)**

```bash
# 1. Test demo (30 detik)
node demo-real-marketplace-integration.js

# 2. Start React app (2 menit)
npm start

# 3. Buka browser → MonitoringMasuk → Test integration
```

**Selesai! Integration siap dicoba! 🎉**
