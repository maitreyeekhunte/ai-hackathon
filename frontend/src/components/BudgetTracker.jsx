import React, { useState, useEffect } from 'react'

const API_URL = 'http://localhost:8000'

const CATEGORIES = [
  'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
  'Bills & Utilities', 'Healthcare', 'Travel', 'Education',
  'Personal Care', 'Home', 'Investments & Savings', 'Other',
]

const STATUS_COLORS = {
  green: { bar: '#22c55e', bg: '#f0fdf4', text: '#15803d' },
  yellow: { bar: '#f59e0b', bg: '#fffbeb', text: '#b45309' },
  red: { bar: '#ef4444', bg: '#fef2f2', text: '#dc2626' },
  none: { bar: '#94a3b8', bg: '#f8fafc', text: '#64748b' },
}

function ProgressBar({ percentage, status }) {
  const capped = Math.min(percentage || 0, 100)
  const colors = STATUS_COLORS[status] || STATUS_COLORS.none
  return (
    <div style={{ background: '#e2e8f0', borderRadius: 8, height: 10, overflow: 'hidden', flex: 1 }}>
      <div
        style={{
          width: `${capped}%`,
          height: '100%',
          background: colors.bar,
          borderRadius: 8,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  )
}

function StatusBadge({ status, label }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.none
  const icons = { green: '✓', yellow: '⚠', red: '!', none: '—' }
  return (
    <span style={{
      background: colors.bg,
      color: colors.text,
      border: `1px solid ${colors.bar}`,
      borderRadius: 12,
      padding: '2px 10px',
      fontSize: 12,
      fontWeight: 600,
    }}>
      {icons[status]} {label}
    </span>
  )
}

export default function BudgetTracker() {
  const [view, setView] = useState('list')
  const [budgets, setBudgets] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [selectedBudget, setSelectedBudget] = useState(null)
  const [aiSummary, setAiSummary] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null) // budget item being edited

  const today = new Date()
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const blankForm = {
    name: '',
    period_type: 'monthly',
    month: currentMonth,
    start_date: '',
    end_date: '',
    total_budget: '',
    category_budgets: CATEGORIES.map(cat => ({ category: cat, amount: '' })),
  }

  const [form, setForm] = useState(blankForm)

  useEffect(() => { fetchBudgets() }, [])

  const showMsg = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const fetchBudgets = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/budgets`)
      if (res.ok) setBudgets(await res.json())
    } catch { }
    setIsLoading(false)
  }

  const handleEdit = (item) => {
    const { budget, category_budgets } = item
    const catMap = {}
    category_budgets.forEach(cb => { catMap[cb.category] = cb.amount })
    setEditingBudget(item)
    setForm({
      name: budget.name,
      period_type: budget.period_type,
      month: budget.month || currentMonth,
      start_date: budget.start_date || '',
      end_date: budget.end_date || '',
      total_budget: budget.total_budget != null ? String(budget.total_budget) : '',
      category_budgets: CATEGORIES.map(cat => ({ category: cat, amount: catMap[cat] != null ? String(catMap[cat]) : '' })),
    })
    setView('create')
  }

  const handleSave = async () => {
    if (!form.name.trim()) { showMsg('error', 'Please enter a budget name.'); return }
    if (form.period_type === 'monthly' && !form.month) { showMsg('error', 'Please select a month.'); return }
    if (form.period_type === 'custom' && (!form.start_date || !form.end_date)) {
      showMsg('error', 'Please enter start and end dates.'); return
    }

    const payload = {
      name: form.name.trim(),
      period_type: form.period_type,
      month: form.period_type === 'monthly' ? form.month : null,
      start_date: form.period_type === 'custom' ? form.start_date : null,
      end_date: form.period_type === 'custom' ? form.end_date : null,
      total_budget: form.total_budget ? parseFloat(form.total_budget) : null,
      category_budgets: form.category_budgets
        .filter(cb => cb.amount && parseFloat(cb.amount) > 0)
        .map(cb => ({ category: cb.category, amount: parseFloat(cb.amount) })),
    }

    const isEdit = !!editingBudget
    const url = isEdit ? `${API_URL}/budgets/${editingBudget.budget.id}` : `${API_URL}/budgets`
    const method = isEdit ? 'PUT' : 'POST'

    setIsLoading(true)
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        showMsg('success', isEdit ? 'Budget updated!' : 'Budget created!')
        await fetchBudgets()
        setEditingBudget(null)
        setForm(blankForm)
        setView('list')
      } else {
        const err = await res.json()
        showMsg('error', err.detail || 'Failed to save budget')
      }
    } catch (e) {
      showMsg('error', `Error: ${e.message}`)
    }
    setIsLoading(false)
  }

  const handleDelete = async (budgetId) => {
    if (!window.confirm('Delete this budget?')) return
    setIsLoading(true)
    try {
      await fetch(`${API_URL}/budgets/${budgetId}`, { method: 'DELETE' })
      showMsg('success', 'Budget deleted.')
      await fetchBudgets()
      if (selectedBudget?.budget?.id === budgetId) {
        setView('list')
        setAnalysis(null)
        setSelectedBudget(null)
      }
    } catch { }
    setIsLoading(false)
  }

  const handleAnalyze = async (item) => {
    setSelectedBudget(item)
    setAiSummary(null)
    setIsLoading(true)
    try {
      const res = await fetch(`${API_URL}/budgets/${item.budget.id}/analysis`)
      if (res.ok) {
        setAnalysis(await res.json())
        setView('analysis')
      } else {
        showMsg('error', 'Failed to load analysis')
      }
    } catch (e) {
      showMsg('error', `Error: ${e.message}`)
    }
    setIsLoading(false)
  }

  const handleAiSummary = async () => {
    setAiLoading(true)
    setAiSummary(null)
    try {
      const res = await fetch(`${API_URL}/budgets/${selectedBudget.budget.id}/ai-summary`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setAiSummary(data.summary)
      } else {
        showMsg('error', 'AI summary failed')
      }
    } catch (e) {
      showMsg('error', `Error: ${e.message}`)
    }
    setAiLoading(false)
  }

  const periodLabel = (item) => {
    if (item.budget.period_type === 'monthly' && item.budget.month) {
      const [y, m] = item.budget.month.split('-')
      return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
    }
    return `${item.budget.start_date} → ${item.budget.end_date}`
  }

  // ── Create / Edit View ────────────────────────────────────────────────────────
  if (view === 'create') {
    const isEdit = !!editingBudget
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="btn btn-secondary" onClick={() => { setEditingBudget(null); setForm(blankForm); setView('list') }}>← Back</button>
          <h2 style={{ margin: 0 }}>{isEdit ? 'Edit Budget' : 'Create Budget'}</h2>
        </div>

        {message && <div className={`message ${message.type}`}>{message.text}</div>}

        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="form-group">
            <label>Budget Name</label>
            <input
              type="text"
              placeholder="e.g. May 2026 Budget"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label>Period Type</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {['monthly', 'custom'].map(pt => (
                <label key={pt} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: form.period_type === pt ? 600 : 400 }}>
                  <input
                    type="radio"
                    name="period_type"
                    value={pt}
                    checked={form.period_type === pt}
                    onChange={() => setForm(f => ({ ...f, period_type: pt }))}
                  />
                  {pt === 'monthly' ? 'Monthly' : 'Custom Date Range'}
                </label>
              ))}
            </div>
          </div>

          {form.period_type === 'monthly' ? (
            <div className="form-group">
              <label>Month</label>
              <input
                type="month"
                value={form.month}
                onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
              />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Total Budget (₹) <span style={{ fontWeight: 400, color: '#64748b' }}>— optional</span></label>
            <input
              type="number"
              placeholder="e.g. 50000"
              value={form.total_budget}
              onChange={e => setForm(f => ({ ...f, total_budget: e.target.value }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 12 }}>
              Per-Category Budgets (₹) <span style={{ fontWeight: 400, color: '#64748b' }}>— leave blank to skip</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {form.category_budgets.map((cb, i) => (
                <div key={cb.category} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ width: 140, fontSize: 13, color: '#374151' }}>{cb.category}</label>
                  <input
                    type="number"
                    placeholder="₹"
                    value={cb.amount}
                    style={{ flex: 1, padding: '6px 10px', fontSize: 13 }}
                    onChange={e => {
                      const updated = [...form.category_budgets]
                      updated[i] = { ...cb, amount: e.target.value }
                      setForm(f => ({ ...f, category_budgets: updated }))
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={isLoading}>
              {isLoading ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Budget')}
            </button>
            <button className="btn btn-secondary" onClick={() => { setEditingBudget(null); setForm(blankForm); setView('list') }}>Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Analysis View ─────────────────────────────────────────────────────────────
  if (view === 'analysis' && analysis) {
    const { total, category_analysis, unbudgeted_categories, period } = analysis
    const hasTotalBudget = total.budgeted != null

    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="btn btn-secondary" onClick={() => { setView('list'); setAnalysis(null); setAiSummary(null) }}>← Back</button>
          <div>
            <h2 style={{ margin: 0 }}>{selectedBudget.budget.name}</h2>
            <div style={{ fontSize: 13, color: '#64748b' }}>{period.start} → {period.end}</div>
          </div>
        </div>

        {message && <div className={`message ${message.type}`}>{message.text}</div>}

        {/* Total Budget Card */}
        <div className="card" style={{ padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Spending</div>
              <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4 }}>
                ₹{total.actual.toLocaleString('en-IN')}
              </div>
              {hasTotalBudget && (
                <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                  of ₹{total.budgeted.toLocaleString('en-IN')} budget
                </div>
              )}
            </div>
            {hasTotalBudget && (
              <StatusBadge
                status={total.status}
                label={total.percentage >= 100 ? 'Over Budget' : total.percentage >= 80 ? 'Near Limit' : 'On Track'}
              />
            )}
          </div>
          {hasTotalBudget && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ProgressBar percentage={total.percentage} status={total.status} />
              <span style={{ fontSize: 13, fontWeight: 600, color: STATUS_COLORS[total.status]?.text, width: 44, textAlign: 'right' }}>
                {total.percentage}%
              </span>
            </div>
          )}
        </div>

        {/* Category Analysis */}
        {category_analysis.length > 0 && (
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 16px' }}>Category Budgets</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {category_analysis.map(cat => (
                <div key={cat.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 500, fontSize: 14 }}>{cat.category}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, color: '#64748b' }}>
                        ₹{cat.actual.toLocaleString('en-IN')} / ₹{cat.budgeted.toLocaleString('en-IN')}
                      </span>
                      <StatusBadge
                        status={cat.status}
                        label={cat.percentage >= 100 ? `${cat.percentage}% over` : `${cat.percentage}%`}
                      />
                    </div>
                  </div>
                  <ProgressBar percentage={cat.percentage} status={cat.status} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unbudgeted Categories */}
        {unbudgeted_categories.length > 0 && (
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 16px' }}>Other Spending (No Budget Set)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {unbudgeted_categories.map(cat => (
                <div key={cat.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{cat.category}</span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>₹{cat.actual.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { status: 'green', label: 'Under 80% — On Track' },
            { status: 'yellow', label: '80–100% — Near Limit' },
            { status: 'red', label: 'Over 100% — Exceeded' },
          ].map(({ status, label }) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: STATUS_COLORS[status].bar }} />
              {label}
            </div>
          ))}
        </div>

        {/* AI Insights */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>AI Insights</h3>
            <button
              className="btn btn-primary"
              onClick={handleAiSummary}
              disabled={aiLoading}
              style={{ fontSize: 13 }}
            >
              {aiLoading ? 'Analyzing...' : aiSummary ? 'Refresh Analysis' : 'Get AI Insights'}
            </button>
          </div>
          {aiLoading && (
            <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: 14 }}>
              Analyzing your spending patterns...
            </div>
          )}
          {aiSummary && !aiLoading && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: 16,
              fontSize: 14,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              color: '#1e293b',
            }}>
              {aiSummary}
            </div>
          )}
          {!aiSummary && !aiLoading && (
            <div style={{ color: '#94a3b8', fontSize: 13 }}>
              Click "Get AI Insights" to get personalized recommendations on reducing your expenses.
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── List View ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Budget & Insights</h2>
        <button className="btn btn-primary" onClick={() => setView('create')}>+ Create Budget</button>
      </div>

      {message && <div className={`message ${message.type}`}>{message.text}</div>}

      {isLoading && <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Loading...</div>}

      {!isLoading && budgets.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#64748b' }}>No budgets yet</div>
          <div style={{ marginBottom: 24 }}>Create a budget to start tracking your spending against your goals.</div>
          <button className="btn btn-primary" onClick={() => setView('create')}>Create Your First Budget</button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {budgets.map(item => (
          <div key={item.budget.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{item.budget.name}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{periodLabel(item)}</div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                  {item.budget.total_budget && (
                    <span style={{ color: '#374151' }}>
                      Total budget: <strong>₹{item.budget.total_budget.toLocaleString('en-IN')}</strong>
                    </span>
                  )}
                  {item.category_budgets.length > 0 && (
                    <span style={{ color: '#64748b' }}>
                      {item.category_budgets.length} categor{item.category_budgets.length === 1 ? 'y' : 'ies'} tracked
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  style={{ fontSize: 13 }}
                  onClick={() => handleAnalyze(item)}
                  disabled={isLoading}
                >
                  View Analysis
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 13 }}
                  onClick={() => handleEdit(item)}
                  disabled={isLoading}
                >
                  Edit
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: 13, color: '#ef4444', borderColor: '#fecaca' }}
                  onClick={() => handleDelete(item.budget.id)}
                  disabled={isLoading}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
