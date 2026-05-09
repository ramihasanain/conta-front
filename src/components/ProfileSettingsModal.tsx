import React, { useState, useEffect } from 'react';
import { X, Building, CheckCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<Props> = ({ onClose }) => {
  const [companyName, setCompanyName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('myCompanyName') || '';
    setCompanyName(stored);
  }, []);

  const handleSave = () => {
    localStorage.setItem('myCompanyName', companyName.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 9999, backgroundColor: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="animate-slide-up" style={{
        background: '#ffffff', width: '400px', borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building className="w-5 h-5 text-indigo-600" />
            Company Profile
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          <p style={{ color: '#475569', fontSize: '14px', marginBottom: '16px' }}>
            Set your primary company name. Fossa AI uses this to intelligently identify if a scanned contract officially belongs to your business for financial accounting.
          </p>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              Your Company Name
            </label>
            <input 
              type="text" 
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Acme Corporation"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '12px 16px', borderRadius: '8px',
                border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none'
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
              onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
            />
          </div>

          <button 
            onClick={handleSave}
            disabled={!companyName.trim()}
            style={{
              width: '100%', padding: '12px', background: saved ? '#10b981' : '#4f46e5', color: 'white',
              border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
            }}
          >
            {saved ? (
              <>
                <CheckCircle className="w-5 h-5" /> Saved!
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
