import { differenceInDays } from 'date-fns';

// ── Balance Engine ────────────────────────────────────────────────────────
export function computeBalanceSplit(transactions) {
  let totalIncome  = 0;
  let totalExpense = 0;
  let totalSavings = 0;

  for (const t of transactions) {
    const amount = Number(t.amount || 0);
    if (t.type === 'income') {
      totalIncome  += amount;
      totalSavings += Number(t.savings_allocation || 0);
    } else if (t.type === 'expense') {
      totalExpense += amount;
    }
  }

  const totalBalance     = totalIncome - totalExpense;
  const availableBalance = totalBalance - totalSavings;

  return { totalIncome, totalExpense, totalBalance, totalSavings, availableBalance };
}

// ── Category weights ──────────────────────────────────────────────────────
export const EXPENSE_CATEGORY_WEIGHTS = {
  food:          0.28,
  housing:       0.25,
  transport:     0.15,
  health:        0.10,
  bills:         0.08,
  education:     0.06,
  entertainment: 0.04,
  shopping:      0.03,
  subscriptions: 0.01,
};

// ── Smart Budget Generator ────────────────────────────────────────────────
// categoryPriorities: array of { category, priority } from useCategoryPriorities
export function generateSmartBudget({ availableBalance, goals = [], categoryPriorities = [], existingExpenses = {} }) {
  // Build priority map from array
  const priorityMap = {};
  for (const cp of categoryPriorities) {
    priorityMap[cp.category] = cp.priority;
  }

  // Calculate goal reserve
  let goalReserve  = 0;
  const activeGoals = goals.filter((g) => {
    const pct = Number(g.current_amount || 0) / Number(g.target_amount || 1);
    return pct < 1 && g.target_date;
  });

  for (const goal of activeGoals) {
    const remaining = Number(goal.target_amount) - Number(goal.current_amount || 0);
    const daysLeft  = Math.max(differenceInDays(new Date(goal.target_date), new Date()), 1);
    const monthly   = Math.min((remaining / daysLeft) * 30, remaining);
    goalReserve    += monthly;
  }

  const spendableBudget = Math.max(availableBalance - goalReserve, 0);

  // Adjust weights based on priority
  const adjustedWeights = { ...EXPENSE_CATEGORY_WEIGHTS };
  const isTight = spendableBudget < availableBalance * 0.5;

  for (const cat of Object.keys(adjustedWeights)) {
    const priority = priorityMap[cat] || 'medium';
    if (isTight) {
      if (priority === 'low')    adjustedWeights[cat] *= 0.4;
      if (priority === 'medium') adjustedWeights[cat] *= 0.7;
      // high priority: no reduction
    }
  }

  const totalWeight = Object.values(adjustedWeights).reduce((s, v) => s + v, 0);
  const limits = {};
  for (const [cat, weight] of Object.entries(adjustedWeights)) {
    limits[cat] = Math.round((weight / totalWeight) * spendableBudget * 100) / 100;
  }

  return {
    limits,
    spendableBudget,
    goalReserve,
    activeGoals:  activeGoals.length,
    explanation: activeGoals.length > 0
      ? `Budget adjusted to reserve $${goalReserve.toFixed(2)} for ${activeGoals.length} active goal${activeGoals.length > 1 ? 's' : ''}. Low-priority categories reduced first.`
      : 'Budget distributed based on your category priorities and available balance.',
  };
}

// ── Priority-aware budget rebalancer ─────────────────────────────────────
export function rebalanceBudget({ limits, actuals, priorities }) {
  const result  = { ...limits };
  const changes = [];
  let   overflow = 0;

  for (const [cat, limit] of Object.entries(limits)) {
    const spent = actuals[cat] || 0;
    if (spent > limit) {
      overflow += spent - limit;
      changes.push({ cat, type: 'over', by: spent - limit });
    }
  }

  if (overflow === 0) return { result, changes, message: 'All categories within budget.' };

  const reducible = Object.entries(limits)
    .filter(([cat]) => {
      const p = priorities[cat] || 'medium';
      return p !== 'high' && (actuals[cat] || 0) < limits[cat];
    })
    .sort(([a], [b]) => {
      const order = { low: 0, medium: 1, high: 2 };
      return (order[priorities[a] || 'medium'] || 1) - (order[priorities[b] || 'medium'] || 1);
    });

  let remaining = overflow;
  for (const [cat, limit] of reducible) {
    if (remaining <= 0) break;
    const maxReduction = limit - (actuals[cat] || 0);
    const reduction    = Math.min(remaining, maxReduction);
    result[cat]   = Math.max(0, result[cat] - reduction);
    remaining    -= reduction;
    changes.push({ cat, type: 'reduced', by: reduction });
  }

  const overCats    = changes.filter((c) => c.type === 'over').map((c) => `${c.cat} (+$${c.by.toFixed(2)})`).join(', ');
  const reducedCats = changes.filter((c) => c.type === 'reduced').map((c) => `${c.cat} (-$${c.by.toFixed(2)})`).join(', ');
  const message     = overCats
    ? `Overspent in: ${overCats}. Reduced: ${reducedCats || 'none available'}.`
    : 'Rebalanced based on priorities.';

  return { result, changes, message };
}

// ── Financial Insights Engine ─────────────────────────────────────────────
export function generateInsights({ transactions, goals = [], targetSavings = null }) {
  if (transactions.length === 0) return [];

  const expenses = transactions.filter((t) => t.type === 'expense');
  const income   = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExp = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const savings  = transactions.reduce((s, t) => s + Number(t.savings_allocation || 0), 0);
  const balance  = income - totalExp;

  const catTotals = {};
  for (const t of expenses) {
    catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
  }

  const sorted   = Object.entries(catTotals).sort(([, a], [, b]) => b - a);
  const insights = [];

  if (sorted.length > 0) {
    const [topCat, topAmount] = sorted[0];
    const pctOfExpense = income > 0 ? (topAmount / income) * 100 : 0;

    for (const pct of [10, 15, 20]) {
      const saved  = topAmount * (pct / 100);
      const newBal = balance + saved;
      const label  = topCat.charAt(0).toUpperCase() + topCat.slice(1);

      let outcome = `your balance would improve by $${saved.toFixed(2)} to $${newBal.toFixed(2)}`;

      const helpedGoal = goals.find((g) => {
        const remaining = Number(g.target_amount) - Number(g.current_amount || 0);
        return remaining > 0 && saved >= remaining;
      });
      if (helpedGoal) outcome = `you would reach your "${helpedGoal.name}" goal ($${Number(helpedGoal.target_amount).toFixed(2)})`;

      insights.push({
        type: 'reduction', category: topCat, pct, saved, newBalance: newBal,
        message: `If you reduced ${label} spending by ${pct}% ($${saved.toFixed(2)}), ${outcome}.`,
        impact: saved,
      });
    }

    if (pctOfExpense > 35) {
      insights.push({
        type: 'warning', category: topCat,
        message: `${topCat.charAt(0).toUpperCase() + topCat.slice(1)} accounts for ${pctOfExpense.toFixed(0)}% of your income ($${topAmount.toFixed(2)}). Recommended max is 35%.`,
        impact: topAmount,
      });
    }
  }

  if (income > 0) {
    const savingsRate = (savings / income) * 100;
    if (savingsRate < 10) {
      const needed = income * 0.1 - savings;
      insights.push({ type: 'savings', message: `Your savings rate is ${savingsRate.toFixed(1)}%. To reach 10%, allocate $${needed.toFixed(2)} more from your next income.`, impact: needed });
    } else {
      insights.push({ type: 'positive', message: `Great job! You're saving ${savingsRate.toFixed(1)}% of your income ($${savings.toFixed(2)}).`, impact: savings });
    }
  }

  if (balance < 0) {
    insights.push({ type: 'critical', message: `Your balance is negative ($${balance.toFixed(2)}). You spent $${Math.abs(balance).toFixed(2)} more than you earned this period.`, impact: Math.abs(balance) });
  }

  return insights.sort((a, b) => b.impact - a.impact);
}

// ── Decision evaluator ────────────────────────────────────────────────────
export function evaluateDecisions({ transactions, budgets }) {
  const positives = [];
  const negatives = [];
  const catTotals = {};
  for (const t of transactions.filter((t) => t.type === 'expense')) {
    catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
  }
  for (const b of budgets) {
    const spent = catTotals[b.category] || 0;
    const diff  = spent - b.amount_limit;
    if (diff > 0)       negatives.push({ category: b.category, over: diff,           limit: b.amount_limit, spent });
    else if (diff < 0)  positives.push({ category: b.category, under: Math.abs(diff), limit: b.amount_limit, spent });
  }
  negatives.sort((a, b) => b.over - a.over);
  positives.sort((a, b) => b.under - a.under);
  return { positives, negatives };
}