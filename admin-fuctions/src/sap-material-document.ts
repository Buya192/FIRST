import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

// Interface untuk SAP Material Document berdasarkan analisis AGO PLN
export interface SAPMaterialDocumentHeader {
  documentDate: string;        // BLDAT - Document Date
  postingDate: string;         // BUDAT - Posting Date
  documentType: string;        // BLART - Document Type (WE = Goods Issue)
  reference: string;           // XBLNR - Reference Document (Nomor Reservasi)
  headerText: string;          // BKTXT - Header Text
  userName: string;            // USNAM - User Name
  companyCode: string;         // BUKRS - Company Code PLN
}

export interface SAPMaterialDocumentItem {
  materialNumber: string;      // MATNR - Material Number (normalisasi)
  plant: string;              // WERKS - Plant (dari fungsi/gudang)
  storageLocation: string;    // LGORT - Storage Location
  movementType: string;       // BWART - Movement Type (201 = Goods issue to cost center)
  quantity: number;           // MENGE - Quantity (qtyAmbil)
  unitOfMeasure: string;      // MEINS - Unit of Measure (satuan)
  batch?: string;             // CHARG - Batch Number (nomorSeri untuk tracking)
  serialNumber?: string;      // SERNR - Serial Number (untuk eksklusif)
  costCenter?: string;        // KOSTL - Cost Center (dari fungsi)
  wbsElement?: string;        // PS_PSP_PNR - WBS Element (nomorKontrak)
  glAccount?: string;         // SAKTO - G/L Account
  reasonCode?: string;        // GRUND - Reason Code
  itemText?: string;          // SGTXT - Item Text
}

export interface SAPMaterialDocument {
  header: SAPMaterialDocumentHeader;
  items: SAPMaterialDocumentItem[];
}

export interface SAPMaterialDocumentResponse {
  materialDocument: string;   // Material Document Number dari SAP
  fiscalYear: string;         // Fiscal Year
  documentDate: string;       // Document Date
  postingDate: string;        // Posting Date
  items: {
    materialDocumentItem: string;
    material: string;
    quantity: string;
    unitOfMeasure: string;
  }[];
}

// Fungsi helper untuk mapping data MRRealization ke SAP format
export const mapMRRealizationToSAP = (mrData: any): SAPMaterialDocument => {
  // Extract plant dari fungsi (contoh: "Gd Ry Kupang" -> "1000")
  const extractPlantFromFunction = (fungsi: string): string => {
    // Mapping fungsi ke plant code PLN
    const plantMapping: { [key: string]: string } = {
      'Gd Ry Kupang': '1000',
      'Gd Ry Denpasar': '1001',
      'Gd Ry Mataram': '1002',
      'Gd Ry Sumbawa': '1003',
      'Gd Ry Bima': '1004',
      // Tambahkan mapping lainnya sesuai kebutuhan PLN
    };
    
    return plantMapping[fungsi] || '1000'; // Default plant
  };

  // Extract cost center dari fungsi
  const mapFungsiToCostCenter = (fungsi: string): string => {
    // Mapping fungsi ke cost center PLN
    const costCenterMapping: { [key: string]: string } = {
      'Gd Ry Kupang': 'CC001',
      'Gd Ry Denpasar': 'CC002',
      'Gd Ry Mataram': 'CC003',
      // Tambahkan mapping lainnya
    };
    
    return costCenterMapping[fungsi] || 'CC001'; // Default cost center
  };

  // Determine movement type berdasarkan kategori dan jenis pekerjaan
  const determineMovementType = (category: string, pekerjaan: string): string => {
    // Berdasarkan analisis AGO PLN dan SAP standard
    if (category === 'Eksklusif') {
      return '261'; // Goods issue to order/project (untuk eksklusif)
    } else if (pekerjaan.toLowerCase().includes('pemeliharaan')) {
      return '201'; // Goods issue to cost center (untuk pemeliharaan)
    } else if (pekerjaan.toLowerCase().includes('gangguan')) {
      return '201'; // Goods issue to cost center (untuk gangguan)
    } else {
      return '201'; // Default: Goods issue to cost center
    }
  };

  return {
    header: {
      documentDate: mrData.tglPengambilan,
      postingDate: new Date().toISOString().split('T')[0], // Today's date
      documentType: 'WE', // Goods Issue
      reference: mrData.nomorReservasi,
      headerText: `${mrData.pekerjaan} - ${mrData.pelaksana}`,
      userName: 'AGO_USER', // Default user atau dari context
      companyCode: '1000' // PLN company code
    },
    items: mrData.materials.map((material: any) => ({
      materialNumber: material.normalisasi,
      plant: extractPlantFromFunction(mrData.fungsi),
      storageLocation: '0001', // Default storage location atau dari config
      movementType: determineMovementType(mrData.category, mrData.pekerjaan),
      quantity: material.qtyAmbil,
      unitOfMeasure: material.satuan,
      batch: material.nomorSeri, // Untuk tracking
      serialNumber: mrData.category === 'Eksklusif' ? material.nomorSeri : undefined,
      costCenter: mapFungsiToCostCenter(mrData.fungsi),
      wbsElement: mrData.nomorKontrak, // Project reference
      itemText: `${material.materialDescription} - ${material.merek}`,
      reasonCode: '01' // Material request fulfillment
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

// Fungsi untuk mencoba multiple URL dan format autentikasi (reuse dari sap-integration-enhanced)
const tryMultipleAuthFormats = async (
  endpoint: string,
  username?: string,
  password?: string,
  data?: any,
  method: 'GET' | 'POST' = 'POST'
) => {
  // Import fungsi dari sap-integration-enhanced
  const { getSAPConfig } = require('./sap-integration-enhanced');
  
  const config = getSAPConfig(username, password);
  const urls = [config.baseUrl, ...config.alternativeUrls];
  
  // Format autentikasi berdasarkan analisis AGO PLN
  const authFormats = [
    Buffer.from(`pusat\\${username}:${password}`).toString('base64'),
    Buffer.from(`${username}:${password}`).toString('base64'),
    Buffer.from(`${username.replace(/\./g, '')}:${password}`).toString('base64'),
    Buffer.from(`${config.client}:${username}:${password}`).toString('base64'),
  ];

  for (let urlIndex = 0; urlIndex < urls.length; urlIndex++) {
    const baseUrl = urls[urlIndex];
    
    for (let authIndex = 0; authIndex < authFormats.length; authIndex++) {
      try {
        console.log(`Trying URL ${urlIndex + 1}/${urls.length}, Auth ${authIndex + 1}/${authFormats.length}`);
        
        const headers = {
          'Authorization': 'Basic ' + authFormats[authIndex],
          'x-csrf-token': 'fetch',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };

        const response = await axios({
          method,
          url: `${baseUrl}${endpoint}`,
          headers,
          data,
          timeout: 15000 // 15 second timeout
        });

        console.log(`Success with URL ${baseUrl}, Auth format ${authIndex + 1}`);
        return { 
          response, 
          urlIndex, 
          authFormat: authIndex + 1, 
          baseUrl 
        };
      } catch (error) {
        console.log(`Failed URL ${baseUrl}, Auth ${authIndex + 1}:`, error.message);
      }
    }
  }
  
  throw new Error('All SAP URLs and authentication formats failed');
};

// Firebase Function untuk membuat SAP Material Document
export const createSAPMaterialDocument = functions.https.onCall(async (data, context) => {
  // Verifikasi autentikasi
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  try {
    const { sapDocument, username, password } = data;

    // Validasi data
    const validation = validateSAPMaterialDocument(sapDocument);
    if (!validation.isValid) {
      throw new functions.https.HttpsError('invalid-argument', `Validation failed: ${validation.errors.join(', ')}`);
    }

    // Endpoint SAP untuk Material Document creation
    const endpoint = '/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentHeader';
    
    // Format data untuk SAP OData
    const sapPayload = {
      DocumentDate: sapDocument.header.documentDate,
      PostingDate: sapDocument.header.postingDate,
      MaterialDocumentHeaderText: sapDocument.header.headerText,
      ReferenceDocument: sapDocument.header.reference,
      to_MaterialDocumentItem: sapDocument.items.map(item => ({
        Material: item.materialNumber,
        Plant: item.plant,
        StorageLocation: item.storageLocation,
        GoodsMovementType: item.movementType,
        QuantityInEntryUnit: item.quantity.toString(),
        EntryUnit: item.unitOfMeasure,
        Batch: item.batch || '',
        SerialNumber: item.serialNumber || '',
        CostCenter: item.costCenter || '',
        WBSElement: item.wbsElement || '',
        MaterialDocumentItemText: item.itemText || ''
      }))
    };

    // Kirim ke SAP dengan multiple URL/auth attempts
    const result = await tryMultipleAuthFormats(endpoint, username, password, sapPayload, 'POST');

    // Parse response dari SAP
    const sapResponse = result.response.data.d;
    const materialDocumentNumber = sapResponse.MaterialDocument;
    const fiscalYear = sapResponse.MaterialDocumentYear;

    // Simpan ke Firestore untuk audit trail
    const db = admin.firestore();
    const auditRef = db.collection('sapMaterialDocuments').doc();
    await auditRef.set({
      materialDocument: materialDocumentNumber,
      fiscalYear: fiscalYear,
      originalData: sapDocument,
      sapResponse: sapResponse,
      createdBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      authFormat: result.authFormat,
      baseUrl: result.baseUrl,
      status: 'success'
    });

    return {
      success: true,
      materialDocument: materialDocumentNumber,
      fiscalYear: fiscalYear,
      documentDate: sapDocument.header.documentDate,
      postingDate: sapDocument.header.postingDate,
      authFormat: result.authFormat,
      baseUrl: result.baseUrl,
      message: `Material Document ${materialDocumentNumber} created successfully in SAP`
    };

  } catch (error) {
    console.error('Error creating SAP Material Document:', error);
    
    // Simpan error ke Firestore untuk debugging
    const db = admin.firestore();
    const errorRef = db.collection('sapErrors').doc();
    await errorRef.set({
      operation: 'createMaterialDocument',
      error: error.message,
      data: data,
      createdBy: context.auth?.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    throw new functions.https.HttpsError('internal', `Failed to create Material Document in SAP: ${error.message}`);
  }
});

// Firebase Function untuk batch processing multiple MR Realizations
export const batchCreateSAPMaterialDocuments = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  try {
    const { mrRealizations, username, password } = data;
    const results = [];
    const errors = [];

    for (let i = 0; i < mrRealizations.length; i++) {
      const mrData = mrRealizations[i];
      
      try {
        // Convert MR Realization ke SAP format
        const sapDocument = mapMRRealizationToSAP(mrData);
        
        // Create Material Document
        const result = await createSAPMaterialDocument.handler({
          sapDocument,
          username,
          password
        }, context);

        results.push({
          mrId: mrData.id,
          success: true,
          materialDocument: result.materialDocument,
          fiscalYear: result.fiscalYear
        });

        // Update MR Realization dengan SAP document number
        const db = admin.firestore();
        await db.collection('mrRealization').doc(mrData.id).update({
          sapMaterialDocument: result.materialDocument,
          sapFiscalYear: result.fiscalYear,
          sapSentAt: admin.firestore.FieldValue.serverTimestamp(),
          sapStatus: 'sent'
        });

      } catch (error) {
        errors.push({
          mrId: mrData.id,
          error: error.message
        });
      }
    }

    return {
      success: true,
      processed: results.length,
      errors: errors.length,
      results,
      errors
    };

  } catch (error) {
    console.error('Error in batch processing:', error);
    throw new functions.https.HttpsError('internal', `Batch processing failed: ${error.message}`);
  }
});
