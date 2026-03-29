import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { InventoryItem } from '../hooks/useInventory';
import { Reservasi } from '../components/Reservasi';

export const getMaterialByNormalisasi = async (normalisasi: string): Promise<InventoryItem | null> => {
  try {
    const inventoryRef = collection(db, 'inventory');
    const q = query(inventoryRef, where('normalisasi', '==', normalisasi));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as InventoryItem;
  } catch (error) {
    console.error('Error fetching material by normalisasi:', error);
    throw error;
  }
};

export const testAPIConnection = async (): Promise<boolean> => {
  try {
    const inventoryRef = collection(db, 'inventory');
    const querySnapshot = await getDocs(inventoryRef);
    console.log('API connection successful. Documents count:', querySnapshot.size);
    return true;
  } catch (error) {
    console.error('API connection failed:', error);
    return false;
  }
};

export const getLastReservationNumber = async (): Promise<string> => {
  try {
    const reservationsRef = collection(db, 'reservations');
    const q = query(reservationsRef, orderBy('nomorReservasi', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return '0';
    }

    const lastReservation = querySnapshot.docs[0].data() as Reservasi;
    return lastReservation.nomorReservasi;
  } catch (error) {
    console.error('Error fetching last reservation number:', error);
    throw error;
  }
};

// Add more API functions as needed
