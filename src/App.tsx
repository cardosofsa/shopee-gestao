import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from 'lucide-react';

const Dashboard   = lazy(() => import('./pages/Dashboard'));
const Vendas      = lazy(() => import('./pages/Vendas'));
const Estoque     = lazy(() => import('./pages/Estoque'));
const Kanban      = lazy(() => import('./pages/Kanban'));
const Financeiro  = lazy(() => import('./pages/Financeiro'));
const Despesas    = lazy(() => import('./pages/Despesas'));
const Calculadora = lazy(() => import('./pages/Calculadora'));
const Configs     = lazy(() => import('./pages/Configs'));
const Calendario  = lazy(() => import('./pages/Calendario'));

function PageFallback() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 border-2 border-shopee-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-sm w-full text-center">
        <p className="text-7xl font-bold text-slate-100 mb-2 select-none">404</p>
        <h2 className="text-slate-800 font-semibold text-base mb-1">Página não encontrada</h2>
        <p className="text-slate-400 text-sm mb-6">
          O endereço que você acessou não existe neste sistema.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-shopee-500 text-white text-sm font-medium rounded-xl hover:bg-shopee-600 transition-colors"
        >
          <Home size={14} />
          Voltar ao Dashboard
        </Link>
      </div>
    </div>
  );
}

function page(Component: React.ComponentType, name: string) {
  return (
    <ErrorBoundary pageName={name}>
      <Suspense fallback={<PageFallback />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-shopee-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index                element={page(Dashboard,   'Dashboard')}   />
        <Route path="vendas"        element={page(Vendas,      'Vendas')}       />
        <Route path="estoque"       element={page(Estoque,     'Estoque')}      />
        <Route path="financeiro"    element={page(Financeiro,  'Financeiro')}   />
        <Route path="despesas"      element={page(Despesas,    'Despesas')}     />
        <Route path="kanban"        element={page(Kanban,      'Tarefas')}      />
        <Route path="calendario"    element={page(Calendario,  'Calendário')}   />
        <Route path="calculadora"   element={page(Calculadora, 'Calculadora')}  />
        <Route path="configs"       element={page(Configs,     'Configurações')} />
        <Route path="*"             element={<NotFound />}                      />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginOrRedirect />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function LoginOrRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}
