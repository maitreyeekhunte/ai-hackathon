import React, { useState, useEffect } from 'react'

function formatINR(amount) {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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

  const filtered = freqFilter === 'all'
    ? expenses
    : expenses.filter(e => e.recurring_frequency === freqFilter)

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <span className="loading-spinner"></span>
      </div>
    )
  }

  return (
    <div className="form-section active">
      {/* Frequency filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {FREQUENCIES.map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFreqFilter(f)}
            style={{
              padding: '6px 18px',
              borderRadius: '20px',
              border: '2px solid #667eea',
              background: freqFilter === f ? '#667eea' : 'white',
              color: freqFilter === f ? 'white' : '#667eea',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px',
              textTransform: 'capitalize',
            }}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {expenses.length === 0 ? (
        <div className="no-expenses">
          <p>No recurring expenses yet. Add an expense and tick "Mark as recurring" to see it here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="no-expenses">
          <p>No {freqFilter} recurring expenses found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(exp => (
            <div key={exp.id} style={{
              background: '#f8f9fa',
              padding: '15px 18px',
              borderRadius: '8px',
              borderLeft: '4px solid #667eea',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  🔄 {exp.description}
                  {exp.recurring_frequency && (
                    <span style={{
                      marginLeft: '10px',
                      fontSize: '11px',
                      background: '#667eea',
                      color: 'white',
                      borderRadius: '10px',
                      padding: '2px 8px',
                      textTransform: 'capitalize',
                      fontWeight: '500',
                    }}>
                      {exp.recurring_frequency}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#555' }}>
                  {exp.category}
                  {exp.merchant && <span> · 👤 {exp.merchant}</span>}
                  <span> · {new Date(exp.date).toLocaleDateString('en-IN')}</span>
                </div>
                {exp.notes && (
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '3px', fontStyle: 'italic' }}>
                    📝 {exp.notes}
                  </div>
                )}
              </div>
              <div style={{ fontWeight: '700', fontSize: '16px', color: '#667eea', whiteSpace: 'nowrap', marginLeft: '16px' }}>
                {formatINR(exp.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
