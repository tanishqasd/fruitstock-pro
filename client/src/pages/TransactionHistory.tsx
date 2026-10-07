import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Receipt, RefreshCw } from 'lucide-react';
import { api, inr, shortDate } from '../api';
import { Loader, LoadError, PageHeader, SearchBox } from '../components';

export interface UnifiedTransaction {
  id: string;
  transactionType: 'SALE' | 'PURCHASE' | 'EXPENSE' | 'PAYMENT';
  date: string;
  partyName: string;
  category: string;
  amount: number;
  paymentMode: string;
  reference: string;
  direction: 'IN' | 'OUT';
}

export function TransactionHistory() {
  const [error, setError] = useState('');
  const [records, setRecords] = useState<UnifiedTransaction[]>([]);
  const [filter, setFilter] = useState<'ALL' | UnifiedTransaction['transactionType']>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await api<UnifiedTransaction[]>('/transactions');
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = records.filter((r) => {
    const matchesTab = filter === 'ALL' || r.transactionType === filter;
    const matchesSearch = `${r.partyName} ${r.reference} ${r.category}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totalInflow = records
    .filter((r) => r.transactionType === 'PAYMENT' && r.direction === 'IN')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const totalOutflow = records
    .filter((r) => (r.transactionType === 'PAYMENT' || r.transactionType === 'EXPENSE') && r.direction === 'OUT')
    .reduce((sum, r) => sum + Number(r.amount), 0);

  if (error) return <LoadError message={error}/>;
  if (loading && records.length === 0) return <Loader />;

  return (
    <>
      <PageHeader
        eyebrow="Financial Audit"
        title="Transaction History"
        subtitle="Sales, purchases, payment settlements, and expenses in one chronological ledger."
        action={
          <button className="btn secondary" onClick={loadData}>
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      <div className="summary-row">
        <div>
          <ArrowDownLeft />
          <span>Cash received (Payments)<strong className="positive">{inr(totalInflow)}</strong></span>
        </div>
        <div>
          <ArrowUpRight />
          <span>Cash paid (Payments & Expenses)<strong className="negative">{inr(totalOutflow)}</strong></span>
        </div>
        <div>
          <Receipt />
          <span>Total Transactions<strong>{records.length}</strong></span>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="transaction-filters">
            {(['ALL', 'SALE', 'PURCHASE', 'PAYMENT', 'EXPENSE'] as const).map((tab) => (
              <button
                key={tab}
                className={`btn compact ${filter === tab ? 'primary' : 'secondary'}`}
                onClick={() => setFilter(tab)}
              >
                {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase() + 's'}
              </button>
            ))}
          </div>
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search party, bill no, or category..."
          />
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Party / Description</th>
                <th>Reference</th>
                <th>Mode</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={`${item.transactionType}-${item.id}`}>
                  <td>{shortDate(item.date)}</td>
                  <td>
                    <span className="transaction-type"
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor:
                          item.transactionType === 'SALE'
                            ? '#dcfce7'
                            : item.transactionType === 'PURCHASE'
                            ? '#dbeafe'
                            : '#fee2e2',
                        color:
                          item.transactionType === 'SALE'
                            ? '#166534'
                            : item.transactionType === 'PURCHASE'
                            ? '#1e40af'
                            : '#991b1b',
                      }}
                    >
                      {item.transactionType}
                    </span>
                  </td>
                  <td>
                    <strong>{item.partyName}</strong>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.category}</div>
                  </td>
                  <td><code className="ref">{item.reference}</code></td>
                  <td>{item.paymentMode}</td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontWeight: 600,
                      color: item.direction === 'IN' ? '#16a34a' : '#111827',
                    }}
                  >
                    {item.direction === 'IN' ? '+' : '-'} {inr(item.amount)}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                    No matching transactions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
