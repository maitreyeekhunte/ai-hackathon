import React, { useState } from 'react'

export default function CsvUpload({ onUpload, isLoading }) {
  const [selectedFile, setSelectedFile] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file)
      } else {
        alert('Please select a valid CSV file')
        e.target.value = ''
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedFile) {
      alert('Please select a file')
      return
    }
    onUpload(selectedFile)
    setSelectedFile(null)
    document.getElementById('csv-input').value = ''
  }

  return (
    <form className="form-section active" onSubmit={handleSubmit}>
      <p style={{ marginBottom: '15px', color: '#666', fontSize: '14px' }}>
        Upload a CSV file with columns: description, category, amount, date
      </p>

      <div className="file-input-wrapper">
        <label htmlFor="csv-input" className="file-label">
          Choose CSV File
        </label>
        <input
          id="csv-input"
          type="file"
          className="file-input"
          accept=".csv"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        {selectedFile && (
          <span className="file-name">
            ✓ {selectedFile.name}
          </span>
        )}
      </div>

      <button type="submit" disabled={isLoading || !selectedFile}>
        {isLoading ? <span className="loading-spinner"></span> : 'Upload CSV'}
      </button>
    </form>
  )
}
