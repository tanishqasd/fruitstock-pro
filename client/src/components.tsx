import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Search, X } from 'lucide-react';

export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{subtitle}</p></div>{action}</div>;
}

export function Modal({ title, subtitle, open, onClose, children, wide = false }: { title: string; subtitle?: string; open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className={`modal ${wide ? 'modal-wide' : ''}`}><div className="modal-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose}><X size={19}/></button></div>{children}</div></div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function SearchBox({ value, onChange, placeholder = 'Search...' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div className="search"><Search size={17}/><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}/></div>;
}

export function Status({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'good'|'warn'|'bad'|'neutral'|'blue' }) {
  return <span className={`status status-${tone}`}>{children}</span>;
}

export function Empty({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="empty"><div>{icon}</div><h3>{title}</h3><p>{text}</p></div>;
}

export function MetricCard({ label, value, note, icon, tone = 'green', trend }: { label: string; value: string; note: string; icon: ReactNode; tone?: string; trend?: 'up'|'down' }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className={`metric-note ${trend || ''}`}>{trend === 'up' ? <ArrowUpRight size={14}/> : trend === 'down' ? <ArrowDownRight size={14}/> : null}{note}</div></div>;
}

export function Loader() { return <div className="loader-wrap"><div className="loader"/><span>Loading your mandi...</span></div>; }

export function FruitAvatar({ name, size = 'normal' }: { name: string; size?: 'normal'|'small' }) {
  const colors = ['#ffdfd2','#e9efc6','#d9e8ff','#f5dbef','#f9e5ae','#dcf0df'];
  const emojis: Record<string,string> = { apple:'🍎', mango:'🥭', banana:'🍌', orange:'🍊', grapes:'🍇', pomegranate:'🔴', watermelon:'🍉', papaya:'🍈', guava:'🍐' };
  const color = colors[name.charCodeAt(0) % colors.length];
  return <span className={`fruit-avatar ${size}`} style={{ background: color }}>{emojis[name.toLowerCase()] || name.slice(0,1).toUpperCase()}</span>;
}
