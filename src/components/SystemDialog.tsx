import { useState } from 'react';
import { AlertCircle, CheckCircle2, Info, HelpCircle } from 'lucide-react';

export type DialogOptions = {
   title: string;
   message: string;
   type?: 'alert' | 'confirm' | 'prompt';
   icon?: 'info' | 'warning' | 'success' | 'question';
   initialPromptValue?: string;
};

export const useSystemDialog = () => {
   const [dialogOptions, setDialogOptions] = useState<DialogOptions | null>(null);
   const [resolvePromise, setResolvePromise] = useState<((val: string | boolean | null) => void) | null>(null);

   const showDialog = (options: DialogOptions) => {
      return new Promise<string | boolean | null>((resolve) => {
         setDialogOptions(options);
         setResolvePromise(() => resolve);
      });
   };

   const showAlert = (title: string, message: string): Promise<void> => 
      showDialog({ title, message, type: 'alert', icon: 'info' }) as Promise<any>;
   
   const showConfirm = (title: string, message: string): Promise<boolean> => 
      showDialog({ title, message, type: 'confirm', icon: 'warning' }) as Promise<any>;

   const showPrompt = (title: string, message: string, initialPromptValue: string = ''): Promise<string | null> => 
      showDialog({ title, message, type: 'prompt', icon: 'question', initialPromptValue }) as Promise<any>;

   const closeDialog = (result: string | boolean | null) => {
      setDialogOptions(null);
      if (resolvePromise) resolvePromise(result);
   };

   const SystemDialogUi = () => {
      if (!dialogOptions) return null;

      const [inputValue, setInputValue] = useState(dialogOptions.initialPromptValue || '');

      return (
         <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
         }}>
            <div style={{
               background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,1))',
               padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '420px',
               boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
               border: '1px solid rgba(255,255,255,0.8)',
               display: 'flex', flexDirection: 'column', gap: '20px',
               animation: 'dialogFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
               <style>{`
                  @keyframes dialogFadeIn {
                     from { opacity: 0; transform: scale(0.95) translateY(10px); }
                     to { opacity: 1; transform: scale(1) translateY(0); }
                  }
               `}</style>

               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                     width: '48px', height: '48px', borderRadius: '50%',
                     background: dialogOptions.icon === 'warning' ? '#fef2f2' :
                                dialogOptions.icon === 'success' ? '#f0fdf4' :
                                dialogOptions.icon === 'question' ? '#f5f3ff' : '#eff6ff',
                     display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                     {dialogOptions.icon === 'warning' && <AlertCircle className="w-6 h-6 text-red-500" />}
                     {dialogOptions.icon === 'success' && <CheckCircle2 className="w-6 h-6 text-green-500" />}
                     {dialogOptions.icon === 'question' && <HelpCircle className="w-6 h-6 text-purple-500" />}
                     {dialogOptions.icon === 'info' && <Info className="w-6 h-6 text-blue-500" />}
                  </div>
                  <div>
                     <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{dialogOptions.title}</h3>
                     <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#475569', lineHeight: 1.5 }}>{dialogOptions.message}</p>
                  </div>
               </div>

               {dialogOptions.type === 'prompt' && (
                  <input
                     autoFocus
                     type="text"
                     value={inputValue}
                     onChange={e => setInputValue(e.target.value)}
                     onKeyDown={e => { if (e.key === 'Enter') closeDialog(inputValue); }}
                     style={{
                        padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1',
                        fontSize: '15px', color: '#1e293b', outline: 'none', transition: 'box-shadow 0.2s', width: '100%', boxSizing: 'border-box'
                     }}
                     onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.2)'}
                     onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                  />
               )}

               <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
                  {(dialogOptions.type === 'confirm' || dialogOptions.type === 'prompt') && (
                     <button
                        onClick={() => closeDialog(dialogOptions.type === 'prompt' ? null : false)}
                        style={{
                           padding: '10px 20px', borderRadius: '12px', border: 'none',
                           background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '14px', cursor: 'pointer'
                        }}
                     >
                        Cancel
                     </button>
                  )}

                  <button
                     onClick={() => closeDialog(dialogOptions.type === 'prompt' ? inputValue : true)}
                     style={{
                        padding: '10px 20px', borderRadius: '12px', border: 'none',
                        background: dialogOptions.icon === 'warning' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #4f46e5, #4338ca)',
                        color: 'white', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                        boxShadow: dialogOptions.icon === 'warning' ? '0 4px 10px rgba(239, 68, 68, 0.3)' : '0 4px 10px rgba(79, 70, 229, 0.3)'
                     }}
                  >
                     {dialogOptions.type === 'alert' ? 'OK' : 'Confirm'}
                  </button>
               </div>
            </div>
         </div>
      );
   };

   return {
      showAlert,
      showConfirm,
      showPrompt,
      SystemDialogUi
   };
};
