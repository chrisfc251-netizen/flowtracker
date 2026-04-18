import { format, getDay, parseISO, subMonths, getMonth, getYear, differenceInDays, differenceInWeeks } from 'date-fns';

// ── Score financiero 0-100 ────────────────────────────────────────────────
export function computeFinancialScore({ income, expense, balance, budgets, budgetStatus, savingsRate, streak }) {
  let score = 50;
  if (income > 0) {
    const rate = balance / income;
    if (rate >= 0.3) score += 25;
    else if (rate >= 0.2) score += 20;
    else if (rate >= 0.1) score += 12;
    else if (rate >= 0) score += 5;
    else score -= 15;
  }
  const overBudget = budgetStatus.filter((b) => b.over).length;
  const totalBudgets = budgetStatus.length;
  if (totalBudgets > 0) {
    const ratio = overBudget / totalBudgets;
    if (ratio === 0) score += 15;
    else if (ratio <= 0.25) score += 5;
    else score -= 10;
  }
  if (streak > 6) score += 10;
  else if (streak > 2) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreLabel(score) {
  if (score >= 85) return { label: 'Excellent', color: '#22c55e' };
  if (score >= 70) return { label: 'Good',      color: '#818cf8' };
  if (score >= 50) return { label: 'Fair',       color: '#f59e0b' };
  return                  { label: 'Needs work', color: '#f43f5e' };
}

// ── Patrones de gasto por día de semana ──────────────────────────────────
export function spendingByWeekday(transactions) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const totals = Array(7).fill(0);
  const counts = Array(7).fill(0);
  transactions.filter((t) => t.type === 'expense').forEach((t) => {
    const d = getDay(parseISO(t.date));
    totals[d] += Number(t.amount);
    counts[d]++;
  });
  return days.map((label, i) => ({
    label,
    total: totals[i],
    avg: counts[i] > 0 ? totals[i] / counts[i] : 0,
    count: counts[i],
  }));
}

export function mostExpensiveWeekday(transactions) {
  const data = spendingByWeekday(transactions);
  const max  = data.reduce((a, b) => (b.avg > a.avg ? b : a), data[0]);
  return max.avg > 0 ? max : null;
}

// ── Predicción fin de mes ────────────────────────────────────────────────
//
// FIX: projectedBalance now excludes savings_allocation so it only shows
// money the user can actually spend — consistent with availableBalance
// everywhere else in the app.
//
// Formula:
//   projectedAvailable = income - savings - projectedExpenses
//
export function predictMonthEnd(transactions, year, month) {
  const now         = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysPassed  = now.getDate();
  const daysLeft    = daysInMonth - daysPassed;

  const monthTx = transactions.filter((t) => {
    const d = parseISO(t.date);
    return getMonth(d) === month && getYear(d) === year;
  });

  const incSoFar      = monthTx
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0);

  const expSoFar      = monthTx
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0);

  // Sum of savings set aside this month (from income transactions)
  const savingsSoFar  = monthTx
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + Number(t.savings_allocation || 0), 0);

  if (daysPassed === 0) return null;

  const dailyExpRate    = expSoFar / daysPassed;
  const projectedExp    = expSoFar + dailyExpRate * daysLeft;

  // Available = income - savings - expenses  (savings excluded from spendable)
  const projectedAvailable = incSoFar - savingsSoFar - projectedExp;

  return {
    projectedExpense:  projectedExp,
    projectedBalance:  projectedAvailable,   // now means "available to spend"
    savingsSoFar,
    dailyRate:         dailyExpRate,
    daysLeft,
    onTrack:           projectedAvailable >= 0,
  };
}

// ── Alerta de gasto inusual ──────────────────────────────────────────────
export function detectUnusualSpending(transactions) {
  const now        = new Date();
  const todayStr   = format(now, 'yyyy-MM-dd');
  const todayExp   = transactions
    .filter((t) => t.type === 'expense' && t.date === todayStr)
    .reduce((s, t) => s + Number(t.amount), 0);

  if (todayExp === 0) return null;

  const past30 = transactions.filter((t) => {
    if (t.type !== 'expense' || t.date === todayStr) return false;
    const diff = differenceInDays(now, parseISO(t.date));
    return diff > 0 && diff <= 30;
  });

  if (past30.length === 0) return null;

  const dailyMap = {};
  past30.forEach((t) => {
    dailyMap[t.date] = (dailyMap[t.date] || 0) + Number(t.amount);
  });
  const days   = Object.values(dailyMap);
  const avgDay = days.reduce((s, v) => s + v, 0) / days.length;

  if (avgDay === 0) return null;
  const ratio = todayExp / avgDay;
  if (ratio >= 2) return { todayExp, avgDay, ratio: Math.round(ratio) };
  return null;
}

// ── Sugerencia de ahorro semanal para goals ──────────────────────────────
export function goalWeeklySuggestion(goal) {
  if (!goal.target_date) return null;
  const remaining = Number(goal.target_amount) - Number(goal.current_amount || 0);
  if (remaining <= 0) return null;
  const weeks = differenceInWeeks(new Date(goal.target_date), new Date());
  if (weeks <= 0) return null;
  return { weekly: remaining / weeks, weeks, remaining };
}

// ── Totales mensuales para gráfica ───────────────────────────────────────
export function monthlyChartData(transactions, year) {
  const months = Array.from({ length: 12 }, (_, i) => ({
    label: format(new Date(year, i, 1), 'MMM'),
    month: i,
    income: 0,
    expense: 0,
  }));
  transactions.forEach((t) => {
    const d = parseISO(t.date);
    if (getYear(d) !== year) return;
    const m = getMonth(d);
    months[m][t.type] += Number(t.amount);
  });
  return months;
}

// ── Totales por semana del mes actual ────────────────────────────────────
export function weeklyChartData(transactions, year, month) {
  const weeks = [
    { label: 'Wk 1', income: 0, expense: 0 },
    { label: 'Wk 2', income: 0, expense: 0 },
    { label: 'Wk 3', income: 0, expense: 0 },
    { label: 'Wk 4', income: 0, expense: 0 },
  ];
  transactions
    .filter((t) => {
      const d = parseISO(t.date);
      return getMonth(d) === month && getYear(d) === year;
    })
    .forEach((t) => {
      const day  = parseISO(t.date).getDate();
      const week = Math.min(Math.floor((day - 1) / 7), 3);
      weeks[week][t.type] += Number(t.amount);
    });
  return weeks;
}

// ── Goals progress para gráfica ──────────────────────────────────────────
export function goalsChartData(goals) {
  return goals.map((g) => ({
    label:   g.name.length > 12 ? g.name.slice(0, 12) + '…' : g.name,
    current: Number(g.current_amount || 0),
    target:  Number(g.target_amount  || 1),
    pct:     Math.min(Math.round((Number(g.current_amount || 0) / Number(g.target_amount || 1)) * 100), 100),
  }));
}

// ── Proyección anual de ahorro ───────────────────────────────────────────
export function annualSavingsProjection(transactions) {
  const now   = new Date();
  const year  = getYear(now);
  const month = getMonth(now);
  if (month === 0) return null;

  let totalSaved = 0;
  for (let m = 0; m < month; m++) {
    const inc = transactions.filter((t) => { const d=parseISO(t.date); return t.type==='income'  && getMonth(d)===m && getYear(d)===year; }).reduce((s,t)=>s+Number(t.amount),0);
    const exp = transactions.filter((t) => { const d=parseISO(t.date); return t.type==='expense' && getMonth(d)===m && getYear(d)===year; }).reduce((s,t)=>s+Number(t.amount),0);
    totalSaved += inc - exp;
  }

  const avgMonthly = totalSaved / month;
  const projected  = avgMonthly * 12;
  const remaining  = avgMonthly * (12 - month);

  return { avgMonthly, projected, savedSoFar: totalSaved, remaining };
}