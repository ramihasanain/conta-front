import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Key } from 'lucide-react';
import { apiClient } from '../api/client';

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'Employee',
    permissions: {
      can_view_all_contracts: false,
      can_approve_workflows: false,
      can_sign_documents: false,
      can_manage_employees: false,
    }
  });

  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get('/users/');
      setEmployees(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSave = async () => {
    try {
      await apiClient.post('/users/', formData);
      setShowModal(false);
      fetchEmployees();
      setFormData({
        username: '',
        password: '',
        email: '',
        role: 'Employee',
        permissions: {
          can_view_all_contracts: false,
          can_approve_workflows: false,
          can_sign_documents: false,
          can_manage_employees: false,
        }
      });
    } catch (err) {
      console.error("Failed to save employee", err);
      alert("Failed to save employee. Make sure username is unique and password is provided.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) return;
    try {
      await apiClient.delete(`/users/${id}/`);
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Employees...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '24px', gap: '24px', background: '#f8fafc', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Shield className="w-8 h-8 text-indigo-600" />
            Roles & Permissions
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Manage system access, employee roles, and specific capabilities.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}
        >
          <Plus className="w-5 h-5" />
          Add Employee
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Employee</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Role</th>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Permissions</th>
              <th style={{ padding: '16px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{emp.username}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>{emp.email || 'No email provided'}</div>
                </td>
                <td style={{ padding: '16px' }}>
                  <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                    {emp.profile?.role || 'None'}
                  </span>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {emp.profile?.permissions && Object.entries(emp.profile.permissions).map(([key, value]) => {
                      if (!value) return null;
                      return (
                        <span key={key} style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                          {key.replace(/_/g, ' ')}
                        </span>
                      )
                    })}
                  </div>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <button onClick={() => handleDelete(emp.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '8px' }}>
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Employee Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '500px', maxWidth: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Add New Employee</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '24px', color: '#94a3b8' }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Username</label>
                <input 
                  type="text" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  placeholder="e.g. jdoe"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Email</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Temporary Password</label>
                <div style={{ position: 'relative' }}>
                  <Key className="w-5 h-5 text-slate-400" style={{ position: 'absolute', left: '12px', top: '10px' }} />
                  <input 
                    type="password" 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                    placeholder="Enter secure password"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>System Role</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: 'white' }}
                >
                  <option value="Employee">Employee</option>
                  <option value="Legal">Legal</option>
                  <option value="Finance">Finance</option>
                  <option value="Director">Director</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              <div style={{ marginTop: '8px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>Detailed Permissions</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {Object.keys(formData.permissions).map((key) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={(formData.permissions as any)[key]}
                        onChange={e => setFormData({
                          ...formData, 
                          permissions: { ...formData.permissions, [key]: e.target.checked }
                        })}
                        style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }}
                      />
                      <span style={{ fontWeight: 600 }}>{key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
              <button onClick={() => setShowModal(false)} style={{ background: 'white', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ background: '#4f46e5', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, color: 'white', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}>Create Employee</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
