import React, { useState } from 'react'
import ExpenseForm from './components/ExpenseForm'
import ExpenseList from './components/ExpenseList'
import CsvUpload from './components/CsvUpload'
import RecurringTransactions from './components/RecurringTransactions'
import BudgetTracker from './components/BudgetTracker'

const NAV = [
  {
    id: 'add', label: 'Add Expense',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  },
  {
    id: 'upload', label: 'Upload Statement',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  },
  {
    id: 'list', label: 'View Expenses',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/></svg>,
  },
  {
    id: 'recurring', label: 'Recurring',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  },
  {
    id: 'budget', label: 'Budget & Insights',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('add')
  const [expenses, setExpenses] = useState([])
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ startDate: null, endDate: null, month: null })
  const [editingExpense, setEditingExpense] = useState(null)

  const API_URL = 'http://localhost:8000'

  const showToast = (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

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
        setExpenses(await response.json())
      } else {
        showToast('error', 'Failed to fetch expenses')
      }
    } catch (error) {
      showToast('error', `Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpense = async (expenseData) => {
    try {
      setLoading(true)
      const method = editingExpense ? 'PUT' : 'POST'
      const url = editingExpense ? `${API_URL}/expenses/${editingExpense.id}` : `${API_URL}/expenses`
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      })
      if (response.ok) {
        showToast('success', editingExpense ? 'Expense updated!' : 'Expense added!')
        await fetchExpenses(filters)
        setEditingExpense(null)
        setActiveTab('list')
      } else {
        const error = await response.json()
        showToast('error', error.detail || 'Failed to save expense')
      }
    } catch (error) {
      showToast('error', `Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteExpense = async (expenseId) => {
    if (!confirm('Delete this expense?')) return
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/expenses/${expenseId}`, { method: 'DELETE' })
      if (response.ok) {
        showToast('success', 'Expense deleted.')
        await fetchExpenses(filters)
      } else {
        showToast('error', 'Failed to delete expense')
      }
    } catch (error) {
      showToast('error', `Error: ${error.message}`)
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
      const response = await fetch(`${API_URL}/upload-statement`, { method: 'POST', body: formData })
      if (response.ok) {
        const data = await response.json()
        showToast('success', `Imported ${data.length} expense${data.length !== 1 ? 's' : ''} successfully!`)
        await fetchExpenses(filters)
        setActiveTab('list')
      } else {
        const error = await response.json()
        showToast('error', error.detail || 'Failed to upload file')
      }
    } catch (error) {
      showToast('error', `Error: ${error.message}`)
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
      showToast('success', 'All expenses deleted.')
    } catch (error) {
      showToast('error', `Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters)
    fetchExpenses(newFilters)
  }

  const handleNav = (id) => {
    setActiveTab(id)
    if (id !== 'add') setEditingExpense(null)
  }

  const pageTitle = editingExpense
    ? 'Edit Expense'
    : NAV.find(n => n.id === activeTab)?.label || ''

  return (
    <div className="app-layout">
      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="6" width="22" height="15" rx="3"/>
              <path d="M16 11h4v4h-4a2 2 0 0 1 0-4z"/>
              <path d="M1 10h22"/>
            </svg>
          </div>
          <div>
            <div className="brand-name">SmartPocket</div>
            <div className="brand-tagline">Expense Tracker</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => handleNav(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.id === 'add' && editingExpense ? 'Edit Expense' : item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          Powered by GPT-4o
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────── */}
      <div className="main-area">
        <header className="top-bar">
          <div className="page-title">{pageTitle}</div>
        </header>

        <main className="content">
          {activeTab === 'add' && (
            <ExpenseForm
              onSubmit={handleAddExpense}
              isLoading={loading}
              editingExpense={editingExpense}
              onCancel={() => { setEditingExpense(null); setActiveTab('list') }}
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
            <RecurringTransactions />
          )}
          {activeTab === 'budget' && (
            <BudgetTracker />
          )}
        </main>
      </div>

      {/* ── Toast ─────────────────────────────────────── */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success'
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          }
          {toast.text}
        </div>
      )}
    </div>
  )
}
