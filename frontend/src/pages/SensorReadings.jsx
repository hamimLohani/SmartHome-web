// ═══════════════════════════════════════════════════════════
// SENSOR READINGS PAGE — Dashboard with charts
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../hooks/useRealtime';
import SensorCard from '../components/SensorCard';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

export default function SensorReadings() {
  const { api } = useAuth();
  const [sensors, setSensors] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(null);
  const [history, setHistory] = useState([]);
  const [hours, setHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [houses, setHouses] = useState([]);

  useEffect(() => {
    fetchHouses();
  }, []);

  useRealtime('sensor_readings', 'INSERT', () => {
    if (houses[0]?.id) fetchSensors(houses[0].id);
  });

  async function fetchHouses() {
    try {
      const data = await api('/houses');
      setHouses(data.houses || []);
      if (data.houses?.[0]?.id) {
        fetchSensors(data.houses[0].id);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }

  async function fetchSensors(houseId) {
    try {
      const data = await api(`/sensors/house/${houseId}`);
      setSensors(data.sensors || []);
    } catch { toast.error('Failed to load sensors'); }
  }

  async function fetchHistory(deviceId) {
    try {
      const data = await api(`/sensors/device/${deviceId}/history?hours=${hours}`);
      setHistory((data.readings || []).map(r => ({
        time: new Date(r.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperature: r.temperature,
        humidity: r.humidity,
        gas_level: r.gas_level,
        value: r.raw_value,
      })));
    } catch { /* silent */ }
  }

  useEffect(() => {
    if (selectedSensor) fetchHistory(selectedSensor.device.id);
  }, [selectedSensor, hours]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton skeleton-title" />
        <div className="grid-auto">
          {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-card" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📊 Sensor Dashboard</h1>
      <p className="page-subtitle">Real-time monitoring of all your sensors</p>

      {sensors.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📡</div>
          <div className="empty-state-title">No sensors found</div>
          <div className="empty-state-text">Add sensor devices to your rooms to start monitoring</div>
        </div>
      ) : (
        <>
          <div className="grid-auto" style={{ marginBottom: 32 }}>
            {sensors.map((s, i) => (
              <div key={i} onClick={() => setSelectedSensor(s)} style={{ cursor: 'pointer' }}>
                <SensorCard device={s.device} reading={s.latestReading} />
              </div>
            ))}
          </div>

          {selectedSensor && (
            <div className="card">
              <div className="flex-between" style={{ marginBottom: 20 }}>
                <h3 className="section-title" style={{ margin: 0 }}>
                  📈 {selectedSensor.device.name} History
                </h3>
                <div className="flex-gap">
                  {[6, 12, 24, 48].map(h => (
                    <button
                      key={h}
                      className={`btn btn-sm ${hours === h ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setHours(h)}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>

              {history.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="time" stroke="var(--text-tertiary)" fontSize={11} />
                    <YAxis stroke="var(--text-tertiary)" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    />
                    <Legend />
                    {selectedSensor.device.type === 'temperature' && (
                      <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} dot={false} name="Temperature (°C)" />
                    )}
                    {selectedSensor.device.type === 'humidity' && (
                      <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} dot={false} name="Humidity (%)" />
                    )}
                    {selectedSensor.device.type === 'gas' && (
                      <Line type="monotone" dataKey="gas_level" stroke="#f97316" strokeWidth={2} dot={false} name="Gas Level (%)" />
                    )}
                    {!['temperature', 'humidity', 'gas'].includes(selectedSensor.device.type) && (
                      <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Value" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-state-text">No history data available for this time range</div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
