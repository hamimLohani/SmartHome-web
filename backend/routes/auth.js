// ═══════════════════════════════════════════════════════════
// AUTH ROUTES — Register, Login, Verify Email, Logout
// ═══════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const supabase = require('../db/supabase');
const { sendVerificationEmail, sendWelcomeEmail } = require('../mail/mailer');
const authMiddleware = require('../middleware/authMiddleware');

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ───────────────────────────────────────────────────────────
// POST /api/auth/register
// ───────────────────────────────────────────────────────────
router.post(
  '/register',
  authLimiter,
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Full name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email')
      .trim()
      .isEmail().withMessage('Valid email address is required')
      .normalizeEmail(),
    body('phone')
      .optional()
      .trim()
      .matches(/^\+?[\d\s-()]{7,20}$/).withMessage('Invalid phone number format'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain at least 1 uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least 1 number')
      .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least 1 symbol'),
    body('confirmPassword')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, phone, password } = req.body;

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, is_verified')
        .eq('email', email)
        .single();

      if (existingUser) {
        if (!existingUser.is_verified) {
          // Re-send verification email
          const token = crypto.randomBytes(32).toString('hex');
          const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

          await supabase
            .from('users')
            .update({ verification_token: token, verification_token_expires: expires })
            .eq('id', existingUser.id);

          await sendVerificationEmail(email, name, token);

          return res.status(200).json({
            message: 'Account exists but unverified. New verification email sent.',
          });
        }
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Create user
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          name,
          email,
          phone: phone || null,
          password_hash: passwordHash,
          verification_token: verificationToken,
          verification_token_expires: tokenExpires,
          role: 'client',
        })
        .select('id, name, email')
        .single();

      if (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Failed to create account. Please try again.' });
      }

      // Send verification email
      await sendVerificationEmail(email, name, verificationToken);

      res.status(201).json({
        message: 'Registration successful! Please check your email to verify your account.',
        user: { id: newUser.id, name: newUser.name, email: newUser.email },
      });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Server error. Please try again later.' });
    }
  }
);

// ───────────────────────────────────────────────────────────
// GET /api/auth/verify/:token
// ───────────────────────────────────────────────────────────
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, verification_token_expires')
      .eq('verification_token', token)
      .single();

    if (error || !user) {
      return res.status(400).json({ error: 'Invalid or expired verification link.' });
    }

    // Check if token has expired
    if (user.verification_token_expires && new Date(user.verification_token_expires) < new Date()) {
      return res.status(400).json({ error: 'Verification link has expired. Please register again.' });
    }

    // Verify the user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_verified: true,
        verification_token: null,
        verification_token_expires: null,
      })
      .eq('id', user.id);

    if (updateError) {
      return res.status(500).json({ error: 'Failed to verify email. Please try again.' });
    }

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);

    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Server error during verification.' });
  }
});

// ───────────────────────────────────────────────────────────
// POST /api/auth/login
// ───────────────────────────────────────────────────────────
router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Find user
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Check if verified
      if (!user.is_verified) {
        return res.status(403).json({
          error: 'Email not verified. Please check your inbox for the verification link.',
          needsVerification: true,
        });
      }

      // Compare password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Set httpOnly cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Update last active
      await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', user.id);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar_url: user.avatar_url,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error. Please try again later.' });
    }
  }
);

// ───────────────────────────────────────────────────────────
// POST /api/auth/logout
// ───────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ message: 'Logged out successfully' });
});

// ───────────────────────────────────────────────────────────
// GET /api/auth/me — Get current user
// ───────────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ───────────────────────────────────────────────────────────
// PUT /api/auth/profile — Update profile (name, phone)
// ───────────────────────────────────────────────────────────
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters.' });
    }
    const { data, error } = await supabase
      .from('users')
      .update({ name: name.trim(), phone: phone || null })
      .eq('id', req.user.id)
      .select('id, name, email, phone, role, is_verified')
      .single();
    if (error) throw error;
    res.json({ user: data, message: 'Profile updated.' });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ───────────────────────────────────────────────────────────
// PUT /api/auth/change-password
// ───────────────────────────────────────────────────────────
router.put('/change-password', authMiddleware, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Both current and new password required.' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    const { data: user, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();
    if (error || !user) return res.status(404).json({ error: 'User not found.' });

    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Current password is incorrect.' });

    const newHash = await bcrypt.hash(new_password, 12);
    await supabase.from('users').update({ password_hash: newHash }).eq('id', req.user.id);
    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password.' });
  }
});

module.exports = router;
