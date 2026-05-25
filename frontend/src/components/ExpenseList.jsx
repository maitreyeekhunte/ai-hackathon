import React, { useState } from 'react'

export default function ExpenseList({ expenses, isLoading, onFilterChange, onEdit, onDelete }) {
  const [filters, setFilters] = useState({
    month: '',
    startDate: '',
    endDate: ''
  })
  const [expandedId, setExpandedId] = useState(null)

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    const newFilters = { ...filters, [name]: value }
    
    if (name === 'month' && value) {
      newFilters.startDate = ''
      newFilters.endDate = ''
    } else if ((name === 'startDate' || name === 'endDate') && value) {
      newFilters.month = ''
    }
    
    setFilters(newFilters)
    onFilterChange({
      month: newFilters.month,
      startDate: newFilters.startDate,
      endDate: newFilters.endDate
    })
  }

  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const avgAmount = expenses.length > 0 ? (totalAmount / expenses.length).toFixed(2) : '0.00'

  return (
    <div className="expenses-container active">
      <div className="filter-section">
        <div className="filter-group">
          <label htmlFor="month">Month</label>
          <input
            id="month"
            type="month"
            name="month"
            value={filters.month}
            onChange={handleFilterChange}
            disabled={isLoading}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="startDate">Start Date</label>
          <input
            id="startDate"
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            disabled={isLoading || filters.month}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="endDate">End Date</label>
          <input
            id="endDate"
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            disabled={isLoading || filters.month}
          />
        </div>
      </div>

      {expenses.length > 0 && (
        <div className="stats">
          <div className="stat-card">
            <div className="stat-label">Total</div>
            <div className="stat-value">{totalAmount.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Average</div>
            <div className="stat-value">{avgAmount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Count</div>
            <div className="stat-value">{expenses.length}</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <span className="loading-spinner"></span>
        </div>
      ) : expenses.length === 0 ? (
        <div className="no-expenses">
          <p>No expenses found. Start by adding one!</p>
        </div>
      ) : (
        <div className="expenses-list">
          {expenses.map((expense) => (
            <div key={expense.id} className="expense-item">
              <div className="expense-info">
                <div className="expense-description">
                  {expense.description}
                  {expense.is_recurring && <span style={{ marginLeft: '8px', color: '#ff9800', fontSize: '12px' }}>🔄 Recurring</span>}
                </div>
                <div className="expense-meta">
                  <span className="expense-category">{expense.category}</span>
                  <span>{new Date(expense.date).toLocaleDateString()}</span>
                  {expense.merchant && <span>👤 {expense.merchant}</span>}
                </div>
                {expense.notes && (
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '5px', fontStyle: 'italic' }}>
                    📝 {expense.notes}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="expense-amount">{expense.amount.toFixed(2)}</div>
                <button 
                  onClick={() => onEdit(expense)}
                  style={{ 
                    background: '#667eea', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '3px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ✏️
                </button>
                <button 
                  onClick={() => onDelete(expense.id)}
                  style={{ 
                    background: '#ff6b6b', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '3px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
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
