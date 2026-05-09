import React, { useState, useEffect, useRef } from 'react';
import { PenTool, Plus, MoreVertical, Eye, Trash2, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import SignatureCanvas from 'react-signature-canvas';
import { useSystemDialog } from '../components/SystemDialog';
import './DashboardPage.css';

interface SignatureLog {
  id: string | number;
  document: number;
  signer_name: string;
  signed_at: string | null;
  status: string;
}

interface SavedSignature {
  id: number;
  title: string;
  signature_data: string;
  is_default: boolean;
  created_at: string;
}

export const SignaturesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<SignatureLog[]>([]);
  const [savedSignatures, setSavedSignatures] = useState<SavedSignature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showAlert, showConfirm, SystemDialogUi } = useSystemDialog();

  // Modal States
  const [isRequestModalOpen, setRequestModalOpen] = useState(false);
  const [isSavedSigModalOpen, setSavedSigModalOpen] = useState(false);
  const [newSigTitle, setNewSigTitle] = useState('');
  
  const sigPadRef = useRef<SignatureCanvas>(null);

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      const logs = await apiClient.get('/signatures/');
      setSignatures(logs);
      const saved = await apiClient.get('/saved-signatures/');
      setSavedSignatures(saved);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendRequest = async () => {
    setRequestModalOpen(false);
    navigate('/');
  };

  const handleSaveSignature = async () => {
    if (!newSigTitle.trim()) {
      showAlert("Warning", "Please enter a title for your signature.");
      return;
    }
    if (sigPadRef.current?.isEmpty()) {
      showAlert("Warning", "Please draw your signature.");
      return;
    }

    const dataURL = sigPadRef.current?.getCanvas().toDataURL('image/png');
    
    try {
      const resp = await apiClient.post('/saved-signatures/', {
        title: newSigTitle,
        signature_data: dataURL,
        is_default: savedSignatures.length === 0
      });
      setSavedSignatures([resp, ...savedSignatures]);
      setSavedSigModalOpen(false);
      setNewSigTitle('');
    } catch (err) {
      showAlert("Error", "Failed to save signature.");
    }
  };

  const handleDeleteSavedSignature = async (id: number) => {
    const confirmed = await showConfirm("Delete Signature", "Are you sure you want to delete this saved signature?");
    if(!confirmed) return;
    try {
      await apiClient.delete(`/saved-signatures/${id}/`);
      setSavedSignatures(savedSignatures.filter(s => s.id !== id));
    } catch (err) {
      showAlert("Error", 'Failed to delete signature.');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Pending';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="dashboard animate-fade-in">
      <SystemDialogUi />
      <div className="dashboard-header">
        <h1 className="dashboard-title">Digital Signatures</h1>
      </div>

      {/* MY SAVED SIGNATURES SECTION */}
      <div className="dashboard-section mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title text-primary-dark">My Saved Signatures</h2>
          <button className="btn btn-primary" onClick={() => {
            setNewSigTitle('');
            if (sigPadRef.current) sigPadRef.current.clear();
            setSavedSigModalOpen(true);
          }} style={{padding: '8px 16px', fontSize: '13px'}}>
            <Plus className="w-4 h-4" /> Add Signature
          </button>
        </div>

        <div className="suggested-grid">
          {savedSignatures.map(sig => (
            <div key={sig.id} className="suggested-card" style={{height: 'auto', minHeight: '160px', position: 'relative'}}>
               <div style={{height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px'}}>
                  <img src={sig.signature_data} alt={sig.title} style={{maxHeight: '100%', maxWidth: '100%', filter: 'contrast(1.2) drop-shadow(0 2px 4px rgba(0,0,0,0.05))'}} />
               </div>
               <div className="card-info" style={{padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                 <div>
                   <h3 className="card-title text-sm">{sig.title}</h3>
                   <span className="text-xs text-tertiary">{sig.is_default ? 'Default Signature' : 'Alternative'}</span>
                 </div>
                 <button className="btn-icon" onClick={() => handleDeleteSavedSignature(sig.id)}>
                   <Trash2 className="w-4 h-4 text-danger"/>
                 </button>
               </div>
            </div>
          ))}
          {savedSignatures.length === 0 && !isLoading && (
            <div style={{gridColumn: '1 / -1', padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1'}}>
               <PenTool className="w-8 h-8 mx-auto text-tertiary mb-2" />
               <p className="text-secondary text-sm">No saved signatures. Add one to use for internal approvals.</p>
            </div>
          )}
        </div>
      </div>

      <hr style={{borderColor: 'var(--border-light)', marginBottom: '32px'}}/>

      {/* EXTERNAL SIGNATURE REQUESTS LOG */}
      <div className="dashboard-section">
        <div className="flex items-center justify-between mb-4">
           <h2 className="section-title">Client Signature Requests</h2>
           <button className="btn btn-ghost" onClick={() => setRequestModalOpen(true)} style={{border: '1px dashed #cbd5e1'}}>
             <PenTool className="w-4 h-4 mr-2" /> Send New Request
           </button>
        </div>
        
        <div className="list-view">
          <div className="list-header" style={{ gridTemplateColumns: '3fr 2fr 2fr 1fr 48px' }}>
            <div className="col-name">Document ID</div>
            <div className="col-owner">Recipient</div>
            <div className="col-modified">Signed On</div>
            <div className="col-size">Status</div>
            <div className="col-action"></div>
          </div>
          {signatures.map((item) => (
            <div key={item.id} className="list-row surface-hover" style={{ gridTemplateColumns: '3fr 2fr 2fr 1fr 48px' }}>
              <div className="col-name file-name">
                <PenTool className="w-5 h-5 text-tertiary" />
                Doc #{item.document}
              </div>
              <div className="col-owner">{item.signer_name}</div>
              <div className="col-modified">{formatDate(item.signed_at)}</div>
              <div className="col-size">
                <span style={{
                  color: item.status.toLowerCase() === 'completed' || item.status.toLowerCase() === 'signed' ? 'var(--success)' : 'var(--warning)',
                  backgroundColor: item.status.toLowerCase() === 'completed' || item.status.toLowerCase() === 'signed' ? 'var(--success-bg)' : 'var(--warning-bg)',
                  padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500
                }}>
                  {item.status}
                </span>
              </div>
              <div className="col-action">
                <div className="context-menu-wrapper">
                  <button className="btn-icon" onClick={(e) => toggleMenu(e, `sig-menu-${item.id}`)}>
                    <MoreVertical className="w-5 h-5 text-tertiary" />
                  </button>
                  {activeMenuId === `sig-menu-${item.id}` && (
                    <div className="context-menu" onClick={(e) => e.stopPropagation()}>
                      <button className="context-menu-item" onClick={() => navigate(`/contract/${item.document}`)}><Eye className="w-4 h-4 text-tertiary" /> View Source Document</button>
                      <div className="context-menu-divider"></div>
                      <button className="context-menu-item text-danger"><Trash2 className="w-4 h-4 text-danger" /> Delete Log</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {signatures.length === 0 && !isLoading && <p className="text-sm text-tertiary" style={{padding: '16px'}}>No client signatures requested yet.</p>}
        </div>
      </div>

      {/* CREATE SAVED SIGNATURE MODAL */}
      {isSavedSigModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999, backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', width: 600, borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
          }} className="animate-slide-up">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                ✏️ Draw New Signature
              </h2>
              <button onClick={() => setSavedSigModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X className="w-5 h-5 text-tertiary hover:text-danger flex" />
              </button>
            </div>

            <div style={{ padding: 24 }}>
               <div className="mb-4">
                 <label className="block text-sm font-semibold mb-2">Signature Title</label>
                 <input 
                   type="text" 
                   value={newSigTitle}
                   onChange={e => setNewSigTitle(e.target.value)}
                   placeholder="e.g., General Manager Alias"
                   className="w-full p-3 rounded"
                   style={{border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', fontWeight: 500}}
                 />
               </div>

               <label className="block text-sm font-semibold mb-2">Drawing Pad</label>
               <div style={{border: '2px dashed #94a3b8', borderRadius: '12px', background: 'white', overflow: 'hidden', position: 'relative'}}>
                 <SignatureCanvas 
                   ref={sigPadRef} 
                   penColor="#0f172a"
                   canvasProps={{width: 550, height: 200, className: 'sigCanvas'}} 
                 />
                 <button 
                   onClick={() => sigPadRef.current?.clear()}
                   style={{position: 'absolute', top: 10, right: 10, background: '#f1f5f9', border: 'none', fontSize: '11px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, color: '#64748b'}}
                 >Clear Canvas</button>
               </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: 12, backgroundColor: '#f8fafc' }}>
              <button className="btn btn-ghost" onClick={() => setSavedSigModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveSignature}>Save Signature</button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST SIGNATURE MODAL (EXTERNAL) */}
      {isRequestModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999, backgroundColor: 'rgba(15, 23, 42, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', width: 500, borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface-hover)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <PenTool className="w-5 h-5 text-primary" /> Request E-Signature
              </h2>
              <button onClick={() => setRequestModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                <X className="w-5 h-5 flex hover:text-danger" />
              </button>
            </div>
            <div style={{ padding: 24, textAlign: 'center' }}>
               <AlertCircle className="w-12 h-12 text-primary mx-auto mb-4" />
               <h3 className="text-lg font-bold">Generate Link from Workspace</h3>
               <p className="text-sm text-secondary mt-2">
                 To maintain context and security, signature links must be generated directly from the specific contract document workspace.
               </p>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: 12, backgroundColor: 'var(--bg-surface)' }}>
              <button className="btn btn-ghost" onClick={() => setRequestModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSendRequest}>
                Go to Document Vault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
