import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Plus, 
  Folder, 
  FileText, 
  Workflow, 
  PenTool, 
  Clock, 
  Star, 
  Trash2, 
  Settings,
  LogOut,
  BarChart,
  Calendar,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css'; // Creating a specific CSS file for Sidebar

export const Sidebar: React.FC = () => {
  const { logout } = useAuth();
  
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo" style={{ background: 'transparent' }}>
          <img src="/fossa_logo.png" alt="Fossa Logo" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '8px' }} />
        </div>
        <span className="brand-text">FOSSA AI</span>
      </div>

      <div className="sidebar-action">
        <NavLink to="/hub" style={{ textDecoration: 'none' }}>
          <button className="btn btn-primary" style={{ width: '100%', gap: '8px' }}>
            <Plus className="w-5 h-5 text-white" />
            <span className="text-white">New Contract</span>
          </button>
        </NavLink>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group">
          <span className="nav-group-title">Workspace</span>
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <FileText className="w-5 h-5 nav-icon" />
             <span>My Contracts</span>
          </NavLink>
          <NavLink to="/workflows" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <Workflow className="w-5 h-5 nav-icon" />
             <span>Workflows & Approvals</span>
          </NavLink>
          <NavLink to="/signatures" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <PenTool className="w-5 h-5 nav-icon" />
             <span>E-Signatures</span>
          </NavLink>
          <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <Workflow className="w-5 h-5 nav-icon" />
             <span>Project Manager</span>
          </NavLink>
          <NavLink to="/payments" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <span className="nav-icon" style={{display: 'flex', alignItems: 'center'}}>$</span>
             <span>Payments & Invoices</span>
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <BarChart className="w-5 h-5 nav-icon" />
             <span>Analytics & Reports</span>
          </NavLink>
          <NavLink to="/calendar" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <Calendar className="w-5 h-5 nav-icon" />
             <span>Calendar</span>
          </NavLink>
        </div>

        <div className="nav-group">
          <span className="nav-group-title">Filters</span>
          <NavLink to="/recent" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <Clock className="w-5 h-5 nav-icon" />
             <span>Recent</span>
          </NavLink>
          <NavLink to="/starred" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <Star className="w-5 h-5 nav-icon" />
             <span>Starred</span>
          </NavLink>
          <NavLink to="/folders" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <Folder className="w-5 h-5 nav-icon" />
             <span>Folders</span>
          </NavLink>
          <NavLink to="/trash" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             <Trash2 className="w-5 h-5 nav-icon" />
             <span>Trash</span>
          </NavLink>
        </div>
      </nav>
      
      <div className="sidebar-footer">
        <NavLink to="/employees" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <Shield className="w-5 h-5 nav-icon" />
          <span>Employees & Roles</span>
        </NavLink>
        <div className="nav-item">
          <Settings className="w-5 h-5 nav-icon" />
          <span>Settings</span>
        </div>
        <div className="nav-item" onClick={logout} style={{ color: '#ef4444', cursor: 'pointer' }}>
          <LogOut className="w-5 h-5 nav-icon" style={{ color: '#ef4444' }} />
          <span>Logout</span>
        </div>
        <div className="storage-info">
          <div className="storage-bar">
            <div className="storage-fill" style={{ width: '45%' }}></div>
          </div>
          <span className="text-xs text-muted">450 Contracts Processed</span>
        </div>
      </div>
    </aside>
  );
};
