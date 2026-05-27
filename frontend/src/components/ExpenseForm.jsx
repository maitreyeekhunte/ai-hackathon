import React, { useState, useEffect } from 'react'

export default function ExpenseForm({ onSubmit, isLoading, editingExpense, onCancel }) {
  const [formData, setFormData] = useState({
    description: '',
    category: 'Food & Dining',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    notes: '',
    is_recurring: false,
    recurring_frequency: 'monthly'
  })

  const categories = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Travel',
    'Education',
    'Personal Care',
    'Home',
    'Investments & Savings',
    'Income',
    'Transfers',
    'Other',
  ]

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        description: editingExpense.description || '',
        category: editingExpense.category || 'Food & Dining',
        amount: editingExpense.amount || '',
        date: editingExpense.date || new Date().toISOString().split('T')[0],
        merchant: editingExpense.merchant || '',
        notes: editingExpense.notes || '',
        is_recurring: editingExpense.is_recurring || false,
        recurring_frequency: editingExpense.recurring_frequency || 'monthly'
      })
    }
  }, [editingExpense])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'amount' ? parseFloat(value) || '' : value)
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.description.trim() || !formData.amount) {
      alert('Please fill in description and amount')
      return
    }
    onSubmit(formData)
    if (!editingExpense) {
      setFormData({
        description: '',
        category: 'Food & Dining',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        merchant: '',
        notes: '',
        is_recurring: false,
        recurring_frequency: 'monthly'
      })
    }
  }

  return (
    <form className="form-section active" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="description">Description *</label>
        <input
          id="description"
          type="text"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="e.g., Lunch at restaurant"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="merchant">Merchant (Optional)</label>
        <input
          id="merchant"
          type="text"
          name="merchant"
          value={formData.merchant}
          onChange={handleChange}
          placeholder="e.g., Starbucks"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="category">Category *</label>
        <select
          id="category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          disabled={isLoading}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="amount">Amount * <span style={{ fontWeight: 'normal', color: '#666' }}>(In INR)</span></label>
        <input
          id="amount"
          type="number"
          name="amount"
          step="0.01"
          value={formData.amount}
          onChange={handleChange}
          placeholder="Enter amount in INR"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="date">Date *</label>
        <input
          id="date"
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="notes">Notes (Optional)</label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add any additional notes..."
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            name="is_recurring"
            checked={formData.is_recurring}
            onChange={handleChange}
            disabled={isLoading}
          />
          Mark as recurring
        </label>
      </div>

      {formData.is_recurring && (
        <div className="form-group">
          <label htmlFor="recurring_frequency">Frequency</label>
          <select
            id="recurring_frequency"
            name="recurring_frequency"
            value={formData.recurring_frequency}
            onChange={handleChange}
            disabled={isLoading}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      )}

      <div className="button-group">
        <button type="submit" disabled={isLoading}>
          {isLoading ? <span className="loading-spinner"></span> : editingExpense ? 'Update Expense' : 'Add Expense'}
        </button>
        {editingExpense && (
          <button type="button" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
