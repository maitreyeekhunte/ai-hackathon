import React, { useState } from 'react'

export default function CsvUpload({ onUpload, isLoading }) {
  const [selectedFile, setSelectedFile] = useState(null)

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv')
      const isPDF = file.type === 'application/pdf' || file.name.endsWith('.pdf')
      if (isCSV || isPDF) {
        setSelectedFile(file)
      } else {
        alert('Please select a CSV or PDF file')
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
        Upload a bank statement — CSV (columns: description, category, amount, date) or PDF
      </p>

      <div className="file-input-wrapper">
        <label htmlFor="csv-input" className="file-label">
          Choose CSV or PDF File
        </label>
        <input
          id="csv-input"
          type="file"
          className="file-input"
          accept=".csv,.pdf"
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
        {isLoading ? <span className="loading-spinner"></span> : 'Upload Statement'}
      </button>
    </form>
  )
}
