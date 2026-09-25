import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useConfig } from '@/lib/config';
import { Save, Loader2, Check, Link2, Coins, Phone, Mail, AlertTriangle, CalendarClock } from 'lucide-react';

interface ConfigItem {
  key: string;
  value: string;
  label: string;
  description: string;
  category: string;
  input_type: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  links: 'Community Links',
  payment: 'Payment Settings',
  withdrawal: 'Withdrawal Schedule',
  contact: 'Contact Info',
  general: 'General',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  links: <Link2 className="w-4 h-4" />,
  payment: <Coins className="w-4 h-4" />,
  withdrawal: <CalendarClock className="w-4 h-4" />,
  contact: <Phone className="w-4 h-4" />,
  general: <Mail className="w-4 h-4" />,
};

const DAYS = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
];

export default function ConfigTab() {
  const { reload: reloadGlobal } = useConfig();
  const [items, setItems] = useState<ConfigItem[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('admin_list_config');
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    const rows = (data as ConfigItem[]) || [];
    setItems(rows);
    const seed: Record<string, string> = {};
    rows.forEach((r) => { seed[r.key] = r.value; });
    setEdits(seed);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (key: string) => {
    setSaving(key);
    setError(null);
    const { error: err } = await supabase.rpc('admin_update_config', {
      p_key: key,
      p_value: edits[key] ?? '',
    });
    setSaving(null);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(key);
    setItems((prev) => prev.map((it) => it.key === key ? { ...it, value: edits[key] ?? '', updated_at: new Date().toISOString() } : it));
    await reloadGlobal();
    setTimeout(() => setSaved(null), 1800);
  };

  const grouped: Record<string, ConfigItem[]> = {};
  items.forEach((it) => {
    if (!grouped[it.category]) grouped[it.category] = [];
    grouped[it.category].push(it);
  });

  const categoryOrder = ['links', 'payment', 'withdrawal', 'contact', 'general'];
  const orderedCategories = categoryOrder.filter((c) => grouped[c]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Site Configuration</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Update links, payment details, and withdrawal schedule. Changes apply instantly across the app.
          </p>
        </div>
        <button
          onClick={load}
          className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
        >
          Reload
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {orderedCategories.map((category) => (
        <div key={category} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              {CATEGORY_ICONS[category]}
            </div>
            <p className="text-sm font-bold text-gray-900">
              {CATEGORY_LABELS[category] || category}
            </p>
          </div>

          <div className="divide-y divide-gray-50">
            {grouped[category].map((item) => {
              const dirty = edits[item.key] !== item.value;
              const isSaving = saving === item.key;
              const isSaved = saved === item.key;

              return (
                <div key={item.key} className="p-5 space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      {item.label}
                    </label>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {item.input_type === 'day' ? (
                      <select
                        value={edits[item.key] ?? ''}
                        onChange={(e) => setEdits({ ...edits, [item.key]: e.target.value })}
                        className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
                      >
                        {DAYS.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    ) : item.input_type === 'number' ? (
                      <input
                        type="number"
                        value={edits[item.key] ?? ''}
                        onChange={(e) => setEdits({ ...edits, [item.key]: e.target.value })}
                        className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
                        placeholder={item.label}
                      />
                    ) : item.input_type === 'toggle' ? (
                      <select
                        value={edits[item.key] ?? 'false'}
                        onChange={(e) => setEdits({ ...edits, [item.key]: e.target.value })}
                        className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
                      >
                        <option value="false">Off</option>
                        <option value="true">On</option>
                      </select>
                    ) : (
                      <input
                        type={item.input_type === 'url' ? 'url' : item.input_type === 'tel' ? 'tel' : item.input_type === 'email' ? 'email' : 'text'}
                        value={edits[item.key] ?? ''}
                        onChange={(e) => setEdits({ ...edits, [item.key]: e.target.value })}
                        className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-gray-50"
                        placeholder={item.label}
                      />
                    )}
                    <button
                      onClick={() => handleSave(item.key)}
                      disabled={!dirty || isSaving}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                        isSaved
                          ? 'bg-emerald-600 text-white'
                          : dirty
                          ? 'bg-gray-900 text-white hover:bg-gray-800'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isSaving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                      ) : isSaved ? (
                        <><Check className="w-4 h-4" /> Saved</>
                      ) : (
                        <><Save className="w-4 h-4" /> Save</>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-400 font-mono">
                    key: <span className="text-gray-500">{item.key}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {items.length === 0 && !error && (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm border border-gray-100">
          No config items found. Did you run the SQL migration?
        </div>
      )}
    </div>
  );
}