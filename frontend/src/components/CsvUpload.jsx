import React, { useState, useRef } from 'react'

export default function CsvUpload({ onUpload, isLoading }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const accept = (file) => {
    if (!file) return
    const ok = file.type === 'text/csv' || file.name.endsWith('.csv')
             || file.type === 'application/pdf' || file.name.endsWith('.pdf')
    if (!ok) { alert('Please select a CSV or PDF file.'); return }
    setSelectedFile(file)
  }

  const handleFileChange = (e) => accept(e.target.files?.[0])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    accept(e.dataTransfer.files?.[0])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedFile) { alert('Please select a file.'); return }
    onUpload(selectedFile)
    setSelectedFile(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const fileExt = selectedFile?.name.split('.').pop().toUpperCase()

  return (
    <div style={{ maxWidth: 580 }}>
      <form onSubmit={handleSubmit}>
        {/* Drop zone */}
        <div
          className={`upload-zone${dragOver ? ' drag-over' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            id="csv-input"
            type="file"
            accept=".csv,.pdf"
            onChange={handleFileChange}
            disabled={isLoading}
            style={{ display: 'none' }}
          />

          {selectedFile ? (
            <>
              <div style={{ marginBottom: 10 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#EEF2FF', color: '#4F46E5',
                  border: '1px solid #C7D2FE', borderRadius: 8,
                  padding: '8px 16px', fontWeight: 600, fontSize: 14,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  {selectedFile.name}
                  <span style={{ background: '#C7D2FE', borderRadius: 4, padding: '1px 6px', fontSize: 11 }}>{fileExt}</span>
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Click to change file</div>
            </>
          ) : (
            <>
              <div className="upload-zone-icon">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div className="upload-zone-title">Drop your file here, or click to browse</div>
              <div className="upload-zone-sub">Supports CSV and PDF bank statements</div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {['CSV', 'PDF'].map(t => (
                  <span key={t} style={{ background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{t}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Tip box */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px', marginTop: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 8 }}>What we support</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              'CSV files with columns: date, description, amount, category (optional)',
              'PDF bank statements — text-based or scanned (image)',
              'Most Indian bank formats: HDFC, SBI, Axis, Kotak, ICICI, HSBC and more',
              'Debit/Credit split columns, alternate header names',
            ].map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: '#64748B', alignItems: 'flex-start' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" style={{ marginTop: 1, flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                {tip}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isLoading || !selectedFile}
          >
            {isLoading
              ? <><span className="spinner" /> Importing...</>
              : <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Import Statement
                </>
            }
          </button>
          {selectedFile && !isLoading && (
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              style={{ marginLeft: 10 }}
              onClick={() => { setSelectedFile(null); if (inputRef.current) inputRef.current.value = '' }}
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
