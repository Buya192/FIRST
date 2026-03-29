import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import * as cors from 'cors';

const corsHandler = cors({ origin: true });

// Konfigurasi SAP
const getSAPConfig = (username?: string, password?: string) => {
  return {
    baseUrl: functions.config().sap?.url || 'https://sap-gateway.example.com',
    username: username || functions.config().sap?.username || 'sap_username',
    password: password || functions.config().sap?.password || 'sap_password'
  };
};

// Fungsi helper untuk autentikasi SAP
const getSAPAuthHeader = (username?: string, password?: string) => {
  const config = getSAPConfig(username, password);
  
  // Hapus domain dari username jika ada (format: domain\username)
  let cleanUsername = config.username;
  if (cleanUsername.includes('\\')) {
    cleanUsername = cleanUsername.split('\\')[1];
  }
  
  // Jika username dalam format email, ekstrak bagian sebelum @
  if (cleanUsername.includes('@')) {
    cleanUsername = cleanUsername.split('@')[0];
  }
  
  // Jika username mengandung titik, coba kedua format
  const usernameWithDot = cleanUsername;
  const usernameWithoutDot = cleanUsername.replace(/\./g, '');
  
  // Coba beberapa format autentikasi yang umum digunakan
  const authOptions = [
    // Format 1: username:password (standar)
    Buffer.from(`${cleanUsername}:${config.password}`).toString('base64'),
    // Format 2: username tanpa titik
    Buffer.from(`${usernameWithoutDot}:${config.password}`).toString('base64'),
    // Format 3: client + username (SAP sering menggunakan ini)
    Buffer.from(`100:${cleanUsername}:${config.password}`).toString('base64'),
    // Format 4: domain/username (jika domain diperlukan)
    Buffer.from(`${config.username}:${config.password}`).toString('base64')
  ];
  
  // Gunakan format pertama sebagai default, tapi simpan yang lain untuk dicoba jika gagal
  return {
    'Authorization': 'Basic ' + authOptions[0],
    'x-csrf-token': 'fetch',
    '_auth_options': authOptions // Simpan opsi lain untuk dicoba jika yang pertama gagal
  };
};

// Fungsi untuk mendapatkan token CSRF
const getCSRFToken = async (username?: string, password?: string) => {
  try {
    const config = getSAPConfig(username, password);
    const response = await axios.get(
      `${config.baseUrl}/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/`,
      {
        headers: getSAPAuthHeader(username, password)
      }
    );
    
    return response.headers['x-csrf-token'];
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
};

// Fungsi untuk mendapatkan stok material dari SAP
export const getSAPMaterialStock = functions.https.onCall(async (data, context) => {
  // Verifikasi autentikasi
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  try {
    const { materialId, plant, storageLocation } = data;
    
    // Buat filter berdasarkan parameter yang diberikan
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
    
    // Ambil username dan password dari data
    const { username, password } = data;
    
    // Dapatkan konfigurasi SAP
    const config = getSAPConfig(username, password);
    
    // Jika tidak ada filter, ambil semua stok (dengan batasan)
    const url = `${config.baseUrl}/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/A_MaterialStock`;
    const params: any = {
      $format: 'json',
      $top: 100 // Batasi hasil untuk performa
    };
    
    if (filter) {
      params.$filter = filter;
    }
    
    // Dapatkan header autentikasi
    const authHeader = getSAPAuthHeader(username, password);
    
    // Coba dengan format autentikasi pertama
    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': 'Basic ' + authHeader._auth_options[0],
          'x-csrf-token': 'fetch',
          'Accept': 'application/json'
        },
        params
      });
      
      // Simpan data ke cache Firestore
      const db = admin.firestore();
      const cacheRef = db.collection('sapCache').doc('materialStock');
      await cacheRef.set({
        data: response.data.d.results,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        filter: { materialId, plant, storageLocation },
        authFormat: 1
      });
      
      return {
        stocks: response.data.d.results,
        authFormat: 1
      };
    } catch (error1) {
      console.log('Format 1 failed for getSAPMaterialStock, trying format 2...');
      
      // Coba dengan format autentikasi kedua
      try {
        const response = await axios.get(url, {
          headers: {
            'Authorization': 'Basic ' + authHeader._auth_options[1],
            'x-csrf-token': 'fetch',
            'Accept': 'application/json'
          },
          params
        });
        
        // Simpan data ke cache Firestore
        const db = admin.firestore();
        const cacheRef = db.collection('sapCache').doc('materialStock');
        await cacheRef.set({
          data: response.data.d.results,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          filter: { materialId, plant, storageLocation },
          authFormat: 2
        });
        
        return {
          stocks: response.data.d.results,
          authFormat: 2
        };
      } catch (error2) {
        console.log('Format 2 failed for getSAPMaterialStock, trying format 3...');
        
        // Coba dengan format autentikasi ketiga
        try {
          const response = await axios.get(url, {
            headers: {
              'Authorization': 'Basic ' + authHeader._auth_options[2],
              'x-csrf-token': 'fetch',
              'Accept': 'application/json'
            },
            params
          });
          
          // Simpan data ke cache Firestore
          const db = admin.firestore();
          const cacheRef = db.collection('sapCache').doc('materialStock');
          await cacheRef.set({
            data: response.data.d.results,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            filter: { materialId, plant, storageLocation },
            authFormat: 3
          });
          
          return {
            stocks: response.data.d.results,
            authFormat: 3
          };
        } catch (error3) {
          console.log('Format 3 failed for getSAPMaterialStock, trying format 4...');
          
          // Coba dengan format autentikasi keempat
          try {
            const response = await axios.get(url, {
              headers: {
                'Authorization': 'Basic ' + authHeader._auth_options[3],
                'x-csrf-token': 'fetch',
                'Accept': 'application/json'
              },
              params
            });
            
            // Simpan data ke cache Firestore
            const db = admin.firestore();
            const cacheRef = db.collection('sapCache').doc('materialStock');
            await cacheRef.set({
              data: response.data.d.results,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              filter: { materialId, plant, storageLocation },
              authFormat: 4
            });
            
            return {
              stocks: response.data.d.results,
              authFormat: 4
            };
          } catch (error4) {
            // Semua format gagal, lempar error
            console.error('All authentication formats failed for getSAPMaterialStock');
            throw new functions.https.HttpsError('unauthenticated', 'Failed to authenticate with SAP using all formats');
          }
        }
      }
    }
    
    // Kode ini tidak akan pernah dijalankan karena semua kasus sudah ditangani di atas
    // Tetapi kita tetap menyediakannya untuk keamanan
    throw new functions.https.HttpsError('internal', 'Unexpected code path');
  } catch (error) {
    console.error('Error in getSAPMaterialStock:', error);
    
    // Coba ambil dari cache jika ada error
    try {
      const db = admin.firestore();
      const cacheDoc = await db.collection('sapCache').doc('materialStock').get();
      
      if (cacheDoc.exists) {
        const cacheData = cacheDoc.data();
        if (cacheData) {
          console.log('Using cached SAP material stock data');
          return {
            stocks: cacheData.data || [],
            fromCache: true
          };
        }
      }
    } catch (cacheError) {
      console.error('Error fetching from cache:', cacheError);
    }
    
    throw new functions.https.HttpsError('internal', 'Failed to fetch material stock from SAP');
  }
});

// Fungsi untuk mendapatkan detail material dari SAP
export const getSAPMaterial = functions.https.onCall(async (data, context) => {
  // Verifikasi autentikasi
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  try {
    const { materialId } = data;
    
    if (!materialId) {
      throw new functions.https.HttpsError('invalid-argument', 'Material ID is required');
    }
    
    // Ambil username dan password dari data
    const { username, password } = data;
    
    // Dapatkan konfigurasi SAP
    const config = getSAPConfig(username, password);
    
    const response = await axios.get(
      `${config.baseUrl}/sap/opu/odata/sap/API_MATERIAL_SRV/A_Material('${materialId}')`,
      {
        headers: {
          ...getSAPAuthHeader(username, password),
          'Accept': 'application/json'
        },
        params: {
          $format: 'json'
        }
      }
    );
    
    return response.data.d;
  } catch (error) {
    console.error('Error in getSAPMaterial:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch material from SAP');
  }
});

// Fungsi untuk mencari material di SAP
export const searchSAPMaterials = functions.https.onCall(async (data, context) => {
  // Verifikasi autentikasi
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  try {
    const { searchTerm } = data;
    
    if (!searchTerm) {
      throw new functions.https.HttpsError('invalid-argument', 'Search term is required');
    }
    
    // Ambil username dan password dari data
    const { username, password } = data;
    
    // Dapatkan konfigurasi SAP
    const config = getSAPConfig(username, password);
    
    const response = await axios.get(
      `${config.baseUrl}/sap/opu/odata/sap/API_MATERIAL_SRV/A_Material`,
      {
        headers: {
          ...getSAPAuthHeader(username, password),
          'Accept': 'application/json'
        },
        params: {
          $format: 'json',
          $filter: `substringof('${searchTerm}', MaterialName)`,
          $top: 50
        }
      }
    );
    
    return {
      materials: response.data.d.results
    };
  } catch (error) {
    console.error('Error in searchSAPMaterials:', error);
    throw new functions.https.HttpsError('internal', 'Failed to search materials in SAP');
  }
});

// Fungsi untuk mendapatkan dokumen material dari SAP
export const getSAPMaterialDocument = functions.https.onCall(async (data, context) => {
  // Verifikasi autentikasi
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  try {
    const { documentId, year } = data;
    
    if (!documentId || !year) {
      throw new functions.https.HttpsError('invalid-argument', 'Document ID and year are required');
    }
    
    // Ambil username dan password dari data
    const { username, password } = data;
    
    // Dapatkan konfigurasi SAP
    const config = getSAPConfig(username, password);
    
    const response = await axios.get(
      `${config.baseUrl}/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentHeader(MaterialDocument='${documentId}',MaterialDocumentYear='${year}')`,
      {
        headers: {
          ...getSAPAuthHeader(username, password),
          'Accept': 'application/json'
        },
        params: {
          $format: 'json',
          $expand: 'to_MaterialDocumentItem'
        }
      }
    );
    
    return response.data.d;
  } catch (error) {
    console.error('Error in getSAPMaterialDocument:', error);
    throw new functions.https.HttpsError('internal', 'Failed to fetch material document from SAP');
  }
});

// Fungsi untuk tes koneksi SAP
export const testSAPConnection = functions.https.onCall(async (data, context) => {
  // Verifikasi autentikasi
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  try {
    // Ambil username dan password dari data
    const { username, password } = data;
    
    // Dapatkan konfigurasi SAP
    const config = getSAPConfig(username, password);
    
    // Dapatkan header autentikasi
    const authHeader = getSAPAuthHeader(username, password);
    
    // Coba mengambil metadata service dengan format autentikasi pertama
    try {
      const response = await axios.get(
        `${config.baseUrl}/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/$metadata`,
        {
          headers: {
            'Authorization': 'Basic ' + authHeader._auth_options[0],
            'x-csrf-token': 'fetch'
          }
        }
      );
      
      return {
        success: true,
        message: 'Successfully connected to SAP API with format 1',
        status: response.status,
        format: 1
      };
    } catch (error1) {
      console.log('Format 1 failed, trying format 2...');
      
      // Coba format kedua
      try {
        const response = await axios.get(
          `${config.baseUrl}/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/$metadata`,
          {
            headers: {
              'Authorization': 'Basic ' + authHeader._auth_options[1],
              'x-csrf-token': 'fetch'
            }
          }
        );
        
        return {
          success: true,
          message: 'Successfully connected to SAP API with format 2',
          status: response.status,
          format: 2
        };
      } catch (error2) {
        console.log('Format 2 failed, trying format 3...');
        
        // Coba format ketiga
        try {
          const response = await axios.get(
            `${config.baseUrl}/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/$metadata`,
            {
              headers: {
                'Authorization': 'Basic ' + authHeader._auth_options[2],
                'x-csrf-token': 'fetch'
              }
            }
          );
          
          return {
            success: true,
            message: 'Successfully connected to SAP API with format 3',
            status: response.status,
            format: 3
          };
        } catch (error3) {
          console.log('Format 3 failed, trying format 4...');
          
          // Coba format keempat
          try {
            const response = await axios.get(
              `${config.baseUrl}/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/$metadata`,
              {
                headers: {
                  'Authorization': 'Basic ' + authHeader._auth_options[3],
                  'x-csrf-token': 'fetch'
                }
              }
            );
            
            return {
              success: true,
              message: 'Successfully connected to SAP API with format 4',
              status: response.status,
              format: 4
            };
          } catch (error4) {
            // Semua format gagal
            console.error('All authentication formats failed');
            return {
              success: false,
              message: 'Failed to connect to SAP API with all authentication formats',
              error: 'Authentication failed with all formats'
            };
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in testSAPConnection:', error);
    if (error instanceof Error) {
      return {
        success: false,
        message: 'Failed to connect to SAP API',
        error: error.message
      };
    } else {
      return {
        success: false,
        message: 'Failed to connect to SAP API',
        error: 'Unknown error'
      };
    }
  }
});

// Endpoint HTTP untuk tes koneksi SAP
export const testSAPConnectionHttp = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    try {
      // Dapatkan konfigurasi SAP default
      const config = getSAPConfig();
      
      // Coba mengambil metadata service
      const sapResponse = await axios.get(
        `${config.baseUrl}/sap/opu/odata/sap/API_MATERIAL_STOCK_SRV/$metadata`,
        {
          headers: getSAPAuthHeader()
        }
      );
      
      response.status(200).send({
        success: true,
        message: 'Successfully connected to SAP API',
        status: sapResponse.status
      });
    } catch (error) {
      console.error('Error in testSAPConnectionHttp:', error);
      response.status(500).send({
        success: false,
        message: 'Failed to connect to SAP API',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
});
