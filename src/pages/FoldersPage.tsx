import React, { useState, useEffect } from 'react';
import { Folder, FileText, MoreVertical, Plus, ExternalLink, Edit2, Share2, Trash2, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useSystemDialog } from '../components/SystemDialog';
import './DashboardPage.css';
import './FoldersPage.css';

interface FolderType {
  id: string | number;
  name: string;
}

interface DocumentType {
  id: string | number;
  title: string;
  status: string;
  created_at: string;
  folder?: string | number | null;
  ai_metadata?: {
    documentType?: string;
  };
}

export const FoldersPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [files, setFiles] = useState<DocumentType[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  
  const [activeFolder, setActiveFolder] = useState<FolderType | null>(null);
  const { showAlert, showConfirm, showPrompt, SystemDialogUi } = useSystemDialog();

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    apiClient.get('/folders/')
      .then(data => setFolders(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoadingFolders(false));

    apiClient.get('/documents/')
      .then(data => setFiles(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoadingFiles(false));
  }, []);

  const handleCreateFolder = async () => {
    const folderName = await showPrompt("Create Folder", "Enter new folder name:");
    if (!folderName || !folderName.trim()) return;
    try {
      const newFolder = await apiClient.post('/folders/', { name: folderName });
      setFolders([...folders, newFolder]);
    } catch(err: any) {
      showAlert("Error", "Failed to create folder: " + (err.message || 'error'));
    }
  };

  const handleDeleteFolder = async (id: string | number) => {
    const confirmed = await showConfirm("Delete Folder", "Are you sure you want to delete this folder?");
    if (confirmed) {
      try {
        await apiClient.delete(`/folders/${id}/`);
        setFolders(folders.filter(f => f.id !== id));
      } catch(err: any) {
        showAlert("Error", "Failed to delete folder: " + (err.message || 'error'));
      }
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleMoveFileToFolder = async (fileId: string | number, targetFolderId: string | number | null) => {
    try {
      await apiClient.patch(`/documents/${fileId}/`, { folder: targetFolderId });
      setFiles(files.map(f => f.id.toString() === fileId.toString() ? { ...f, folder: targetFolderId } : f));
    } catch (err: any) {
      console.error(err);
      showAlert('Error', 'Failed to move document: ' + (err.message || 'Server error'));
    }
  };

  const looseFiles = files.filter(f => !f.folder);
  const activeFolderFiles = activeFolder ? files.filter(f => f.folder === activeFolder.id) : [];

  if (activeFolder) {
    return (
      <div className="dashboard animate-fade-in">
        <SystemDialogUi />
        <div className="dashboard-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '24px', marginBottom: '32px' }}>
          <div className="flex items-center gap-3">
            <button className="btn-icon" onClick={() => setActiveFolder(null)} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)'}}>
              <ArrowLeft className="w-5 h-5 text-tertiary" />
            </button>
            <h1 className="dashboard-title flex items-center gap-2" style={{ fontSize: '24px' }}>
              <span className="text-secondary cursor-pointer hover:text-primary transition-colors" onClick={() => setActiveFolder(null)}>Folders</span>
              <span className="text-tertiary font-light">/</span>
              <span className="text-primary-dark">{activeFolder.name}</span>
            </h1>
          </div>
          <div className="dashboard-actions">
             <button className="btn btn-ghost"><Share2 className="w-4 h-4 mr-2 inline"/> Share Folder</button>
             <button className="btn btn-primary" onClick={() => navigate('/hub')}>
               <Plus className="w-4 h-4" /> Add File
             </button>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="flex items-center justify-between mb-4">
             <h2 className="section-title m-0">Contents ({activeFolderFiles.length})</h2>
             <div className="flex gap-2">
                <button className="btn-icon"><MoreHorizontal className="w-5 h-5"/></button>
             </div>
          </div>

          <div className="list-view" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="list-header" style={{ background: '#fafbfc' }}>
              <div className="col-name text-xs uppercase tracking-wider text-secondary">Document Name</div>
              <div className="col-owner text-xs uppercase tracking-wider text-secondary">Status</div>
              <div className="col-modified text-xs uppercase tracking-wider text-secondary">Created</div>
              <div className="col-size text-xs uppercase tracking-wider text-secondary">Ref ID</div>
              <div className="col-action"></div>
            </div>
            {activeFolderFiles.map((file) => (
              <div 
                key={file.id} 
                className="list-row surface-hover border-t border-border-light cursor-grab active:cursor-grabbing"
                style={{ zIndex: activeMenuId === `file-menu-${file.id}` ? 50 : 1, position: "relative" }} 
                onClick={() => navigate(`/contract/${file.id}`)}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', file.id.toString());
                }}
              >
                <div className="col-name file-name font-medium">
                  <FileText className="w-5 h-5 text-primary" />
                  {file.title}
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: file.ai_metadata?.documentType === 'Proposal' ? '#fdf4ff' : '#eef2ff', color: file.ai_metadata?.documentType === 'Proposal' ? '#a21caf' : '#4f46e5', marginLeft: '8px', border: `1px solid ${file.ai_metadata?.documentType === 'Proposal' ? '#f5d0fe' : '#c7d2fe'}`, textTransform: 'uppercase' }}>
                     {file.ai_metadata?.documentType || 'Contract'}
                  </span>
                </div>
                <div className="col-owner" style={{textTransform: 'capitalize'}}>
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
                <div className="col-modified text-secondary text-sm">{formatDate(file.created_at)}</div>
                <div className="col-size text-tertiary text-sm font-mono">#{file.id}</div>
                <div className="col-action">
                  <div className="context-menu-wrapper">
                    <button className="btn-icon" onClick={(e) => toggleMenu(e, `file-menu-${file.id}`)}>
                      <MoreVertical className="w-5 h-5 text-tertiary" />
                    </button>
                    {activeMenuId === `file-menu-${file.id}` && (
                      <div className="context-menu" onClick={(e) => e.stopPropagation()}>
                         <button className="context-menu-item" onClick={() => navigate(`/contract/${file.id}`)}><ExternalLink className="w-4 h-4 text-primary"/> Open Document</button>
                         <button className="context-menu-item text-danger" onClick={() => handleMoveFileToFolder(file.id, null)}>
                           <Trash2 className="w-4 h-4 text-danger"/> Remove from Folder
                         </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {activeFolderFiles.length === 0 && !isLoadingFiles && (
               <div className="flex flex-col items-center justify-center p-16 text-center">
                 <Folder className="w-16 h-16 text-tertiary mb-4" style={{ opacity: 0.3 }} />
                 <h3 className="text-lg font-semibold text-secondary mb-2">This folder is empty</h3>
                 <p className="text-sm text-tertiary mb-6 max-w-md">You haven't moved any contracts into this folder yet. Open a contract and change its folder from the top bar.</p>
               </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard animate-fade-in">
      <SystemDialogUi />
      <div className="dashboard-header mb-8">
        <h1 className="dashboard-title" style={{fontSize: '28px', fontWeight: 800}}>My Vault</h1>
        <div className="dashboard-actions">
          <button className="btn btn-primary" onClick={handleCreateFolder} style={{boxShadow: 'var(--shadow-md)'}}>
            <Plus className="w-5 h-5" />
            New Folder
          </button>
        </div>
      </div>

      {/* FOLDERS GRID SECTION */}
      <div className="dashboard-section mb-10">
        <h2 className="section-title flex items-center gap-2"><Folder className="w-5 h-5 text-primary"/> Defined Workspaces <span style={{fontSize:'12px', fontWeight: 'normal', color: 'var(--text-tertiary)', marginLeft: '10px'}}>(Drag files here)</span></h2>
        <div className="folders-grid" style={{gap: '20px'}}>
          {folders.map(folder => {
            const itemCount = files.filter(f => f.folder === folder.id).length;
            return (
              <div 
                key={folder.id} 
                className="folder-card surface-hover cursor-pointer transition-all" 
                style={{border: '1px solid var(--border-light)', borderRadius: '16px', boxShadow: 'var(--shadow-sm)', zIndex: activeMenuId === `fl-menu-${folder.id}` ? 50 : 1, position: 'relative'}} 
                onClick={() => setActiveFolder(folder)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.background = '';
                  e.currentTarget.style.transform = '';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = 'var(--border-light)';
                  e.currentTarget.style.background = '';
                  e.currentTarget.style.transform = '';
                  const fileId = e.dataTransfer.getData('text/plain');
                  if (fileId) handleMoveFileToFolder(fileId, folder.id);
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="folder-icon-wrapper" style={{background: 'var(--primary-light)', padding: '10px', borderRadius: '12px'}}>
                    <Folder className="w-6 h-6" style={{color: 'var(--primary)'}} />
                  </div>
                  <div className="context-menu-wrapper">
                    <button className="btn-icon" onClick={(e) => toggleMenu(e, `fl-menu-${folder.id}`)}>
                      <MoreVertical className="w-5 h-5 text-tertiary" />
                    </button>
                    {activeMenuId === `fl-menu-${folder.id}` && (
                      <div className="context-menu" onClick={(e) => e.stopPropagation()}>
                        <button className="context-menu-item"><Edit2 className="w-4 h-4 text-tertiary"/> Rename Workspace</button>
                        <button className="context-menu-item"><Share2 className="w-4 h-4 text-tertiary"/> Share Workspace</button>
                        <div className="context-menu-divider"></div>
                        <button className="context-menu-item text-danger" onClick={() => { setActiveMenuId(null); handleDeleteFolder(folder.id); }}>
                          <Trash2 className="w-4 h-4 text-danger"/> Delete Workspace
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="folder-name" style={{fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px'}}>{folder.name}</h3>
                  <span className="text-xs font-medium text-tertiary">{itemCount} items stored</span>
                </div>
              </div>
            );
          })}
          {folders.length === 0 && !isLoadingFolders && <p className="text-sm text-tertiary" style={{gridColumn: '1 / -1'}}>No folders found.</p>}
          {isLoadingFolders && <p className="text-sm text-tertiary" style={{gridColumn: '1 / -1'}}>Syncing workspaces...</p>}
        </div>
      </div>

      {/* FILES LIST SECTION */}
      <div className="dashboard-section">
        <h2 className="section-title flex items-center gap-2"><FileText className="w-5 h-5 text-secondary"/> Uncategorized Submissions</h2>
        <div className="list-view" style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
          <div className="list-header" style={{ background: '#fafbfc' }}>
            <div className="col-name text-xs uppercase tracking-wider text-secondary">Document Name</div>
            <div className="col-owner text-xs uppercase tracking-wider text-secondary">Resolution</div>
            <div className="col-modified text-xs uppercase tracking-wider text-secondary">Scanned Date</div>
            <div className="col-size text-xs uppercase tracking-wider text-secondary">Ref ID</div>
            <div className="col-action"></div>
          </div>
          {looseFiles.map((file) => (
            <div 
              key={file.id} 
              className="list-row surface-hover border-t border-border-light cursor-grab active:cursor-grabbing"
                style={{ zIndex: activeMenuId === `file-menu-${file.id}` ? 50 : 1, position: "relative" }} 
              onClick={() => navigate(`/contract/${file.id}`)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', file.id.toString());
              }}
            >
              <div className="col-name file-name font-medium">
                <FileText className="w-5 h-5 text-tertiary" />
                {file.title}
                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, backgroundColor: file.ai_metadata?.documentType === 'Proposal' ? '#fdf4ff' : '#eef2ff', color: file.ai_metadata?.documentType === 'Proposal' ? '#a21caf' : '#4f46e5', marginLeft: '8px', border: `1px solid ${file.ai_metadata?.documentType === 'Proposal' ? '#f5d0fe' : '#c7d2fe'}`, textTransform: 'uppercase' }}>
                   {file.ai_metadata?.documentType || 'Contract'}
                </span>
              </div>
              <div className="col-owner" style={{textTransform: 'capitalize'}}>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: (file.status || 'draft').toLowerCase() === 'completed' ? '#dcfce3' : ((file.status || 'draft').toLowerCase().includes('review') ? '#fef3c7' : '#f1f5f9'),
                    color: (file.status || 'draft').toLowerCase() === 'completed' ? '#166534' : ((file.status || 'draft').toLowerCase().includes('review') ? '#b45309' : '#64748b'),
                  }}>
                    {file.status || 'Draft'}
                  </span>
              </div>
              <div className="col-modified text-secondary text-sm">{formatDate(file.created_at)}</div>
              <div className="col-size text-tertiary text-sm font-mono">#{file.id}</div>
              <div className="col-action">
                
                <div className="context-menu-wrapper">
                  <button className="btn-icon" onClick={(e) => toggleMenu(e, `file-menu-${file.id}`)}>
                    <MoreVertical className="w-5 h-5 text-tertiary" />
                  </button>
                  {activeMenuId === `file-menu-${file.id}` && (
                    <div className="context-menu" onClick={(e) => e.stopPropagation()}>
                       <button className="context-menu-item" onClick={() => navigate(`/contract/${file.id}`)}><ExternalLink className="w-4 h-4 text-tertiary"/> Open in Editor</button>
                       <div className="context-menu-divider"></div>
                       <button className="context-menu-item text-danger"><Trash2 className="w-4 h-4 text-danger"/> Move to Trash</button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))}
          {looseFiles.length === 0 && !isLoadingFiles && <p className="text-sm text-tertiary" style={{padding: '24px', textAlign: 'center'}}>No uncategorized documents roaming.</p>}
        </div>
      </div>
    </div>
  );
};
