import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

// Context
import { AuthProvider } from '@/context/AuthContext';

// Layout
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

// Auth pages
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';

// App pages
import Dashboard from '@/pages/dashboard/Dashboard';
import CaseList from '@/pages/cases/CaseList';
import CaseDetail from '@/pages/cases/CaseDetail';
import NewCase from '@/pages/cases/NewCase';
import EvidenceUpload from '@/pages/evidence/EvidenceUpload';

// Placeholder pages (Phase 4 — partial)
import {
  RiskPlaceholder,
  ReportsPlaceholder,
  ForensicsPlaceholder,
} from '@/pages/Placeholders';

// Findings module (fully implemented)
import FindingsList from '@/pages/findings/FindingsList';
import FindingDetail from '@/pages/findings/FindingDetail';
import FindingForm from '@/pages/findings/FindingForm';

// Timeline module (fully implemented)
import Timeline from '@/pages/timeline/Timeline';

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Cases */}
                <Route path="/cases" element={<CaseList />} />
                <Route path="/cases/new" element={<NewCase />} />
                <Route path="/cases/:id" element={<CaseDetail />} />

                {/* Evidence */}
                <Route path="/evidence" element={<EvidenceUpload />} />
                <Route path="/evidence/upload" element={<EvidenceUpload />} />

                {/* Findings */}
                <Route path="/findings" element={<FindingsList />} />
                <Route path="/findings/new" element={<FindingForm mode="create" />} />
                <Route path="/findings/:id" element={<FindingDetail />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/risk" element={<RiskPlaceholder />} />
                <Route path="/reports" element={<ReportsPlaceholder />} />
                <Route path="/forensics" element={<ForensicsPlaceholder />} />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
