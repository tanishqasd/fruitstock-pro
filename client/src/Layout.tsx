import type { ReactNode } from 'react';
import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Apple, 
  BadgeIndianRupee, 
  BarChart3, 
  Bell, 
  Boxes, 
  ChevronDown, 
  CreditCard, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  PackagePlus, 
  Receipt,
  ReceiptIndianRupee, 
  Search, 
  ShoppingCart, 
  Truck, 
  Users, 
  X,
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/purchases', label: 'Purchases', icon: PackagePlus },
  { to: '/sales', label: 'Sales', icon: ShoppingCart },
  { to: '/transactions', label: 'Transactions', icon: Receipt }, // <-- Added here
  { section: 'Relationships' },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/dealers', label: 'Dealers', icon: Truck },
  { section: 'Finance' },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/expenses', label: 'Expenses', icon: ReceiptIndianRupee },
  { to: '/reports', label: 'Reports', icon: BarChart3 }
] as const;

const titles: Record<string, string> = {
  '/': 'Business overview',
  '/inventory': 'Inventory',
  '/purchases': 'Purchases',
  '/sales': 'Sales',
  '/transactions': 'Transaction History Ledger', // <-- Added here
  '/customers': 'Customers',
  '/dealers': 'Dealers',
  '/payments': 'Payment ledger',
  '/expenses': 'Expenses',
  '/reports': 'Reports'
};

interface NotificationItem {
  id: number;
  title: string;
  desc: string;
  time: string;
  type: 'warn' | 'info' | 'success';
  read: boolean;
  link: string;
}

export default function Layout({
  children,
  user,
  logout
}: {
  children: ReactNode;
  user: { name: string; businessName: string };
  logout: () => void;
}) {
  const [mobile, setMobile] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Dynamic notification list with specific routing targets
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { 
      id: 1, 
      title: 'Low Stock Alert', 
      desc: 'Apple (Washington) is below 50 kg.', 
      time: '10m ago', 
      type: 'warn', 
      read: false,
      link: '/inventory' 
    },
    { 
      id: 2, 
      title: 'Credit Due', 
      desc: 'Metro Fresh Mart has ₹70,000 pending.', 
      time: '1h ago', 
      type: 'info', 
      read: false,
      link: '/customers' 
    },
    { 
      id: 3, 
      title: 'Mandi Arrival', 
      desc: 'PUR-1042 recorded from Ramesh Fruit Supplier.', 
      time: '3h ago', 
      type: 'success', 
      read: false,
      link: '/purchases' 
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setNotifications(prev =>
      prev.map(n => (n.id === item.id ? { ...n, read: true } : n))
    );
    setNotifOpen(false);
    navigate(item.link);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="shell">
      {mobile && <div className="mobile-shade" onClick={() => setMobile(false)} />}
      
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Apple size={21} /></div>
          <div>
            <strong>FruitStock</strong>
            <span>Wholesale OS</span>
          </div>
          <button className="side-close" onClick={() => setMobile(false)}><X /></button>
        </div>
        <nav>
          {nav.map((item, i) =>
            'section' in item ? (
              <div className="nav-section" key={i}>{item.section}</div>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobile(false)}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
                {item.to === '/inventory' && <b>2</b>}
              </NavLink>
            )
          )}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={logout}><LogOut size={19} />Sign out</button>
          <div className="sidebar-card">
            <BadgeIndianRupee size={22} />
            <div>
              <strong>Daily cashbook</strong>
              <span>Keep every rupee accounted</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-button" onClick={() => setMobile(true)}><Menu /></button>
            <div>
              <span>Workspace</span>
              <strong>{titles[location.pathname] || 'FruitStock'}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="top-search" onClick={() => navigate('/inventory')}>
              <Search size={17} />
              <span>Search inventory</span>
              <kbd>⌘ K</kbd>
            </button>

            {/* Notification Dropdown Container */}
            <div className="relative" ref={notifRef} style={{ position: 'relative' }}>
              <button 
                className="notification" 
                onClick={() => setNotifOpen(!notifOpen)}
                aria-label="Notifications"
              >
                <Bell size={19} />
                {unreadCount > 0 && <i />}
              </button>

              {notifOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '46px',
                  width: '320px',
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  boxShadow: '0 12px 32px rgba(24, 45, 35, 0.12)',
                  border: '1px solid #e2e8e4',
                  zIndex: 100,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #edf1ee'
                  }}>
                    <strong style={{ fontSize: '12.5px', color: '#17231e' }}>Notifications</strong>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllRead} 
                        style={{ fontSize: '10px', color: '#246b52', fontWeight: 600, border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                    {notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => handleNotificationClick(n)}
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                          borderBottom: '1px solid #f2f5f3',
                          backgroundColor: n.read ? '#ffffff' : '#f8fbf9',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#edf5f1')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = n.read ? '#ffffff' : '#f8fbf9')}
                      >
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          backgroundColor: n.type === 'warn' ? '#faead5' : n.type === 'success' ? '#dceee6' : '#dfebf5',
                          color: n.type === 'warn' ? '#c47d2b' : n.type === 'success' ? '#2f765d' : '#3d7299'
                        }}>
                          {n.type === 'warn' ? <AlertTriangle size={15} /> : n.type === 'success' ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '11.5px', fontWeight: 650, color: '#18221e' }}>{n.title}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '10.5px', color: '#6c7973', lineHeight: 1.4 }}>{n.desc}</p>
                          <span style={{ fontSize: '9px', color: '#9aa5a0', display: 'block', marginTop: '4px' }}>{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="profile" onClick={() => navigate('/')}>
              <span>{user.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span>
              <div>
                <strong>{user.name}</strong>
                <small>{user.businessName}</small>
              </div>
              <ChevronDown size={16} />
            </button>
          </div>
        </header>

        <div className="content">{children}</div>
        <footer>FruitStock · Built for fresh produce businesses <span>•</span> All figures in INR</footer>
      </main>
    </div>
  );
}