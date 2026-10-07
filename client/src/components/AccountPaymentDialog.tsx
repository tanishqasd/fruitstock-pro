import { useState } from 'react';
import toast from 'react-hot-toast';
import { api, dueInr, inr, post, todayDate } from '../api';
import { Field, Modal } from '../components';
import type { Customer, Dealer, Payment } from '../types';

export default function AccountPaymentDialog({ kind, party, payment, onClose, onSaved }: {
  kind: 'customer' | 'dealer'; party: Customer | Dealer; payment?: Payment; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const due = Number(kind === 'customer' ? (party as Customer).outstanding : (party as Dealer).payable);
  const [amount, setAmount] = useState(String(payment ? payment.amount : Math.max(0, due)));
  const [mode, setMode] = useState(payment?.mode || 'CASH');
  const [date, setDate] = useState(payment?.date.slice(0, 10) || todayDate());
  const [reference, setReference] = useState(payment?.reference || '');
  const [notes, setNotes] = useState(payment?.notes || '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const remaining = due + Number(payment?.amount || 0) - Number(amount || 0);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const endpoint = `/${kind === 'customer' ? 'customers' : 'dealers'}/${party.id}/payments`;
      const body = { amount: Number(amount), mode, date, reference, notes, ...(payment ? { expectedVersion: payment.version, reason } : {}) };
      if (payment) await api(`${endpoint}/${payment.id}`, { method: 'PUT', body: JSON.stringify(body) });
      else await post(endpoint, body);
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
      return;
    }
    toast.success(payment ? 'Payment corrected and balance updated' : kind === 'customer' ? 'Customer payment received' : 'Dealer payment recorded');
    // Saving and refreshing are separate: a failed refresh must not invite a
    // second submission of a payment that has already been recorded.
    onClose();
    await onSaved();
  }

  return <Modal title={payment ? 'Edit payment' : kind === 'customer' ? 'Receive customer payment' : 'Record dealer payment'}
    subtitle={payment ? 'Correct this payment. The previous value and reason are retained in history.' : kind === 'customer' ? 'Record money received toward this customer’s dues.' : 'Record money paid toward this dealer’s dues.'}
    open onClose={() => { if (!busy) onClose(); }}>
    <form onSubmit={save}>
      <div className="payment-account"><strong>{party.name}</strong><span>Current due <b className="negative">{dueInr(due)}</b></span></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-grid">
        <Field label="Payment amount (₹)" hint={payment ? 'Enter 0 to reverse an incorrectly recorded payment.' : `Up to ${inr(due)}. Payments settle opening dues, then the oldest unpaid bills.`}>
          <input autoFocus required type="number" inputMode="decimal" min={payment ? '0' : '0.01'} max={payment ? 9999999999.99 : due} step="0.01" value={amount} disabled={busy} onChange={event => setAmount(event.target.value)} />
        </Field>
        <Field label="Payment date"><input required type="date" value={date} disabled={busy} onInput={event => setDate(event.currentTarget.value)} /></Field>
        <Field label="Payment mode"><select value={mode} disabled={busy} onChange={event => setMode(event.target.value)}>
          <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CHEQUE">Cheque</option><option value="OTHER">Other</option>
        </select></Field>
        <Field label="Payment reference (optional)"><input maxLength={200} value={reference} disabled={busy} onChange={event => setReference(event.target.value)} placeholder="UTR or cheque number" /></Field>
      </div>
      <Field label="Notes (optional)"><textarea maxLength={1000} value={notes} disabled={busy} onChange={event => setNotes(event.target.value)} /></Field>
      {payment && <Field label="Reason for correction"><input required minLength={3} maxLength={500} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} /></Field>}
      <p className="payment-preview">{remaining < 0 ? 'Credit after payment' : 'Due after payment'} <strong className={remaining > 0 ? 'negative' : 'positive'}>{dueInr(remaining)}</strong></p>
      <div className="modal-actions"><button type="button" className="btn secondary" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={busy || (!payment && due <= 0)}>{busy ? 'Saving…' : payment ? 'Save correction' : 'Record payment'}</button></div>
    </form>
  </Modal>;
}
