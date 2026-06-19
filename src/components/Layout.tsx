import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, KanbanSquare,
  TrendingUp, Calculator, Settings, Store, Receipt, LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/vendas', label: 'Vendas', icon: ShoppingCart },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/financeiro', label: 'Financeiro', icon: TrendingUp },
  { to: '/despesas', label: 'Despesas', icon: Receipt },
  { to: '/kanban', label: 'Tarefas', icon: KanbanSquare },
  { to: '/calculadora', label: 'Calculadora', icon: Calculator },
  { to: '/configs', label: 'Configurações', icon: Settings },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-4 py-5 flex items-center gap-3 border-b border-slate-700">
          <div className="w-9 h-9 bg-shopee-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Store size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Gestão Shopee</p>
            <p className="text-slate-400 text-xs">Cardoso e-Shop</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-shopee-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-slate-700 space-y-1">
          <p className="text-slate-500 text-xs px-1 truncate">{user?.email}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut size={15} /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
