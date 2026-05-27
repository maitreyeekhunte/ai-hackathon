import React, { useState } from 'react'

const TODAY = new Date().toISOString().split('T')[0]

function formatINR(amount) {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const CATEGORIES = [
  'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
  'Bills & Utilities', 'Healthcare', 'Travel', 'Education',
  'Personal Care', 'Home', 'Investments & Savings', 'Income', 'Transfers', 'Other',
]

const CAT_COLORS = {
  'Food & Dining':        '#F59E0B',
  'Transportation':       '#3B82F6',
  'Shopping':             '#EC4899',
  'Entertainment':        '#8B5CF6',
  'Bills & Utilities':    '#EF4444',
  'Healthcare':           '#10B981',
  'Travel':               '#06B6D4',
  'Education':            '#F97316',
  'Personal Care':        '#D946EF',
  'Home':                 '#84CC16',
  'Investments & Savings':'#22C55E',
  'Income':               '#10B981',
  'Transfers':            '#64748B',
  'Other':                '#94A3B8',
}

function CategoryPill({ category }) {
  const color = CAT_COLORS[category] || '#94A3B8'
  return (
    <span className="category-pill" style={{ background: color + '18', color }}>
      <span className="cat-dot" style={{ background: color }} />
      {category}
    </span>
  )
}

export default function ExpenseList({ expenses, isLoading, onFilterChange, onEdit, onDelete, onDeleteAll }) {
  const [mode, setMode] = useState('month')
  const [monthVal, setMonthVal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [hasApplied, setHasApplied] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('all')

  const switchMode = (m) => { setMode(m); setError(''); setMonthVal(''); setStartDate(''); setEndDate('') }

  const handleApply = () => {
    setError('')
    if (mode === 'month') {
      if (!monthVal) { setError('Please select a month.'); return }
      setHasApplied(true)
      onFilterChange({ month: monthVal, startDate: '', endDate: '' })
    } else {
      if (!startDate || !endDate) { setError('Start and end date are required.'); return }
      if (startDate > TODAY) { setError('Start date must be today or in the past.'); return }
      if (endDate > TODAY)   { setError('End date must be today or in the past.'); return }
      if (startDate > endDate) { setError('Start date must be before end date.'); return }
      setHasApplied(true)
      onFilterChange({ month: '', startDate, endDate })
    }
  }

  const filtered = categoryFilter === 'all' ? expenses : expenses.filter(e => e.category === categoryFilter)
  const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0)
  const avgAmount = filtered.length > 0 ? totalAmount / filtered.length : 0

  return (
    <div>
      {/* ── Filter Bar ── */}
      <div className="filter-bar">
        {/* Mode pills */}
        <div className="filter-group" style={{ gap: 6 }}>
          <label>Period</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {['month', 'range'].map(m => (
              <button
                key={m}
                className={`pill ${mode === m ? 'active' : ''}`}
                onClick={() => switchMode(m)}
                type="button"
              >
                {m === 'month' ? 'By Month' : 'Date Range'}
              </button>
            ))}
          </div>
        </div>

        {/* Date inputs */}
        {mode === 'month' ? (
          <div className="filter-group">
            <label>Month</label>
            <input
              type="month"
              value={monthVal}
              max={TODAY.slice(0, 7)}
              onChange={e => { setMonthVal(e.target.value); setError('') }}
              disabled={isLoading}
              style={{ width: 160 }}
            />
          </div>
        ) : (
          <>
            <div className="filter-group">
              <label>Start Date</label>
              <input type="date" value={startDate} max={TODAY} onChange={e => { setStartDate(e.target.value); setError('') }} disabled={isLoading} style={{ width: 150 }} />
            </div>
            <div className="filter-group">
              <label>End Date</label>
              <input type="date" value={endDate} max={TODAY} onChange={e => { setEndDate(e.target.value); setError('') }} disabled={isLoading} style={{ width: 150 }} />
            </div>
          </>
        )}

        {/* Category filter */}
        <div className="filter-group">
          <label>Category</label>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} disabled={isLoading} style={{ width: 170 }}>
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Apply */}
        <div className="filter-group" style={{ justifyContent: 'flex-end' }}>
          <label style={{ visibility: 'hidden' }}>_</label>
          <button type="button" className="btn btn-primary" onClick={handleApply} disabled={isLoading}>
            {isLoading ? <><span className="spinner" /> Loading</> : 'Apply'}
          </button>
        </div>

        {/* Delete All */}
        {expenses.length > 0 && (
          <div className="filter-group" style={{ justifyContent: 'flex-end', marginLeft: 'auto' }}>
            <label style={{ visibility: 'hidden' }}>_</label>
            <button type="button" className="btn btn-danger" onClick={onDeleteAll} disabled={isLoading}>
              Delete All
            </button>
          </div>
        )}
      </div>

      {/* ── Validation error ── */}
      {error && (
        <div className="message error" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {/* ── Body ── */}
      {!hasApplied ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div className="empty-state-title">Select a period to view expenses</div>
          <div className="empty-state-desc">Choose a month or custom date range above, then click Apply.</div>
        </div>
      ) : isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <span className="spinner spinner-dark" style={{ width: 28, height: 28, borderWidth: 3 }} />
        </div>
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <div className="empty-state-title">No expenses found</div>
          <div className="empty-state-desc">No expenses recorded for the selected period.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No {categoryFilter} expenses</div>
          <div className="empty-state-desc">Try selecting a different category filter.</div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Spent</div>
              <div className="stat-value">{formatINR(totalAmount)}</div>
              {categoryFilter !== 'all' && <div className="stat-sub">{categoryFilter}</div>}
            </div>
            <div className="stat-card">
              <div className="stat-label">Average</div>
              <div className="stat-value">{formatINR(avgAmount)}</div>
              <div className="stat-sub">per transaction</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Transactions</div>
              <div className="stat-value">{filtered.length}</div>
              {expenses.length !== filtered.length && (
                <div className="stat-sub">of {expenses.length} total</div>
              )}
            </div>
          </div>

          {/* Expense table */}
          <div className="expenses-table">
            <div className="expenses-table-header">
              <div>Description</div>
              <div>Category</div>
              <div>Date</div>
              <div style={{ textAlign: 'right' }}>Amount</div>
            </div>
            {filtered.map(expense => (
              <div key={expense.id} className="expense-row">
                <div>
                  <div className="expense-desc">
                    {expense.description}
                    {expense.is_recurring && (
                      <span className="recurring-tag">
                        ↺ {expense.recurring_frequency || 'recurring'}
                      </span>
                    )}
                  </div>
                  {expense.merchant && <div className="expense-merchant">{expense.merchant}</div>}
                  {expense.notes && <div className="expense-merchant" style={{ fontStyle: 'italic' }}>{expense.notes}</div>}
                </div>
                <div>
                  <CategoryPill category={expense.category} />
                </div>
                <div className="expense-date">
                  {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div className="expense-amount-cell">{formatINR(expense.amount)}</div>

                <div className="expense-row-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onEdit(expense)}
                    title="Edit"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => onDelete(expense.id)}
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
