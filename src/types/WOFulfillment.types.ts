import type { RcFile, UploadRequestOption } from 'rc-upload/lib/interface';

export interface Material {
  materialDescription: string;
  normalisasi: string;
  valuationType: string;
  qtyAmbil: number;
  kategori: string;
  merek?: string;
  nomorSeri?: string;
  tahun?: string;
  foto1?: string;
  foto2?: string;
  foto3?: string;
  satuan?: string;
}

export interface MaterialWithWorkOrderId extends Material {
  workOrderId: string;
}

export interface WorkOrder {
  id: string;
  nomorReservasi: string;
  tglPengambilan: string;
  pelaksana: string;
  nomorKontrak?: string;
  pekerjaan?: string;
  fungsi?: string;
  materials: Material[];
}

export interface FormValues {
  materialDescription: string;
  normalisasi: string;
  valuationType: string;
  qtyAmbil: number;
  merek: string;
  nomorSeri?: string;
  tahun?: string;
  foto1?: { fileList: { originFileObj: RcFile }[] };
  foto2?: { fileList: { originFileObj: RcFile }[] };
  foto3?: { fileList: { originFileObj: RcFile }[] };
}

export interface CustomUploadRequestOption extends UploadRequestOption {
  file: RcFile;
}
