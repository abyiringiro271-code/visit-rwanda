import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useLang } from '@/lib/lang';
import {
  Home, Package, ListTodo, Users, User, LogOut, Sun, Moon, Leaf, Globe,
  type LucideIcon,
} from 'lucide-react';
import Logo from './Logo';
import HomePage from './pages/HomePage';
import ProductPage from './pages/ProductPage';
import TaskPage from './pages/TaskPage';
import TeamPage from './pages/TeamPage';
import MePage from './pages/MePage';

// ─── Change these three URLs to your real links ────────────────────────
const WHATSAPP_LINK = 'https://chat.whatsapp.com/YOUR_INVITE_CODE';
const TELEGRAM_LINK = 'https://t.me/+8eD1q-ej04o4MWU0';
const APK_LINK = 'https://example.com/your-app.apk';
// ───────────────────────────────────────────────────────────────────────

type Tab = 'home' | 'product' | 'task' | 'team' | 'me';

export default function Dashboard({ isAdmin = false }: { isAdmin?: boolean }) {
  const { profile, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('home');

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-light flex flex-col">
      <Header profile={profile} onSignOut={signOut} />

      {/* ─── Responsive container: narrow on phone, wider on desktop ─── */}
      <main className="flex-1 w-full mx-auto px-5 md:px-8 lg:px-12 py-6 md:py-8 max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1600px]">
        {tab === 'home' && <HomePage onNavigate={setTab} />}
        {tab === 'product' && <ProductPage />}
        {tab === 'task' && <TaskPage />}
        {tab === 'team' && <TeamPage />}
        {tab === 'me' && <MePage />}

        <div
          style={{ height: 'calc(100px + env(safe-area-inset-bottom, 0px))' }}
          aria-hidden="true"
        />
      </main>

      <FloatingActions />
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

// ─── Floating buttons (WhatsApp, Telegram, APK) ────────────────────────
function FloatingActions() {
  const buttons = [
    {
      label: 'WhatsApp',
      link: WHATSAPP_LINK,
      bg: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
      shadow: 'rgba(37, 211, 102, 0.4)',
      icon: (
        <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
    },
    {
      label: 'Telegram',
      link: TELEGRAM_LINK,
      bg: 'linear-gradient(135deg, #2AABEE 0%, #229ED9 100%)',
      shadow: 'rgba(42, 171, 238, 0.4)',
      icon: (
        <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
    },
    {
      label: 'Download APK',
      link: APK_LINK,
      bg: 'linear-gradient(135deg, #FF7A00 0%, #E56D00 100%)',
      shadow: 'rgba(255, 122, 0, 0.45)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="fixed right-2 md:right-4 z-40 flex flex-col gap-2 pointer-events-none"
      style={{ bottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
    >
      {buttons.map((b) => (
        <a
          key={b.label}
          href={b.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={b.label}
          className="pointer-events-auto group relative flex items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95"
          style={{
            width: '44px',
            height: '44px',
            background: b.bg,
            boxShadow: `0 4px 14px ${b.shadow}`,
          }}
        >
          {b.icon}
          <span className="absolute right-[52px] top-1/2 -translate-y-1/2 whitespace-nowrap bg-navy text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {b.label}
          </span>
        </a>
      ))}
    </div>
  );
}

function Header({ profile, onSignOut }: { profile: NonNullable<ReturnType<typeof useAuth>['profile']>; onSignOut: () => void }) {
  const { theme, cycle } = useTheme();
  const { lang, toggle: toggleLang } = useLang();
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Leaf;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-navy/5">
      {/* Header matches main container width */}
      <div className="w-full mx-auto px-5 md:px-8 lg:px-12 py-3.5 flex items-center justify-between gap-3 max-w-7xl xl:max-w-[1400px] 2xl:max-w-[1600px]">
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo size={36} />
          <div className="min-w-0">
            <p className="text-navy font-bold text-base leading-none font-display truncate">
              Visit Rwanda
            </p>
            <p className="hidden sm:block text-navy/40 text-[11px] leading-none mt-1 truncate">
              Earn while you explore
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex flex-col items-end px-3 py-1.5 rounded-xl border border-navy/10">
            <p className="text-navy/45 text-[10px] uppercase tracking-wide font-semibold leading-tight">
              Balance
            </p>
            <p className="text-navy font-bold text-sm leading-tight">
              {profile.balance.toLocaleString()} FRW
            </p>
          </div>

          <button
            onClick={toggleLang}
            className="h-9 px-2.5 rounded-xl border border-navy/10 flex items-center gap-1 text-navy/60 text-[10px] font-bold uppercase active:scale-95 transition-transform"
          >
            <Globe className="w-3.5 h-3.5" />
            {lang === 'en' ? 'EN' : 'RW'}
          </button>

          <button
            onClick={cycle}
            className="w-9 h-9 rounded-xl border border-navy/10 flex items-center justify-center text-navy/60 active:scale-95 transition-transform"
          >
            <ThemeIcon className="w-4 h-4" />
          </button>

          <button
            onClick={onSignOut}
            className="w-9 h-9 rounded-xl border border-navy/10 flex items-center justify-center text-navy/60 hover:text-red-500 hover:border-red-200 active:scale-95 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { t } = useLang();

  const items: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: 'home', label: t('home'), icon: Home },
    { key: 'product', label: t('vipTiers'), icon: Package },
    { key: 'task', label: t('tasks'), icon: ListTodo },
    { key: 'team', label: t('myTeam'), icon: Users },
    { key: 'me', label: t('mine'), icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-navy/5"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="w-full max-w-2xl mx-auto flex items-stretch">
        {items.map((item) => {
          const active = tab === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`relative flex-1 flex flex-col items-center gap-0.5 pt-2.5 pb-2 transition-colors ${
                active ? 'text-brand-orange' : 'text-navy/40'
              }`}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-brand-orange" />
              )}
              <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
              <span className="text-[10px] font-semibold leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}