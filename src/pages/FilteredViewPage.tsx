import React, { useState, useEffect } from 'react';
import { FileText, MoreVertical, Trash2, ExternalLink, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useSystemDialog } from '../components/SystemDialog';
import './DashboardPage.css';

interface FilteredViewPageProps {
  title: string;
  emptyMessage?: string;
}

export const FilteredViewPage: React.FC<FilteredViewPageProps> = ({ title, emptyMessage = "No contracts found in this view." }) => {
  const navigate = useNavigate();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showAlert, showConfirm, SystemDialogUi } = useSystemDialog();

  const fetchDocuments = async () => {
    setLoading(true);
    let viewParam = 'recent';
    if (title.toLowerCase().includes('star')) viewParam = 'starred';
    if (title.toLowerCase().includes('trash')) viewParam = 'trash';

    try {
      const data = await apiClient.get(`/documents/?view=${viewParam}`);
      setDocuments(data);
    } catch (err) {
      console.error("Failed to load list", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [title]);

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleRestore = async (id: number) => {
    try {
      await apiClient.patch(`/documents/${id}/`, { is_trashed: false });
      fetchDocuments();
    } catch(err) { showAlert("Error", "Failed to restore document."); }
  };

  const handleEmptyTrash = async () => {
    const confirmed = await showConfirm("Empty Trash", "Are you sure you want to permanently delete all items in trash?");
    if (confirmed) {
      try {
        await apiClient.delete('/documents/empty_trash/');
        fetchDocuments();
      } catch(err) { showAlert("Error", "Failed to empty trash"); }
    }
  };

  return (
    <div className="dashboard animate-fade-in">
      <SystemDialogUi />
      <div className="dashboard-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h1 className="dashboard-title">{title}</h1>
        {title.toLowerCase().includes('trash') && documents.length > 0 && (
          <button className="btn btn-primary" style={{backgroundColor: '#ef4444'}} onClick={handleEmptyTrash}>
            <Trash2 className="w-4 h-4 mr-2 inline" /> Empty Trash
          </button>
        )}
      </div>

      <div className="dashboard-section" style={{ marginTop: '24px' }}>
        <div className="list-view">
          <div className="list-header" style={{ gridTemplateColumns: '4fr 2fr 2fr 1fr 48px' }}>
            <div className="col-name">Name</div>
            <div className="col-owner">Status</div>
            <div className="col-modified">Last modified</div>
            <div className="col-size">File size</div>
            <div className="col-action"></div>
          </div>
          
          {loading ? (
             <div className="p-8 text-center text-secondary">Loading documents...</div>
          ) : documents.length === 0 ? (
             <div className="p-8 text-center text-secondary">{emptyMessage}</div>
          ) : (
             documents.map((doc, i) => (
                <div key={doc.id} className="list-row surface-hover" style={{ gridTemplateColumns: '4fr 2fr 2fr 1fr 48px' }}>
                <div className="col-name file-name font-medium" style={{cursor: 'pointer'}} onClick={() => navigate(`/contract/${doc.id}`)}>
                    <FileText className="w-5 h-5 text-tertiary" />
                    {doc.title}
                    <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: doc.ai_metadata?.documentType === 'Proposal' ? '#fdf4ff' : '#eef2ff',
                        color: doc.ai_metadata?.documentType === 'Proposal' ? '#a21caf' : '#4f46e5',
                        marginLeft: '8px',
                        border: `1px solid ${doc.ai_metadata?.documentType === 'Proposal' ? '#f5d0fe' : '#c7d2fe'}`,
                        textTransform: 'uppercase'
                    }}>
                       {doc.ai_metadata?.documentType || 'Contract'}
                    </span>
                </div>
                <div className="col-owner" style={{textTransform: 'capitalize'}}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: doc.status.toLowerCase() === 'completed' ? '#dcfce3' : (doc.status.toLowerCase().includes('review') ? '#fef3c7' : '#f1f5f9'),
                    color: doc.status.toLowerCase() === 'completed' ? '#166534' : (doc.status.toLowerCase().includes('review') ? '#b45309' : '#64748b'),
                  }}>
                    {doc.status}
                  </span>
                </div>
                <div className="col-modified font-medium text-slate-500">{new Date(doc.updated_at).toLocaleDateString()}</div>
                <div className="col-size text-slate-400 font-mono">--</div>
                <div className="col-action">
                    
                    <div className="context-menu-wrapper">
                    <button className="btn-icon" onClick={(e) => toggleMenu(e, `flt-menu-${i}`)}>
                        <MoreVertical className="w-5 h-5 text-tertiary" />
                    </button>
                    {activeMenuId === `flt-menu-${i}` && (
                        <div className="context-menu" onClick={(e) => e.stopPropagation()}>
                        <button className="context-menu-item" onClick={() => navigate(`/contract/${doc.id}`)}><ExternalLink className="w-4 h-4 text-tertiary"/> Open in Workspace</button>
                        
                        {title.toLowerCase().includes('trash') ? (
                          <button className="context-menu-item" onClick={() => handleRestore(doc.id)}><RotateCcw className="w-4 h-4 text-tertiary"/> Restore Document</button>
                        ) : (
                          <button className="context-menu-item text-danger" onClick={async () => {
                              const conf = await showConfirm('Trash Document', 'Move this document to the trash bin?');
                              if (conf) {
                                 await apiClient.delete(`/documents/${doc.id}/`);
                                 fetchDocuments();
                              }
                          }}><Trash2 className="w-4 h-4 text-danger"/> Move to Trash</button>
                        )}
                        </div>
                    )}
                    </div>

                </div>
                </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
