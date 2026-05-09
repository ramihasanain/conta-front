import React from 'react';
import { Download, X } from 'lucide-react';
import './InvoiceViewer.css';

interface InvoiceData {
  id: string;
  document_id: number;
  document_title: string;
  description: string;
  amountNumber: number;
  amountCurrency: string;
  dueDate: string;
  status: string;
}

interface InvoiceViewerProps {
  invoice: InvoiceData | null;
  onClose: () => void;
  companyName?: string;
}

export const InvoiceViewer: React.FC<InvoiceViewerProps> = ({ invoice, onClose, companyName = "Fossa AI Services" }) => {
  if (!invoice) return null;

  React.useEffect(() => {
    document.body.classList.add('is-printing-invoice');
    return () => {
      document.body.classList.remove('is-printing-invoice');
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="invoice-viewer-overlay">
      <div className="invoice-viewer-content">
        
        {/* Actions Header - Hidden on Print */}
        <div className="invoice-viewer-actions">
           <h3 style={{margin: 0, color: '#0f172a'}}>Invoice Preview</h3>
           <div style={{display: 'flex', gap: '12px'}}>
              <button className="btn-close-viewer" onClick={onClose}>
                 <X className="w-4 h-4"/> Close
              </button>
              <button className="btn-download-pdf" onClick={handlePrint}>
                 <Download className="w-4 h-4"/> Download PDF
              </button>
           </div>
        </div>

        {/* Printable Area */}
        <div className="invoice-printable-area">
           
           <div className="invoice-header">
             <div className="invoice-header-left">
                <h1>INVOICE</h1>
                <p>Invoice #: {String(invoice.id || `INV-${invoice.document_id}`).toUpperCase()}</p>
             </div>
             <div className="invoice-header-right">
                <div className="invoice-brand">{companyName}</div>
                <p style={{margin: 0, color: '#64748b'}}>contact@fossa.ai</p>
                <p style={{margin: 0, color: '#64748b'}}>+1 800 555 0199</p>
             </div>
           </div>

           <div className="invoice-meta">
              <div className="meta-block">
                 <h4>Billed To</h4>
                 <p>Client Details From</p>
                 <p style={{color: '#64748b', fontWeight: 400, marginTop: '4px'}}>{invoice.document_title}</p>
              </div>
              <div className="meta-block">
                 <h4>Issue Date</h4>
                 <p>{currentDate}</p>
              </div>
              <div className="meta-block">
                 <h4>Due Date</h4>
                 <p>{invoice.dueDate}</p>
              </div>
              <div className="meta-block">
                 <h4>Amount Due</h4>
                 <p style={{color: '#3b82f6', fontSize: '18px'}}>{(invoice.amountNumber || 0).toLocaleString()} {invoice.amountCurrency}</p>
              </div>
           </div>

           <table className="invoice-details-table">
              <thead>
                 <tr>
                    <th>Description</th>
                    <th className="amount-col">Amount</th>
                 </tr>
              </thead>
              <tbody>
                 <tr>
                    <td>
                       <div style={{fontWeight: 600, color: '#0f172a', marginBottom: '4px'}}>{invoice.description}</div>
                       <div style={{fontSize: '13px', color: '#64748b'}}>Milestone payment according to contract terms.</div>
                    </td>
                    <td className="amount-col" style={{fontWeight: 600}}>
                       {(invoice.amountNumber || 0).toLocaleString()} {invoice.amountCurrency}
                    </td>
                 </tr>
              </tbody>
           </table>

           <div className="invoice-total-row">
              <div className="invoice-total-box">
                 <div className="total-line">
                    <span>Subtotal</span>
                    <span>{(invoice.amountNumber || 0).toLocaleString()} {invoice.amountCurrency}</span>
                 </div>
                 <div className="total-line">
                    <span>Tax (0%)</span>
                    <span>0.00 {invoice.amountCurrency}</span>
                 </div>
                 <div className="total-line grand-total">
                    <span>Total</span>
                    <span>{(invoice.amountNumber || 0).toLocaleString()} {invoice.amountCurrency}</span>
                 </div>
              </div>
           </div>

           <div className="invoice-footer">
              <p style={{fontWeight: 600, color: '#0f172a', marginBottom: '8px'}}>Payment Terms & Instructions</p>
              <p>Please make the payment by the due date. Standard terms apply as per the contract "{invoice.document_title}".</p>
              <p style={{marginTop: '24px'}}>Thank you for your business!</p>
           </div>

        </div>
      </div>
    </div>
  );
};
