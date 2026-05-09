import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import './MainLayout.css';

export const MainLayout: React.FC = () => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <TopNav />
        <main className="page-wrapper surface" style={{ margin: '0 16px 16px 0', borderTopLeftRadius: '16px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
