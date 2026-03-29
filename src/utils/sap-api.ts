import axios from 'axios';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Tipe data untuk stok material SAP
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
}

// Fungsi untuk mendapatkan token Firebase
const getFirebaseFunctions = () => {
  return getFunctions();
};

// Fungsi untuk mendapatkan stok material dari SAP
export const getSAPMaterialStock = async (
  materialId?: string,
  plant?: string,
  storageLocation?: string,
  username?: string,
  password?: string
): Promise<SAPMaterialStock[]> => {
  try {
    const functions = getFirebaseFunctions();
    const getSAPMaterialStockFn = httpsCallable(functions, 'getSAPMaterialStock');
    
    const result = await getSAPMaterialStockFn({
      materialId,
      plant,
      storageLocation,
      username,
      password
    });
    
    return (result.data as any).stocks || [];
  } catch (error) {
    console.error('Error fetching SAP material stock:', error);
    throw error;
  }
};

// Fungsi untuk tes koneksi SAP
export const testSAPConnection = async (
  username: string,
  password: string
): Promise<{ success: boolean; message?: string; format?: number; status?: number }> => {
  try {
    const functions = getFirebaseFunctions();
    const testSAPConnectionFn = httpsCallable(functions, 'testSAPConnection');
    
    const result = await testSAPConnectionFn({
      username,
      password
    });
    
    return result.data as { success: boolean; message?: string; format?: number; status?: number };
  } catch (error) {
    console.error('Error testing SAP connection:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Fungsi untuk mendapatkan detail material dari SAP
export const getSAPMaterial = async (materialId: string): Promise<any> => {
  try {
    const functions = getFirebaseFunctions();
    const getSAPMaterialFn = httpsCallable(functions, 'getSAPMaterial');
    
    const result = await getSAPMaterialFn({
      materialId
    });
    
    return result.data;
  } catch (error) {
    console.error('Error fetching SAP material:', error);
    throw error;
  }
};

// Fungsi untuk mencari material di SAP
export const searchSAPMaterials = async (searchTerm: string): Promise<any[]> => {
  try {
    const functions = getFirebaseFunctions();
    const searchSAPMaterialsFn = httpsCallable(functions, 'searchSAPMaterials');
    
    const result = await searchSAPMaterialsFn({
      searchTerm
    });
    
    return (result.data as any).materials || [];
  } catch (error) {
    console.error('Error searching SAP materials:', error);
    throw error;
  }
};

// Fungsi untuk mendapatkan dokumen material dari SAP
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

export default {
  getSAPMaterialStock,
  getSAPMaterial,
  searchSAPMaterials,
  getSAPMaterialDocument,
  testSAPConnection
};
