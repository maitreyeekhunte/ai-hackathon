import React, { useState, useEffect } from 'react'

const CATEGORIES = [
  'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
  'Bills & Utilities', 'Healthcare', 'Travel', 'Education',
  'Personal Care', 'Home', 'Transfers', 'Miscellaneous',
]

const BLANK = {
  description: '',
  category: 'Food & Dining',
  amount: '',
  date: new Date().toISOString().split('T')[0],
  merchant: '',
  notes: '',
  is_recurring: false,
  recurring_frequency: 'monthly',
}

export default function ExpenseForm({ onSubmit, isLoading, editingExpense, onCancel }) {
  const [formData, setFormData] = useState(BLANK)
  // Holds the custom category name typed when "Miscellaneous" is selected
  const [customCategory, setCustomCategory] = useState('')

  useEffect(() => {
    if (editingExpense) {
      const isCustom = !CATEGORIES.includes(editingExpense.category)
      setFormData({
        description:         editingExpense.description         || '',
        // If the saved category is a custom AI label, show Miscellaneous in the select
        category:            isCustom ? 'Miscellaneous' : (editingExpense.category || 'Food & Dining'),
        amount:              editingExpense.amount != null ? String(editingExpense.amount) : '',
        date:                editingExpense.date                || new Date().toISOString().split('T')[0],
        merchant:            editingExpense.merchant            || '',
        notes:               editingExpense.notes               || '',
        is_recurring:        editingExpense.is_recurring        || false,
        recurring_frequency: editingExpense.recurring_frequency || 'monthly',
      })
      // Pre-fill the custom text field with the saved custom label
      setCustomCategory(isCustom ? editingExpense.category : '')
    } else {
      setFormData(BLANK)
      setCustomCategory('')
    }
  }, [editingExpense])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      // Keep amount as a string — never convert mid-edit to avoid float drift
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (name === 'category' && value !== 'Miscellaneous') {
      setCustomCategory('')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.description.trim()) {
      alert('Please fill in a description.')
      return
    }
    const parsedAmount = parseFloat(formData.amount)
    if (!formData.amount || isNaN(parsedAmount)) {
      alert('Please enter a valid amount.')
      return
    }
    if (parsedAmount <= 0) {
      alert('Amount must be greater than 0.')
      return
    }

    const finalCategory =
      formData.category === 'Miscellaneous' && customCategory.trim()
        ? customCategory.trim()
        : formData.category

    onSubmit({ ...formData, category: finalCategory, amount: parsedAmount })
    if (!editingExpense) {
      setFormData(BLANK)
      setCustomCategory('')
    }
  }

  const isMiscellaneous = formData.category === 'Miscellaneous'

  return (
    <div style={{ maxWidth: 660 }}>
      <form className="form-card form-stack" onSubmit={handleSubmit}>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description">Description <span style={{ color: '#EF4444' }}>*</span></label>
          <input
            id="description"
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="e.g. Lunch at restaurant"
            disabled={isLoading}
            autoFocus={!editingExpense}
          />
        </div>

        {/* Category + Amount */}
        <div className="form-grid-2">
          <div className="form-group">
            <label htmlFor="category">Category <span style={{ color: '#EF4444' }}>*</span></label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              disabled={isLoading}
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            {/* Custom category field — only visible when Miscellaneous is selected */}
            {isMiscellaneous && (
              <div style={{ marginTop: 8 }}>
                <input
                  type="text"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category (e.g. Pet Care)"
                  disabled={isLoading}
                  autoFocus
                  style={{ borderColor: customCategory.trim() ? '#6366F1' : undefined }}
                />
                {customCategory.trim() && (
                  <div style={{ fontSize: 11.5, color: '#6366F1', marginTop: 4 }}>
                    Will be saved as "{customCategory.trim()}" under Miscellaneous
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="amount">Amount (₹) <span style={{ color: '#EF4444' }}>*</span></label>
            <input
              id="amount"
              type="number"
              name="amount"
              step="any"
              min="0"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              disabled={isLoading}
              style={formData.amount !== '' && parseFloat(formData.amount) < 0 ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.1)' } : {}}
            />
            {formData.amount !== '' && parseFloat(formData.amount) < 0 && (
              <div style={{ fontSize: 12, color: '#DC2626', marginTop: 4, fontWeight: 500 }}>
                Amount cannot be negative.
              </div>
            )}
          </div>
        </div>

        {/* Date + Merchant */}
        <div className="form-grid-2">
          <div className="form-group">
            <label htmlFor="date">Date <span style={{ color: '#EF4444' }}>*</span></label>
            <input id="date" type="date" name="date" value={formData.date} onChange={handleChange} disabled={isLoading} />
          </div>
          <div className="form-group">
            <label htmlFor="merchant">Merchant <span style={{ color: '#94A3B8', fontWeight: 400 }}>— optional</span></label>
            <input
              id="merchant"
              type="text"
              name="merchant"
              value={formData.merchant}
              onChange={handleChange}
              placeholder="e.g. Swiggy"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="form-group">
          <label htmlFor="notes">Notes <span style={{ color: '#94A3B8', fontWeight: 400 }}>— optional</span></label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any additional details..."
            disabled={isLoading}
          />
        </div>

        {/* Recurring */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '14px 16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', marginBottom: 0, fontWeight: 500, color: '#475569' }}>
            <input
              type="checkbox"
              name="is_recurring"
              checked={formData.is_recurring}
              onChange={handleChange}
              disabled={isLoading}
            />
            Mark as recurring expense
          </label>
          {formData.is_recurring && (
            <div className="form-group" style={{ marginTop: 12 }}>
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
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>
            {isLoading
              ? <><span className="spinner" /> {editingExpense ? 'Saving...' : 'Adding...'}</>
              : editingExpense ? 'Save Changes' : 'Add Expense'
            }
          </button>
          {editingExpense && (
            <button type="button" className="btn btn-secondary btn-lg" onClick={onCancel} disabled={isLoading}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
