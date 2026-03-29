import { getFunctions, httpsCallable } from 'firebase/functions';

// Tipe data untuk stok material SAP berdasarkan analisis AGO PLN
export interface SAPMaterialStock {
  Material: string;
  MaterialName: string;
  Plant: string;
  StorageLocation: string;
  BatchNumber?: string;
  InventoryStockType: string;
  MaterialBaseUnit: string;
  MatlWrhsStkQtyInMatlBaseUnit: number;
  BlockedStockQuantity?: number;
  StockInTransitQuantity?: number;
  // Additional fields based on AGO PLN analysis
  MaterialGroup?: string;
  MaterialType?: string;
  LastUpdateDate?: string;
}

// Tipe data untuk hierarki PLN
export interface PLNHierarchy {
  plants: string[];
  storageLocations: string[];
}

// Tipe data untuk response SAP yang enhanced
export interface SAPResponse<T> {
  data?: T;
  authFormat?: number;
  baseUrl?: string;
  urlIndex?: number;
  totalRecords?: number;
  fromCache?: boolean;
  cacheTimestamp?: any;
  success?: boolean;
  error?: string;
  message?: string;
}

// Fungsi untuk mendapatkan token Firebase
const getFirebaseFunctions = () => {
  return getFunctions();
};

// Fungsi untuk mendapatkan stok material dari SAP (Enhanced)
export const getSAPMaterialStockEnhanced = async (
  materialId?: string,
  plant?: string,
  storageLocation?: string,
  username?: string,
  password?: string
): Promise<SAPResponse<SAPMaterialStock[]>> => {
  try {
    const functions = getFirebaseFunctions();
    const getSAPMaterialStockFn = httpsCallable(functions, 'getSAPMaterialStockEnhanced');
    
    const result = await getSAPMaterialStockFn({
      materialId,
      plant,
      storageLocation,
      username,
      password
    });
    
    const response = result.data as SAPResponse<SAPMaterialStock[]>;
    return {
      data: response.stocks || [],
      authFormat: response.authFormat,
      baseUrl: response.baseUrl,
      urlIndex: response.urlIndex,
      totalRecords: response.totalRecords,
      fromCache: response.fromCache,
      success: true
    };
  } catch (error) {
    console.error('Error fetching SAP material stock (enhanced):', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
};

// Fungsi untuk tes koneksi SAP (Enhanced)
export const testSAPConnectionEnhanced = async (
  username: string,
  password: string
): Promise<SAPResponse<any>> => {
  try {
    const functions = getFirebaseFunctions();
    const testSAPConnectionFn = httpsCallable(functions, 'testSAPConnectionEnhanced');
    
    const result = await testSAPConnectionFn({
      username,
      password
    });
    
    return result.data as SAPResponse<any>;
  } catch (error) {
    console.error('Error testing SAP connection (enhanced):', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to connect to SAP'
    };
  }
};

// Fungsi untuk mendapatkan hierarki PLN
export const getPLNHierarchy = async (
  username: string,
  password: string
): Promise<SAPResponse<PLNHierarchy>> => {
  try {
    const functions = getFirebaseFunctions();
    const getPLNHierarchyFn = httpsCallable(functions, 'getPLNHierarchy');
    
    const result = await getPLNHierarchyFn({
      username,
      password
    });
    
    const response = result.data as any;
    return {
      data: response.hierarchy,
      authFormat: response.authFormat,
      baseUrl: response.baseUrl,
      success: true
    };
  } catch (error) {
    console.error('Error fetching PLN hierarchy:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: { plants: [], storageLocations: [] }
    };
  }
};

// Fungsi untuk mendapatkan detail material dari SAP (Enhanced)
export const getSAPMaterialEnhanced = async (
  materialId: string,
  username?: string,
  password?: string
): Promise<SAPResponse<any>> => {
  try {
    const functions = getFirebaseFunctions();
    const getSAPMaterialFn = httpsCallable(functions, 'getSAPMaterial');
    
    const result = await getSAPMaterialFn({
      materialId,
      username,
      password
    });
    
    const response = result.data as any;
    return {
      data: response.material,
      authFormat: response.authFormat,
      baseUrl: response.baseUrl,
      success: true
    };
  } catch (error) {
    console.error('Error fetching SAP material (enhanced):', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Fungsi untuk mencari material di SAP (Enhanced)
export const searchSAPMaterialsEnhanced = async (
  searchTerm: string,
  username?: string,
  password?: string
): Promise<SAPResponse<any[]>> => {
  try {
    const functions = getFirebaseFunctions();
    const searchSAPMaterialsFn = httpsCallable(functions, 'searchSAPMaterials');
    
    const result = await searchSAPMaterialsFn({
      searchTerm,
      username,
      password
    });
    
    const response = result.data as any;
    return {
      data: response.materials || [],
      authFormat: response.authFormat,
      baseUrl: response.baseUrl,
      totalRecords: response.totalFound,
      success: true
    };
  } catch (error) {
    console.error('Error searching SAP materials (enhanced):', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
};

// Backward compatibility - gunakan enhanced functions sebagai default
export const getSAPMaterialStock = getSAPMaterialStockEnhanced;
export const testSAPConnection = testSAPConnectionEnhanced;
export const getSAPMaterial = getSAPMaterialEnhanced;
export const searchSAPMaterials = searchSAPMaterialsEnhanced;

// Fungsi untuk mendapatkan dokumen material dari SAP (tetap menggunakan yang lama)
export const getSAPMaterialDocument = async (documentId: string, year: string): Promise<any> => {
  try {
    const functions = getFirebaseFunctions();
    const getSAPMaterialDocumentFn = httpsCallable(functions, 'getSAPMaterialDocument');
    
    const result = await getSAPMaterialDocumentFn({
      documentId,
      year
    });
    
    return result.data;
  } catch (error) {
    console.error('Error fetching SAP material document:', error);
    throw error;
  }
};

// Utility functions untuk format data seperti di AGO PLN
export const formatStockData = (stocks: SAPMaterialStock[]) => {
  return stocks.map(stock => ({
    ...stock,
    // Format quantity dengan separator ribuan
    formattedQuantity: stock.MatlWrhsStkQtyInMatlBaseUnit.toLocaleString('id-ID'),
    formattedBlocked: (stock.BlockedStockQuantity || 0).toLocaleString('id-ID'),
    formattedTransit: (stock.StockInTransitQuantity || 0).toLocaleString('id-ID'),
    // Status berdasarkan quantity
    status: stock.MatlWrhsStkQtyInMatlBaseUnit > 0 ? 'Available' : 'Empty',
    // Kategori berdasarkan material type
    category: stock.MaterialType || 'Unknown'
  }));
};

// Fungsi untuk menghitung summary seperti di AGO PLN
export const calculateStockSummary = (stocks: SAPMaterialStock[]) => {
  const summary = {
    totalMaterials: stocks.length,
    totalQuantity: 0,
    totalBlocked: 0,
    totalTransit: 0,
    availableMaterials: 0,
    emptyMaterials: 0,
    categories: new Map<string, number>()
  };
  
  stocks.forEach(stock => {
    summary.totalQuantity += stock.MatlWrhsStkQtyInMatlBaseUnit || 0;
    summary.totalBlocked += stock.BlockedStockQuantity || 0;
    summary.totalTransit += stock.StockInTransitQuantity || 0;
    
    if (stock.MatlWrhsStkQtyInMatlBaseUnit > 0) {
      summary.availableMaterials++;
    } else {
      summary.emptyMaterials++;
    }
    
    const category = stock.MaterialType || 'Unknown';
    summary.categories.set(category, (summary.categories.get(category) || 0) + 1);
  });
  
  return summary;
};

export default {
  getSAPMaterialStock: getSAPMaterialStockEnhanced,
  getSAPMaterial: getSAPMaterialEnhanced,
  searchSAPMaterials: searchSAPMaterialsEnhanced,
  getSAPMaterialDocument,
  testSAPConnection: testSAPConnectionEnhanced,
  getPLNHierarchy,
  formatStockData,
  calculateStockSummary
};
