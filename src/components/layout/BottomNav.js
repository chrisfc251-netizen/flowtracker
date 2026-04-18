import { BarChart2, LayoutDashboard, List, Target, MoreHorizontal, CalendarCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/',             Icon: LayoutDashboard, label: 'Home'         },
  { to: '/transactions', Icon: List,            label: 'Transactions' },
  { to: '/planning',     Icon: CalendarCheck,   label: 'Planning'     },
  { to: '/goals',        Icon: Target,          label: 'Goals'        },
  { to: '/more',         Icon: MoreHorizontal,  label: 'More'         },
];

export function BottomNav() {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#1e293b', borderTop: '1px solid #334155',
      display: 'flex', alignItems: 'stretch',
      height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      zIndex: 100,
      backdropFilter: 'blur(12px)',
    }}>
      {ITEMS.map(({ to, Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '0.2rem', textDecoration: 'none',
            color: isActive ? '#818cf8' : '#475569',
            fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.04em',
            paddingTop: '0.5rem', transition: 'color 0.15s',
          })}
        >
          {({ isActive }) => (
            <>
              <div style={{
                padding: '0.3rem 0.75rem', borderRadius: 8,
                background: isActive ? 'rgba(129,140,248,.12)' : 'transparent',
                transition: 'background .15s'
              }}>
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.8} />
              </div>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

