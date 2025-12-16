'use client'

import { useEffect, useState } from 'react'

interface Generation {
  id: string
  prompt: string
  seed: number | null
  status: string
  processingTimeMs: number | null
  createdAt: Date
  resultImageUrl: string | null
  user: {
    id: string
    email: string
    name: string | null
    tier: string
  }
}

export default function GenerationsPage() {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    fetchGenerations()
  }, [page, statusFilter])

  const fetchGenerations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/admin/generations?${params}`)
      if (!response.ok) throw new Error('Failed to fetch generations')
      const data = await response.json()
      setGenerations(data.generations)
      setTotalPages(data.pagination.totalPages)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const deleteFailedGenerations = async () => {
    if (!confirm('Are you sure you want to delete all failed generations?')) return
    try {
      const response = await fetch('/api/admin/generations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'FAILED' })
      })
      if (!response.ok) throw new Error('Failed to delete generations')
      const result = await response.json()
      alert(`Deleted ${result.deleted} failed generations`)
      await fetchGenerations()
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  if (loading && generations.length === 0) {
    return <div className="loading">Loading generations...</div>
  }

  return (
    <div>
      <div className="admin-header">
        <h2>Generation Management</h2>
      </div>

      <div className="data-table">
        <div className="table-controls">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="SUCCEEDED">SUCCEEDED</option>
            <option value="FAILED">FAILED</option>
          </select>
          <button onClick={fetchGenerations}>Refresh</button>
          <button className="danger" onClick={deleteFailedGenerations}>
            Delete Failed
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Prompt</th>
              <th>Seed</th>
              <th>Status</th>
              <th>Processing Time</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {generations.map((gen) => (
              <tr key={gen.id}>
                <td>
                  {gen.user.email}
                  <br />
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    ({gen.user.tier})
                  </span>
                </td>
                <td>{gen.prompt.substring(0, 60)}...</td>
                <td>{gen.seed || '-'}</td>
                <td>
                  <span className={`badge ${
                    gen.status === 'SUCCEEDED' ? 'success' :
                    gen.status === 'FAILED' ? 'error' :
                    'warning'
                  }`}>
                    {gen.status}
                  </span>
                </td>
                <td>
                  {gen.processingTimeMs 
                    ? `${(gen.processingTimeMs / 1000).toFixed(2)}s`
                    : '-'
                  }
                </td>
                <td>{new Date(gen.createdAt).toLocaleString()}</td>
                <td>
                  <div className="action-buttons">
                    {gen.resultImageUrl && (
                      <button
                        className="btn-primary"
                        onClick={() => setSelectedImage(gen.resultImageUrl)}
                      >
                        View Image
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {selectedImage && (
        <div className="modal-overlay" onClick={() => setSelectedImage(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Generated Image</h3>
            <img 
              src={selectedImage} 
              alt="Generated" 
              style={{ maxWidth: '100%', borderRadius: '8px' }}
            />
            <button
              style={{ marginTop: '20px' }}
              onClick={() => setSelectedImage(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
