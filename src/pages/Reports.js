import { useState } from 'react';
import { format, getMonth, getYear, subMonths } from 'date-fns';
import { useTransactions } from '../hooks/useTransactions';
import { CategoryBreakdown } from '../components/dashboard/CategoryBreakdown';
import {
  computeCategoryBreakdown, computeFixedVsVariable,
  computeMonthlyTotals, computeSummary, filterByMonth, filterByYear
} from '../lib/finance';
import { formatUSD } from '../lib/constants';

function StatRow({ label, value, sub, color = '#f1f5f9' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.875rem', borderBottom: '1px solid #1e293b' }}>
      <div>
        <p style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 500 }}>{label}</p>
        {sub && <p style={{ fontSize: '0.75rem', color: '#475569' }}>{sub}</p>}
      </div>
      <p style={{ fontWeight: 700, color, fontSize: '1rem' }}>{value}</p>
    </div>
  );
}

export default function Reports() {
  const { transactions } = useTransactions();
  const [tab, setTab]   = useState('monthly');

  const now       = new Date();
  const curYear   = getYear(now);
  const curMonth  = getMonth(now);
  const [selYear, setSelYear] = useState(String(curYear));
  const [selMonth, setSelMonth] = useState(format(now, 'yyyy-MM'));

  // Monthly report
  const [y, m]    = selMonth.split('-').map(Number);
  const curData   = filterByMonth(transactions, y, m - 1);
  const prevDate  = subMonths(new Date(y, m - 1, 1), 1);
  const prevData  = filterByMonth(transactions, getYear(prevDate), getMonth(prevDate));

  const cur  = computeSummary(curData);
  const prev = computeSummary(prevData);
  const fv   = computeFixedVsVariable(curData);
  const breakdown = computeCategoryBreakdown(curData);

  function delta(a, b) {
    if (b === 0) return null;
    const pct = Math.round(((a - b) / b) * 100);
    return pct >= 0 ? `+${pct}% vs prev` : `${pct}% vs prev`;
  }

  // Yearly report
  const yearData    = filterByYear(transactions, Number(selYear));
  const yearSummary = computeSummary(yearData);
  const monthTotals = computeMonthlyTotals(transactions, Number(selYear));
  const yearBreak   = computeCategoryBreakdown(yearData);

  return (
    <div className="page">
      <h1 style={{ marginBottom: '1.25rem' }}>Reports</h1>

      {/* Tab */}
      <div style={{ display: 'flex', background: '#1e293b', borderRadius: 10, padding: 3, marginBottom: '1.25rem' }}>
        {['monthly','yearly'].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '0.55rem', borderRadius: 8, border: 'none',
            background: tab === t ? '#334155' : 'transparent',
            color: tab === t ? '#f1f5f9' : '#64748b',
            fontWeight: 600, fontSize: '0.85rem', textTransform: 'capitalize', transition: 'all .2s'
          }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'monthly' && (
        <>
          <input type="month" value={selMonth} onChange={(e) => setSelMonth(e.target.value)}
            style={{ marginBottom: '1.25rem' }} />

          {/* Summary vs prev */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Summary vs Previous Month</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <StatRow label="Income" value={formatUSD(cur.income)} color="#22c55e"
                sub={delta(cur.income, prev.income)} />
              <StatRow label="Expenses" value={formatUSD(cur.expense)} color="#f43f5e"
                sub={delta(cur.expense, prev.expense)} />
              <StatRow label="Net Balance" value={formatUSD(cur.balance)} color={cur.balance >= 0 ? '#818cf8' : '#f43f5e'} />
              <StatRow label="Savings Rate"
                value={cur.income > 0 ? `${Math.max(0, Math.round((cur.balance / cur.income) * 100))}%` : '—'}
                color="#818cf8" />
            </div>
          </div>

          {/* Fixed vs variable */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Fixed vs Variable Expenses</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {[
                { label: 'Fixed',    value: fv.fixed,    color: '#818cf8', bg: 'rgba(129,140,248,.1)' },
                { label: 'Variable', value: fv.variable, color: '#f59e0b', bg: 'rgba(245,158,11,.1)' }
              ].map((item) => (
                <div key={item.label} style={{ flex: 1, background: item.bg, borderRadius: 10, padding: '0.875rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: item.color, fontWeight: 600, marginBottom: '0.375rem' }}>{item.label.toUpperCase()}</p>
                  <p style={{ fontWeight: 700, color: item.color, fontSize: '1rem' }}>{formatUSD(item.value)}</p>
                  <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.25rem' }}>
                    {cur.expense > 0 ? Math.round((item.value / cur.expense) * 100) : 0}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          {breakdown.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>Expense Breakdown</h3>
              <CategoryBreakdown breakdown={breakdown} type="expense" />
            </div>
          )}
        </>
      )}

      {tab === 'yearly' && (
        <>
          <select value={selYear} onChange={(e) => setSelYear(e.target.value)} style={{ marginBottom: '1.25rem' }}>
            {Array.from({ length: 5 }, (_, i) => curYear - 2 + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Year summary */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Year {selYear} Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <StatRow label="Total Income"   value={formatUSD(yearSummary.income)}  color="#22c55e" />
              <StatRow label="Total Expenses" value={formatUSD(yearSummary.expense)} color="#f43f5e" />
              <StatRow label="Net Savings"    value={formatUSD(yearSummary.balance)} color={yearSummary.balance >= 0 ? '#818cf8' : '#f43f5e'} />
              <StatRow label="Avg/Month Expense" value={formatUSD(yearSummary.expense / 12)} color="#94a3b8" />
            </div>
          </div>

          {/* Monthly totals table */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Month by Month</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {monthTotals.map((mo) => {
                const bal = mo.income - mo.expense;
                const hasData = mo.income > 0 || mo.expense > 0;
                return (
                  <div key={mo.month} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.5rem 0', borderBottom: '1px solid #1e293b',
                    opacity: hasData ? 1 : 0.35
                  }}>
                    <span style={{ fontSize: '0.875rem', color: '#94a3b8', width: 36 }}>{mo.label}</span>
                    <span style={{ fontSize: '0.8rem', color: '#22c55e', width: 80, textAlign: 'right' }}>+{formatUSD(mo.income)}</span>
                    <span style={{ fontSize: '0.8rem', color: '#f43f5e', width: 80, textAlign: 'right' }}>-{formatUSD(mo.expense)}</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: bal >= 0 ? '#818cf8' : '#f43f5e', width: 80, textAlign: 'right' }}>{formatUSD(bal)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {yearBreak.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>Expense Breakdown</h3>
              <CategoryBreakdown breakdown={yearBreak} type="expense" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
