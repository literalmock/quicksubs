import { DEFAULT_PLAN, getDailyCreditsForPlan } from '../config/plans.js';

const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

export const isBetaUser = (user) => user?.plan === 'beta';

export const ensurePlanUsageState = (user) => {
  const currentPlan = user.plan || DEFAULT_PLAN;
  const resetAt = user.lastCreditResetAt ? new Date(user.lastCreditResetAt) : null;

  if (!resetAt || dayKey(resetAt) !== dayKey(new Date())) {
    user.credits = getDailyCreditsForPlan(currentPlan);
    user.lastCreditResetAt = new Date();
  }

  // Keep betaAccess in sync with plan intent.
  user.betaAccess = currentPlan === 'beta' || currentPlan === 'pro';

  return user;
};
