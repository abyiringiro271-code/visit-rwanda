export const VIP_TIERS = [
  { tier: 1, name: 'VIP 1', price: 10000, daily: 1000, tasks: 10, rate: 100, color: 'from-emerald-400 to-emerald-600' },
  { tier: 2, name: 'VIP 2', price: 15000, daily: 2000, tasks: 15, rate: 133, color: 'from-teal-400 to-teal-600' },
  { tier: 3, name: 'VIP 3', price: 20000, daily: 3000, tasks: 20, rate: 150, color: 'from-cyan-400 to-cyan-600' },
  { tier: 4, name: 'VIP 4', price: 30000, daily: 5000, tasks: 25, rate: 200, color: 'from-blue-400 to-blue-600' },
  { tier: 5, name: 'VIP 5', price: 40000, daily: 8000, tasks: 40, rate: 200, color: 'from-green-400 to-green-600' },
  { tier: 6, name: 'VIP 6', price: 50000, daily: 10000, tasks: 50, rate: 200, color: 'from-amber-400 to-amber-600' },
  { tier: 7, name: 'VIP 7', price: 100000, daily: 20000, tasks: 100, rate: 200, color: 'from-orange-400 to-orange-600' },
  { tier: 8, name: 'VIP 8', price: 200000, daily: 40000, tasks: 200, rate: 200, color: 'from-rose-400 to-rose-600' },
] as const;

export const WITHDRAWAL_AMOUNTS = [
  1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000,
  15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000,
] as const;

export const DEPOSIT_AMOUNTS = VIP_TIERS.map((v) => v.price);

export const TASK_IMAGES = [
  { url: 'https://images.pexels.com/photos/3075094/pexels-photo-3075094.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Kigali Convention Centre' },
  { url: 'https://images.pexels.com/photos/38294689/pexels-photo-38294689.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Mountain Gorilla — Volcanoes NP' },
  { url: 'https://images.pexels.com/photos/11612743/pexels-photo-11612743.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Lake Kivu Islands' },
  { url: 'https://images.pexels.com/photos/19755751/pexels-photo-19755751.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Butaro Landscape' },
  { url: 'https://images.pexels.com/photos/39296231/pexels-photo-39296231.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Kigali City' },
  { url: 'https://images.pexels.com/photos/38294693/pexels-photo-38294693.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', label: 'Gorilla in Rainforest' },
] as const;

export const TELEGRAM_LINK = 'https://t.me/+8eD1q-ej04o4MWU0';
export const WHATSAPP_LINK = 'https://chat.whatsapp.com/visit-rwanda';
export const MOMO_CODE = '*182*8*1*1600244*';
export const MOMO_NAME = 'PATRICK';
export const WELCOME_BONUS = 3000;

export const RWANDA_FLAG = {
  blue: '#00A1DE',
  yellow: '#FAD201',
  green: '#20603D',
};

export function formatFRW(amount: number): string {
  return amount.toLocaleString('en-US') + ' FRW';
}