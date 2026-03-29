export interface MasterDataItem {
  id: string;
  normalisasi: string;
  materialDescription: string;
  satuan: string;
  valuationDescription: string;
  hargaSatuan: number;
}

export interface MasterUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Warehouse {
  id: string;
  companyCode: string;
  companyCodeDescription: string;
  plant: string;
  plantDescription: string;
  storageLocation: string;
  storageLocationDescription: string;
}

export interface Material {
  id: string;
  normalisasi: string;
  description: string;
  unit: string;
  qtyPermintaan: number;
}