import React, { useState } from 'react';
import { Sparkles, UploadCloud, FileText, X, ArrowRight, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useSystemDialog } from '../components/SystemDialog';
import { ProfileSettingsModal } from '../components/ProfileSettingsModal';
import './DashboardPage.css';

export const NewContractHub: React.FC = () => {
  const navigate = useNavigate();
  
  const [fossaModalOpen, setFossaModalOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [fossaPrompt, setFossaPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { showAlert, SystemDialogUi } = useSystemDialog();

  const checkCompanyProfile = () => {
     const company = localStorage.getItem('myCompanyName');
     if (!company || company.trim() === '') {
        setShowProfileModal(true);
        showAlert("Profile Required", "Please configure your Primary Company Name before creating or uploading a contract.");
        return false;
     }
     return true;
  };

  const handleBlankDocument = () => {
    if (!checkCompanyProfile()) return;
    navigate('/contract/new');
  };

  const handleUploadClick = () => {
    if (!checkCompanyProfile()) return;
    navigate('/contract/upload');
  };

  const handleFossaGenerate = async () => {
    if(!fossaPrompt.trim()) return;
    if (!checkCompanyProfile()) return;
    setIsGenerating(true);
    try {
       const resp = await apiClient.post('/ai/generate-contract/', { prompt: fossaPrompt });
       navigate(`/contract/${resp.id}`);
    } catch (err) {
       showAlert("Error", 'Fossa failed to generate the contract.');
       console.error(err);
    } finally {
       setIsGenerating(false);
       setFossaModalOpen(false);
    }
  };

  return (
    <div className="dashboard animate-fade-in" style={{height: '100vh', display: 'flex', flexDirection: 'column'}}>
      <SystemDialogUi />
      <div className="dashboard-header">
        <h1 className="dashboard-title">Contract Creation Hub</h1>
        <p className="text-secondary mt-2">Select your preferred method to initialize a new legal document.</p>
      </div>

      <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'}}>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', maxWidth: '1000px', width: '100%'}}>
          
          {/* OPTION 1: Upload */}
          <div 
             className="suggested-card surface-hover" 
             style={{padding: '40px 30px', textAlign: 'center', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '16px', position: 'relative', overflow: 'hidden'}}
             onClick={handleUploadClick}
          >
             <div style={{width: '70px', height: '70px', borderRadius: '50%', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'}}>
               <UploadCloud className="w-8 h-8 text-indigo-600" />
             </div>
             <h3 className="font-bold text-xl mb-2">Upload & Scan</h3>
             <p className="text-secondary text-sm">Upload an existing PDF contract. Our AI will extract, format, and prepare it for digital signatures.</p>
          </div>

          {/* OPTION 2: Fossa AI */}
          <div 
             className="suggested-card" 
             style={{padding: '40px 30px', textAlign: 'center', cursor: 'pointer', border: '2px solid #6366f1', borderRadius: '16px', background: 'linear-gradient(145deg, #f8fafc 0%, #eef2ff 100%)', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.2)'}}
             onClick={() => {
                if (checkCompanyProfile()) {
                    setFossaModalOpen(true);
                }
             }}
          >
             <div style={{width: '70px', height: '70px', borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)'}}>
               <Sparkles className="w-8 h-8 text-white" />
             </div>
             <h3 className="font-bold text-xl mb-2" style={{color: '#312e81'}}>Generate with Fossa</h3>
             <p className="text-secondary text-sm">Don't have a template? Tell Fossa what you need, and the AI will draft a complete, professional contract instantly.</p>
          </div>

          {/* OPTION 3: Blank */}
          <div 
             className="suggested-card surface-hover" 
             style={{padding: '40px 30px', textAlign: 'center', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '16px'}}
             onClick={handleBlankDocument}
          >
             <div style={{width: '70px', height: '70px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'}}>
               <FileText className="w-8 h-8 text-slate-500" />
             </div>
             <h3 className="font-bold text-xl mb-2">Start from Scratch</h3>
             <p className="text-secondary text-sm">Open a blank legal canvas. You can write your own clauses or paste from clipboard.</p>
          </div>

        </div>
      </div>

      {fossaModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999, backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'rgba(30, 41, 59, 1)', width: '650px', borderRadius: '24px',
            boxShadow: '0 30px 60px -15px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column'
          }} className="animate-slide-up">
            
            {/* Header */}
            <div style={{ padding: '32px 32px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: '#818cf8', fontSize: '13px', fontWeight: 700, marginBottom: '16px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <Sparkles className="w-4 h-4" />
                    <span>FOSSA NEURAL ENGINE</span>
                  </div>
                  <h2 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: 'white', letterSpacing: '-0.5px' }}>
                    Generate Contract
                  </h2>
                  <p style={{ color: '#94a3b8', fontSize: '15px', marginTop: '8px' }}>Describe the core parameters, parties, and specific clauses you need.</p>
               </div>
               <button onClick={() => !isGenerating && setFossaModalOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', transition: 'all 0.2s', padding: 0 }}
                  onMouseEnter={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white';}}
                  onMouseLeave={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8';}}>
                 <X className="w-5 h-5" />
               </button>
            </div>

            {/* Body */}
            <div style={{ padding: '0 32px 32px' }}>
               <div style={{ position: 'relative' }}>
                  <textarea 
                    style={{
                       width: '100%', boxSizing: 'border-box', padding: '20px', paddingBottom: '68px',
                       borderRadius: '16px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.1)',
                       color: 'white', fontSize: '16px', outline: 'none', resize: 'none', minHeight: '180px',
                       boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)', transition: 'border-color 0.3s'
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                    onKeyDown={(e) => { if(e.key === 'Enter' && e.ctrlKey) handleFossaGenerate(); }}
                    placeholder="e.g., Draft a 12-month NDA for a software engineering contractor. Include standard IP clauses..."
                    value={fossaPrompt}
                    onChange={e => setFossaPrompt(e.target.value)}
                    disabled={isGenerating}
                    autoFocus
                  ></textarea>

                  {/* Inner Action Bar */}
                  <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', background: 'rgba(255,255,255,0.05)', padding: '5px 12px', borderRadius: '8px', fontWeight: 600 }}>Ctrl + Enter</span>
                     </div>
                     <button 
                        disabled={isGenerating || !fossaPrompt.trim()}
                        style={{
                           padding: '10px 24px', fontSize: '15px', fontWeight: 700, borderRadius: '10px', 
                           display: 'flex', alignItems: 'center', gap: '8px', 
                           background: (!fossaPrompt.trim() || isGenerating) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(to right, #4f46e5, #7c3aed)', 
                           color: (!fossaPrompt.trim() || isGenerating) ? '#55657e' : 'white',
                           border: 'none', cursor: (!fossaPrompt.trim() || isGenerating) ? 'not-allowed' : 'pointer',
                           boxShadow: (!fossaPrompt.trim() || isGenerating) ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.4)',
                           transition: 'all 0.3s'
                        }}
                        onClick={handleFossaGenerate}
                     >
                        {isGenerating ? (
                          <><Loader className="w-5 h-5 animate-spin" /> Synthesizing...</>
                        ) : (
                          <>Initialize AI <ArrowRight className="w-5 h-5" /></>
                        )}
                     </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <ProfileSettingsModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
};
