import { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  ArrowDownToLine, 
  ArrowRight, 
  ArrowUpFromLine, 
  BadgeIndianRupee, 
  Boxes, 
  IndianRupee, 
  PackagePlus, 
  ShoppingCart, 
  TrendingUp 
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { api, inr, shortDate } from '../api';
import type { Customer, Dealer, Product, Purchase, Sale } from '../types';
import { FruitAvatar, Loader, MetricCard, PageHeader, Status } from '../components';

type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  paymentMode?: string;
  notes?: string;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    Promise.all([
      api<Sale[]>('/sales'),
      api<Purchase[]>('/purchases'),
      api<Product[]>('/products'),
      api<Customer[]>('/customers'),
      api<Dealer[]>('/dealers'),
      api<Expense[]>('/expenses'),
    ])
      .then(([s, pur, prod, cust, deal, exp]) => {
        setSales(s || []);
        setPurchases(pur || []);
        setProducts(prod || []);
        setCustomers(cust || []);
        setDealers(deal || []);
        setExpenses(exp || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const todayStr = new Date().toISOString().slice(0, 10);

  const todaySalesList = sales.filter((s) => (s.date ? s.date.slice(0, 10) === todayStr : true));
  const todaySalesTotal = (todaySalesList.length > 0 ? todaySalesList : sales).reduce(
    (sum, s) => sum + Number(s.totalAmount || 0),
    0
  );
  const todaySalesCost = (todaySalesList.length > 0 ? todaySalesList : sales).reduce(
    (sum, s) => sum + Number(s.costAmount || (Number(s.totalAmount || 0) * 0.8)),
    0
  );

  const todayPurchasesList = purchases.filter((p) => (p.date ? p.date.slice(0, 10) === todayStr : true));
  const todayPurchasesTotal = (todayPurchasesList.length > 0 ? todayPurchasesList : purchases).reduce(
    (sum, p) => sum + Number(p.totalAmount || 0),
    0
  );

  const cashReceivedTotal = sales.reduce((sum, s) => sum + Number(s.receivedAmount || 0), 0);
  const paymentsMadeTotal = purchases.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const grossProfit = Math.max(0, todaySalesTotal - todaySalesCost - totalExpenses);

  const customerReceivables = customers.reduce((sum, c) => sum + Number(c.outstanding || 0), 0);
  const dealerPayables = dealers.reduce((sum, d) => sum + Number(d.payable || 0), 0);

  const stockValue = products.reduce(
    (sum, p) => sum + Number(p.currentStock || 0) * Number(p.avgCost || p.purchaseRate || 0),
    0
  );
  const lowStockProducts = products.filter(
    (p) => Number(p.currentStock || 0) <= Number(p.minStock || 0)
  );

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayKey = d.toISOString().slice(0, 10);
    const dayName = i === 6 ? 'Today' : daysOfWeek[d.getDay()];

    const daySales = sales
      .filter((s) => s.date && s.date.slice(0, 10) === dayKey)
      .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0);

    const dayPurchases = purchases
      .filter((p) => p.date && p.date.slice(0, 10) === dayKey)
      .reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);

    return {
      day: dayName,
      sales: daySales || (i === 6 ? todaySalesTotal : 0),
      purchases: dayPurchases || (i === 6 ? todayPurchasesTotal : 0),
    };
  });

  const currentHour = new Date().getHours();
  const timeGreeting =
    currentHour < 12
      ? 'Good morning'
      : currentHour < 17
      ? 'Good afternoon'
      : 'Good evening';

  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <>
      <PageHeader 
        eyebrow={todayFormatted} 
        title={`${timeGreeting}, Arjun`} 
        subtitle="Here’s how your wholesale business is moving today." 
        action={
          <div className="header-actions">
            <Link className="btn secondary" to="/purchases?new=1">
              <PackagePlus size={17}/>New purchase
            </Link>
            <Link className="btn primary" to="/sales?new=1">
              <ShoppingCart size={17}/>New sale
            </Link>
          </div>
        }
      />

      <div className="metrics-grid">
        <MetricCard 
          label="Today's sales" 
          value={inr(todaySalesTotal)} 
          note={`${sales.length} total invoice${sales.length === 1 ? '' : 's'}`} 
          trend="up" 
          icon={<ShoppingCart/>} 
          tone="green"
        />
        <MetricCard 
          label="Today's purchases" 
          value={inr(todayPurchasesTotal)} 
          note={`${purchases.length} mandi receipt${purchases.length === 1 ? '' : 's'}`} 
          icon={<ArrowUpFromLine/>} 
          tone="amber"
        />
        <MetricCard 
          label="Cash received" 
          value={inr(cashReceivedTotal)} 
          note="Across all payments" 
          icon={<ArrowDownToLine/>} 
          tone="blue"
        />
        <MetricCard 
          label="Gross profit" 
          value={inr(grossProfit)} 
          note="After direct expenses" 
          trend="up" 
          icon={<TrendingUp/>} 
          tone="purple"
        />
      </div>

      <div className="snapshot-strip">
        <div>
          <span className="snapshot-icon mint"><IndianRupee/></span>
          <p>Customer receivables<strong>{inr(customerReceivables)}</strong></p>
          <Link to="/customers">View outstanding <ArrowRight/></Link>
        </div>
        <div>
          <span className="snapshot-icon peach"><BadgeIndianRupee/></span>
          <p>Dealer payables<strong>{inr(dealerPayables)}</strong></p>
          <Link to="/dealers">View payables <ArrowRight/></Link>
        </div>
        <div>
          <span className="snapshot-icon sky"><Boxes/></span>
          <p>Current stock value<strong>{inr(stockValue)}</strong></p>
          <Link to="/inventory">View inventory <ArrowRight/></Link>
        </div>
        <div>
          <span className="snapshot-icon cream"><IndianRupee/></span>
          <p>Payments made today<strong>{inr(paymentsMadeTotal)}</strong></p>
          <Link to="/payments">Payment ledger <ArrowRight/></Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h2>Business performance</h2>
              <p>Sales and purchases over the last 7 days</p>
            </div>
            <select>
              <option>Last 7 days</option>
              <option>This month</option>
            </select>
          </div>
          <div className="chart-legend">
            <span><i className="dot green"/>Sales</span>
            <span><i className="dot amber"/>Purchases</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days} margin={{ top: 10, right: 5, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#2f7d62" stopOpacity=".25"/>
                    <stop offset="1" stopColor="#2f7d62" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e8ece9" vertical={false}/>
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12}/>
                <YAxis tickFormatter={v => `₹${v/1000}k`} tickLine={false} axisLine={false} fontSize={12}/>
                <Tooltip formatter={v => inr(Number(v || 0))} contentStyle={{ borderRadius: 12, border: '1px solid #e1e6e3' }}/>
                <Area type="monotone" dataKey="sales" stroke="#2f7d62" strokeWidth={2.5} fill="url(#sales)"/>
                <Area type="monotone" dataKey="purchases" stroke="#e19b46" strokeWidth={2} fill="none" strokeDasharray="5 4"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel stock-alert">
          <div className="panel-head">
            <div>
              <h2>Stock attention</h2>
              <p>{lowStockProducts.length} fruit{lowStockProducts.length === 1 ? '' : 's'} need a check</p>
            </div>
            <span className="attention-icon"><AlertTriangle/></span>
          </div>
          <div className="stock-list">
            {lowStockProducts.length === 0 ? (
              <p style={{ padding: '24px 16px', color: '#687871', fontSize: '13px', textAlign: 'center' }}>
                All inventory quantities are above minimum threshold.
              </p>
            ) : (
              lowStockProducts.slice(0, 4).map(p => (
                <div key={p.id}>
                  <FruitAvatar name={p.name}/>
                  <div>
                    <strong>{p.name}</strong>
                    <span>{p.variety}</span>
                    <div className="stock-progress">
                      <i style={{ width: `${Math.min(100, (Number(p.currentStock) / (Number(p.minStock) || 1)) * 100)}%` }}/>
                    </div>
                  </div>
                  <p>
                    <strong>{Number(p.currentStock)} {p.unit}</strong>
                    <span>Min. {Number(p.minStock)} {p.unit}</span>
                  </p>
                </div>
              ))
            )}
          </div>
          <Link className="panel-link" to="/inventory">Review inventory <ArrowRight/></Link>
        </section>
      </div>

      <div className="dashboard-grid equal">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Recent sales</h2>
              <p>Latest customer invoices</p>
            </div>
            <Link to="/sales">View all <ArrowRight/></Link>
          </div>
          <div className="activity-list">
            {sales.length === 0 ? (
              <p style={{ padding: '20px', color: '#687871', fontSize: '13px' }}>No sales recorded yet.</p>
            ) : (
              sales.slice(0, 5).map(s => (
                <div key={s.id}>
                  <span className="activity-icon sale"><ShoppingCart/></span>
                  <div>
                    <strong>{s.customer?.name || 'Walk-in customer'}</strong>
                    <span>{s.saleNo} · {shortDate(s.date)}</span>
                  </div>
                  <p>
                    <strong>{inr(s.totalAmount)}</strong>
                    <Status tone={Number(s.pendingAmount) ? 'warn' : 'good'}>
                      {Number(s.pendingAmount) ? `${inr(s.pendingAmount)} due` : 'Paid'}
                    </Status>
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Recent purchases</h2>
              <p>Latest dealer stock entries</p>
            </div>
            <Link to="/purchases">View all <ArrowRight/></Link>
          </div>
          <div className="activity-list">
            {purchases.length === 0 ? (
              <p style={{ padding: '20px', color: '#687871', fontSize: '13px' }}>No purchases recorded yet.</p>
            ) : (
              purchases.slice(0, 5).map(p => (
                <div key={p.id}>
                  <span className="activity-icon purchase"><PackagePlus/></span>
                  <div>
                    <strong>{p.dealer?.name || 'Mandi Producer'}</strong>
                    <span>{p.purchaseNo} · {shortDate(p.date)}</span>
                  </div>
                  <p>
                    <strong>{inr(p.totalAmount)}</strong>
                    <Status tone={Number(p.pendingAmount) ? 'warn' : 'good'}>
                      {Number(p.pendingAmount) ? `${inr(p.pendingAmount)} due` : 'Paid'}
                    </Status>
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}