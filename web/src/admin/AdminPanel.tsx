import { useState, useEffect, useCallback, createContext } from 'react';
import {
  LayoutDashboard, Users, MessageSquare, MessagesSquare, Radio, Bot, ShoppingCart,
  Tags, Reply, HardDrive, Bell, Shield, BarChart3, Settings, FileText, Webhook,
  LogOut, Menu, X, ChevronLeft, ChevronRight, Search, RefreshCw, Download,
  Trash2, Ban, Check, AlertTriangle, Server,
  TrendingUp, Activity, Smartphone, Lock, Unlock,
  BookOpen, Mail, Flag, Sliders, UserX, UserPlus, Save, Plus, Edit, Eye, EyeOff,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
} from 'recharts';

const API_BASE = (window as { API_URL?: string }).API_URL || import.meta.env.VITE_API_URL || '';

// ========== ADMIN CONTEXT ==========
interface AdminContextType {
  token: string | null;
  admin: { id: string; username: string; role: string } | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AdminContext = createContext<AdminContextType>({
  token: null,
  admin: null,
  login: async () => false,
  logout: () => {},
  isAuthenticated: false,
});

async function adminFetch(path: string, token: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

// ========== ADMIN LOGIN ==========
function AdminLogin({ onLogin }: { onLogin: (u: string, p: string) => Promise<boolean> }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ok = await onLogin(username, password);
      if (!ok) setError('Invalid credentials');
    } catch {
      setError('Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-slate-400 mt-1">WhatsApp Business Management</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8 shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="admin"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-slate-300 text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ========== SIDEBAR ==========
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'chats', label: 'Groups & Channels', icon: MessagesSquare },
  { key: 'broadcasts', label: 'Broadcasts', icon: Radio },
  { key: 'chatbot', label: 'Chatbot & Auto-Reply', icon: Bot },
  { key: 'orders', label: 'Orders', icon: ShoppingCart },
  { key: 'labels', label: 'Labels', icon: Tags },
  { key: 'quick-replies', label: 'Quick Replies', icon: Reply },
  { key: 'media', label: 'Media & Storage', icon: HardDrive },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security & Access', icon: Shield },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'settings', label: 'System Settings', icon: Settings },
  { key: 'audit', label: 'Audit Log', icon: FileText },
  { key: 'api', label: 'API & Webhooks', icon: Webhook },
  { key: 'pages', label: 'Page Content', icon: BookOpen },
  { key: 'contacts', label: 'Contact Submissions', icon: Mail },
  { key: 'reports', label: 'Report Categories', icon: Flag },
  { key: 'app-settings', label: 'App Settings', icon: Sliders },
  { key: 'deleted-accounts', label: 'Deleted Accounts', icon: UserX },
];

function Sidebar({ active, onNav, collapsed, onToggle }: {
  active: string;
  onNav: (k: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside className={`bg-slate-900 border-r border-slate-700/50 flex flex-col h-screen transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[260px]'}`}>
      <div className="p-4 flex items-center gap-3 border-b border-slate-700/50">
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold truncate">Admin Panel</span>
          </div>
        )}
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => onNav(item.key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
              active === item.key
                ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

// ========== STAT CARD ==========
function StatCard({ label, value, icon: Icon, color = 'emerald', trend }: {
  label: string; value: string | number; icon: React.ElementType; color?: string; trend?: string;
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    amber: 'bg-amber-500/10 text-amber-400',
    rose: 'bg-rose-500/10 text-rose-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
  };
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {trend && <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {trend}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${colors[color] || colors.emerald}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// ========== DATA TABLE ==========
function DataTable({ columns, data, onRowClick, actions }: {
  columns: Array<{ key: string; label: string; render?: (val: unknown, row: Record<string, unknown>) => React.ReactNode }>;
  data: Record<string, unknown>[];
  onRowClick?: (row: Record<string, unknown>) => void;
  actions?: (row: Record<string, unknown>) => React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700/50">
            {columns.map(col => (
              <th key={col.key} className="text-left text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">{col.label}</th>
            ))}
            {actions && <th className="text-right text-slate-400 text-xs font-medium uppercase tracking-wider px-4 py-3">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-slate-700/30 ${onRowClick ? 'cursor-pointer hover:bg-slate-700/30' : ''} transition`}
            >
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-sm text-slate-300">
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '-')}
                </td>
              ))}
              {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="text-center py-12 text-slate-500">No data found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ========== PAGINATION ==========
function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50">
      <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
      <div className="flex gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm disabled:opacity-30 hover:bg-slate-600 transition">Previous</button>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm disabled:opacity-30 hover:bg-slate-600 transition">Next</button>
      </div>
    </div>
  );
}

// ========== CONFIRM DIALOG ==========
function ConfirmDialog({ open, title, message, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onCancel}>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ========== DASHBOARD ==========
const CHART_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

function DashboardPage({ token }: { token: string }) {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, unknown[]> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminFetch('/dashboard/stats', token),
      adminFetch('/dashboard/analytics?days=30', token),
    ]).then(([s, a]) => {
      setStats(s);
      setAnalytics(a);
    }).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingState />;
  if (!stats) return <ErrorState message="Failed to load dashboard" />;

  const serverHealth = stats.serverHealth as Record<string, unknown> || {};

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers as number} icon={Users} color="emerald" trend={`+${stats.newUsersToday} today`} />
        <StatCard label="Messages" value={stats.totalMessages as number} icon={MessageSquare} color="blue" />
        <StatCard label="Groups" value={stats.totalGroups as number} icon={MessagesSquare} color="purple" />
        <StatCard label="Channels" value={stats.totalChannels as number} icon={Radio} color="amber" />
        <StatCard label="Active Today" value={stats.activeUsersToday as number} icon={Activity} color="cyan" />
        <StatCard label="New This Week" value={stats.newUsersThisWeek as number} icon={TrendingUp} color="emerald" />
        <StatCard label="Orders" value={stats.totalOrders as number} icon={ShoppingCart} color="rose" />
        <StatCard label="Devices" value={stats.totalDevices as number} icon={Smartphone} color="blue" />
      </div>

      {/* Server Health */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Server className="w-5 h-5 text-emerald-400" /> Server Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="35" fill="none" stroke="#334155" strokeWidth="6" />
                <circle cx="40" cy="40" r="35" fill="none" stroke="#10b981" strokeWidth="6"
                  strokeDasharray={`${(serverHealth.cpuUsage as number || 0) * 2.2} 220`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">{serverHealth.cpuUsage as number}%</span>
            </div>
            <p className="text-slate-400 text-xs mt-2">CPU Usage</p>
          </div>
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="35" fill="none" stroke="#334155" strokeWidth="6" />
                <circle cx="40" cy="40" r="35" fill="none" stroke="#3b82f6" strokeWidth="6"
                  strokeDasharray={`${(serverHealth.memoryUsage as number || 0) * 2.2} 220`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">{serverHealth.memoryUsage as number}%</span>
            </div>
            <p className="text-slate-400 text-xs mt-2">Memory</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <p className="text-slate-400 text-xs">Total Memory</p>
            <p className="text-white font-semibold">{serverHealth.memoryTotal as number} GB</p>
            <p className="text-slate-400 text-xs mt-1">Free: {serverHealth.memoryFree as number} GB</p>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <p className="text-slate-400 text-xs">Uptime</p>
            <p className="text-white font-semibold">{Math.floor((serverHealth.uptime as number || 0) / 86400)}d {Math.floor(((serverHealth.uptime as number || 0) % 86400) / 3600)}h</p>
            <p className="text-slate-400 text-xs mt-1">{serverHealth.platform as string} / {serverHealth.hostname as string}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Growth Chart */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">User Growth (30 days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analytics.userGrowth as Record<string, unknown>[]}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="count" stroke="#10b981" fill="url(#colorUsers)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Message Volume Chart */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Message Volume (30 days)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.messageVolume as Record<string, unknown>[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Device Breakdown */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Device Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPie>
                <Pie data={analytics.deviceBreakdown as Record<string, unknown>[]} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>
                  {(analytics.deviceBreakdown as Record<string, unknown>[])?.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                <Legend />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== USER MANAGEMENT ==========
function UsersPage({ token }: { token: string }) {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ action: string; userId: string; message: string } | null>(null);
  const [selectedUser, setSelectedUser] = useState<Record<string, unknown> | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch(`/users?page=${page}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}`, token);
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async () => {
    if (!confirm) return;
    try {
      if (confirm.action === 'delete') {
        await adminFetch(`/users/${confirm.userId}`, token, { method: 'DELETE' });
      } else if (confirm.action === 'block') {
        await adminFetch(`/users/${confirm.userId}/block`, token, { method: 'PATCH' });
      }
      fetchUsers();
    } catch { /* ignore */ }
    setConfirm(null);
  };

  const exportCSV = () => {
    const csv = [
      'ID,Phone,Name,Status,Created',
      ...users.map(u => `${u.id},"${u.phoneNumber || ''}","${u.displayName || ''}","${u.status || ''}","${u.createdAt}"`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">Users <span className="text-sm font-normal text-slate-400">({total})</span></h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search users..."
              className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-64"
            />
          </div>
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={fetchUsers} className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : (
          <>
            <DataTable
              columns={[
                { key: 'displayName', label: 'Name', render: (v) => <span className="font-medium text-white">{String(v || 'Unknown')}</span> },
                { key: 'phoneNumber', label: 'Phone' },
                {
                  key: 'status', label: 'Status',
                  render: (v) => (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      v === '__BLOCKED__' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {v === '__BLOCKED__' ? <Ban className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                      {v === '__BLOCKED__' ? 'Blocked' : 'Active'}
                    </span>
                  )
                },
                { key: 'createdAt', label: 'Joined', render: (v) => <span>{v ? new Date(String(v)).toLocaleDateString() : '-'}</span> },
                { key: 'lastSeen', label: 'Last Seen', render: (v) => <span>{v ? new Date(String(v)).toLocaleString() : '-'}</span> },
              ]}
              data={users}
              onRowClick={(row) => {
                adminFetch(`/users/${row.id}`, token).then(setSelectedUser).catch(() => {});
              }}
              actions={(row) => (
                <div className="flex items-center gap-1 justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirm({ action: 'block', userId: String(row.id), message: `${row.status === '__BLOCKED__' ? 'Unblock' : 'Block'} this user?` }); }}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-amber-400 transition"
                    title={row.status === '__BLOCKED__' ? 'Unblock' : 'Block'}
                  >
                    {row.status === '__BLOCKED__' ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirm({ action: 'delete', userId: String(row.id), message: 'Permanently delete this user and all their data?' }); }}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedUser(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">User Details</h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              {(() => {
                const userData = selectedUser.user as Record<string, string | number | boolean | null> | undefined;
                if (!userData) return null;
                return Object.entries(userData).map(([k, val]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="text-white text-right max-w-[60%] truncate">{val !== null && val !== undefined ? String(val) : '-'}</span>
                  </div>
                ));
              })()}
              <hr className="border-slate-700" />
              <div className="flex justify-between"><span className="text-slate-400">Chats</span><span className="text-white">{String(selectedUser.chats)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Messages Sent</span><span className="text-white">{String(selectedUser.messages)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Devices</span><span className="text-white">{(selectedUser.devices as unknown[])?.length || 0}</span></div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title="Confirm Action"
        message={confirm?.message || ''}
        onConfirm={handleAction}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

// ========== MESSAGES ==========
function MessagesPage({ token }: { token: string }) {
  const [messages, setMessages] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch(`/messages?page=${page}&limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`, token);
      setMessages(data.messages);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, page, search]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const deleteMessage = async (id: string) => {
    if (!window.confirm('Delete this message?')) return;
    await adminFetch(`/messages/${id}`, token, { method: 'DELETE' });
    fetchMessages();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">Messages <span className="text-sm font-normal text-slate-400">({total})</span></h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search messages..." className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-64" />
          </div>
          <button onClick={fetchMessages} className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : (
          <>
            <DataTable
              columns={[
                { key: 'senderId', label: 'Sender', render: (v) => <span className="font-mono text-xs">{String(v || '-').substring(0, 12)}...</span> },
                { key: 'chatId', label: 'Chat', render: (v) => <span className="font-mono text-xs">{String(v || '-').substring(0, 12)}...</span> },
                { key: 'type', label: 'Type', render: (v) => <span className="px-2 py-0.5 bg-slate-700 rounded text-xs">{String(v || 'text')}</span> },
                { key: 'content', label: 'Content', render: (v) => <span className="max-w-[300px] truncate block">{String(v || '-')}</span> },
                { key: 'isDeleted', label: 'Deleted', render: (v) => v ? <span className="text-red-400">Yes</span> : <span className="text-emerald-400">No</span> },
                { key: 'createdAt', label: 'Date', render: (v) => <span>{v ? new Date(String(v)).toLocaleString() : '-'}</span> },
              ]}
              data={messages}
              actions={(row) => (
                <button onClick={() => deleteMessage(String(row.id))} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

// ========== GROUPS & CHANNELS ==========
function ChatsPage({ token }: { token: string }) {
  const [chats, setChats] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<Record<string, unknown> | null>(null);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch(`/chats?page=${page}&limit=20${typeFilter ? `&type=${typeFilter}` : ''}`, token);
      setChats(data.chats);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, page, typeFilter]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  const deleteChat = async (id: string) => {
    if (!window.confirm('Delete this chat and all its messages?')) return;
    await adminFetch(`/chats/${id}`, token, { method: 'DELETE' });
    fetchChats();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">Groups & Channels <span className="text-sm font-normal text-slate-400">({total})</span></h2>
        <div className="flex items-center gap-2">
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-700 rounded-lg text-sm text-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500">
            <option value="">All Types</option>
            <option value="private">Private</option>
            <option value="group">Group</option>
            <option value="channel">Channel</option>
          </select>
          <button onClick={fetchChats} className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : (
          <>
            <DataTable
              columns={[
                { key: 'name', label: 'Name', render: (v) => <span className="font-medium text-white">{String(v || 'Unnamed')}</span> },
                { key: 'type', label: 'Type', render: (v) => (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    v === 'group' ? 'bg-purple-500/20 text-purple-400' :
                    v === 'channel' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-slate-500/20 text-slate-400'
                  }`}>{String(v || 'private')}</span>
                )},
                { key: 'participantCount', label: 'Members' },
                { key: 'messageCount', label: 'Messages' },
                { key: 'createdAt', label: 'Created', render: (v) => <span>{v ? new Date(String(v)).toLocaleDateString() : '-'}</span> },
              ]}
              data={chats}
              onRowClick={(row) => {
                adminFetch(`/chats/${row.id}`, token).then(setSelectedChat).catch(() => {});
              }}
              actions={(row) => (
                <button onClick={(e) => { e.stopPropagation(); deleteChat(String(row.id)); }} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Chat Detail Modal */}
      {selectedChat && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedChat(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{String((selectedChat.chat as Record<string, unknown>)?.name || 'Chat Details')}</h3>
              <button onClick={() => setSelectedChat(null)} className="p-1 rounded-lg hover:bg-slate-700 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">Type:</span> <span className="text-white ml-2">{String((selectedChat.chat as Record<string, unknown>)?.type || '-')}</span></div>
                <div><span className="text-slate-400">Messages:</span> <span className="text-white ml-2">{String(selectedChat.messageCount)}</span></div>
              </div>
              <h4 className="text-sm font-semibold text-white mt-4">Participants ({(selectedChat.participants as unknown[])?.length || 0})</h4>
              <div className="space-y-1">
                {(selectedChat.participants as Array<Record<string, unknown>>)?.map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-700/30 rounded-lg px-3 py-2 text-sm">
                    <span className="text-white">{String((p.user as Record<string, unknown>)?.displayName || (p.user as Record<string, unknown>)?.phoneNumber || p.userId)}</span>
                    <span className="text-slate-400 text-xs">{String(p.role || 'member')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== ORDERS ==========
function OrdersPage({ token }: { token: string }) {
  const [orders, setOrders] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch(`/orders?page=${page}&limit=20${statusFilter ? `&status=${statusFilter}` : ''}`, token);
      setOrders(data.orders);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (orderId: string, status: string) => {
    await adminFetch(`/orders/${orderId}/status`, token, { method: 'PATCH', body: JSON.stringify({ status }) });
    fetchOrders();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">Orders <span className="text-sm font-normal text-slate-400">({total})</span></h2>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-800 border border-slate-700 rounded-lg text-sm text-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={fetchOrders} className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : (
          <>
            <DataTable
              columns={[
                { key: 'id', label: 'Order ID', render: (v) => <span className="font-mono text-xs">{String(v || '-').substring(0, 12)}...</span> },
                { key: 'buyerId', label: 'Buyer', render: (v) => <span className="font-mono text-xs">{String(v || '-').substring(0, 12)}...</span> },
                { key: 'totalAmount', label: 'Amount', render: (v) => <span className="font-medium text-white">${Number(v || 0).toFixed(2)}</span> },
                { key: 'status', label: 'Status', render: (v) => (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    v === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' :
                    v === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                    v === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>{String(v || 'pending')}</span>
                )},
                { key: 'createdAt', label: 'Date', render: (v) => <span>{v ? new Date(String(v)).toLocaleDateString() : '-'}</span> },
              ]}
              data={orders}
              actions={(row) => (
                <select
                  value={String(row.status || 'pending')}
                  onChange={e => updateStatus(String(row.id), e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded text-xs text-white px-2 py-1 focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              )}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

// ========== GENERIC LIST PAGES ==========
function GenericListPage({ token, title, endpoint, columns }: {
  token: string;
  title: string;
  endpoint: string;
  columns: Array<{ key: string; label: string; render?: (v: unknown, row: Record<string, unknown>) => React.ReactNode }>;
}) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch(endpoint, token).then(d => {
      setData(Array.isArray(d) ? d : d.data || d.logs || d.devices?.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token, endpoint]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">{title} <span className="text-sm font-normal text-slate-400">({data.length})</span></h2>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : <DataTable columns={columns} data={data} />}
      </div>
    </div>
  );
}

// ========== LABELS ==========
function LabelsPage({ token }: { token: string }) {
  return (
    <GenericListPage
      token={token} title="Labels" endpoint="/labels"
      columns={[
        { key: 'name', label: 'Name', render: (v) => <span className="font-medium text-white">{String(v || '-')}</span> },
        { key: 'color', label: 'Color', render: (v) => (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: String(v || '#888') }} />
            <span>{String(v || '-')}</span>
          </div>
        )},
        { key: 'createdAt', label: 'Created', render: (v) => <span>{v ? new Date(String(v)).toLocaleDateString() : '-'}</span> },
      ]}
    />
  );
}

// ========== QUICK REPLIES ==========
function QuickRepliesPage({ token }: { token: string }) {
  return (
    <GenericListPage
      token={token} title="Quick Replies" endpoint="/quick-replies"
      columns={[
        { key: 'shortcut', label: 'Shortcut', render: (v) => <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-emerald-400">/{String(v || '')}</span> },
        { key: 'message', label: 'Message', render: (v) => <span className="max-w-[400px] truncate block">{String(v || '-')}</span> },
        { key: 'createdAt', label: 'Created', render: (v) => <span>{v ? new Date(String(v)).toLocaleDateString() : '-'}</span> },
      ]}
    />
  );
}

// ========== CHATBOT ==========
function ChatbotPage({ token }: { token: string }) {
  return (
    <GenericListPage
      token={token} title="Chatbot & Auto-Reply" endpoint="/chatbot-configs"
      columns={[
        { key: 'trigger', label: 'Trigger', render: (v) => <span className="font-mono bg-slate-700 px-2 py-0.5 rounded text-amber-400">{String(v || '-')}</span> },
        { key: 'response', label: 'Response', render: (v) => <span className="max-w-[400px] truncate block">{String(v || '-')}</span> },
        { key: 'isActive', label: 'Active', render: (v) => v ? <span className="text-emerald-400">Active</span> : <span className="text-slate-500">Inactive</span> },
        { key: 'createdAt', label: 'Created', render: (v) => <span>{v ? new Date(String(v)).toLocaleDateString() : '-'}</span> },
      ]}
    />
  );
}

// ========== BROADCASTS ==========
function BroadcastsPage({ token }: { token: string }) {
  return (
    <GenericListPage
      token={token} title="Broadcasts" endpoint="/chats?type=broadcast"
      columns={[
        { key: 'name', label: 'Name', render: (v) => <span className="font-medium text-white">{String(v || 'Unnamed')}</span> },
        { key: 'participantCount', label: 'Recipients' },
        { key: 'messageCount', label: 'Messages' },
        { key: 'createdAt', label: 'Created', render: (v) => <span>{v ? new Date(String(v)).toLocaleDateString() : '-'}</span> },
      ]}
    />
  );
}

// ========== SECURITY & ACCESS ==========
function SecurityPage({ token }: { token: string }) {
  const [sessions, setSessions] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch('/sessions', token);
      setSessions(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const revokeSession = async (id: string) => {
    if (!window.confirm('Revoke this session?')) return;
    await adminFetch(`/sessions/${id}`, token, { method: 'DELETE' });
    fetchSessions();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">Security & Access</h2>
        <button onClick={fetchSessions} className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50">
          <h3 className="text-sm font-semibold text-white">Active Sessions ({sessions.length})</h3>
        </div>
        {loading ? <LoadingState /> : (
          <DataTable
            columns={[
              { key: 'userId', label: 'User', render: (v) => <span className="font-mono text-xs">{String(v || '-').substring(0, 16)}...</span> },
              { key: 'deviceType', label: 'Device' },
              { key: 'createdAt', label: 'Created', render: (v) => <span>{v ? new Date(String(v)).toLocaleString() : '-'}</span> },
              { key: 'expiresAt', label: 'Expires', render: (v) => <span>{v ? new Date(String(v)).toLocaleString() : '-'}</span> },
            ]}
            data={sessions}
            actions={(row) => (
              <button onClick={() => revokeSession(String(row.id))} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition" title="Revoke">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          />
        )}
      </div>
    </div>
  );
}

// ========== ANALYTICS ==========
function AnalyticsPage({ token }: { token: string }) {
  const [analytics, setAnalytics] = useState<Record<string, unknown[]> | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminFetch(`/dashboard/analytics?days=${days}`, token).then(setAnalytics).catch(() => {}).finally(() => setLoading(false));
  }, [token, days]);

  if (loading) return <LoadingState />;
  if (!analytics) return <ErrorState message="Failed to load analytics" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">Analytics</h2>
        <select value={days} onChange={e => setDays(Number(e.target.value))}
          className="bg-slate-800 border border-slate-700 rounded-lg text-sm text-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">User Registrations</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.userGrowth as Record<string, unknown>[]}>
              <defs>
                <linearGradient id="colorUG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="count" stroke="#10b981" fill="url(#colorUG)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Daily Messages</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.messageVolume as Record<string, unknown>[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Device Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPie>
              <Pie data={analytics.deviceBreakdown as Record<string, unknown>[]} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={100} label>
                {(analytics.deviceBreakdown as Record<string, unknown>[])?.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              <Legend />
            </RechartsPie>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ========== AUDIT LOG ==========
function AuditLogPage({ token }: { token: string }) {
  const [logs, setLogs] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminFetch(`/audit-logs?page=${page}&limit=50`, token).then(data => {
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token, page]);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Audit Log <span className="text-sm font-normal text-slate-400">({total})</span></h2>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : (
          <>
            <DataTable
              columns={[
                { key: 'action', label: 'Action', render: (v) => (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    String(v).includes('DELETE') ? 'bg-red-500/20 text-red-400' :
                    String(v).includes('BLOCK') ? 'bg-amber-500/20 text-amber-400' :
                    String(v).includes('LOGIN') ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>{String(v)}</span>
                )},
                { key: 'details', label: 'Details', render: (v) => <span className="max-w-[400px] truncate block">{String(v || '-')}</span> },
                { key: 'adminId', label: 'Admin', render: (v) => <span className="font-mono text-xs">{String(v || '-')}</span> },
                { key: 'targetId', label: 'Target', render: (v) => v ? <span className="font-mono text-xs">{String(v).substring(0, 12)}...</span> : <span>-</span> },
                { key: 'createdAt', label: 'Time', render: (v) => <span>{v ? new Date(String(v)).toLocaleString() : '-'}</span> },
              ]}
              data={logs}
            />
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

// ========== SYSTEM SETTINGS ==========
function SettingsPage({ token }: { token: string }) {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/settings', token).then(setSettings).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">System Settings</h2>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Environment Configuration</h3>
        <div className="space-y-3">
          {settings && Object.entries(settings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3">
              <span className="text-slate-300 font-mono text-sm">{key}</span>
              <span className="text-white text-sm font-medium">{key.includes('SECRET') || key.includes('TOKEN') ? '••••••••' : value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button className="flex items-center gap-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg p-4 transition text-left">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Download className="w-5 h-5 text-blue-400" /></div>
            <div>
              <p className="text-white text-sm font-medium">Backup Database</p>
              <p className="text-slate-400 text-xs">Export full database backup</p>
            </div>
          </button>
          <button className="flex items-center gap-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg p-4 transition text-left">
            <div className="p-2 bg-amber-500/10 rounded-lg"><RefreshCw className="w-5 h-5 text-amber-400" /></div>
            <div>
              <p className="text-white text-sm font-medium">Clear Cache</p>
              <p className="text-slate-400 text-xs">Reset all caches</p>
            </div>
          </button>
          <button className="flex items-center gap-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg p-4 transition text-left">
            <div className="p-2 bg-red-500/10 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
            <div>
              <p className="text-white text-sm font-medium">Maintenance Mode</p>
              <p className="text-slate-400 text-xs">Enable/disable maintenance</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== MEDIA & STORAGE ==========
function MediaPage({ token }: { token: string }) {
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/dashboard/stats', token).then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Media & Storage</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Messages (incl. media)" value={stats?.totalMessages as number || 0} icon={HardDrive} color="blue" />
        <StatCard label="Total Chats" value={stats?.totalChats as number || 0} icon={MessageSquare} color="purple" />
        <StatCard label="Total Users" value={stats?.totalUsers as number || 0} icon={Users} color="emerald" />
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Storage Overview</h3>
        <p className="text-slate-400 text-sm">Media files are stored on the server filesystem. Use FileBrowser at <a href="http://208.110.87.24:8443" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">http://208.110.87.24:8443</a> to manage files directly.</p>
      </div>
    </div>
  );
}

// ========== NOTIFICATIONS ==========
function NotificationsPage({ token }: { token: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Notifications & FCM</h2>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Push Notification Configuration</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3">
            <span className="text-slate-300 text-sm">FCM Service Account</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">Configured</span>
          </div>
          <div className="flex items-center justify-between bg-slate-700/30 rounded-lg px-4 py-3">
            <span className="text-slate-300 text-sm">Web Push (VAPID)</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">Active</span>
          </div>
        </div>
      </div>
      <GenericListPage
        token={token} title="Registered Devices" endpoint="/devices"
        columns={[
          { key: 'userId', label: 'User', render: (v) => <span className="font-mono text-xs">{String(v || '-').substring(0, 16)}...</span> },
          { key: 'deviceType', label: 'Type', render: (v) => <span className="px-2 py-0.5 bg-slate-700 rounded text-xs">{String(v || 'unknown')}</span> },
          { key: 'createdAt', label: 'Registered', render: (v) => <span>{v ? new Date(String(v)).toLocaleDateString() : '-'}</span> },
        ]}
      />
    </div>
  );
}

// ========== API & WEBHOOKS ==========
function APIPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">API & Webhooks</h2>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">API Endpoints</h3>
        <div className="space-y-2 text-sm">
          {[
            { method: 'GET', path: '/api/health', desc: 'Health check' },
            { method: 'POST', path: '/api/auth/request-otp', desc: 'Request OTP' },
            { method: 'POST', path: '/api/auth/verify-otp', desc: 'Verify OTP & login' },
            { method: 'GET', path: '/api/users/me', desc: 'Get current user' },
            { method: 'GET', path: '/api/chats', desc: 'List chats' },
            { method: 'POST', path: '/api/chats', desc: 'Create chat' },
            { method: 'GET', path: '/api/messages/:chatId', desc: 'Get messages' },
            { method: 'POST', path: '/api/messages', desc: 'Send message' },
            { method: 'GET', path: '/api/contacts', desc: 'List contacts' },
            { method: 'GET', path: '/api/products', desc: 'List products' },
            { method: 'GET', path: '/api/labels', desc: 'List labels' },
            { method: 'GET', path: '/admin/*', desc: 'Admin API (requires admin token)' },
          ].map(api => (
            <div key={api.path} className="flex items-center gap-3 bg-slate-700/30 rounded-lg px-4 py-2">
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                api.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400' :
                api.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                'bg-amber-500/20 text-amber-400'
              }`}>{api.method}</span>
              <span className="text-white font-mono flex-1">{api.path}</span>
              <span className="text-slate-400">{api.desc}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">API Documentation</h3>
        <p className="text-slate-400 text-sm">
          Swagger API documentation is available at{' '}
          <a href="/api/docs" target="_blank" className="text-emerald-400 hover:underline">/api/docs</a>
        </p>
      </div>
    </div>
  );
}

// ========== LOADING & ERROR STATES ==========
// ========== PAGE CONTENT MANAGEMENT ==========
function PageContentPage({ token }: { token: string }) {
  const [pages, setPages] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState({ slug: '', title: '', content: '' });
  const [showForm, setShowForm] = useState(false);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch('/pages', token);
      setPages(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const handleSave = async () => {
    try {
      if (editing) {
        await adminFetch(`/pages/${editing.id}`, token, {
          method: 'PATCH',
          body: JSON.stringify({ title: formData.title, content: formData.content }),
        });
      } else {
        await adminFetch('/pages', token, {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowForm(false);
      setEditing(null);
      setFormData({ slug: '', title: '', content: '' });
      fetchPages();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    await adminFetch(`/pages/${id}`, token, { method: 'DELETE' });
    fetchPages();
  };

  const startEdit = (page: Record<string, unknown>) => {
    setEditing(page);
    setFormData({ slug: page.slug as string, title: page.title as string, content: page.content as string });
    setShowForm(true);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Page Content</h2>
        <button onClick={() => { setEditing(null); setFormData({ slug: '', title: '', content: '' }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm transition">
          <Plus className="w-4 h-4" /> Add Page
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">{editing ? 'Edit Page' : 'New Page'}</h3>
          {!editing && (
            <input value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value })}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm" placeholder="slug (e.g. privacy-policy)" />
          )}
          <input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm" placeholder="Page Title" />
          <textarea value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm h-48" placeholder="Page content (HTML supported)" />
          <div className="flex gap-3">
            <button onClick={handleSave} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm transition flex items-center gap-2">
              <Save className="w-4 h-4" /> Save
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <DataTable
          columns={[
            { key: 'slug', label: 'Slug' },
            { key: 'title', label: 'Title' },
            { key: 'isPublished', label: 'Published', render: (v) => (
              <span className={`px-2 py-0.5 rounded-full text-xs ${v ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'}`}>
                {v ? 'Published' : 'Draft'}
              </span>
            )},
            { key: 'updatedAt', label: 'Updated', render: (v) => new Date(v as string).toLocaleDateString() },
          ]}
          data={pages}
          actions={(row) => (
            <div className="flex gap-2 justify-end">
              <button onClick={() => startEdit(row)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition"><Edit className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(row.id as string)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
        />
      </div>
    </div>
  );
}

// ========== CONTACT SUBMISSIONS ==========
function ContactSubmissionsPage({ token }: { token: string }) {
  const [submissions, setSubmissions] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch(`/contact-submissions?page=${page}&limit=20${selectedStatus ? `&status=${selectedStatus}` : ''}`, token);
      setSubmissions(data.submissions);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, page, selectedStatus]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const updateStatus = async (id: string, status: string) => {
    await adminFetch(`/contact-submissions/${id}`, token, { method: 'PATCH', body: JSON.stringify({ status }) });
    fetchSubmissions();
  };

  const deleteSubmission = async (id: string) => {
    await adminFetch(`/contact-submissions/${id}`, token, { method: 'DELETE' });
    fetchSubmissions();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Contact Submissions <span className="text-sm text-slate-400 font-normal">({total})</span></h2>
        <div className="flex gap-2">
          {['', 'pending', 'read', 'replied', 'archived'].map(s => (
            <button key={s} onClick={() => { setSelectedStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${selectedStatus === s ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'subject', label: 'Subject' },
            { key: 'message', label: 'Message', render: (v) => <span className="truncate max-w-xs block">{String(v)}</span> },
            { key: 'status', label: 'Status', render: (v) => {
              const colors: Record<string, string> = { pending: 'bg-amber-500/20 text-amber-400', read: 'bg-blue-500/20 text-blue-400', replied: 'bg-emerald-500/20 text-emerald-400', archived: 'bg-slate-500/20 text-slate-400' };
              return <span className={`px-2 py-0.5 rounded-full text-xs ${colors[v as string] || 'bg-slate-500/20 text-slate-400'}`}>{String(v)}</span>;
            }},
            { key: 'createdAt', label: 'Date', render: (v) => new Date(v as string).toLocaleDateString() },
          ]}
          data={submissions}
          actions={(row) => (
            <div className="flex gap-1 justify-end">
              {row.status === 'pending' && <button onClick={() => updateStatus(row.id as string, 'read')} className="p-1.5 rounded-lg hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 transition" title="Mark as read"><Eye className="w-4 h-4" /></button>}
              {row.status !== 'archived' && <button onClick={() => updateStatus(row.id as string, 'archived')} className="p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-white transition" title="Archive"><EyeOff className="w-4 h-4" /></button>}
              <button onClick={() => deleteSubmission(row.id as string)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}

// ========== REPORT CATEGORIES ==========
function ReportCategoriesPage({ token }: { token: string }) {
  const [categories, setCategories] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [showForm, setShowForm] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch('/report-categories', token);
      setCategories(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleCreate = async () => {
    await adminFetch('/report-categories', token, { method: 'POST', body: JSON.stringify(formData) });
    setFormData({ name: '', description: '' });
    setShowForm(false);
    fetchCategories();
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await adminFetch(`/report-categories/${id}`, token, { method: 'PATCH', body: JSON.stringify({ isActive: !isActive }) });
    fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    await adminFetch(`/report-categories/${id}`, token, { method: 'DELETE' });
    fetchCategories();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Report Categories</h2>
        <div className="flex gap-2">
          <button onClick={() => { adminFetch('/app-settings/seed', token, { method: 'POST' }).then(() => fetchCategories()); }}
            className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition">Seed Defaults</button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm transition">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-4">
          <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm" placeholder="Category name" />
          <input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm" placeholder="Description" />
          <div className="flex gap-3">
            <button onClick={handleCreate} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm transition">Create</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'description', label: 'Description' },
            { key: 'isActive', label: 'Active', render: (v) => (
              <span className={`px-2 py-0.5 rounded-full text-xs ${v ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {v ? 'Active' : 'Disabled'}
              </span>
            )},
          ]}
          data={categories}
          actions={(row) => (
            <div className="flex gap-2 justify-end">
              <button onClick={() => toggleActive(row.id as string, row.isActive as boolean)}
                className={`p-1.5 rounded-lg transition ${row.isActive ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400'}`}>
                {row.isActive ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              </button>
              <button onClick={() => deleteCategory(row.id as string)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
        />
      </div>
    </div>
  );
}

// ========== APP SETTINGS ==========
function AppSettingsPage({ token }: { token: string }) {
  const [settings, setSettings] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('media');
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const categories = ['media', 'email', 'user_control', 'general'];
  const categoryLabels: Record<string, string> = { media: 'Media Settings', email: 'Email Configuration', user_control: 'User Control', general: 'General' };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch(`/app-settings?category=${activeCategory}`, token);
      setSettings(data);
      const vals: Record<string, string> = {};
      data.forEach((s: Record<string, unknown>) => { vals[s.key as string] = s.value as string; });
      setEditValues(vals);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, activeCategory]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    const settingsArr = Object.entries(editValues).map(([key, value]) => ({ key, value, category: activeCategory }));
    await adminFetch('/app-settings', token, { method: 'PUT', body: JSON.stringify({ settings: settingsArr }) });
    setSaving(false);
    fetchSettings();
  };

  const seedDefaults = async () => {
    await adminFetch('/app-settings/seed', token, { method: 'POST' });
    fetchSettings();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">App Settings</h2>
        <button onClick={seedDefaults} className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition">Seed Defaults</button>
      </div>

      <div className="flex gap-2">
        {categories.map(c => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className={`px-4 py-2 rounded-lg text-sm transition ${activeCategory === c ? 'bg-emerald-500/20 text-emerald-400 font-medium' : 'bg-slate-700 text-slate-400 hover:text-white'}`}>
            {categoryLabels[c]}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-4">
        {settings.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No settings found. Click "Seed Defaults" to create default settings.</p>
        ) : settings.map((s) => (
          <div key={s.key as string} className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <label className="block text-sm font-medium text-slate-300">{(s.key as string).replace(/_/g, ' ').replace(/^(media|email|user) /, '')}</label>
              {s.description && <p className="text-xs text-slate-500 mt-0.5">{String(s.description)}</p>}
            </div>
            <input
              value={editValues[s.key as string] || ''}
              onChange={e => setEditValues({ ...editValues, [s.key as string]: e.target.value })}
              className="w-72 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
              type={(s.key as string).includes('pass') ? 'password' : 'text'}
            />
          </div>
        ))}
        {settings.length > 0 && (
          <div className="pt-4 border-t border-slate-700/50">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm transition">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ========== DELETED ACCOUNTS ==========
function DeletedAccountsPage({ token }: { token: string }) {
  const [users, setUsers] = useState<Array<Record<string, unknown>>>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchDeleted = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch(`/deleted-accounts?page=${page}&limit=20`, token);
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, page]);

  useEffect(() => { fetchDeleted(); }, [fetchDeleted]);

  const restoreUser = async (id: string) => {
    await adminFetch(`/users/${id}/restore`, token, { method: 'POST' });
    fetchDeleted();
  };

  const permanentDelete = async (id: string) => {
    await adminFetch(`/users/${id}`, token, { method: 'DELETE' });
    fetchDeleted();
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Deleted Accounts</h2>
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <DataTable
          columns={[
            { key: 'phoneNumber', label: 'Phone' },
            { key: 'displayName', label: 'Name' },
            { key: 'updatedAt', label: 'Deleted At', render: (v) => new Date(v as string).toLocaleDateString() },
          ]}
          data={users}
          actions={(row) => (
            <div className="flex gap-2 justify-end">
              <button onClick={() => restoreUser(row.id as string)} className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition" title="Restore"><UserPlus className="w-4 h-4" /></button>
              <button onClick={() => permanentDelete(row.id as string)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition" title="Permanently delete"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
        />
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">{message}</p>
      </div>
    </div>
  );
}

// ========== MAIN ADMIN PANEL ==========
export function AdminPanel() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('admin_token'));
  const [admin, setAdmin] = useState<{ id: string; username: string; role: string } | null>(() => {
    const stored = localStorage.getItem('admin_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [activePage, setActivePage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setToken(data.token);
      setAdmin(data.admin);
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_user', JSON.stringify(data.admin));
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setAdmin(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  };

  // Verify token on load
  useEffect(() => {
    if (token) {
      adminFetch('/auth/me', token).catch(() => {
        logout();
      });
    }
  }, [token]);

  if (!token || !admin) {
    return <AdminLogin onLogin={login} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage token={token} />;
      case 'users': return <UsersPage token={token} />;
      case 'messages': return <MessagesPage token={token} />;
      case 'chats': return <ChatsPage token={token} />;
      case 'broadcasts': return <BroadcastsPage token={token} />;
      case 'chatbot': return <ChatbotPage token={token} />;
      case 'orders': return <OrdersPage token={token} />;
      case 'labels': return <LabelsPage token={token} />;
      case 'quick-replies': return <QuickRepliesPage token={token} />;
      case 'media': return <MediaPage token={token} />;
      case 'notifications': return <NotificationsPage token={token} />;
      case 'security': return <SecurityPage token={token} />;
      case 'analytics': return <AnalyticsPage token={token} />;
      case 'settings': return <SettingsPage token={token} />;
      case 'audit': return <AuditLogPage token={token} />;
      case 'api': return <APIPage />;
      case 'pages': return <PageContentPage token={token} />;
      case 'contacts': return <ContactSubmissionsPage token={token} />;
      case 'reports': return <ReportCategoriesPage token={token} />;
      case 'app-settings': return <AppSettingsPage token={token} />;
      case 'deleted-accounts': return <DeletedAccountsPage token={token} />;
      default: return <DashboardPage token={token} />;
    }
  };

  return (
    <AdminContext.Provider value={{ token, admin, login, logout, isAuthenticated: !!token }}>
      <div className="flex h-screen bg-slate-900 text-white">
        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* Sidebar - hidden on mobile unless menu is open */}
        <div className={`fixed md:relative z-50 md:z-auto transition-transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <Sidebar
            active={activePage}
            onNav={(k) => { setActivePage(k); setMobileMenuOpen(false); }}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {/* Top bar */}
          <header className="sticky top-0 bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50 px-4 md:px-6 py-3 flex items-center justify-between z-30">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 md:hidden">
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-semibold text-white capitalize">{NAV_ITEMS.find(n => n.key === activePage)?.label || 'Dashboard'}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400 hidden md:block">
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium mr-2">{admin.role}</span>
                {admin.username}
              </span>
              <button onClick={logout} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </header>

          {/* Page content */}
          <div className="p-4 md:p-6">
            {renderPage()}
          </div>
        </main>
      </div>
    </AdminContext.Provider>
  );
}

export default AdminPanel;
