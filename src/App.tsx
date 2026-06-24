import { QueryClientProvider } from '@tanstack/react-query';
import { Home } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { AdminGuard } from './components/AdminGuard';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import { ModuleGuard } from './components/ModuleGuard';
import { SkeletonPage } from './components/ui/Skeleton';
import type { ModuleKey } from './config/modules';
import { AdminProvider } from './contexts/AdminContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { queryClient } from './lib/queryClient';
import Login from './pages/Login';
import Lancamento from './pages/public/Lancamento';
import Landing from './pages/public/Landing';
import Registro from './pages/Registro';

const Dashboard = lazy(() => import('./modules/dashboard/pages/Dashboard'));
const Vendas = lazy(() => import('./modules/vendas/pages/Vendas'));
const Estoque = lazy(() => import('./modules/estoque/pages/Estoque'));
const ProdutoDetalhe = lazy(() => import('./pages/ProdutoDetalhe'));
const Kanban = lazy(() => import('./pages/Kanban'));
const Financeiro = lazy(() => import('./modules/financeiro/pages/Financeiro'));
const Despesas = lazy(() => import('./pages/Despesas'));
const Calculadora = lazy(() => import('./modules/marketing/pages/Calculadora'));
const Configs = lazy(() => import('./modules/config/pages/Configs'));
const Calendario = lazy(() => import('./pages/Calendario'));
const Planos = lazy(() => import('./pages/Planos'));
const Equipe = lazy(() => import('./pages/Equipe'));
const Clientes = lazy(() => import('./modules/clientes/pages/Clientes'));
const Metas = lazy(() => import('./pages/Metas'));
const Alertas = lazy(() => import('./pages/Alertas'));
const Insights = lazy(() => import('./pages/Insights'));
const ContasPagar = lazy(() => import('./pages/ContasPagar'));
const BreakEven = lazy(() => import('./pages/BreakEven'));
const FluxoCaixa = lazy(() => import('./pages/FluxoCaixa'));
const Precificacao = lazy(() => import('./modules/marketing/pages/Precificacao'));
const Relatorio = lazy(() => import('./pages/Relatorio'));
const Fornecedores = lazy(() => import('./pages/Fornecedores'));
const Campanhas = lazy(() => import('./modules/marketing/pages/Campanhas'));
const Devolucoes = lazy(() => import('./pages/Devolucoes'));
const Reposicao = lazy(() => import('./pages/Reposicao'));
const Importar = lazy(() => import('./pages/Importar'));
const Analise = lazy(() => import('./pages/Analise'));
const Previsao = lazy(() => import('./pages/Previsao'));
const MetasProduto = lazy(() => import('./pages/MetasProduto'));
const Simulador = lazy(() => import('./pages/Simulador'));
const Saude = lazy(() => import('./pages/Saude'));
const MapaCalor = lazy(() => import('./pages/MapaCalor'));
const Categorias = lazy(() => import('./pages/Categorias'));
const ComparativoAnual = lazy(() => import('./pages/ComparativoAnual'));
const Exportar = lazy(() => import('./pages/Exportar'));

const AdminLayout = lazy(() => import('./modules/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./modules/admin/pages/AdminDashboard'));
const AdminTenants = lazy(() => import('./modules/admin/pages/AdminTenants'));
const AdminTenantDetail = lazy(() => import('./modules/admin/pages/AdminTenantDetail'));
const AdminPlans = lazy(() => import('./modules/admin/pages/AdminPlans'));
const AdminAuditLog = lazy(() => import('./modules/admin/pages/AdminAuditLog'));

function PageFallback() {
  return <SkeletonPage />;
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
          className="inline-flex items-center gap-2 px-4 py-2 bg-core-green text-white text-sm font-medium rounded-xl hover:bg-core-green-h transition-colors"
        >
          <Home size={14} />
          Voltar
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

function mpage(Component: React.ComponentType, name: string, moduleKey: ModuleKey) {
  return (
    <ModuleGuard module={moduleKey}>
      <ErrorBoundary pageName={name}>
        <Suspense fallback={<PageFallback />}>
          <Component />
        </Suspense>
      </ErrorBoundary>
    </ModuleGuard>
  );
}

/**
 * Rota catch-all: decide entre Landing, app autenticado ou redirect para /login.
 * - Não autenticado + path "/" → Landing pública
 * - Não autenticado + qualquer outro path → /login (com return URL)
 * - Autenticado → app completo
 */
function AppOrPublic() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-core-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  // Visitante na raiz → landing pública
  if (!user && location.pathname === '/') return <Landing />;

  // Visitante em rota protegida → login com return URL
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Autenticado → app completo
  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <Suspense fallback={<PageFallback />}>
              <AdminLayout />
            </Suspense>
          </AdminGuard>
        }
      >
        <Route index element={page(AdminDashboard, 'Admin')} />
        <Route path="tenants" element={page(AdminTenants, 'Assinantes')} />
        <Route path="tenants/:userId" element={page(AdminTenantDetail, 'Assinante')} />
        <Route path="plans" element={page(AdminPlans, 'Planos')} />
        <Route path="audit" element={page(AdminAuditLog, 'Auditoria')} />
      </Route>
      <Route path="/" element={<Layout />}>
        <Route index element={page(Dashboard, 'Dashboard')} />
        <Route path="vendas" element={mpage(Vendas, 'Vendas', 'pedidos')} />
        <Route path="estoque" element={mpage(Estoque, 'Estoque', 'estoque')} />
        <Route path="estoque/:sku" element={mpage(ProdutoDetalhe, 'Produto', 'estoque')} />
        <Route path="clientes" element={mpage(Clientes, 'Clientes', 'clientes')} />
        <Route path="metas" element={mpage(Metas, 'Metas', 'metas')} />
        <Route path="alertas" element={mpage(Alertas, 'Alertas', 'alertas')} />
        <Route path="insights" element={mpage(Insights, 'Insights', 'insights')} />
        <Route path="dre" element={<Navigate to="/financeiro" replace />} />
        <Route path="comparativo" element={<Navigate to="/analise?tab=comparativo" replace />} />
        <Route path="financeiro" element={mpage(Financeiro, 'Financeiro', 'financeiro')} />
        <Route path="contas-pagar" element={mpage(ContasPagar, 'Contas a Pagar', 'contas_pagar')} />
        <Route path="break-even" element={mpage(BreakEven, 'Break-Even', 'break_even')} />
        <Route path="fluxo-caixa" element={mpage(FluxoCaixa, 'Fluxo de Caixa', 'fluxo_caixa')} />
        <Route path="sazonalidade" element={<Navigate to="/analise?tab=sazonalidade" replace />} />
        <Route path="precificacao" element={mpage(Precificacao, 'Precificação', 'precificacao')} />
        <Route path="relatorio" element={mpage(Relatorio, 'Relatório', 'relatorio')} />
        <Route path="fornecedores" element={mpage(Fornecedores, 'Fornecedores', 'fornecedores')} />
        <Route path="campanhas" element={mpage(Campanhas, 'Campanhas', 'campanhas')} />
        <Route path="ads" element={<Navigate to="/campanhas?tab=ads" replace />} />
        <Route path="devolucoes" element={mpage(Devolucoes, 'Devoluções', 'devolucoes')} />
        <Route path="reposicao" element={mpage(Reposicao, 'Reposição', 'reposicao')} />
        <Route path="importar" element={mpage(Importar, 'Importar', 'importar')} />
        <Route path="compras" element={<Navigate to="/estoque" replace />} />
        <Route path="hoje" element={<Navigate to="/" replace />} />
        <Route path="analise" element={mpage(Analise, 'Análise', 'analise')} />
        <Route path="previsao" element={page(Previsao, 'Previsão')} />
        <Route path="abc" element={<Navigate to="/analise?tab=abc" replace />} />
        <Route path="metas-produto" element={page(MetasProduto, 'Metas por Produto')} />
        <Route path="simulador" element={page(Simulador, 'Simulador')} />
        <Route path="saude" element={page(Saude, 'Saúde do Negócio')} />
        <Route path="mapa-calor" element={page(MapaCalor, 'Mapa de Calor')} />
        <Route path="categorias" element={page(Categorias, 'Categorias')} />
        <Route path="anual" element={mpage(ComparativoAnual, 'Comparativo Anual', 'comparativo')} />
        <Route path="exportar" element={mpage(Exportar, 'Exportar', 'exportar')} />
        <Route path="despesas" element={mpage(Despesas, 'Despesas', 'despesas')} />
        <Route path="kanban" element={mpage(Kanban, 'Tarefas', 'tarefas')} />
        <Route path="calendario" element={mpage(Calendario, 'Calendário', 'calendario')} />
        <Route path="calculadora" element={mpage(Calculadora, 'Calculadora', 'calculadora')} />
        <Route path="configs" element={page(Configs, 'Configurações')} />
        <Route path="planos" element={page(Planos, 'Planos')} />
        <Route path="equipe" element={page(Equipe, 'Equipe')} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

/** /login → redireciona para / se já autenticado */
function LoginOrRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

/** /registro → redireciona para / se já autenticado */
function RegistroOrRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Registro />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <AdminProvider>
              <Routes>
                {/* Páginas públicas fixas */}
                <Route path="/lancamento" element={<Lancamento />} />
                <Route path="/login" element={<LoginOrRedirect />} />
                <Route path="/registro" element={<RegistroOrRedirect />} />

                {/* Tudo mais: Landing (/) ou app autenticado */}
                <Route path="/*" element={<AppOrPublic />} />
              </Routes>
            </AdminProvider>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
