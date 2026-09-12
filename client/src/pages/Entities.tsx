import { useEffect, useState } from 'react';
import { Building2, Edit2, History, Phone, Plus, Search, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, inr, post, shortDate } from '../api';
import type { Customer, Dealer } from '../types';
import { Field, Loader, Modal, PageHeader, SearchBox } from '../components';

function EntitiesView({ kind }: { kind: 'customer' | 'dealer' }) {
  const isCustomer = kind === 'customer';
  const [entities, setEntities] = useState<(Customer | Dealer)[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [historyTarget, setHistoryTarget] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState(0);
  const [gstNumber, setGstNumber] = useState('');
  const [bankDetails, setBankDetails] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api<(Customer | Dealer)[]>(isCustomer ? '/customers' : '/dealers');
      setEntities(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error('Failed to load records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [isCustomer]);

  const openCreate = () => {
    setName('');
    setPhone('');
    setAddress('');
    setCreditLimit(0);
    setGstNumber('');
    setBankDetails('');
    setCreateOpen(true);
  };

  const openEdit = (entity: any) => {
    setEditTarget(entity);
    setName(entity.name || '');
    setPhone(entity.phone || '');
    setAddress(entity.address || '');
    setCreditLimit(Number(entity.creditLimit) || 0);
    setGstNumber(entity.gstNumber || '');
    setBankDetails(entity.bankDetails || '');
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is mandatory');
      return;
    }
    setBusy(true);
    try {
      const payload: any = { name: name.trim(), phone, address };
      if (isCustomer) payload.creditLimit = creditLimit;
      else {
        payload.gstNumber = gstNumber;
        payload.bankDetails = bankDetails;
      }
      await post(isCustomer ? '/customers' : '/dealers', payload);
      toast.success(`${isCustomer ? 'Customer' : 'Dealer'} registered successfully`);
      setCreateOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save entity');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setBusy(true);
    try {
      const payload: any = { name: name.trim(), phone, address };
      if (isCustomer) payload.creditLimit = creditLimit;
      else {
        payload.gstNumber = gstNumber;
        payload.bankDetails = bankDetails;
      }
      // Issue PUT update
      await api(`/${isCustomer ? 'customers' : 'dealers'}/${editTarget.id}`, {
        method: 'PUT',
        data: payload,
      } as any);
      toast.success(`${isCustomer ? 'Customer' : 'Dealer'} information updated`);
      setEditTarget(null);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update entity');
    } finally {
      setBusy(false);
    }
  };

  const openHistory = async (entity: any) => {
    try {
      const fullRecord = await api<any>(`/${isCustomer ? 'customers' : 'dealers'}/${entity.id}`);
      setHistoryTarget(fullRecord);
    } catch (err: any) {
      setHistoryTarget(entity);
    }
  };

  if (loading && entities.length === 0) return <Loader />;

  const filtered = entities.filter((e) =>
    `${e.name} ${e.phone || ''} ${e.address || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader
        eyebrow={isCustomer ? 'Buyer Directory' : 'Supplier Network'}
        title={isCustomer ? 'Customers' : 'Dealers'}
        subtitle={
          isCustomer
            ? 'Manage buyer accounts, credit terms, and individual transaction histories.'
            : 'Track fruit growers, commission agents, supplier balances, and payouts.'
        }
        action={
          <button className="btn primary" onClick={openCreate}>
            <Plus size={17} /> Add {isCustomer ? 'Customer' : 'Dealer'}
          </button>
        }
      />

      <section className="panel table-panel">
        <div className="table-toolbar">
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder={`Search ${isCustomer ? 'customers by name or phone' : 'dealers by name or phone'}...`}
          />
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Party Name</th>
                <th>Contact</th>
                <th>Address</th>
                {isCustomer ? <th>Credit Limit</th> : <th>GST / Tax ID</th>}
                <th style={{ textAlign: 'right' }}>Outstanding</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entity: any) => {
                const balance = Number(entity.balanceDue ?? entity.outstandingBalance ?? 0);
                return (
                  <tr key={entity.id}>
                    <td>
                      <button
                        type="button"
                        onClick={() => openHistory(entity)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0284c7',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: 0,
                          textAlign: 'left',
                        }}
                      >
                        {entity.name}
                      </button>
                    </td>
                    <td>{entity.phone || '—'}</td>
                    <td>{entity.address || '—'}</td>
                    <td>{isCustomer ? inr(entity.creditLimit || 0) : entity.gstNumber || '—'}</td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontWeight: 600,
                        color: balance > 0 ? '#dc2626' : '#16a34a',
                      }}
                    >
                      {inr(balance)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn compact secondary"
                          title="View Transaction History"
                          onClick={() => openHistory(entity)}
                        >
                          <History size={14} /> History
                        </button>
                        <button
                          type="button"
                          className="btn compact secondary"
                          title="Edit Information"
                          onClick={() => openEdit(entity)}
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#9ca3af' }}>
                    No {isCustomer ? 'customers' : 'dealers'} found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- CREATE MODAL --- */}
      <Modal
        title={`Register New ${isCustomer ? 'Customer' : 'Dealer'}`}
        subtitle="Fill in party details to create account ledger."
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={handleSaveNew}>
          <Field label="Full Name">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh Fruits" />
          </Field>
          <Field label="Contact Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" />
          </Field>
          <Field label="Physical Address / Mandi Stall">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. Stall #14, APMC Market" />
          </Field>
          {isCustomer ? (
            <Field label="Credit Limit (₹)">
              <input
                type="number"
                min="0"
                step="1000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(+e.target.value)}
              />
            </Field>
          ) : (
            <>
              <Field label="GST Number (Optional)">
                <input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="GSTIN" />
              </Field>
              <Field label="Bank Details / UPI">
                <input value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} placeholder="Account No, IFSC, or UPI ID" />
              </Field>
            </>
          )}
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button disabled={busy} className="btn primary">
              {busy ? 'Saving...' : 'Register'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- EDIT MODAL (Client Requirement #4) --- */}
      <Modal
        title={`Edit ${isCustomer ? 'Customer' : 'Dealer'} Details`}
        subtitle={`Updating information for ${editTarget?.name}`}
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
      >
        <form onSubmit={handleSaveEdit}>
          <Field label="Full Name">
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Contact Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Physical Address">
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          {isCustomer ? (
            <Field label="Credit Limit (₹)">
              <input
                type="number"
                min="0"
                value={creditLimit}
                onChange={(e) => setCreditLimit(+e.target.value)}
              />
            </Field>
          ) : (
            <>
              <Field label="GST Number">
                <input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
              </Field>
              <Field label="Bank Details / UPI">
                <input value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} />
              </Field>
            </>
          )}
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={() => setEditTarget(null)}>
              Cancel
            </button>
            <button disabled={busy} className="btn primary">
              {busy ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- TRANSACTION HISTORY MODAL (Client Requirement #1) --- */}
      <Modal
        wide
        title={`${historyTarget?.name || 'Party'} - Transaction History Ledger`}
        subtitle={`Contact: ${historyTarget?.phone || 'N/A'} | Address: ${historyTarget?.address || 'N/A'}`}
        open={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="summary-row">
            <div>
              <Users />
              <span>
                Account Balance
                <strong style={{ color: Number(historyTarget?.balanceDue ?? historyTarget?.outstandingBalance ?? 0) > 0 ? '#dc2626' : '#16a34a' }}>
                  {inr(Number(historyTarget?.balanceDue ?? historyTarget?.outstandingBalance ?? 0))}
                </strong>
              </span>
            </div>
          </div>

          <h4 style={{ margin: '8px 0 4px 0', fontSize: '14px', fontWeight: 600 }}>Invoices & Vouchers</h4>
          <div className="table-scroll" style={{ maxHeight: '220px' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference / Bill No</th>
                  <th style={{ textAlign: 'right' }}>Total Amount</th>
                  <th style={{ textAlign: 'right' }}>Paid / Received</th>
                  <th style={{ textAlign: 'right' }}>Due</th>
                </tr>
              </thead>
              <tbody>
                {(isCustomer ? historyTarget?.sales : historyTarget?.purchases)?.map((item: any) => (
                  <tr key={item.id}>
                    <td>{shortDate(item.date || item.createdAt)}</td>
                    <td><code className="ref">{item.saleNo || item.purchaseNo || item.billNumber}</code></td>
                    <td style={{ textAlign: 'right' }}>{inr(item.totalAmount)}</td>
                    <td style={{ textAlign: 'right', color: '#16a34a' }}>
                      {inr(item.receivedAmount ?? item.paidAmount ?? 0)}
                    </td>
                    <td style={{ textAlign: 'right', color: item.pendingAmount > 0 ? '#dc2626' : '#6b7280' }}>
                      {inr(item.pendingAmount || 0)}
                    </td>
                  </tr>
                ))}
                {!(isCustomer ? historyTarget?.sales : historyTarget?.purchases)?.length && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: '#9ca3af' }}>
                      No bills or invoices recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h4 style={{ margin: '8px 0 4px 0', fontSize: '14px', fontWeight: 600 }}>Payment Remittances</h4>
          <div className="table-scroll" style={{ maxHeight: '180px' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Reference / Remarks</th>
                  <th style={{ textAlign: 'right' }}>Amount Settled</th>
                </tr>
              </thead>
              <tbody>
                {historyTarget?.payments?.map((payment: any) => (
                  <tr key={payment.id}>
                    <td>{shortDate(payment.createdAt || payment.date)}</td>
                    <td><span className="ref">{payment.mode || 'UPI'}</span></td>
                    <td>{payment.reference || 'Settlement'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                      {inr(payment.amount)}
                    </td>
                  </tr>
                ))}
                {!historyTarget?.payments?.length && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: '#9ca3af' }}>
                      No payment records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </>
  );
}

export const Customers = () => <EntitiesView kind="customer" />;
export const Dealers = () => <EntitiesView kind="dealer" />;