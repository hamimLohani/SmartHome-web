// ═══════════════════════════════════════════════════════════
// AUTH MIDDLEWARE — JWT Verification
// ═══════════════════════════════════════════════════════════

const jwt = require('jsonwebtoken');
const supabase = require('../db/supabase');

/**
 * Verify JWT token from httpOnly cookie and attach user to request
 */
async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, phone, role, is_verified, avatar_url, created_at')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found. Please log in again.' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Email not verified. Please check your inbox.' });
    }

    // Update last active
    await supabase
      .from('users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', user.id);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid session. Please log in again.' });
    }
    return res.status(500).json({ error: 'Authentication failed.' });
  }
}

module.exports = authMiddleware;
