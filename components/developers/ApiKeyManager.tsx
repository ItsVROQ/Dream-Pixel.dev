'use client'

import { useState, useEffect } from 'react'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  type: string
  createdAt: string
  lastUsedAt: string | null
}

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [newKey, setNewKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchKeys()
  }, [])

  async function fetchKeys() {
    try {
      const res = await fetch('/api/keys')
      if (res.ok) {
        const data = await res.json()
        setKeys(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function createKey(type: 'live' | 'test') {
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name: `${type === 'live' ? 'Live' : 'Test'} Key` })
      })
      if (res.ok) {
        const data = await res.json()
        setNewKey(data.key)
        fetchKeys()
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function revokeKey(id: string) {
    if (!confirm('Are you sure you want to revoke this key?')) return
    try {
      await fetch(`/api/keys/${id}`, { method: 'DELETE' })
      fetchKeys()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <h3 className="text-xl font-semibold mb-4">API Keys</h3>
      
      {newKey && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 font-medium mb-2">New API Key Created</p>
          <div className="flex items-center gap-2">
            <code className="bg-white px-3 py-2 rounded border font-mono text-sm flex-1">{newKey}</code>
            <button 
              onClick={() => { navigator.clipboard.writeText(newKey); alert('Copied!') }}
              className="text-sm text-green-700 hover:text-green-900"
            >
              Copy
            </button>
          </div>
          <p className="text-sm text-green-600 mt-2">Make sure to copy your API key now. You won't be able to see it again!</p>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => createKey('live')}
          className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800"
        >
          Create Live Key
        </button>
        <button
          onClick={() => createKey('test')}
          className="bg-white text-black border px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          Create Test Key
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p>Loading keys...</p>
        ) : keys.length === 0 ? (
          <p className="text-gray-500">No API keys found.</p>
        ) : (
          keys.map(key => (
            <div key={key.id} className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{key.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${key.type === 'live' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                    {key.type}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1 font-mono">
                  {key.keyPrefix}...
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Created: {new Date(key.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => revokeKey(key.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Revoke
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
