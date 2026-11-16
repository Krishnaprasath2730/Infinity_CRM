import { useEffect, useState } from 'react';
import { settingsApi } from '../../api/endpoints';
import { errorMessage, useToast } from '../../hooks/ToastContext';
import { SpinnerIcon } from '../../components/common/Icons';

const emptyForm = {
  company_name: '', address: '', tel: '', mobile: '', email: '',
  website: '', contact_no: '', uen: '', default_currency: 'SGD',
  cheque_payable_to: '',
};

const hintStyle = { fontWeight: 400, color: 'var(--muted)', fontSize: 12 };

/** Rows that show all of a textarea's text without scrolling (between `min` and 14). */
function rowsFor(text, min) {
  return Math.min(14, Math.max(min, String(text || '').split('\n').length + 1));
}

/** "Label: value" line -> [label, value]; any other line -> null. Same rule as the invoice PDF. */
function parseDetailLine(line) {
  const match = /^([^:]{1,32}):\s*(\S.*)$/.exec(line);
  if (!match || match[2].startsWith('//')) return null;
  return [match[1].trim(), match[2].trim()];
}

/** Payment instructions as they print on the invoice: aligned list, or plain bold text. */
function PaymentPreview({ text, companyName }) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (!lines.length) {
    return (
      <>
        <div>All Cheques should be crossed and made payable to</div>
        <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{(companyName || 'INFINITY SOLUTIONS PTE LTD').toUpperCase()}</div>
      </>
    );
  }
  if (!lines.some(parseDetailLine)) {
    return <div style={{ fontWeight: 700, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{text}</div>;
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'max-content minmax(0, 1fr)', columnGap: 8, rowGap: 1 }}>
      {lines.map((line, i) => {
        const pair = parseDetailLine(line);
        if (!pair) return <div key={i} style={{ gridColumn: '1 / -1' }}>{line}</div>;
        return [
          <div key={`${i}-label`}>{pair[0]}</div>,
          <div key={`${i}-value`} style={{ fontWeight: 700, color: 'var(--ink)', overflowWrap: 'anywhere' }}>: {pair[1]}</div>,
        ];
      })}
    </div>
  );
}

export default function CompanySettings() {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi.get()
      .then((res) => setForm({ ...emptyForm, ...res.data }))
      .catch((err) => toast.error(errorMessage(err, 'Could not load company settings')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await settingsApi.update(form);
      setForm({ ...emptyForm, ...res.data });
      toast.success('Saved — invoice letterhead updated');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save settings'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="eyebrow">Administration</div>
          <h1>Company Settings</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 20, alignItems: 'start' }}
        className="settings-grid">
        <div className="card">
          <div className="card-head" style={{ marginBottom: 18 }}>
            <div>
              <div className="card-title">Letterhead details</div>
              <div className="card-sub">These appear on every invoice PDF you print</div>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gap: 16 }}>
              {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 42 }} />)}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field">
                  <label htmlFor="cname">Company / Payee Name <span className="req">*</span></label>
                  <input id="cname" value={form.company_name} onChange={set('company_name')} required />
                </div>
                <div className="form-field">
                  <label htmlFor="tel">Tel</label>
                  <input id="tel" value={form.tel || ''} onChange={set('tel')} />
                </div>
                <div className="form-field">
                  <label htmlFor="mobile">Mobile / HP</label>
                  <input id="mobile" value={form.mobile || ''} onChange={set('mobile')} />
                </div>
                <div className="form-field">
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" value={form.email || ''} onChange={set('email')} />
                </div>
                <div className="form-field">
                  <label htmlFor="website">Website</label>
                  <input id="website" value={form.website || ''} onChange={set('website')} />
                </div>
                <div className="form-field">
                  <label htmlFor="contact">Contact No.</label>
                  <input id="contact" value={form.contact_no || ''} onChange={set('contact_no')} />
                </div>
                <div className="form-field">
                  <label htmlFor="uen">UEN <span style={hintStyle}>(invoice email only)</span></label>
                  <input id="uen" value={form.uen || ''} onChange={set('uen')} placeholder="202412345A" />
                </div>
                <div className="form-field">
                  <label htmlFor="currency">Default Currency</label>
                  <input id="currency" value={form.default_currency || ''} onChange={set('default_currency')}
                    maxLength={6} placeholder="SGD" />
                </div>
              </div>

              <div className="form-field" style={{ marginTop: 18 }}>
                <label htmlFor="address">Address</label>
                <textarea id="address" rows={rowsFor(form.address, 3)} value={form.address || ''} onChange={set('address')} />
              </div>

              <div className="form-field" style={{ marginTop: 18 }}>
                <label htmlFor="cheque_payable">
                  Payment / Cheque Instructions <span style={hintStyle}>(printed at the bottom of the invoice)</span>
                </label>
                <textarea
                  id="cheque_payable"
                  rows={rowsFor(form.cheque_payable_to, 4)}
                  value={form.cheque_payable_to || ''}
                  onChange={set('cheque_payable_to')}
                  placeholder="All Cheques should be crossed and made payable to INFINITY SOLUTIONS PTE LTD"
                />
                <div style={{ ...hintStyle, lineHeight: 1.5 }}>
                  For bank details, type one per line as <strong>Label: value</strong> (for example
                  “Account Name: Infinity Solutions”). They print as a neat aligned list under “Payment Details”.
                </div>
              </div>

              <div className="form-actions">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? <><SpinnerIcon width={15} height={15} /> Saving…</> : 'Save Settings'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="card">
          <div className="card-title">Invoice preview</div>
          <div className="card-sub">How the letterhead reads on a printed invoice</div>

          <div style={{
            marginTop: 16, padding: 18, borderRadius: 'var(--r-md)',
            background: 'var(--line-soft)', fontSize: 12.5, lineHeight: 1.65, color: 'var(--ink-2)',
          }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>FROM:</div>
            <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13.5 }}>{form.company_name || '—'}</div>
            <div style={{ whiteSpace: 'pre-line' }}>{form.address || '—'}</div>
            {form.tel && <div>Tel: {form.tel}</div>}
            {form.mobile && <div>Mobile: {form.mobile}</div>}
            {form.email && <div>Mail: {form.email}</div>}
            {form.website && <div>{form.website}</div>}
            {form.contact_no && <div>Contact: {form.contact_no}</div>}

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>PAYMENT DETAILS:</div>
              <PaymentPreview text={form.cheque_payable_to} companyName={form.company_name} />
            </div>
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 1000px) { .settings-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
