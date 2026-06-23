import { Link } from 'react-router-dom';

interface PublicLayoutProps {
  children: React.ReactNode;
  showAlertBar?: boolean;
}

export function PublicNav() {
  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full border-[1.5px] border-core-black flex-shrink-0" />
          <span className="font-light tracking-[0.28em] text-core-black text-[13px] select-none">CORE</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="text-sm text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Entrar
          </Link>
          <Link
            to="/registro"
            className="text-sm bg-core-black text-white px-4 py-1.5 rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-core-black text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-5 h-5 rounded-full border border-white/40 flex-shrink-0" />
              <span className="font-light tracking-[0.28em] text-white text-[12px] select-none">CORE</span>
            </div>
            <p className="text-slate-500 text-xs">Business Operating System para Shopee</p>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <Link to="/planos" className="hover:text-white transition-colors">Planos</Link>
            <Link to="/login" className="hover:text-white transition-colors">Entrar</Link>
            <Link to="/registro" className="hover:text-white transition-colors">Cadastrar</Link>
            <Link to="/lancamento" className="hover:text-white transition-colors">Lançamento</Link>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 text-xs text-slate-600">
          © {new Date().getFullYear()} Core. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}

export default function PublicLayout({ children, showAlertBar = false }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white font-sans">
      {showAlertBar && (
        <div className="bg-core-green text-white text-center text-xs sm:text-sm py-2.5 px-4 flex items-center justify-center gap-3">
          <span>Lançamento — Acesso antecipado gratuito por tempo limitado.</span>
          <Link
            to="/lancamento"
            className="underline underline-offset-2 font-semibold hover:no-underline whitespace-nowrap"
          >
            Quero acesso →
          </Link>
        </div>
      )}
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
