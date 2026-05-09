import React, { useState, useEffect } from 'react';

import { apiClient } from '../api/client';
import { Briefcase, CheckCircle, Circle, LayoutDashboard, Calendar, Plus, Trash2, Workflow } from 'lucide-react';
import { useSystemDialog } from '../components/SystemDialog';

interface Phase {
  phaseName: string;
  amountNumber: number;
  amountCurrency: string;
  tiedToDelivery: boolean;
  subTasks?: { id: string; text: string; completed: boolean }[];
  assignedEmployees?: string[];
  startDate?: string;
  endDate?: string;
}

interface Document {
  id: number | string;
  title: string;
  status: string;
  created_at: string;
  ai_metadata?: {
    phases: Phase[];
    contractValueNumber?: number;
    contractCurrency?: string;
  };
}

const ResourceTimeline: React.FC<{ projects: Document[], employees: any[] }> = ({ projects, employees }) => {
  let minDate = new Date();
  let maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 2); // Default to at least 2 months ahead

  const allPhases: any[] = [];
  projects.forEach(proj => {
     proj.ai_metadata?.phases?.forEach(p => {
        if (p.startDate && p.endDate) {
           const sd = new Date(p.startDate);
           const ed = new Date(p.endDate);
           if (sd < minDate) minDate = new Date(sd);
           if (ed > maxDate) maxDate = new Date(ed);
           allPhases.push({ ...p, projectTitle: proj.title, docId: proj.id, sDate: sd, eDate: ed });
        }
     });
  });

  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 3600 * 24)) + 14; 
  const daysArray = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i - 3); // Start 3 days before minDate for padding
    return d;
  });

  const months: {name: string, days: number}[] = [];
  let currentMonth = '';
  let currentMonthDays = 0;
  
  daysArray.forEach(d => {
     const monthName = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
     if (monthName !== currentMonth) {
         if (currentMonth !== '') {
             months.push({ name: currentMonth, days: currentMonthDays });
         }
         currentMonth = monthName;
         currentMonthDays = 1;
     } else {
         currentMonthDays++;
     }
  });
  if (currentMonth !== '') {
      months.push({ name: currentMonth, days: currentMonthDays });
  }

  const getLeftPercent = (d: Date) => {
     const ms = d.getTime() - daysArray[0].getTime();
     return Math.max(0, (ms / (totalDays * 24 * 3600 * 1000)) * 100);
  };
  
  const getWidthPercent = (s: Date, e: Date) => {
     const ms = e.getTime() - s.getTime();
     return Math.max(1, (ms / (totalDays * 24 * 3600 * 1000)) * 100);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fafafa', position: 'relative' }}>
       {/* Header */}
       <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', background: 'white', zIndex: 10 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
             <Workflow className="w-6 h-6 text-blue-600" /> Resource Matrix
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Real-time capacity and schedule forecasting</p>
       </div>

       {/* Timeline Body */}
       <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', minWidth: `${totalDays * 40}px` }}>
             {/* Sticky Employee Column */}
             <div style={{ position: 'sticky', left: 0, width: '220px', background: 'white', zIndex: 20, borderRight: '1px solid #e2e8f0', boxShadow: '5px 0 15px rgba(0,0,0,0.03)' }}>
                {/* Header Cell */}
                <div style={{ height: '90px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', padding: '0 20px', fontWeight: 700, color: '#475569', fontSize: '13px', background: '#f8fafc' }}>
                   TEAM MEMBER
                </div>
                {/* Employee Rows */}
                {employees.map(emp => (
                   <div key={emp.id} style={{ height: '80px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', padding: '0 20px', background: 'white' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', marginRight: '12px' }}>
                         {emp.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                         <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{emp.username}</div>
                         <div style={{ fontSize: '11px', color: '#64748b' }}>{emp.profile?.role || 'Employee'}</div>
                      </div>
                   </div>
                ))}
             </div>

             {/* Grid Area */}
             <div style={{ flex: 1, position: 'relative', background: 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgc3Ryb2tlPSIjZjFmNWY5IiBzdHJva2Utd2lkdGg9IjEiIGZpbGw9Im5vbmUiPjxwYXRoIGQ9Ik00MCAwSDB2NDBoNDAiLz48L2c+PC9zdmc+")' }}>
                {/* Month Group Header Row */}
                <div style={{ height: '30px', display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9' }}>
                   {months.map((m, i) => (
                      <div key={i} style={{ width: `${m.days * 40}px`, padding: '0 12px', fontSize: '12px', fontWeight: 700, color: '#475569', borderRight: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
                         {m.name}
                      </div>
                   ))}
                </div>
                {/* Month/Day Header Row */}
                <div style={{ height: '60px', display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                   {daysArray.map((d, i) => (
                      <div key={i} style={{ width: '40px', flexShrink: 0, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                         <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                         <div style={{ fontSize: '13px', fontWeight: d.getDay() === 0 || d.getDay() === 6 ? 700 : 500, color: d.getDay() === 0 || d.getDay() === 6 ? '#ef4444' : '#334155' }}>{d.getDate()}</div>
                      </div>
                   ))}
                </div>

                {/* Plotting Rows */}
                {employees.map(emp => {
                   const empPhases = allPhases.filter(p => p.assignedEmployees?.includes(emp.username));
                   
                   return (
                      <div key={emp.id} style={{ height: '80px', borderBottom: '1px solid rgba(226, 232, 240, 0.5)', position: 'relative' }}>
                         {empPhases.map((phase, idx) => {
                            const left = getLeftPercent(phase.sDate);
                            const width = getWidthPercent(phase.sDate, phase.eDate);
                            
                            // Check overlap (overbooking)
                            const isOverlapped = empPhases.some((other, oIdx) => 
                               idx !== oIdx &&
                               phase.sDate < other.eDate && 
                               phase.eDate > other.sDate
                            );
                            
                            const bg = isOverlapped ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)';
                            const hoverBg = isOverlapped ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)';
                            const border = isOverlapped ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)';
                            const accent = isOverlapped ? '#ef4444' : '#3b82f6';
                            const titleColor = isOverlapped ? '#991b1b' : '#1e3a8a';
                            
                            return (
                               <div key={idx} style={{ position: 'absolute', top: '16px', left: `${left}%`, width: `${width}%`, height: '48px', borderRadius: '8px', background: bg, border: border, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', padding: '0 12px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', zIndex: isOverlapped ? 6 : 5 }}
                                 onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.zIndex = '10'; e.currentTarget.style.background = hoverBg; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)'; }}
                                 onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.zIndex = isOverlapped ? '6' : '5'; e.currentTarget.style.background = bg; e.currentTarget.style.boxShadow = 'none'; }}
                                 title={`${phase.projectTitle} - ${phase.phaseName}${isOverlapped ? ' (OVERBOOKED!)' : ''}\n${phase.amountNumber} ${phase.amountCurrency}`}
                               >
                                  <div style={{ width: '4px', height: '60%', background: accent, borderRadius: '4px', marginRight: '8px', flexShrink: 0 }} />
                                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                     <div style={{ fontSize: '12px', fontWeight: 700, color: titleColor }}>{phase.projectTitle}</div>
                                     <div style={{ fontSize: '10px', color: accent, fontWeight: 600 }}>{phase.phaseName}</div>
                                  </div>
                               </div>
                            );
                         })}
                      </div>
                   );
                })}
             </div>
          </div>
       </div>
    </div>
  );
};

export const ProjectManagerPage: React.FC = () => {
  const [projects, setProjects] = useState<Document[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'board' | 'timeline'>('board');
  const { showAlert } = useSystemDialog();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsData, usersData] = await Promise.all([
           apiClient.get('/documents/'),
           apiClient.get('/users/')
        ]);
        
        // Assume 'completed' means signed/active projects
        const signedContracts = docsData.filter((doc: Document) => doc.status === 'completed');
        setProjects(signedContracts);
        setEmployees(usersData);
        
        if (signedContracts.length > 0) {
           setActiveProjectId(signedContracts[0].id);
        }
      } catch (err) {
        console.error('Failed to load project data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeProject = projects.find(p => p.id === activeProjectId);

  const calculatePhaseProgress = (phase: Phase) => {
    if (!phase.subTasks || phase.subTasks.length === 0) return 0;
    const completed = phase.subTasks.filter(t => t.completed).length;
    return Math.round((completed / phase.subTasks.length) * 100);
  };

  const calculateFinancials = (proj: any) => {
     const invoices = proj?.ai_metadata?.invoices || [];
     const total = invoices.reduce((sum: number, inv: any) => sum + (inv.amountNumber || 0), 0);
     const received = invoices.filter((i: any) => i.status === 'paid').reduce((sum: number, inv: any) => sum + (inv.amountNumber || 0), 0);
     const percentage = total > 0 ? Math.round((received / total) * 100) : 0;
     return { total, received, percentage };
  };

  const calculateTotalProgress = (proj: Document) => {
    if (!proj.ai_metadata?.phases || proj.ai_metadata.phases.length === 0) return 0;
    
    let totalTasks = 0;
    let totalCompleted = 0;
    
    proj.ai_metadata.phases.forEach(p => {
       if (p.subTasks) {
          totalTasks += p.subTasks.length;
          totalCompleted += p.subTasks.filter(t => t.completed).length;
       }
    });
    
    if (totalTasks === 0) return 0;
    return Math.round((totalCompleted / totalTasks) * 100);
  };

  const handleTaskToggle = async (phaseIdx: number, taskId: string) => {
     if (!activeProject || !activeProject.ai_metadata) return;
     
     const updatedProj = { ...activeProject };
     if (!updatedProj.ai_metadata) return;
     if (!updatedProj.ai_metadata.phases[phaseIdx].subTasks) return;
     
     const tasks = updatedProj.ai_metadata.phases[phaseIdx].subTasks!;
     const task = tasks.find(t => t.id === taskId);
     if (task) {
        task.completed = !task.completed;
     }
     
     // Optimistically update UI
     setProjects(projects.map(p => p.id === activeProject.id ? updatedProj : p));
     
     // Save to DB
     try {
       await apiClient.patch(`/documents/${activeProject.id}/`, {
         ai_metadata: updatedProj.ai_metadata
       });
     } catch (err) {
       console.error("Failed to save progress", err);
       showAlert("Error", "Could not save progress sync.");
     }
  };

  const handleAddTask = async (phaseIdx: number) => {
     if (!activeProject || !activeProject.ai_metadata) return;
     const text = prompt("Enter sub-task description:");
     if (!text || text.trim() === '') return;
     
     const updatedProj = { ...activeProject };
     if (!updatedProj.ai_metadata) return;
     
     if (!updatedProj.ai_metadata.phases[phaseIdx].subTasks) {
        updatedProj.ai_metadata.phases[phaseIdx].subTasks = [];
     }
     
     updatedProj.ai_metadata.phases[phaseIdx].subTasks!.push({
        id: Math.random().toString(36).substring(7),
        text,
        completed: false
     });
     
     setProjects(projects.map(p => p.id === activeProject.id ? updatedProj : p));
     
     try {
       await apiClient.patch(`/documents/${activeProject.id}/`, {
         ai_metadata: updatedProj.ai_metadata
       });
     } catch (err) {
       console.error("Failed to save new task", err);
     }
  };

  const handleDeleteTask = async (phaseIdx: number, taskId: string) => {
    if (!activeProject || !activeProject.ai_metadata) return;
    
    const updatedProj = { ...activeProject };
    if (!updatedProj.ai_metadata) return;
    
    const tasks = updatedProj.ai_metadata.phases[phaseIdx].subTasks;
    if (tasks) {
      updatedProj.ai_metadata.phases[phaseIdx].subTasks = tasks.filter(t => t.id !== taskId);
    }
    
    setProjects(projects.map(p => p.id === activeProject.id ? updatedProj : p));
    
    try {
      await apiClient.patch(`/documents/${activeProject.id}/`, {
        ai_metadata: updatedProj.ai_metadata
      });
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const handlePhaseUpdate = async (phaseIdx: number, updates: Partial<Phase>) => {
     if (!activeProject || !activeProject.ai_metadata) return;
     
     const updatedProj = { ...activeProject };
     if (!updatedProj.ai_metadata) return;
     
     updatedProj.ai_metadata.phases[phaseIdx] = {
       ...updatedProj.ai_metadata.phases[phaseIdx],
       ...updates
     };
     
     setProjects(projects.map(p => p.id === activeProject.id ? updatedProj : p));
     
     try {
       await apiClient.patch(`/documents/${activeProject.id}/`, {
         ai_metadata: updatedProj.ai_metadata
       });
     } catch (err) {
       console.error("Failed to update phase", err);
       showAlert("Error", "Could not save phase details.");
     }
  };


  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Projects...</div>;

  return (
    <div style={{ display: 'flex', height: '100%', padding: '24px', gap: '24px', background: '#f8fafc' }}>
       {/* Sidebar Projects List */}
       <div style={{ width: '320px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}>
             <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LayoutDashboard className="w-5 h-5 text-indigo-600" />
                Active Projects
             </h2>
             <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: '16px' }}>Signed contracts transitioning to execution.</p>
             
             <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
               <button 
                 onClick={() => setViewMode('board')}
                 style={{ flex: 1, padding: '6px 0', fontSize: '13px', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: viewMode === 'board' ? 'white' : 'transparent', color: viewMode === 'board' ? '#3730a3' : '#64748b', boxShadow: viewMode === 'board' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
               >
                 Project Board
               </button>
               <button 
                 onClick={() => setViewMode('timeline')}
                 style={{ flex: 1, padding: '6px 0', fontSize: '13px', fontWeight: 600, borderRadius: '6px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: viewMode === 'timeline' ? 'white' : 'transparent', color: viewMode === 'timeline' ? '#3730a3' : '#64748b', boxShadow: viewMode === 'timeline' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
               >
                 Timeline
               </button>
             </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
             {projects.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>No active projects found. Sign a contract first!</div>
             ) : (
                projects.map(proj => {
                   const progress = calculateTotalProgress(proj);
                   const isActive = activeProjectId === proj.id;
                   
                   return (
                      <div 
                         key={proj.id} 
                         onClick={() => setActiveProjectId(proj.id)}
                         style={{
                            padding: '16px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            marginBottom: '12px',
                            background: isActive ? '#eef2ff' : 'white',
                            border: `1px solid ${isActive ? '#c7d2fe' : '#e2e8f0'}`,
                            transition: 'all 0.2s ease'
                         }}
                      >
                         <h3 style={{ fontSize: '14px', fontWeight: 600, color: isActive ? '#3730a3' : '#334155', marginBottom: '8px', lineHeight: 1.4 }}>{proj.title}</h3>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                            <span>{proj.ai_metadata?.contractValueNumber} {proj.ai_metadata?.contractCurrency}</span>
                            <span style={{ fontWeight: 600, color: progress === 100 ? '#10b981' : '#4f46e5' }}>{progress}%</span>
                         </div>
                         <div style={{ height: '6px', background: isActive ? '#e0e7ff' : '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: progress === 100 ? '#10b981' : '#4f46e5', width: `${progress}%`, transition: 'width 0.4s ease' }} />
                         </div>
                      </div>
                   )
                })
             )}
          </div>
       </div>

       {/* Main Project Board */}
       <div style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {viewMode === 'timeline' ? (
             <ResourceTimeline projects={projects} employees={employees} />
          ) : activeProject ? (
             <>
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                   <div>
                      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>{activeProject.title}</h1>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#64748b' }}>
                         <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar className="w-4 h-4"/> Started: {new Date(activeProject.created_at).toLocaleDateString()}</span>
                         <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase className="w-4 h-4"/> Budget: {activeProject.ai_metadata?.contractValueNumber} {activeProject.ai_metadata?.contractCurrency}</span>
                      </div>
                   </div>
                   <div style={{ display: 'flex', gap: '32px', textAlign: 'right' }}>
                      {(() => {
                         const fins = calculateFinancials(activeProject);
                         if (fins.total > 0) {
                            return (
                               <div>
                                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>{fins.percentage}%</div>
                                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>Revenue Received</div>
                                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{fins.received.toLocaleString()} / {fins.total.toLocaleString()}</div>
                               </div>
                            );
                         }
                         return null;
                      })()}
                      <div>
                         <div style={{ fontSize: '32px', fontWeight: 800, color: '#3730a3', lineHeight: 1 }}>{calculateTotalProgress(activeProject)}%</div>
                         <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>Project Completion</div>
                      </div>
                   </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                   {activeProject.ai_metadata?.phases && activeProject.ai_metadata.phases.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                         {activeProject.ai_metadata.phases.map((phase, idx) => {
                            const phaseProgress = calculatePhaseProgress(phase);
                            
                            return (
                               <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                                  {/* Phase Header */}
                                  <div style={{ padding: '16px 20px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                     <div>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Phase {idx + 1}</div>
                                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{phase.phaseName || 'Milestone Execution'}</h3>
                                     </div>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ textAlign: 'right' }}>
                                           <div style={{ fontSize: '14px', fontWeight: 700, color: '#166534' }}>{phase.amountNumber} {phase.amountCurrency}</div>
                                           <div style={{ fontSize: '11px', color: '#64748b' }}>{phase.tiedToDelivery ? 'Tied to Delivery' : 'Not linked to delivery'}</div>
                                        </div>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: `4px solid ${phaseProgress === 100 ? '#10b981' : '#e0e7ff'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: phaseProgress === 100 ? '#10b981' : '#3730a3', background: phaseProgress === 100 ? '#dcfce7' : 'white' }}>
                                           {phaseProgress}%
                                        </div>
                                     </div>
                                  </div>

                                  {/* Phase Details: Assignment & Duration */}
                                  <div style={{ padding: '12px 20px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px', alignItems: 'center' }}>
                                     <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Assigned To:</span>
                                        <select 
                                          style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: 'white', flex: 1 }}
                                          value={phase.assignedEmployees?.[0] || ''}
                                          onChange={(e) => {
                                             const val = e.target.value;
                                             handlePhaseUpdate(idx, { assignedEmployees: val ? [val] : [] });
                                          }}
                                        >
                                           <option value="">Unassigned</option>
                                           {employees.map(emp => (
                                              <option key={emp.id} value={emp.username}>{emp.username} ({emp.profile?.role || 'Employee'})</option>
                                           ))}
                                        </select>
                                     </div>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                           <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Start:</span>
                                           <input 
                                             type="date" 
                                             value={phase.startDate || ''}
                                             onChange={(e) => handlePhaseUpdate(idx, { startDate: e.target.value })}
                                             style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: 'white' }}
                                           />
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                           <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>End:</span>
                                           <input 
                                             type="date" 
                                             value={phase.endDate || ''}
                                             onChange={(e) => handlePhaseUpdate(idx, { endDate: e.target.value })}
                                             style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: 'white' }}
                                           />
                                        </div>
                                     </div>
                                  </div>

                                  {/* Subtasks */}
                                  <div style={{ padding: '16px 20px' }}>
                                     <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {phase.subTasks?.map(task => (
                                           <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', opacity: task.completed ? 0.7 : 1 }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, cursor: 'pointer' }} onClick={() => handleTaskToggle(idx, task.id)}>
                                                 {task.completed ? (
                                                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                                 ) : (
                                                    <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
                                                 )}
                                                 <span style={{ fontSize: '14px', color: task.completed ? '#64748b' : '#334155', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.text}</span>
                                              </div>
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteTask(idx, task.id); }}
                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444', opacity: 0.5 }}
                                                onMouseOver={e => e.currentTarget.style.opacity = '1'}
                                                onMouseOut={e => e.currentTarget.style.opacity = '0.5'}
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                           </div>
                                        ))}
                                        
                                        <button 
                                           onClick={() => handleAddTask(idx)}
                                           style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px dashed #cbd5e1', padding: '12px', borderRadius: '8px', color: '#64748b', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', justifyContent: 'center' }}
                                           onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#334155'; }}
                                           onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
                                        >
                                           <Plus className="w-4 h-4" />
                                           Add Execution Step
                                        </button>
                                     </div>
                                  </div>
                               </div>
                            )
                         })}
                      </div>
                   ) : (
                      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
                         <div style={{ width: '64px', height: '64px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <Workflow className="w-8 h-8 text-slate-400" />
                         </div>
                         <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>No Phases Defined</h3>
                         <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>This contract was not analyzed successfully or does not contain execution phases.</p>
                      </div>
                   )}
                </div>
             </>
          ) : (
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <Briefcase className="w-12 h-12 text-slate-300 mb-4" />
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#334155' }}>Select a Project</h3>
                <p style={{ fontSize: '14px' }}>Choose an active project from the sidebar to manage its execution phases.</p>
             </div>
          )}
       </div>
    </div>
  );
};
