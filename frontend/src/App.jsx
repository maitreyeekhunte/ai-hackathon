import React, { useState } from 'react'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import CsvUpload from './components/CsvUpload'
import RecurringTransactions from './components/RecurringTransactions'

export default function App() {
  const [activeTab, setActiveTab] = useState('add')
  const [expenses, setExpenses] = useState([])
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ startDate: null, endDate: null, month: null })
  const [editingExpense, setEditingExpense] = useState(null)

  const API_URL = 'http://localhost:8000'

  const fetchExpenses = async (filterParams = {}) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filterParams.month) {
        params.append('month', filterParams.month)
      } else {
        if (filterParams.startDate) params.append('start_date', filterParams.startDate)
        if (filterParams.endDate) params.append('end_date', filterParams.endDate)
      }

      const response = await fetch(`${API_URL}/expenses?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data)
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch expenses' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  // no auto-fetch on mount — user must apply a filter in View Expenses

  const handleAddExpense = async (expenseData) => {
    try {
      setLoading(true)
      const method = editingExpense ? 'PUT' : 'POST'
      const url = editingExpense ? `${API_URL}/expenses/${editingExpense.id}` : `${API_URL}/expenses`
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      })

      if (response.ok) {
        const action = editingExpense ? 'updated' : 'added'
        setMessage({ type: 'success', text: `Expense ${action} successfully!` })
        await fetchExpenses(filters)
        setEditingExpense(null)
        setActiveTab('list')
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.detail || 'Failed to save expense' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/expenses/${expenseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Expense deleted successfully!' })
        await fetchExpenses(filters)
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'Failed to delete expense' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const handleEditExpense = (expense) => {
    setEditingExpense(expense)
    setActiveTab('add')
  }

  const handleCsvUpload = async (file) => {
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${API_URL}/upload-statement`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setMessage({ type: 'success', text: `Successfully imported ${data.length} expenses!` })
        await fetchExpenses(filters)
        setActiveTab('list')
        setTimeout(() => setMessage(null), 3000)
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.detail || 'Failed to upload CSV' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm(`Delete all ${expenses.length} expenses? This cannot be undone.`)) return
    try {
      setLoading(true)
      await Promise.all(expenses.map(e => fetch(`${API_URL}/expenses/${e.id}`, { method: 'DELETE' })))
      setExpenses([])
      setMessage({ type: 'success', text: 'All expenses deleted.' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: `Error: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    fetchExpenses(newFilters)
  }

  return (
    <div className="container">
      <h1>✨ AI Powered Expense Tracker</h1>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => { setActiveTab('add'); setEditingExpense(null) }}
        >
          {editingExpense ? 'Edit' : 'Add'} Expense
        </button>
        <button 
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Upload Statement
        </button>
        <button 
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          View Expenses
        </button>
        <button 
          className={`tab-btn ${activeTab === 'recurring' ? 'active' : ''}`}
          onClick={() => setActiveTab('recurring')}
        >
          Recurring Expenses
        </button>
      </div>

      {activeTab === 'add' && (
        <ExpenseForm 
          onSubmit={handleAddExpense} 
          isLoading={loading}
          editingExpense={editingExpense}
          onCancel={() => setEditingExpense(null)}
        />
      )}

      {activeTab === 'upload' && (
        <CsvUpload onUpload={handleCsvUpload} isLoading={loading} />
      )}

      {activeTab === 'list' && (
        <ExpenseList
          expenses={expenses}
          isLoading={loading}
          onFilterChange={handleFilterChange}
          onEdit={handleEditExpense}
          onDelete={handleDeleteExpense}
          onDeleteAll={handleDeleteAll}
        />
      )}

      {activeTab === 'recurring' && (
        <RecurringTransactions isLoading={loading} />
      )}

    </div>
  )
}
