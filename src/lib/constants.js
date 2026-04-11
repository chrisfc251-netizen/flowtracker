export const INCOME_CATEGORIES = [
  { value: 'salary',      label: 'Salary',      icon: '💼' },
  { value: 'freelance',   label: 'Freelance',   icon: '🧑‍💻' },
  { value: 'investments', label: 'Investments', icon: '📈' },
  { value: 'gifts',       label: 'Gifts',       icon: '🎁' },
  { value: 'other',       label: 'Other',       icon: '💰' }
];

export const EXPENSE_CATEGORIES = [
  { value: 'food',          label: 'Food',          icon: '🍔' },
  { value: 'transport',     label: 'Transport',     icon: '🚗' },
  { value: 'housing',       label: 'Housing',       icon: '🏠' },
  { value: 'health',        label: 'Health',        icon: '❤️' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { value: 'shopping',      label: 'Shopping',      icon: '🛍️' },
  { value: 'education',     label: 'Education',     icon: '📚' },
  { value: 'bills',         label: 'Bills',         icon: '⚡' },
  { value: 'subscriptions', label: 'Subscriptions', icon: '🔄' },
  { value: 'other',         label: 'Other',         icon: '💸' }
];

export const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export function getCategoryMeta(value) {
  return ALL_CATEGORIES.find((c) => c.value === value) || { value, label: value, icon: '💲' };
}

export function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

export const TRANSACTION_TYPES = [
  { value: 'income',  label: 'Income' },
  { value: 'expense', label: 'Expense' }
];

export const NATURE_OPTIONS = [
  { value: 'fixed',    label: 'Fixed' },
  { value: 'variable', label: 'Variable' }
];

export const NAV_ITEMS = [
  { path: '/',          label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/transactions', label: 'Transactions', icon: 'List' },
  { path: '/budgets',   label: 'Budgets',   icon: 'Target' },
  { path: '/reports',   label: 'Reports',   icon: 'BarChart2' },
  { path: '/settings',  label: 'Settings',  icon: 'Settings' }
];
