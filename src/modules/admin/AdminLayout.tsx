import {
  ArrowLeft,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Receipt,
  Shield,
  Users,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

const NAV = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Assinantes', to: '/admin/tenants', icon: Users },
  { label: 'Planos', to: '/admin/plans', icon: Receipt },
  { label: 'Auditoria', to: '/admin/audit', icon: ClipboardList },
];

export default function AdminLayout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 bg-slate-900 border-r border-white/[0.06] flex flex-col">
        {/* Header */}
        <div className="px-5 h-[60px] flex items-center gap-2.5 border-b border-white/[0.06]">
          <Shield size={16} className="text-amber-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-white font-light tracking-[0.22em] text-[13px] select-none">CORE</p>
            <p className="text-amber-400/70 text-[9px] font-semibold uppercase tracking-wider">
              Admin Panel
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {NAV.map(({ label, to, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-amber-400/10 text-amber-300'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05]'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-3 py-3 space-y-1">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] font-medium text-slate-400 hover:text-slate-100 hover:bg-white/[0.05] transition-all duration-150"
          >
            <ArrowLeft size={14} />
            Voltar ao app
          </button>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-slate-950">
        {/* Admin context bar */}
        <div className="h-8 bg-amber-400/5 border-b border-amber-400/10 flex items-center px-6 gap-2 flex-shrink-0">
          <Shield size={10} className="text-amber-400" />
          <span className="text-amber-400/80 text-[10px] font-semibold uppercase tracking-wider">
            Modo Administrador — alterações afetam assinantes reais
          </span>
        </div>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
