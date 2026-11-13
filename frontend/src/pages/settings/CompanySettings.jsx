import { useEffect, useState } from 'react';
import { settingsApi } from '../../api/endpoints';
import { errorMessage, useToast } from '../../hooks/ToastContext';
import { SpinnerIcon } from '../../components/common/Icons';

const emptyForm = {
  company_name: '', address: '', tel: '', mobile: '', email: '',
  website: '', contact_no: '', uen: '', default_currency: 'SGD',
  cheque_payable_to: '',
};

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
                  <label htmlFor="uen">UEN</label>
                  <input id="uen" value={form.uen || ''} onChange={set('uen')} placeholder="202412345A" />
                </div>
                <div className="form-field">
                  <label htmlFor="currency">Default Currency</label>
                  <input id="currency" value={form.default_currency || ''} onChange={set('default_currency')}
                    maxLength={6} placeholder="SGD" />
                </div>
              </div>

              <div className="form-field" style={{ marginTop: 18 }}>
                <label htmlFor="cheque_payable">
                  Cheque Payable Instructions <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: 12 }}>(Printed on invoice bottom)</span>
                </label>
                <textarea
                  id="cheque_payable"
                  rows={2}
                  value={form.cheque_payable_to || ''}
                  onChange={set('cheque_payable_to')}
                  placeholder="All Cheques should be crossed and made payable to INFINITY SOLUTIONS PTE LTD"
                />
              </div>

              <div className="form-field" style={{ marginTop: 18 }}>
                <label htmlFor="address">Address</label>
                <textarea id="address" rows={3} value={form.address || ''} onChange={set('address')} />
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
            <div>{form.address || '—'}</div>
            {(form.tel || form.mobile) && <div>Tel: {form.tel} {form.mobile ? `| HP: ${form.mobile}` : ''}</div>}
            {form.email && <div>Email: {form.email}</div>}
            {form.website && <div>{form.website}</div>}
            {form.contact_no && <div>Contact: {form.contact_no}</div>}

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 2 }}>Cheque / Payment Instructions:</div>
              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 12.5, whiteSpace: 'pre-wrap' }}>
                {form.cheque_payable_to || `All Cheques should be crossed and made payable to ${(form.company_name || 'INFINITY SOLUTIONS PTE LTD').toUpperCase()}`}
              </div>
              {form.uen && <div style={{ fontWeight: 700, color: 'var(--ink)', marginTop: 6 }}>UEN: {form.uen}</div>}
            </div>
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 1000px) { .settings-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
