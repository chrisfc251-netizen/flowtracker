import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, CalendarRange, Target, Settings } from 'lucide-react';

const TABS = [
  { to: '/',             label: 'Home',    Icon: LayoutDashboard },
  { to: '/transactions', label: 'Money',   Icon: ArrowLeftRight  },
  { to: '/plan',         label: 'Plan',    Icon: CalendarRange   },
  { to: '/goals',        label: 'Goals',   Icon: Target          },
  { to: '/settings',     label: 'More',    Icon: Settings        },
];

export function BottomNav() {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: 'calc(64px + env(safe-area-inset-bottom, 0px))',
      background: 'var(--bg-card)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      zIndex: 300,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            color: isActive ? 'var(--ink-1)' : 'var(--ink-4)',
            textDecoration: 'none',
            fontSize: '0.65rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            fontFamily: 'var(--font-sans)',
            transition: 'color 0.15s',
          })}
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
