export const PLAN_CONFIG = {
  free: { videosPerDay: 3 },
  beta: { videosPerDay: 50 },
  pro: { videosPerDay: 500 },
};

export const DEFAULT_PLAN = 'free';

export const getPlanConfig = (plan) => PLAN_CONFIG[plan] || PLAN_CONFIG[DEFAULT_PLAN];

export const getDailyCreditsForPlan = (plan) => getPlanConfig(plan).videosPerDay;
