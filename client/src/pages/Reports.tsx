import { useEffect, useState } from 'react';
import { BarChart3, Download, PackageSearch, TrendingUp, UsersRound, ArrowUpRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { api, inr } from '../api';
import type { Customer, Dealer, Product, Purchase, Sale } from '../types';
import { FruitAvatar, Loader, PageHeader, Status } from '../components';

type ReportData = {
  products: Product[];
  customers: Customer[];
  dealers: Dealer[];
  sales: Sale[];
  purchases: Purchase[];
};

export default function Reports() {
  const [data, setData] = useState<ReportData>();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api<Product[]>('/products'),
      api<Customer[]>('/customers'),
      api<Dealer[]>('/dealers'),
      api<Sale[]>('/sales'),
      api<Purchase[]>('/purchases'),
    ]).then(([products, customers, dealers, sales, purchases]) =>
      setData({ products, customers, dealers, sales, purchases })
    );
  }, []);

  if (!data) return <Loader />;

  const sales = data.sales.reduce((s, x) => s + Number(x.totalAmount), 0);
  const cost = data.sales.reduce((s, x) => s + Number(x.costAmount), 0);
  const profit = sales - cost;
  const totalOutstanding = data.customers.reduce((s, x) => s + Number(x.outstanding), 0);
  const totalStockValue = data.products.reduce(
    (s, x) => s + Number(x.currentStock) * Number(x.avgCost),
    0
  );

  const chart = [
    { name: 'Sales', value: sales },
    { name: 'Purchases', value: data.purchases.reduce((s, x) => s + Number(x.totalAmount), 0) },
    { name: 'Gross profit', value: profit },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Decision center"
        title="Business reports"
        subtitle="A clear view of stock value, margin, receivables, and payables."
        action={
          <button className="btn secondary" onClick={() => window.print()}>
            <Download size={17} />
            Print / export PDF
          </button>
        }
      />

      {/* Interactive Metric Cards */}
      <div className="report-cards">
        <div
          onClick={() => navigate('/sales')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative' }}
          className="hover:shadow-md hover:border-emerald-600"
          title="Click to view all Sales"
        >
          <BarChart3 />
          <span>Sales revenue</span>
          <strong>{inr(sales)}</strong>
          <small>Across {data.sales.length} invoices →</small>
        </div>

        <div
          onClick={() => navigate('/sales')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative' }}
          className="hover:shadow-md hover:border-emerald-600"
          title="Click to view Sales & Margin details"
        >
          <TrendingUp />
          <span>Gross profit</span>
          <strong>{inr(profit)}</strong>
          <small>{sales ? ((profit / sales) * 100).toFixed(1) : 0}% estimated margin →</small>
        </div>

        <div
          onClick={() => navigate('/customers')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative' }}
          className="hover:shadow-md hover:border-emerald-600"
          title="Click to view Customer Balances"
        >
          <UsersRound />
          <span>Customer outstanding</span>
          <strong>{inr(totalOutstanding)}</strong>
          <small>{data.customers.filter((x) => Number(x.outstanding) > 0).length} accounts with dues →</small>
        </div>

        <div
          onClick={() => navigate('/inventory')}
          style={{ cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative' }}
          className="hover:shadow-md hover:border-emerald-600"
          title="Click to view Inventory Stock"
        >
          <PackageSearch />
          <span>Inventory value</span>
          <strong>{inr(totalStockValue)}</strong>
          <small>{data.products.length} fruit varieties →</small>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h2>Financial overview</h2>
              <p>Recorded business volume</p>
            </div>
            <select>
              <option>All time</option>
            </select>
          </div>
          <div className="chart-wrap report">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid stroke="#e8ece9" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(v) => `₹${v / 1000}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v) => inr(Number(v || 0))} />
                <Legend />
                <Bar name="Amount" dataKey="value" fill="#2f7d62" radius={[7, 7, 0, 0]} barSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Outstanding leaders</h2>
              <p>Customers requiring follow-up</p>
            </div>
          </div>
          <div className="rank-list">
            {[...data.customers]
              .sort((a, b) => Number(b.outstanding) - Number(a.outstanding))
              .slice(0, 6)
              .map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => navigate('/customers')}
                  style={{ cursor: 'pointer' }}
                  title={`View ledger for ${c.name}`}
                >
                  <span className="rank">{i + 1}</span>
                  <div>
                    <strong>{c.name}</strong>
                    <small>{c.paymentTerms}-day payment terms</small>
                  </div>
                  <strong>{inr(c.outstanding)}</strong>
                </div>
              ))}
          </div>
        </section>
      </div>

      <section className="panel table-panel report-table">
        <div className="panel-head">
          <div>
            <h2>Stock valuation</h2>
            <p>Weighted-average inventory cost</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fruit</th>
                <th>Stock</th>
                <th>Average cost</th>
                <th>Selling rate</th>
                <th>Stock value</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate('/inventory')}
                  style={{ cursor: 'pointer' }}
                  title={`View inventory for ${p.name}`}
                >
                  <td>
                    <div className="name-cell">
                      <FruitAvatar name={p.name} />
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.variety}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    {Number(p.currentStock)} {p.unit}
                  </td>
                  <td>{inr(p.avgCost)}</td>
                  <td>{inr(p.sellingRate)}</td>
                  <td>
                    <strong>{inr(Number(p.currentStock) * Number(p.avgCost))}</strong>
                  </td>
                  <td>
                    <Status
                      tone={
                        Number(p.currentStock) <= Number(p.minStock) ? 'bad' : 'good'
                      }
                    >
                      {Number(p.currentStock) <= Number(p.minStock) ? 'Low' : 'Healthy'}
                    </Status>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}