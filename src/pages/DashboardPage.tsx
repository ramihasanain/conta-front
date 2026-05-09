import React, { useState, useEffect } from 'react';
import { FileText, MoreVertical, UploadCloud, Trash2, ExternalLink, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../context/SearchContext';
import { apiClient } from '../api/client';
import { useSystemDialog } from '../components/SystemDialog';
import './DashboardPage.css';

interface Document {
  id: string | number;
  title: string;
  status: string;
  created_at: string;
  ai_metadata?: {
    contractValueNumber?: number;
    contractCurrency?: string;
    documentType?: string;
  };
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { searchQuery } = useSearch();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<{id: number, name: string}[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showAlert, showConfirm, showPrompt, SystemDialogUi } = useSystemDialog();

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const data = await apiClient.get('/documents/');
        setDocuments(data);
      } catch (error) {
        console.error('Failed to fetch documents', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    const fetchFolders = async () => {
      try {
        const data = await apiClient.get('/folders/');
        setFolders(data);
      } catch(err) {}
    };

    const fetchPendingApprovals = async () => {
      try {
        const data = await apiClient.get('/workflows/pending-approvals/');
        setPendingApprovals(data);
      } catch(err) {}
    };

    fetchDocuments();
    fetchFolders();
    fetchPendingApprovals();
  }, []);

  const handleDeleteContract = async (id: string | number) => {
    const confirmed = await showConfirm("Delete Contract", "Are you sure you want to permanently delete this contract?");
    if (confirmed) {
      try {
         await apiClient.delete(`/documents/${id}/`);
         setDocuments(documents.filter(d => d.id !== id));
      } catch(err: any) {
         showAlert("Error", "Could not delete: " + (err.message || 'Unknown error'));
      }
    }
  };

  const handleAssignFolder = async (docId: string | number, value: string) => {
    setActiveMenuId(null); // Close menu
    let folderIdToUse = value;
    
    if (value === 'CREATE_NEW') {
      const folderName = await showPrompt("Create Folder", "Enter new folder name:");
      if (!folderName || !folderName.trim()) return;
      try {
        const newFolder = await apiClient.post('/folders/', { name: folderName });
        setFolders([...folders, newFolder]);
        folderIdToUse = newFolder.id.toString();
      } catch(err: any) {
        showAlert("Error", "Failed to create folder: " + (err.message || 'error'));
        return;
      }
    }
    
    try {
      await apiClient.patch(`/documents/${docId}/`, {
        folder: folderIdToUse ? parseInt(folderIdToUse) : null
      });
      showAlert("Success", 'Document moved to folder successfully!');
    } catch(err: any) {
      showAlert("Error", "Failed to update folder mapping: " + (err.message || 'Unknown error'));
    }
  };

  const handleOpenContract = (id?: string | number) => {
    navigate(id ? `/contract/${id}` : '/hub');
  };

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const filteredFiles = documents.filter(file => {
     const matchesSearch = file.title.toLowerCase().includes(searchQuery.toLowerCase());
     return matchesSearch;
  });

  const filteredSuggested = filteredFiles.slice(0, 3);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Dashboard Metrics
  const totalContracts = documents.length;
  const activeProjects = documents.filter(d => d.status === 'completed').length;
  const pendingSignatures = documents.filter(d => d.status === 'draft' || d.status.includes('review')).length;
  
  const totalFinancialValue = documents.reduce((sum, doc) => {
     return sum + (doc.ai_metadata?.contractValueNumber || 0);
  }, 0);

  return (
    <div className="dashboard animate-fade-in">
      <SystemDialogUi />
      <div className="dashboard-header" style={{flexDirection: 'column', alignItems: 'flex-start', gap: '16px'}}>
        <div style={{display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center'}}>
           <h1 className="dashboard-title">Welcome to FOSSA AI</h1>
           <div className="dashboard-actions">
             <button className="btn btn-primary" onClick={() => handleOpenContract()}>
               <UploadCloud className="w-5 h-5" />
               Upload Contract
             </button>
           </div>
        </div>

        {/* METRICS GRID - Killer Dashboard Sub-section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', width: '100%', marginTop: '8px' }}>
            <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', borderRadius: '16px', padding: '20px', color: 'white', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}>
               <div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', opacity: 0.9 }}>Total Financial Flow</div>
               <div style={{ fontSize: '32px', fontWeight: 800, display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '20px', opacity: 0.8 }}>$</span>
                  {totalFinancialValue.toLocaleString()}
               </div>
               <div style={{ fontSize: '12px', marginTop: '12px', opacity: 0.8 }}>Calculated from AI Extraction</div>
            </div>
            
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
               <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Active Projects</div>
               <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>{activeProjects}</div>
               <div style={{ fontSize: '12px', marginTop: '12px', color: '#10b981', fontWeight: 600 }}>Signed & Executing</div>
            </div>
            
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
               <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Pending Action</div>
               <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>{pendingSignatures}</div>
               <div style={{ fontSize: '12px', marginTop: '12px', color: '#f59e0b', fontWeight: 600 }}>Drafts & In Review</div>
            </div>
            
            <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
               <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Total Vault</div>
               <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>{totalContracts}</div>
               <div style={{ fontSize: '12px', marginTop: '12px', color: '#64748b' }}>Contracts Processed</div>
            </div>
        </div>
        
        <div className="filter-chips" style={{ marginTop: '16px' }}>
           {['All', 'Drafts', 'Completed'].map(f => (
             <button 
               key={f} 
               onClick={() => setActiveFilter(f)}
               className={`filter-chip ${activeFilter === f ? 'active' : ''}`}
             >
               {f === 'All' && <Filter className="w-3.5 h-3.5 mr-1" style={{display: 'inline-block'}}/>}
               {f}
             </button>
           ))}
        </div>
      </div>

      {pendingApprovals.length > 0 && (
          <div className="dashboard-section" style={{ background: '#fef2f2', padding: '24px', borderRadius: '16px', border: '1px solid #fecaca', marginBottom: '32px' }}>
            <h2 className="section-title" style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px' }}>
               <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 2s infinite' }}></span>
               Action Required: Pending Approvals
            </h2>
            <div className="suggested-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {pendingApprovals.map((doc: any) => (
                <div key={doc.id} className="suggested-card surface-hover" onClick={() => handleOpenContract(doc.id)} style={{ border: `2px solid ${doc.pending_step_status === 'returned' ? '#fcd34d' : '#fca5a5'}` }}>
                  <div className="card-info" style={{ padding: '20px' }}>
                    <div className="card-header">
                      <span className="card-title" style={{ fontSize: '16px', fontWeight: 800 }}>{doc.title}</span>
                    </div>
                    <div className="card-meta mt-2">
                      <span className="text-xs font-bold text-white px-2 py-1 rounded" style={{ background: doc.pending_step_status === 'returned' ? '#f59e0b' : '#ef4444' }}>
                          {doc.pending_step_status === 'returned' ? 'Returned for Revision' : 'Awaiting Your Approval'}
                      </span>
                    </div>
                    <button className="btn btn-primary w-full mt-4" onClick={(e) => { e.stopPropagation(); handleOpenContract(doc.id); }} style={{ background: doc.pending_step_status === 'returned' ? '#d97706' : '#b91c1c' }}>
                       {doc.pending_step_status === 'returned' ? 'Review & Resubmit' : 'Review & Approve'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
      )}

      <div className="dashboard-section">
        <h2 className="section-title">Suggested</h2>
        <div className="suggested-grid">
          {filteredSuggested.map((card) => (
            <div key={card.id} className="suggested-card surface-hover" onClick={() => handleOpenContract(card.id)} style={{ zIndex: activeMenuId === `sug-menu-${card.id}` ? 50 : 1, position: "relative" }}>
              <div className="card-preview">
                <div className="card-document-mock">
                  <div className="card-doc-line title"></div>
                  <div className="card-doc-line"></div>
                  <div className="card-doc-line medium"></div>
                  <div className="card-doc-line short"></div>
                  <div style={{flex: 1}}></div>
                  <div className="card-doc-line short" style={{opacity: 0.5}}></div>
                </div>
              </div>
              <div className="card-info">
                <div className="card-header">
                  <span className="card-title">{card.title}</span>
                  
                  <div className="context-menu-wrapper">
                    <button className="btn-icon" onClick={(e) => toggleMenu(e, `sug-menu-${card.id}`)}>
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {activeMenuId === `sug-menu-${card.id}` && (
                      <div className="context-menu" onClick={(e) => e.stopPropagation()}>
                        <button className="context-menu-item" onClick={() => handleOpenContract(card.id)}><ExternalLink className="w-4 h-4 text-tertiary"/> Open</button>
                        <div style={{padding: '6px 12px'}}>
                           <select 
                             className="text-xs text-secondary bg-transparent w-full outline-none cursor-pointer" 
                             style={{border: '1px solid var(--border-light)', borderRadius: '4px', padding: '4px', background: '#fff'}}
                             onChange={(e) => handleAssignFolder(card.id, e.target.value)}
                             value=""
                           >
                             <option value="" disabled>Move to Folder...</option>
                             <option value="CREATE_NEW" style={{fontWeight: 700, color: 'var(--primary)'}}>+ Create New...</option>
                             {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                           </select>
                        </div>
                        <button className="context-menu-item text-danger" onClick={() => { setActiveMenuId(null); handleDeleteContract(card.id); }}><Trash2 className="w-4 h-4 text-danger"/> Delete</button>
                      </div>
                    )}
                  </div>
                  
                </div>
                <div className="card-meta">
                  <span className="text-xs text-muted">{formatDate(card.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredSuggested.length === 0 && !isLoading && <p className="text-sm text-tertiary" style={{gridColumn: '1 / -1'}}>No suggested documents found.</p>}
          {isLoading && <p className="text-sm text-tertiary" style={{gridColumn: '1 / -1'}}>Loading documents...</p>}
        </div>
      </div>

      <div className="dashboard-section">
        <h2 className="section-title">All Documents</h2>
        <div className="list-view">
          <div className="list-header" style={{ gridTemplateColumns: '4fr 2fr 2fr 1fr 48px' }}>
            <div className="col-name">Name</div>
            <div className="col-owner">Status</div>
            <div className="col-modified">Created at</div>
            <div className="col-size">ID</div>
            <div className="col-action"></div>
          </div>
          {filteredFiles.map((file) => (
            <div key={file.id} className="list-row surface-hover" onClick={() => handleOpenContract(file.id)} style={{ gridTemplateColumns: '4fr 2fr 2fr 1fr 48px', zIndex: activeMenuId === `list-menu-${file.id}` ? 50 : 1, position: 'relative' }}>
              <div className="col-name file-name">
                <FileText className="w-5 h-5 text-tertiary" />
                {file.title}
                <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: file.ai_metadata?.documentType === 'Proposal' ? '#fdf4ff' : '#eef2ff',
                    color: file.ai_metadata?.documentType === 'Proposal' ? '#a21caf' : '#4f46e5',
                    marginLeft: '8px',
                    border: `1px solid ${file.ai_metadata?.documentType === 'Proposal' ? '#f5d0fe' : '#c7d2fe'}`,
                    textTransform: 'uppercase'
                }}>
                   {file.ai_metadata?.documentType || 'Contract'}
                </span>
              </div>
              <div className="col-owner">
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: file.status.toLowerCase() === 'completed' ? '#dcfce3' : (file.status.toLowerCase().includes('review') ? '#fef3c7' : '#f1f5f9'),
                  color: file.status.toLowerCase() === 'completed' ? '#166534' : (file.status.toLowerCase().includes('review') ? '#b45309' : '#64748b'),
                }}>
                  {file.status}
                </span>
              </div>
              <div className="col-modified font-medium text-slate-500">{formatDate(file.created_at)}</div>
              <div className="col-size text-slate-400 font-mono">#{file.id}</div>
              <div className="col-action">
              
                <div className="context-menu-wrapper">
                  <button className="btn-icon" onClick={(e) => toggleMenu(e, `list-menu-${file.id}`)}>
                    <MoreVertical className="w-5 h-5 text-tertiary" />
                  </button>
                  {activeMenuId === `list-menu-${file.id}` && (
                    <div className="context-menu" onClick={(e) => e.stopPropagation()}>
                      <button className="context-menu-item" onClick={() => handleOpenContract(file.id)}><ExternalLink className="w-4 h-4 text-tertiary"/> Open</button>
                      <div style={{padding: '6px 12px'}}>
                           <select 
                             className="text-xs text-secondary bg-transparent w-full outline-none cursor-pointer" 
                             style={{border: '1px solid var(--border-light)', borderRadius: '4px', padding: '4px', background: '#fff'}}
                             onChange={(e) => handleAssignFolder(file.id, e.target.value)}
                             value=""
                           >
                             <option value="" disabled>Move to Folder...</option>
                             <option value="CREATE_NEW" style={{fontWeight: 700, color: 'var(--primary)'}}>+ Create New...</option>
                             {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                           </select>
                      </div>
                      <button className="context-menu-item text-danger" onClick={() => { setActiveMenuId(null); handleDeleteContract(file.id); }}><Trash2 className="w-4 h-4 text-danger"/> Delete</button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))}
          {filteredFiles.length === 0 && !isLoading && <p className="text-sm text-tertiary" style={{padding: '16px'}}>No documents found.</p>}
        </div>
      </div>
    </div>
  );
};
