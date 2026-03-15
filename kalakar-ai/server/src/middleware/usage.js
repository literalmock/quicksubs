import { getDailyCreditsForPlan } from '../config/plans.js';
import { ensurePlanUsageState } from '../utils/planUtils.js';

export const consumeVideoCreditForUser = async (user) => {
  ensurePlanUsageState(user);

  if (user.credits <= 0) {
    const limit = getDailyCreditsForPlan(user.plan);
    const resetAt = user.lastCreditResetAt
      ? new Date(new Date(user.lastCreditResetAt).getTime() + 24 * 60 * 60 * 1000)
      : null;

    return {
      ok: false,
      status: 403,
      payload: {
        success: false,
        code: 'PLAN_LIMIT_REACHED',
        message: `Plan limit reached. ${user.plan} users can process ${limit} videos per day.`,
        plan: user.plan,
        creditsRemaining: 0,
        dailyLimit: limit,
        resetAt: resetAt ? resetAt.toISOString() : null,
      },
    };
  }

  user.credits -= 1;
  user.videosProcessed = (user.videosProcessed || 0) + 1;
  await user.save();

  return {
    ok: true,
    status: 200,
    payload: {
      success: true,
      creditsRemaining: user.credits,
      dailyLimit: getDailyCreditsForPlan(user.plan),
      plan: user.plan,
    },
  };
};

export const consumeVideoCredit = async (req, res, next) => {
  try {
    const result = await consumeVideoCreditForUser(req.user);
    if (!result.ok) {
      return res.status(result.status).json(result.payload);
    }

    next();
  } catch (err) {
    next(err);
  }
};
