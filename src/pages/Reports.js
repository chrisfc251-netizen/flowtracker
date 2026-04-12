import { useState } from 'react';
import { format, getMonth, getYear, subMonths } from 'date-fns';
import { useTransactions } from '../hooks/useTransactions';
import { useSavingsGoals } from '../hooks/useSavingsGoals';
import { CategoryBreakdown } from '../components/dashboard/CategoryBreakdown';
import { BarChart, GoalsChart } from '../components/charts/Charts';
import {
  computeCategoryBreakdown, computeFixedVsVariable,
  computeMonthlyTotals, computeSummary, filterByMonth, filterByYear
} from '../lib/finance';
import {
  annualSavingsProjection, monthlyChartData,
  spendingByWeekday, weeklyChartData
} from '../lib/analytics';

function formatUSD(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

function StatRow({ label, value, sub, color = '#f1f5f9' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.875rem', borderBottom: '1px solid #1e293b' }}>
      <div>
        <p style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: 500 }}>{label}</p>
        {sub && <p style={{ fontSize: '0.75rem', color: '#475569' }}>{sub}</p>}
      </div>
      <p style={{ fontWeight: 700, color, fontSize: '1rem' }}>{value}</p>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.625rem', marginTop: '1.25rem' }}>
      {children}
    </p>
  );
}

export default function Reports() {
  const { transactions } = useTransactions();
  const { goals }        = useSavingsGoals();
  const [tab, setTab]    = useState('monthly');

  const now      = new Date();
  const curYear  = getYear(now);

  const [selMonth, setSelMonth] = useState(format(now, 'yyyy-MM'));
  const [selYear,  setSelYear]  = useState(String(curYear));

  const [y, m]   = selMonth.split('-').map(Number);
  const curData  = filterByMonth(transactions, y, m - 1);
  const prevDate = subMonths(new Date(y, m - 1, 1), 1);
  const prevData = filterByMonth(transactions, getYear(prevDate), getMonth(prevDate));

  const cur       = computeSummary(curData);
  const prev      = computeSummary(prevData);
  const fv        = computeFixedVsVariable(curData);
  const breakdown = computeCategoryBreakdown(curData);
  const weeklyData  = weeklyChartData(transactions, y, m - 1);
  const weekdayData = spendingByWeekday(curData);

  function delta(a, b) {
    if (!b) return null;
    const pct = Math.round(((a - b) / b) * 100);
    return pct >= 0 ? `+${pct}% vs prev month` : `${pct}% vs prev month`;
  }

  const yearData    = filterByYear(transactions, Number(selYear));
  const yearSummary = computeSummary(yearData);
  const monthTotals = computeMonthlyTotals(transactions, Number(selYear));
  const yearBreak   = computeCategoryBreakdown(yearData);
  const yearChart   = monthlyChartData(transactions, Number(selYear));
  const annual      = annualSavingsProjection(transactions);

  return (
    <div className="page">
      <h1 style={{ marginBottom: '1.25rem' }}>Reports</h1>

      <div style={{ display: 'flex', background: '#1e293b', borderRadius: 10, padding: 3, marginBottom: '1.25rem' }}>
        {['monthly', 'yearly', 'goals'].map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '0.55rem', borderRadius: 8, border: 'none',
            background: tab === t ? '#334155' : 'transparent',
            color: tab === t ? '#f1f5f9' : '#64748b',
            fontWeight: 600, fontSize: '0.8rem', textTransform: 'capitalize',
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s'
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── MONTHLY ── */}
      {tab === 'monthly' && (
        <>
          <input type="month" value={selMonth} onChange={(e) => setSelMonth(e.target.value)}
            style={{ marginBottom: '1.25rem', width: '100%' }} />

          <SectionTitle>Summary vs Previous Month</SectionTitle>
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <StatRow label="Income"   value={formatUSD(cur.income)}  color="#22c55e" sub={delta(cur.income, prev.income)} />
              <StatRow label="Expenses" value={formatUSD(cur.expense)} color="#f43f5e" sub={delta(cur.expense, prev.expense)} />
              <StatRow label="Balance"  value={formatUSD(cur.balance)} color={cur.balance >= 0 ? '#818cf8' : '#f43f5e'} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '0.875rem', color: '#cbd5e1', fontWeight: 500 }}>Savings Rate</p>
                <p style={{ fontWeight: 700, color: '#818cf8' }}>
                  {cur.income > 0 ? `${Math.max(0, Math.round((cur.balance / cur.income) * 100))}%` : '—'}
                </p>
              </div>
            </div>
          </div>

          <SectionTitle>Spending by Week</SectionTitle>
          <div className="card" style={{ marginBottom: 0 }}>
            <BarChart data={weeklyData} height={160} />
          </div>

          <SectionTitle>Average Spend by Weekday</SectionTitle>
          <div className="card" style={{ marginBottom: 0 }}>
            {weekdayData.map((d) => {
              const maxAvg = Math.max(...weekdayData.map((x) => x.avg), 1);
              const pct    = Math.round((d.avg / maxAvg) * 100);
              const isMax  = d.avg > 0 && d.avg === Math.max(...weekdayData.map((x) => x.avg));
              return (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                  <span style={{ width: 28, fontSize: '0.8rem', color: isMax ? '#f59e0b' : '#64748b', fontWeight: isMax ? 700 : 400, flexShrink: 0 }}>
                    {d.label}
                  </span>
                  <div style={{ flex: 1, background: '#0f172a', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: isMax ? '#f59e0b' : '#f43f5e', borderRadius: 4, opacity: 0.85 }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: isMax ? '#f59e0b' : '#64748b', width: 52, textAlign: 'right', flexShrink: 0 }}>
                    {d.avg > 0 ? formatUSD(d.avg) : '—'}
                  </span>
                  {isMax && <span style={{ fontSize: '0.75rem' }}>🔥</span>}
                </div>
              );
            })}
          </div>

          <SectionTitle>Fixed vs Variable Expenses</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[
              { label: 'Fixed',    value: fv.fixed,    color: '#818cf8', bg: 'rgba(129,140,248,.1)' },
              { label: 'Variable', value: fv.variable, color: '#f59e0b', bg: 'rgba(245,158,11,.1)'  },
            ].map((item) => (
              <div key={item.label} style={{ background: item.bg, borderRadius: 12, padding: '0.875rem', textAlign: 'center', border: `1px solid ${item.color}33` }}>
                <p style={{ fontSize: '0.7rem', color: item.color, fontWeight: 700, letterSpacing: '0.07em', marginBottom: '0.375rem' }}>{item.label.toUpperCase()}</p>
                <p style={{ fontWeight: 800, color: item.color, fontSize: '1rem' }}>{formatUSD(item.value)}</p>
                <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.25rem' }}>
                  {cur.expense > 0 ? Math.round((item.value / cur.expense) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>

          {breakdown.length > 0 && (
            <>
              <SectionTitle>Expense by Category</SectionTitle>
              <div className="card" style={{ marginBottom: 0 }}>
                <CategoryBreakdown breakdown={breakdown} type="expense" />
              </div>
            </>
          )}
        </>
      )}

      {/* ── YEARLY ── */}
      {tab === 'yearly' && (
        <>
          <select value={selYear} onChange={(e) => setSelYear(e.target.value)}
            style={{ marginBottom: '1.25rem', width: '100%' }}>
            {Array.from({ length: 5 }, (_, i) => curYear - 2 + i).map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>

          {annual && annual.avgMonthly !== 0 && (
            <>
              <SectionTitle>Annual Savings Projection</SectionTitle>
              <div style={{ background: annual.projected >= 0 ? 'rgba(129,140,248,.08)' : 'rgba(244,63,94,.08)', border: `1px solid ${annual.projected >= 0 ? 'rgba(129,140,248,.25)' : 'rgba(244,63,94,.25)'}`, borderRadius: 14, padding: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {[
                    { label: 'Saved so far',    value: formatUSD(annual.savedSoFar),  color: annual.savedSoFar  >= 0 ? '#818cf8' : '#f43f5e' },
                    { label: 'Monthly average', value: formatUSD(annual.avgMonthly),  color: annual.avgMonthly  >= 0 ? '#22c55e' : '#f43f5e' },
                    { label: 'Full year proj.', value: formatUSD(annual.projected),   color: annual.projected   >= 0 ? '#818cf8' : '#f43f5e' },
                    { label: 'Rest of year',    value: formatUSD(annual.remaining),   color: '#94a3b8' },
                  ].map((item) => (
                    <div key={item.label}>
                      <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.2rem' }}>{item.label}</p>
                      <p style={{ fontWeight: 800, color: item.color, fontSize: '0.95rem' }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <SectionTitle>Year {selYear} Summary</SectionTitle>
          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <StatRow label="Total Income"        value={formatUSD(yearSummary.income)}        color="#22c55e" />
              <StatRow label="Total Expenses"      value={formatUSD(yearSummary.expense)}       color="#f43f5e" />
              <StatRow label="Net Savings"         value={formatUSD(yearSummary.balance)}       color={yearSummary.balance >= 0 ? '#818cf8' : '#f43f5e'} />
              <StatRow label="Monthly Avg Expense" value={formatUSD(yearSummary.expense / 12)}  color="#94a3b8" />
            </div>
          </div>

          <SectionTitle>Income vs Expenses by Month</SectionTitle>
          <div className="card" style={{ marginBottom: 0 }}>
            <BarChart data={yearChart} height={180} />
          </div>

          <SectionTitle>Month by Month</SectionTitle>
          <div className="card" style={{ marginBottom: 0 }}>
            {monthTotals.map((mo) => {
              const bal     = mo.income - mo.expense;
              const hasData = mo.income > 0 || mo.expense > 0;
              return (
                <div key={mo.month} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #0f172a', opacity: hasData ? 1 : 0.3 }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', width: 32 }}>{mo.label}</span>
                  <span style={{ fontSize: '0.775rem', color: '#22c55e', width: 72, textAlign: 'right' }}>+{formatUSD(mo.income)}</span>
                  <span style={{ fontSize: '0.775rem', color: '#f43f5e', width: 72, textAlign: 'right' }}>-{formatUSD(mo.expense)}</span>
                  <span style={{ fontSize: '0.775rem', fontWeight: 700, color: bal >= 0 ? '#818cf8' : '#f43f5e', width: 72, textAlign: 'right' }}>{formatUSD(bal)}</span>
                </div>
              );
            })}
          </div>

          {yearBreak.length > 0 && (
            <>
              <SectionTitle>Expense Breakdown</SectionTitle>
              <div className="card" style={{ marginBottom: 0 }}>
                <CategoryBreakdown breakdown={yearBreak} type="expense" />
              </div>
            </>
          )}
        </>
      )}

      {/* ── GOALS ── */}
      {tab === 'goals' && (
        <>
          <SectionTitle>Goals Progress Chart</SectionTitle>
          {goals.length === 0 ? (
            <div className="card">
              <p style={{ color: '#64748b', textAlign: 'center' }}>No goals yet. Add one from the Dashboard.</p>
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: 0 }}>
                <GoalsChart goals={goals} />
              </div>

              <SectionTitle>Goal Details</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {goals.map((goal) => {
                  const current = Number(goal.current_amount || 0);
                  const target  = Number(goal.target_amount  || 0);
                  const pct     = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                  const left    = Math.max(target - current, 0);
                  const color   = pct >= 100 ? '#22c55e' : pct > 75 ? '#f59e0b' : '#818cf8';
                  return (
                    <div key={goal.id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong style={{ color: '#f1f5f9' }}>{goal.name}</strong>
                        <span style={{ color, fontWeight: 800 }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{ background: '#0f172a', borderRadius: 999, height: 8, overflow: 'hidden', marginBottom: '0.5rem' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b' }}>
                        <span>Saved: <strong style={{ color: '#f1f5f9' }}>{formatUSD(current)}</strong></span>
                        <span>Target: <strong style={{ color: '#f1f5f9' }}>{formatUSD(target)}</strong></span>
                        <span>Left: <strong style={{ color }}>{formatUSD(left)}</strong></span>
                      </div>
                      {goal.target_date && (
                        <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.375rem' }}>🗓 {goal.target_date}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      <div style={{ height: '1rem' }} />
    </div>
  );
}