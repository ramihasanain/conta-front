import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, CheckCircle2, Clock, AlertTriangle, Search, Plus, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useSystemDialog } from '../components/SystemDialog';
import { useNavigate } from 'react-router-dom';
import { InvoiceViewer } from '../components/InvoiceViewer';
import './PaymentsPage.css';

interface Invoice {
  id: string;
  document_id: number;
  document_title: string;
  description: string;
  amountNumber: number;
  amountCurrency: string;
  dueDate: string;
  status: string;
}

interface InvoiceTemplate {
  id: number;
  name: string;
  content: string;
  default_terms: string;
  created_at: string;
}

export const PaymentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'templates'>('invoices');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  
  const { showAlert, showConfirm, showPrompt, SystemDialogUi } = useSystemDialog();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const invs = await apiClient.get('/invoices/');
      setInvoices(invs);
      const tmpls = await apiClient.get('/invoice-templates/');
      setTemplates(tmpls);
    } catch (err) {
      console.error("Failed to load payments data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (inv: Invoice) => {
    const confirmed = await showConfirm(
      "Mark as Paid",
      `Are you sure you want to mark invoice "${inv.id} - ${inv.description}" as paid?`
    );
    if (!confirmed) return;

    try {
      await apiClient.patch('/invoices/', {
        document_id: inv.document_id,
        invoice_id: inv.id,
        status: 'paid'
      });
      // Update local state
      setInvoices(prev => prev.map(i => 
        (i.id === inv.id && i.document_id === inv.document_id) ? { ...i, status: 'paid' } : i
      ));
      showAlert("Success", "Invoice marked as paid.");
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to update invoice.");
    }
  };

  const handleCreateTemplate = async () => {
    const name = await showPrompt("New Template", "Enter a name for the new invoice template:");
    if (!name) return;

    try {
      const res = await apiClient.post('/invoice-templates/', {
        name,
        content: "Standard Invoice Layout",
        default_terms: "Net 30 Days"
      });
      setTemplates([res, ...templates]);
      showAlert("Success", "Template created successfully.");
    } catch (err: any) {
      showAlert("Error", err.message || "Failed to create template.");
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    const confirmed = await showConfirm("Delete Template", "Are you sure you want to delete this template?");
    if (!confirmed) return;
    try {
      await apiClient.delete(`/invoice-templates/${id}/`);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      showAlert("Error", "Failed to delete template.");
    }
  };

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((acc, curr) => acc + (curr.amountNumber || 0), 0);
  const pendingCollection = invoices.filter(i => i.status === 'pending').reduce((acc, curr) => acc + (curr.amountNumber || 0), 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;

  const filteredInvoices = invoices.filter(i => 
    i.document_title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="payments-page-container">
      <SystemDialogUi />
      
      <div className="payments-header">
        <h1 className="payments-title">Payments & Invoices</h1>
        <p className="payments-subtitle">Manage all extracted invoices, track collections, and create standard templates.</p>
      </div>

      <div className="payments-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrapper green"><DollarSign className="w-6 h-6"/></div>
          <div className="kpi-content">
            <h4>Total Collected</h4>
            <p className="kpi-value">${totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrapper blue"><Clock className="w-6 h-6"/></div>
          <div className="kpi-content">
            <h4>Pending Collection</h4>
            <p className="kpi-value">${pendingCollection.toLocaleString()}</p>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon-wrapper red"><AlertTriangle className="w-6 h-6"/></div>
          <div className="kpi-content">
            <h4>Overdue Invoices</h4>
            <p className="kpi-value">{overdueCount} Invoices</p>
          </div>
        </div>
      </div>

      <div className="payments-tabs">
        <button 
          className={`tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <FileText className="w-4 h-4 inline mr-2"/>
          All Invoices
        </button>
        <button 
          className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <Plus className="w-4 h-4 inline mr-2"/>
          Invoice Templates
        </button>
      </div>

      {activeTab === 'invoices' && (
        <div className="invoices-section">
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
             <div style={{ position: 'relative', width: '300px' }}>
                <Search className="w-4 h-4 text-slate-400" style={{ position: 'absolute', left: '12px', top: '10px' }}/>
                <input 
                  type="text" 
                  placeholder="Search invoices by ID, contract, or desc..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                />
             </div>
          </div>

          <div className="invoices-table-container">
            {loading ? (
               <div style={{padding: '40px', textAlign: 'center', color: '#64748b'}}>Loading invoices...</div>
            ) : filteredInvoices.length === 0 ? (
               <div style={{padding: '40px', textAlign: 'center', color: '#64748b'}}>No invoices found.</div>
            ) : (
              <table className="invoices-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Contract</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv, idx) => (
                    <tr key={idx}>
                      <td><span style={{fontFamily: 'monospace', fontWeight: 600, color: '#475569'}}>{inv.id}</span></td>
                      <td>
                        <button onClick={() => navigate(`/contract/${inv.document_id}`)} style={{background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', padding: 0, fontWeight: 500, textAlign: 'left'}}>
                          {inv.document_title}
                        </button>
                      </td>
                      <td>{inv.description}</td>
                      <td style={{fontWeight: 700}}>{(inv.amountNumber || 0).toLocaleString()} {inv.amountCurrency}</td>
                      <td>{inv.dueDate}</td>
                      <td>
                        <span className={`invoice-status-pill ${inv.status.toLowerCase()}`}>
                          {inv.status === 'paid' && <CheckCircle2 className="w-3 h-3"/>}
                          {inv.status === 'pending' && <Clock className="w-3 h-3"/>}
                          {inv.status === 'overdue' && <AlertTriangle className="w-3 h-3"/>}
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div style={{display: 'flex', gap: '8px'}}>
                           <button className="action-btn" style={{background: '#f1f5f9', color: '#475569'}} onClick={() => setViewingInvoice(inv)}>
                             View
                           </button>
                           {inv.status !== 'paid' && (
                             <button className="action-btn mark-paid" onClick={() => handleMarkAsPaid(inv)}>
                               Mark Paid
                             </button>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="templates-section">
          <div className="templates-grid">
            <div className="create-template-card" onClick={handleCreateTemplate}>
               <div style={{background: '#dbeafe', padding: '12px', borderRadius: '50%'}}>
                  <Plus className="w-6 h-6 text-blue-600"/>
               </div>
               <span>Create New Template</span>
            </div>
            
            {templates.map(t => (
              <div className="template-card" key={t.id}>
                 <h3>{t.name}</h3>
                 <p>Default Terms: {t.default_terms}</p>
                 <div className="template-actions">
                    <button className="action-btn mark-paid">Edit</button>
                    <button className="action-btn" style={{background: '#fee2e2', color: '#ef4444'}} onClick={() => handleDeleteTemplate(t.id)}>
                      <Trash2 className="w-4 h-4"/>
                    </button>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <InvoiceViewer 
         invoice={viewingInvoice} 
         onClose={() => setViewingInvoice(null)} 
         companyName={localStorage.getItem('myCompanyName') || "Fossa AI Services"} 
      />

    </div>
  );
};
