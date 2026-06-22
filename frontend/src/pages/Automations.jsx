// ═══════════════════════════════════════════════════════════
// AUTOMATIONS PAGE — IF/THEN rule builder + Scheduling
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CONDITIONS = [
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
  { value: 'equals', label: 'equals' },
  { value: 'detected', label: 'is detected' },
];

const ACTIONS = [
  { value: 'turn_on', label: 'Turn ON' },
  { value: 'turn_off', label: 'Turn OFF' },
  { value: 'set_value', label: 'Set value to' },
];

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

export default function Automations() {
  const { api } = useAuth();
  const [houses, setHouses] = useState([]);
  const [devices, setDevices] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [tab, setTab] = useState('automations');
  const [loading, setLoading] = useState(true);
  const [showAutoForm, setShowAutoForm] = useState(false);
  const [showSchedForm, setShowSchedForm] = useState(false);
  const [autoForm, setAutoForm] = useState({ name:'', trigger_device_id:'', trigger_condition:'greater_than', trigger_value:'', action_device_id:'', action_type:'turn_on', action_value:'' });
  const [schedForm, setSchedForm] = useState({ device_id:'', action:'turn_on', value:'', scheduled_time:'22:00', days_of_week:[] });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [h, d] = await Promise.all([api('/houses'), api('/houses')]);
      const housesData = h.houses || [];
      setHouses(housesData);
      if (housesData[0]) {
        const [devData, autoData] = await Promise.all([
          api(`/devices/house/${housesData[0].id}`),
          api(`/automations/${housesData[0].id}`)
        ]);
        setDevices(devData.devices || []);
        setAutomations(autoData.automations || []);
        // Fetch schedules for all devices
        const allScheds = [];
        for (const dev of devData.devices || []) {
          const sd = await api(`/schedules/device/${dev.id}`);
          allScheds.push(...(sd.schedules || []).map(s => ({ ...s, device: dev })));
        }
        setSchedules(allScheds);
      }
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }

  async function createAutomation(e) {
    e.preventDefault();
    if (!houses[0]) return;
    try {
      await api('/automations', { method: 'POST', body: JSON.stringify({ ...autoForm, house_id: houses[0].id, trigger_value: parseFloat(autoForm.trigger_value), action_value: parseFloat(autoForm.action_value) || null }) });
      toast.success('Automation created!');
      setShowAutoForm(false);
      fetchData();
    } catch (err) { toast.error(err.message); }
  }

  async function createSchedule(e) {
    e.preventDefault();
    try {
      await api('/schedules', { method: 'POST', body: JSON.stringify({ ...schedForm, value: parseFloat(schedForm.value) || null }) });
      toast.success('Schedule created!');
      setShowSchedForm(false);
      fetchData();
    } catch (err) { toast.error(err.message); }
  }

  async function deleteAutomation(id) {
    if (!confirm('Delete this automation?')) return;
    try { await api(`/automations/${id}`, { method: 'DELETE' }); fetchData(); } catch { }
  }

  async function deleteSchedule(id) {
    if (!confirm('Delete this schedule?')) return;
    try { await api(`/schedules/${id}`, { method: 'DELETE' }); fetchData(); } catch { }
  }

  if (loading) return <div className="page-container"><div className="skeleton skeleton-title" /><div className="skeleton" style={{height:400}} /></div>;

  return (
    <div className="page-container">
      <h1 className="page-title">⚡ Automation & Scheduling</h1>
      <p className="page-subtitle">Create smart rules and scheduled device actions</p>

      <div className="flex-gap" style={{ marginBottom: 24 }}>
        <button className={`btn ${tab==='automations'?'btn-primary':'btn-secondary'}`} onClick={()=>setTab('automations')}>⚡ Automations</button>
        <button className={`btn ${tab==='schedules'?'btn-primary':'btn-secondary'}`} onClick={()=>setTab('schedules')}>🕐 Schedules</button>
      </div>

      {tab === 'automations' && (
        <>
          <div className="flex-between" style={{ marginBottom: 20 }}>
            <h2 className="section-title" style={{ margin: 0 }}>Automation Rules</h2>
            <button className="btn btn-primary" onClick={() => setShowAutoForm(!showAutoForm)}>
              {showAutoForm ? '✕ Cancel' : '+ New Rule'}
            </button>
          </div>

          {showAutoForm && (
            <div className="card animate-slide-up" style={{ marginBottom: 24 }}>
              <h3 className="section-title">New Automation Rule</h3>
              <form onSubmit={createAutomation}>
                <div className="form-group">
                  <label className="form-label">Rule Name</label>
                  <input className="form-input" placeholder="e.g. High Temp → Fan ON" value={autoForm.name} onChange={e => setAutoForm({...autoForm, name: e.target.value})} required />
                </div>

                <div style={{ background: 'var(--bg-tertiary)', padding: 20, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginBottom: 12 }}>IF (Trigger)</div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Sensor Device</label>
                      <select className="form-select" value={autoForm.trigger_device_id} onChange={e => setAutoForm({...autoForm, trigger_device_id: e.target.value})} required>
                        <option value="">Select sensor...</option>
                        {devices.filter(d => ['temperature','humidity','gas','fire','motion'].includes(d.type)).map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Condition</label>
                      <select className="form-select" value={autoForm.trigger_condition} onChange={e => setAutoForm({...autoForm, trigger_condition: e.target.value})}>
                        {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {autoForm.trigger_condition !== 'detected' && (
                    <div className="form-group">
                      <label className="form-label">Value</label>
                      <input className="form-input" type="number" placeholder="e.g. 30" value={autoForm.trigger_value} onChange={e => setAutoForm({...autoForm, trigger_value: e.target.value})} />
                    </div>
                  )}
                </div>

                <div style={{ background: 'var(--success-bg)', padding: 20, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', marginBottom: 12 }}>THEN (Action)</div>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Device</label>
                      <select className="form-select" value={autoForm.action_device_id} onChange={e => setAutoForm({...autoForm, action_device_id: e.target.value})} required>
                        <option value="">Select device...</option>
                        {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.type})</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Action</label>
                      <select className="form-select" value={autoForm.action_type} onChange={e => setAutoForm({...autoForm, action_type: e.target.value})}>
                        {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {autoForm.action_type === 'set_value' && (
                    <div className="form-group">
                      <label className="form-label">Value</label>
                      <input className="form-input" type="number" placeholder="e.g. 80" value={autoForm.action_value} onChange={e => setAutoForm({...autoForm, action_value: e.target.value})} />
                    </div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary">Create Automation</button>
              </form>
            </div>
          )}

          {automations.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">⚡</div><div className="empty-state-title">No automations yet</div><div className="empty-state-text">Create rules to automatically control devices based on sensor readings</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {automations.map(a => (
                <div key={a.id} className="card" style={{ padding: '14px 20px' }}>
                  <div className="flex-between">
                    <div className="flex-gap">
                      <span className={`badge ${a.is_active ? 'badge-success' : 'badge-neutral'}`}>{a.is_active ? 'Active' : 'Paused'}</span>
                      <strong>{a.name}</strong>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteAutomation(a.id)}>🗑</button>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '2px 10px', borderRadius: 20, fontWeight: 500 }}>IF</span>
                    <span>{a.trigger_device?.name} {a.trigger_condition?.replace('_',' ')} {a.trigger_value}</span>
                    <span style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 10px', borderRadius: 20, fontWeight: 500 }}>THEN</span>
                    <span>{a.action_device?.name} → {a.action_type?.replace('_',' ')} {a.action_value || ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'schedules' && (
        <>
          <div className="flex-between" style={{ marginBottom: 20 }}>
            <h2 className="section-title" style={{ margin: 0 }}>Device Schedules</h2>
            <button className="btn btn-primary" onClick={() => setShowSchedForm(!showSchedForm)}>
              {showSchedForm ? '✕ Cancel' : '+ New Schedule'}
            </button>
          </div>

          {showSchedForm && (
            <div className="card animate-slide-up" style={{ marginBottom: 24 }}>
              <h3 className="section-title">New Schedule</h3>
              <form onSubmit={createSchedule}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Device</label>
                    <select className="form-select" value={schedForm.device_id} onChange={e => setSchedForm({...schedForm, device_id: e.target.value})} required>
                      <option value="">Select device...</option>
                      {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Action</label>
                    <select className="form-select" value={schedForm.action} onChange={e => setSchedForm({...schedForm, action: e.target.value})}>
                      <option value="turn_on">Turn ON</option>
                      <option value="turn_off">Turn OFF</option>
                      <option value="set_value">Set Value</option>
                    </select>
                  </div>
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Time</label>
                    <input className="form-input" type="time" value={schedForm.scheduled_time} onChange={e => setSchedForm({...schedForm, scheduled_time: e.target.value})} required />
                  </div>
                  {schedForm.action === 'set_value' && (
                    <div className="form-group">
                      <label className="form-label">Value</label>
                      <input className="form-input" type="number" placeholder="0-100" value={schedForm.value} onChange={e => setSchedForm({...schedForm, value: e.target.value})} />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Days of Week</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {DAYS.map(d => (
                      <button key={d} type="button"
                        className={`btn btn-sm ${schedForm.days_of_week.includes(d) ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setSchedForm(prev => ({
                          ...prev,
                          days_of_week: prev.days_of_week.includes(d)
                            ? prev.days_of_week.filter(x => x !== d)
                            : [...prev.days_of_week, d]
                        }))}
                      >
                        {d.slice(0,3).charAt(0).toUpperCase()+d.slice(1,3)}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="btn btn-primary">Create Schedule</button>
              </form>
            </div>
          )}

          {schedules.length === 0 ? (
            <div className="empty-state"><div className="empty-state-icon">🕐</div><div className="empty-state-title">No schedules yet</div><div className="empty-state-text">Schedule devices to turn on/off automatically at specific times</div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {schedules.map(s => (
                <div key={s.id} className="card" style={{ padding: '14px 20px' }}>
                  <div className="flex-between">
                    <div className="flex-gap">
                      <span style={{ fontSize: 22 }}>🕐</span>
                      <div>
                        <strong>{s.device?.name}</strong>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {s.action.replace('_',' ')} at <strong>{s.scheduled_time}</strong>
                          {s.value !== null && ` (${s.value})`}
                          {' — '}
                          {s.days_of_week?.map(d => d.slice(0,3)).join(', ') || 'No days selected'}
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteSchedule(s.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
