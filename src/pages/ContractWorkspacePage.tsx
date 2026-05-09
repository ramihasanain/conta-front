import React, { useState, useRef, useEffect } from 'react';
import { Receipt, Calendar, DollarSign, RotateCcw,
  FileText, Bold, Italic, Underline, AlignLeft, 
  AlignCenter, AlignRight, Cpu, Users, PenTool, CheckCircle2, 
  GitMerge, X, Plus, ArrowRight, Activity, ArrowLeft, Share2, 
  MessageSquare, Link2, Image as ImageIcon, 
  CornerUpLeft, CornerUpRight, Type, PaintBucket, Star, Trash2,
  ShieldCheck, Sparkles, User, History, Loader, Folder, ChevronDown
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useSystemDialog } from '../components/SystemDialog';
import { useAuth } from '../context/AuthContext';
import * as Diff from 'diff';
import './ContractWorkspacePage.css';

type ProcessState = 'UPLOAD' | 'SCANNING' | 'READY';
type WorkflowStep = { id: number; role?: string; name: string; assigned_user?: any; status?: string; comments?: string; database_id?: number; comment_visibility?: string[]; order?: number; };


export const ContractWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const [workflowComment, setWorkflowComment] = useState('');

  // Dynamic Rail States
  const [activeLeftPanel, setActiveLeftPanel] = useState<'metadata' | 'parties' | 'financials' | 'risk' | 'summary' | null>(null);
  const [activeRightPanel, setActiveRightPanel] = useState<'comments' | 'workflow' | 'esignature' | 'audit' | 'version' | 'invoices' | null>(null);

  // Main states
  const [state, setState] = useState<ProcessState>(id === 'upload' ? 'UPLOAD' : 'READY');
  const [uploadedFileName, setUploadedFileName] = useState(
    id === 'new' ? 'Untitled Contract' : 'Active_Vendor_Agreement.pdf'
  );
  const [docStatus, setDocStatus] = useState<string>('draft');
  const [isStarred, setIsStarred] = useState<boolean>(false);

  type ContractEdit = { id: string; time: string; type: 'manual' | 'ai'; description: string; user?: string; oldText?: string; newText?: string; _fullOldText?: string };
  const [editHistory, setEditHistory] = useState<ContractEdit[]>([
     { id: 'initial_1', time: '10:00 AM', type: 'manual', description: 'Document uploaded and OCR processed', user: 'System', oldText: '', newText: 'Initial Document Text Formatted' }
  ]);
  const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
  const [isVersionsModalOpen, setVersionsModalOpen] = useState(false);
  const [versionsList, setVersionsList] = useState<any[]>([]);
  const [selectedVersionDiff, setSelectedVersionDiff] = useState<{html: string, versionId: number} | null>(null);
  
  const lastKnownContentRef = useRef<string>('');
  const initialContentRef = useRef<string>('');
  
  const [allFolders, setAllFolders] = useState<{id: number, name: string}[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  
  const [isWorkflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [signatureStatus, setSignatureStatus] = useState<'IDLE' | 'GENERATING' | 'GENERATED'>('IDLE');
  const [signerName, setSignerName] = useState('');
  const [signatureLink, setSignatureLink] = useState('');

  // Comment Cycle States
  const [comments, setComments] = useState<{id: string, quote: string, text: string, author: string, time: string}[]>([]);
  const [isCommentModalOpen, setCommentModalOpen] = useState(false);
  const [commentDraftQuote, setCommentDraftQuote] = useState('');
  const [commentDraftText, setCommentDraftText] = useState('');

  // Internal Saved Signatures
  const [savedSignatures, setSavedSignatures] = useState<any[]>([]);
  const [isInternalSignModalOpen, setInternalSignModalOpen] = useState(false);

  // Unified System Dialog for premium alerts & confirms
  const { showAlert, showConfirm, showPrompt, SystemDialogUi } = useSystemDialog();

  const handleExitWorkspace = async () => {
      if (editorRef.current && id && id !== 'new') {
         const currentHtml = editorRef.current.innerHTML;
         if (initialContentRef.current !== currentHtml && initialContentRef.current !== '') {
            try {
               await apiClient.post(`/documents/${id}/versions/`, { content: currentHtml });
            } catch (err) {
               console.error("Failed to save version on exit", err);
            }
         }
      }
      navigate('/');
  };

  // Fossa Elite AI Chat & Inline
  const [isFossaSidebarOpen, setFossaSidebarOpen] = useState(false);
  const [fossaMessages, setFossaMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
     { role: 'assistant', content: 'Hello! I am Fossa, your Elite Legal AI. How can I optimize this contract for you?' }
  ]);
  const [fossaChatInput, setFossaChatInput] = useState('');
  const [fossaChatLoading, setFossaChatLoading] = useState(false);

  const [fossaInline, setFossaInline] = useState({isOpen: false, top: 0, left: 0, text: ''});
  const [fossaInlineInput, setFossaInlineInput] = useState('');
  const [fossaInlineLoading, setFossaInlineLoading] = useState(false);
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const [editorContextMenu, setEditorContextMenu] = useState<{isOpen: boolean, top: number, left: number} | null>(null);
  // Proofreading / Corrections
  const [correctionPopup, setCorrectionPopup] = useState<{isOpen: boolean, element: HTMLElement | null, suggestion: string, top: number, left: number}>({isOpen: false, element: null, suggestion: '', top: 0, left: 0});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
       const target = e.target as HTMLElement;
       
       if (target.classList.contains('fossa-correction')) {
           const rect = target.getBoundingClientRect();
           setCorrectionPopup({
               isOpen: true,
               element: target,
               suggestion: target.dataset.suggestion || 'Unknown Error',
               top: rect.bottom + window.scrollY + 8,
               left: rect.left + window.scrollX
           });
           setEditorContextMenu(null);
           setFossaInline(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
           return;
       }
       
       if (!target.closest('.fossa-correction-popup')) {
          setCorrectionPopup(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
       }
       
       if (!target.closest('.meta-inline-popup')) {
          setFossaInline(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
       }
       
       if (!target.closest('.folder-custom-dropdown-container')) {
          setIsFolderDropdownOpen(false);
       }
       
       setEditorContextMenu(null);
       setSavedRange(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const executeFossaInline = async () => {
     if(!fossaInlineInput.trim() || !savedRange) return;
     setFossaInlineLoading(true);
     try {
        const res = await apiClient.post('/ai/modify-text/', {
           text: fossaInline.text,
           instruction: fossaInlineInput
        });
        
        // Restore selection exactly where it was before writing
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(savedRange);
        
        document.execCommand('insertHTML', false, res.text);

        lastKnownContentRef.current = editorRef.current!.innerHTML;
        const aiHistory = {
           id: Date.now().toString(),
           time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
           type: 'ai' as const,
           description: `Fossa AI: ${fossaInlineInput}`,
           oldText: fossaInline.text,
           newText: res.text.replace(/<[^>]*>?/gm, '')
        };
        setEditHistory(prev => [aiHistory, ...prev]);
        if (id && id !== 'new') {
           apiClient.post(`/documents/${id}/history/`, aiHistory).catch(console.error);
        }
        
        setFossaInline({isOpen: false, top: 0, left: 0, text: ''});
        setFossaInlineInput('');
     } catch (err) {
        showAlert("Fossa Error", "Failed to process text replacement.");
     } finally {
        setFossaInlineLoading(false);
     }
  };

  const sendFossaMessage = async () => {
     if(!fossaChatInput.trim()) return;
     const newMsg = {role: 'user' as const, content: fossaChatInput};
     setFossaMessages(prev => [...prev, newMsg]);
     setFossaChatInput('');
     setFossaChatLoading(true);
     
     try {
       const res = await apiClient.post('/ai/chat/', {
          message: newMsg.content,
          context: editorRef.current?.innerText || '',
          history: fossaMessages
       });
       setFossaMessages(prev => [...prev, {role: 'assistant', content: res.message}]);
     } catch (err) {
       setFossaMessages(prev => [...prev, {role: 'assistant', content: 'Connection to Fossa Intelligence compromised. Retrying...'}]);
     } finally {
       setFossaChatLoading(false);
     }
  };


  // AI Metadata states for inline editing
  const [meta, setMeta] = useState({
    startDate: '2026-10-24',
    endDate: '2027-10-23',
    primaryParty: 'Acme Corp Ltd.',
    secondaryParty: 'Global Vendors LLC',
    summary: 'This is a standard vendor agreement outlining terms of software delivery for Q4 2026. Liability is capped at $500,000.',
    contractValueNumber: 50000,
    contractCurrency: 'USD',
    numberOfPhases: 3,
    phases: [
       { phaseName: 'Kickoff', amountNumber: 10000, amountCurrency: 'USD', tiedToDelivery: true },
       { phaseName: 'Beta Release', amountNumber: 20000, amountCurrency: 'USD', tiedToDelivery: true },
       { phaseName: 'Final Delivery', amountNumber: 20000, amountCurrency: 'USD', tiedToDelivery: true }
    ],
    invoices: [
       { id: 'INV-001', description: 'Advance Payment', amountNumber: 5000, amountCurrency: 'USD', dueDate: '2026-11-01', status: 'paid' },
       { id: 'INV-002', description: 'Milestone 1', amountNumber: 10000, amountCurrency: 'USD', dueDate: '2027-02-15', status: 'pending' },
       { id: 'INV-003', description: 'Final Delivery', amountNumber: 35000, amountCurrency: 'USD', dueDate: '2027-10-23', status: 'pending' }
    ],
    contractType: 'Unsigned Contract',
    executionTimeline: 'Starts upon signature',
    governingLaw: 'California, USA',
    liabilityCap: '$500,000 USD',
    autoRenewal: 'No, requires written notice',
    confidentialityDuration: '3 Years post-termination',
    documentType: 'Contract',
    isMyCompanyContract: true,
    paymentTerms: 'Net 30',
    terminationNoticePeriod: '30 Days',
    confidentialityIncluded: true,
    latePenalties: '',
    taxesIncluded: false,
    keyDeliverables: '',
    intellectualProperty: '',
    keyPointOfContact: ''
  });

  const handleDateChange = (field: 'startDate' | 'endDate', val: string) => {
     const newMeta = { ...meta, [field]: val };
     if (newMeta.startDate && newMeta.endDate) {
        const start = new Date(newMeta.startDate);
        const end = new Date(newMeta.endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
           const diffTime = end.getTime() - start.getTime();
           if (diffTime >= 0) {
               const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
               const months = Math.floor(diffDays / 30);
               const days = diffDays % 30;
               let timeline = '';
               if (months > 0) timeline += `${months} Month${months > 1 ? 's' : ''} `;
               if (days > 0) timeline += `${days} Day${days > 1 ? 's' : ''}`;
               if (timeline === '') timeline = 'Same Day';
               newMeta.executionTimeline = timeline.trim();
           } else {
               newMeta.executionTimeline = 'Invalid Date Range';
           }
        }
     }
     setMeta(newMeta);
  };

  // Workflow states
  const [workflowSequence, setWorkflowSequence] = useState<WorkflowStep[]>([]);
  const [newRole, setNewRole] = useState('');
  const [newName, setNewName] = useState('Approval Step');
  const [newAssignedUser, setNewAssignedUser] = useState<string>('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<number | null>(null);
  const [activeWorkflowOrder, setActiveWorkflowOrder] = useState<number>(0);
  const [selectedCommentVisibility, setSelectedCommentVisibility] = useState<string[]>([]);
  
  // Templates state
  const [workflowTemplates, setWorkflowTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Permissions state
  const [isPermissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [documentPermissions, setDocumentPermissions] = useState<any[]>([]);
  const [selectedPermUser, setSelectedPermUser] = useState('');
  const [selectedPermLevel, setSelectedPermLevel] = useState('view');
  


  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    if (fileInputRef.current) {
       fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await performUpload(file, false);
    }
  };

  const performUpload = async (file: File, force: boolean) => {
      setUploadedFileName(file.name);
      setState('SCANNING');
      
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('company_name', localStorage.getItem('myCompanyName') || '');
        if (force) {
           formData.append('force_upload', 'true');
        }
        
        const response = await apiClient.postFormData('/documents/upload/', formData);
        
        // Change URL natively to reflect the saved document ID
        if (response.document_id) {
          navigate(`/contract/${response.document_id}`, { replace: true });
        }

        if (response.ai_metadata) {
            const ai = response.ai_metadata;
            setMeta({
                startDate: ai.startDate || 'N/A',
                endDate: ai.endDate || 'N/A',
                primaryParty: ai.primaryParty || 'N/A',
                secondaryParty: ai.secondaryParty || 'N/A',
                summary: ai.summary || 'Summary not found.',
                contractValueNumber: ai.contractValueNumber || 0,
                contractCurrency: ai.contractCurrency || 'Unspecified',
                numberOfPhases: ai.numberOfPhases || 0,
                phases: Array.isArray(ai.phases) ? ai.phases : [],
                contractType: ai.contractType || 'Unsigned Contract',
                executionTimeline: ai.executionTimeline || 'N/A',
                governingLaw: ai.governingLaw || 'N/A',
                liabilityCap: ai.liabilityCap || 'N/A',
                autoRenewal: ai.autoRenewal?.toString() || 'N/A',
                confidentialityDuration: ai.confidentialityDuration || 'N/A',
                documentType: ai.documentType || 'Contract',
                isMyCompanyContract: ai.isMyCompanyContract ?? true,
                paymentTerms: ai.paymentTerms || 'N/A',
                terminationNoticePeriod: ai.terminationNoticePeriod || 'N/A',
                confidentialityIncluded: ai.confidentialityIncluded ?? false,
                latePenalties: ai.latePenalties || 'None',
                taxesIncluded: ai.taxesIncluded ?? false,
                keyDeliverables: ai.keyDeliverables || 'N/A',
                intellectualProperty: ai.intellectualProperty || 'N/A',
                keyPointOfContact: ai.keyPointOfContact || 'N/A',
                invoices: ai.invoices || []
            });
            
            // We store the cleanHtml in global window to inject it safely 
            // after the READY state renders the editorRef
            (window as any)._tempHtmlRender = ai.cleanHtml || '<p>No content processed.</p>';
        }
        
        setState('READY');
      } catch (err: any) {
        if (err.is_duplicate) {
           setState('UPLOAD');
           const confirmed = await showConfirm('Duplicate Detected', err.message || 'A document with this name already exists. Do you want to proceed?');
           if (confirmed) {
              await performUpload(file, true);
           }
           return;
        }
        showAlert("Error", err.message || 'AI processing failed or no text could be extracted.');
        // Reset state so user can try again
        setState('UPLOAD');
      }
  };

  // Inject the editor content when ready state hits from upload
  React.useEffect(() => {
     if (state === 'READY' && editorRef.current && (window as any)._tempHtmlRender) {
         editorRef.current.innerHTML = (window as any)._tempHtmlRender;
         initialContentRef.current = (window as any)._tempHtmlRender;
         // Clean up
         delete (window as any)._tempHtmlRender;
     }
  }, [state]);

  // Load existing document if ID is provided
  React.useEffect(() => {
    // Fetch all folders
    const fetchFolders = async () => {
      try {
        const data = await apiClient.get('/folders/');
        setAllFolders(data);
      } catch(err) { console.warn("Failed to fetch folders"); }
    };
    fetchFolders();

    if (id && id !== 'new' && id !== 'upload') {
      const fetchDocument = async () => {
        try {
          const data = await apiClient.get(`/documents/${id}/`);
          setUploadedFileName(data.title);
          setCurrentFolder(data.folder ? data.folder.toString() : '');
          setDocStatus(data.status || 'draft');
          setIsStarred(data.is_starred || false);
          
          if (data.content && editorRef.current) {
            editorRef.current.innerHTML = data.content;
            lastKnownContentRef.current = data.content;
            initialContentRef.current = data.content;
          }

          if (data.ai_metadata) {
             const ai = data.ai_metadata;
             setMeta({
                startDate: ai.startDate || 'N/A',
                endDate: ai.endDate || 'N/A',
                primaryParty: ai.primaryParty || 'N/A',
                secondaryParty: ai.secondaryParty || 'N/A',
                summary: ai.summary || 'Summary not found.',
                contractValueNumber: ai.contractValueNumber || 0,
                contractCurrency: ai.contractCurrency || 'Unspecified',
                numberOfPhases: ai.numberOfPhases || 0,
                phases: Array.isArray(ai.phases) ? ai.phases : [],
                contractType: ai.contractType || 'Unsigned Contract',
                executionTimeline: ai.executionTimeline || 'N/A',
                governingLaw: ai.governingLaw || 'N/A',
                liabilityCap: ai.liabilityCap || 'N/A',
                autoRenewal: ai.autoRenewal?.toString() || 'N/A',
                confidentialityDuration: ai.confidentialityDuration || 'N/A',
                documentType: ai.documentType || 'Contract',
                isMyCompanyContract: ai.isMyCompanyContract ?? true,
                paymentTerms: ai.paymentTerms || 'N/A',
                terminationNoticePeriod: ai.terminationNoticePeriod || 'N/A',
                confidentialityIncluded: ai.confidentialityIncluded ?? false,
                latePenalties: ai.latePenalties || 'None',
                taxesIncluded: ai.taxesIncluded ?? false,
                keyDeliverables: ai.keyDeliverables || 'N/A',
                intellectualProperty: ai.intellectualProperty || 'N/A',
                keyPointOfContact: ai.keyPointOfContact || 'N/A',
                invoices: ai.invoices || []
             });
             if (ai.comments) {
                 setComments(ai.comments);
             }
          }

          try {
            const histData = await apiClient.get(`/documents/${id}/history/`);
            if (histData && histData.length > 0) {
               setEditHistory(histData.map((h: any) => ({
                 id: h.id.toString(), time: h.time, type: h.type, description: h.description, user: h.user, oldText: h.oldText, newText: h.newText
               })));
            }
          } catch(err) { console.warn("No history found"); }

          try {
             const wfData = await apiClient.get(`/workflows/?document_id=${id}`);
             if (wfData && wfData.length > 0) {
                 const activeWf = wfData[0];
                 setActiveWorkflowId(activeWf.id);
                 setActiveWorkflowOrder(activeWf.current_step_order);
                 if (activeWf.steps) {
                     setWorkflowSequence(activeWf.steps.map((s: any) => ({
                         id: s.id,
                         role: s.role_required,
                         name: s.title,
                         assigned_user: s.assigned_user_details,
                         status: s.status,
                         comments: s.comments,
                         database_id: s.id,
                         order: s.order,
                         comment_visibility: s.comment_visibility || []
                     })));
                 }
             }
          } catch(err) { console.warn("No workflows found"); }

          try {
             const permData = await apiClient.get(`/documents/${id}/permissions/`);
             if (permData) setDocumentPermissions(permData);
          } catch(err) { console.warn("No permissions found"); }

        } catch (err) {
          console.error("Could not fetch document", err);
        }
      };
      fetchDocument();
    }
  }, [id]);

  React.useEffect(() => {
    // Fetch user saved signatures
    apiClient.get('/saved-signatures/').then(data => setSavedSignatures(data)).catch(() => {});
    // Fetch employees for workflow
    apiClient.get('/users/').then(data => setEmployees(data)).catch(() => {});
    // Fetch workflow templates
    apiClient.get('/workflow-templates/').then(data => setWorkflowTemplates(data)).catch(() => {});
  }, []);

  const handleUpdateFolder = async (value: string) => {
    let folderIdToUse = value;
    
    // Feature: Create New Folder from the fly
    if (value === 'CREATE_NEW') {
      const folderName = await showPrompt("Create Folder", "Enter new folder name:");
      if (!folderName || !folderName.trim()) return;
      try {
        const newFolder = await apiClient.post('/folders/', { name: folderName });
        setAllFolders([...allFolders, newFolder]);
        folderIdToUse = newFolder.id.toString();
      } catch(err) {
        showAlert("Error", "Failed to create folder");
        return;
      }
    }

    setCurrentFolder(folderIdToUse);
    
    if (id !== 'new') {
      try {
        await apiClient.patch(`/documents/${id}/`, {
          folder: folderIdToUse ? parseInt(folderIdToUse) : null
        });
      } catch(err) {
        console.error("Failed to map folder", err);
      }
    }
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm('Trash Document', 'Are you sure you want to move this contract to Trash?');
    if (confirmed) {
       try {
           await apiClient.delete(`/documents/${id}/`);
           navigate('/');
       } catch (err: any) {
           showAlert("Error", "Could not delete. The server threw an error: " + (err.message || 'Unknown error'));
       }
    }
  };

  const handleToggleStar = async () => {
    if (id && id !== 'new') {
      try {
        const newStarStatus = !isStarred;
        await apiClient.patch(`/documents/${id}/`, {
          is_starred: newStarStatus
        });
        setIsStarred(newStarStatus);
      } catch (err) {
        console.error("Failed to toggle star", err);
      }
    }
  };

  // Auto-Save feature
  const handleAutoSave = async () => {
    if (id === 'new' || !editorRef.current) return;
    try {
      const currentHtml = editorRef.current.innerHTML;
      // Removed manual tracking. Only patching to DB.
      lastKnownContentRef.current = currentHtml;

      await apiClient.patch(`/documents/${id}/`, {
        title: uploadedFileName,
        content: currentHtml,
        ai_metadata: { ...meta, comments }
      });
      // Optionally show a "Saved" indicator
    } catch (err) {
      console.warn("Autosave failed", err);
    }
  };

  // Automatically save when meta changes
  React.useEffect(() => {
    if (state === 'READY' && id && id !== 'new') {
       const timer = setTimeout(() => {
           handleAutoSave();
       }, 500); // 500ms debounce
       return () => clearTimeout(timer);
    }
  }, [meta]);

  const handleFormat = (e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault(); // SUPER IMPORTANT: Prevents stealing focus from the editor!
    if (docStatus === 'completed') return;
    
    // For highlight, we use backColor or hiliteColor depending on browser
    if (command === 'hiliteColor') {
      document.execCommand('backColor', false, value);
    } else {
      document.execCommand(command, false, value);
    }
    
    if (editorRef.current) editorRef.current.focus();
  };

  const handleDirection = (e: React.MouseEvent, dir: 'ltr' | 'rtl') => {
    e.preventDefault();
    if (docStatus === 'completed' || !editorRef.current) return;
    
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH'];
      const allEls = editorRef.current.querySelectorAll<HTMLElement>(blockTags.join(','));
      let blockFound = false;
      
      allEls.forEach(el => {
         if (range.intersectsNode(el)) {
             el.setAttribute('dir', dir);
             el.style.textAlign = dir === 'rtl' ? 'right' : 'left';
             blockFound = true;
         }
      });
      
      if (!blockFound) {
         document.execCommand('formatBlock', false, 'DIV');
         const newSel = window.getSelection();
         if (newSel && newSel.rangeCount > 0) {
             const newRange = newSel.getRangeAt(0);
             const newEls = editorRef.current.querySelectorAll<HTMLElement>(blockTags.join(','));
             newEls.forEach(el => {
                if (newRange.intersectsNode(el)) {
                   el.setAttribute('dir', dir);
                   el.style.textAlign = dir === 'rtl' ? 'right' : 'left';
                }
             });
         }
      }
    } else {
      editorRef.current.setAttribute('dir', dir);
      editorRef.current.style.textAlign = dir === 'rtl' ? 'right' : 'left';
    }
    
    if (editorRef.current) editorRef.current.focus();
    handleAutoSave();
  };

  const handleDuplicateAsClean = async () => {
    if (!editorRef.current) return;
    
    const confirmed = await showConfirm(
      "Duplicate Clean Copy",
      "This will create a new copy of this document with all signatures stripped out. Continue?"
    );
    
    if (confirmed) {
        const clone = editorRef.current!.cloneNode(true) as HTMLDivElement;
        
        // Remove client signature block and replace with placeholder
        const guestSig = clone.querySelector('#sig-target');
        if (guestSig) {
          guestSig.outerHTML = "<br/><br/><br/>[ CLIENT SIGNATURE GOES HERE ]<br/>";
        }

        // Remove internal signatures
        const internalSigs = clone.querySelectorAll('.internal-sig-target');
        internalSigs.forEach(sig => sig.remove());

        try {
          const payload: any = {
            title: `${uploadedFileName} (Clean Copy)`,
            content: clone.innerHTML,
            status: 'draft',
          };
          // Only attach folder if it's a valid integer
          if (currentFolder && !isNaN(parseInt(currentFolder))) {
             payload.folder = parseInt(currentFolder);
          }

          const resp = await apiClient.post('/documents/', payload);
          window.location.href = `/contract/${resp.id}`; // Hard redirect to clear all states
        } catch (err) {
          console.error("Failed to duplicate", err);
          showAlert("Operation Failed", "Failed to create a clean copy mechanism.");
        }
    }
  };

  const handleOpenComment = (e: React.MouseEvent) => {
    e.preventDefault();
    const sel = window.getSelection();
    if(!sel || sel.toString().trim() === '') {
        showAlert("Action Required", "Please highlight some text in the document first to add a comment!");
        return;
    }  // Highlight the text in yellow permanently
    document.execCommand('backColor', false, '#fef08a');
    setCommentDraftQuote(sel.toString());
    setCommentDraftText('');
    setCommentModalOpen(true);
  };

  const submitComment = async () => {
    if(!commentDraftText.trim()) return;
    const newComment = { id: Date.now().toString(), quote: commentDraftQuote, text: commentDraftText, author: 'You', time: 'Just now' };
    const updatedComments = [...comments, newComment];
    setComments(updatedComments);
    setCommentModalOpen(false);
    
    // Auto-save the comment
    if (id !== 'new') {
        try {
            await apiClient.patch(`/documents/${id}/`, {
                ai_metadata: { ...meta, comments: updatedComments }
            });
        } catch (e) {
            console.error("Failed to save comment", e);
        }
    }
  };

  const addWorkflowStep = async () => {
    if (!newAssignedUser) {
        showAlert("Error", "Please select an employee.");
        return;
    }
    const selectedUser = employees.find(e => e.id.toString() === newAssignedUser);
    
    // Create new step locally first
    const nextId = workflowSequence.length > 0 ? Math.max(...workflowSequence.map(s => s.id)) + 1 : 1;
    const newStep: WorkflowStep = { 
        id: nextId, 
        role: newRole || selectedUser?.profile?.role || 'Employee', 
        name: newName, 
        assigned_user: selectedUser,
        status: 'pending'
    };
    
    // If we have a document, we should save this to the backend
    if (id !== 'new') {
        try {
            let wfId = activeWorkflowId;
            if (!wfId) {
                // Create a workflow first
                const wfRes = await apiClient.post('/workflows/', {
                    name: `Approval Cycle for ${uploadedFileName}`,
                    document: id,
                    status: 'active'
                });
                wfId = wfRes.id;
                setActiveWorkflowId(wfId);
            }
            
            // Post the new step to the backend
            const stepRes = await apiClient.post(`/workflows/${wfId}/steps/`, {
                name: newName,
                role: newRole || selectedUser?.profile?.role || 'Employee',
                assigned_user_id: selectedUser?.id,
                order: nextId
            });
            newStep.database_id = stepRes.id;
            newStep.status = stepRes.status;
            
        } catch(err) {
            console.error(err);
            showAlert("Error", "Failed to save workflow step.");
        }
    }
    
    setWorkflowSequence([...workflowSequence, newStep]);
    setNewRole('');
    setNewName('Approval Step');
    setNewAssignedUser('');
    setWorkflowModalOpen(false);
  };

  const handleWorkflowAction = async (stepId: number, action: 'approve' | 'reject') => {
      try {
          await apiClient.post(`/workflows/steps/${stepId}/action/`, {
              action,
              comment: workflowComment
          });
          
          setWorkflowSequence(prev => prev.map(s => {
              if (s.database_id === stepId) {
                  return { ...s, status: action === 'approve' ? 'approved' : 'rejected', comments: workflowComment };
              }
              return s;
          }));
          
          showAlert("Success", `Workflow step ${action}d successfully.`);
          setWorkflowComment('');
          
      } catch(err) {
          console.error(err);
          showAlert("Error", "Failed to process workflow action.");
      }
  };

  const handleApplyTemplate = async () => {
      if (!selectedTemplateId) {
          showAlert("Error", "Please select a template.");
          return;
      }
      try {
          const res = await apiClient.post('/workflows/apply-template/', {
              document_id: id,
              template_id: selectedTemplateId
          });
          setActiveWorkflowId(res.id);
          setActiveWorkflowOrder(res.current_step_order || 0);
          if (res.steps) {
              setWorkflowSequence(res.steps.map((s: any) => ({
                  id: s.id,
                  role: s.role_required,
                  name: s.title,
                  assigned_user: s.assigned_user_details,
                  status: s.status,
                  comments: s.comments,
                  database_id: s.id,
                  order: s.order,
                  comment_visibility: s.comment_visibility || []
              })));
          }
          setWorkflowModalOpen(false);
          showAlert("Success", "Workflow template applied successfully.");
      } catch (err) {
          showAlert("Error", "Failed to apply template.");
      }
  };

  const handleSaveAsTemplate = async () => {
      if (workflowSequence.length === 0) {
          showAlert("Error", "No workflow steps to save.");
          return;
      }
      const templateName = await showPrompt("Save Template", "Enter a name for this workflow template:");
      if (!templateName) return;
      
      try {
          const res = await apiClient.post('/workflow-templates/', {
              name: templateName,
              steps: workflowSequence.map((s, i) => ({
                  name: s.name,
                  role: s.role,
                  assigned_user_id: s.assigned_user?.id,
                  order: i
              }))
          });
          setWorkflowTemplates([res, ...workflowTemplates]);
          showAlert("Success", "Workflow saved as a template.");
      } catch(err) {
          showAlert("Error", "Failed to save template.");
      }
  };

  const handleAddPermission = async () => {
      if (!selectedPermUser) return;
      try {
          const res = await apiClient.post(`/documents/${id}/permissions/`, {
              user_id: selectedPermUser,
              permission_level: selectedPermLevel
          });
          setDocumentPermissions(prev => {
              const filtered = prev.filter(p => p.user_details?.id !== res.user_details?.id);
              return [...filtered, res];
          });
          setSelectedPermUser('');
      } catch (err) {
          showAlert("Error", "Failed to update permissions.");
      }
  };

  const handleRemovePermission = async (userId: number) => {
      try {
          await apiClient.delete(`/documents/${id}/permissions/`, {
              body: JSON.stringify({ user_id: userId })
          });
          setDocumentPermissions(prev => prev.filter(p => p.user_details?.id !== userId));
      } catch (err) {
          showAlert("Error", "Failed to remove permission.");
      }
  };

  const handleGenerateSignatureLink = async () => {
    if (!signerName || id === 'new') return;
    setSignatureStatus('GENERATING');
    try {
      // Force a save to ensure any newly placed signature blocks are locked into the database
      if (editorRef.current) {
        await apiClient.patch(`/documents/${id}/`, {
          title: uploadedFileName,
          content: editorRef.current.innerHTML
        });
      }

      const resp = await apiClient.post('/signatures/generate_link/', {
        document_id: id,
        signer_name: signerName
      });
      const link = `${window.location.origin}/sign/${resp.token}`;
      setSignatureLink(link);
      setSignatureStatus('GENERATED');
    } catch (err) {
      showAlert("Error", "Failed to generate link.");
      setSignatureStatus('IDLE');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(signatureLink);
    showAlert("Success", 'Link copied to clipboard!');
  };

  const resetSignature = () => {
    setSignerName('');
    setSignatureLink('');
    setSignatureStatus('IDLE');
  };

  // == 1. UPLOAD STATE ==
  if (state === 'UPLOAD') {
    return (
      <div className="workspace-wrapper">
        <div className="workspace-top-bar">
           <button className="back-btn" onClick={handleExitWorkspace}>
             <ArrowLeft className="w-5 h-5 text-tertiary" />
           </button>
           <h2 className="font-semibold">New Contract Scan</h2>
           <div style={{width: 36}}></div>
        </div>

        <div className="upload-overlay">
          <input 
             type="file" 
             accept="application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
             ref={fileInputRef} 
             style={{ display: 'none' }} 
             onChange={handleFileChange}
          />
          <div className="upload-glass-box" onClick={handleUploadClick}>
            <div className="flex justify-center mb-4">
               <div className="ai-upload-icon-wrapper" style={{background: 'transparent', border: 'none', padding: 0}}>
                 <img src="/fossa_logo.png" alt="Fossa AI" style={{width: '80px', height: '80px', borderRadius: '16px', boxShadow: 'var(--shadow-md)'}} />
               </div>
            </div>
            <h2 className="text-3xl font-extrabold mb-3" style={{color: '#0d47a1', letterSpacing: '-0.5px'}}>Awaken Fossa Intelligence</h2>
            <p className="text-secondary mb-8 text-base">Drag & drop your PDF contract to trigger deep contextual extraction.</p>
            <div className="flex justify-center gap-3">
              <span className="ai-feature-pill"><Cpu className="w-4 h-4"/> Multi-Modal OCR</span>
              <span className="ai-feature-pill"><PenTool className="w-4 h-4"/> Instant Redlining</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // == 2. SCANNING STATE ==
  if (state === 'SCANNING') {
    return (
      <div className="workspace-wrapper" style={{position: 'relative', overflow: 'hidden'}}>
        <div className="fossa-scanner-overlay">
          <div className="scanning-particles-bg"></div>
          
          <div className="fossa-cyber-box" style={{textAlign: 'center', width: '680px', maxWidth: '95%'}}>
             
             <div className="fossa-intake-system">
                
                {/* Left: Files Flying In */}
                <div className="incoming-files-stream">
                   <div className="fly-doc fdoc-1"><FileText className="w-10 h-10" style={{color: '#0f172a'}}/></div>
                   <div className="fly-doc fdoc-2"><FileText className="w-10 h-10" style={{color: '#0f172a'}}/></div>
                   <div className="fly-doc fdoc-3"><FileText className="w-10 h-10" style={{color: '#0f172a'}}/></div>
                </div>

                {/* Center: Fossa Head */}
                <div className="fossa-brain-core">
                   <div className="brain-glow-ring"></div>
                   <img src="/fossa_logo.png" alt="Fossa Brain" className="fossa-brain-img" />
                </div>

                {/* Right: AI Data Out */}
                <div className="outgoing-data-stream">
                   <div className="ai-chunk c-1">{"[ENTITY: VENDOR LLC] -> SECURE"}</div>
                   <div className="ai-chunk c-2">{"{ RISK_SCORE: LOW }"}</div>
                   <div className="ai-chunk c-3">{"EXTRACTED_CLAUSES(4)"}</div>
                </div>

             </div>

             <h2 className="scan-title">Fossa Neural Engine Active</h2>
             <p className="scan-subtitle">
                <span style={{color: '#3b82f6'}}>&gt;</span> EXTRACTING_ENTITIES_AND_CLAUSES<span className="scan-blinking-dot">_</span>
             </p>

             <div className="scan-progress-bar">
               <div className="scan-progress-fill"></div>
             </div>
          </div>

        </div>
      </div>
    );
  }

  // == 3. READY STATE (KILLER UI) ==
  return (
    <div className="workspace-wrapper animate-fade-in">

      {meta.isMyCompanyContract === false && (
        <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 50 }}>
           <ShieldCheck className="w-5 h-5 text-red-500" />
           <div>
             <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#991b1b' }}>Warning: Unassociated Document</h4>
             <p style={{ margin: 0, fontSize: '13px', color: '#b91c1c' }}>This document does not explicitly list your company as a primary or secondary party. It will not be calculated in your core financial metrics.</p>
           </div>
        </div>
      )}

      {/* TOP HEADER - GOOGLE DOCS STYLE */}
      <header className="workspace-top-bar">
        <div className="workspace-title-area">
           <button className="back-btn" onClick={handleExitWorkspace}>
             <ArrowLeft className="w-5 h-5 text-tertiary" />
           </button>
           <div className="doc-info-col" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px' }}>
             <div className="doc-title-row" style={{ gap: '4px' }}>
               <input 
                 type="text" 
                 className="doc-title-input" 
                 value={uploadedFileName} 
                 onChange={(e) => setUploadedFileName(e.target.value)}
                 onBlur={() => {
                   if (id && id !== 'new') {
                     apiClient.patch(`/documents/${id}/`, { title: uploadedFileName }).catch(console.warn);
                   }
                 }}
                 style={{fontSize: '20px', fontWeight: 700, padding: 0, width: 'auto', minWidth: '250px'}}
               />
               <button 
                 title={isStarred ? "Unstar" : "Star this document"}
                 onClick={handleToggleStar}
                 style={{background: 'transparent', border: 'none', padding: 0, display: 'flex', alignItems: 'center'}}
               >
                 <Star 
                   className="w-5 h-5 cursor-pointer transition-colors duration-200" 
                   style={{
                     fill: isStarred ? '#eab308' : 'none', 
                     color: isStarred ? '#eab308' : '#94a3b8'
                   }} 
                 />
               </button>
               <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: meta.documentType === 'Proposal' ? '#fdf4ff' : '#eef2ff',
                    color: meta.documentType === 'Proposal' ? '#a21caf' : '#4f46e5',
                    marginLeft: '8px',
                    border: `1px solid ${meta.documentType === 'Proposal' ? '#f5d0fe' : '#c7d2fe'}`,
                    textTransform: 'uppercase'
                }}>
                   {meta.documentType || 'Contract'}
                </span>
             </div>
             
             {/* Divider */}
             <div style={{ height: '24px', width: '1px', background: '#e2e8f0' }}></div>

             <div className="flex items-center gap-4">
               <div className="folder-custom-dropdown-container" style={{ position: 'relative' }}>
                 <button 
                   onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
                   style={{
                     display: 'flex', alignItems: 'center', gap: '6px',
                     background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', 
                     padding: '4px 8px', fontSize: '12px', color: '#475569', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s'
                   }}
                   onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                   onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
                 >
                   <Folder className="w-3.5 h-3.5 text-slate-500" />
                   {currentFolder ? (allFolders.find(f => String(f.id) === currentFolder)?.name || 'Unknown Folder') : 'No Folder (Loose)'}
                   <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                 </button>
                 
                 {isFolderDropdownOpen && (
                   <div style={{
                     position: 'absolute', top: 'calc(100% + 8px)', left: 0,
                     background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', 
                     boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                     minWidth: '240px', zIndex: 9999, overflow: 'hidden'
                   }}>
                     <div style={{ padding: '4px', borderBottom: '1px solid #f1f5f9' }}>
                       <button 
                         onClick={() => { handleUpdateFolder(''); setIsFolderDropdownOpen(false); }}
                         style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', color: '#475569', background: currentFolder === '' ? '#f8fafc' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px', fontWeight: currentFolder === '' ? 600 : 400 }}
                         onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                         onMouseOut={e => e.currentTarget.style.background = currentFolder === '' ? '#f8fafc' : 'transparent'}
                       >
                         <Folder className="w-4 h-4 inline mr-2 text-slate-400" />
                         No Folder (Loose)
                       </button>
                     </div>
                     <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '4px' }}>
                       {allFolders.map(f => (
                         <button 
                           key={f.id}
                           onClick={() => { handleUpdateFolder(String(f.id)); setIsFolderDropdownOpen(false); }}
                           style={{ display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', color: '#334155', background: currentFolder === String(f.id) ? '#eff6ff' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px', fontWeight: currentFolder === String(f.id) ? 600 : 400 }}
                           onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                           onMouseOut={e => e.currentTarget.style.background = currentFolder === String(f.id) ? '#eff6ff' : 'transparent'}
                         >
                           <Folder className="w-4 h-4 inline mr-2 text-blue-500" style={{ fill: currentFolder === String(f.id) ? '#bfdbfe' : 'transparent' }} />
                           {f.name}
                         </button>
                       ))}
                     </div>
                     <div style={{ padding: '4px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                       <button 
                         onClick={() => { handleUpdateFolder('CREATE_NEW'); setIsFolderDropdownOpen(false); }}
                         style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '8px 12px', fontSize: '13px', color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '8px', fontWeight: 600 }}
                         onMouseOver={e => e.currentTarget.style.background = '#eff6ff'}
                         onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                       >
                         <Plus className="w-4 h-4 mr-2" /> Create New Folder
                       </button>
                     </div>
                   </div>
                 )}
               </div>
               <div className="text-xs text-muted" style={{ fontWeight: 500, color: '#94a3b8' }}>Last saved just now</div>
             </div>
           </div>
        </div>
        <div className="workspace-actions">
           <button className="btn btn-ghost" onClick={() => setPermissionsModalOpen(true)} title="Share & Permissions">
             <Share2 className="w-5 h-5 text-tertiary"/>
           </button>
           <button className="btn btn-ghost" onClick={handleDelete} title="Delete Contract">
             <Trash2 className="w-5 h-5 text-danger" style={{color: '#ef4444'}}/>
           </button>
           <button className="btn btn-ghost"><MessageSquare className="w-5 h-5 text-tertiary"/></button>
           <button className="btn btn-primary" onClick={() => setFossaSidebarOpen(true)}>
              <Sparkles className="w-4 h-4 text-white" style={{filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.8))'}} />
              <span className="font-bold text-white tracking-wide" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>Ask Fossa</span>
           </button>
        </div>
      </header>

      {/* MAIN LAYOUT: 3 COLUMNS */}
      <div className="workspace-main">
        
        {/* LEFT DYNAMIC RAIL */}
        <nav className="dynamic-rail left-rail">
           <button className={`rail-btn ${activeLeftPanel === 'metadata' ? 'active' : ''}`} onClick={() => setActiveLeftPanel(activeLeftPanel === 'metadata' ? null : 'metadata')}>
              <Cpu className="w-5 h-5"/>
              <span className="rail-btn-label">AI Metadata & Class</span>
           </button>
           <button className={`rail-btn ${activeLeftPanel === 'parties' ? 'active' : ''}`} onClick={() => setActiveLeftPanel(activeLeftPanel === 'parties' ? null : 'parties')}>
              <Users className="w-5 h-5"/>
              <span className="rail-btn-label">Parties & Dates</span>
           </button>
           <button className={`rail-btn ${activeLeftPanel === 'financials' ? 'active' : ''}`} onClick={() => setActiveLeftPanel(activeLeftPanel === 'financials' ? null : 'financials')}>
              <Activity className="w-5 h-5"/>
              <span className="rail-btn-label">Financials</span>
           </button>
           <button className={`rail-btn ${activeLeftPanel === 'risk' ? 'active' : ''}`} onClick={() => setActiveLeftPanel(activeLeftPanel === 'risk' ? null : 'risk')}>
              <ShieldCheck className="w-5 h-5"/>
              <span className="rail-btn-label">Risk Analytics</span>
           </button>
           <button className={`rail-btn ${activeLeftPanel === 'summary' ? 'active' : ''}`} onClick={() => setActiveLeftPanel(activeLeftPanel === 'summary' ? null : 'summary')}>
              <FileText className="w-5 h-5"/>
              <span className="rail-btn-label">AI Summary</span>
           </button>
        </nav>

        {/* LEFT SLIDE-OVER PANEL */}
        <div className={`slide-over-panel left-panel ${activeLeftPanel ? 'open' : ''}`}>
           <button className="panel-close-btn" onClick={() => setActiveLeftPanel(null)}><X className="w-5 h-5"/></button>
           
           {activeLeftPanel === 'metadata' && (
             <div className="slide-section">
                <h4 className="meta-title" style={{ color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                   <Cpu className="w-4 h-4" /> AI Metadata & Status
                </h4>
                {id !== 'new' && (
                  <div className="status-tracker-premium" style={{marginTop: '8px', padding: '16px', borderRadius: '16px'}}>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-5 h-5 text-warning" style={{color: '#f57c00'}}/>
                      <span className="text-xs font-bold" style={{color: '#f57c00', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Status Tracker</span>
                    </div>
                    <p className="text-sm font-bold" style={{color: '#333'}}>Awaiting Finance Approval</p>
                    <p className="text-xs text-muted mt-1">Pending action from John Doe since Oct 25.</p>
                  </div>
                )}
                <div className="meta-field-group" style={{marginTop: '16px'}}>
                   <span className="meta-label">Contract Class</span>
                   <select 
                      className="ghost-select" 
                      value={meta.contractType} 
                      onChange={async (e) => {
                         const newType = e.target.value;
                         setMeta({...meta, contractType: newType});
                         
                         // Automatically transition docStatus based on contract class
                         if (newType === 'Signed Contract') {
                            setDocStatus('completed');
                            if (id !== 'new') {
                               await apiClient.patch(`/documents/${id}/`, { status: 'completed' }).catch(console.warn);
                            }
                         } else {
                            setDocStatus('in_review');
                            if (id !== 'new') {
                               await apiClient.patch(`/documents/${id}/`, { status: 'in_review' }).catch(console.warn);
                            }
                         }
                      }} 
                      style={{width: '100%', marginTop: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}
                   >
                      <option value="Proposal">Proposal 📄</option>
                      <option value="Unsigned Contract">Unsigned Contract ⏳</option>
                      <option value="Signed Contract">Signed Contract ✍️</option>
                   </select>
                </div>
             </div>
           )}

           {activeLeftPanel === 'parties' && (
             <div className="slide-section">
                <h4 className="meta-title" style={{ color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                   <Users className="w-4 h-4" /> Parties & Key Dates
                </h4>
                <div className="meta-field-group mt-2">
                   <span className="meta-label">Primary Party</span>
                   <input className="meta-input ghost-input" value={meta.primaryParty} onChange={e => setMeta({...meta, primaryParty: e.target.value})} style={{textAlign: 'left', width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px'}} />
                </div>
                <div className="meta-field-group">
                   <span className="meta-label">Secondary Party</span>
                   <input className="meta-input ghost-input" value={meta.secondaryParty} onChange={e => setMeta({...meta, secondaryParty: e.target.value})} style={{textAlign: 'left', width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px'}} />
                </div>
                <div className="meta-field-group mt-2">
                   <span className="meta-label">Key Point of Contact</span>
                   <input className="meta-input ghost-input" value={meta.keyPointOfContact || ''} onChange={e => setMeta({...meta, keyPointOfContact: e.target.value})} style={{textAlign: 'left', width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px'}} placeholder="Name, Email, or Role" />
                </div>
                <div className="grid-2-col mt-4">
                    <div className="meta-field-group">
                       <span className="meta-label">Start Date</span>
                       <input type="date" className="meta-input ghost-input" value={meta.startDate} onChange={e => handleDateChange('startDate', e.target.value)} style={{textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px'}} />
                    </div>
                    <div className="meta-field-group">
                       <span className="meta-label">End Date</span>
                       <input type="date" className="meta-input ghost-input" value={meta.endDate} onChange={e => handleDateChange('endDate', e.target.value)} style={{textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px'}} />
                    </div>
                </div>
                <div className="meta-field-group mt-2">
                   <span className="meta-label">Execution Timeline</span>
                   <input className="meta-input ghost-input" value={meta.executionTimeline} onChange={e => setMeta({...meta, executionTimeline: e.target.value})} style={{textAlign: 'left', width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px'}} />
                </div>
             </div>
           )}

           {activeLeftPanel === 'financials' && (
             <div className="slide-section">
                <h4 className="meta-title" style={{color: '#10b981', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                   <Activity className="w-4 h-4"/> Financials & Phases
                </h4>
                <div className="meta-field-group mt-2">
                   <span className="meta-label">Contract Value</span>
                   <div style={{ display: 'flex', gap: '8px', width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '8px' }}>
                      <input type="number" className="meta-input ghost-input" style={{ flex: 1, fontSize: '15px', color: '#166534' }} placeholder="e.g. 50000" value={meta.contractValueNumber === 0 ? '' : meta.contractValueNumber} onChange={e => setMeta({...meta, contractValueNumber: Number(e.target.value) || 0})} />
                      <select className="ghost-select" style={{ width: '80px', color: '#166534' }} value={meta.contractCurrency} onChange={e => setMeta({...meta, contractCurrency: e.target.value})}>
                         <option value="USD">USD</option><option value="JOD">JOD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="SAR">SAR</option><option value="AED">AED</option>
                      </select>
                   </div>
                </div>
                <div className="meta-field-group mt-2">
                    <span className="meta-label">Payment Terms</span>
                    <input className="meta-input ghost-input" value={meta.paymentTerms || ''} onChange={e => setMeta({...meta, paymentTerms: e.target.value})} style={{textAlign: 'left', width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px'}} placeholder="e.g. Net 30" />
                 </div>
                 <div className="meta-field-group mt-2">
                    <span className="meta-label">Late Penalties</span>
                    <input className="meta-input ghost-input" value={meta.latePenalties || ''} onChange={e => setMeta({...meta, latePenalties: e.target.value})} style={{textAlign: 'left', width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px'}} placeholder="e.g. 1% per week" />
                 </div>
                 <div className="meta-field-group mt-2 mb-2">
                    <span className="meta-label">Taxes Included</span>
                    <div style={{ padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                       <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                          <input type="checkbox" checked={meta.taxesIncluded || false} onChange={e => setMeta({...meta, taxesIncluded: e.target.checked})} style={{ accentColor: '#10b981', width: '16px', height: '16px' }} />
                          {meta.taxesIncluded ? 'Yes, Inclusive' : 'No, Exclusive'}
                       </label>
                    </div>
                 </div>
                 <div className="meta-field-group">
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span className="meta-label" style={{ marginBottom: 0 }}>Project Phases</span>
                      <button 
                         className="btn btn-ghost" 
                         style={{ padding: '4px 8px', fontSize: '11px', color: '#3b82f6', background: '#eff6ff', borderRadius: '4px', border: '1px solid #bfdbfe' }}
                         onClick={() => {
                            const newPhases = [...(meta.phases || [])];
                            newPhases.push({ phaseName: `Phase ${newPhases.length + 1}`, amountNumber: 0, amountCurrency: 'USD', tiedToDelivery: false });
                            setMeta({...meta, phases: newPhases, numberOfPhases: newPhases.length});
                         }}
                      >
                         <Plus className="w-3 h-3 inline mr-1" /> Add Phase
                      </button>
                   </div>
                </div>
                
                {meta.phases && meta.phases.length > 0 ? (
                   <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {meta.phases.map((phase, idx) => (
                         <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div style={{flex: 1, marginRight: '8px'}}>
                                   <input 
                                     type="text"
                                     value={phase.phaseName || `Phase ${idx + 1}`}
                                     onChange={(e) => {
                                        const newPhases = [...meta.phases];
                                        newPhases[idx].phaseName = e.target.value;
                                        setMeta({...meta, phases: newPhases});
                                     }}
                                     style={{ fontSize: '12px', color: '#334155', fontWeight: 600, background: 'transparent', border: '1px dashed transparent', outline: 'none', width: '100%', padding: '2px 4px', margin: '-2px -4px', borderRadius: '4px' }}
                                     onFocus={(e) => e.target.style.border = '1px dashed #cbd5e1'}
                                     onBlur={(e) => e.target.style.border = '1px dashed transparent'}
                                     placeholder={`Phase ${idx + 1} Name`}
                                   />
                                </div>
                                <button 
                                  style={{ background: 'white', border: '1px solid #fee2e2', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                                  onMouseOver={(e) => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                                  onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#fee2e2'; }}
                                  onClick={() => {
                                     const newPhases = meta.phases.filter((_, i) => i !== idx);
                                     setMeta({...meta, phases: newPhases, numberOfPhases: newPhases.length});
                                  }}
                                  title="Delete Phase"
                                >
                                   <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', background: '#dcfce7', padding: '6px 8px', borderRadius: '6px', border: '1px solid #bbf7d0', alignItems: 'center' }}>
                               <input type="number" value={phase.amountNumber === 0 ? '' : phase.amountNumber} onChange={(e) => { const newPhases = [...meta.phases]; newPhases[idx].amountNumber = Number(e.target.value) || 0; setMeta({...meta, phases: newPhases}); }} className="meta-input" placeholder="Amount (0.00)" style={{ flex: 1, padding: '2px', background: 'transparent', textAlign: 'left', color: '#166534', fontWeight: 700, fontSize: '13px', border: 'none', outline: 'none' }} />
                               <select value={phase.amountCurrency || 'USD'} onChange={(e) => { const newPhases = [...meta.phases]; newPhases[idx].amountCurrency = e.target.value; setMeta({...meta, phases: newPhases}); }} className="meta-input" style={{ width: '60px', padding: '2px', background: 'transparent', color: '#166534', fontWeight: 700, fontSize: '12px', border: 'none', outline: 'none' }}>
                                  <option value="USD">USD</option><option value="JOD">JOD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="SAR">SAR</option><option value="AED">AED</option>
                               </select>
                            </div>
                            <label style={{ fontSize: '11px', color: phase.tiedToDelivery ? '#3b82f6' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', cursor: 'pointer', fontWeight: 500 }}>
                               <input 
                                 type="checkbox" 
                                 checked={phase.tiedToDelivery || false}
                                 onChange={(e) => {
                                    const newPhases = [...meta.phases];
                                    newPhases[idx].tiedToDelivery = e.target.checked;
                                    setMeta({...meta, phases: newPhases});
                                 }}
                                 style={{ accentColor: '#3b82f6', width: '14px', height: '14px' }}
                               />
                               {phase.tiedToDelivery ? 'Tied to Delivery ✓' : 'Not linked to delivery'}
                            </label>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '16px', textAlign: 'center', marginTop: '4px' }}>
                      <p style={{ fontSize: '12px', color: '#64748b' }}>No phases added yet. Add a phase to breakdown the contract value.</p>
                   </div>
                )}
             </div>
           )}

           {activeLeftPanel === 'risk' && (
             <div className="slide-section status-tracker-premium" style={{border: 'none', background: 'transparent', padding: 0}}>
                <h4 className="meta-title" style={{color: '#e11d48', borderBottom: '1px solid rgba(244, 63, 94, 0.2)', paddingBottom: '12px' }}>
                   <ShieldCheck className="w-4 h-4"/> Risk & Compliance Analytics
                </h4>
                <div className="meta-field-group mt-2">
                   <span className="meta-label">Governing Law</span>
                   <input className="meta-input ghost-input" value={meta.governingLaw} onChange={e => setMeta({...meta, governingLaw: e.target.value})} style={{textAlign: 'left', width: '100%', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '10px'}} />
                </div>
                <div className="meta-field-group mt-2">
                   <span className="meta-label">Intellectual Property</span>
                   <input className="meta-input ghost-input" value={meta.intellectualProperty || ''} onChange={e => setMeta({...meta, intellectualProperty: e.target.value})} style={{textAlign: 'left', width: '100%', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '10px'}} placeholder="Who owns the IP?" />
                </div>
                <div className="meta-field-group">
                   <span className="meta-label">Liability Cap</span>
                   <input className="meta-input ghost-input" style={{ color: '#be123c', textAlign: 'left', width: '100%', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '10px' }} value={meta.liabilityCap} onChange={e => setMeta({...meta, liabilityCap: e.target.value})} />
                </div>
                <div className="grid-2-col mt-4">
                    <div className="meta-field-group">
                       <span className="meta-label">Auto Renewal</span>
                       <input className="meta-input ghost-input" value={meta.autoRenewal || ''} onChange={e => setMeta({...meta, autoRenewal: e.target.value})} style={{textAlign: 'left', width: '100%', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '10px'}} />
                    </div>
                    <div className="meta-field-group">
                       <span className="meta-label">NDA Duration</span>
                       <input className="meta-input ghost-input" value={meta.confidentialityDuration || ''} onChange={e => setMeta({...meta, confidentialityDuration: e.target.value})} style={{textAlign: 'left', width: '100%', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '10px'}} />
                    </div>
                </div>
                <div className="grid-2-col mt-4">
                    <div className="meta-field-group">
                       <span className="meta-label">Termination Notice</span>
                       <input className="meta-input ghost-input" value={meta.terminationNoticePeriod || ''} onChange={e => setMeta({...meta, terminationNoticePeriod: e.target.value})} style={{textAlign: 'left', width: '100%', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '10px'}} placeholder="e.g. 30 Days" />
                    </div>
                    <div className="meta-field-group">
                       <span className="meta-label">Confidentiality Included</span>
                       <div style={{ padding: '10px', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(244, 63, 94, 0.2)', borderRadius: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#be123c' }}>
                             <input type="checkbox" checked={meta.confidentialityIncluded || false} onChange={e => setMeta({...meta, confidentialityIncluded: e.target.checked})} style={{ accentColor: '#e11d48', width: '16px', height: '16px' }} />
                             {meta.confidentialityIncluded ? 'Yes, Included' : 'Not Included'}
                          </label>
                       </div>
                    </div>
                </div>
             </div>
           )}

           {activeLeftPanel === 'summary' && (
             <div className="slide-section">
                <h4 className="meta-title" style={{color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                   <FileText className="w-4 h-4"/> AI Summary
                </h4>
                <div className="meta-field-group mt-2 mb-4">
                   <span className="meta-label">Key Deliverables</span>
                   <textarea className="meta-textarea ghost-input" value={meta.keyDeliverables || ''} onChange={e => setMeta({...meta, keyDeliverables: e.target.value})} rows={3} style={{textAlign: 'left', width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', fontSize: '13px'}} placeholder="Main deliverables extracted by AI..." />
                </div>
                <textarea 
                  className="meta-textarea ghost-input mt-2" 
                  value={meta.summary} 
                  onChange={e => setMeta({...meta, summary: e.target.value})}
                  rows={8}
                  style={{textAlign: 'left', width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '12px', fontSize: '14px'}}
                />
             </div>
           )}
        </div>

        {/* CENTER PANEL: Document Editor Canvas */}
        <main className="editor-zone doc-canvas-container">
          
          <div className="floating-toolbar" style={{ opacity: docStatus === 'completed' ? 0.5 : 1, pointerEvents: docStatus === 'completed' ? 'none' : 'auto' }}>
             <button className="format-btn" onMouseDown={(e) => handleFormat(e, 'undo')} title="Undo"><CornerUpLeft className="w-4 h-4"/></button>
             <button className="format-btn" onMouseDown={(e) => handleFormat(e, 'redo')} title="Redo"><CornerUpRight className="w-4 h-4"/></button>
             <button className="format-btn" title="Print" onMouseDown={(e) => e.preventDefault()}><FileText className="w-4 h-4"/></button>
             <div className="toolbar-divider"></div>
             
             <select className="toolbar-select" style={{width: '70px'}} onMouseDown={(e) => e.stopPropagation()}>
               <option>100%</option>
               <option>150%</option>
               <option>75%</option>
             </select>
             <div className="toolbar-divider"></div>
             
             <span className="text-sm font-semibold text-secondary mx-2">Normal text</span>
             <div className="toolbar-divider"></div>
             
             <select className="toolbar-select" style={{width: '110px', fontWeight: 500}} onMouseDown={(e) => e.stopPropagation()}>
               <option>Inter</option>
               <option>Arial</option>
               <option>Times New Roman</option>
             </select>
             <div className="toolbar-divider"></div>
             
             <button className="format-btn" title="Decrease Size" onMouseDown={(e) => e.preventDefault()}>-</button>
             <span className="text-sm font-medium w-6 text-center">11</span>
             <button className="format-btn" title="Increase Size" onMouseDown={(e) => e.preventDefault()}>+</button>
             <div className="toolbar-divider"></div>
             
             <button className="format-btn" onMouseDown={(e) => handleFormat(e, 'bold')} title="Bold (Ctrl+B)"><Bold className="w-4 h-4"/></button>
             <button className="format-btn" onMouseDown={(e) => handleFormat(e, 'italic')} title="Italic (Ctrl+I)"><Italic className="w-4 h-4"/></button>
             <button className="format-btn" onMouseDown={(e) => handleFormat(e, 'underline')} title="Underline (Ctrl+U)"><Underline className="w-4 h-4"/></button>
             <button className="format-btn" title="Text Color" onMouseDown={(e) => handleFormat(e, 'foreColor', '#0d47a1')}><Type className="w-4 h-4 text-primary"/></button>
             <button className="format-btn" title="Highlight Color" onMouseDown={(e) => handleFormat(e, 'hiliteColor', '#fef08a')}><PaintBucket className="w-4 h-4"/></button>
             <div className="toolbar-divider"></div>
             
             <button className="format-btn" title="Add Link" onMouseDown={(e) => e.preventDefault()}><Link2 className="w-4 h-4"/></button>
             <button className="format-btn bg-primary-light text-primary" style={{borderRadius: '4px'}} title="Add Comment" onMouseDown={handleOpenComment}><MessageSquare className="w-4 h-4"/></button>
             <button className="format-btn" title="Insert Image" onMouseDown={(e) => e.preventDefault()}><ImageIcon className="w-4 h-4"/></button>
             <div className="toolbar-divider"></div>
             
             <button className="format-btn text-warning" title="Place Client Signature Block" 
               onMouseDown={(e) => {
                 e.preventDefault();
                 if (editorRef.current && editorRef.current.innerHTML.includes('id="sig-target"')) {
                   showAlert("Action Denied", "A client signature block already exists in this document. You can only place one per document.");
                   return;
                 }
                 const blockHTML = '<div id="sig-target" style="border: 2px dashed #cbd5e1; padding: 20px; text-align: center; margin: 20px 0; background: #f8fafc; color: #64748b; font-weight: bold; border-radius: 8px;">[ CLIENT SIGNATURE GOES HERE ]</div><br/>';
                 document.execCommand('insertHTML', false, blockHTML);
               }}>
               <PenTool className="w-4 h-4"/>
             </button>

             <button className="format-btn text-success" title="Place My Internal Signature (Authorized Sender)" 
               onMouseDown={(e) => {
                 e.preventDefault();
                 setInternalSignModalOpen(true);
               }}>
               <CheckCircle2 className="w-4 h-4"/>
             </button>
             <div className="toolbar-divider"></div>
             
             <button className="format-btn" onMouseDown={(e) => handleFormat(e, 'justifyLeft')} title="Align Left"><AlignLeft className="w-4 h-4"/></button>
             <button className="format-btn" onMouseDown={(e) => handleFormat(e, 'justifyCenter')} title="Align Center"><AlignCenter className="w-4 h-4"/></button>
             <button className="format-btn" onMouseDown={(e) => handleFormat(e, 'justifyRight')} title="Align Right"><AlignRight className="w-4 h-4"/></button>
             <div className="toolbar-divider"></div>
             <button className="format-btn" style={{ fontWeight: 600, fontSize: '11px', padding: '0 6px' }} onMouseDown={(e) => handleDirection(e, 'ltr')} title="Left-to-Right (English)">LTR</button>
             <button className="format-btn" style={{ fontWeight: 600, fontSize: '11px', padding: '0 6px' }} onMouseDown={(e) => handleDirection(e, 'rtl')} title="Right-to-Left (Arabic)">RTL</button>
          </div>

          <div 
            ref={editorRef}
            className="editor-paper"
            contentEditable={docStatus !== 'completed'} 
            suppressContentEditableWarning
            dir="auto"
            onBlur={handleAutoSave}
            onContextMenu={(e) => {
               if (docStatus === 'completed') return;
               const sel = window.getSelection();
               if (sel && sel.toString().trim() !== '') {
                  e.preventDefault();
                  const range = sel.getRangeAt(0);
                  setSavedRange(range.cloneRange());
                  
                  setEditorContextMenu({
                     isOpen: true,
                     top: e.pageY,
                     left: e.pageX
                  });
               }
            }}
            style={{ opacity: docStatus === 'completed' ? 0.9 : 1, pointerEvents: docStatus === 'completed' ? 'none' : 'auto', minHeight: '800px' }}
          >
            {id !== 'new' ? (
              <>
                <h1 style={{textAlign: 'center', marginBottom: '24px'}}>SOFTWARE VENDOR AGREEMENT</h1>
                <p><strong>This Agreement</strong> is entered into as of October 24, 2026, by and between Acme Corp Ltd. ("Client") and Global Vendors LLC ("Vendor").</p>
                <br/>
                <h3>1. Services Provided</h3>
                <p>Vendor agrees to provide software development services as outlined in Exhibit A (the "Services"). Vendor shall perform the Services in a professional manner, maintaining the highest industry standards.</p>
                <br/>
                <h3>2. Payment Terms</h3>
                <p>Client agrees to pay Vendor according to the schedule set forth in Exhibit B. Invoices are payable within net 30 days of receipt.</p>
                <br/>
                <h3>3. Confidentiality</h3>
                <p>Both parties agree that during the course of this Agreement, they may receive confidential information. Such information shall not be disclosed to any third party without written prior consent.</p>
                <br/>
                <p><em>IN WITNESS WHEREOF, the parties hereto have executed this Agreement as of the date first above written.</em></p>
                <br/><br/>
                <p>_________________________<br/><strong>Client Signature</strong></p>
                <br/>
                <p>_________________________<br/><strong>Vendor Signature</strong></p>
              </>
            ) : <p><br/></p>}
          </div>
        </main>

        {/* RIGHT SIDEBAR: Actions & Approvals */}
        {/* RIGHT DYNAMIC RAIL */}
        <nav className="dynamic-rail right-rail">
           <button className={`rail-btn ${activeRightPanel === 'workflow' ? 'active' : ''}`} onClick={() => setActiveRightPanel(activeRightPanel === 'workflow' ? null : 'workflow')}>
              <GitMerge className="w-5 h-5"/>
              <span className="rail-btn-label">Approval Map</span>
           </button>
           <button className={`rail-btn ${activeRightPanel === 'comments' ? 'active' : ''}`} onClick={() => setActiveRightPanel(activeRightPanel === 'comments' ? null : 'comments')}>
              <MessageSquare className="w-5 h-5"/>
              <span className="rail-btn-label">Comments</span>
           </button>
           <button className={`rail-btn ${activeRightPanel === 'esignature' ? 'active' : ''}`} onClick={() => setActiveRightPanel(activeRightPanel === 'esignature' ? null : 'esignature')}>
              <PenTool className="w-5 h-5"/>
              <span className="rail-btn-label">E-Signature</span>
           </button>
           <button className={`rail-btn ${activeRightPanel === 'audit' ? 'active' : ''}`} onClick={() => setActiveRightPanel(activeRightPanel === 'audit' ? null : 'audit')}>
              <History className="w-5 h-5"/>
              <span className="rail-btn-label">Audit Log</span>
           </button>
           <button className={`rail-btn ${activeRightPanel === 'version' ? 'active' : ''}`} onClick={() => setActiveRightPanel(activeRightPanel === 'version' ? null : 'version')}>
              <Activity className="w-5 h-5"/>
              <span className="rail-btn-label">Version Control</span>
           </button>
        </nav>

        {/* RIGHT SLIDE-OVER PANEL */}
        <div className={`slide-over-panel right-panel ${activeRightPanel ? 'open' : ''}`}>
           <button className="panel-close-btn" onClick={() => setActiveRightPanel(null)}><X className="w-5 h-5"/></button>
            
           {activeRightPanel === 'comments' && (
             <div className="slide-section">
                <h4 className="meta-title" style={{color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px'}}><MessageSquare className="w-4 h-4"/> Comments</h4>
                <div className="comments-list mt-2">
                  {comments.length === 0 ? <p className="text-sm text-muted">No comments yet.</p> : comments.map(c => (
                    <div key={c.id} className="comment-card" style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px'}}>
                      <div className="comment-header" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                        <span className="comment-author" style={{fontWeight: 600, fontSize: '13px', color: '#1e293b'}}>{c.author}</span>
                        <span className="comment-time" style={{fontSize: '11px', color: '#64748b'}}>{c.time}</span>
                      </div>
                      <div className="comment-quote" style={{borderLeft: '3px solid #cbd5e1', paddingLeft: '12px', color: '#64748b', fontSize: '13px', fontStyle: 'italic', marginBottom: '8px'}}>
                        "{c.quote.length > 50 ? c.quote.substring(0, 50) + '...' : c.quote}"
                      </div>
                      <p className="comment-text" style={{fontSize: '14px', color: '#334155'}}>{c.text}</p>
                    </div>
                  ))}
                </div>
             </div>
           )}

           {activeRightPanel === 'invoices' && (
             <div className="slide-section">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px'}}>
                   <h4 className="meta-title flex items-center gap-2" style={{color: '#16a34a', margin: 0}}><DollarSign className="w-4 h-4 text-emerald-500"/> INVOICES & PAYMENTS</h4>
                   <span style={{fontSize: '12px', fontWeight: 600, color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '12px'}}>
                      {meta.invoices?.filter((i:any) => i.status==='paid').length || 0} / {meta.invoices?.length || 0} Paid
                   </span>
                </div>
                
                <div className="mt-4" style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                   {(!meta.invoices || meta.invoices.length === 0) ? (
                      <div className="text-center p-6 bg-gray-50 rounded-xl border border-gray-200">
                         <Receipt className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                         <p className="text-sm text-gray-500 font-medium">No invoices detected in this contract.</p>
                      </div>
                   ) : (
                      meta.invoices.map((inv: any, idx: number) => {
                         const isPaid = inv.status === 'paid';
                         const isOverdue = inv.status === 'pending' && new Date(inv.dueDate) < new Date();
                         
                         return (
                           <div key={inv.id || idx} style={{ border: `1px solid ${isPaid ? '#bbf7d0' : (isOverdue ? '#fecaca' : '#e2e8f0')}`, borderRadius: '12px', padding: '16px', background: isPaid ? '#f0fdf4' : (isOverdue ? '#fef2f2' : '#ffffff'), boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}>
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
                                 <div>
                                    <h5 style={{fontSize: '14px', fontWeight: 700, color: isPaid ? '#166534' : (isOverdue ? '#991b1b' : '#0f172a'), margin: '0 0 4px 0'}}>{inv.description}</h5>
                                    <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                       <span style={{fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px'}}><Calendar className="w-3 h-3" /> Due: {inv.dueDate}</span>
                                    </div>
                                 </div>
                                 <div style={{textAlign: 'right'}}>
                                    <div style={{fontSize: '15px', fontWeight: 800, color: isPaid ? '#16a34a' : (isOverdue ? '#ef4444' : '#3b82f6')}}>{inv.amountNumber?.toLocaleString()} {inv.amountCurrency}</div>
                                    <span style={{fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px', background: isPaid ? '#dcfce3' : (isOverdue ? '#fee2e2' : '#e0e7ff'), color: isPaid ? '#166534' : (isOverdue ? '#991b1b' : '#3730a3'), display: 'inline-block', marginTop: '4px'}}>
                                       {isOverdue ? 'Overdue' : inv.status}
                                    </span>
                                 </div>
                              </div>
                              
                              <button 
                                 className="btn w-full"
                                 onClick={() => {
                                    const newInvoices = [...meta.invoices];
                                    newInvoices[idx] = { ...inv, status: isPaid ? 'pending' : 'paid' };
                                    setMeta({ ...meta, invoices: newInvoices });
                                    setTimeout(() => handleAutoSave(), 100);
                                 }}
                                 style={{
                                    background: isPaid ? '#ffffff' : '#10b981',
                                    color: isPaid ? '#166534' : '#ffffff',
                                    border: `1px solid ${isPaid ? '#86efac' : 'transparent'}`,
                                    padding: '8px', fontSize: '12px', fontWeight: 600, borderRadius: '8px',
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px'
                                 }}
                              >
                                 {isPaid ? <RotateCcw className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                 {isPaid ? 'Mark as Pending' : 'Mark as Received'}
                              </button>
                           </div>
                         );
                      })
                   )}
                </div>
             </div>
           )}
           
           {activeRightPanel === 'workflow' && (
             <div className="slide-section">
                <h4 className="meta-title" style={{color: 'var(--primary)', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px'}}>
                   <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}><GitMerge className="w-4 h-4"/> Approval Map</span>
                   {workflowSequence.length > 0 && (
                       <button onClick={handleSaveAsTemplate} style={{fontSize: '11px', background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 'bold'}}>Save as Template</button>
                   )}
                </h4>
                <div className="mb-6 mt-4 approval-map-container" style={{position: 'relative'}}>
                  <div className="approval-vertical-line" style={{position: 'absolute', left: '15px', top: '10px', bottom: '10px', width: '2px', background: '#cbd5e1'}}></div>
                    
                  {workflowSequence.map((step) => {
                      const isActiveTurn = ['pending', 'returned'].includes(step.status) && step.order === activeWorkflowOrder;
                      return (
                      <div key={step.id} style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '16px', marginBottom: '24px' }}>
                         <div className={`approval-node ${isActiveTurn ? 'active-pulse' : ''}`} style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: step.status === 'approved' ? '#10b981' : step.status === 'rejected' ? '#ef4444' : 'white', border: `3px solid ${step.status === 'approved' ? '#10b981' : step.status === 'rejected' ? '#ef4444' : isActiveTurn ? '#4f46e5' : '#cbd5e1'}` }}>
                             {step.status === 'approved' && <CheckCircle2 className="w-4 h-4 text-white" />}
                         </div>
                         <div className="workflow-step-card" style={{ flex: 1, margin: 0, padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', borderLeft: isActiveTurn ? '4px solid #4f46e5' : '1px solid #e2e8f0' }}>
                           <div className="flex w-full" style={{flexDirection: 'column'}}>
                              <span className="step-role" style={{fontSize: '13px', fontWeight: 800, color: '#334155'}}>{step.assigned_user?.username ? `${step.assigned_user.username} (${step.role})` : step.role}</span>
                              <span className="step-name" style={{fontSize: '12px', color: '#64748b'}}>{step.name}</span>
                              {step.status && step.status !== 'pending' && (
                                  <span style={{fontSize: '11px', color: step.status === 'approved' ? '#10b981' : step.status === 'rejected' ? '#ef4444' : '#f59e0b', fontWeight: 'bold', marginTop: '6px', display: 'inline-block'}}>{step.status.toUpperCase()}</span>
                              )}
                              {step.comments && (!step.comment_visibility || step.comment_visibility.length === 0 || step.comment_visibility.includes(String(currentUser?.id)) || currentUser?.id === step.assigned_user?.id) && (
                                  <div className="chat-bubble-comment" style={{background: '#f1f5f9', padding: '10px', borderRadius: '8px', fontSize: '13px', color: '#334155', marginTop: '8px'}}>
                                    {step.comments}
                                  </div>
                              )}
                           </div>
                           {isActiveTurn && currentUser?.id === step.assigned_user?.id && (
                               <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', width: '100%', borderTop: '1px dashed #cbd5e1', paddingTop: '16px'}}>
                                   <input type="text" placeholder="Add comment (optional)" value={workflowComment} onChange={e => setWorkflowComment(e.target.value)} className="ghost-input" style={{ border: '1px solid #cbd5e1', background: 'white', padding: '10px', borderRadius: '8px', fontSize: '13px' }} />
                                   {workflowSequence.filter(s => s.order < step.order && s.assigned_user).length > 0 && (
                                       <div style={{fontSize: '12px', color: '#475569', background: '#f1f5f9', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                                           <p style={{fontWeight: 600, marginBottom: '6px'}}>Who can see this comment? (Default: Everyone)</p>
                                           <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                                               {Array.from(new Map(workflowSequence.filter(s => s.order < step.order && s.assigned_user).map(s => [s.assigned_user.id, s.assigned_user])).values()).map((user: any) => (
                                                   <label key={user.id} style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500}}>
                                                       <input type="checkbox" checked={selectedCommentVisibility.includes(String(user.id))} onChange={(e) => { if (e.target.checked) setSelectedCommentVisibility([...selectedCommentVisibility, String(user.id)]); else setSelectedCommentVisibility(selectedCommentVisibility.filter(id => id !== String(user.id))); }} /> {user.username}
                                                   </label>
                                               ))}
                                           </div>
                                       </div>
                                   )}
                                   <div style={{display: 'flex', gap: '8px', marginTop: '8px'}}>
                                       <button onClick={() => handleWorkflowAction(step.database_id!, 'approve')} className="btn btn-primary" style={{flex: 1}}>Approve</button>
                                       <button onClick={() => handleWorkflowAction(step.database_id!, 'reject')} className="btn" style={{flex: 1, background: '#ef4444', color: 'white'}}>Reject</button>
                                   </div>
                               </div>
                           )}
                         </div>
                      </div>
                    )})}
                  <button className="btn btn-ghost w-full mt-3" style={{ border: '1px dashed #cbd5e1', background: '#f8fafc', color: '#475569', padding: '12px', borderRadius: '8px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} onClick={() => setWorkflowModalOpen(true)}>
                    <Plus className="w-4 h-4"/> Setup Workflow
                  </button>
                </div>
             </div>
           )}

           {activeRightPanel === 'esignature' && (
             <div className="slide-section">
                <h4 className="meta-title flex items-center gap-2" style={{color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px'}}><PenTool className="w-4 h-4 text-indigo-500"/> E-SIGNATURE LINK</h4>
                <div className="mt-4">
                   {docStatus === 'completed' ? (
                     <div className="text-center bg-gray-100 p-4 rounded border border-gray-300">
                        <ShieldCheck className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <h4 className="font-semibold text-sm mb-1 text-gray-700">Document Locked</h4>
                        <p className="text-xs mb-3 text-gray-500">This document has been fully signed and is now sealed.</p>
                        <button className="btn btn-ghost w-full" style={{border: '1px dashed #cbd5e1'}} onClick={handleDuplicateAsClean}>Duplicate as Clean Draft</button>
                     </div>
                   ) : (
                     <>
                       {signatureStatus === 'IDLE' && (
                         <>
                           <p className="text-xs text-muted mb-3">Generate a secure 24-hour link for an external party to sign online.</p>
                           <input type="text" className="signature-input ghost-input" placeholder="Signer Name (e.g., Global LLC Rep)" value={signerName} onChange={e => setSignerName(e.target.value)} style={{width: '100%', marginBottom: '12px', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px'}} />
                           <button className="btn btn-primary w-full" onClick={handleGenerateSignatureLink} disabled={!signerName || id === 'new'}>{id === 'new' ? 'Save Document First' : 'Generate Signing Link'} <ArrowRight className="w-4 h-4"/></button>
                         </>
                       )}
                       {signatureStatus === 'GENERATING' && (
                         <div className="py-4 text-center">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-sm font-medium">Generating Secure Link...</p>
                         </div>
                       )}
                       {signatureStatus === 'GENERATED' && (
                         <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce3 100%)', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '24px 20px', textAlign: 'center', boxShadow: '0 8px 16px rgba(22, 163, 74, 0.1)' }}>
                             <CheckCircle2 className="w-12 h-12 mb-3" style={{color: '#16a34a', display: 'block', margin: '0 auto'}} />
                             <h4 className="font-extrabold text-lg mb-1" style={{color: '#166534', letterSpacing: '-0.3px'}}>Ready to Sign!</h4>
                             <p className="text-sm mb-5" style={{color: '#15803d', fontWeight: 500}}>Secure link is valid for 24 hours.</p>
                             <div style={{position: 'relative', marginBottom: '16px'}}>
                               <input type="text" readOnly value={signatureLink} style={{ width: '100%', fontSize: '13px', padding: '12px 14px', borderRadius: '8px', border: '1px solid #86efac', backgroundColor: '#ffffff', color: '#14532d', outline: 'none', textAlign: 'center', fontWeight: 500 }} onFocus={e => e.target.select()} />
                             </div>
                             <div style={{display: 'flex', gap: '12px'}}>
                               <button onClick={handleCopyLink} style={{ flex: 1, padding: '10px', background: 'linear-gradient(to right, #16a34a, #15803d)', color: 'white', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', boxShadow: '0 4px 10px rgba(22, 163, 74, 0.3)' }}>Copy Link</button>
                               <button onClick={resetSignature} style={{ flex: 1, padding: '10px', background: '#ffffff', color: '#16a34a', borderRadius: '8px', fontSize: '14px', fontWeight: 600, border: '1px solid #86efac', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>New Link</button>
                             </div>
                         </div>
                       )}
                     </>
                   )}
                </div>
             </div>
           )}

           {activeRightPanel === 'audit' && (
             <div className="slide-section">
                <h4 className="meta-title" style={{color: 'var(--primary)', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px'}}><History className="w-4 h-4"/> Audit Log & History</h4>
                <div className="mt-4" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                   {editHistory.slice(0, 5).map(hist => (
                      <div key={hist.id} style={{display: 'flex', gap: '12px'}}>
                         <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, background: hist.type === 'ai' ? 'linear-gradient(135deg, #1e1b4b, #4f46e5)' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: hist.type === 'ai' ? '0 4px 10px rgba(79, 70, 229, 0.3)' : 'none', border: hist.type === 'ai' ? 'none' : '1px solid #e2e8f0' }}>
                            {hist.type === 'ai' ? <Sparkles className="w-4 h-4 text-indigo-200" /> : <User className="w-4 h-4 text-slate-500" />}
                         </div>
                         <div style={{flex: 1}}>
                            <p style={{fontSize: '13px', fontWeight: 600, color: hist.type === 'ai' ? '#4f46e5' : '#334155', margin: '0 0 2px 0'}}>{hist.type === 'ai' ? 'Fossa Neural Engine' : hist.user}</p>
                            <p style={{fontSize: '12.5px', color: '#64748b', margin: '0 0 4px 0', lineHeight: 1.4}}>{hist.description}</p>
                            <span style={{fontSize: '11px', color: '#94a3b8'}}>{hist.time}</span>
                         </div>
                      </div>
                   ))}
                   {editHistory.length > 5 && (
                      <button className="btn btn-ghost" style={{fontSize: '12px', padding: '8px', color: '#4f46e5'}} onClick={() => setHistoryModalOpen(true)}>View Full History ({editHistory.length})</button>
                   )}
                </div>
             </div>
           )}

           {activeRightPanel === 'version' && (
             <div className="slide-section">
                <h4 className="meta-title" style={{color: '#9333ea', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px'}}><Activity className="w-4 h-4"/> Version Control</h4>
                <div className="mt-4">
                  <p className="text-sm text-muted mb-4">View snapshot versions of this document across different saves.</p>
                  <button className="btn btn-ghost w-full" style={{border: '1px solid #e2e8f0', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '8px'}} onClick={() => {
                      if (id && id !== 'new') {
                          apiClient.get(`/documents/${id}/versions/`).then(res => setVersionsList(res)).catch(e => console.error(e));
                      }
                      setVersionsModalOpen(true);
                  }}>
                      <History className="w-4 h-4" /> View Historic Versions
                  </button>
                </div>
             </div>
           )}
        </div>
      </div>

      {/* MODAL: HISTORY DIFF VIEW */}
      {isHistoryModalOpen && (
        <div className="glass-modal" style={{background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 10000}}>
          <div className="modal-content" style={{maxWidth: '600px', width: '90%', padding: 0, borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '85vh'}}>
            <div style={{padding: '24px 24px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfcfd'}}>
              <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><History className="w-5 h-5 text-indigo-500"/> Audit Log & History</h3>
              <button onClick={() => setHistoryModalOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%'}}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />
              </button>
            </div>
            <div style={{padding: '0', background: '#f8fafc', overflowY: 'auto', flex: 1}}>
              {editHistory.map(hist => (
                 <div key={hist.id} style={{padding: '24px', borderBottom: '1px solid #e2e8f0', background: 'white'}}>
                    <div style={{display: 'flex', gap: '12px', marginBottom: '16px'}}>
                       <div style={{
                          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                          background: hist.type === 'ai' ? 'linear-gradient(135deg, #1e1b4b, #4f46e5)' : '#f1f5f9',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: hist.type === 'ai' ? '0 4px 10px rgba(79, 70, 229, 0.3)' : 'none',
                          border: hist.type === 'ai' ? 'none' : '1px solid #e2e8f0'
                       }}>
                          {hist.type === 'ai' ? <Sparkles className="w-4 h-4 text-indigo-200" /> : <User className="w-4 h-4 text-slate-500" />}
                       </div>
                       <div style={{flex: 1}}>
                          <p style={{fontSize: '14px', fontWeight: 700, color: hist.type === 'ai' ? '#4f46e5' : '#334155', margin: '0 0 2px 0'}}>
                             {hist.type === 'ai' ? 'Fossa Neural Engine' : hist.user}
                          </p>
                          <p style={{fontSize: '13px', color: '#475569', margin: '0 0 4px 0', lineHeight: 1.4}}>
                             {hist.description}
                          </p>
                          <span style={{fontSize: '11px', color: '#94a3b8', fontWeight: 600}}>{hist.time}</span>
                       </div>
                    </div>
                    
                    {/* DIFF VIEWER */}
                    {hist.oldText && hist.newText && (
                       <div style={{display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                          <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                             <span style={{fontSize: '11px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase'}}>Previous Version</span>
                             <div style={{background: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', borderLeft: '3px solid #ef4444', textDecoration: 'line-through'}}>
                               {hist.oldText}
                             </div>
                          </div>
                          <div style={{display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px'}}>
                             <span style={{fontSize: '11px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase'}}>Updated Version</span>
                             <div style={{background: '#ecfdf5', color: '#065f46', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', borderLeft: '3px solid #10b981'}}>
                               {hist.newText}
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
              ))}
            </div>
            <div style={{padding: '16px 24px', background: 'white', borderTop: '1px solid #e2e8f0', textAlign: 'right'}}>
               <button className="btn btn-ghost" style={{padding: '8px 16px', background: '#f1f5f9', borderRadius: '8px', fontWeight: 600, color: '#475569'}} onClick={() => setHistoryModalOpen(false)}>Close Window</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD WORKFLOW */}
      {isWorkflowModalOpen && (
        <div className="glass-modal" style={{background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)'}}>
          <div className="modal-content" style={{maxWidth: '440px', padding: 0, borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'}}>
            <div style={{padding: '24px 24px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfcfd'}}>
              <h3 className="font-bold text-xl text-slate-800">Setup Workflow</h3>
              <button onClick={() => setWorkflowModalOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%'}}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />
              </button>
            </div>
            
            <div style={{padding: '24px', background: 'white'}}>
              
              <div className="mb-6" style={{paddingBottom: '20px', borderBottom: '1px dashed #e2e8f0'}}>
                 <h4 className="text-sm font-semibold text-slate-800 mb-3">Option 1: Apply Template</h4>
                 <div style={{display: 'flex', gap: '8px'}}>
                     <select 
                        className="transition-shadow duration-200 outline-none" 
                        style={{flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px'}}
                        value={selectedTemplateId} 
                        onChange={e => setSelectedTemplateId(e.target.value)} 
                     >
                        <option value="">-- Select Saved Template --</option>
                        {workflowTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                     </select>
                     <button className="btn btn-primary" style={{padding: '10px 16px', borderRadius: '8px'}} onClick={handleApplyTemplate}>Apply</button>
                 </div>
              </div>

              <div className="mb-5">
                <h4 className="text-sm font-semibold text-slate-800 mb-3">Option 2: Add Custom Step</h4>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Assign to Employee</label>
                <select 
                  className="w-full transition-shadow duration-200 outline-none" 
                  style={{padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', color: '#334155'}}
                  value={newAssignedUser} 
                  onChange={e => setNewAssignedUser(e.target.value)} 
                  onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)'}
                  onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.username} ({emp.profile?.role || 'Employee'})</option>
                  ))}
                </select>
              </div>
              <div className="mb-5">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Step Name</label>
                <input 
                  type="text" 
                  className="w-full transition-shadow duration-200 outline-none" 
                  style={{padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', color: '#334155'}}
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.2)'}
                  onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                  placeholder="e.g., Risk Impact Assessment"
                />
              </div>
              <div className="flex justify-end gap-3" style={{borderTop: '1px solid #f1f5f9', margin: '0 -24px -24px', padding: '20px 24px', background: '#f8fafc'}}>
                <button className="btn btn-ghost" style={{padding: '10px 20px', borderRadius: '10px', color: '#64748b', fontWeight: 600}} onClick={() => setWorkflowModalOpen(false)}>Cancel</button>
                <button className="btn btn-primary" style={{padding: '10px 20px', borderRadius: '10px', background: '#0f172a', fontWeight: 600}} onClick={addWorkflowStep}>Append Custom Step</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PERMISSIONS */}
      {isPermissionsModalOpen && (
        <div className="glass-modal" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div className="modal-content animate-slide-up" style={{width: '480px', maxWidth: '90vw', padding: 0, borderRadius: '24px', overflow: 'hidden', background: '#ffffff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)'}}>
            <div style={{padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3 className="font-bold text-xl text-slate-900 flex items-center gap-2"><Share2 className="w-5 h-5 text-blue-600"/> Share Document</h3>
              <button onClick={() => setPermissionsModalOpen(false)} style={{background: '#f8fafc', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <X className="w-4 h-4 text-slate-500 hover:text-slate-800 transition-colors" />
              </button>
            </div>
            <div style={{padding: '24px'}}>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Add Collaborators</label>
                <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
                    <div style={{flex: 1, position: 'relative'}}>
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                      <select 
                        className="transition-shadow duration-200 outline-none w-full cursor-pointer hover:border-slate-400" 
                        style={{padding: '10px 36px 10px 36px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', appearance: 'none', background: '#fcfcfd', color: '#334155'}}
                        value={selectedPermUser} 
                        onChange={e => setSelectedPermUser(e.target.value)} 
                      >
                        <option value="">Select Employee...</option>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.username}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                    </div>
                    <div style={{position: 'relative'}}>
                      <select 
                        className="transition-shadow duration-200 outline-none cursor-pointer hover:border-slate-400" 
                        style={{width: '130px', padding: '10px 36px 10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', appearance: 'none', background: '#fcfcfd', color: '#334155'}}
                        value={selectedPermLevel} 
                        onChange={e => setSelectedPermLevel(e.target.value)} 
                      >
                        <option value="view">Can View</option>
                        <option value="comment">Can Comment</option>
                        <option value="edit">Can Edit</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
                <button className="btn w-full" style={{padding: '12px', borderRadius: '10px', background: '#2563eb', color: 'white', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'}} onClick={handleAddPermission} onMouseOver={e => e.currentTarget.style.background = '#1d4ed8'} onMouseOut={e => e.currentTarget.style.background = '#2563eb'}><Plus className="w-4 h-4"/> Invite Collaborator</button>
              </div>
              
              <div style={{borderTop: '1px solid #f1f5f9', paddingTop: '24px'}}>
                 <h4 className="font-semibold text-sm text-slate-800 mb-4">People with access</h4>
                 {documentPermissions.length === 0 ? (
                     <div style={{textAlign: 'center', padding: '24px 0', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1'}}>
                         <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                         <p className="text-sm text-slate-500 font-medium">Only you have access</p>
                     </div>
                 ) : (
                     <div style={{display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px'}}>
                         {documentPermissions.map((perm, idx) => (
                             <div key={idx} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                 <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                     <div style={{width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', fontSize: '14px', boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'}}>
                                         {perm.user_details?.username?.charAt(0).toUpperCase()}
                                     </div>
                                     <div style={{display: 'flex', flexDirection: 'column'}}>
                                        <span style={{fontSize: '14px', fontWeight: 600, color: '#1e293b'}}>{perm.user_details?.username}</span>
                                        <span style={{fontSize: '12px', color: '#64748b'}}>{perm.user_details?.email || 'Collaborator'}</span>
                                     </div>
                                 </div>
                                 <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                     <span style={{fontSize: '12px', fontWeight: 600, color: '#64748b', padding: '6px 12px', background: '#f1f5f9', borderRadius: '8px'}}>
                                         {perm.permission_level === 'edit' ? 'Editor' : perm.permission_level === 'comment' ? 'Commenter' : 'Viewer'}
                                     </span>
                                     <button 
                                        onClick={() => handleRemovePermission(perm.user_details?.id)}
                                        title="Remove Access"
                                        style={{background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                                        onMouseOver={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                                        onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                                        className="text-slate-400 transition-colors"
                                     >
                                        <X className="w-4 h-4" />
                                     </button>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
              </div>
            </div>
            <div style={{padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span style={{fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px'}}><ShieldCheck className="w-4 h-4 text-slate-400"/> Secured under Vedo policies</span>
                <button className="btn btn-ghost" style={{padding: '6px 12px', fontSize: '13px', fontWeight: 600, color: '#3b82f6', background: 'transparent', border: 'none', cursor: 'pointer'}} onClick={() => { navigator.clipboard.writeText(window.location.href); showAlert("Link Copied", "Contract link copied to clipboard"); }} onMouseOver={e => e.currentTarget.style.background = '#eff6ff'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>Copy link</button>
            </div>
          </div>
        </div>
      )}

      {/* COMMENT MODAL (PREMIUM) */}
      {isCommentModalOpen && (
        <div className="comment-modal-overlay">
          <div className="comment-modal-box animate-slide-up">
            <div className="comment-modal-header">
              <h3 className="font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary"/> Add Comment</h3>
              <button className="comment-close-btn" onClick={() => setCommentModalOpen(false)}>
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="comment-modal-body">
               <div className="comment-quote-draft">
                 "{commentDraftQuote}"
               </div>
               <textarea 
                 className="comment-textarea"
                 rows={4}
                 placeholder="Type your comment, @mention others, or suggest a change..."
                 value={commentDraftText}
                 onChange={(e) => setCommentDraftText(e.target.value)}
                 autoFocus
               ></textarea>
            </div>
            <div className="comment-modal-footer">
              <button className="btn btn-ghost" onClick={() => setCommentModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary px-6" onClick={submitComment}>Post Comment</button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: INTERNAL SIGNATURE SELECTION */}
      {isInternalSignModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999, backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white', width: 600, borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden'
          }} className="animate-slide-up">
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0fdf4' }}>
              <h3 className="font-bold text-lg flex items-center gap-2" style={{color: '#166534'}}><CheckCircle2 className="w-5 h-5"/> Select Your Signature</h3>
              <button className="btn-icon" onClick={() => setInternalSignModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div style={{ padding: 24, maxHeight: '60vh', overflowY: 'auto' }}>
              {savedSignatures.length === 0 ? (
                <div style={{textAlign: 'center', padding: '40px 20px'}}>
                  <PenTool className="w-12 h-12 text-tertiary mx-auto mb-3" />
                  <h4 className="text-secondary font-bold text-lg">No Signatures Found</h4>
                  <p className="text-tertiary text-sm mt-2">You haven't saved any internal signatures yet. Please go to the <b>E-Signatures</b> page from the main menu and create one to continue.</p>
                </div>
              ) : (
                <div className="suggested-grid" style={{gridTemplateColumns: '1fr', gap: '16px'}}>
                  {savedSignatures.map(sig => (
                    <div 
                       key={sig.id} 
                       className="suggested-card" 
                       style={{height: 'auto', display: 'flex', flexDirection: 'row', alignItems: 'center', padding: '16px', background: '#f8fafc', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'all 0.2s', borderRadius: '12px'}}
                       onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.background = '#f0fdf4'; }}
                       onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                       onClick={() => {
                          const dateStr = new Date().toISOString().split('T')[0];
                          const senderHTML = `<div class="internal-sig-target" style="border: 2px solid #10b981; padding: 20px; text-align: center; margin: 20px 0; background: #ecfdf5; color: #065f46; border-radius: 8px; width: 300px; display: inline-block;">
                              <img src="${sig.signature_data}" style="max-height: 80px; display: block; margin: 0 auto; margin-bottom: 8px; filter: contrast(1.2);" />
                              <div style="font-size: 10px; color: #047857; text-transform: uppercase;">Internal Authorized Signatory<br/>${dateStr}</div>
                          </div><br/>`;
                          
                          if (editorRef.current) {
                            editorRef.current.focus();
                            document.execCommand('insertHTML', false, senderHTML);
                          }
                          setInternalSignModalOpen(false);
                       }}
                    >
                      <div style={{flex: 1}}>
                        <img src={sig.signature_data} alt={sig.title} style={{maxHeight: '60px', filter: 'contrast(1.2)'}} />
                      </div>
                      <div style={{flex: 1, textAlign: 'right'}}>
                        <h4 className="font-bold text-secondary">{sig.title}</h4>
                        {sig.is_default && <span style={{fontSize: '11px', background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '12px', fontWeight: 600}}>Default</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {savedSignatures.length === 0 && (
               <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc' }}>
                  <button className="btn btn-primary" onClick={() => navigate('/signatures')}>Go to E-Signatures</button>
               </div>
            )}
          </div>
        </div>
      )}
      {/* VERSION CONTROL MODAL */}
      {isVersionsModalOpen && (
         <div className="glass-modal" style={{background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 10000}}>
          <div className="modal-content" style={{maxWidth: '800px', width: '90%', padding: 0, borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh'}}>
            <div style={{padding: '24px 24px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfcfd'}}>
              <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2"><Activity className="w-5 h-5 text-purple-600"/> Version Control</h3>
              <button onClick={() => { setVersionsModalOpen(false); setSelectedVersionDiff(null); }} style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '50%'}}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />
              </button>
            </div>
            <div style={{display: 'flex', flex: 1, overflow: 'hidden', background: '#f8fafc'}}>
               {/* Left sidebar: list of versions */}
               <div style={{width: '250px', borderRight: '1px solid #e2e8f0', overflowY: 'auto', background: 'white'}}>
                  {versionsList.map((ver, idx) => {
                     const date = new Date(ver.created_at).toLocaleString();
                     return (
                        <div key={ver.id} style={{padding: '16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: selectedVersionDiff?.versionId === ver.id ? '#f3e8ff' : 'transparent'}} onClick={() => {
                           // Compute diff between `editorRef.current.innerHTML` (Current) and `ver.content` (Old)
                           const diffs = Diff.diffWords(ver.content || '', editorRef.current?.innerHTML || '');
                           let resultHtml = '';
                           diffs.forEach(part => {
                              if (part.added) {
                                  resultHtml += `<ins style="color: #16a34a; background: #dcfce7; text-decoration: none;">${part.value}</ins>`;
                              } else if (part.removed) {
                                  resultHtml += `<del style="color: #dc2626; background: #fee2e2; text-decoration: line-through;">${part.value}</del>`;
                              } else {
                                  resultHtml += part.value;
                              }
                           });
                           setSelectedVersionDiff({ html: resultHtml, versionId: ver.id });
                        }}>
                           <h4 style={{margin: '0 0 4px', fontSize: '14px', color: '#334155'}}>Version {ver.version_number}</h4>
                           <div style={{fontSize: '11px', color: '#94a3b8'}}>{date}</div>
                           {idx === 0 && <span style={{display: 'inline-block', marginTop: '6px', fontSize: '10px', background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px'}}>Latest Snapshot</span>}
                        </div>
                     )
                  })}
                  {versionsList.length === 0 && <div style={{padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px'}}>No versions mapped for this document.</div>}
               </div>

               {/* Right sidebar: diff viewer */}
               <div style={{flex: 1, padding: '24px', overflowY: 'auto', background: 'white'}}>
                  {selectedVersionDiff ? (
                     <>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                           <h4 style={{margin: 0, color: '#334155'}}>Comparing Version with Current Document</h4>
                           <button className="btn btn-primary" style={{padding: '6px 12px', fontSize: '13px'}} onClick={async () => {
                               if(await showConfirm("Restore Version", "Are you sure you want to revert the document completely to this version? All subsequent edits will be lost.")) {
                                   const targetVer = versionsList.find(v => v.id === selectedVersionDiff.versionId);
                                   if (targetVer && editorRef.current) {
                                       editorRef.current.innerHTML = targetVer.content;
                                       lastKnownContentRef.current = targetVer.content;
                                       initialContentRef.current = targetVer.content;
                                       handleAutoSave(); // Trigger save
                                       setVersionsModalOpen(false);
                                   }
                               }
                           }}>
                              Restore this Version
                           </button>
                        </div>
                        <div 
                           style={{padding: '32px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', minHeight: '400px', lineHeight: '1.6'}}
                           dangerouslySetInnerHTML={{ __html: selectedVersionDiff.html }}
                        />
                     </>
                  ) : (
                     <div style={{display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>
                        Select a version from the left panel to compare.
                     </div>
                  )}
               </div>
            </div>
          </div>
         </div>
      )}

      {/* UNIFIED SYSTEM DIALOG */}
      <SystemDialogUi />

      {/* CUSTOM EDITOR CONTEXT MENU */}
      {editorContextMenu?.isOpen && (
         <div 
           className="context-menu animate-fade-in"
           style={{
              position: 'absolute', top: editorContextMenu.top, left: editorContextMenu.left, zIndex: 99999,
              background: '#ffffff', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0', minWidth: '180px', padding: '6px'
           }}
           onMouseDown={(e) => e.stopPropagation()}
         >
            <button className="context-menu-item" style={{display: 'flex', alignItems: 'center', gap: '8px', width: '100%', border: 'none', background: 'transparent', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontWeight: 600, color: '#4f46e5'}} onClick={(e) => {
               e.stopPropagation();
               setEditorContextMenu(null);
               setFossaInline({
                  isOpen: true,
                  top: editorContextMenu.top,
                  left: editorContextMenu.left,
                  text: window.getSelection()?.toString().trim() || ''
               });
            }}>
               <Sparkles className="w-4 h-4" /> Ask Fossa AI
            </button>
            <div style={{height: '1px', background: '#e2e8f0', margin: '4px 0'}}></div>
            <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); document.execCommand('copy'); setEditorContextMenu(null); }} style={{display: 'flex', alignItems: 'center', gap: '8px', width: '100%', border: 'none', background: 'transparent', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: '#475569'}}>
               Copy
            </button>
            <button className="context-menu-item" onClick={(e) => { e.stopPropagation(); document.execCommand('cut'); setEditorContextMenu(null); }} style={{display: 'flex', alignItems: 'center', gap: '8px', width: '100%', border: 'none', background: 'transparent', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', color: '#475569'}}>
               Cut
            </button>
         </div>
      )}

      {/* MODAL: CORRECTION POPUP */}
      {correctionPopup.isOpen && (
         <div 
           className="fossa-correction-popup" 
           style={{ top: correctionPopup.top, left: correctionPopup.left }}
           onMouseDown={e => e.stopPropagation()}
         >
            <span className="correction-suggestion-label">Suggested Fix</span>
            <div className="correction-suggestion-text">{correctionPopup.suggestion}</div>
            <div className="correction-actions">
               <button className="correction-btn-approve" onClick={(e) => {
                   e.stopPropagation();
                   if (correctionPopup.element) {
                       correctionPopup.element.outerHTML = correctionPopup.suggestion;
                       if (editorRef.current) lastKnownContentRef.current = editorRef.current.innerHTML;
                   }
                   setCorrectionPopup({isOpen: false, element: null, suggestion: '', top: 0, left: 0});
               }}>Approve</button>
               <button className="correction-btn-reject" onClick={(e) => {
                   e.stopPropagation();
                   if (correctionPopup.element) {
                       correctionPopup.element.outerHTML = correctionPopup.element.innerHTML;
                       if (editorRef.current) lastKnownContentRef.current = editorRef.current.innerHTML;
                   }
                   setCorrectionPopup({isOpen: false, element: null, suggestion: '', top: 0, left: 0});
               }}>Reject</button>
            </div>
         </div>
      )}

      {/* FOSSA INLINE AI TOOLTIP (PREMIUM DARK DESIGN) */}
      {fossaInline.isOpen && fossaInline.top > 0 && (
         <div 
           className="fossa-inline-tooltip animate-slide-up"
           style={{
              position: 'absolute', top: Math.min(fossaInline.top + 15, document.body.scrollHeight - 150), left: Math.max(20, fossaInline.left - 50), zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '16px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)',
              padding: '16px', width: '420px', display: 'flex', flexDirection: 'column', color: 'white'
           }}
           onMouseDown={(e) => e.stopPropagation()}
         >
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px'}}>
               <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                 <div style={{width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(139, 92, 246, 0.4)'}}>
                    <Sparkles className="w-4 h-4 text-white" />
                 </div>
                 <span style={{fontSize: '14px', fontWeight: 700, letterSpacing: '0.3px', background: 'linear-gradient(to right, #e0e7ff, #c4b5fd)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Ask Fossa</span>
               </div>
               <button className="btn-icon" style={{width:'28px', height:'28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', padding: 0, border: 'none', cursor: 'pointer'}} 
                  onMouseEnter={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color='white';}} 
                  onMouseLeave={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color='#94a3b8';}} 
                  onClick={() => setFossaInline({...fossaInline, isOpen: false})}>
                  <X className="w-4 h-4"/>
               </button>
            </div>
            
            <div style={{display: 'flex', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '4px', transition: 'border-color 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'}}>
               <input 
                 type="text" 
                 value={fossaInlineInput}
                 onChange={(e) => setFossaInlineInput(e.target.value)}
                 onKeyDown={(e) => { if(e.key === 'Enter') executeFossaInline(); }}
                 placeholder="e.g. Translate to Arabic, make it formal..."
                 style={{flex: 1, padding: '10px 14px', fontSize: '14px', color: 'white', outline: 'none', background: 'transparent', border: 'none'}}
                 disabled={fossaInlineLoading}
                 autoFocus
               />
               <button 
                 onClick={executeFossaInline} 
                 disabled={fossaInlineLoading || !fossaInlineInput.trim()}
                 style={{
                    padding: '0 16px', background: (!fossaInlineInput.trim() || fossaInlineLoading) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(to right, #4f46e5, #6366f1)', 
                    color: (!fossaInlineInput.trim() || fossaInlineLoading) ? '#64748b' : 'white', borderRadius: '8px', transition: 'all 0.2s', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (!fossaInlineInput.trim() || fossaInlineLoading) ? 'not-allowed' : 'pointer',
                    boxShadow: (!fossaInlineInput.trim() || fossaInlineLoading) ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.4)', border: 'none'
                 }}
               >
                 {fossaInlineLoading ? <Loader className="w-4 h-4 animate-spin text-indigo-300" /> : <ArrowRight className="w-5 h-5" />}
               </button>
            </div>
            <div style={{marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', padding: '0 4px'}}>
               <span>Press <kbd style={{background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '10px', fontFamily: 'monospace', color: '#94a3b8'}}>Enter</kbd> to execute</span>
               <span style={{display: 'flex', alignItems: 'center', gap: '4px', color: '#818cf8', fontWeight: 600}}><Cpu className="w-3 h-3"/> Neural Engine v2</span>
            </div>
         </div>
      )}

      {/* FOSSA SIDEBAR CHAT */}
      <div 
        style={{
           position: 'fixed', right: isFossaSidebarOpen ? 0 : '-400px', top: 0, bottom: 0, width: '400px',
           backgroundColor: 'white', zIndex: 9999, boxShadow: '-5px 0 25px rgba(0,0,0,0.1)',
           transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', flexDirection: 'column',
           borderLeft: '1px solid #e2e8f0'
        }}
      >
        {/* Header */}
        <div style={{padding: '24px', background: 'linear-gradient(to right, #1e1b4b, #312e81)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', position: 'relative', zIndex: 10}}>
           <div style={{display: 'flex', alignItems: 'center', gap: '14px'}}>
              <div style={{
                 width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #8b5cf6)', 
                 display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
                 border: '1px solid rgba(255,255,255,0.1)'
              }}>
                 <img src="/fossa_logo.png" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              </div>
              <div style={{display: 'flex', flexDirection: 'column'}}>
                 <h3 className="font-bold text-[20px] leading-tight tracking-wide" style={{textShadow: '0 2px 4px rgba(0,0,0,0.3)'}}>Fossa</h3>
                 <span style={{fontSize: '11.5px', color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 600, marginTop: '2px'}}>Elite Legal AI</span>
              </div>
           </div>
           <button onClick={() => setFossaSidebarOpen(false)} style={{background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '50%', transition: 'background 0.2s'}}>
              <X className="w-5 h-5 text-indigo-200 hover:text-white" />
           </button>
        </div>

        {/* Chat Area */}
        <div style={{flex: 1, padding: '24px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', background: '#f8fafc'}}>
           <style>{`
              @keyframes float-fossa {
                 0% { transform: translateY(0px) scale(1); box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4); }
                 50% { transform: translateY(-4px) scale(1.08); box-shadow: 0 8px 15px rgba(79, 70, 229, 0.6); }
                 100% { transform: translateY(0px) scale(1); box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4); }
              }
              .fossa-msg-bubble b { color: #1e1b4b; background: rgba(99,102,241,0.1); padding: 0 4px; border-radius: 4px; }
           `}</style>
           {fossaMessages.map((msg, idx) => (
              <div key={idx} style={{display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: '14px'}}>
                 <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, 
                    background: msg.role === 'user' ? '#e2e8f0' : 'transparent', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: msg.role === 'assistant' ? 'float-fossa 3s ease-in-out infinite' : 'none',
                    overflow: 'hidden', border: msg.role === 'user' ? '2px solid white' : '2px solid #a5b4fc'
                 }}>
                    {msg.role === 'assistant' ? <img src="/fossa_logo.png" style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <User className="w-5 h-5 text-slate-500"/>}
                 </div>
                 <div 
                    className="fossa-msg-bubble"
                    style={{
                       background: msg.role === 'user' ? 'linear-gradient(to right, #4f46e5, #6366f1)' : '#ffffff',
                       color: msg.role === 'user' ? '#ffffff' : '#334155',
                       border: msg.role === 'user' ? 'none' : '1px solid #e2e8f0',
                       boxShadow: msg.role === 'user' ? '0 4px 12px rgba(79,70,229,0.3)' : '0 4px 15px rgba(0,0,0,0.03)',
                       padding: '14px 18px', borderRadius: '16px', fontSize: '14.5px', lineHeight: '1.7',
                       borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                       borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                       maxWidth: '85%'
                    }}
                    dangerouslySetInnerHTML={{
                       __html: msg.content
                         .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
                         .replace(/\*(.*?)\*/g, '<i>$1</i>')
                         .replace(/\n/g, '<br/>')
                    }}
                 />
              </div>
           ))}
           {fossaChatLoading && (
             <div style={{display: 'flex', gap: '14px'}}>
                <div style={{
                   width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, 
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   animation: 'float-fossa 1.5s ease-in-out infinite', overflow: 'hidden', border: '2px solid #a5b4fc'
                }}>
                   <img src="/fossa_logo.png" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                </div>
                <div style={{background: '#ffffff', border: '1px solid #e2e8f0', padding: '14px 18px', borderRadius: '16px', borderTopLeftRadius: '4px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)'}}>
                   <span className="text-sm font-semibold text-indigo-500 animate-pulse flex items-center gap-2">
                     <Loader className="w-4 h-4 animate-spin" /> Fossa is analyzing...
                   </span>
                </div>
             </div>
           )}
        </div>

        {/* Input Area */}
        <div style={{padding: '20px', background: 'white', borderTop: '1px solid #e2e8f0'}}>
           <div style={{display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '24px', padding: '6px 12px', border: '1px solid #e2e8f0'}}>
              <input 
                value={fossaChatInput}
                onChange={e => setFossaChatInput(e.target.value)}
                onKeyDown={e => { if(e.key === 'Enter') sendFossaMessage(); }}
                placeholder="Ask Fossa anything..." 
                style={{flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '8px', fontSize: '14px'}} 
              />
              <button 
                onClick={sendFossaMessage} 
                disabled={fossaChatLoading || !fossaChatInput.trim()}
                style={{width: '32px', height: '32px', borderRadius: '50%', background: fossaChatInput.trim() ? '#4f46e5' : '#cbd5e1', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: fossaChatInput.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.2s', color: 'white'}}
              >
                 <ArrowRight className="w-4 h-4" />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
