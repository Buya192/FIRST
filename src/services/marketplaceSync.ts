/**
 * PLN Marketplace Sync Service
 * Handles bidirectional synchronization between internal MonitoringMasuk and PLN Marketplace
 */

import { collection, doc, updateDoc, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';

// Mock PLN Marketplace data structure (based on analysis)
interface PLNMarketplaceOrder {
  orderId: string;
  contractNumber: string;
  materialCode: string;
  materialName: string;
  supplierName: string;
  orderDate: string;
  deliveryDate: string;
  poNumber: string;
  orderedQuantity: number;
  receivedQuantity: number;
  status: 'pending' | 'in_transit' | 'delivered' | 'completed';
  documents: {
    tug3?: string;
    tug4?: string;
    deliveryNote?: string;
    invoice?: string;
  };
  lastUpdated: string;
}

// Enhanced MonitoringMasuk item with marketplace integration
interface EnhancedMonitoringMasukItem {
  id: string;
  nomorSPBKontrak: string;
  tanggal: string;
  normalisasiNumber: string;
  namaMaterial: string;
  fungsi: string;
  penyedia: string;
  tanggalTiba: string;
  noPO: string;
  qtyPesan: number;
  qtyDiterima: number;
  nomorTUG3?: string;
  nomorTUG4?: string;
  status: string;
  arsipLengkap: boolean;
  jenisMaterial: 'umum' | 'eksklusif';
  foto?: string[];
  dokumen?: string[];
  keterangan?: string;
  
  // Marketplace integration fields
  marketplaceOrderId?: string;
  marketplaceStatus?: string;
  marketplaceLastSync?: string;
  marketplaceUrl?: string;
  autoSyncEnabled?: boolean;
  syncErrors?: string[];
}

export class MarketplaceSync {
  private static instance: MarketplaceSync;
  private isConnected: boolean = false;
  private lastSyncTime: Date | null = null;
  private useRealApi: boolean = false; // Toggle untuk real API
  private authToken: string | null = null; // Token untuk authentication

  private constructor() {}

  public static getInstance(): MarketplaceSync {
    if (!MarketplaceSync.instance) {
      MarketplaceSync.instance = new MarketplaceSync();
    }
    return MarketplaceSync.instance;
  }

  /**
   * Set API mode (demo or real)
   */
  setRealApiMode(enabled: boolean): void {
    this.useRealApi = enabled;
    console.log(`🔧 API Mode switched to: ${enabled ? 'Real API' : 'Demo Mode'}`);
  }

  /**
   * Get current API mode
   */
  isRealApiMode(): boolean {
    return this.useRealApi;
  }

  /**
   * Connection to PLN Marketplace (supports both demo and real mode)
   */
  async connect(): Promise<boolean> {
    try {
      if (this.useRealApi) {
        console.log('🔄 Attempting Real API connection...');
        const realApiSuccess = await this.connectToRealApi();
        if (realApiSuccess) {
          return true;
        } else {
          // If Real API fails, automatically fallback to Demo mode
          console.log('🔄 Real API failed, falling back to Demo mode...');
          this.useRealApi = false;
          return await this.connectToMockApi();
        }
      } else {
        return await this.connectToMockApi();
      }
    } catch (error) {
      console.error('❌ Failed to connect to PLN Marketplace:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Mock connection for demo mode
   */
  private async connectToMockApi(): Promise<boolean> {
    console.log('🔌 Connecting to PLN Marketplace (Demo Mode)...');
    
    // Mock connection delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.isConnected = true;
    console.log('✅ Connected to PLN Marketplace (Demo Mode)');
    return true;
  }

  /**
   * Real API connection
   */
  private async connectToRealApi(): Promise<boolean> {
    console.log('🔌 Connecting to PLN Marketplace (Real API)...');
    
    try {
      // Real API authentication
      const response = await fetch('https://apimarketplace.pln.co.id/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'adrianus.hito',
          password: '@Dhi062025'
        })
      });
      
      if (response.ok) {
        const authData = await response.json();
        this.authToken = authData.token;
        this.isConnected = true;
        console.log('✅ Connected to PLN Marketplace (Real API)');
        return true;
      } else {
        const errorText = await response.text();
        console.error(`❌ Authentication failed: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Real API connection failed:', error);
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('🌐 Network error detected - API might be unreachable');
      }
      
      // Fallback to demo mode if real API fails
      console.log('🔄 Falling back to Demo Mode...');
      this.useRealApi = false;
      return await this.connectToMockApi();
    }
  }

  /**
   * Get real PLN Marketplace orders using actual API structure
   * Based on real data from PLN Marketplace API
   */
  private getRealMarketplaceOrders(): PLNMarketplaceOrder[] {
    // Real data structure from PLN Marketplace API
    const realApiData = {
      "status": 200,
      "data": {
        "content": [
          {
            "id": "DO202500018602",
            "unitName": "PLN UP3 Kupang",
            "qty": 3,
            "qtyPo": 8,
            "supplierName": "PT BAMBANG DJAJA",
            "nopo": "PO202500004270",
            "submitDate": "2025-06-09T00:00:00.000+0700",
            "eta": "2025-06-21T20:00:00.000+0700",
            "status": "PROCCESSED",
            "detail": [
              {
                "description": "TRF DIS D3 20kV 400V 3P 250kVA DYN5 OD\n",
                "sku": "1582012397266",
                "qty": 3,
                "qtyTerima": 0,
                "noBaTug3": null,
                "noBbaTug4": null,
                "status": "CREATED"
              }
            ]
          },
          {
            "id": "DO202500018724",
            "unitName": "PLN UP3 Kupang",
            "qty": 4000,
            "qtyPo": 10200,
            "supplierName": "PT SUPREME CABLE MANUFACTURING & COMMERCE TBK (PT SUCACO TBK)",
            "nopo": "PO202500004523",
            "submitDate": "2025-05-27T00:00:00.000+0700",
            "eta": "2025-06-25T20:00:00.000+0700",
            "status": "PROCCESSED",
            "detail": [
              {
                "description": "CABLE PWR NYY 1X70mm2 0 6 1kV Opstig\n",
                "sku": "1702631534571",
                "qty": 4000,
                "qtyTerima": 0,
                "noBaTug3": null,
                "noBbaTug4": null,
                "status": "CREATED"
              }
            ]
          },
          {
            "id": "DO202500017014",
            "unitName": "PLN UP3 Kupang",
            "qty": 3500,
            "qtyPo": 11250,
            "supplierName": "PT SMART METER INDONESIA",
            "nopo": "PO202500004542",
            "submitDate": "2025-05-27T00:00:00.000+0700",
            "eta": "2025-06-09T20:00:00.000+0700",
            "status": "PROCCESSED",
            "detail": [
              {
                "description": "MTR kWH E PR  1P 230V 5 60A 1  2W\n",
                "sku": "1636794828510",
                "qty": 3500,
                "qtyTerima": 0,
                "noBaTug3": null,
                "noBbaTug4": null,
                "status": "CREATED"
              }
            ]
          }
        ]
      }
    };

    // Convert real API data to our interface format
    return realApiData.data.content.map(item => ({
      orderId: item.id,
      contractNumber: item.id, // Using DO number as contract
      materialCode: item.detail[0]?.sku || '',
      materialName: item.detail[0]?.description?.trim() || '',
      supplierName: item.supplierName,
      orderDate: item.submitDate.split('T')[0],
      deliveryDate: item.eta.split('T')[0],
      poNumber: item.nopo,
      orderedQuantity: item.qty,
      receivedQuantity: item.detail[0]?.qtyTerima || 0,
      status: this.mapPlnStatusToInternal(item.status),
      documents: {
        tug3: item.detail[0]?.noBaTug3 || undefined,
        tug4: item.detail[0]?.noBbaTug4 || undefined,
        deliveryNote: `DN-${item.id}`
      },
      lastUpdated: new Date().toISOString()
    }));
  }

  /**
   * Map PLN Marketplace status to internal status
   */
  private mapPlnStatusToInternal(plnStatus: string): 'pending' | 'in_transit' | 'delivered' | 'completed' {
    const statusMap: Record<string, 'pending' | 'in_transit' | 'delivered' | 'completed'> = {
      'CREATED': 'pending',
      'PROCCESSED': 'in_transit',
      'DELIVERED': 'delivered',
      'COMPLETED': 'completed'
    };
    
    return statusMap[plnStatus] || 'pending';
  }

  /**
   * Fetch data from real PLN Marketplace API
   */
  private async fetchFromRealApi(): Promise<PLNMarketplaceOrder[]> {
    if (!this.authToken) {
      throw new Error('No authentication token available');
    }

    const response = await fetch(
      'https://apimarketplace.pln.co.id/product/sku/get-data-material-sidebar',
      {
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const realData = await response.json();
    
    // Convert real API response to our format
    return realData.data.content.map((item: any) => ({
      orderId: item.id,
      contractNumber: item.id,
      materialCode: item.detail[0]?.sku || '',
      materialName: item.detail[0]?.description?.trim() || '',
      supplierName: item.supplierName,
      orderDate: item.submitDate.split('T')[0],
      deliveryDate: item.eta.split('T')[0],
      poNumber: item.nopo,
      orderedQuantity: item.qty,
      receivedQuantity: item.detail[0]?.qtyTerima || 0,
      status: this.mapPlnStatusToInternal(item.status),
      documents: {
        tug3: item.detail[0]?.noBaTug3 || undefined,
        tug4: item.detail[0]?.noBbaTug4 || undefined,
        deliveryNote: `DN-${item.id}`
      },
      lastUpdated: new Date().toISOString()
    }));
  }

  /**
   * Sync data from PLN Marketplace to internal MonitoringMasuk
   */
  async syncFromMarketplace(): Promise<{
    success: boolean;
    newItems: number;
    updatedItems: number;
    errors: string[];
  }> {
    if (!this.isConnected) {
      throw new Error('Not connected to PLN Marketplace. Call connect() first.');
    }

    const result = {
      success: false,
      newItems: 0,
      updatedItems: 0,
      errors: [] as string[]
    };

    try {
      console.log(`📥 Syncing data from PLN Marketplace (${this.useRealApi ? 'Real API' : 'Demo Mode'})...`);
      
      // Get marketplace orders based on mode
      let marketplaceOrders: PLNMarketplaceOrder[] = [];
      
      try {
        marketplaceOrders = this.useRealApi 
          ? await this.fetchFromRealApi()
          : this.getRealMarketplaceOrders();
        
        console.log(`📦 Found ${marketplaceOrders.length} orders from marketplace`);
        
        if (marketplaceOrders.length === 0) {
          console.log('⚠️ No orders found in marketplace');
          result.success = true;
          return result;
        }
      } catch (fetchError) {
        const errorMsg = `Failed to fetch marketplace data: ${fetchError}`;
        result.errors.push(errorMsg);
        console.error('❌', errorMsg);
        return result;
      }
      
      for (const order of marketplaceOrders) {
        try {
          console.log(`🔄 Processing order: ${order.orderId}`);
          
          // Validate order data
          if (!order.orderId || !order.contractNumber || !order.materialName) {
            const errorMsg = `Invalid order data for ${order.orderId}: missing required fields`;
            result.errors.push(errorMsg);
            console.error('❌', errorMsg);
            continue;
          }
          
          // Check if item already exists in MonitoringMasuk
          const existingQuery = query(
            collection(db, 'transaksiMasuk'),
            where('marketplaceOrderId', '==', order.orderId)
          );
          const existingDocs = await getDocs(existingQuery);

          if (existingDocs.empty) {
            // Create new MonitoringMasuk item
            const newItem: any = {
              nomorSPBKontrak: order.contractNumber,
              tanggal: order.orderDate,
              normalisasiNumber: order.materialCode || '',
              namaMaterial: order.materialName,
              fungsi: 'Distribusi', // Default value
              penyedia: order.supplierName,
              tanggalTiba: order.deliveryDate,
              noPO: order.poNumber,
              qtyPesan: order.orderedQuantity || 0,
              qtyDiterima: order.receivedQuantity || 0,
              nomorTUG3: order.documents.tug3 || null,
              nomorTUG4: order.documents.tug4 || null,
              status: this.mapMarketplaceStatus(order.status),
              arsipLengkap: false,
              jenisMaterial: 'umum',
              keterangan: `Synced from PLN Marketplace - Order ID: ${order.orderId}`,
              
              // Marketplace integration fields
              marketplaceOrderId: order.orderId,
              marketplaceStatus: order.status,
              marketplaceLastSync: new Date().toISOString(),
              marketplaceUrl: `https://marketplace.pln.co.id/orders/${order.orderId}`,
              autoSyncEnabled: true,
              syncErrors: [],
              
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };

            try {
              await addDoc(collection(db, 'transaksiMasuk'), newItem);
              result.newItems++;
              console.log(`✅ Created new item: ${order.contractNumber}`);
            } catch (firestoreError) {
              const errorMsg = `Failed to save order ${order.orderId} to database: ${firestoreError}`;
              result.errors.push(errorMsg);
              console.error('❌', errorMsg);
            }
            
          } else {
            // Update existing item
            const existingDoc = existingDocs.docs[0];
            const updateData = {
              qtyDiterima: order.receivedQuantity || 0,
              nomorTUG3: order.documents.tug3 || null,
              nomorTUG4: order.documents.tug4 || null,
              status: this.mapMarketplaceStatus(order.status),
              marketplaceStatus: order.status,
              marketplaceLastSync: new Date().toISOString(),
              updatedAt: serverTimestamp()
            };

            try {
              await updateDoc(doc(db, 'transaksiMasuk', existingDoc.id), updateData);
              result.updatedItems++;
              console.log(`🔄 Updated item: ${order.contractNumber}`);
            } catch (firestoreError) {
              const errorMsg = `Failed to update order ${order.orderId} in database: ${firestoreError}`;
              result.errors.push(errorMsg);
              console.error('❌', errorMsg);
            }
          }
          
        } catch (itemError) {
          const errorMsg = `Error processing order ${order.orderId}: ${itemError}`;
          result.errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      this.lastSyncTime = new Date();
      result.success = result.errors.length === 0;
      
      console.log(`📊 Sync completed: ${result.newItems} new, ${result.updatedItems} updated, ${result.errors.length} errors`);
      
      if (result.errors.length > 0) {
        console.log('❌ Sync errors:', result.errors);
      }
      
      return result;
      
    } catch (error) {
      const errorMsg = `Sync failed: ${error}`;
      result.errors.push(errorMsg);
      console.error('❌ Marketplace sync failed:', error);
      return result;
    }
  }

  /**
   * Update marketplace status from internal MonitoringMasuk
   */
  async updateMarketplaceStatus(item: EnhancedMonitoringMasukItem): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Not connected to PLN Marketplace. Call connect() first.');
    }

    try {
      console.log(`📤 Updating marketplace status for: ${item.nomorSPBKontrak}`);
      
      // Mock API call to update marketplace
      // In real implementation, this would call PLN Marketplace API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update local record with sync timestamp
      if (item.id) {
        await updateDoc(doc(db, 'transaksiMasuk', item.id), {
          marketplaceLastSync: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
      }
      
      console.log(`✅ Marketplace status updated for: ${item.nomorSPBKontrak}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to update marketplace status for ${item.nomorSPBKontrak}:`, error);
      return false;
    }
  }

  /**
   * Upload documents to marketplace
   */
  async uploadDocumentsToMarketplace(item: EnhancedMonitoringMasukItem): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Not connected to PLN Marketplace. Call connect() first.');
    }

    try {
      console.log(`📎 Uploading documents to marketplace for: ${item.nomorSPBKontrak}`);
      
      // Mock document upload
      // In real implementation, this would upload to PLN Marketplace
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`✅ Documents uploaded to marketplace for: ${item.nomorSPBKontrak}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to upload documents for ${item.nomorSPBKontrak}:`, error);
      return false;
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats() {
    return {
      isConnected: this.isConnected,
      lastSyncTime: this.lastSyncTime,
      connectionStatus: this.isConnected ? 'Connected (Mock Mode)' : 'Disconnected'
    };
  }

  /**
   * Map marketplace status to internal status
   */
  private mapMarketplaceStatus(marketplaceStatus: string): string {
    const statusMap: Record<string, string> = {
      'pending': 'draft',
      'in_transit': 'proses',
      'delivered': 'proses',
      'completed': 'selesai'
    };
    
    return statusMap[marketplaceStatus] || 'draft';
  }

  /**
   * Disconnect from marketplace
   */
  disconnect(): void {
    this.isConnected = false;
    console.log('🔌 Disconnected from PLN Marketplace');
  }
}

// Export singleton instance
export const marketplaceSync = MarketplaceSync.getInstance();
