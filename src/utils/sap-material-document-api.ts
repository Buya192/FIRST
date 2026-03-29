import { getFunctions, httpsCallable } from 'firebase/functions';

// Interface untuk SAP Material Document (sama dengan backend)
export interface SAPMaterialDocumentHeader {
  documentDate: string;
  postingDate: string;
  documentType: string;
  reference: string;
  headerText: string;
  userName: string;
  companyCode: string;
}

export interface SAPMaterialDocumentItem {
  materialNumber: string;
  plant: string;
  storageLocation: string;
  movementType: string;
  quantity: number;
  unitOfMeasure: string;
  batch?: string;
  serialNumber?: string;
  costCenter?: string;
  wbsElement?: string;
  glAccount?: string;
  reasonCode?: string;
  itemText?: string;
}

export interface SAPMaterialDocument {
  header: SAPMaterialDocumentHeader;
  items: SAPMaterialDocumentItem[];
}

export interface SAPMaterialDocumentResponse {
  success: boolean;
  materialDocument?: string;
  fiscalYear?: string;
  documentDate?: string;
  postingDate?: string;
  authFormat?: number;
  baseUrl?: string;
  message?: string;
  error?: string;
}

export interface BatchSAPResponse {
  success: boolean;
  processed: number;
  errors: number;
  results: Array<{
    mrId: string;
    success: boolean;
    materialDocument?: string;
    fiscalYear?: string;
    error?: string;
  }>;
  errorDetails: Array<{
    mrId: string;
    error: string;
  }>;
}

// Fungsi untuk mendapatkan Firebase Functions instance
const getFirebaseFunctions = () => {
  return getFunctions();
};

// Fungsi untuk membuat SAP Material Document
export const createSAPMaterialDocument = async (
  sapDocument: SAPMaterialDocument,
  username: string,
  password: string
): Promise<SAPMaterialDocumentResponse> => {
  try {
    const functions = getFirebaseFunctions();
    const createSAPMaterialDocumentFn = httpsCallable(functions, 'createSAPMaterialDocument');
    
    const result = await createSAPMaterialDocumentFn({
      sapDocument,
      username,
      password
    });
    
    return result.data as SAPMaterialDocumentResponse;
  } catch (error) {
    console.error('Error creating SAP Material Document:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to create Material Document in SAP'
    };
  }
};

// Fungsi untuk batch processing multiple MR Realizations
export const batchCreateSAPMaterialDocuments = async (
  mrRealizations: any[],
  username: string,
  password: string
): Promise<BatchSAPResponse> => {
  try {
    const functions = getFirebaseFunctions();
    const batchCreateSAPMaterialDocumentsFn = httpsCallable(functions, 'batchCreateSAPMaterialDocuments');
    
    const result = await batchCreateSAPMaterialDocumentsFn({
      mrRealizations,
      username,
      password
    });
    
    return result.data as BatchSAPResponse;
  } catch (error) {
    console.error('Error in batch SAP Material Document creation:', error);
    return {
      success: false,
      processed: 0,
      errors: mrRealizations.length,
      results: [],
      errorDetails: mrRealizations.map(mr => ({
        mrId: mr.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    };
  }
};

// Fungsi helper untuk mapping MRRealization ke SAP format (frontend version)
export const mapMRRealizationToSAP = (mrData: any): SAPMaterialDocument => {
  // Extract plant dari fungsi
  const extractPlantFromFunction = (fungsi: string): string => {
    const plantMapping: { [key: string]: string } = {
      'Gd Ry Kupang': '1000',
      'Gd Ry Denpasar': '1001',
      'Gd Ry Mataram': '1002',
      'Gd Ry Sumbawa': '1003',
      'Gd Ry Bima': '1004',
    };
    return plantMapping[fungsi] || '1000';
  };

  // Extract cost center dari fungsi
  const mapFungsiToCostCenter = (fungsi: string): string => {
    const costCenterMapping: { [key: string]: string } = {
      'Gd Ry Kupang': 'CC001',
      'Gd Ry Denpasar': 'CC002',
      'Gd Ry Mataram': 'CC003',
    };
    return costCenterMapping[fungsi] || 'CC001';
  };

  // Determine movement type
  const determineMovementType = (category: string, pekerjaan: string): string => {
    if (category === 'Eksklusif') {
      return '261'; // Goods issue to order/project
    } else if (pekerjaan.toLowerCase().includes('pemeliharaan')) {
      return '201'; // Goods issue to cost center
    } else if (pekerjaan.toLowerCase().includes('gangguan')) {
      return '201'; // Goods issue to cost center
    } else {
      return '201'; // Default
    }
  };

  return {
    header: {
      documentDate: mrData.tglPengambilan,
      postingDate: new Date().toISOString().split('T')[0],
      documentType: 'WE',
      reference: mrData.nomorReservasi,
      headerText: `${mrData.pekerjaan} - ${mrData.pelaksana}`,
      userName: 'AGO_USER',
      companyCode: '1000'
    },
    items: mrData.materials.map((material: any) => ({
      materialNumber: material.normalisasi,
      plant: extractPlantFromFunction(mrData.fungsi),
      storageLocation: '0001',
      movementType: determineMovementType(mrData.category, mrData.pekerjaan),
      quantity: material.qtyAmbil,
      unitOfMeasure: material.satuan,
      batch: material.nomorSeri,
      serialNumber: mrData.category === 'Eksklusif' ? material.nomorSeri : undefined,
      costCenter: mapFungsiToCostCenter(mrData.fungsi),
      wbsElement: mrData.nomorKontrak,
      itemText: `${material.materialDescription} - ${material.merek}`,
      reasonCode: '01'
    }))
  };
};

// Fungsi untuk validasi data sebelum kirim ke SAP
export const validateSAPMaterialDocument = (sapDoc: SAPMaterialDocument): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Header validations
  if (!sapDoc.header.documentDate) errors.push("Document date is required");
  if (!sapDoc.header.postingDate) errors.push("Posting date is required");
  if (!sapDoc.header.reference) errors.push("Reference (Nomor Reservasi) is required");
  if (!sapDoc.header.companyCode) errors.push("Company code is required");

  // Items validations
  if (!sapDoc.items || sapDoc.items.length === 0) {
    errors.push("At least one material item is required");
  } else {
    sapDoc.items.forEach((item, index) => {
      if (!item.materialNumber) errors.push(`Item ${index + 1}: Material number is required`);
      if (!item.plant) errors.push(`Item ${index + 1}: Plant is required`);
      if (!item.storageLocation) errors.push(`Item ${index + 1}: Storage location is required`);
      if (!item.movementType) errors.push(`Item ${index + 1}: Movement type is required`);
      if (!item.quantity || item.quantity <= 0) errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      if (!item.unitOfMeasure) errors.push(`Item ${index + 1}: Unit of measure is required`);
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Fungsi untuk format data untuk preview
export const formatSAPDocumentForPreview = (sapDoc: SAPMaterialDocument) => {
  return {
    header: {
      'Document Date': sapDoc.header.documentDate,
      'Posting Date': sapDoc.header.postingDate,
      'Document Type': sapDoc.header.documentType,
      'Reference': sapDoc.header.reference,
      'Header Text': sapDoc.header.headerText,
      'Company Code': sapDoc.header.companyCode
    },
    items: sapDoc.items.map((item, index) => ({
      'Item': index + 1,
      'Material Number': item.materialNumber,
      'Plant': item.plant,
      'Storage Location': item.storageLocation,
      'Movement Type': item.movementType,
      'Quantity': item.quantity,
      'Unit': item.unitOfMeasure,
      'Batch': item.batch || '-',
      'Serial Number': item.serialNumber || '-',
      'Cost Center': item.costCenter || '-',
      'WBS Element': item.wbsElement || '-',
      'Item Text': item.itemText || '-'
    }))
  };
};

// Fungsi untuk mendapatkan status SAP dari MR Realization
export const getSAPStatus = (mrData: any): 'not_sent' | 'sent' | 'error' => {
  if (mrData.sapMaterialDocument && mrData.sapFiscalYear) {
    return 'sent';
  } else if (mrData.sapStatus === 'error') {
    return 'error';
  } else {
    return 'not_sent';
  }
};

// Fungsi untuk mendapatkan SAP status text
export const getSAPStatusText = (status: 'not_sent' | 'sent' | 'error'): string => {
  switch (status) {
    case 'sent':
      return 'Terkirim ke SAP';
    case 'error':
      return 'Error';
    case 'not_sent':
    default:
      return 'Belum Terkirim';
  }
};

// Fungsi untuk mendapatkan SAP status color
export const getSAPStatusColor = (status: 'not_sent' | 'sent' | 'error'): string => {
  switch (status) {
    case 'sent':
      return '#52c41a'; // Green
    case 'error':
      return '#ff4d4f'; // Red
    case 'not_sent':
    default:
      return '#faad14'; // Orange
  }
};

export default {
  createSAPMaterialDocument,
  batchCreateSAPMaterialDocuments,
  mapMRRealizationToSAP,
  validateSAPMaterialDocument,
  formatSAPDocumentForPreview,
  getSAPStatus,
  getSAPStatusText,
  getSAPStatusColor
};
