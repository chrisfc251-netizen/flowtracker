import { differenceInDays, parseISO } from 'date-fns';

// ── Get upcoming fixed expenses within N days ─────────────────────────────
export function getUpcomingExpenses(fixedExpenses, days = 30) {
  const now    = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + days);

  return fixedExpenses.filter((e) => {
    if (!e.is_active) return false;
    const due = parseISO(e.next_due_date);
    return due >= now && due <= cutoff;
  });
}

// ── Total committed cash in next N days ──────────────────────────────────
export function getTotalUpcoming(fixedExpenses, days = 30) {
  return getUpcomingExpenses(fixedExpenses, days)
    .reduce((sum, e) => sum + Number(e.amount), 0);
}

// ── Safe spendable cash ───────────────────────────────────────────────────
export function computeSafeSpendable(currentBalance, fixedExpenses, days = 30) {
  const totalUpcoming = getTotalUpcoming(fixedExpenses, days);
  const safe          = currentBalance - totalUpcoming;
  return { safe, totalUpcoming, currentBalance };
}

// ── Cash flow status ──────────────────────────────────────────────────────
export function getCashFlowStatus(safe) {
  if (safe < 0)    return { label: 'Danger',   color: '#f43f5e', bg: 'rgba(244,63,94,.1)',   border: 'rgba(244,63,94,.3)',   icon: '🚨' };
  if (safe < 200)  return { label: 'Caution',  color: '#f59e0b', bg: 'rgba(245,158,11,.1)',  border: 'rgba(245,158,11,.3)',  icon: '⚠️' };
  return               { label: 'Safe',     color: '#22c55e', bg: 'rgba(34,197,94,.1)',   border: 'rgba(34,197,94,.3)',   icon: '✅' };
}

// ── Can I Afford It engine ────────────────────────────────────────────────
export function simulatePurchase({
  purchaseAmount,
  category,
  currentBalance,
  fixedExpenses,
  budgets,        // array of { category, amount_limit, spent }
  goals,          // array of savings goals
  dailySpendRate, // average daily spend (optional)
}) {
  const amount       = Number(purchaseAmount) || 0;
  const { safe, totalUpcoming } = computeSafeSpendable(currentBalance, fixedExpenses, 30);
  const afterPurchase = safe - amount;

  // Budget impact
  const budget       = budgets.find((b) => b.category === category);
  const budgetLeft   = budget ? budget.amount_limit - (budget.spent || 0) : null;
  const exceedsBudget = budgetLeft !== null && amount > budgetLeft;

  // Verdict
  let verdict, reason;
  if (amount > safe) {
    verdict = 'NO';
    reason  = `This purchase would exceed your safe spendable cash after upcoming bills.`;
  } else if (exceedsBudget) {
    verdict = 'CAUTION';
    reason  = `You can technically afford it, but it exceeds your ${category} budget by $${(amount - budgetLeft).toFixed(2)}.`;
  } else if (afterPurchase < 100) {
    verdict = 'CAUTION';
    reason  = `You can afford it, but you'd have very little buffer left ($${afterPurchase.toFixed(2)}).`;
  } else {
    verdict = 'YES';
    reason  = `This purchase fits within your safe budget without affecting your bills or goals.`;
  }

  // Wait suggestion
  let waitDays = null;
  if (verdict === 'NO' && dailySpendRate > 0) {
    // Rough estimate: how many days until enough income might cover it
    // Simple: difference / daily save rate
    const gap = amount - safe;
    waitDays  = Math.ceil(gap / (dailySpendRate * 0.3)); // assumes 30% of daily rate freed up
  }

  // Goal impact
  const goalImpacts = goals
    .filter((g) => {
      const remaining = Number(g.target_amount) - Number(g.current_amount || 0);
      return remaining > 0;
    })
    .map((g) => {
      const remaining  = Number(g.target_amount) - Number(g.current_amount || 0);
      const created    = g.created_at ? new Date(g.created_at) : new Date();
      const daysSince  = Math.max(differenceInDays(new Date(), created), 1);
      const avgPerDay  = Number(g.current_amount || 0) / daysSince;
      const delayDays  = avgPerDay > 0 ? Math.ceil(amount / avgPerDay) : null;
      return { name: g.name, delayDays };
    })
    .filter((g) => g.delayDays !== null && g.delayDays > 0);

  return {
    verdict,
    reason,
    amount,
    safe,
    afterPurchase,
    totalUpcoming,
    budgetLeft,
    exceedsBudget,
    waitDays,
    goalImpacts,
  };
}

// ── Goal pace estimator ───────────────────────────────────────────────────
export function estimateGoalPace(goal) {
  const current   = Number(goal.current_amount || 0);
  const target    = Number(goal.target_amount  || 0);
  const remaining = target - current;
  if (remaining <= 0) return { completed: true };

  const created   = goal.created_at ? new Date(goal.created_at) : new Date();
  const daysSince = Math.max(differenceInDays(new Date(), created), 1);
  const avgPerDay = current / daysSince;

  if (avgPerDay <= 0) return { completed: false, hasData: false };

  const daysLeft   = Math.ceil(remaining / avgPerDay);
  const weeksLeft  = Math.ceil(daysLeft / 7);
  const monthsLeft = Math.ceil(daysLeft / 30);

  return {
    completed: false,
    hasData:   true,
    avgPerDay,
    avgPerWeek:  avgPerDay * 7,
    avgPerMonth: avgPerDay * 30,
    daysLeft,
    weeksLeft,
    monthsLeft,
    label: daysLeft > 365
      ? `~${Math.round(daysLeft / 365)}yr`
      : daysLeft > 30
        ? `~${monthsLeft}mo`
        : `${daysLeft}d`,
  };
}