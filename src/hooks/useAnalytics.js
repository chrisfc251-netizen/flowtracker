import { useMemo } from 'react';
import { getMonth, getYear } from 'date-fns';
import {
  detectUnusualSpending,
  mostExpensiveWeekday,
  predictMonthEnd,
  annualSavingsProjection,
  computeFinancialScore,
  spendingByWeekday,
} from '../lib/analytics';
import { computeBudgetStatus, filterByMonth } from '../lib/finance';

export function useAnalytics({ transactions, budgets }) {
  const now   = new Date();
  const year  = getYear(now);
  const month = getMonth(now);

  const monthlyTx    = useMemo(() => filterByMonth(transactions, year, month), [transactions, year, month]);
  const budgetStatus = useMemo(() => computeBudgetStatus(monthlyTx, budgets), [monthlyTx, budgets]);
  const unusual      = useMemo(() => detectUnusualSpending(transactions), [transactions]);
  const weekday      = useMemo(() => mostExpensiveWeekday(transactions), [transactions]);
  const prediction   = useMemo(() => predictMonthEnd(transactions, year, month), [transactions, year, month]);
  const annual       = useMemo(() => annualSavingsProjection(transactions), [transactions]);
  const weekdayData  = useMemo(() => spendingByWeekday(transactions), [transactions]);

  return {
    budgetStatus,
    unusual,
    weekday,
    prediction,
    annual,
    weekdayData,
  };
}