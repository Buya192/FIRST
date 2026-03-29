import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import {
  getSAPMaterialStock,
  getSAPMaterial,
  searchSAPMaterials,
  getSAPMaterialDocument,
  testSAPConnection,
  testSAPConnectionHttp
} from './sap-integration';

admin.initializeApp();

const corsHandler = cors({ origin: true });

// Fungsi untuk mengambil data material berdasarkan normalisasi
export const getMaterialByNormalisasi = onRequest(async (request, response) => {
  corsHandler(request, response, async () => {
    const normalisasi = request.path.split('/').pop();

    if (!normalisasi) {
      logger.error('Normalisasi not provided');
      response.status(400).send({ error: 'Normalisasi parameter is required' });
      return;
    }

    logger.info(`Requesting material data for normalisasi: ${normalisasi}`);

    try {
      const db = admin.firestore();
      const materialQuery = await db.collection('masterData').where('normalisasi', '==', normalisasi).limit(1).get();

      if (materialQuery.empty) {
        logger.warn(`Material not found for normalisasi: ${normalisasi}`);
        response.status(404).send({ error: 'Material not found' });
        return;
      }

      const materialDoc = materialQuery.docs[0];
      const materialData = materialDoc.data();
      logger.info(`Material data found:`, materialData);

      response.status(200).send({
        normalisasi: materialData.normalisasi,
        description: materialData.materialDescription,
        unit: materialData.satuan
      });
    } catch (error) {
      logger.error('Error fetching material:', error);
      response.status(500).send({ error: 'Internal server error' });
    }
  });
});

// Fungsi untuk tes koneksi API
export const testConnection = onRequest((request, response) => {
  corsHandler(request, response, () => {
    response.status(200).send({ message: 'API connection successful' });
  });
});

// Ekspor fungsi-fungsi SAP
export {
  getSAPMaterialStock,
  getSAPMaterial,
  searchSAPMaterials,
  getSAPMaterialDocument,
  testSAPConnection,
  testSAPConnectionHttp
};
