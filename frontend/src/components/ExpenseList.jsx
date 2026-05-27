import React, { useState } from 'react'

const TODAY = new Date().toISOString().split('T')[0]

function formatINR(amount) {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ExpenseList({ expenses, isLoading, onFilterChange, onEdit, onDelete, onDeleteAll }) {
  const [mode, setMode] = useState('month')       // 'month' | 'range'
  const [monthVal, setMonthVal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')
  const [hasApplied, setHasApplied] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('all')

  const CATEGORIES = [
    'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
    'Bills & Utilities', 'Healthcare', 'Travel', 'Education',
    'Personal Care', 'Home', 'Investments & Savings', 'Income', 'Transfers', 'Other',
  ]

  const switchMode = (newMode) => {
    setMode(newMode)
    setError('')
    setMonthVal('')
    setStartDate('')
    setEndDate('')
  }

  const handleApply = () => {
    setError('')

    if (mode === 'month') {
      if (!monthVal) {
        setError('Please select a month before applying.')
        return
      }
      setHasApplied(true)
      onFilterChange({ month: monthVal, startDate: '', endDate: '' })

    } else {
      if (!startDate || !endDate) {
        setError('Both start date and end date are required.')
        return
      }
      if (startDate > TODAY) {
        setError('Start date must be today or in the past.')
        return
      }
      if (endDate > TODAY) {
        setError('End date must be today or in the past.')
        return
      }
      if (startDate > endDate) {
        setError('Start date must be before or equal to end date.')
        return
      }
      setHasApplied(true)
      onFilterChange({ month: '', startDate, endDate })
    }
  }

  const filtered = categoryFilter === 'all'
    ? expenses
    : expenses.filter(e => e.category === categoryFilter)

  const totalAmount = filtered.reduce((sum, exp) => sum + exp.amount, 0)
  const avgAmount = filtered.length > 0 ? totalAmount / filtered.length : 0

  return (
    <div className="expenses-container active">

      {/* ── Header row: mode toggle + Delete All ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={() => switchMode('month')}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            border: '2px solid #667eea',
            background: mode === 'month' ? '#667eea' : 'white',
            color: mode === 'month' ? 'white' : '#667eea',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          By Month
        </button>
        <button
          type="button"
          onClick={() => switchMode('range')}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            border: '2px solid #667eea',
            background: mode === 'range' ? '#667eea' : 'white',
            color: mode === 'range' ? 'white' : '#667eea',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          By Date Range
        </button>
        </div>

        {expenses.length > 0 && (
          <button
            type="button"
            onClick={onDeleteAll}
            disabled={isLoading}
            style={{
              padding: '8px 18px',
              background: 'white',
              color: '#e53e3e',
              border: '2px solid #e53e3e',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
              whiteSpace: 'nowrap',
            }}
          >
            🗑️ Delete All
          </button>
        )}
      </div>

      {/* ── Filter inputs ── */}
      <div className="filter-section" style={{ alignItems: 'flex-end' }}>
        {mode === 'month' ? (
          <div className="filter-group">
            <label htmlFor="month">Select Month</label>
            <input
              id="month"
              type="month"
              value={monthVal}
              max={TODAY.slice(0, 7)}
              onChange={e => { setMonthVal(e.target.value); setError('') }}
              disabled={isLoading}
            />
          </div>
        ) : (
          <>
            <div className="filter-group">
              <label htmlFor="startDate">Start Date <span style={{ color: '#e53e3e' }}>*</span></label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                max={TODAY}
                onChange={e => { setStartDate(e.target.value); setError('') }}
                disabled={isLoading}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="endDate">End Date <span style={{ color: '#e53e3e' }}>*</span></label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                max={TODAY}
                onChange={e => { setEndDate(e.target.value); setError('') }}
                disabled={isLoading}
              />
            </div>
          </>
        )}

        <div className="filter-group">
          <button
            type="button"
            onClick={handleApply}
            disabled={isLoading}
            style={{
              padding: '10px 28px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
              whiteSpace: 'nowrap',
            }}
          >
            {isLoading ? <span className="loading-spinner"></span> : 'Apply'}
          </button>
        </div>

        <div className="filter-group">
          <label htmlFor="categoryFilter">Category</label>
          <select
            id="categoryFilter"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            disabled={isLoading}
            style={{ minWidth: '160px' }}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Validation error ── */}
      {error && (
        <div style={{
          background: '#fff5f5',
          border: '1px solid #feb2b2',
          color: '#c53030',
          borderRadius: '6px',
          padding: '10px 14px',
          marginBottom: '16px',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {/* ── Body ── */}
      {!hasApplied ? (
        <div className="no-expenses" style={{ color: '#888', paddingTop: '40px' }}>
          <p>Select {mode === 'month' ? 'a month' : 'a date range'} above and click <strong>Apply</strong> to view expenses.</p>
        </div>
      ) : isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <span className="loading-spinner"></span>
        </div>
      ) : expenses.length === 0 ? (
        <div className="no-expenses">
          <p>No expenses found for the selected period.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="no-expenses">
          <p>No <strong>{categoryFilter}</strong> expenses found for the selected period.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats">
            <div className="stat-card">
              <div className="stat-label">Total</div>
              <div className="stat-value">{formatINR(totalAmount)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Average</div>
              <div className="stat-value">{formatINR(avgAmount)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Count</div>
              <div className="stat-value">{filtered.length}</div>
            </div>
          </div>

          {/* Expense rows */}
          <div className="expenses-list">
            {filtered.map((expense) => (
              <div key={expense.id} className="expense-item">
                <div className="expense-info">
                  <div className="expense-description">
                    {expense.description}
                    {expense.is_recurring && (
                      <span style={{ marginLeft: '8px', color: '#ff9800', fontSize: '12px' }}>
                        🔄 {expense.recurring_frequency ? expense.recurring_frequency.charAt(0).toUpperCase() + expense.recurring_frequency.slice(1) : 'Recurring'}
                      </span>
                    )}
                  </div>
                  <div className="expense-meta">
                    <span className="expense-category">{expense.category}</span>
                    <span>{new Date(expense.date).toLocaleDateString('en-IN')}</span>
                    {expense.merchant && <span>👤 {expense.merchant}</span>}
                  </div>
                  {expense.notes && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', fontStyle: 'italic' }}>
                      📝 {expense.notes}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="expense-amount">{formatINR(expense.amount)}</div>
                  <button
                    onClick={() => onEdit(expense)}
                    style={{
                      background: '#667eea', color: 'white', border: 'none',
                      borderRadius: '3px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px',
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => onDelete(expense.id)}
                    style={{
                      background: '#ff6b6b', color: 'white', border: 'none',
                      borderRadius: '3px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px',
                    }}
                  >
                    🗑️
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
