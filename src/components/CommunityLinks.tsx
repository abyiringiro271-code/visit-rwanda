import { useLang } from '@/lib/lang';
import { useConfig } from '@/lib/config';
import { MessageCircle, Send, Smartphone, ExternalLink, type LucideIcon } from 'lucide-react';

interface CommunityLink {
  label: string;
  href: string;
  icon: LucideIcon;
  gradient: string;
  shadow: string;
}

export default function CommunityLinks({ variant = 'card' }: { variant?: 'card' | 'inline' }) {
  const { t } = useLang();
  const { config } = useConfig();

  const links: CommunityLink[] = [];

  if (config.whatsapp_link && config.whatsapp_link.trim()) {
    links.push({
      label: t('whatsappGroup'),
      href: config.whatsapp_link,
      icon: MessageCircle,
      gradient: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
      shadow: '0 8px 24px rgba(37, 211, 102, 0.30)',
    });
  }

  if (config.telegram_link && config.telegram_link.trim()) {
    links.push({
      label: t('telegramGroup'),
      href: config.telegram_link,
      icon: Send,
      gradient: 'linear-gradient(135deg, #29A9EB 0%, #168ACD 100%)',
      shadow: '0 8px 24px rgba(41, 169, 235, 0.30)',
    });
  }

  if (config.apk_url && config.apk_url.trim()) {
    links.push({
      label: t('apkDownload'),
      href: config.apk_url,
      icon: Smartphone,
      gradient: 'linear-gradient(135deg, #1E3A5F 0%, #0B1F3A 100%)',
      shadow: '0 8px 24px rgba(11, 31, 58, 0.30)',
    });
  }

  if (links.length === 0) return null;

  // ─── INLINE variant — for AuthScreen (dark card, small pills) ───
  if (variant === 'inline') {
    return (
      <div className="mt-5">
        <p className="text-center text-white/50 text-[10px] font-bold uppercase tracking-widest mb-3">
          {t('joinCommunity')}
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white text-[11px] font-semibold hover:bg-white/20 transition-all active:scale-95"
              >
                <Icon className="w-3.5 h-3.5" />
                {link.label}
              </a>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── CARD variant — for HomePage (colorful tiles) ───
  return (
    <div className="bg-white rounded-2xl p-6 border border-navy/5">
      <div className="mb-4">
        <p className="text-base font-bold text-navy font-display">{t('joinCommunityTitle')}</p>
        <p className="text-xs text-navy/50 mt-0.5">{t('joinCommunityDesc')}</p>
      </div>

      <div className={`grid gap-3 ${links.length === 1 ? 'grid-cols-1' : links.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-2xl p-4 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: link.gradient, boxShadow: link.shadow }}
            >
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-white/10 blur-2xl group-hover:bg-white/20 transition-colors" />
              <div className="relative">
                <Icon className="w-6 h-6 mb-3 opacity-95" strokeWidth={2} />
                <p className="text-sm font-bold leading-tight pr-6">{link.label}</p>
              </div>
              <ExternalLink className="absolute top-4 right-4 w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </a>
          );
        })}
      </div>
    </div>
  );
}