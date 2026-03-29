import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import { AppProvider, useAppContext } from './context/AppContext';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import logger from './utils/logger';
import './App.css';

// Lazy load components
const Layout = lazy(() => {
  logger.info('App: Memuat komponen Layout');
  return import('./components/Layout');
});
const Dashboard = lazy(() => {
  logger.info('App: Memuat komponen Dashboard');
  return import('./pages/Dashboard');
});
const MasterData = lazy(() => import('./components/MasterData'));
const MasterUser = lazy(() => import('./components/MasterUser'));
const MasterGudang = lazy(() => import('./components/MasterGudang'));
const MasterStockAwal = lazy(() => import('./components/MasterStockAwal'));
const Reservasi = lazy(() => import('./components/Reservasi'));
const DaftarReservasi = lazy(() => import('./components/DaftarReservasi'));
const StatusLayananReservasi = lazy(() => import('./components/StatusLayananReservasi'));
const StockMaterial = lazy(() => import('./components/StockMaterial'));
const StockSAP = lazy(() => import('./components/StockSAP'));
const PengembalianMaterial = lazy(() => import('./components/PengembalianMaterial'));
const WOPetugasLogistik = lazy(() => import('./components/WOPetugasLogistik'));
const Login = lazy(() => import('./components/Login'));
const WOFinalisasiAkuntansi = lazy(() => import('./components/WOFinalisasiAkuntansi'));
// Komponen milestone lama sudah digantikan oleh MonitoringMilestone
const MaterialDetailPage = lazy(() => import('./components/MaterialDetailPage'));
const InventRusak = lazy(() => import('./components/InventRusak'));
const InventNormal = lazy(() => import('./components/InventNormal'));
const InventEksBongkar = lazy(() => import('./components/InventEksbongkar'));
const MutasiKeluar = lazy(() => import('./components/MutasiKeluar'));
const TransaksiMasuk = lazy(() => import('./pages/TransaksiMasuk'));
const WOFulfillment = lazy(() => import('./components/WOFulfillment'));
const WOPenerimaan = lazy(() => import('./components/WOPenerimaan'));
const MRRealization = lazy(() => import('./components/MRRealization'));
const BeritaAcara = lazy(() => import('./components/BeritaAcara'));
const SuratJalan = lazy(() => import('./components/SuratJalan'));
const PersetujuanMaterial = lazy(() => import('./components/PersetujuanMaterial').then(module => ({ default: (module as any).default || module })));
const MonitoringMasuk = lazy(() => import('./pages/MonitoringMasuk'));
const RencanaKedatangan = lazy(() => import('./pages/RencanaKedatangan'));
const MonitoringMilestone = lazy(() => import('./pages/MonitoringMilestone'));
const UploadDataCutOff = lazy(() => import('./components/UploadDataCutOff'));

const AppRoutes: React.FC = () => {
  const { user, loading } = useAppContext();
  const location = useLocation();

  useEffect(() => {
    logger.info('AppRoutes: Rendered', { user: user?.email, loading, pathname: location.pathname });
    return () => {
      logger.info('AppRoutes: Unmounted');
    };
  }, [user, loading, location]);

  if (loading) {
    logger.info('AppRoutes: Loading');
    return <Spin size="large" className="global-spinner" />;
  }

  logger.info('AppRoutes: Rendering routes');
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Dashboard />} />
        <Route path="master-data" element={<MasterData />} />
        <Route path="master-gudang" element={<MasterGudang />} />
        <Route path="master-user" element={<MasterUser />} />
        <Route path="master-stock-awal" element={<MasterStockAwal />} />
        <Route path="reservasi" element={<Reservasi />} />
        <Route path="daftar-reservasi" element={<DaftarReservasi />} />
        <Route path="status-layanan-reservasi" element={<StatusLayananReservasi />} />
        <Route path="pengembalian-material" element={<PengembalianMaterial />} />
        <Route path="wo-petugas-logistik" element={<WOPetugasLogistik />} />
        <Route path="wo-finalisasi-akuntansi" element={<WOFinalisasiAkuntansi />} />
        {/* Rute milestone lama sudah digantikan oleh monitoring-milestone */}
        <Route path="material/:id" element={<MaterialDetailPage />} />
        <Route path="invent-rusak" element={<InventRusak />} />
        <Route path="invent-normal" element={<InventNormal />} />
        <Route path="invent-eks-bongkar" element={<InventEksBongkar />} />
        <Route path="mutasi-keluar" element={<MutasiKeluar />} />
        <Route path="transaksi-masuk" element={<TransaksiMasuk />} />
        <Route path="monitoring-masuk" element={<MonitoringMasuk />} />
        <Route path="rencana-kedatangan" element={<RencanaKedatangan />} />
        <Route path="monitoring-milestone" element={<MonitoringMilestone />} />
        <Route path="wo-fulfillment" element={<WOFulfillment />} />
        <Route path="wo-penerimaan" element={<WOPenerimaan />} />
        <Route path="mr-realization" element={<MRRealization />} />
        <Route path="persetujuan-material" element={<PersetujuanMaterial />} />
        <Route path="berita-acara" element={<BeritaAcara />} />
        <Route path="surat-jalan" element={<SuratJalan />} />
        <Route path="stock-material" element={<StockMaterial />} />
        <Route path="stock-sap" element={<StockSAP />} />
        <Route path="upload-data-cutoff" element={<UploadDataCutOff />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    logger.info('App: Mounted');
    return () => {
      logger.info('App: Unmounted');
    };
  }, []);

  logger.info('App: Rendering');

  return (
    <ErrorBoundary>
      <ConfigProvider>
        <AuthProvider>
          <AppProvider>
            <Router>
              <Suspense fallback={<Spin size="large" className="global-spinner" />}>
                <AppRoutes />
              </Suspense>
            </Router>
          </AppProvider>
        </AuthProvider>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

export default App;
