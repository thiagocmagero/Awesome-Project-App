import { useState, useEffect, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

/* ── Types ────────────────────────────────────────────────────────────────── */

interface PlanLimit { publicId: string; limitKey: string; limitValue: number; description: string | null }
interface PlanPricing { publicId: string; billingCycle: string; basePrice: number; promotionalPrice: number | null; promotionEndDate: string | null; trialDays: number }
interface PlanFeatureFlag { publicId: string; featureFlagId: string; enabled: boolean; featureFlag: { publicId: string; key: string; label: string } }
interface PlanItem {
  publicId: string; code: string; name: string; description: string | null;
  planStatus: string; validUntil: string | null; isDefault: boolean;
  limits: PlanLimit[]; pricing: PlanPricing[]; featureFlags: PlanFeatureFlag[];
  _count: { userPlans: number };
  createdAt: string; updatedAt: string;
}
interface FeatureFlagItem { publicId: string; key: string; label: string; enabledGlobally: boolean }

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function PlanStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('plans');
  if (status === 'ACTIVE') return <span className="badge bg-success-transparent text-success">{t('status.active')}</span>;
  return <span className="badge bg-warning-transparent text-warning">{t('status.discontinued')}</span>;
}

const LIMIT_KEYS = [
  'max_projects',
  'max_teams',
  'max_members',
  'max_tasks',
  'max_holidays',
  'max_storage_mb',
  'max_api_calls',
];

const BILLING_CYCLES = ['MONTHLY', 'ANNUAL', 'ONE_TIME'];

/* ── Component ────────────────────────────────────────────────────────────── */

export default function PlansPage() {
  const { token } = useAuth();
  const api = getApiBase();
  const { showToast } = useToast();
  const { t } = useTranslation('plans');
  const { t: tc } = useTranslation('common');

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [modalTab, setModalTab] = useState<'details' | 'limits' | 'features' | 'pricing'>('details');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Form state — details
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState('ACTIVE');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formValidUntil, setFormValidUntil] = useState('');

  // Form state — limits (local edits saved individually)
  const [localLimits, setLocalLimits] = useState<Array<{ limitKey: string; limitValue: number; description: string }>>([]);

  // Form state — pricing
  const [localPricing, setLocalPricing] = useState<Array<{ billingCycle: string; basePrice: number; promotionalPrice: string; promotionEndDate: string; trialDays: number }>>([]);

  // Form state — feature flags
  const [localFlags, setLocalFlags] = useState<Array<{ featureFlagId: string; key: string; label: string; enabled: boolean; pfPublicId?: string }>>([]);

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  function loadData() {
    setLoading(true);
    Promise.all([
      apiFetch(`${api}/plans`, { headers: authHeaders() }).then(r => r.json()),
      apiFetch(`${api}/feature-flags`, { headers: authHeaders() }).then(r => r.json()),
    ])
      .then(([plansData, flagsData]) => {
        setPlans(Array.isArray(plansData) ? plansData : []);
        setFeatureFlags(Array.isArray(flagsData) ? flagsData : []);
        setPageError('');
      })
      .catch(() => setPageError(tc('errors.generic')))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.style.overflow = showModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal]);

  /* ── Open modal ──────────────────────────────────────────────────────── */

  function openCreate() {
    setEditingPlan(null);
    setFormCode(''); setFormName(''); setFormDescription('');
    setFormStatus('ACTIVE'); setFormIsDefault(false); setFormValidUntil('');
    setLocalLimits(LIMIT_KEYS.map(key => ({ limitKey: key, limitValue: -1, description: key })));
    setLocalPricing([{ billingCycle: 'MONTHLY', basePrice: 0, promotionalPrice: '', promotionEndDate: '', trialDays: 0 }]);
    setLocalFlags(featureFlags.map(f => ({ featureFlagId: f.publicId, key: f.key, label: f.label, enabled: false })));
    setModalTab('details');
    setModalError('');
    setShowModal(true);
  }

  function openEdit(plan: PlanItem) {
    setEditingPlan(plan);
    setFormCode(plan.code); setFormName(plan.name); setFormDescription(plan.description ?? '');
    setFormStatus(plan.planStatus); setFormIsDefault(plan.isDefault);
    setFormValidUntil(plan.validUntil ? plan.validUntil.slice(0, 10) : '');

    // Limits: merge existing with defaults
    setLocalLimits(LIMIT_KEYS.map(key => {
      const existing = plan.limits.find(l => l.limitKey === key);
      return { limitKey: key, limitValue: existing?.limitValue ?? -1, description: existing?.description ?? key };
    }));

    // Pricing
    setLocalPricing(plan.pricing.map(p => ({
      billingCycle: p.billingCycle,
      basePrice: p.basePrice,
      promotionalPrice: p.promotionalPrice?.toString() ?? '',
      promotionEndDate: p.promotionEndDate ? p.promotionEndDate.slice(0, 10) : '',
      trialDays: p.trialDays,
    })));
    if (plan.pricing.length === 0) {
      setLocalPricing([{ billingCycle: 'MONTHLY', basePrice: 0, promotionalPrice: '', promotionEndDate: '', trialDays: 0 }]);
    }

    // Feature flags: merge all flags with plan associations
    setLocalFlags(featureFlags.map(f => {
      const pf = plan.featureFlags.find(pff => pff.featureFlag.publicId === f.publicId);
      return { featureFlagId: f.publicId, key: f.key, label: f.label, enabled: pf?.enabled ?? false, pfPublicId: pf?.publicId };
    }));

    setModalTab('details');
    setModalError('');
    setShowModal(true);
  }

  /* ── Save ─────────────────────────────────────────────────────────────── */

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);

    try {
      let planPublicId: string;

      if (editingPlan) {
        // Update plan details
        const res = await apiFetch(`${api}/plans/${editingPlan.publicId}`, {
          method: 'PATCH', headers: authHeaders(),
          body: JSON.stringify({
            name: formName,
            description: formDescription || null,
            planStatus: formStatus,
            isDefault: formIsDefault,
            validUntil: formValidUntil || null,
          }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(Array.isArray(d.message) ? d.message.join(' · ') : d.message); }
        planPublicId = editingPlan.publicId;
      } else {
        // Create plan
        const res = await apiFetch(`${api}/plans`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({
            code: formCode, name: formName, description: formDescription || undefined,
            isDefault: formIsDefault, validUntil: formValidUntil || undefined,
          }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(Array.isArray(d.message) ? d.message.join(' · ') : d.message); }
        const created = await res.json();
        planPublicId = created.publicId;
      }

      // Save limits
      for (const limit of localLimits) {
        await apiFetch(`${api}/plans/${planPublicId}/limits`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify(limit),
        });
      }

      // Save pricing
      for (const pricing of localPricing) {
        await apiFetch(`${api}/plans/${planPublicId}/pricing`, {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({
            billingCycle: pricing.billingCycle,
            basePrice: pricing.basePrice,
            promotionalPrice: pricing.promotionalPrice ? parseFloat(pricing.promotionalPrice) : undefined,
            promotionEndDate: pricing.promotionEndDate || undefined,
            trialDays: pricing.trialDays,
          }),
        });
      }

      // Save feature flag associations
      for (const flag of localFlags) {
        if (editingPlan && flag.pfPublicId) {
          // Update existing
          await apiFetch(`${api}/plans/${planPublicId}/feature-flags/${flag.pfPublicId}`, {
            method: 'PATCH', headers: authHeaders(),
            body: JSON.stringify({ enabled: flag.enabled }),
          });
        } else if (editingPlan) {
          // Create new association
          await apiFetch(`${api}/plans/${planPublicId}/feature-flags`, {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ featureFlagId: flag.featureFlagId, enabled: flag.enabled }),
          }).catch(() => { /* may already exist */ });
        } else {
          // New plan: create all
          await apiFetch(`${api}/plans/${planPublicId}/feature-flags`, {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({ featureFlagId: flag.featureFlagId, enabled: flag.enabled }),
          });
        }
      }

      setShowModal(false);
      showToast('success', editingPlan ? t('success.updated') : t('success.created'));
      loadData();
    } catch (err: any) {
      setModalError(err.message || tc('errors.generic'));
    } finally {
      setModalLoading(false);
    }
  }

  /* ── Render ──────────────────────────────────────────────────────────── */

  return (
    <>
      {/* Page Header */}
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">{t('page.title')}</h1>
          <nav>
            <ol className="breadcrumb breadcrumb-style2 mb-0">
              <li className="breadcrumb-item"><a href="/dashboard"><i className="ti ti-home-2 me-1 fs-15"></i>{tc('nav.dashboard')}</a></li>
              <li className="breadcrumb-item active">{t('page.title')}</li>
            </ol>
          </nav>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
          <i className="ri-add-line fs-16"></i>
          {t('btn.add')}
        </button>
      </div>

      {pageError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
          <i className="ri-error-warning-line fs-18"></i>{pageError}
        </div>
      )}

      <div className="card custom-card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <div>
            <h6 className="card-title mb-1"><i className="ri-vip-crown-line me-2 text-primary"></i>{t('card.title')}</h6>
            <p className="card-subtitle text-muted fs-12 mb-0">{t('card.subtitle')}</p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary-transparent text-primary">{t('badge.count', { count: plans.length })}</span>
            <button className="btn btn-sm btn-light" onClick={loadData} title={tc('actions.reload')}><i className="ri-refresh-line"></i></button>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" role="status"><span className="visually-hidden">{tc('loading')}</span></div></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4" style={{ width: 50 }}>#</th>
                    <th>{t('table.code')}</th>
                    <th>{t('table.name')}</th>
                    <th>{t('table.status')}</th>
                    <th>{t('table.price')}</th>
                    <th>{t('table.users')}</th>
                    <th>{t('table.default')}</th>
                    <th style={{ width: 90 }}>{tc('table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.length === 0 ? (
                    <tr><td colSpan={8} className="text-center text-muted py-5"><i className="ri-inbox-line fs-24 d-block mb-2"></i>{t('empty')}</td></tr>
                  ) : plans.map(plan => (
                    <tr key={plan.publicId}>
                      <td className="ps-4 text-muted fs-13">#{plan.publicId.slice(0, 8)}</td>
                      <td><code className="bg-light px-2 py-1 rounded fs-12">{plan.code}</code></td>
                      <td className="fw-medium">{plan.name}</td>
                      <td><PlanStatusBadge status={plan.planStatus} /></td>
                      <td>
                        {plan.pricing.length > 0
                          ? plan.pricing.map(p => (
                            <span key={p.billingCycle} className="me-2">
                              {p.basePrice === 0 ? t('price.free') : `${p.basePrice}€`}
                              <small className="text-muted ms-1">
                                /{p.billingCycle === 'MONTHLY' ? t('billing.monthly') : p.billingCycle === 'ANNUAL' ? t('billing.annual') : t('billing.one_time')}
                              </small>
                            </span>
                          ))
                          : <span className="text-muted">-</span>
                        }
                      </td>
                      <td><span className="badge bg-light text-dark">{plan._count.userPlans}</span></td>
                      <td>{plan.isDefault ? <span className="badge bg-primary-transparent text-primary">{t('badge.default')}</span> : '-'}</td>
                      <td>
                        <button className="btn btn-sm btn-primary-light" title={tc('actions.edit')} onClick={() => openEdit(plan)}>
                          <i className="ri-pencil-line"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Plan Modal ───────────────────────────────────────────────────── */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className={`ri-${editingPlan ? 'pencil' : 'add'}-line me-2 text-primary`}></i>
                    {editingPlan ? t('modal.edit_title', { name: editingPlan.name }) : t('modal.create_title')}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)} aria-label={tc('actions.close')}></button>
                </div>
                <form onSubmit={handleSave} noValidate>
                  <div className="modal-body">
                    {modalError && (
                      <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3">
                        <i className="ri-error-warning-line flex-shrink-0"></i><span>{modalError}</span>
                      </div>
                    )}

                    {/* Tabs */}
                    <ul className="nav nav-tabs mb-3" role="tablist">
                      {(['details', 'limits', 'features', 'pricing'] as const).map(tab => (
                        <li className="nav-item" key={tab} role="presentation">
                          <button
                            className={`nav-link${modalTab === tab ? ' active' : ''}`}
                            type="button"
                            onClick={() => setModalTab(tab)}
                          >
                            {t(`tabs.${tab}`)}
                          </button>
                        </li>
                      ))}
                    </ul>

                    {/* Tab: Details */}
                    {modalTab === 'details' && (
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label fw-medium">{t('form.code')} <span className="text-danger">*</span></label>
                          <input type="text" className="form-control" value={formCode}
                            onChange={e => setFormCode(e.target.value)} required disabled={!!editingPlan}
                            placeholder={t('form.code_placeholder')} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-medium">{t('form.name')} <span className="text-danger">*</span></label>
                          <input type="text" className="form-control" value={formName}
                            onChange={e => setFormName(e.target.value)} required placeholder={t('form.name_placeholder')} />
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-medium">{t('form.description')}</label>
                          <textarea className="form-control" rows={2} value={formDescription}
                            onChange={e => setFormDescription(e.target.value)} />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-medium">{t('form.status')}</label>
                          <select className="form-select" value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                            <option value="ACTIVE">{t('status.active')}</option>
                            <option value="DISCONTINUED">{t('status.discontinued')}</option>
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-medium">{t('form.valid_until')}</label>
                          <input type="date" className="form-control" value={formValidUntil}
                            onChange={e => setFormValidUntil(e.target.value)} />
                          <div className="form-text">{t('form.valid_until_hint')}</div>
                        </div>
                        <div className="col-md-4 d-flex align-items-end">
                          <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="isDefault"
                              checked={formIsDefault} onChange={e => setFormIsDefault(e.target.checked)} />
                            <label className="form-check-label" htmlFor="isDefault">{t('form.is_default')}</label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab: Limits */}
                    {modalTab === 'limits' && (
                      <div className="table-responsive">
                        <table className="table table-sm align-middle mb-0">
                          <thead className="table-light">
                            <tr>
                              <th>{t('limits.col.resource')}</th>
                              <th style={{ width: 150 }}>{t('limits.col.value')}</th>
                              <th>{t('limits.col.description')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {localLimits.map((limit, idx) => (
                              <tr key={limit.limitKey}>
                                <td><code className="fs-12">{limit.limitKey}</code></td>
                                <td>
                                  <input type="number" className="form-control form-control-sm"
                                    value={limit.limitValue}
                                    onChange={e => {
                                      const v = parseInt(e.target.value) || 0;
                                      setLocalLimits(prev => prev.map((l, i) => i === idx ? { ...l, limitValue: v } : l));
                                    }}
                                  />
                                  <div className="form-text fs-10">{t('limits.unlimited_hint')}</div>
                                </td>
                                <td>
                                  <input type="text" className="form-control form-control-sm"
                                    value={limit.description}
                                    onChange={e => setLocalLimits(prev => prev.map((l, i) => i === idx ? { ...l, description: e.target.value } : l))}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Tab: Features */}
                    {modalTab === 'features' && (
                      <div>
                        {localFlags.length === 0 ? (
                          <p className="text-muted text-center py-3">{t('features.empty')}</p>
                        ) : localFlags.map((flag, idx) => (
                          <div key={flag.featureFlagId} className="form-check form-switch mb-2">
                            <input className="form-check-input" type="checkbox" id={`ff-${flag.featureFlagId}`}
                              checked={flag.enabled}
                              onChange={e => setLocalFlags(prev => prev.map((f, i) => i === idx ? { ...f, enabled: e.target.checked } : f))}
                            />
                            <label className="form-check-label" htmlFor={`ff-${flag.featureFlagId}`}>
                              <strong>{flag.label}</strong> <code className="ms-2 fs-11 text-muted">{flag.key}</code>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tab: Pricing */}
                    {modalTab === 'pricing' && (
                      <div>
                        {localPricing.map((pricing, idx) => (
                          <div key={idx} className="border rounded p-3 mb-3">
                            <div className="row g-3">
                              <div className="col-md-4">
                                <label className="form-label fw-medium fs-12">{t('pricing.col.cycle')}</label>
                                <select className="form-select form-select-sm" value={pricing.billingCycle}
                                  onChange={e => setLocalPricing(prev => prev.map((p, i) => i === idx ? { ...p, billingCycle: e.target.value } : p))}>
                                  {BILLING_CYCLES.map(c => (
                                    <option key={c} value={c}>
                                      {c === 'MONTHLY' ? t('billing.monthly') : c === 'ANNUAL' ? t('billing.annual') : t('billing.one_time')}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-md-4">
                                <label className="form-label fw-medium fs-12">{t('pricing.col.base_price')}</label>
                                <input type="number" step="0.01" min="0" className="form-control form-control-sm"
                                  value={pricing.basePrice}
                                  onChange={e => setLocalPricing(prev => prev.map((p, i) => i === idx ? { ...p, basePrice: parseFloat(e.target.value) || 0 } : p))} />
                              </div>
                              <div className="col-md-4">
                                <label className="form-label fw-medium fs-12">{t('pricing.col.promo_price')}</label>
                                <input type="number" step="0.01" min="0" className="form-control form-control-sm"
                                  value={pricing.promotionalPrice}
                                  onChange={e => setLocalPricing(prev => prev.map((p, i) => i === idx ? { ...p, promotionalPrice: e.target.value } : p))} />
                              </div>
                              <div className="col-md-6">
                                <label className="form-label fw-medium fs-12">{t('pricing.col.promo_end')}</label>
                                <input type="date" className="form-control form-control-sm"
                                  value={pricing.promotionEndDate}
                                  onChange={e => setLocalPricing(prev => prev.map((p, i) => i === idx ? { ...p, promotionEndDate: e.target.value } : p))} />
                              </div>
                              <div className="col-md-4">
                                <label className="form-label fw-medium fs-12">{t('pricing.col.trial_days')}</label>
                                <input type="number" min="0" className="form-control form-control-sm"
                                  value={pricing.trialDays}
                                  onChange={e => setLocalPricing(prev => prev.map((p, i) => i === idx ? { ...p, trialDays: parseInt(e.target.value) || 0 } : p))} />
                              </div>
                              <div className="col-md-2 d-flex align-items-end">
                                {localPricing.length > 1 && (
                                  <button type="button" className="btn btn-sm btn-danger-light"
                                    onClick={() => setLocalPricing(prev => prev.filter((_, i) => i !== idx))}>
                                    <i className="ri-delete-bin-line"></i>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <button type="button" className="btn btn-sm btn-light"
                          onClick={() => setLocalPricing(prev => [...prev, { billingCycle: 'ANNUAL', basePrice: 0, promotionalPrice: '', promotionEndDate: '', trialDays: 0 }])}>
                          <i className="ri-add-line me-1"></i>{t('pricing.add_btn')}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-light" onClick={() => setShowModal(false)}>{tc('actions.cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                      {modalLoading
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>{tc('actions.saving')}</>
                        : <><i className="ri-save-line me-2"></i>{tc('actions.save')}</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
