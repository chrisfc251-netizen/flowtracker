// Pure SVG charts — no external chart library needed

function formatK(n) {
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'k';
  return '$' + Math.round(n);
}

// ── Bar Chart ─────────────────────────────────────────────────────────────
export function BarChart({ data, height = 180, showIncome = true, showExpense = true }) {
  if (!data || data.length === 0) return null;

  const W      = 300;
  const H      = height;
  const padL   = 38;
  const padB   = 32; // more space for labels
  const padT   = 16;
  const chartW = W - padL - 8;
  const chartH = H - padB - padT;
  const maxVal = Math.max(...data.flatMap((d) => [showIncome ? d.income : 0, showExpense ? d.expense : 0]), 1);
  const gap    = chartW / data.length;
  const barW   = Math.max(Math.floor(gap * 0.28), 4);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
      {/* Y gridlines */}
      {[0, 0.5, 1].map((pct) => {
        const y = padT + chartH * (1 - pct);
        return (
          <g key={pct}>
            <line x1={padL} y1={y} x2={W - 4} y2={y} stroke="#1e293b" strokeWidth={1} />
            <text x={padL - 4} y={y + 4} fill="#475569" fontSize={8} textAnchor="end">
              {formatK(maxVal * pct)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const cx   = padL + gap * i + gap / 2;
        const incH = (d.income  / maxVal) * chartH;
        const expH = (d.expense / maxVal) * chartH;

        // side by side: income left, expense right
        const incX = cx - barW - 1;
        const expX = cx + 1;

        return (
          <g key={i}>
            {showIncome && d.income > 0 && (
              <rect x={incX} y={padT + chartH - incH} width={barW} height={incH} rx={2} fill="#22c55e" opacity={0.85} />
            )}
            {showExpense && d.expense > 0 && (
              <rect x={expX} y={padT + chartH - expH} width={barW} height={expH} rx={2} fill="#f43f5e" opacity={0.85} />
            )}
            {/* X label below bars */}
            <text x={cx} y={padT + chartH + 14} fill="#475569" fontSize={8} textAnchor="middle">
              {d.label}
            </text>
          </g>
        );
      })}

      {/* Legend — bottom left, inside padB space */}
      {showIncome && showExpense && (
        <g>
          <rect x={padL} y={H - 12} width={7} height={7} rx={2} fill="#22c55e" />
          <text x={padL + 10} y={H - 6} fill="#64748b" fontSize={8}>Income</text>
          <rect x={padL + 52} y={H - 12} width={7} height={7} rx={2} fill="#f43f5e" />
          <text x={padL + 62} y={H - 6} fill="#64748b" fontSize={8}>Expense</text>
        </g>
      )}
    </svg>
  );
}

// ── Goals Progress Chart ──────────────────────────────────────────────────
export function GoalsChart({ goals }) {
  if (!goals || goals.length === 0) return null;

  const data = goals.map((g) => ({
    label:   g.name.length > 12 ? g.name.slice(0, 12) + '…' : g.name,
    current: Number(g.current_amount || 0),
    target:  Number(g.target_amount  || 1),
    pct:     Math.min(Math.round((Number(g.current_amount || 0) / Number(g.target_amount || 1)) * 100), 100),
  }));

  const rowH = 40;
  const W    = 300;
  const padL = 85;
  const H    = data.length * rowH + 8;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      {data.map((d, i) => {
        const y     = i * rowH + 6;
        const barW  = W - padL - 16;
        const fillW = (d.pct / 100) * barW;
        const color = d.pct >= 100 ? '#22c55e' : d.pct > 75 ? '#f59e0b' : '#818cf8';

        return (
          <g key={i}>
            {/* Label */}
            <text x={0} y={y + 10} fill="#cbd5e1" fontSize={10} dominantBaseline="middle">
              {d.label}
            </text>
            {/* Amounts below label */}
            <text x={0} y={y + 24} fill="#475569" fontSize={8}>
              ${d.current.toFixed(0)}/${d.target.toFixed(0)}
            </text>
            {/* BG bar */}
            <rect x={padL} y={y + 2} width={barW} height={12} rx={6} fill="#0f172a" />
            {/* Fill bar */}
            {fillW > 0 && (
              <rect x={padL} y={y + 2} width={fillW} height={12} rx={6} fill={color} opacity={0.85} />
            )}
            {/* % label */}
            <text x={W - 2} y={y + 12} fill={color} fontSize={9} textAnchor="end" fontWeight="bold">
              {d.pct}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Donut chart ───────────────────────────────────────────────────────────
export function DonutChart({ data, size = 120 }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const R  = size * 0.4;
  const r  = size * 0.24;

  let cumAngle = -Math.PI / 2;
  const slices = data.map((d) => {
    const angle      = (d.value / total) * 2 * Math.PI;
    const startAngle = cumAngle;
    cumAngle        += angle;
    const x1  = cx + R * Math.cos(startAngle);
    const y1  = cy + R * Math.sin(startAngle);
    const x2  = cx + R * Math.cos(cumAngle);
    const y2  = cy + R * Math.sin(cumAngle);
    const ix1 = cx + r * Math.cos(startAngle);
    const iy1 = cy + r * Math.sin(startAngle);
    const ix2 = cx + r * Math.cos(cumAngle);
    const iy2 = cy + r * Math.sin(cumAngle);
    const lg  = angle > Math.PI ? 1 : 0;
    return {
      ...d,
      path: `M ${ix1} ${iy1} L ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${lg} 0 ${ix1} ${iy1} Z`,
    };
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} opacity={0.9} />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#f1f5f9" fontSize={size * 0.1} fontWeight="bold">
        {data.length}
      </text>
      <text x={cx} y={cy + size * 0.1} textAnchor="middle" fill="#64748b" fontSize={size * 0.08}>
        cats
      </text>
    </svg>
  );
}