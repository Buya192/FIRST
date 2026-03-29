import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser, signOut, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { db, auth } from '../utils/firebase';
import logger from '../utils/logger';
import { message } from 'antd';

export interface MasterDataItem {
  id: string;
  normalisasi: string;
  materialDescription: string;
  satuan: string;
  valuationDescription: string;
  hargaSatuan: number;
}

export interface MasterUserItem {
  id: string;
}

export interface MasterGudangItem {
  id: string;
  companyCode: string;
  companyCodeDescription: string;
  plant: string;
  plantDescription: string;
  storageLocation: string;
  storageLocationDescription: string;
}

export interface MaterialEntry {
  key: string;
  kategori: string;
  normalisasi: string;
  materialDescription: string;
  satuan: string;
  quantity: number;
  nilaiMaterial: number;
  kondisi: string;
  keterangan: string;
  nomorWO?: string;
  nomorDokumen?: string;
  pengembali?: string;
  lokasiPenyimpanan?: string;
  catatan?: string;
  woId?: string;
}

export interface WorkOrder {
  id: string;
  nomorWO: string;
  nomorDokumen: string;
  tanggal: string;
  status: 'pending' | 'verified' | 'completed';
  nomorAsset?: string;
  deskripsiMaterial: string;
  pengembali: string;
  petugas: string;
  kategori: string;
  materials: MaterialEntry[];
  keterangan: string;
}

export interface AppState {
  masterData: MasterDataItem[];
  masterUsers: MasterUserItem[];
  masterGudang: MasterGudangItem[];
  workOrders: WorkOrder[];
}

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

export interface User extends FirebaseUser {
  roles?: string[];
}

export interface AppContextType {
  user: User | null;
  loading: boolean;
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  updateAppData: () => Promise<void>;
  inventory: InventoryItem[];
  fetchInventory: () => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>; // New addition
  logout: () => Promise<void>;
  testConnection: () => Promise<boolean>;
  getMasterMaterialData?: () => Promise<MasterDataItem[]>;
  workOrders: WorkOrder[];
  addWorkOrder: (workOrder: WorkOrder) => void;
  verifyWorkOrder: (workOrderId: string, verifiedMaterials: MaterialEntry[]) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<AppState>({
    masterData: [],
    masterUsers: [],
    masterGudang: [],
    workOrders: []
  });
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const testSnapshot = await getDocs(collection(db, 'masterData'));
      return !testSnapshot.empty;
    } catch (error) {
      logger.error('Error testing Firebase connection:', error);
      return false;
    }
  }, []);

  const fetchUserRoles = useCallback(async (uid: string): Promise<string[]> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.roles || ['user'];
      }
    } catch (error) {
      logger.error('Error fetching user roles:', error);
    }
    return ['user'];
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      const connectionSuccess = await testConnection();
      if (!connectionSuccess) {
        setLoading(false);
        return;
      }

      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const userRoles = await fetchUserRoles(firebaseUser.uid);
          setUser({ ...firebaseUser, roles: userRoles });
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return unsubscribe;
    };

    initializeApp();
  }, [fetchUserRoles, testConnection]);

  const login = useCallback(async (email: string, password: string) => {
    if (email === 'buya@.com' && password === '123') {
      // Mock Super Admin login
      const mockUser = {
        uid: 'superadmin-mock-id',
        email: 'buya@.com',
        roles: ['superadmin'],
        emailVerified: true,
        isAnonymous: false,
        metadata: {},
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => {},
        getIdToken: async () => '',
        getIdTokenResult: async () => ({} as any),
        reload: async () => {},
        toJSON: () => ({})
      } as unknown as User;

      setUser(mockUser);
      return;
    }

    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      logger.error('Error signing in with Google:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setAppState({ masterData: [], masterUsers: [], masterGudang: [], workOrders: [] });
    setInventory([]);
  }, []);

  const fetchInventory = useCallback(async () => {
    if (!user) return;
    try {
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      const inventoryData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InventoryItem));
      setInventory(inventoryData);
    } catch (error) {
      logger.error('Error fetching inventory:', error);
    }
  }, [user]);

  const addInventoryItem = useCallback(async (item: Omit<InventoryItem, 'id'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'inventory'), item);
      await fetchInventory();
    } catch (error) {
      logger.error('Error adding inventory item:', error);
      throw error;
    }
  }, [user, fetchInventory]);

  const updateInventoryItem = useCallback(async (id: string, item: Partial<InventoryItem>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'inventory', id), item);
      await fetchInventory();
    } catch (error) {
      logger.error('Error updating inventory item:', error);
      throw error;
    }
  }, [user, fetchInventory]);

  const deleteInventoryItem = useCallback(async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'inventory', id));
      await fetchInventory();
    } catch (error) {
      logger.error('Error deleting inventory item:', error);
      throw error;
    }
  }, [user, fetchInventory]);

  const updateAppData = useCallback(async () => {
    if (!user) return;
    try {
      const masterDataSnapshot = await getDocs(collection(db, 'masterData'));
      const masterData = masterDataSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterDataItem));

      const masterUsersSnapshot = await getDocs(collection(db, 'masterUsers'));
      const masterUsers = masterUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterUserItem));

      const masterGudangSnapshot = await getDocs(collection(db, 'masterGudang'));
      const masterGudang = masterGudangSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterGudangItem));

      setAppState(prevState => ({ ...prevState, masterData, masterUsers, masterGudang }));
    } catch (error) {
      logger.error('Error updating app data:', error);
    }
  }, [user]);

  const getMasterMaterialData = useCallback(async (): Promise<MasterDataItem[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, 'masterData'));
      const masterMaterialData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as MasterDataItem));
      return masterMaterialData;
    } catch (error) {
      logger.error('Error fetching master material data:', error);
      throw error;
    }
  }, []);

  const addWorkOrder = useCallback((workOrder: WorkOrder) => {
    if (!workOrder.materials.every(material => material.quantity && material.satuan)) {
      message.error('Work Order tidak dapat disimpan. Pastikan semua material terisi lengkap.');
      return;
    }

    setAppState(prevState => ({
      ...prevState,
      workOrders: [...prevState.workOrders, workOrder]
    }));

    message.success(`Work Order ${workOrder.nomorWO} berhasil ditambahkan.`);
  }, []);

  const verifyWorkOrder = useCallback(async (workOrderId: string, verifiedMaterials: MaterialEntry[]) => {
    const workOrder = appState.workOrders.find(wo => wo.id === workOrderId);
    if (!workOrder) return;

    try {
      // Simpan material yang terverifikasi ke milestone yang sesuai
      await Promise.all(verifiedMaterials.map(async (material) => {
        let collectionName = '';
        
        // Tentukan koleksi berdasarkan kategori dan kondisi
        if (material.kategori === 'Material Eksklusif') {
          collectionName = material.kondisi === 'Baik' ? 'milestoneBaikEksklusif' : 'milestoneRusakEksklusif';
        } else {
          collectionName = material.kondisi === 'Baik' ? 'milestoneBaik' : 'milestoneRusak';
        }

        // Simpan material terverifikasi ke koleksi yang sesuai
        await addDoc(collection(db, collectionName), {
          ...material,
          nomorWO: workOrder.nomorWO,
          nomorDokumen: workOrder.nomorDokumen,
          tanggal: workOrder.tanggal,
          pengembali: workOrder.pengembali
        });
      }));

      // Hapus material yang telah diverifikasi dari work order
      const updatedMaterials = workOrder.materials.filter(
        m => !verifiedMaterials.some(vm => vm.key === m.key)
      );

      // Tentukan status baru (completed jika semua material telah diverifikasi)
      const newStatus = updatedMaterials.length === 0 ? 'completed' : 'pending';

      // Perbarui work order di Firestore
      const workOrderRef = doc(db, 'workOrders', workOrderId);
      await updateDoc(workOrderRef, { 
        materials: updatedMaterials,
        status: newStatus
      });

      // Perbarui state aplikasi secara lokal
      setAppState(prevState => ({
        ...prevState,
        workOrders: prevState.workOrders.map(wo =>
          wo.id === workOrderId 
            ? { ...wo, materials: updatedMaterials, status: newStatus } 
            : wo
        )
      }));

      message.success('Material berhasil diverifikasi dan dipindahkan ke milestone.');
    } catch (error) {
      logger.error('Error verifying work order:', error);
      message.error('Gagal memverifikasi Work Order. Silakan coba lagi.');
    }
  }, [appState.workOrders]);

  const contextValue = useMemo(() => ({
    user,
    loading,
    appState,
    setAppState,
    updateAppData,
    inventory,
    fetchInventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    login,
    loginWithGoogle, // New addition
    logout,
    testConnection,
    getMasterMaterialData,
    workOrders: appState.workOrders,
    addWorkOrder,
    verifyWorkOrder
  }), [user, loading, appState, updateAppData, inventory, fetchInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, login, loginWithGoogle, logout, testConnection, getMasterMaterialData, addWorkOrder, verifyWorkOrder]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
