import React, { useState, useEffect } from 'react'

export default function RecurringTransactions({ isLoading }) {
  const [recurring, setRecurring] = useState([])
  const [loading, setLoading] = useState(false)

  const API_URL = 'http://localhost:8000'

  useEffect(() => {
    fetchRecurring()
  }, [])

  const fetchRecurring = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/recurring`)
      if (response.ok) {
        const data = await response.json()
        setRecurring(data)
      }
    } catch (error) {
      console.error('Error fetching recurring:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDetectRecurring = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/recurring/detect`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Detected ${result.detected} recurring patterns!`)
        await fetchRecurring()
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-section active">
      <h2 style={{ marginBottom: '20px' }}>🔄 Recurring Transactions</h2>

      <button onClick={handleDetectRecurring} disabled={loading} style={{ marginBottom: '20px' }}>
        🔍 Detect Recurring Patterns
      </button>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <span className="loading-spinner"></span>
        </div>
      ) : recurring.length === 0 ? (
        <div className="no-expenses">
          <p>No recurring transactions detected. Click "Detect Recurring Patterns" to analyze your expenses!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {recurring.map((item) => (
            <div key={item.id} style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '5px',
              borderLeft: '4px solid #ff9800'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '5px' }}>{item.description}</div>
              <div style={{ fontSize: '14px', color: '#333', marginBottom: '8px' }}>
                <strong>Amount:</strong> {item.amount.toFixed(2)} | <strong>Category:</strong> {item.category}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                <strong>Pattern:</strong> {item.pattern} • 
                <strong> Confidence:</strong> {(item.confidence * 100).toFixed(0)}% • 
                <strong> Last:</strong> {new Date(item.last_detected).toLocaleDateString()}
                {item.merchant && ` • <strong>Merchant:</strong> ${item.merchant}`}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '20px', background: '#e3f2fd', borderRadius: '5px', fontSize: '14px', color: '#1565c0' }}>
        <strong>💡 Tip:</strong> The system automatically flags recurring transactions (subscriptions, bills) with a 🔄 icon in your expense list.
      </div>
    </div>
  )
}
