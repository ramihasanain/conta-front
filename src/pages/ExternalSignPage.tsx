import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertTriangle, PenTool, Type, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { useSystemDialog } from '../components/SystemDialog';
import './ExternalSignPage.css';

export const ExternalSignPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docData, setDocData] = useState<any>(null);

  const [signatureName, setSignatureName] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { showAlert, SystemDialogUi } = useSystemDialog();

  // Drawing mode states
  const [signMode, setSignMode] = useState<'type'|'draw'>('type');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Set up canvas context
  useEffect(() => {
    if (signMode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      // We explicitly set internal dimensions relative to styling for high-DPI clarity
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#2563eb'; // blue ink
        ctx.lineWidth = 4;
      }
    }
  }, [signMode]);

  // Drawing event handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Support mouse & touch
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault(); // Prevent scrolling on touch devices
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!canvasRef.current) return;
    setIsDrawing(false);
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) ctx.closePath();
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    
    apiClient.get(`/signatures/guest/${token}/`)
      .then(resp => {
        setDocData(resp);
        if (resp.status === 'completed') {
            setIsSuccess(true);
        }
      })
      .catch(err => {
        setError(err.message || 'Invalid or expired signature link.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSign = async () => {
    let payload = '';

    if (signMode === 'type') {
      if (!signatureName.trim()) {
        showAlert("Warning", "Please enter your legal name as signature.");
        return;
      }
      payload = signatureName;
    } else {
      if (!hasDrawn || !canvasRef.current) {
        showAlert("Warning", "Please draw your signature.");
        return;
      }
      // Extract base64
      payload = canvasRef.current.toDataURL('image/png');
    }
    
    setIsSigning(true);
    try {
      await apiClient.post(`/signatures/guest/${token}/`, {
        signature_data: payload
      });
      setIsSuccess(true);
    } catch (err: any) {
      showAlert("Error", err.message || 'Failed to submit signature.');
    } finally {
      setIsSigning(false);
    }
  };

  if (loading) {
    return (
        <div className="sign-page-container flex-centered">
            <div className="loading-spinner"></div>
            <p>Verifying secure link...</p>
        </div>
    );
  }

  if (error) {
    return (
        <div className="sign-page-container flex-centered">
            <SystemDialogUi />
            <div className="error-card">
               <AlertTriangle className="w-12 h-12 text-danger mb-4" />
               <h2>Access Denied</h2>
               <p>{error}</p>
            </div>
        </div>
    );
  }

  if (isSuccess) {
    return (
        <div className="sign-page-container flex-centered">
            <div className="success-card">
               <CheckCircle2 className="w-16 h-16 text-success mb-4" />
               <h2>Document Signed Successfully</h2>
               <p>Thank you, {docData?.signer_name}. Your signature has been securely recorded.</p>
               <p className="small-text mt-4">You may now close this tab.</p>
            </div>
        </div>
    );
  }

  return (
    <div className="sign-page-container">
      <SystemDialogUi />
      <div className="sign-header">
         <div className="secure-badge">
             <ShieldCheck className="w-4 h-4" />
             256-bit Secure Signature Portal
         </div>
         <img src="/fossa_logo.png" alt="Fossa HQ" className="sign-fossa-logo" />
      </div>

      <div className="sign-body">
         <div className="sign-document-info">
             <h2>Review and Sign Document</h2>
             <p><strong>Prepared for:</strong> {docData?.signer_name}</p>
             <p><strong>Document Title:</strong> {docData?.document_title}</p>
         </div>

         <div className="sign-document-preview" dangerouslySetInnerHTML={{ __html: docData?.document_content || '<p>No content available.</p>' }}>
         </div>

         <div className="sign-action-area">
             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
               <h3>Electronic Signature</h3>
               <div className="sign-mode-toggle" style={{display: 'flex', gap: '8px', background: '#e2e8f0', padding: '4px', borderRadius: '8px'}}>
                 <button className={`btn-mode ${signMode === 'type' ? 'active' : ''}`} onClick={() => setSignMode('type')} style={{border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', background: signMode === 'type' ? 'white' : 'transparent', fontWeight: signMode === 'type' ? 'bold': 'normal'}}>
                   <Type className="w-4 h-4"/> Type
                 </button>
                 <button className={`btn-mode ${signMode === 'draw' ? 'active' : ''}`} onClick={() => setSignMode('draw')} style={{border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', background: signMode === 'draw' ? 'white' : 'transparent', fontWeight: signMode === 'draw' ? 'bold': 'normal'}}>
                   <PenTool className="w-4 h-4"/> Draw
                 </button>
               </div>
             </div>

             <p className="text-sm text-secondary mb-4">By providing your signature below, you agree to the terms outlined in the document above.</p>
             
             {signMode === 'type' ? (
               <div className="sign-input-group">
                  <input 
                    type="text" 
                    className="signature-text-input" 
                    placeholder="Type your full legal name"
                    value={signatureName}
                    onChange={e => setSignatureName(e.target.value)}
                    disabled={isSigning}
                  />
               </div>
             ) : (
               <div className="sign-canvas-wrapper" style={{position: 'relative', marginBottom: '24px'}}>
                 <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{
                      width: '100%', 
                      height: '200px', 
                      background: 'white', 
                      border: '2px dashed #cbd5e1', 
                      borderRadius: '8px', 
                      cursor: 'crosshair',
                      touchAction: 'none' // Highly important for touch screens to disable scrolling
                    }}
                 />
                 <div style={{position: 'absolute', bottom: '12px', right: '12px'}}>
                   <button onClick={clearCanvas} style={{background: 'white', border: '1px solid #cbd5e1', color: '#64748b', fontSize: '12px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'}}>
                     <Trash2 className="w-3 h-3"/> Clear
                   </button>
                 </div>
                 {!hasDrawn && <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#cbd5e1', pointerEvents: 'none', fontWeight: 600, fontSize: '24px', fontFamily: '"Caveat", cursive'}}>Draw your signature here</div>}
               </div>
             )}

             <button className="btn-sign-submit" onClick={handleSign} disabled={isSigning || (signMode === 'type' ? !signatureName.trim() : !hasDrawn)}>
                {isSigning ? 'Securing & Sending...' : 'Sign & Securely Send to Sender'}
             </button>
         </div>
      </div>
    </div>
  );
};
