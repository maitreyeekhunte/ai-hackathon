import React, { useState, useRef, useEffect } from 'react'

const API_URL = 'http://localhost:8000'

function formatDateTime(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function FileIcon({ type }) {
  const isPDF = type === 'PDF'
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
      background: isPDF ? '#FEF2F2' : '#EFF6FF',
      border: `1px solid ${isPDF ? '#FECACA' : '#BFDBFE'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: isPDF ? '#DC2626' : '#2563EB',
    }}>
      {type}
    </div>
  )
}

export default function CsvUpload({ onUpload, isLoading }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const inputRef = useRef(null)
  const prevLoading = useRef(false)

  useEffect(() => { fetchHistory() }, [])

  // Refresh history when an upload finishes (isLoading flips true → false)
  useEffect(() => {
    if (prevLoading.current && !isLoading) fetchHistory()
    prevLoading.current = isLoading
  }, [isLoading])

  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`${API_URL}/upload-history`)
      if (res.ok) setHistory(await res.json())
    } catch {}
    setHistoryLoading(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this entry from history?')) return
    try {
      await fetch(`${API_URL}/upload-history/${id}`, { method: 'DELETE' })
      setHistory(h => h.filter(e => e.id !== id))
    } catch {}
  }

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
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

      {/* ── Left: Upload Form ─────────────────────────────────────── */}
      <div style={{ flex: '0 0 480px', maxWidth: 480 }}>
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

          {/* Info */}
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 18px', marginTop: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#475569', marginBottom: 8 }}>What we support</div>
            {[
              'CSV files with columns: date, description, amount, category (optional)',
              'PDF bank statements — text-based or scanned (image)',
              'Most Indian bank formats: HDFC, SBI, Axis, Kotak, ICICI, HSBC and more',
              'Debit/Credit split columns, alternate header names',
            ].map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: '#64748B', alignItems: 'flex-start', marginBottom: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" style={{ marginTop: 1, flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                {tip}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary btn-lg" disabled={isLoading || !selectedFile}>
              {isLoading
                ? <><span className="spinner" /> Importing...</>
                : <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Import Statement
                  </>
              }
            </button>
            {selectedFile && !isLoading && (
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => { setSelectedFile(null); if (inputRef.current) inputRef.current.value = '' }}>
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ── Right: Upload History ─────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Uploaded Statements</div>
          <div style={{ fontSize: 12, color: '#94A3B8' }}>{history.length} {history.length === 1 ? 'file' : 'files'}</div>
        </div>

        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          {historyLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <span className="spinner spinner-dark" style={{ width: 22, height: 22, borderWidth: 2.5 }} />
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: '#94A3B8' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#64748B', marginBottom: 4 }}>No uploads yet</div>
              <div style={{ fontSize: 13 }}>Imported statements will appear here.</div>
            </div>
          ) : (
            history.map((entry, idx) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 16px',
                  borderBottom: idx < history.length - 1 ? '1px solid #F1F5F9' : 'none',
                }}
              >
                <FileIcon type={entry.file_type} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.original_filename}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    {formatDateTime(entry.uploaded_at)}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                  {entry.status === 'success' ? (
                    <span style={{ fontSize: 11.5, fontWeight: 600, background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', borderRadius: 10, padding: '2px 9px' }}>
                      ✓ {entry.transaction_count} imported
                    </span>
                  ) : (
                    <span style={{ fontSize: 11.5, fontWeight: 600, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA', borderRadius: 10, padding: '2px 9px' }}>
                      ✕ Failed
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(entry.id)}
                  title="Remove from history"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#CBD5E1', padding: 4, borderRadius: 6, flexShrink: 0,
                    display: 'flex', alignItems: 'center',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
