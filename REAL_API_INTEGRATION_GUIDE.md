# 🔄 REAL API INTEGRATION GUIDE

## 📊 **STATUS SAAT INI**

### ✅ **Yang Sudah Berhasil:**
- ✅ Data structure PLN Marketplace sudah dipetakan
- ✅ Integration architecture sudah siap
- ✅ UI dashboard sudah berjalan
- ✅ Demo dengan data real structure berhasil

### 🔄 **Yang Masih Demo Mode:**
- 🔄 Connection ke PLN Marketplace API (masih mock)
- 🔄 Authentication dengan credentials real
- 🔄 Sync data langsung dari server PLN

---

## 🎯 **UNTUK SYNC DATA ASLI**

### **Option 1: Update Service untuk Real API**

Mari saya update `marketplaceSync.ts` untuk bisa connect ke API asli:

#### Step 1: Update Connection Method
```typescript
// Ganti mock connection dengan real API call
async connect(): Promise<boolean> {
  try {
    console.log('🔌 Connecting to PLN Marketplace API...');
    
    // Real API authentication
    const response = await fetch('https://apimarketplace.pln.co.id/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'adrianus.hito',
        password: '@Dhi062025' // Dari credentials yang Anda berikan
      })
    });
    
    if (response.ok) {
      const authData = await response.json();
      this.authToken = authData.token; // Simpan token
      this.isConnected = true;
      console.log('✅ Connected to PLN Marketplace (Real API)');
      return true;
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    console.error('❌ Failed to connect:', error);
    this.isConnected = false;
    return false;
  }
}
```

#### Step 2: Update Sync Method untuk Real API
```typescript
async syncFromMarketplace(): Promise<SyncResult> {
  if (!this.isConnected) {
    throw new Error('Not connected to PLN Marketplace');
  }

  try {
    // Real API call dengan authentication
    const response = await fetch(
      'https://apimarketplace.pln.co.id/product/sku/get-data-material-sidebar',
      {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const realData = await response.json();
    
    // Process real data (structure sudah kita ketahui)
    return this.processRealApiData(realData);
    
  } catch (error) {
    console.error('❌ Real API sync failed:', error);
    return { success: false, newItems: 0, updatedItems: 0, errors: [error.message] };
  }
}
```

---

### **Option 2: Manual API Testing**

#### Test Real API dengan Browser/Postman:

1. **Login API:**
```bash
curl -X POST https://apimarketplace.pln.co.id/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "adrianus.hito", 
    "password": "@Dhi062025"
  }'
```

2. **Get Data API:**
```bash
curl -X GET https://apimarketplace.pln.co.id/product/sku/get-data-material-sidebar \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### **Option 3: Hybrid Approach (Recommended)**

Buat toggle antara demo mode dan real mode:

```typescript
export class MarketplaceSync {
  private useRealApi: boolean = false; // Toggle ini
  
  // Method untuk switch mode
  setRealApiMode(enabled: boolean) {
    this.useRealApi = enabled;
  }
  
  async syncFromMarketplace() {
    if (this.useRealApi) {
      return this.syncFromRealApi();
    } else {
      return this.syncFromMockData();
    }
  }
}
```

---

## 🔧 **IMPLEMENTASI REAL API**

### **Yang Perlu Dilakukan:**

#### 1. **Update Authentication**
- Ganti mock connection dengan real API login
- Handle token management
- Add token refresh logic

#### 2. **Update API Calls**
- Ganti mock data dengan real fetch calls
- Add proper error handling untuk network issues
- Handle rate limiting

#### 3. **Add Configuration**
- Environment variables untuk API endpoints
- Toggle untuk demo/production mode
- Credentials management

#### 4. **Testing & Validation**
- Test dengan credentials real
- Validate data structure consistency
- Error handling untuk various scenarios

---

## 🚀 **QUICK IMPLEMENTATION**

Apakah Anda ingin saya:

### **Option A: Update ke Real API Sekarang**
- Update `marketplaceSync.ts` untuk real API calls
- Test dengan credentials adrianus.hito
- Implement real authentication

### **Option B: Buat Toggle Demo/Real Mode**
- Keep demo mode untuk testing
- Add real API mode untuk production
- User bisa pilih mode mana yang digunakan

### **Option C: Test Manual API First**
- Test API endpoints manual dengan Postman/curl
- Validate authentication works
- Confirm data structure, baru implement

---

## 🎯 **REKOMENDASI**

**Saya sarankan Option B (Toggle Mode)** karena:

✅ **Fleksibel** - Bisa demo dan real
✅ **Safe** - Demo mode untuk testing, real mode untuk production  
✅ **Gradual** - Bisa test real API step by step
✅ **Fallback** - Jika real API bermasalah, masih ada demo mode

**Mau saya implementasikan yang mana?**
