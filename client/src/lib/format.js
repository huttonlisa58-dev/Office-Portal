export const money = (n, cur) => {
  const code = (typeof cur === 'string' && /^[A-Za-z]{3}$/.test(cur.trim())) ? cur.trim().toUpperCase() : 'USD';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(Number(n || 0));
  } catch {
    return `${code} ${Number(n || 0).toLocaleString('en-US')}`;
  }
};
export const initials = (name = '') =>
  name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
export const cls = (...xs) => xs.filter(Boolean).join(' ');
