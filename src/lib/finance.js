import { format, getMonth, getYear, parseISO } from 'date-fns';

export function filterByDay(transactions, dateStr) {
  return transactions.filter((t) => t.date === dateStr);
}

export function filterByMonth(transactions, year, month) {
  return transactions.filter((t) => {
    const d = parseISO(t.date);
    return getYear(d) === year && getMonth(d) === month;
  });
}

export function filterByYear(transactions, year) {
  return transactions.filter((t) => getYear(parseISO(t.date)) === year);
}

export function filterBySearch(transactions, query) {
  if (!query) return transactions;
  const q = query.toLowerCase();
  return transactions.filter(
    (t) =>
      (t.description || '').toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
  );
}

export function computeSummary(transactions) {
  const income  = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  return { income, expense, balance: income - expense };
}

export function computeCategoryBreakdown(transactions) {
  const map = {};
  for (const t of transactions) {
    if (!map[t.category]) map[t.category] = { income: 0, expense: 0, total: 0 };
    map[t.category][t.type] += Number(t.amount);
    map[t.category].total   += Number(t.amount);
  }
  return Object.entries(map).map(([category, vals]) => ({ category, ...vals }));
}

export function computeFixedVsVariable(transactions) {
  const expense = transactions.filter((t) => t.type === 'expense');
  const fixed    = expense.filter((t) => t.nature === 'fixed').reduce((s, t) => s + Number(t.amount), 0);
  const variable = expense.filter((t) => t.nature === 'variable').reduce((s, t) => s + Number(t.amount), 0);
  return { fixed, variable };
}

export function computeMonthlyTotals(transactions, year) {
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i,
    label: format(new Date(year, i, 1), 'MMM'),
    income: 0,
    expense: 0
  }));
  for (const t of transactions) {
    const d = parseISO(t.date);
    if (getYear(d) !== year) continue;
    const m = getMonth(d);
    months[m][t.type] += Number(t.amount);
  }
  return months;
}

export function computeBudgetStatus(transactions, budgets) {
  const byCategory = {};
  for (const t of transactions.filter((t) => t.type === 'expense')) {
    byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
  }
  return budgets.map((b) => ({
    ...b,
    spent:   byCategory[b.category] || 0,
    over:    (byCategory[b.category] || 0) > b.amount_limit
  }));
}
