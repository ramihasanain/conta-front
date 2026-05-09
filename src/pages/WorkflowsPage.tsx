import React, { useState, useEffect } from 'react';
import { Workflow, Plus, MoreVertical, Edit2, Play, Trash2, X, Settings } from 'lucide-react';
import { apiClient } from '../api/client';
import './DashboardPage.css';

interface WorkflowType {
  id: string | number;
  document: number;
  name: string;
  status: string;
  created_at: string;
}

export const WorkflowsPage: React.FC = () => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isBuilderOpen, setBuilderOpen] = useState(false);
  const [wfName, setWfName] = useState('');
  const [wfSteps, setWfSteps] = useState([{ id: 1, role: 'Legal', name: 'Initial Review' }]);

  const toggleMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchWorkflows = async () => {
    try {
      const data = await apiClient.get('/workflows/');
      setWorkflows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleSaveWorkflow = async () => {
    if (!wfName.trim()) return;
    
    try {
      // Assuming document ID 1 exists as a rough test.
      // In a real app we'd link this to a specific document or system level workflow
      await apiClient.post('/workflows/', {
        document: 1, 
        name: wfName,
        status: 'active',
        steps: wfSteps
      });
      fetchWorkflows();
    } catch(err) {
      console.warn("Could not post workflow to backend", err);
    }

    setBuilderOpen(false);
    setWfName('');
  };

  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Workflows & Approvals</h1>
        <div className="dashboard-actions">
          <button className="btn btn-primary" onClick={() => setBuilderOpen(true)}>
            <Plus className="w-5 h-5" />
            New Workflow
          </button>
        </div>
      </div>

      <div className="dashboard-section">
        <h2 className="section-title">Active Workflows</h2>
        <div className="list-view">
          <div className="list-header" style={{ gridTemplateColumns: '3fr 2fr 2fr 1fr 48px' }}>
            <div className="col-name">Name</div>
            <div className="col-owner">Trigger / Date</div>
            <div className="col-modified">Status</div>
            <div className="col-size">Linked Doc</div>
            <div className="col-action"></div>
          </div>
          {workflows.map((item) => (
            <div key={item.id} className="list-row surface-hover" style={{ gridTemplateColumns: '3fr 2fr 2fr 1fr 48px' }}>
              <div className="col-name file-name">
                <Workflow className="w-5 h-5 text-tertiary" />
                {item.name}
              </div>
              <div className="col-owner">{new Date(item.created_at).toLocaleDateString()}</div>
              <div className="col-modified">
                 <span style={{ 
                   color: item.status.toLowerCase() === 'active' ? 'var(--success)' : 'var(--text-tertiary)',
                   backgroundColor: item.status.toLowerCase() === 'active' ? 'var(--success-bg)' : 'var(--bg-surface-active)',
                   padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500
                 }}>
                   {item.status}
                 </span>
              </div>
              <div className="col-size">#{item.document}</div>
              <div className="col-action">
                
                <div className="context-menu-wrapper">
                  <button className="btn-icon" onClick={(e) => toggleMenu(e, `wf-menu-${item.id}`)}>
                    <MoreVertical className="w-5 h-5 text-tertiary" />
                  </button>
                  {activeMenuId === `wf-menu-${item.id}` && (
                    <div className="context-menu" onClick={(e) => e.stopPropagation()}>
                       <button className="context-menu-item"><Play className="w-4 h-4 text-tertiary"/> Run Workflow</button>
                       <button className="context-menu-item"><Edit2 className="w-4 h-4 text-tertiary"/> Edit Structure</button>
                       <div className="context-menu-divider"></div>
                       <button className="context-menu-item text-danger"><Trash2 className="w-4 h-4 text-danger"/> Disable</button>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ))}
          {workflows.length === 0 && !isLoading && <p className="text-sm text-tertiary" style={{padding: '16px'}}>No workflows configured yet.</p>}
          {isLoading && <p className="text-sm text-tertiary" style={{padding: '16px'}}>Loading workflows...</p>}
        </div>
      </div>

      {/* NEW WORKFLOW BUILDER MODAL */}
      {isBuilderOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          zIndex: 9999, backgroundColor: 'rgba(15, 23, 42, 0.4)', 
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', width: 600, borderRadius: 16, 
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden',
            border: '1px solid var(--border-light)'
          }} className="animate-slide-up">
            
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface-hover)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Workflow className="w-5 h-5 text-primary"/> Build AI Workflow
              </h2>
              <button 
                onClick={() => setBuilderOpen(false)} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
              >
                <X className="w-5 h-5 hover:text-danger flex" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 24 }}>
              
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Workflow Name</label>
                <input 
                  type="text" 
                  value={wfName}
                  onChange={(e) => setWfName(e.target.value)}
                  placeholder="e.g. Master Service Agreement Verification"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border-strong)', fontSize: 14, outline: 'none' }}
                />
              </div>

              <div style={{ padding: 16, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 12 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>
                  <Settings className="w-4 h-4 text-tertiary"/> Sequential Approval Steps
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {wfSteps.map((step, index) => (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', backgroundColor: '#fff', border: '1px solid var(--border-light)', borderRadius: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1, display: 'flex', gap: 12 }}>
                        <select value={step.role} onChange={(e) => {
                          const n = [...wfSteps]; n[index].role = e.target.value; setWfSteps(n);
                        }} style={{ width: '40%', border: 'none', borderBottom: '1px dashed var(--border-strong)', background: 'transparent', fontSize: 14, outline: 'none', padding: '2px 0' }}>
                          <option value="Employee">Employee</option>
                          <option value="Legal">Legal</option>
                          <option value="Finance">Finance</option>
                          <option value="Director">Director</option>
                          <option value="Admin">Admin</option>
                        </select>
                        <input type="text" placeholder="Action Name" value={step.name} onChange={(e) => {
                          const n = [...wfSteps]; n[index].name = e.target.value; setWfSteps(n);
                        }} style={{ width: '60%', border: 'none', borderBottom: '1px dashed var(--border-strong)', background: 'transparent', fontSize: 14, outline: 'none', padding: '2px 0' }}/>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  style={{ width: '100%', marginTop: 12, padding: 10, backgroundColor: 'transparent', border: '1px dashed var(--border-strong)', borderRadius: 8, color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}
                  onClick={() => setWfSteps([...wfSteps, { id: Date.now(), role: '', name: '' }])}
                >
                  <Plus className="w-4 h-4"/> Add Another Step
                </button>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: 12, backgroundColor: 'var(--bg-surface)' }}>
              <button className="btn btn-ghost" onClick={() => setBuilderOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveWorkflow}>Save Workflow</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
