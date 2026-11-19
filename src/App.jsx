import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { DataProvider } from './data.jsx';
import Nav from './components/Nav.jsx';
import MemoryViewer from './components/MemoryViewer.jsx';
import UploadModal from './components/UploadModal.jsx';
import { AlbumForm, ProfileForm } from './components/Forms.jsx';
import { Spinner } from './components/bits.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Home from './pages/Home.jsx';
import Albums from './pages/Albums.jsx';
import AlbumPage from './pages/AlbumPage.jsx';
import Crew from './pages/Crew.jsx';
import Admin from './pages/Admin.jsx';
import { Logo } from './components/Nav.jsx';

function Page({ children }) {
  return (
    <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
      {children}
    </motion.main>
  );
}

export default function App() {
  const { user, ready } = useAuth();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!ready) return <div className="boot"><Spinner /></div>;
  if (!user) return <AuthPage />;

  return (
    <DataProvider>
      <Nav />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Page><Home /></Page>} />
          <Route path="/albums" element={<Page><Albums /></Page>} />
          <Route path="/albums/:id" element={<Page><AlbumPage /></Page>} />
          <Route path="/crew" element={<Page><Crew /></Page>} />
          <Route path="/admin" element={<Page><Admin /></Page>} />
          <Route path="*" element={<Page><Home /></Page>} />
        </Routes>
      </AnimatePresence>
      <footer className="footer">
        <Logo />
        <span>Made by Wave 49A, for Wave 49A.</span>
      </footer>
      <MemoryViewer />
      <UploadModal />
      <AlbumForm />
      <ProfileForm />
    </DataProvider>
  );
}
