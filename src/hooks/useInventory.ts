import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  materialDescription: string;
  warrantyDate?: string;
  description: string;
  category: string;
}

export const useInventory = () => {
  const inventoryCollection = collection(db, 'inventory');

  const fetchInventory = async (): Promise<InventoryItem[]> => {
    try {
      const snapshot = await getDocs(inventoryCollection);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw error;
    }
  };

  const addItem = async (item: Omit<InventoryItem, 'id'>): Promise<void> => {
    try {
      await addDoc(inventoryCollection, item);
    } catch (error) {
      console.error('Error adding inventory item:', error);
      throw error;
    }
  };

  const updateItem = async (item: InventoryItem): Promise<void> => {
    try {
      const { id, ...updateData } = item;
      const itemDoc = doc(db, 'inventory', id);
      await updateDoc(itemDoc, updateData);
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  };

  const deleteItem = async (id: string): Promise<void> => {
    try {
      const itemDoc = doc(db, 'inventory', id);
      await deleteDoc(itemDoc);
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  };

  return {
    fetchInventory,
    addItem,
    updateItem,
    deleteItem,
  };
};

export default useInventory;