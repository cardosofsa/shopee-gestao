import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  Crown,
  Eye,
  Loader2,
  Plus,
  Shield,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useToast } from '../components/Toast';
import { dbOrganizations, dbOrgInvites, dbOrgMembers } from '../lib/db';
import { useStore } from '../store';
import type { OrgInvite, OrgRole } from '../types';

// ── Helpers ───────────────────────────────────────────────────

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Proprietário',
  admin: 'Admin',
  operador: 'Operador',
  viewer: 'Visualizador',
};

const ROLE_ICON: Record<OrgRole, React.ElementType> = {
  owner: Crown,
  admin: Shield,
  operador: UserCog,
  viewer: Eye,
};

const MANAGEABLE_ROLES: OrgRole[] = ['admin', 'operador', 'viewer'];

function roleBadge(role: OrgRole) {
  const Icon = ROLE_ICON[role];
  const cls =
    role === 'owner'
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
      : role === 'admin'
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      <Icon size={11} />
      {ROLE_LABELS[role]}
    </span>
  );
}

function inviteLink(token: string) {
  return `${window.location.origin}/convite?token=${token}`;
}

// ── Create Org ────────────────────────────────────────────────

function CreateOrg() {
  const userId = useStore((s) => s.userId)!;
  const loadOrganization = useStore((s) => s.loadOrganization);
  const toast = useToast();
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await dbOrganizations.create(trimmed, userId);
      await loadOrganization(userId);
      toast('Organização criada com sucesso!', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao criar organização', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Users size={20} className="text-core-green" />
          Equipe
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Crie uma organização para convidar colaboradores para o seu painel.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-core-green/5 dark:bg-core-green/10 flex items-center justify-center">
            <Building2 size={18} className="text-core-green" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Criar organização
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Você será o proprietário e poderá convidar membros.
            </p>
          </div>
        </div>
        <form onSubmit={handleCreate} className="flex gap-3">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome da organização"
            maxLength={80}
            className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-core-green/40"
          />
          <button
            type="submit"
            disabled={saving || !nome.trim()}
            className="px-4 h-9 bg-core-green text-white text-sm font-medium rounded-lg hover:bg-core-green-h disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Criar
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Plan gate ─────────────────────────────────────────────────

function PlanGate() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-amber-200 dark:border-amber-800/50 p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-amber-500" />
        </div>
        <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-2">
          Plano atual não inclui CoWork
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-sm mx-auto">
          O recurso de equipe está disponível a partir do plano Starter. Faça upgrade para convidar
          colaboradores.
        </p>
        <a
          href="/planos"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-core-green text-white text-sm font-semibold rounded-xl hover:bg-core-green-h transition-colors"
        >
          Ver planos
        </a>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function Equipe() {
  const userId = useStore((s) => s.userId)!;
  const subscription = useStore((s) => s.subscription);
  const organization = useStore((s) => s.organization);
  const orgMembers = useStore((s) => s.orgMembers);
  const setOrgMembers = useStore((s) => s.setOrgMembers);
  const setOrganization = useStore((s) => s.setOrganization);
  const loadOrganization = useStore((s) => s.loadOrganization);
  const toast = useToast();

  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('operador');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editingNome, setEditingNome] = useState(false);
  const [savingNome, setSavingNome] = useState(false);

  const planLimit = subscription?.plan.limiteUsuarios ?? 1;
  const isOwnerOrAdmin = orgMembers.find((m) => m.userId === userId)?.role;
  const canManage = isOwnerOrAdmin === 'owner' || isOwnerOrAdmin === 'admin';

  const loadInvites = useCallback(async () => {
    if (!organization) return;
    const data = await dbOrgInvites.getByOrg(organization.id).catch(() => []);
    setInvites(data);
  }, [organization]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  if (planLimit <= 1) return <PlanGate />;
  if (!organization) return <CreateOrg />;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !organization) return;
    if (orgMembers.length >= planLimit) {
      toast(`Limite de ${planLimit} usuários atingido no plano atual.`, 'error');
      return;
    }
    setSending(true);
    try {
      const invite = await dbOrgInvites.create(organization.id, email, inviteRole);
      setInvites((prev) => [invite, ...prev]);
      setInviteEmail('');
      toast('Convite criado! Copie o link e envie ao colaborador.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao criar convite', 'error');
    } finally {
      setSending(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!organization) return;
    try {
      await dbOrgMembers.remove(organization.id, memberId);
      setOrgMembers(orgMembers.filter((m) => m.userId !== memberId));
      toast('Membro removido.', 'success');
    } catch {
      toast('Erro ao remover membro.', 'error');
    }
  }

  async function handleRoleChange(memberId: string, role: OrgRole) {
    if (!organization) return;
    try {
      await dbOrgMembers.updateRole(organization.id, memberId, role);
      setOrgMembers(orgMembers.map((m) => (m.userId === memberId ? { ...m, role } : m)));
    } catch {
      toast('Erro ao atualizar função.', 'error');
    }
  }

  async function handleRevokeInvite(id: string) {
    try {
      await dbOrgInvites.revoke(id);
      setInvites((prev) => prev.filter((i) => i.id !== id));
      toast('Convite revogado.', 'success');
    } catch {
      toast('Erro ao revogar convite.', 'error');
    }
  }

  async function handleDeleteOrg() {
    if (!organization) return;
    if (
      !confirm(`Excluir a organização "${organization.nome}"? Todos os membros perderão o acesso.`)
    )
      return;
    try {
      await dbOrganizations.delete(organization.id);
      setOrganization(null);
      setOrgMembers([]);
      toast('Organização excluída.', 'success');
    } catch {
      toast('Erro ao excluir organização.', 'error');
    }
  }

  async function handleSaveNome(e: React.FormEvent) {
    e.preventDefault();
    if (!organization || !editNome.trim()) return;
    setSavingNome(true);
    try {
      await dbOrganizations.update(organization.id, editNome.trim());
      await loadOrganization(userId);
      setEditingNome(false);
      toast('Nome atualizado.', 'success');
    } catch {
      toast('Erro ao atualizar nome.', 'error');
    } finally {
      setSavingNome(false);
    }
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(inviteLink(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users size={20} className="text-core-green" />
            Equipe
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {orgMembers.length} de {planLimit} usuários · {organization.nome}
          </p>
        </div>
        {isOwnerOrAdmin === 'owner' && (
          <button
            onClick={handleDeleteOrg}
            className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1.5"
          >
            <Trash2 size={13} />
            Excluir org
          </button>
        )}
      </div>

      {/* Org name edit */}
      {isOwnerOrAdmin === 'owner' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          {editingNome ? (
            <form onSubmit={handleSaveNome} className="flex gap-3 items-center">
              <input
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                maxLength={80}
                autoFocus
                className="flex-1 h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-core-green/40"
              />
              <button
                type="submit"
                disabled={savingNome}
                className="px-3 h-8 bg-core-green text-white text-xs font-medium rounded-lg hover:bg-core-green-h disabled:opacity-50 transition-colors"
              >
                {savingNome ? <Loader2 size={12} className="animate-spin" /> : 'Salvar'}
              </button>
              <button
                type="button"
                onClick={() => setEditingNome(false)}
                className="px-3 h-8 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-3">
              <Building2 size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100 flex-1">
                {organization.nome}
              </span>
              <button
                onClick={() => {
                  setEditNome(organization.nome);
                  setEditingNome(true);
                }}
                className="text-xs text-slate-400 hover:text-core-green transition-colors"
              >
                Renomear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Members */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Membros</p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {orgMembers.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 px-5 py-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-core-green to-emerald-400 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                {(m.email?.[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                  {m.email}
                </p>
                <p className="text-xs text-slate-400">
                  Desde {new Date(m.joinedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {canManage && m.role !== 'owner' ? (
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value as OrgRole)}
                    className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-core-green/40"
                  >
                    {MANAGEABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  roleBadge(m.role)
                )}
                {canManage && m.role !== 'owner' && m.userId !== userId && (
                  <button
                    onClick={() => handleRemoveMember(m.userId)}
                    className="p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite form */}
      {canManage && orgMembers.length < planLimit && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Plus size={15} className="text-core-green" />
            Convidar colaborador
          </p>
          <form onSubmit={handleInvite} className="flex flex-wrap gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
              className="flex-1 min-w-[200px] h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-core-green/40"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as OrgRole)}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-core-green/40"
            >
              {MANAGEABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={sending}
              className="px-4 h-9 bg-core-green text-white text-sm font-medium rounded-lg hover:bg-core-green-h disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Convidar
            </button>
          </form>
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Convites pendentes
            </p>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 dark:text-slate-100 truncate">{inv.email}</p>
                  <p className="text-xs text-slate-400">
                    {ROLE_LABELS[inv.role]} · Expira{' '}
                    {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyLink(inv.token)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    {copied === inv.token ? (
                      <Check size={12} className="text-emerald-500" />
                    ) : (
                      <Copy size={12} />
                    )}
                    {copied === inv.token ? 'Copiado!' : 'Copiar link'}
                  </button>
                  {canManage && (
                    <button
                      onClick={() => handleRevokeInvite(inv.id)}
                      className="p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role legend */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Funções
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(['owner', 'admin', 'operador', 'viewer'] as OrgRole[]).map((r) => {
            const Icon = ROLE_ICON[r];
            const descs: Record<OrgRole, string> = {
              owner: 'Acesso total e exclusivo à gestão da org',
              admin: 'Pode convidar e gerenciar membros',
              operador: 'Pode criar e editar dados operacionais',
              viewer: 'Somente leitura',
            };
            return (
              <div key={r} className="flex items-start gap-2">
                <Icon size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {ROLE_LABELS[r]}
                  </p>
                  <p className="text-[11px] text-slate-400">{descs[r]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
