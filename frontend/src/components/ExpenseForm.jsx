import React, { useState, useEffect } from 'react'

export default function ExpenseForm({ onSubmit, isLoading, editingExpense, onCancel }) {
  const [formData, setFormData] = useState({
    description: '',
    category: 'food',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    merchant: '',
    notes: '',
    is_recurring: false
  })
  
  const [showOCR, setShowOCR] = useState(false)

  const categories = ['food', 'transport', 'entertainment', 'utilities', 'shopping', 'health', 'other']

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        description: editingExpense.description || '',
        category: editingExpense.category || 'food',
        amount: editingExpense.amount || '',
        date: editingExpense.date || new Date().toISOString().split('T')[0],
        merchant: editingExpense.merchant || '',
        notes: editingExpense.notes || '',
        is_recurring: editingExpense.is_recurring || false
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
        category: 'food',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        merchant: '',
        notes: '',
        is_recurring: false
      })
    }
  }

  const handleReceiptScan = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formDataForUpload = new FormData()
    formDataForUpload.append('file', file)

    try {
      const response = await fetch('http://localhost:8000/expenses/receipt-scan', {
        method: 'POST',
        body: formDataForUpload
      })

      if (response.ok) {
        const result = await response.json()
        alert('Receipt scanned successfully! Update the fields as needed.')
        setFormData(prev => ({
          ...prev,
          merchant: result.merchant,
          amount: result.amount,
          date: result.date
        }))
        setShowOCR(false)
      } else {
        alert('Failed to scan receipt. Make sure pytesseract and Tesseract OCR are installed.')
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
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
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="amount">Amount *</label>
        <input
          id="amount"
          type="number"
          name="amount"
          step="0.01"
          value={formData.amount}
          onChange={handleChange}
          placeholder="0.00"
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

      <div className="form-group">
        <details>
          <summary style={{ cursor: 'pointer', color: '#667eea', fontWeight: '600' }}>
            📷 Scan Receipt (Optional)
          </summary>
          <div style={{ marginTop: '10px' }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleReceiptScan}
              disabled={isLoading}
              style={{ marginTop: '10px' }}
            />
            <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
              Upload a receipt photo to auto-extract merchant, amount, and date (requires OCR libraries)
            </p>
          </div>
        </details>
      </div>

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
