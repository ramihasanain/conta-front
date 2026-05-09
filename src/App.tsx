import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ContractWorkspacePage } from './pages/ContractWorkspacePage';
import { NewContractHub } from './pages/NewContractHub';
import { WorkflowsPage } from './pages/WorkflowsPage';
import { SignaturesPage } from './pages/SignaturesPage';
import { ProjectManagerPage } from './pages/ProjectManagerPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { FilteredViewPage } from './pages/FilteredViewPage';
import { FoldersPage } from './pages/FoldersPage';
import { CalendarPage } from './pages/CalendarPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { LoginPage } from './pages/LoginPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ExternalSignPage } from './pages/ExternalSignPage';
import { SearchProvider } from './context/SearchContext';
import { AuthProvider, useAuth } from './context/AuthContext';

import React from 'react';

// Guard component to protect routes
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/sign/:token" element={<ExternalSignPage />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="hub" element={<NewContractHub />} />
        <Route path="contract/:id" element={<ContractWorkspacePage />} />
        <Route path="workflows" element={<WorkflowsPage />} />
        <Route path="signatures" element={<SignaturesPage />} />
        <Route path="project-manager" element={<ProjectManagerPage />} />
        <Route path="projects" element={<ProjectManagerPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="recent" element={<FilteredViewPage title="Recent Contracts" />} />
        <Route path="starred" element={<FilteredViewPage title="Starred Contracts" />} />
        <Route path="folders" element={<FoldersPage />} />
        <Route path="trash" element={<FilteredViewPage title="Trash" />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SearchProvider>
          <AppRoutes />
        </SearchProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
