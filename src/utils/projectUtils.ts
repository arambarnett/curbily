import { Project } from "../types";

export const getBudgetTier = (budget: number, contentType: string = 'feature'): Project['budgetTier'] => {
  if (contentType === 'short') return 'Short Film';
  if (budget <= 50000) return 'Micro-Budget';
  if (budget <= 300000) return 'Ultra Low';
  if (budget <= 700000) return 'Moderate Low';
  if (budget <= 1500000) return 'Tier 1';
  if (budget <= 3000000) return 'Tier 2';
  if (budget <= 7500000) return 'Tier 3';
  return 'Major Studio';
};
