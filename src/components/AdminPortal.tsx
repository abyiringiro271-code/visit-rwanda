import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatFRW, VIP_TIERS } from '@/lib/constants';
import ConfigTab from './admin/ConfigTab';
import {
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Users, ListTodo, LogOut,
  Check, X, Ban, ShieldCheck, KeyRound, Wallet, Search, ChevronRight,
  Crown, UserCog, Trash2, Settings, Package, Save, AlertTriangle, Clock,
  Shield, FileText, BarChart3, UserPlus, ChevronLeft, Loader2, Link2, Power, PowerOff
} from 'lucide-react';

type Tab = 'dashboard' | 'users' | 'deposits' | 'withdrawals' | 'products' | 'tasks' | 'reports' | 'team' | 'audit' | 'settings' | 'config';
type AdminRole = 'super_admin' | 'admin' | 'editor';

export default function AdminPortal() {
  const { signOut, profile } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [role, setRole] = useState<AdminRole | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('admin_get_role');
      setRole(data as AdminRole | null);
    })();
  }, []);

  const canAccess = (t: Tab): boolean => {
    if (role === 'super_admin') return true;
    if (role === 'admin') return ['dashboard', 'users', 'deposits', 'withdrawals', 'reports', 'audit', 'tasks', 'config'].includes(t);
    if (role === 'editor') return ['products', 'tasks', 'dashboard'];
    return false;
  };

  const navItems: { k: Tab; l: string; i: React.ReactNode }[] = [
    { k: 'dashboard', l: 'Dashboard', i: <LayoutDashboard className="w-4 h-4" /> },
    { k: 'users', l: 'Users', i: <Users className="w-4 h-4" /> },
    { k: 'deposits', l: 'Deposits', i: <ArrowDownToLine className="w-4 h-4" /> },
    { k: 'withdrawals', l: 'Withdrawals', i: <ArrowUpFromLine className="w-4 h-4" /> },
    { k: 'products', l: 'Products', i: <Package className="w-4 h-4" /> },
    { k: 'tasks', l: 'Tasks', i: <ListTodo className="w-4 h-4" /> },
    { k: 'reports', l: 'Reports', i: <BarChart3 className="w-4 h-4" /> },
    { k: 'team', l: 'Team', i: <Shield className="w-4 h-4" /> },
    { k: 'audit', l: 'Audit Logs', i: <FileText className="w-4 h-4" /> },
    { k: 'config', l: 'Site Config', i: <Link2 className="w-4 h-4" /> },
    { k: 'settings', l: 'Settings', i: <Settings className="w-4 h-4" /> },
  ];

  const visibleNav = navItems.filter((n) => canAccess(n.k));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-60 bg-gray-900 text-white flex-col hidden md:flex flex-shrink-0">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-lg">🇷🇼</div>
            <div>
              <p className="font-bold text-sm">Visit Rwanda</p>
              <p className="text-xs text-gray-400">Admin Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {visibleNav.map((n) => (
            <button key={n.k} onClick={() => setTab(n.k)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${tab === n.k ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              {n.i} {n.l}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-gray-800 space-y-1">
          <div className="px-3 py-1.5 text-xs text-gray-500">
            {profile?.full_name || 'Admin'} · <span className="capitalize">{role || 'admin'}</span>
          </div>
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2">
            <span className="text-lg">🇷🇼</span>
            <span className="font-bold text-sm">Admin Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={signOut} className="text-gray-400"><LogOut className="w-4 h-4" /></button>
          </div>
        </header>

        <div className="flex bg-white border-b border-gray-200 md:hidden overflow-x-auto">
          {visibleNav.map((n) => (
            <button key={n.k} onClick={() => setTab(n.k)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 text-xs ${tab === n.k ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>
              {n.i}{n.l}
            </button>
          ))}
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'deposits' && <DepositsTab />}
          {tab === 'withdrawals' && <WithdrawalsTab />}
          {tab === 'products' && <ProductsTab />}
          {tab === 'tasks' && <TasksTab />}
          {tab === 'reports' && <ReportsTab />}
          {tab === 'team' && <TeamTab />}
          {tab === 'audit' && <AuditTab />}
          {tab === 'config' && <ConfigTab />}
          {tab === 'settings' && <SettingsTab />}
        </main>
      </div>
    </div>
  );
}

// ============ SHARED ============
export function FilterTabs({ filter, setFilter }: { filter: string; setFilter: (f: string) => void }) {
  const tabs = ['pending', 'approved', 'rejected', 'all'];
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
      {tabs.map((f) => (
        <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{f}</button>
      ))}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm border border-gray-100">{text}</div>;
}

export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-700 truncate">{value}</p>
    </div>
  );
}

export function Section({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">{icon} {label}</p>
      {children}
    </div>
  );
}

export function Field({ label, value, onChange, type = 'text' }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-600',
    approved: 'bg-emerald-50 text-emerald-600',
    rejected: 'bg-red-50 text-red-600',
    active: 'bg-emerald-50 text-emerald-600',
    banned: 'bg-red-50 text-red-600',
  };
  return <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
    </div>
  );
}

// ============ DASHBOARD ============
function DashboardTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('admin_get_dashboard_stats');
      setStats(data);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <EmptyState text="Could not load dashboard data." />;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Users" value={stats.total_users?.toString() || '0'} icon={<Users className="w-5 h-5" />} color="from-sky-500 to-sky-700" />
        <StatCard label="Active Users" value={stats.active_users?.toString() || '0'} icon={<Users className="w-5 h-5" />} color="from-emerald-500 to-emerald-700" />
        <StatCard label="Banned Users" value={stats.banned_users?.toString() || '0'} icon={<Ban className="w-5 h-5" />} color="from-red-500 to-red-700" />
        <StatCard label="Pending Deposits" value={stats.pending_deposits?.toString() || '0'} icon={<ArrowDownToLine className="w-5 h-5" />} color="from-amber-500 to-amber-700" />
        <StatCard label="Pending Withdrawals" value={stats.pending_withdrawals?.toString() || '0'} icon={<ArrowUpFromLine className="w-5 h-5" />} color="from-rose-500 to-rose-700" />
        <StatCard label="Confirmed Deposits" value={stats.confirmed_deposits?.toString() || '0'} icon={<Check className="w-5 h-5" />} color="from-emerald-500 to-emerald-700" />
        <StatCard label="Total Deposits" value={formatFRW(stats.total_deposit_amount || 0)} icon={<Wallet className="w-5 h-5" />} color="from-teal-500 to-teal-700" />
        <StatCard label="Total Withdrawals" value={formatFRW(stats.total_withdrawal_amount || 0)} icon={<Wallet className="w-5 h-5" />} color="from-indigo-500 to-indigo-700" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <RecentList title="Recent Deposits" items={stats.recent_deposits} type="deposit" />
        <RecentList title="Recent Withdrawals" items={stats.recent_withdrawals} type="withdrawal" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <RecentUsers title="Recent Users" items={stats.recent_users} />
        <RecentActivity title="Recent Admin Activity" items={stats.recent_activity} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-4 text-white shadow-lg`}>
      <div className="flex items-center gap-2 mb-2 opacity-80">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function RecentList({ title, items, type }: { title: string; items: any[]; type: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <p className="px-4 pt-4 pb-2 text-sm font-bold text-gray-700">{title}</p>
      {!items || items.length === 0 ? <p className="px-4 pb-4 text-sm text-gray-400">No data.</p> : (
        <div className="divide-y divide-gray-50">
          {items.map((r: any) => (
            <div key={r.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">{r.full_name}</p>
                <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-700">{formatFRW(r.amount)}</p>
                <StatusBadge status={r.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentUsers({ title, items }: { title: string; items: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <p className="px-4 pt-4 pb-2 text-sm font-bold text-gray-700">{title}</p>
      {!items || items.length === 0 ? <p className="px-4 pb-4 text-sm text-gray-400">No users.</p> : (
        <div className="divide-y divide-gray-50">
          {items.map((u: any) => (
            <div key={u.user_id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700">{u.full_name}</p>
                <p className="text-xs text-gray-400">{u.phone || u.referral_code}</p>
              </div>
              <StatusBadge status={u.is_banned ? 'banned' : 'active'} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentActivity({ title, items }: { title: string; items: any[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <p className="px-4 pt-4 pb-2 text-sm font-bold text-gray-700">{title}</p>
      {!items || items.length === 0 ? <p className="px-4 pb-4 text-sm text-gray-400">No activity.</p> : (
        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {items.map((a: any) => (
            <div key={a.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">{a.action.replace(/_/g, ' ').toLowerCase()}</p>
                <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleString()}</p>
              </div>
              <p className="text-xs text-gray-400">{a.admin_email} {a.reason && `· ${a.reason}`}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ USERS ============
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc('admin_list_users', {
      p_search: search, p_filter_status: filter, p_limit: pageSize, p_offset: page * pageSize
    });
    if (data) {
      setUsers((data as any).users || []);
      setTotal((data as any).total || 0);
    }
    setLoading(false);
  }, [search, filter, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">User Management</h2>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search name, phone, referral code, ID…" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
        </div>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="all">All Users</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          <div className="space-y-2">
            {users.length === 0 ? <EmptyState text="No users found." /> : users.map((u) => (
              <button key={u.user_id} onClick={() => setSelected(u.user_id)}
                className={`w-full text-left bg-white rounded-2xl p-3 shadow-sm border transition-all ${selected === u.user_id ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-gray-100 hover:border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${u.is_banned ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{u.full_name?.charAt(0).toUpperCase() || 'U'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{u.full_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400 truncate">{u.phone || 'No phone'} · {u.referral_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-700">{formatFRW(u.balance)}</p>
                    <div className="flex gap-1 justify-end">
                      {u.is_admin && <span className="text-xs font-semibold text-amber-600 flex items-center gap-0.5"><Crown className="w-3 h-3" />{u.admin_role || 'admin'}</span>}
                      {u.is_banned && <span className="text-xs font-semibold text-red-600">BANNED</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold disabled:opacity-50 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Prev</button>
              <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold disabled:opacity-50 flex items-center gap-1">Next <ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </>
      )}

      {selected && <UserDetailModal userId={selected} onClose={() => { setSelected(null); load(); }} />}
    </div>
  );
}

function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [banNote, setBanNote] = useState('');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [withdrawalLimit, setWithdrawalLimit] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState<'info' | 'deposits' | 'withdrawals' | 'tasks'>('info');
  const [history, setHistory] = useState<any[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('admin_get_user_detail', { p_user_id: userId });
    setDetail(data);
    if (data) { setEditName(data.full_name || ''); setEditPhone(data.phone || ''); setWithdrawalLimit(data.withdrawal_day_limit?.toString() || ''); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const loadHistory = useCallback(async (type: 'deposits' | 'withdrawals' | 'tasks') => {
    if (type === 'tasks') {
      const { data } = await supabase.from('task_completions').select('*').eq('user_id', userId).order('completed_at', { ascending: false }).limit(20);
      setHistory(data || []);
    } else {
      const { data } = await supabase.from('wallet_requests').select('*').eq('user_id', userId).eq('request_type', type).order('created_at', { ascending: false }).limit(20);
      setHistory(data || []);
    }
  }, [userId]);

  useEffect(() => { if (tab !== 'info') loadHistory(tab); }, [tab, loadHistory]);

  const handleEditUser = async () => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('admin_update_user', { p_user_id: userId, p_full_name: editName, p_phone: editPhone });
    setBusy(false);
    if (error) { setMsg('Could not update user.'); return; }
    setMsg('User info updated.'); await load();
  };

  const handleBan = async () => {
    if (!banNote.trim()) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('admin_ban_user', { p_user_id: userId, p_note: banNote });
    setBusy(false);
    if (error) { setMsg('Could not ban user.'); return; }
    setMsg('User banned.'); setBanNote(''); await load();
  };

  const handleUnban = async () => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('admin_unban_user', { p_user_id: userId });
    setBusy(false);
    if (error) { setMsg('Could not unban user.'); return; }
    setMsg('User unbanned.'); await load();
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) { setMsg('Password must be at least 6 characters.'); return; }
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('admin_reset_password', { p_user_id: userId, p_new_password: newPassword });
    setBusy(false);
    if (error) { setMsg('Could not reset password.'); return; }
    setMsg('Password reset.'); setNewPassword('');
  };

  const handleBalance = async (action: 'add' | 'subtract') => {
    if (!balanceAmount) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('admin_update_balance', { p_user_id: userId, p_amount: parseInt(balanceAmount), p_action: action });
    setBusy(false);
    if (error) { setMsg('Could not update balance.'); return; }
    setMsg(`Balance ${action}.`); setBalanceAmount(''); await load();
  };

  const handleWithdrawalLimit = async () => {
    setBusy(true); setMsg(null);
    const limit = withdrawalLimit ? parseInt(withdrawalLimit) : null;
    const { error } = await supabase.rpc('admin_set_withdrawal_limit', { p_user_id: userId, p_limit: limit });
    setBusy(false);
    if (error) { setMsg('Could not set limit.'); return; }
    setMsg('Withdrawal limit updated.'); await load();
  };

  const handleDelete = async () => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('admin_delete_account', { p_user_id: userId });
    setBusy(false);
    if (error) { setMsg('Could not delete account.'); return; }
    onClose();
  };

  if (!detail) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">{detail.full_name?.charAt(0).toUpperCase() || 'U'}</div>
            <div>
              <p className="font-bold text-gray-900">{detail.full_name}</p>
              <p className="text-xs text-gray-400">{detail.phone || 'No phone'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['info', 'deposits', 'withdrawals', 'tasks'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{t}</button>
            ))}
          </div>

          {tab === 'info' && (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Detail label="User ID" value={detail.user_id?.slice(0, 8) + '…'} />
                <Detail label="Phone" value={detail.phone || '—'} />
                <Detail label="Balance" value={formatFRW(detail.balance)} />
                <Detail label="VIP" value={VIP_TIERS.find((v) => v.tier === detail.vip_tier)?.name || 'None'} />
                <Detail label="Status" value={detail.is_banned ? 'Banned' : 'Active'} />
                <Detail label="Joined" value={detail.joined_at ? new Date(detail.joined_at).toLocaleDateString() : '—'} />
                <Detail label="Total Tasks" value={detail.total_tasks?.toString() || '0'} />
                <Detail label="W. Limit" value={detail.withdrawal_day_limit ? formatFRW(detail.withdrawal_day_limit) : 'System'} />
              </div>

              {msg && <div className="text-sm bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2 border border-emerald-100">{msg}</div>}

              <Section label="Edit User Info" icon={<UserCog className="w-3.5 h-3.5" />}>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <button onClick={handleEditUser} disabled={busy} className="w-full py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-1.5"><Save className="w-3.5 h-3.5" /> Save</button>
              </Section>

              <Section label="Adjust Balance" icon={<Wallet className="w-3.5 h-3.5" />}>
                <div className="flex gap-2">
                  <input type="number" value={balanceAmount} onChange={(e) => setBalanceAmount(e.target.value)} placeholder="Amount" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  <button onClick={() => handleBalance('add')} disabled={busy || !balanceAmount} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">Add</button>
                  <button onClick={() => handleBalance('subtract')} disabled={busy || !balanceAmount} className="px-3 py-2 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold hover:bg-rose-100 disabled:opacity-50">Sub</button>
                </div>
              </Section>

              <Section label="Reset Password" icon={<KeyRound className="w-3.5 h-3.5" />}>
                <div className="flex gap-2">
                  <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  <button onClick={handleResetPassword} disabled={busy || !newPassword} className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50">Reset</button>
                </div>
              </Section>

              <Section label="Daily Withdrawal Limit" icon={<Wallet className="w-3.5 h-3.5" />}>
                <div className="flex gap-2">
                  <input type="number" value={withdrawalLimit} onChange={(e) => setWithdrawalLimit(e.target.value)} placeholder="Empty = system default" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  <button onClick={handleWithdrawalLimit} disabled={busy} className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50">Set</button>
                </div>
              </Section>

              {detail.is_banned ? (
                <button onClick={handleUnban} disabled={busy} className="w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Unban User</button>
              ) : (
                <Section label="Ban User" icon={<Ban className="w-3.5 h-3.5" />}>
                  <input value={banNote} onChange={(e) => setBanNote(e.target.value)} placeholder="Reason for ban" className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  <button onClick={handleBan} disabled={busy || !banNote.trim()} className="w-full py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5"><Ban className="w-4 h-4" /> Ban User</button>
                </Section>
              )}

              <div className="pt-3 border-t border-gray-100">
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)} disabled={busy} className="w-full py-2.5 rounded-lg bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1.5 border border-red-200"><Trash2 className="w-4 h-4" /> Delete Account</button>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-red-50 rounded-xl p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-700">This permanently deletes the account and all data. Cannot be undone.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleDelete} disabled={busy} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">Confirm Delete</button>
                      <button onClick={() => setConfirmDelete(false)} className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {tab !== 'info' && (
            <div className="space-y-2">
              {history.length === 0 ? <EmptyState text="No records." /> : history.map((r) => (
                <div key={r.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    {tab === 'tasks' ? (
                      <>
                        <p className="text-sm font-semibold text-gray-700">Task #{r.task_number}</p>
                        <p className="text-xs text-gray-400">{new Date(r.completed_at).toLocaleString()}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-700">{formatFRW(r.amount)}</p>
                        <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</p>
                      </>
                    )}
                  </div>
                  {tab !== 'tasks' && <StatusBadge status={r.status} />}
                  {tab === 'tasks' && <span className="text-sm font-bold text-emerald-600">+{formatFRW(r.earned_amount)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ DEPOSITS ============
function DepositsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    let q = supabase
      .from('wallet_requests')
      .select('*, profiles!inner(full_name, phone, referral_code)')
      .eq('request_type', 'deposit')
      .order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error } = await q.limit(100);
    if (error) {
      console.error('Deposits load failed:', error);
      setLoadError(error.message);
      setRequests([]);
      return;
    }
    setRequests(data ?? []);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setBusy(id); setMsg(null);
    const { error } = await supabase.rpc('admin_approve_deposit', { p_request_id: id });
    setBusy(null);
    if (error) { setMsg('Could not approve: ' + error.message); return; }
    setMsg('Deposit confirmed.'); await load();
  };

  const reject = async (id: string) => {
    setBusy(id); setMsg(null);
    const { error } = await supabase.rpc('admin_reject_deposit', { p_request_id: id, p_note: 'Declined by admin' });
    setBusy(null);
    if (error) { setMsg('Could not decline: ' + error.message); return; }
    setMsg('Deposit declined.'); await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900">Deposit Requests</h2>
        <FilterTabs filter={filter} setFilter={setFilter} />
      </div>
      {msg && <div className="text-sm bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2 border border-emerald-100">{msg}</div>}
      {loadError && <div className="text-sm bg-red-50 text-red-600 rounded-xl px-3 py-2 border border-red-100">Load error: {loadError}</div>}
      {requests.length === 0 && !loadError ? <EmptyState text="No deposit requests." /> : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><ArrowDownToLine className="w-5 h-5" /></div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{r.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{r.profiles?.phone} · {r.profiles?.referral_code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatFRW(r.amount)}</p>
                  <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</p>
                </div>
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => approve(r.id)} disabled={busy === r.id} className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" /> Confirm</button>
                  <button onClick={() => reject(r.id)} disabled={busy === r.id} className="flex-1 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1.5"><X className="w-3.5 h-3.5" /> Decline</button>
                </div>
              )}
              {r.status !== 'pending' && <div className="mt-2"><StatusBadge status={r.status} /> {r.review_note && <span className="text-xs text-gray-400 ml-2">{r.review_note}</span>}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ WITHDRAWALS ============
function WithdrawalsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState('pending');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    let q = supabase
      .from('wallet_requests')
      .select('*, profiles!inner(full_name, phone, referral_code)')
      .eq('request_type', 'withdrawal')
      .order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, error } = await q.limit(100);
    if (error) {
      console.error('Withdrawals load failed:', error);
      setLoadError(error.message);
      setRequests([]);
      return;
    }
    setRequests(data ?? []);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setBusy(id); setMsg(null);
    const { error } = await supabase.rpc('admin_approve_withdrawal', { p_request_id: id });
    setBusy(null);
    if (error) { setMsg('Could not approve: ' + error.message); return; }
    setMsg('Withdrawal approved.'); await load();
  };

  const reject = async (id: string) => {
    setBusy(id); setMsg(null);
    const { error } = await supabase.rpc('admin_reject_withdrawal', { p_request_id: id, p_note: 'Declined by admin' });
    setBusy(null);
    if (error) { setMsg('Could not decline: ' + error.message); return; }
    setMsg('Withdrawal declined.'); await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900">Withdrawal Requests</h2>
        <FilterTabs filter={filter} setFilter={setFilter} />
      </div>
      {msg && <div className="text-sm bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2 border border-emerald-100">{msg}</div>}
      {loadError && <div className="text-sm bg-red-50 text-red-600 rounded-xl px-3 py-2 border border-red-100">Load error: {loadError}</div>}
      {requests.length === 0 && !loadError ? <EmptyState text="No withdrawal requests." /> : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><ArrowUpFromLine className="w-5 h-5" /></div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{r.profiles?.full_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{r.phone} · {r.profiles?.referral_code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{formatFRW(r.amount)}</p>
                  <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</p>
                </div>
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button onClick={() => approve(r.id)} disabled={busy === r.id} className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" /> Approve</button>
                  <button onClick={() => reject(r.id)} disabled={busy === r.id} className="flex-1 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1.5"><X className="w-3.5 h-3.5" /> Decline</button>
                </div>
              )}
              {r.status !== 'pending' && <div className="mt-2"><StatusBadge status={r.status} /> {r.review_note && <span className="text-xs text-gray-400 ml-2">{r.review_note}</span>}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ PRODUCTS ============
function ProductsTab() {
  const [products, setProducts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('vip_tiers').select('*').order('tier', { ascending: true });
    setProducts(data ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!editing) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('admin_upsert_product', {
      p_tier: editing.tier, p_name: editing.name, p_price: parseInt(editing.price),
      p_daily_return: parseInt(editing.daily_return), p_task_count: parseInt(editing.task_count), p_task_rate: parseInt(editing.task_rate)
    });
    setBusy(false);
    if (error) { setMsg('Could not save product.'); return; }
    setMsg('Product saved.'); setEditing(null); await load();
  };

  const handleDelete = async (tier: number) => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('admin_delete_product', { p_tier: tier });
    setBusy(false);
    if (error) { setMsg(error.message.includes('users') ? 'Cannot delete: users on this tier.' : 'Could not delete.'); return; }
    setMsg('Product deleted.'); setConfirmDelete(null); await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Product Management</h2>
        <button onClick={() => setEditing({ tier: products.length + 1, name: '', price: '', daily_return: '', task_count: '', task_rate: '' })} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5"><Package className="w-4 h-4" /> Add Product</button>
      </div>
      {msg && <div className="text-sm bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2 border border-emerald-100">{msg}</div>}
      {editing && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-200 space-y-3">
          <p className="text-sm font-bold text-gray-700">{editing.name ? `Edit ${editing.name}` : 'New Product'}</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Tier Number" value={editing.tier} onChange={(v) => setEditing({ ...editing, tier: v })} type="number" />
            <Field label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <Field label="Price (FRW)" value={editing.price} onChange={(v) => setEditing({ ...editing, price: v })} type="number" />
            <Field label="Daily Return" value={editing.daily_return} onChange={(v) => setEditing({ ...editing, daily_return: v })} type="number" />
            <Field label="Tasks/Day" value={editing.task_count} onChange={(v) => setEditing({ ...editing, task_count: v })} type="number" />
            <Field label="Per Task Rate" value={editing.task_rate} onChange={(v) => setEditing({ ...editing, task_rate: v })} type="number" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={busy} className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5"><Save className="w-4 h-4" /> Save</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold">Cancel</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {products.map((p) => (
          <div key={p.tier} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Package className="w-5 h-5" /></div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">{formatFRW(p.price)} · {formatFRW(p.daily_return)}/day · {p.task_count} tasks</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing({ ...p })} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200">Edit</button>
                {confirmDelete === p.tier ? (
                  <>
                    <button onClick={() => handleDelete(p.tier)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50">Confirm</button>
                    <button onClick={() => setConfirmDelete(null)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-semibold">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDelete(p.tier)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ TASKS ============
function TasksTab() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('task_completions').select('*, profiles!inner(full_name, referral_code, vip_tier, phone)').order('completed_at', { ascending: false }).limit(100);
      setTasks(data ?? []);
    })();
  }, []);

  const filtered = tasks.filter((t) => !search || t.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) || t.profiles?.referral_code?.toLowerCase().includes(search.toLowerCase()));

  const byUser = new Map<string, { name: string; code: string; vip: number; count: number; earned: number; last: string }>();
  filtered.forEach((t) => {
    const uid = t.user_id;
    const existing = byUser.get(uid) ?? { name: t.profiles?.full_name || 'Unknown', code: t.profiles?.referral_code || '', vip: t.profiles?.vip_tier ?? 0, count: 0, earned: 0, last: t.completed_at };
    existing.count++; existing.earned += t.earned_amount;
    if (t.completed_at > existing.last) existing.last = t.completed_at;
    byUser.set(uid, existing);
  });

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Task Monitoring</h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user…" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white" />
      </div>
      <div className="space-y-2">
        {byUser.size === 0 ? <EmptyState text="No task completions." /> : Array.from(byUser.entries()).map(([uid, u]) => {
          const vip = VIP_TIERS.find((v) => v.tier === u.vip);
          return (
            <div key={uid} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center"><ListTodo className="w-5 h-5" /></div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.code} {vip && `· ${vip.name}`}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{u.count} tasks</p>
                  <p className="text-xs text-emerald-600 font-semibold">+{formatFRW(u.earned)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ REPORTS ============
function ReportsTab() {
  const [data, setData] = useState<any>(null);
  const [range, setRange] = useState<'today' | '7d' | '30d' | 'month'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let start: Date;
      const end = new Date();
      if (range === 'today') start = new Date();
      else if (range === '7d') start = new Date(Date.now() - 7 * 86400000);
      else if (range === '30d') start = new Date(Date.now() - 30 * 86400000);
      else { start = new Date(); start.setDate(1); }
      const { data } = await supabase.rpc('admin_get_report_data', { p_start_date: start.toISOString().split('T')[0], p_end_date: end.toISOString().split('T')[0] });
      setData(data);
      setLoading(false);
    })();
  }, [range]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-900">Reports & Analytics</h2>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['today', '7d', '30d', 'month'] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${range === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === 'month' ? 'This Month' : 'Today'}</button>
          ))}
        </div>
      </div>
      {loading ? <LoadingSpinner /> : !data ? <EmptyState text="No data." /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="New Users" value={data.new_users?.toString() || '0'} icon={<Users className="w-5 h-5" />} color="from-sky-500 to-sky-700" />
            <StatCard label="Total Deposits" value={data.total_deposits?.toString() || '0'} icon={<ArrowDownToLine className="w-5 h-5" />} color="from-emerald-500 to-emerald-700" />
            <StatCard label="Confirmed" value={data.confirmed_deposits?.toString() || '0'} icon={<Check className="w-5 h-5" />} color="from-teal-500 to-teal-700" />
            <StatCard label="Pending" value={data.pending_deposits?.toString() || '0'} icon={<Clock className="w-5 h-5" />} color="from-amber-500 to-amber-700" />
            <StatCard label="Declined Deposits" value={data.declined_deposits?.toString() || '0'} icon={<X className="w-5 h-5" />} color="from-red-500 to-red-700" />
            <StatCard label="Total Withdrawals" value={data.total_withdrawals?.toString() || '0'} icon={<ArrowUpFromLine className="w-5 h-5" />} color="from-rose-500 to-rose-700" />
            <StatCard label="Approved Withdrawals" value={data.approved_withdrawals?.toString() || '0'} icon={<Check className="w-5 h-5" />} color="from-emerald-500 to-emerald-700" />
            <StatCard label="Deposit Amount" value={formatFRW(data.deposit_amount || 0)} icon={<Wallet className="w-5 h-5" />} color="from-indigo-500 to-indigo-700" />
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm font-bold text-gray-700 mb-3">Summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Date Range</span><span className="font-semibold text-gray-700">{data.start_date} → {data.end_date}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Deposit Amount</span><span className="font-semibold text-emerald-600">{formatFRW(data.deposit_amount || 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Total Withdrawal Amount</span><span className="font-semibold text-rose-600">{formatFRW(data.withdrawal_amount || 0)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Pending Withdrawals</span><span className="font-semibold text-amber-600">{data.pending_withdrawals || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Declined Withdrawals</span><span className="font-semibold text-red-600">{data.declined_withdrawals || 0}</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============ TEAM ============
function TeamTab() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('admin');
  const [confirmDisable, setConfirmDisable] = useState<string | null>(null);
  const [roleChange, setRoleChange] = useState<{ id: string; role: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('admin_list_users', { p_search: '', p_filter_status: 'admin', p_limit: 100, p_offset: 0 });
    if (data) setAdmins((data as any).users || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('admin_create_admin', { p_email: newEmail, p_password: newPassword, p_full_name: newName, p_phone: newPhone, p_role: newRole });
    setBusy(false);
    if (error) { setMsg(error.message || 'Could not create admin.'); return; }
    setMsg('Admin account created.'); setShowCreate(false); setNewEmail(''); setNewPassword(''); setNewName(''); setNewPhone(''); await load();
  };

  const handleDisable = async (id: string) => {
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('admin_disable_admin', { p_user_id: id });
    setBusy(false);
    if (error) { setMsg(error.message || 'Could not disable admin.'); return; }
    setMsg('Admin disabled.'); setConfirmDisable(null); await load();
  };

  const handleChangeRole = async () => {
    if (!roleChange) return;
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc('admin_change_role', { p_user_id: roleChange.id, p_role: roleChange.role });
    setBusy(false);
    if (error) { setMsg(error.message || 'Could not change role.'); return; }
    setMsg('Role updated.'); setRoleChange(null); await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Admin Team</h2>
        <button onClick={() => setShowCreate(true)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1.5"><UserPlus className="w-4 h-4" /> Add Admin</button>
      </div>

      {msg && <div className="text-sm bg-emerald-50 text-emerald-700 rounded-xl px-3 py-2 border border-emerald-100">{msg}</div>}

      {showCreate && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-200 space-y-3">
          <p className="text-sm font-bold text-gray-700">Create New Admin Account</p>
          <p className="text-xs text-gray-400">The email is used internally by Supabase auth and is never shown to the admin or users.</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Email (internal)" value={newEmail} onChange={setNewEmail} type="email" />
            <Field label="Password" value={newPassword} onChange={setNewPassword} type="text" />
            <Field label="Full Name" value={newName} onChange={setNewName} />
            <Field label="Phone" value={newPhone} onChange={setNewPhone} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Role</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={busy || !newEmail || !newPassword} className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-1.5"><Save className="w-4 h-4" /> Create</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {admins.map((a) => (
          <div key={a.user_id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><Shield className="w-5 h-5" /></div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{a.full_name}</p>
                  <p className="text-xs text-gray-400">{a.phone || 'No phone'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold capitalize px-2 py-1 rounded ${a.admin_role === 'super_admin' ? 'bg-amber-100 text-amber-700' : a.admin_role === 'admin' ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-600'}`}>{a.admin_role || 'admin'}</span>
                <button onClick={() => setRoleChange({ id: a.user_id, role: a.admin_role || 'admin' })} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200">Role</button>
                {confirmDisable === a.user_id ? (
                  <>
                    <button onClick={() => handleDisable(a.user_id)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50">Confirm</button>
                    <button onClick={() => setConfirmDisable(null)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-xs font-semibold">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDisable(a.user_id)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {roleChange && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setRoleChange(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold text-gray-700">Change Admin Role</p>
            <select value={roleChange.role} onChange={(e) => setRoleChange({ ...roleChange, role: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
            </select>
            <div className="flex gap-2">
              <button onClick={handleChangeRole} disabled={busy} className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50">Save</button>
              <button onClick={() => setRoleChange(null)} className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ AUDIT LOGS ============
function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc('admin_list_audit_logs', { p_limit: pageSize, p_offset: page * pageSize });
      if (data) { setLogs((data as any).logs || []); setTotal((data as any).total || 0); }
      setLoading(false);
    })();
  }, [page]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Audit Logs</h2>
      {loading ? <LoadingSpinner /> : logs.length === 0 ? <EmptyState text="No audit logs." /> : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {logs.map((l) => (
                <div key={l.id} className="px-4 py-3">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{l.action}</span>
                      <span className="text-xs text-gray-400">{l.admin_email}</span>
                      {l.admin_role && <span className="text-xs text-gray-400 capitalize">· {l.admin_role}</span>}
                    </div>
                    <p className="text-xs text-gray-400">{new Date(l.created_at).toLocaleString()}</p>
                  </div>
                  {(l.reason || l.target_type) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {l.target_type && <span className="capitalize">{l.target_type}</span>}
                      {l.target_id && `: ${l.target_id.slice(0, 8)}…`}
                      {l.reason && ` — ${l.reason}`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold disabled:opacity-50 flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Prev</button>
              <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold disabled:opacity-50 flex items-center gap-1">Next <ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============ SETTINGS (cleaned) ============
function SettingsTab() {
  const [dailyLimit, setDailyLimit] = useState('50000');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Kill switch state
  const [maintenanceOn, setMaintenanceOn] = useState(false);
  const [killPassword, setKillPassword] = useState('');
  const [killBusy, setKillBusy] = useState(false);
  const [killMsg, setKillMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmEnable, setConfirmEnable] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('get_system_settings');
      if (data) {
        const s = data as any;
        setDailyLimit(s.daily_withdrawal_limit?.toString() || '50000');
      }
      const { data: cfg } = await supabase.rpc('get_app_config');
      if (cfg) {
        setMaintenanceOn((cfg as any).maintenance_mode === 'true');
      }
    })();
  }, []);

  const handleSave = async () => {
    setBusy(true); setMsg(null);
    // Keep days/hours as-is (empty strings) since they're now controlled from Site Config.
    // We only update the daily limit here.
    const { error } = await supabase.rpc('admin_update_settings', {
      p_withdrawal_days: 'mon,tue,wed,thu,fri,sat,sun',
      p_daily_withdrawal_limit: parseInt(dailyLimit),
      p_withdrawal_start_hour: 0,
      p_withdrawal_end_hour: 24,
    });
    setBusy(false);
    if (error) { setMsg('Could not save settings.'); return; }
    setMsg('Daily withdrawal limit saved.');
  };

  const handleKillToggle = async (enable: boolean) => {
    if (!killPassword) {
      setKillMsg({ type: 'error', text: 'Enter the kill-switch password.' });
      return;
    }
    setKillBusy(true);
    setKillMsg(null);
    const { error } = await supabase.rpc('admin_toggle_maintenance', {
      p_password: killPassword,
      p_enable: enable,
    });
    setKillBusy(false);
    if (error) {
      setKillMsg({ type: 'error', text: error.message.replace(/^.*?:\s*/, '') });
      setKillPassword('');
      return;
    }
    setMaintenanceOn(enable);
    setKillMsg({
      type: 'success',
      text: enable ? 'Site is now in maintenance mode.' : 'Site is back online.',
    });
    setKillPassword('');
    setConfirmEnable(false);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">System Settings</h2>

      {/* ═══════════ KILL SWITCH ═══════════ */}
      <div className={`rounded-2xl p-5 shadow-sm border-2 ${
        maintenanceOn ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'
      }`}>
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
            maintenanceOn ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'
          }`}>
            {maintenanceOn ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 flex items-center gap-2">
              Kill Switch
              {maintenanceOn && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                  Active
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              {maintenanceOn
                ? 'Non-admin users are currently seeing the maintenance screen.'
                : 'Takes the site offline for regular users. Admins keep full access.'}
            </p>
          </div>
        </div>

        {!maintenanceOn && confirmEnable && (
          <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Enabling this will hide the site from all regular users immediately. Only you and other admins will have access.
            </p>
          </div>
        )}

        {killMsg && (
          <div className={`mb-3 text-xs rounded-xl px-3 py-2 border ${
            killMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : 'bg-red-50 text-red-600 border-red-100'
          }`}>
            {killMsg.text}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            Kill-switch password
          </label>
          <input
            type="password"
            value={killPassword}
            onChange={(e) => setKillPassword(e.target.value)}
            placeholder="Enter password to unlock"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400 bg-gray-50"
            autoComplete="off"
          />
        </div>

        <div className="mt-3">
          {maintenanceOn ? (
            <button
              onClick={() => handleKillToggle(false)}
              disabled={killBusy || !killPassword}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {killBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Restoring…</> : <><Power className="w-4 h-4" /> Bring Site Back Online</>}
            </button>
          ) : !confirmEnable ? (
            <button
              onClick={() => setConfirmEnable(true)}
              disabled={!killPassword}
              className="w-full py-3 rounded-xl bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 disabled:opacity-50 border border-red-200 flex items-center justify-center gap-2"
            >
              <PowerOff className="w-4 h-4" /> Enable Maintenance Mode
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleKillToggle(true)}
                disabled={killBusy || !killPassword}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              >
                {killBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Activating…</> : <>Confirm Kill Switch</>}
              </button>
              <button
                onClick={() => setConfirmEnable(false)}
                className="px-4 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
          Only <span className="font-semibold">super admins</span> can use the kill switch.
          Every action is logged to the audit trail.
        </p>
      </div>

      {/* ═══════════ DAILY WITHDRAWAL LIMIT ═══════════ */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-gray-500" />
          <p className="text-sm font-bold text-gray-700">Daily Withdrawal Limit (FRW)</p>
        </div>
        <p className="text-xs text-gray-400">
          The maximum amount a user can withdraw per day. This caps each user's daily total across all their requests.
        </p>
        <input
          type="number"
          value={dailyLimit}
          onChange={(e) => setDailyLimit(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
        />
        <button
          onClick={handleSave}
          disabled={busy}
          className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold shadow-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Save className="w-4 h-4" /> Save Daily Limit</>}
        </button>
        {msg && <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">{msg}</div>}
      </div>

      {/* ═══════════ LINK TO SITE CONFIG ═══════════ */}
      <div className="rounded-2xl p-5 bg-blue-50 border border-blue-100">
        <div className="flex items-start gap-3">
          <Link2 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-blue-900 text-sm">Withdrawal days & hours are now in Site Config</p>
            <p className="text-xs text-blue-800 mt-1 leading-relaxed">
              To change which day each VIP tier can withdraw or the withdrawal hours, go to the
              <span className="font-semibold"> Site Config</span> tab in the sidebar.
              That's where all schedule settings now live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}