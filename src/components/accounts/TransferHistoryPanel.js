/**
 * TransferHistoryPanel.js
 * Full transfer history with filtering (by account, date range, direction)
 * and per-account audit summary. Never affects income/expense.
 */
import { useState, useMemo } from 'react';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { ArrowLeftRight, Trash2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react';

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n || 0);
}

export function TransferHistoryPanel({ transfers, accounts, onDelete }) {
  const [expanded,    setExpanded]    = useState(false);
  const [filterAccId, setFilterAccId] = useState('all');
  const [filterDir,   setFilterDir]   = useState('all');   // 'all' | 'in' | 'out'
  const [dateFrom,    setDateFrom]    = useState('');
  const [dateTo,      setDateTo]      = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const accountIds = accounts.map((a) => a.id);

  // Audit summary per account
  const audit = useMemo(() => {
    const result = {};
    for (const id of accountIds) result[id] = { totalIn: 0, totalOut: 0, net: 0 };
    for (const tr of transfers) {
      const amt = Number(tr.amount);
      if (result[tr.from_account_id] !== undefined) {
        result[tr.from_account_id].totalOut += amt;
        result[tr.from_account_id].net      -= amt;
      }
      if (result[tr.to_account_id] !== undefined) {
        result[tr.to_account_id].totalIn += amt;
        result[tr.to_account_id].net     += amt;
      }
    }
    return result;
  }, [transfers, accountIds]);

  const globalIn  = transfers.reduce((s, tr) => s + Number(tr.amount), 0);
  // (global in == global out by definition — each transfer moves the same amount)

  // Filtered list
  const filtered = useMemo(() => {
    return transfers.filter((tr) => {
      if (filterAccId !== 'all') {
        if (filterDir === 'out' && tr.from_account_id !== filterAccId) return false;
        if (filterDir === 'in'  && tr.to_account_id   !== filterAccId) return false;
        if (filterDir === 'all' && tr.from_account_id !== filterAccId && tr.to_account_id !== filterAccId) return false;
      }
      const d = parseISO(tr.date);
      if (dateFrom && isBefore(d, startOfDay(parseISO(dateFrom)))) return false;
      if (dateTo   && isAfter(d,  endOfDay(parseISO(dateTo))))     return false;
      return true;
    });
  }, [transfers, filterAccId, filterDir, dateFrom, dateTo]);

  const hasActiveFilter = filterAccId !== 'all' || filterDir !== 'all' || dateFrom || dateTo;

  if (transfers.length === 0) return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: '1.125rem', marginBottom: '1.25rem' }}>
      <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Transfer History</p>
      <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
        <p style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>↔️</p>
        <p style={{ fontSize: '0.875rem', color: '#475569' }}>No transfers yet. Move money between accounts to see history here.</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, overflow: 'hidden', marginBottom: '1.25rem' }}>

      {/* Header row */}
      <button onClick={() => setExpanded((p) => !p)} style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '1rem', fontFamily: 'inherit',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeftRight size={15} color="#818cf8" />
          <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
            Transfer History
          </p>
          <span style={{ background: 'rgba(129,140,248,.15)', color: '#818cf8', fontSize: '0.68rem', fontWeight: 700, borderRadius: 20, padding: '2px 8px' }}>
            {transfers.length}
          </span>
          {hasActiveFilter && (
            <span style={{ background: 'rgba(245,158,11,.15)', color: '#f59e0b', fontSize: '0.65rem', fontWeight: 700, borderRadius: 20, padding: '2px 7px' }}>
              filtered
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={14} color="#475569" /> : <ChevronDown size={14} color="#475569" />}
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid #334155' }}>

          {/* Audit summary strip */}
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(99,102,241,.06)', borderBottom: '1px solid #1e2d40' }}>
            <p style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              All-Time Audit
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {accounts.map((a) => {
                const s = audit[a.id] || { totalIn: 0, totalOut: 0, net: 0 };
                if (s.totalIn === 0 && s.totalOut === 0) return null;
                return (
                  <div key={a.id} style={{ background: '#0f172a', borderRadius: 10, padding: '0.5rem 0.75rem', border: `1px solid ${a.color}33`, minWidth: 130 }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: a.color, marginBottom: '0.3rem' }}>{a.icon} {a.name}</p>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <div>
                        <p style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: 700 }}>IN</p>
                        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f1f5f9' }}>{fmt(s.totalIn)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.6rem', color: '#f43f5e', fontWeight: 700 }}>OUT</p>
                        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#f1f5f9' }}>{fmt(s.totalOut)}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.6rem', color: '#818cf8', fontWeight: 700 }}>NET</p>
                        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: s.net >= 0 ? '#22c55e' : '#f43f5e' }}>
                          {s.net >= 0 ? '+' : ''}{fmt(s.net)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter bar */}
          <div style={{ padding: '0.625rem 1rem', borderBottom: '1px solid #1e2d40', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
            <p style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>
              {filtered.length} transfer{filtered.length !== 1 ? 's' : ''}
            </p>
            <button onClick={() => setShowFilters((p) => !p)} style={{
              background: hasActiveFilter ? 'rgba(245,158,11,.12)' : 'rgba(100,116,139,.1)',
              border: `1px solid ${hasActiveFilter ? 'rgba(245,158,11,.3)' : '#334155'}`,
              borderRadius: 8, padding: '4px 10px', color: hasActiveFilter ? '#f59e0b' : '#64748b',
              fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {showFilters ? 'Hide filters' : 'Filter'} {hasActiveFilter ? '●' : ''}
            </button>
          </div>

          {showFilters && (
            <div style={{ padding: '0.75rem 1rem', background: '#16213a', borderBottom: '1px solid #1e2d40', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {/* Account filter */}
              <div>
                <label style={labelStyle}>Account</label>
                <select value={filterAccId} onChange={(e) => setFilterAccId(e.target.value)} style={selectStyle}>
                  <option value="all">All accounts</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
                </select>
              </div>
              {/* Direction filter */}
              {filterAccId !== 'all' && (
                <div>
                  <label style={labelStyle}>Direction</label>
                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    {[['all','Both'],['in','Received'],['out','Sent']].map(([v,l]) => (
                      <button key={v} onClick={() => setFilterDir(v)} style={{
                        flex: 1, padding: '0.4rem', borderRadius: 7, fontSize: '0.75rem', fontWeight: 600,
                        border: `1px solid ${filterDir === v ? '#818cf8' : '#334155'}`,
                        background: filterDir === v ? 'rgba(129,140,248,.15)' : 'transparent',
                        color: filterDir === v ? '#818cf8' : '#64748b',
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}>{l}</button>
                    ))}
                  </div>
                </div>
              )}
              {/* Date range */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>From date</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={selectStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>To date</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={selectStyle} />
                </div>
              </div>
              {hasActiveFilter && (
                <button onClick={() => { setFilterAccId('all'); setFilterDir('all'); setDateFrom(''); setDateTo(''); }} style={{
                  background: 'transparent', border: '1px solid #334155', borderRadius: 8, padding: '0.4rem',
                  color: '#64748b', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Transfer list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxHeight: 460, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.875rem', color: '#475569' }}>No transfers match your filters.</p>
              </div>
            ) : (
              filtered.map((tr, idx) => (
                <div key={tr.id} style={{
                  padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                  borderBottom: idx < filtered.length - 1 ? '1px solid #1e2d40' : 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Account flow */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem' }}>{tr.from_account?.icon}</span>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>{tr.from_account?.name}</span>
                      <ArrowLeftRight size={11} color="#334155" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: '0.85rem' }}>{tr.to_account?.icon}</span>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>{tr.to_account?.name}</span>
                    </div>
                    {tr.note && (
                      <p style={{ fontSize: '0.72rem', color: '#475569', marginBottom: '0.15rem' }}>
                        "{tr.note}"
                      </p>
                    )}
                    <p style={{ fontSize: '0.68rem', color: '#334155' }}>
                      {format(parseISO(tr.date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <p style={{ fontWeight: 800, color: '#818cf8', fontSize: '0.9375rem', flexShrink: 0 }}>
                    {fmt(tr.amount)}
                  </p>
                  <button onClick={() => onDelete(tr.id)} style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: '#334155', padding: 4, borderRadius: 6, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginBottom: '0.3rem' };
const selectStyle = {
  background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
  color: '#f1f5f9', padding: '0.55rem 0.75rem', fontSize: '0.85rem',
  width: '100%', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};