import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { DataProvider } from './data';
import { ShortlistProvider } from './shortlist';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { RoomsPage } from './pages/RoomsPage';
import { PropertiesPage } from './pages/PropertiesPage';
import { PropertyPage } from './pages/PropertyPage';
import { RoomPage } from './pages/RoomPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ShortlistPage } from './pages/ShortlistPage';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <DataProvider>
        <ShortlistProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/rooms" element={<RoomsPage />} />
              <Route path="/properties" element={<PropertiesPage />} />
              <Route path="/p/:propertyId" element={<PropertyPage />} />
              <Route path="/r/:roomId" element={<RoomPage />} />
              <Route path="/shortlist" element={<ShortlistPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Layout>
        </ShortlistProvider>
      </DataProvider>
    </BrowserRouter>
  </StrictMode>,
);
