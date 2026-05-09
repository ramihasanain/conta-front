import React, { useState } from 'react';
import { Search, Bell, HelpCircle, User } from 'lucide-react';
import { useSearch } from '../../context/SearchContext';
import { ProfileSettingsModal } from '../ProfileSettingsModal';
import './TopNav.css';

export const TopNav: React.FC = () => {
  const { searchQuery, setSearchQuery } = useSearch();
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <header className="topnav">
      <div className="search-container">
        <label htmlFor="global-search" className="sr-only">Search in Drive</label>
        <div className="search-bar">
          <Search className="w-5 h-5 search-icon" />
          <input 
            type="text" 
            id="global-search" 
            placeholder="Search contracts, folders, or workflows..." 
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="topnav-actions">
        <button className="btn-icon">
          <HelpCircle className="w-6 h-6 text-tertiary" />
        </button>
        <button className="btn-icon">
          <Bell className="w-6 h-6 text-tertiary" />
        </button>
        <button className="profile-button" onClick={() => setShowProfileModal(true)}>
          <User className="w-5 h-5" />
        </button>
      </div>
      
      {showProfileModal && (
        <ProfileSettingsModal onClose={() => setShowProfileModal(false)} />
      )}
    </header>
  );
};
