import React, { useState, useEffect } from 'react'

export default function LinkedAccounts({ isLoading }) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newAccount, setNewAccount] = useState({
    bank_name: '',
    account_type: 'checking'
  })

  const API_URL = 'http://localhost:8000'

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/linked-accounts`)
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccount = async (e) => {
    e.preventDefault()
    if (!newAccount.bank_name.trim()) {
      alert('Please enter bank name')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/linked-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccount)
      })

      if (response.ok) {
        setNewAccount({ bank_name: '', account_type: 'checking' })
        setShowForm(false)
        await fetchAccounts()
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncAccount = async (accountId) => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/linked-accounts/${accountId}/sync`, {
        method: 'POST'
      })

      if (response.ok) {
        await fetchAccounts()
        alert('Account synced successfully!')
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async (accountId) => {
    if (!confirm('Remove this linked account?')) return

    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/linked-accounts/${accountId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchAccounts()
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-section active">
      <h2 style={{ marginBottom: '20px' }}>🔗 Linked Accounts</h2>

      {!showForm && (
        <button onClick={() => setShowForm(true)} disabled={loading}>
          + Link New Account
        </button>
      )}

      {showForm && (
        <form onSubmit={handleAddAccount} style={{ marginBottom: '20px' }}>
          <div className="form-group">
            <label htmlFor="bank_name">Bank Name</label>
            <input
              id="bank_name"
              type="text"
              value={newAccount.bank_name}
              onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })}
              placeholder="e.g., Chase, Bank of America"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="account_type">Account Type</label>
            <select
              id="account_type"
              value={newAccount.account_type}
              onChange={(e) => setNewAccount({ ...newAccount, account_type: e.target.value })}
              disabled={loading}
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit">Credit Card</option>
            </select>
          </div>

          <div className="button-group">
            <button type="submit" disabled={loading}>Add Account</button>
            <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <span className="loading-spinner"></span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="no-expenses">
          <p>No linked accounts. Link one to enable auto-import!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {accounts.map((account) => (
            <div key={account.id} style={{
              background: '#f8f9fa',
              padding: '15px',
              borderRadius: '5px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '5px' }}>{account.bank_name}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {account.account_type} • {account.is_active ? '✅ Active' : '❌ Inactive'}
                  {account.last_sync && ` • Last sync: ${new Date(account.last_sync).toLocaleString()}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleSyncAccount(account.id)}
                  disabled={loading}
                  style={{ background: '#667eea', padding: '6px 12px', fontSize: '12px' }}
                >
                  🔄 Sync
                </button>
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  disabled={loading}
                  style={{ background: '#ff6b6b', padding: '6px 12px', fontSize: '12px' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
