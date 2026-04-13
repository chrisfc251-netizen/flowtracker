// ── Balance Engine ────────────────────────────────────────────────────────
// Computes Total Balance, Savings, and Available Balance from transactions.
// Savings come from the savings_allocation field on each income transaction.

export function computeBalanceSplit(transactions) {
  let totalIncome  = 0;
  let totalExpense = 0;
  let totalSavings = 0;

  for (const t of transactions) {
    const amount = Number(t.amount || 0);
    if (t.type === 'income') {
      totalIncome += amount;
      totalSavings += Number(t.savings_allocation || 0);
    } else if (t.type === 'expense') {
      totalExpense += amount;
    }
  }

  const totalBalance     = totalIncome - totalExpense;
  const availableBalance = totalBalance - totalSavings;

  return {
    totalIncome,
    totalExpense,
    totalBalance,
    totalSavings,
    availableBalance,
  };
}

// ── Smart Budget Generator ────────────────────────────────────────────────
// Generates suggested spending limits per category based on available balance
// and active savings goals.

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

export function generateSmartBudget({ availableBalance, goals = [], categoryPriorities = [], existingExpenses = {} }) {
  // Calculate how much is already committed to goals this month
  let goalReserve = 0;
  const activeGoals = goals.filter((g) => {
    const pct = Number(g.current_amount || 0) / Number(g.target_amount || 1);
    return pct < 1;
  });

  for (const goal of activeGoals) {
    const remaining = Number(goal.target_amount) - Number(goal.current_amount || 0);
    if (goal.target_date) {
      const { differenceInDays } = require('date-fns');
      const daysLeft = Math.max(differenceInDays(new Date(goal.target_date), new Date()), 1);
      const monthlyNeeded = Math.min((remaining / daysLeft) * 30, remaining);
      goalReserve += monthlyNeeded;
    }
  }

  const spendableBudget = Math.max(availableBalance - goalReserve, 0);

  // Build priority map
  const priorityMap = {};
  for (const cp of categoryPriorities) {
    priorityMap[cp.category] = cp.priority;
  }

  // Generate limits
  const limits = {};
  let totalWeight = 0;

  // Reduce weight for low-priority categories first if budget is tight
  const adjustedWeights = { ...EXPENSE_CATEGORY_WEIGHTS };
  for (const [cat, weight] of Object.entries(adjustedWeights)) {
    const priority = priorityMap[cat] || 'medium';
    if (spendableBudget < availableBalance * 0.5) {
      if (priority === 'low')    adjustedWeights[cat] = weight * 0.4;
      if (priority === 'medium') adjustedWeights[cat] = weight * 0.7;
    }
    totalWeight += adjustedWeights[cat];
  }

  for (const [cat, weight] of Object.entries(adjustedWeights)) {
    limits[cat] = Math.round((weight / totalWeight) * spendableBudget * 100) / 100;
  }

  return {
    limits,
    spendableBudget,
    goalReserve,
    activeGoals: activeGoals.length,
    explanation: activeGoals.length > 0
      ? `Budget adjusted to reserve $${goalReserve.toFixed(2)} for ${activeGoals.length} active goal${activeGoals.length > 1 ? 's' : ''}.`
      : 'Budget based on available balance with no active goals.',
  };
}

// ── Priority-aware budget rebalancer ─────────────────────────────────────
// When a category overspends, redistribute the excess to lower-priority categories.

export function rebalanceBudget({ limits, actuals, priorities }) {
  const result   = { ...limits };
  const changes  = [];
  let   overflow = 0;

  // Find overages
  for (const [cat, limit] of Object.entries(limits)) {
    const spent = actuals[cat] || 0;
    if (spent > limit) {
      overflow += spent - limit;
      changes.push({ cat, type: 'over', by: spent - limit });
    }
  }

  if (overflow === 0) return { result, changes, message: 'All categories within budget.' };

  // Sort reducible categories by priority (low first, then medium)
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
  const message     = `Overspent in: ${overCats}. Reduced: ${reducedCats}.`;

  return { result, changes, message };
}

// ── Financial Insights Engine ─────────────────────────────────────────────
// Generates quantitative, actionable insights from transaction data.

export function generateInsights({ transactions, goals = [], targetSavings = null }) {
  if (transactions.length === 0) return [];

  const expenses = transactions.filter((t) => t.type === 'expense');
  const income   = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExp = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const savings  = transactions.reduce((s, t) => s + Number(t.savings_allocation || 0), 0);
  const balance  = income - totalExp;

  // Category totals
  const catTotals = {};
  for (const t of expenses) {
    catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
  }

  const sorted = Object.entries(catTotals).sort(([, a], [, b]) => b - a);
  const insights = [];

  // 1. Identify highest-impact category
  if (sorted.length > 0) {
    const [topCat, topAmount] = sorted[0];
    const pctOfExpense = income > 0 ? (topAmount / income) * 100 : 0;

    for (const pct of [10, 15, 20]) {
      const saved  = topAmount * (pct / 100);
      const newBal = balance + saved;
      const label  = topCat.charAt(0).toUpperCase() + topCat.slice(1);

      let outcome = `your balance would improve by $${saved.toFixed(2)} to $${newBal.toFixed(2)}`;

      // Check if it helps reach a goal
      const helpedGoal = goals.find((g) => {
        const remaining = Number(g.target_amount) - Number(g.current_amount || 0);
        return remaining > 0 && saved >= remaining;
      });
      if (helpedGoal) {
        outcome = `you would reach your "${helpedGoal.name}" goal ($${Number(helpedGoal.target_amount).toFixed(2)})`;
      }

      insights.push({
        type:    'reduction',
        category: topCat,
        pct,
        saved,
        newBalance: newBal,
        message: `If you reduced ${label} spending by ${pct}% ($${saved.toFixed(2)}), ${outcome}.`,
        impact:  saved,
      });
    }

    // 2. Category concentration warning
    if (pctOfExpense > 35) {
      insights.push({
        type:    'warning',
        category: topCat,
        message: `${topCat.charAt(0).toUpperCase() + topCat.slice(1)} accounts for ${pctOfExpense.toFixed(0)}% of your income ($${topAmount.toFixed(2)}). This is above the recommended 35%.`,
        impact:  topAmount,
      });
    }
  }

  // 3. Savings rate
  if (income > 0) {
    const savingsRate = (savings / income) * 100;
    if (savingsRate < 10) {
      const needed = income * 0.1 - savings;
      insights.push({
        type:    'savings',
        message: `Your savings rate is ${savingsRate.toFixed(1)}%. To reach 10%, allocate $${needed.toFixed(2)} more from your next income.`,
        impact:  needed,
      });
    } else {
      insights.push({
        type:    'positive',
        message: `Great job! You're saving ${savingsRate.toFixed(1)}% of your income ($${savings.toFixed(2)}). Keep it up.`,
        impact:  savings,
      });
    }
  }

  // 4. Balance health
  if (balance < 0) {
    insights.push({
      type:    'critical',
      message: `Your balance is negative ($${balance.toFixed(2)}). You spent $${Math.abs(balance).toFixed(2)} more than you earned this period.`,
      impact:  Math.abs(balance),
    });
  }

  // 5. Target savings check
  if (targetSavings && savings < targetSavings) {
    const gap = targetSavings - savings;
    insights.push({
      type:    'goal',
      message: `You are $${gap.toFixed(2)} short of your $${targetSavings.toFixed(2)} savings target for this period.`,
      impact:  gap,
    });
  }

  return insights.sort((a, b) => b.impact - a.impact);
}

// ── Decision quality evaluator ────────────────────────────────────────────
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
    if (diff > 0) {
      negatives.push({ category: b.category, over: diff, limit: b.amount_limit, spent });
    } else if (diff < 0) {
      positives.push({ category: b.category, under: Math.abs(diff), limit: b.amount_limit, spent });
    }
  }

  negatives.sort((a, b) => b.over - a.over);
  positives.sort((a, b) => b.under - a.under);

  return { positives, negatives };
}