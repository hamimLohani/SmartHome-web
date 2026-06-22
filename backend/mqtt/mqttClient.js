// ═══════════════════════════════════════════════════════════
// MQTT CLIENT — HiveMQ Cloud Connection
// Handles ESP32 communication via MQTT
// ═══════════════════════════════════════════════════════════

const mqtt = require('mqtt');
const supabase = require('../db/supabase');

let mqttClient = null;

/**
 * Initialize MQTT connection to HiveMQ Cloud
 */
function initMQTT() {
  const host = process.env.HIVEMQ_HOST;
  const port = process.env.HIVEMQ_PORT || 8883;
  const username = process.env.HIVEMQ_USERNAME;
  const password = process.env.HIVEMQ_PASSWORD;

  if (!host || !username || !password) {
    console.warn('⚠️  MQTT credentials not configured. MQTT features disabled.');
    console.warn('   Set HIVEMQ_HOST, HIVEMQ_USERNAME, HIVEMQ_PASSWORD in your .env file.');
    return null;
  }

  const connectUrl = `mqtts://${host}:${port}`;

  mqttClient = mqtt.connect(connectUrl, {
    username,
    password,
    protocol: 'mqtts',
    reconnectPeriod: 5000,
    connectTimeout: 30000,
  });

  mqttClient.on('connect', () => {
    console.log('✅ MQTT connected to HiveMQ Cloud');

    // Subscribe to all smart home topics
    mqttClient.subscribe('smarthome/#', { qos: 1 }, (err) => {
      if (err) {
        console.error('❌ MQTT subscribe error:', err);
      } else {
        console.log('📡 Subscribed to smarthome/#');
      }
    });
  });

  mqttClient.on('message', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      await handleMQTTMessage(topic, payload);
    } catch (err) {
      console.error('❌ MQTT message parse error:', err.message);
    }
  });

  mqttClient.on('error', (err) => {
    console.error('❌ MQTT connection error:', err.message);
  });

  mqttClient.on('reconnect', () => {
    console.log('🔄 MQTT reconnecting...');
  });

  mqttClient.on('close', () => {
    console.log('🔌 MQTT connection closed');
  });

  return mqttClient;
}

/**
 * Handle incoming MQTT messages and update database
 */
async function handleMQTTMessage(topic, payload) {
  const parts = topic.split('/');
  // Topic format: smarthome/{mac_address}/{type}/{pin?}/{subtype?}

  if (parts.length < 3) return;

  const macAddress = parts[1];
  const messageType = parts[2];

  switch (messageType) {
    case 'heartbeat':
      await handleHeartbeat(macAddress, payload);
      break;

    case 'sensor':
      if (parts[3]) {
        await handleSensorData(macAddress, parseInt(parts[3]), payload);
      }
      break;

    case 'status':
      await handleDeviceStatus(macAddress, payload);
      break;

    default:
      console.log(`📨 Unknown MQTT message type: ${messageType}`, payload);
  }
}

/**
 * Handle ESP32 heartbeat — update board online status
 */
async function handleHeartbeat(macAddress, payload) {
  const { ip, rssi, firmware } = payload;

  const { error } = await supabase
    .from('esp32_boards')
    .update({
      is_online: true,
      last_seen: new Date().toISOString(),
      ip_address: ip || null,
      signal_strength: rssi || null,
      firmware_version: firmware || '1.0.0',
    })
    .eq('mac_address', macAddress);

  if (error) {
    console.error(`❌ Heartbeat update failed for ${macAddress}:`, error.message);
  }
}

/**
 * Handle sensor data from ESP32
 */
async function handleSensorData(macAddress, pin, payload) {
  // Find the device by board MAC and pin
  const { data: board } = await supabase
    .from('esp32_boards')
    .select('id')
    .eq('mac_address', macAddress)
    .single();

  if (!board) return;

  const { data: device } = await supabase
    .from('devices')
    .select('id, type, room_id')
    .eq('board_id', board.id)
    .eq('pin_number', pin)
    .single();

  if (!device) return;

  // Build sensor reading record
  const reading = {
    device_id: device.id,
    raw_value: payload.value,
    recorded_at: new Date().toISOString(),
  };

  // Map value to correct field based on sensor type
  switch (device.type) {
    case 'temperature':
      reading.temperature = payload.value;
      break;
    case 'humidity':
      reading.humidity = payload.value;
      break;
    case 'gas':
      reading.gas_level = payload.value;
      break;
    case 'fire':
      reading.fire_detected = payload.value > 0;
      break;
    case 'motion':
      reading.motion_detected = payload.value > 0;
      break;
  }

  // Insert sensor reading
  await supabase.from('sensor_readings').insert(reading);

  // Update device current value
  await supabase
    .from('devices')
    .update({ value: payload.value })
    .eq('id', device.id);

  // Check for emergency conditions
  await checkAlertConditions(device, payload.value);
}

/**
 * Handle device status updates from ESP32
 */
async function handleDeviceStatus(macAddress, payload) {
  const { data: board } = await supabase
    .from('esp32_boards')
    .select('id')
    .eq('mac_address', macAddress)
    .single();

  if (!board) return;

  if (payload.pin !== undefined) {
    await supabase
      .from('devices')
      .update({
        is_on: payload.value > 0,
        value: payload.value,
      })
      .eq('board_id', board.id)
      .eq('pin_number', payload.pin);
  }
}

/**
 * Check for alert conditions and create notifications
 */
async function checkAlertConditions(device, value) {
  // Find the house owner for notifications
  const { data: room } = await supabase
    .from('rooms')
    .select('house_id, houses(user_id)')
    .eq('id', device.room_id)
    .single();

  if (!room || !room.houses) return;

  const userId = room.houses.user_id;
  let notification = null;

  switch (device.type) {
    case 'temperature':
      if (value > 35) {
        notification = {
          title: '🌡️ High Temperature Alert',
          message: `Temperature reading of ${value}°C detected in ${device.name}. This exceeds the safe threshold of 35°C.`,
          type: 'warning',
        };
      }
      break;

    case 'gas':
      if (value > 50) {
        notification = {
          title: '⚡ Gas Leak Detected!',
          message: `Gas level at ${value}% in ${device.name}. DANGER: Exceeds 50% threshold. Take immediate action!`,
          type: 'emergency',
        };
      }
      break;

    case 'fire':
      if (value > 0) {
        notification = {
          title: '🔥 FIRE DETECTED!',
          message: `Fire sensor triggered in ${device.name}. EMERGENCY: Evacuate immediately and contact fire services!`,
          type: 'emergency',
        };
      }
      break;
  }

  if (notification) {
    await supabase.from('notifications').insert({
      user_id: userId,
      ...notification,
    });
  }
}

/**
 * Publish a control command to an ESP32 device
 */
function publishCommand(macAddress, pin, action, value) {
  if (!mqttClient || !mqttClient.connected) {
    console.warn('⚠️  MQTT not connected. Cannot send command.');
    return false;
  }

  const topic = `smarthome/${macAddress}/device/${pin}/control`;
  const payload = JSON.stringify({ pin, action, value });

  mqttClient.publish(topic, payload, { qos: 1 }, (err) => {
    if (err) {
      console.error(`❌ MQTT publish error:`, err.message);
    } else {
      console.log(`📤 Command sent: ${topic} → ${payload}`);
    }
  });

  return true;
}

/**
 * Get the MQTT client instance
 */
function getClient() {
  return mqttClient;
}

module.exports = { initMQTT, publishCommand, getClient };
