import React, { useState, useEffect, useMemo } from 'react';
import { apiClient } from '../api/client';
import { Filter, Briefcase, Activity, CheckCircle, TrendingUp, Users, Clock, FileText, ArrowRightCircle, Award, Target, Zap } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import './AnalyticsPage.css';

interface Phase {
  phaseName: string;
  amountNumber: number;
  amountCurrency: string;
  tiedToDelivery: boolean;
}

interface Document {
  id: number | string;
  title: string;
  status: string;
  created_at: string;
  ai_metadata?: {
    startDate?: string;
    endDate?: string;
    primaryParty?: string;
    secondaryParty?: string;
    contractValueNumber?: number;
    contractCurrency?: string;
    phases?: Phase[];
    isMyCompanyContract?: boolean;
    documentType?: string;
  };
}

interface User {
  id: number;
  name?: string;
  email: string;
  role?: string;
}

interface Workflow {
  id: number;
  document: number;
  status: string;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export const AnalyticsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeStatus, setActiveStatus] = useState<string>('All');
  const [activeCurrency, setActiveCurrency] = useState<string>('All');
  const [activeDateRange, setActiveDateRange] = useState<string>('All');
  const [activeClient, setActiveClient] = useState<string>('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsRes, usersRes, workflowsRes] = await Promise.all([
          apiClient.get('/documents/').catch(() => []),
          apiClient.get('/users/').catch(() => []),
          apiClient.get('/workflows/').catch(() => [])
        ]);
        
        setDocuments(docsRes || []);
        setUsers(usersRes || []);
        setWorkflows(workflowsRes || []);
      } catch (err) {
        console.error("Failed to load for analytics", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Dynamic Filter Options ---
  const currenciesPresent = useMemo(() => {
     const currencies = new Set<string>();
     documents.forEach(d => {
       if (d.ai_metadata?.contractCurrency) currencies.add(d.ai_metadata.contractCurrency);
     });
     return Array.from(currencies);
  }, [documents]);

  const clientsPresent = useMemo(() => {
    const clients = new Set<string>();
    documents.forEach(d => {
      if (d.ai_metadata?.primaryParty && d.ai_metadata.primaryParty !== 'N/A') {
        clients.add(d.ai_metadata.primaryParty.trim());
      }
    });
    return Array.from(clients).sort();
 }, [documents]);


  // --- Filter Logic ---
  const filteredDocs = useMemo(() => {
     return documents.filter(doc => {
       // Strict Accounting Rules
       const isMyCompany = doc.ai_metadata?.isMyCompanyContract !== false; // default true if missing
       const isContractType = doc.ai_metadata?.documentType === 'Contract' || !doc.ai_metadata?.documentType;
       
       if (!isMyCompany || !isContractType) {
         return false; // exclude from all metrics
       }

       // Status
       const matchStatus = activeStatus === 'All' ? true : (activeStatus === 'Completed' ? doc.status === 'completed' : doc.status !== 'completed');
       
       // Currency
       const matchCurrency = activeCurrency === 'All' ? true : (doc.ai_metadata?.contractCurrency === activeCurrency);
       
       // Client
       const client = doc.ai_metadata?.primaryParty?.trim() || '';
       const matchClient = activeClient === 'All' ? true : (client === activeClient);
       
       // Date Range
       let matchDate = true;
       if (activeDateRange !== 'All' && doc.created_at) {
         const d = new Date(doc.created_at);
         const now = new Date();
         if (activeDateRange === 'Last 30 Days') {
            const diffTime = Math.abs(now.getTime() - d.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            matchDate = diffDays <= 30;
         } else if (activeDateRange === 'This Year') {
            matchDate = d.getFullYear() === now.getFullYear();
         }
       }

       return matchStatus && matchCurrency && matchClient && matchDate;
     });
  }, [documents, activeStatus, activeCurrency, activeClient, activeDateRange]);


  // --- ZONE A: Financial Metrics ---
  const totalFilteredValue = useMemo(() => {
     return filteredDocs.reduce((acc, doc) => acc + (Number(doc.ai_metadata?.contractValueNumber) || 0), 0);
  }, [filteredDocs]);

  const realizedRevenue = useMemo(() => {
     return filteredDocs.filter(d => d.status === 'completed').reduce((acc, doc) => acc + (Number(doc.ai_metadata?.contractValueNumber) || 0), 0);
  }, [filteredDocs]);

  const pipelineValue = useMemo(() => {
     return filteredDocs.filter(d => d.status !== 'completed' && d.status !== 'trash').reduce((acc, doc) => acc + (Number(doc.ai_metadata?.contractValueNumber) || 0), 0);
  }, [filteredDocs]);

  // --- ZONE Proposals ---
  const proposalDocs = useMemo(() => {
     return documents.filter(doc => {
       const isMyCompany = doc.ai_metadata?.isMyCompanyContract !== false;
       const isProposal = doc.ai_metadata?.documentType === 'Proposal';
       return isMyCompany && isProposal;
     });
  }, [documents]);

  const proposalValue = useMemo(() => {
      return proposalDocs.reduce((acc, doc) => acc + (Number(doc.ai_metadata?.contractValueNumber) || 0), 0);
  }, [proposalDocs]);


  // --- ZONE B: Operational Metrics ---
  const completionRate = useMemo(() => {
    if (filteredDocs.length === 0) return 0;
    return Math.round((filteredDocs.filter(d => d.status === 'completed').length / filteredDocs.length) * 100);
  }, [filteredDocs]);

  const pendingWorkflowsCount = useMemo(() => {
    return workflows.filter(w => w.status === 'in_progress' || w.status === 'pending').length;
  }, [workflows]);

  const activeUsersCount = users.length;


  // --- ZONE E: Deep Execution Metrics ---
  const highestContractValue = useMemo(() => {
    if (filteredDocs.length === 0) return 0;
    return Math.max(...filteredDocs.map(d => Number(d.ai_metadata?.contractValueNumber) || 0));
  }, [filteredDocs]);

  const { totalPhases, deliveryLinkedValue, fixedValue } = useMemo(() => {
    let phasesCount = 0;
    let linked = 0;
    let fixed = 0;
    
    filteredDocs.forEach(doc => {
      const phases = doc.ai_metadata?.phases || [];
      phasesCount += phases.length;
      phases.forEach(p => {
        const val = Number(p.amountNumber) || 0;
        if (p.tiedToDelivery) {
          linked += val;
        } else {
          fixed += val;
        }
      });
    });
    
    return { totalPhases: phasesCount, deliveryLinkedValue: linked, fixedValue: fixed };
  }, [filteredDocs]);


  // --- Chart Data ---

  // 1. Client Value Distribution (Bar Chart)
  const clientData = useMemo(() => {
    const map = new Map<string, number>();
    filteredDocs.forEach(doc => {
      let client = doc.ai_metadata?.primaryParty?.trim() || 'Unknown';
      if (client === 'N/A' || !client) client = 'Unknown Entity';
      const val = Number(doc.ai_metadata?.contractValueNumber) || 0;
      map.set(client, (map.get(client) || 0) + val);
    });
    const sorted = Array.from(map.entries()).sort((a,b) => b[1] - a[1]).slice(0, 8);
    return sorted.map(([name, value]) => ({ name, value }));
  }, [filteredDocs]);

  // 2. Status Distribution (Pie Chart)
  const statusData = useMemo(() => {
    const map = new Map<string, number>();
    filteredDocs.forEach(doc => {
      const status = doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : 'Draft';
      map.set(status, (map.get(status) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredDocs]);

  // 3. Contract Revenue Over Time (Area Chart)
  const timelineData = useMemo(() => {
    const map = new Map<string, number>();
    filteredDocs.forEach(doc => {
      const d = new Date(doc.created_at);
      const monthYear = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      const val = Number(doc.ai_metadata?.contractValueNumber) || 0;
      map.set(monthYear, (map.get(monthYear) || 0) + val);
    });
    return Array.from(map.entries()).map(([month, value]) => ({ month, value }));
  }, [filteredDocs]);

  // 4. Currency Split (Pie Chart)
  const currencyData = useMemo(() => {
    const map = new Map<string, number>();
    filteredDocs.forEach(doc => {
      const currency = doc.ai_metadata?.contractCurrency || 'USD';
      map.set(currency, (map.get(currency) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredDocs]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#4f46e5', fontWeight: 600 }}>Loading Comprehensive Analytics...</div>;

  return (
    <div className="analytics-hub-container" style={{ display: 'flex', flexDirection: 'column', padding: '24px', gap: '24px' }}>
       {/* Top Header & Global Filters */}
       <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
             <h1 style={{ fontSize: '28px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
                <Activity className="w-8 h-8 text-indigo-600" />
                Comprehensive Analytics
             </h1>
             <p style={{ color: '#64748b', marginTop: '4px', fontSize: '14px' }}>Financial performance, operational velocity, and demographic insights.</p>
          </div>
          
          <div className="glass-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '16px', maxWidth: '600px', justifyContent: 'flex-end' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock className="w-4 h-4 text-slate-400" />
                <select className="tactical-select" value={activeDateRange} onChange={e => setActiveDateRange(e.target.value)}>
                   <option value="All">All Time</option>
                   <option value="Last 30 Days">Last 30 Days</option>
                   <option value="This Year">This Year</option>
                </select>
             </div>
             
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users className="w-4 h-4 text-slate-400" />
                <select className="tactical-select" value={activeClient} onChange={e => setActiveClient(e.target.value)}>
                   <option value="All">All Clients</option>
                   {clientsPresent.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter className="w-4 h-4 text-slate-400" />
                <select className="tactical-select" value={activeStatus} onChange={e => setActiveStatus(e.target.value)}>
                   <option value="All">All Statuses</option>
                   <option value="Completed">Signed Only</option>
                   <option value="Pending">Drafts & Execution</option>
                </select>
             </div>

             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="text-slate-400 font-bold" style={{fontSize: '12px'}}>$</span>
                <select className="tactical-select" value={activeCurrency} onChange={e => setActiveCurrency(e.target.value)}>
                   <option value="All">All Currencies</option>
                   {currenciesPresent.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
          </div>
       </div>

       {/* ZONE A: Financial Metrics Row */}
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          <div className="metric-card-primary animate-fade-up delay-100" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>Total Portfolio Value</div>
                <TrendingUp className="w-5 h-5 opacity-90" />
             </div>
             <div style={{ fontSize: '32px', fontWeight: 800 }}>
                <span style={{ fontSize: '18px', opacity: 0.8, marginRight: '6px' }}>{activeCurrency === 'All' ? 'Sum' : activeCurrency}</span>
                {totalFilteredValue.toLocaleString()}
             </div>
          </div>

          <div className="glass-panel animate-fade-up delay-100" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Realized Revenue</div>
                <CheckCircle className="w-5 h-5 text-emerald-500" />
             </div>
             <div className="metric-text-emerald" style={{ fontSize: '32px', fontWeight: 800 }}>
                <span style={{ fontSize: '18px', opacity: 0.6, marginRight: '6px', color: '#64748b' }}>{activeCurrency === 'All' ? 'Sum' : activeCurrency}</span>
                {realizedRevenue.toLocaleString()}
             </div>
          </div>

          <div className="glass-panel animate-fade-up delay-100" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Pipeline Value</div>
                <ArrowRightCircle className="w-5 h-5 text-amber-500" />
             </div>
             <div className="metric-text-amber" style={{ fontSize: '32px', fontWeight: 800 }}>
                <span style={{ fontSize: '18px', opacity: 0.6, marginRight: '6px', color: '#64748b' }}>{activeCurrency === 'All' ? 'Sum' : activeCurrency}</span>
                {pipelineValue.toLocaleString()}
             </div>
          </div>

          <div className="glass-panel animate-fade-up delay-100" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Highest Deal</div>
                <Award className="w-5 h-5 text-indigo-500" />
             </div>
             <div className="metric-text-indigo" style={{ fontSize: '32px', fontWeight: 800 }}>
                <span style={{ fontSize: '18px', opacity: 0.6, marginRight: '6px', color: '#64748b' }}>{activeCurrency === 'All' ? 'Sum' : activeCurrency}</span>
                {highestContractValue.toLocaleString()}
             </div>
          </div>
       </div>

       {/* SEPARATE ROW: PROPOSALS */}
       <div className="glass-panel animate-fade-up delay-100" style={{ padding: '20px', background: '#f8fafc', borderRadius: '16px', border: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
               <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText className="w-6 h-6 text-slate-500" />
               </div>
               <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#334155' }}>Proposals Pipeline (Excluded from Core Financials)</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Currently tracking {proposalDocs.length} active proposals in negotiation.</p>
               </div>
           </div>
           <div style={{ textAlign: 'right' }}>
               <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Potential Value</div>
               <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}><span style={{ fontSize: '14px', opacity: 0.6, marginRight: '4px' }}>{activeCurrency === 'All' ? 'Sum' : activeCurrency}</span>{proposalValue.toLocaleString()}</div>
           </div>
       </div>

       {/* NEW ROW: Execution & Advanced Stats */}
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
          <div className="glass-panel animate-fade-up delay-100" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target className="w-6 h-6 text-slate-600" />
             </div>
             <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Execution Phases</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{totalPhases} <span style={{fontSize: '14px', fontWeight: 500, color: '#94a3b8'}}>Milestones</span></div>
             </div>
          </div>

          <div className="glass-panel animate-fade-up delay-100" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle className="w-6 h-6 text-emerald-600" />
             </div>
             <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Delivery-Linked Value</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{deliveryLinkedValue.toLocaleString()}</div>
             </div>
          </div>

          <div className="glass-panel animate-fade-up delay-100" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap className="w-6 h-6 text-amber-600" />
             </div>
             <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Fixed / Retainer Value</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{fixedValue.toLocaleString()}</div>
             </div>
          </div>
       </div>

       {/* ZONE B & C: Operational and Team Metrics */}
       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          <div className="glass-panel animate-fade-up delay-200" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText className="w-6 h-6 text-indigo-600" />
             </div>
             <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Contracts</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{filteredDocs.length}</div>
             </div>
          </div>

          <div className="glass-panel animate-fade-up delay-200" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle className="w-6 h-6 text-emerald-600" />
             </div>
             <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Win / Completion Rate</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{completionRate}%</div>
             </div>
          </div>

          <div className="glass-panel animate-fade-up delay-200" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock className="w-6 h-6 text-amber-600" />
             </div>
             <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Pending Workflows</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{pendingWorkflowsCount}</div>
             </div>
          </div>

          <div className="glass-panel animate-fade-up delay-200" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fce7f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users className="w-6 h-6 text-pink-600" />
             </div>
             <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Employees</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>{activeUsersCount}</div>
             </div>
          </div>
       </div>

       {/* ZONE D: Large Charts Section */}
       <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          
          {/* Main Area Chart */}
          <div className="glass-panel animate-fade-up delay-300" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
             <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <TrendingUp className="w-5 h-5 text-indigo-500" />
                Revenue Trajectory
             </h2>
             <div style={{ flex: 1, minHeight: '320px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                         <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <Tooltip formatter={(value: any) => [value.toLocaleString(), 'Value']} />
                      <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Status Donut Chart */}
          <div className="glass-panel animate-fade-up delay-300" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
             <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Pipeline Stages
             </h2>
             <div style={{ flex: 1, minHeight: '320px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                         data={statusData}
                         cx="50%"
                         cy="50%"
                         innerRadius={70}
                         outerRadius={110}
                         paddingAngle={5}
                         dataKey="value"
                         stroke="none"
                      >
                         {statusData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 500 }} />
                   </PieChart>
                </ResponsiveContainer>
             </div>
          </div>
       </div>

       {/* Bottom Full-width Charts */}
       <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          
          <div className="glass-panel animate-fade-up delay-400" style={{ padding: '24px' }}>
             <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Users className="w-5 h-5 text-fuchsia-500" />
                Top Entities Matrix
             </h2>
             <div style={{ width: '100%', height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={clientData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                      <YAxis dataKey="name" type="category" stroke="#475569" fontSize={13} fontWeight={600} tickLine={false} axisLine={false} width={120} />
                      <Tooltip formatter={(value: any) => [value.toLocaleString(), 'Total Value']} cursor={{fill: '#f1f5f9'}} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
                         {clientData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="glass-panel animate-fade-up delay-400" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
             <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Briefcase className="w-5 h-5 text-amber-500" />
                Currency Split
             </h2>
             <div style={{ flex: 1, minHeight: '320px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                      <Pie
                         data={currencyData}
                         cx="50%"
                         cy="50%"
                         innerRadius={0}
                         outerRadius={100}
                         dataKey="value"
                         stroke="white"
                         strokeWidth={2}
                      >
                         {currencyData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                         ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 500 }} />
                   </PieChart>
                </ResponsiveContainer>
             </div>
          </div>

       </div>

    </div>
  );
};
