// ── Budget Engine ─────────────────────────────────────────────────────────
// Pure functions — no side effects, no DB mutations.
// Takes stored budgets and returns effective budgets with redistribution applied.

/**
 * computeEffectiveBudgets
 *
 * @param {Array} budgets     - Array from DB: { category, amount_limit, is_active, priority? }
 * @param {Object} priorityMap - { category: 'high'|'medium'|'low' }
 * @returns {Array} - Same array with added fields:
 *   effectiveBudget  — what should be used everywhere in UI/calculations
 *   delta            — how much was added from redistribution (0 if none)
 *   redistributed    — boolean: did this category receive extra budget?
 */
export function computeEffectiveBudgets(budgets, priorityMap = {}) {
  if (!budgets || budgets.length === 0) return [];

  // 1. Separate active and inactive
  const inactive = budgets.filter((b) => b.is_active === false);
  const active   = budgets.filter((b) => b.is_active !== false); // default true

  // 2. Pool of budget to redistribute
  const naPool = inactive.reduce((sum, b) => sum + Number(b.amount_limit), 0);

  // 3. If nothing to redistribute, just return with effectiveBudget = amount_limit
  if (naPool === 0 || active.length === 0) {
    return budgets.map((b) => ({
      ...b,
      effectiveBudget: Number(b.amount_limit),
      delta:           0,
      redistributed:   false,
    }));
  }

  // 4. Find target group by priority (high first, then medium, then low)
  const getPriority = (b) => priorityMap[b.category] || 'medium';

  let targets = active.filter((b) => getPriority(b) === 'high');
  if (targets.length === 0) targets = active.filter((b) => getPriority(b) === 'medium');
  if (targets.length === 0) targets = active; // fallback: all active

  // 5. Distribute proportionally within target group
  const totalTargetBudget = targets.reduce((sum, b) => sum + Number(b.amount_limit), 0);

  const deltaMap = {};
  for (const t of targets) {
    const share = totalTargetBudget > 0
      ? (Number(t.amount_limit) / totalTargetBudget) * naPool
      : naPool / targets.length; // equal split if all 0
    deltaMap[t.category] = Math.round(share * 100) / 100;
  }

  // 6. Build result array
  return budgets.map((b) => {
    const isActive = b.is_active !== false;
    const delta    = deltaMap[b.category] || 0;
    return {
      ...b,
      effectiveBudget: isActive ? Number(b.amount_limit) + delta : 0,
      delta,
      redistributed: delta > 0,
    };
  });
}

/**
 * getEffectiveBudget — convenience lookup
 * @param {Array}  effectiveBudgets  - output of computeEffectiveBudgets
 * @param {string} category
 * @returns {number}
 */
export function getEffectiveBudget(effectiveBudgets, category) {
  const found = effectiveBudgets.find((b) => b.category === category);
  return found ? found.effectiveBudget : 0;
}

/**
 * buildEffectiveBudgetStatus — like computeBudgetStatus but uses effectiveBudget
 * @param {Array} transactions  - filtered monthly transactions
 * @param {Array} effectiveBudgets - output of computeEffectiveBudgets
 * @returns {Array} - { category, amount_limit, effectiveBudget, spent, over, ... }
 */
export function buildEffectiveBudgetStatus(transactions, effectiveBudgets) {
  const byCategory = {};
  for (const t of transactions.filter((t) => t.type === 'expense')) {
    byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
  }

  return effectiveBudgets
    .filter((b) => b.is_active !== false) // only show active
    .map((b) => ({
      ...b,
      spent: byCategory[b.category] || 0,
      over:  (byCategory[b.category] || 0) > b.effectiveBudget,
    }));
}