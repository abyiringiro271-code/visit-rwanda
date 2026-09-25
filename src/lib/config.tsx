import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from './supabase';
import { TELEGRAM_LINK, WHATSAPP_LINK, MOMO_CODE, MOMO_NAME } from './constants';

export interface AppConfig {
  telegram_link: string;
  whatsapp_link: string;
  momo_code: string;
  momo_name: string;
  support_phone: string;
  support_email: string;
  maintenance_mode: string;
  withdraw_day_vip_1_3: string;
  withdraw_day_vip_4_6: string;
  withdraw_day_vip_7_8: string;
  withdraw_start_hour: string;
  withdraw_end_hour: string;
  apk_url: string;
}

const DEFAULTS: AppConfig = {
  telegram_link: TELEGRAM_LINK,
  whatsapp_link: WHATSAPP_LINK,
  momo_code: MOMO_CODE,
  momo_name: MOMO_NAME,
  support_phone: '0780000000',
  support_email: 'support@visitrwanda.rw',
  maintenance_mode: 'false',
  withdraw_day_vip_1_3: 'mon',
  withdraw_day_vip_4_6: 'thu',
  withdraw_day_vip_7_8: 'sun',
  withdraw_start_hour: '7',
  withdraw_end_hour: '17',
  apk_url: '',
};

interface ConfigContextValue {
  config: AppConfig;
  reload: () => Promise<void>;
  isMaintenanceMode: boolean;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: DEFAULTS,
  reload: async () => {},
  isMaintenanceMode: false,
});

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULTS);

  const reload = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_app_config');
    if (!error && data) {
      setConfig({ ...DEFAULTS, ...(data as Partial<AppConfig>) });
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const isMaintenanceMode = config.maintenance_mode === 'true';

  return (
    <ConfigContext.Provider value={{ config, reload, isMaintenanceMode }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}