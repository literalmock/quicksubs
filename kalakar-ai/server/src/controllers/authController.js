import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import BetaCode from '../models/BetaCode.js';
import { getDailyCreditsForPlan } from '../config/plans.js';
import { ensurePlanUsageState, isBetaUser } from '../utils/planUtils.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Remove password from output
  const userObj = user.toObject();
  delete userObj.password;

  res.status(statusCode).json({ success: true, user: userObj });
};

// ── Signup ────────────────────────────────────────────
export const signup = async (req, res, next) => {
  try {
    const { name, email, password, betaCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    let plan = 'free';

    if (betaCode) {
      const code = String(betaCode).trim().toUpperCase();
      const claimed = await BetaCode.findOneAndUpdate(
        { code, $expr: { $lt: ['$uses', '$maxUses'] } },
        { $inc: { uses: 1 } },
        { new: true },
      );

      if (!claimed) {
        return res.status(400).json({ success: false, message: 'Invalid or exhausted beta code' });
      }

      plan = 'beta';
    }

    const user = await User.create({
      name,
      email,
      password,
      plan,
      credits: getDailyCreditsForPlan(plan),
      betaAccess: plan === 'beta' || plan === 'pro',
      lastCreditResetAt: new Date(),
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// ── Login ─────────────────────────────────────────────
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ── Logout ────────────────────────────────────────────
export const logout = (_req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.json({ success: true, message: 'Logged out' });
};

// ── Get Current User ──────────────────────────────────
export const getMe = async (req, res) => {
  ensurePlanUsageState(req.user);
  await req.user.save();
  res.json({
    success: true,
    user: req.user,
    featureFlags: {
      experimentalProcessing: isBetaUser(req.user),
      highResolutionExport: isBetaUser(req.user),
    },
  });
};

// ── Admin: Promote to beta ───────────────────────────
export const promoteBeta = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.plan = 'beta';
    user.betaAccess = true;
    user.credits = getDailyCreditsForPlan('beta');
    user.lastCreditResetAt = new Date();
    await user.save();

    res.json({ success: true, message: 'User promoted to beta', user });
  } catch (err) {
    next(err);
  }
};
