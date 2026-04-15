import { BarChart2, LayoutDashboard, List, Target, Wallet, Receipt } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/',             Icon: LayoutDashboard, label: 'Dashboard'    },
  { to: '/transactions', Icon: List,            label: 'Transactions' },
  { to: '/accounts',     Icon: Wallet,          label: 'Accounts'     },
  { to: '/bills',        Icon: Receipt,         label: 'Bills'        },
  { to: '/budgets',      Icon: Target,          label: 'Budgets'      },
];

export function BottomNav() {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#1e293b', borderTop: '1px solid #334155',
      display: 'flex', alignItems: 'stretch',
      height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      zIndex: 100
    }}>
      {ITEMS.map(({ to, Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '0.2rem', textDecoration: 'none',
            color: isActive ? '#818cf8' : '#64748b',
            fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em',
            paddingTop: '0.5rem', transition: 'color 0.15s'
          })}
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
