import React, { useState, useEffect } from 'react'

function formatINR(amount) {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const FREQ_COLORS = {
  daily:   { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
  weekly:  { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  monthly: { bg: '#EDE9FE', text: '#5B21B6', border: '#DDD6FE' },
  yearly:  { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
}

const CAT_COLORS = {
  'Food & Dining': '#F59E0B', 'Transportation': '#3B82F6', 'Shopping': '#EC4899',
  'Entertainment': '#8B5CF6', 'Bills & Utilities': '#EF4444', 'Healthcare': '#10B981',
  'Travel': '#06B6D4', 'Education': '#F97316', 'Personal Care': '#D946EF',
  'Home': '#84CC16', 'Transfers': '#64748B', 'Miscellaneous': '#94A3B8',
}

const FREQUENCIES = ['all', 'daily', 'weekly', 'monthly', 'yearly']

export default function RecurringTransactions() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [freqFilter, setFreqFilter] = useState('all')

  useEffect(() => {
    fetch('http://localhost:8000/expenses/recurring')
      .then(r => r.json())
      .then(data => setExpenses(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = freqFilter === 'all' ? expenses : expenses.filter(e => e.recurring_frequency === freqFilter)

  const totalMonthly = expenses.reduce((sum, e) => {
    const amt = e.amount
    if (e.recurring_frequency === 'daily')   return sum + amt * 30
    if (e.recurring_frequency === 'weekly')  return sum + amt * 4.33
    if (e.recurring_frequency === 'monthly') return sum + amt
    if (e.recurring_frequency === 'yearly')  return sum + amt / 12
    return sum + amt
  }, 0)

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <span className="spinner spinner-dark" style={{ width: 28, height: 28, borderWidth: 3 }} />
    </div>
  )

  return (
    <div>
      {/* Summary strip */}
      {expenses.length > 0 && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="stat-label">Total Recurring</div>
            <div className="stat-value">{expenses.length}</div>
            <div className="stat-sub">active commitments</div>
          </div>
          <div className="stat-card" style={{ flex: 1 }}>
            <div className="stat-label">Monthly Equivalent</div>
            <div className="stat-value">{formatINR(totalMonthly)}</div>
            <div className="stat-sub">estimated per month</div>
          </div>
        </div>
      )}

      {/* Frequency filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="pill-tabs">
          {FREQUENCIES.map(f => (
            <button
              key={f}
              className={`pill ${freqFilter === f ? 'active' : ''}`}
              onClick={() => setFreqFilter(f)}
              type="button"
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: '#94A3B8' }}>
          {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* List */}
      {expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          </div>
          <div className="empty-state-title">No recurring expenses yet</div>
          <div className="empty-state-desc">Add an expense and tick "Mark as recurring" to track your subscriptions and fixed costs here.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No {freqFilter} expenses</div>
          <div className="empty-state-desc">No recurring expenses with this frequency.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(exp => {
            const freqStyle = FREQ_COLORS[exp.recurring_frequency] || { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' }
            const catColor = CAT_COLORS[exp.category] || '#94A3B8'
            return (
              <div
                key={exp.id}
                style={{
                  background: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  transition: 'box-shadow 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)'}
              >
                {/* Category color bar */}
                <div style={{ width: 4, height: 40, background: catColor, borderRadius: 4, flexShrink: 0 }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0F172A', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {exp.description}
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, background: catColor + '18', color: catColor, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
                      {exp.category}
                    </span>
                    {exp.merchant && (
                      <span style={{ fontSize: 12, color: '#94A3B8' }}>{exp.merchant}</span>
                    )}
                    <span style={{ fontSize: 12, color: '#94A3B8' }}>
                      {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Right side */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{formatINR(exp.amount)}</div>
                  {exp.recurring_frequency && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 10, textTransform: 'capitalize',
                      background: freqStyle.bg, color: freqStyle.text, border: `1px solid ${freqStyle.border}`,
                    }}>
                      {exp.recurring_frequency}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
