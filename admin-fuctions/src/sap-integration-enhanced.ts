import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import * as cors from 'cors';

const corsHandler = cors({ origin: true });

// Konfigurasi SAP berdasarkan analisis AGO PLN
const getSAPConfig = (username?: string, password?: string) => {
  return {
    // URL SAP Gateway PLN (berdasarkan analisis AGO PLN)
    baseUrl: functions.config().sap?.url || 'https://sap-pln.co.id:8000',
    // Alternative URLs yang mungkin digunakan PLN
    alternativeUrls: [
      'https://sap.pln.co.id:8000',
      'https://sapgw.pln.co.id:8000',
      'https://sap-gateway.pln.co.id:8000',
      'http://sap-pln.co.id:8000',
      'https://sap-pln.co.id:443',
      'https://sap.pln.co.id:443',
      'https://ago.pln.co.id:8000',
      'http://ago.pln.co.id:8000'
    ],
    username: username || functions.config().sap?.username || 'sap_username',
    password: password || functions.config().sap?.password || 'sap_password',
    // Client SAP PLN (biasanya 100 atau 800)
    client: functions.config().sap?.client || '100'
  };
};

// Fungsi helper untuk autentikasi SAP dengan format PLN
const getSAPAuthHeader = (username?: string, password?: string) => {
  const config = getSAPConfig(username, password);
  
  // Berdasarkan analisis AGO PLN, format username adalah domain\username
  let cleanUsername = config.username;
  let domainUsername = config.username;
  
  // Jika username sudah dalam format domain\username, gunakan apa adanya
  if (cleanUsername.includes('\\')) {
    domainUsername = cleanUsername; // pusat\bastian.taka
    cleanUsername = cleanUsername.split('\\')[1]; // bastian.taka
  } else {
    // Jika tidak ada domain, tambahkan domain PLN
    domainUsername = `pusat\\${cleanUsername}`;
  }
  
  // Jika username dalam format email, ekstrak bagian sebelum @
  if (cleanUsername.includes('@')) {
    cleanUsername = cleanUsername.split('@')[0];
  }
  
  // Format username tanpa titik untuk beberapa sistem SAP
  const usernameWithoutDot = cleanUsername.replace(/\./g, '');
  
  // Berdasarkan analisis AGO PLN, coba beberapa format autentikasi
  const authOptions = [
    // Format 1: domain\username:password (format AGO PLN)
    Buffer.from(`${domainUsername}:${config.password}`).toString('base64'),
    // Format 2: username:password (standar)
    Buffer.from(`${cleanUsername}:${config.password}`).toString('base64'),
    // Format 3: username tanpa titik
    Buffer.from(`${usernameWithoutDot}:${config.password}`).toString('base64'),
    // Format 4: client:username:password (SAP dengan client)
    Buffer.from(`${config.client}:${cleanUsername}:${config.password}`).toString('base64'),
    // Format 5: client:domain\username:password
    Buffer.from(`${config.client}:${domainUsername}:${config.password}`).toString('base64'),
    // Format 6: domain\username tanpa titik
    Buffer.from(`pusat\\${usernameWithoutDot}:${config.password}`).toString('base64')
  ];
  
  return {
    'Authorization': 'Basic ' + authOptions[0],
    'x-csrf-token': 'fetch',
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    '_auth_options': authOptions
  };
};

// Fungsi untuk mencoba multiple URL SAP
const tryMultipleSAPUrls = async (
  endpoint: string, 
  headers: any, 
  params?: any, 
  method: 'GET' | 'POST' = 'GET'
) => {
  const config = getSAPConfig();
  const urls = [config.baseUrl, ...config.alternativeUrls];
  
  for (let i = 0; i < urls.length; i++) {
    const baseUrl = urls[i];
    const fullUrl = `${baseUrl}${endpoint}`;
    
    try {
      console.log(`Trying SAP URL ${i + 1}/${urls.length}: ${fullUrl}`);
      
      const response = await axios({
        method,
        url: fullUrl,
        headers,
        params,
        timeout: 10000 // 10 second timeout
      });
      
      console.log(`Success with URL: ${fullUrl}`);
      return { response, urlIndex: i, baseUrl };
    } catch (error) {
      console.log(`Failed with URL ${fullUrl}:`, error.message);
      
      // Jika ini URL terakhir, lempar error
      if (i === urls.length - 1) {
        throw error;
      }
    }
  }
  
  throw new Error('All SAP URLs failed');
};

// Fungsi untuk mencoba multiple format autentikasi
const tryMultipleAuthFormats = async (
  endpoint: string,
  username?: string,
  password?: string,
  params?: any,
  method: 'GET' | 'POST' = 'GET'
) => {
  const authHeader = getSAPAuthHeader(username, password);
  const authOptions = authHeader._auth_options;
  
  for (let i = 0; i < authOptions.length; i++) {
    try {
      console.log(`Trying auth format ${i + 1}/${authOptions.length}`);
      
      const headers = {
        'Authorization': 'Basic ' + authOptions[i],
        'x-csrf-token': 'fetch',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      const result = await tryMultipleSAPUrls(endpoint, headers, params, method);
      
      console.log(`Success with auth format ${i + 1}`);
      return { ...result, authFormat: i + 1 };
    } catch (error) {
      console.log(`Auth format ${i + 1} failed:`, error.message);
      
      // Jika ini format terakhir, lempar error
      if (i === authOptions.length - 1) {
        throw error;
      }
    }
  }
  
  throw new Error('All authentication formats failed');
};

// Fungsi untuk mendapatkan stok material dari SAP (Enhanced)
export const getSAPMaterialStockEnhanced = functions.https.onCall(async (data, context) => {
  // Verifikasi autentikasi
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  try {
    const { materialId, plant, storageLocation, username, password } = data;
    
    // Buat filter berdasarkan parameter yang diberikan (seperti di AGO PLN)
    let filter = '';
    if (materialId) {
      filter += `Material eq '${materialId}'`;
    }
    if (plant) {
      filter += filter ? ` and Plant eq '${plant}'` : `Plant eq '${plant}'`;
    }
    if (storageLocation) {
      filter += filter ? ` and StorageLocation eq '${storageLocation}'` : `StorageLocation eq '${storageLocation}'`;
    }
    
    // Endpoint SAP OData untuk material stock
    const endpoint = '/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/A_MaterialStock';
    const params: any = {
      $format: 'json',
      $top: 1000 // Increase limit based on AGO PLN capacity
    };
    
    if (filter) {
      params.$filter = filter;
    }
    
    // Coba multiple URL dan format autentikasi
    const result = await tryMultipleAuthFormats(endpoint, username, password, params);
    
    // Simpan data ke cache Firestore dengan informasi tambahan
    const db = admin.firestore();
    const cacheRef = db.collection('sapCache').doc('materialStock');
    await cacheRef.set({
      data: result.response.data.d.results,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      filter: { materialId, plant, storageLocation },
      authFormat: result.authFormat,
      baseUrl: result.baseUrl,
      urlIndex: result.urlIndex,
      success: true
    });
    
    return {
      stocks: result.response.data.d.results,
      authFormat: result.authFormat,
      baseUrl: result.baseUrl,
      urlIndex: result.urlIndex,
      totalRecords: result.response.data.d.results.length
    };
    
  } catch (error) {
    console.error('Error in getSAPMaterialStockEnhanced:', error);
    
    // Coba ambil dari cache jika ada error
    try {
      const db = admin.firestore();
      const cacheDoc = await db.collection('sapCache').doc('materialStock').get();
      
      if (cacheDoc.exists) {
        const cacheData = cacheDoc.data();
        if (cacheData && cacheData.data) {
          console.log('Using cached SAP material stock data');
          return {
            stocks: cacheData.data,
            fromCache: true,
            cacheTimestamp: cacheData.timestamp,
            authFormat: cacheData.authFormat,
            baseUrl: cacheData.baseUrl
          };
        }
      }
    } catch (cacheError) {
      console.error('Error fetching from cache:', cacheError);
    }
    
    throw new functions.https.HttpsError('internal', `Failed to fetch material stock from SAP: ${error.message}`);
  }
});

// Fungsi untuk tes koneksi SAP (Enhanced)
export const testSAPConnectionEnhanced = functions.https.onCall(async (data, context) => {
  // Verifikasi autentikasi
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  try {
    const { username, password } = data;
    
    // Test endpoint metadata
    const endpoint = '/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/$metadata';
    
    const result = await tryMultipleAuthFormats(endpoint, username, password);
    
    // Simpan informasi koneksi yang berhasil
    const db = admin.firestore();
    const connectionRef = db.collection('sapConnection').doc('lastSuccessful');
    await connectionRef.set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      authFormat: result.authFormat,
      baseUrl: result.baseUrl,
      urlIndex: result.urlIndex,
      username: username,
      success: true
    });
    
    return {
      success: true,
      message: `Successfully connected to SAP API with auth format ${result.authFormat}`,
      status: result.response.status,
      authFormat: result.authFormat,
      baseUrl: result.baseUrl,
      urlIndex: result.urlIndex
    };
    
  } catch (error) {
    console.error('Error in testSAPConnectionEnhanced:', error);
    
    return {
      success: false,
      message: 'Failed to connect to SAP API with all formats and URLs',
      error: error.message,
      details: 'Tried all authentication formats and SAP URLs'
    };
  }
});

// Fungsi untuk mendapatkan struktur hierarki PLN (Regional, UIW, UP3, Gudang)
export const getPLNHierarchy = functions.https.onCall(async (data, context) => {
  // Verifikasi autentikasi
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  try {
    const { username, password } = data;
    
    // Endpoint untuk mendapatkan plant/gudang dari SAP
    const endpoint = '/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/A_MaterialStock';
    const params = {
      $format: 'json',
      $select: 'Plant,StorageLocation',
      $top: 1000
    };
    
    const result = await tryMultipleAuthFormats(endpoint, username, password, params);
    
    // Process data untuk membuat hierarki seperti di AGO PLN
    const plants = new Set();
    const storageLocations = new Set();
    
    result.response.data.d.results.forEach((item: any) => {
      if (item.Plant) plants.add(item.Plant);
      if (item.StorageLocation) storageLocations.add(item.StorageLocation);
    });
    
    return {
      hierarchy: {
        plants: Array.from(plants),
        storageLocations: Array.from(storageLocations)
      },
      authFormat: result.authFormat,
      baseUrl: result.baseUrl
    };
    
  } catch (error) {
    console.error('Error in getPLNHierarchy:', error);
    throw new functions.https.HttpsError('internal', `Failed to fetch PLN hierarchy: ${error.message}`);
  }
});

// Export fungsi-fungsi yang sudah ada dengan enhancement
export const getSAPMaterialStock = getSAPMaterialStockEnhanced;
export const testSAPConnection = testSAPConnectionEnhanced;

// Fungsi untuk mendapatkan detail material dari SAP (Enhanced)
export const getSAPMaterial = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  try {
    const { materialId, username, password } = data;
    
    if (!materialId) {
      throw new functions.https.HttpsError('invalid-argument', 'Material ID is required');
    }
    
    const endpoint = `/sap/opu/odata/sap/API_MATERIAL_SRV/A_Material('${materialId}')`;
    const params = { $format: 'json' };
    
    const result = await tryMultipleAuthFormats(endpoint, username, password, params);
    
    return {
      material: result.response.data.d,
      authFormat: result.authFormat,
      baseUrl: result.baseUrl
    };
    
  } catch (error) {
    console.error('Error in getSAPMaterial:', error);
    throw new functions.https.HttpsError('internal', `Failed to fetch material from SAP: ${error.message}`);
  }
});

// Fungsi untuk mencari material di SAP (Enhanced)
export const searchSAPMaterials = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  try {
    const { searchTerm, username, password } = data;
    
    if (!searchTerm) {
      throw new functions.https.HttpsError('invalid-argument', 'Search term is required');
    }
    
    const endpoint = '/sap/opu/odata/sap/API_MATERIAL_SRV/A_Material';
    const params = {
      $format: 'json',
      $filter: `substringof('${searchTerm}', MaterialName)`,
      $top: 100
    };
    
    const result = await tryMultipleAuthFormats(endpoint, username, password, params);
    
    return {
      materials: result.response.data.d.results,
      authFormat: result.authFormat,
      baseUrl: result.baseUrl,
      totalFound: result.response.data.d.results.length
    };
    
  } catch (error) {
    console.error('Error in searchSAPMaterials:', error);
    throw new functions.https.HttpsError('internal', `Failed to search materials in SAP: ${error.message}`);
  }
});
