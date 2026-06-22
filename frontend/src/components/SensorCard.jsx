// ═══════════════════════════════════════════════════════════
// SENSOR CARD — Individual sensor display
// ═══════════════════════════════════════════════════════════

import './SensorCard.css';

const THRESHOLDS = {
  temperature: { warn: 35, danger: 45, unit: '°C', icon: '🌡️' },
  humidity: { warn: 80, danger: 95, unit: '%', icon: '💧' },
  gas: { warn: 30, danger: 50, unit: '%', icon: '⚡' },
  fire: { warn: 0.5, danger: 0.5, unit: '', icon: '🔥' },
  motion: { warn: null, danger: null, unit: '', icon: '📡' },
};

export default function SensorCard({ device, reading }) {
  const info = THRESHOLDS[device.type] || { icon: '📊', unit: '' };
  const value = reading?.raw_value ?? device.value ?? 0;
  
  let status = 'normal';
  if (device.type === 'fire' && (reading?.fire_detected || value > 0)) {
    status = 'danger';
  } else if (device.type === 'motion' && reading?.motion_detected) {
    status = 'active';
  } else if (info.danger && value >= info.danger) {
    status = 'danger';
  } else if (info.warn && value >= info.warn) {
    status = 'warning';
  }

  const displayValue = device.type === 'fire'
    ? (reading?.fire_detected ? 'DETECTED' : 'Safe')
    : device.type === 'motion'
    ? (reading?.motion_detected ? 'DETECTED' : 'Clear')
    : value;

  return (
    <div className={`sensor-card-widget ${status}`}>
      <div className="sensor-card-header">
        <span className="sensor-card-icon">{info.icon}</span>
        <div className="sensor-card-info">
          <span className="sensor-card-name">{device.name}</span>
          <span className="sensor-card-room">{device.rooms?.name || ''}</span>
        </div>
        {status !== 'normal' && status !== 'active' && (
          <span className={`badge badge-${status === 'danger' ? 'danger' : 'warning'}`}>
            {status === 'danger' ? '⚠ Alert' : '⚠ Warn'}
          </span>
        )}
      </div>
      <div className="sensor-card-value-area">
        <span className={`sensor-card-value ${status}`}>
          {displayValue}
        </span>
        {info.unit && <span className="sensor-card-unit">{info.unit}</span>}
      </div>
      {info.warn && (
        <div className="sensor-card-bar">
          <div
            className={`sensor-card-bar-fill ${status}`}
            style={{ width: `${Math.min(100, (value / (info.danger * 1.2)) * 100)}%` }}
          />
        </div>
      )}
      <div className="sensor-card-time">
        {reading?.recorded_at
          ? `Updated ${new Date(reading.recorded_at).toLocaleTimeString()}`
          : 'No data yet'}
      </div>
    </div>
  );
}
