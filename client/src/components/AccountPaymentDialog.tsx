import { useState } from 'react';
import toast from 'react-hot-toast';
import { dueInr, inr, post, todayDate } from '../api';
import { Field, Modal } from '../components';
import type { Customer, Dealer } from '../types';

export default function AccountPaymentDialog({ kind, party, onClose, onSaved }: {
  kind: 'customer' | 'dealer'; party: Customer | Dealer; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const due = Number(kind === 'customer' ? (party as Customer).outstanding : (party as Dealer).payable);
  const [amount, setAmount] = useState(String(Math.max(0, due)));
  const [mode, setMode] = useState('CASH');
  const [date, setDate] = useState(todayDate());
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const remaining = Math.max(0, due - Number(amount || 0));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      await post(`/${kind === 'customer' ? 'customers' : 'dealers'}/${party.id}/payments`, {
        amount: Number(amount), mode, date, reference, notes
      });
    } catch (error) {
      setError((error as Error).message);
      setBusy(false);
      return;
    }
    toast.success(kind === 'customer' ? 'Customer payment received' : 'Dealer payment recorded');
    // Saving and refreshing are separate: a failed refresh must not invite a
    // second submission of a payment that has already been recorded.
    onClose();
    await onSaved();
  }

  return <Modal title={kind === 'customer' ? 'Receive customer payment' : 'Record dealer payment'}
    subtitle={kind === 'customer' ? 'Record money received toward this customer’s dues.' : 'Record money paid toward this dealer’s dues.'}
    open onClose={() => { if (!busy) onClose(); }}>
    <form onSubmit={save}>
      <div className="payment-account"><strong>{party.name}</strong><span>Current due <b className="negative">{dueInr(due)}</b></span></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-grid">
        <Field label="Payment amount (₹)" hint={`Up to ${inr(due)}. Payments settle opening dues, then the oldest unpaid bills.`}>
          <input autoFocus required type="number" inputMode="decimal" min="0.01" max={due} step="0.01" value={amount} disabled={busy} onChange={event => setAmount(event.target.value)} />
        </Field>
        <Field label="Payment date"><input required type="date" value={date} disabled={busy} onChange={event => setDate(event.target.value)} /></Field>
        <Field label="Payment mode"><select value={mode} disabled={busy} onChange={event => setMode(event.target.value)}>
          <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CHEQUE">Cheque</option><option value="OTHER">Other</option>
        </select></Field>
        <Field label="Payment reference (optional)"><input maxLength={200} value={reference} disabled={busy} onChange={event => setReference(event.target.value)} placeholder="UTR or cheque number" /></Field>
      </div>
      <Field label="Notes (optional)"><textarea maxLength={1000} value={notes} disabled={busy} onChange={event => setNotes(event.target.value)} /></Field>
      <p className="payment-preview">Due after payment <strong className={remaining > 0 ? 'negative' : 'positive'}>{dueInr(remaining)}</strong></p>
      <div className="modal-actions"><button type="button" className="btn secondary" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="btn primary" disabled={busy || due <= 0}>{busy ? 'Saving payment…' : 'Record payment'}</button></div>
    </form>
  </Modal>;
}
