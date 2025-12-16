'use client'

import { useState, useEffect } from 'react'

interface Webhook {
  id: string
  url: string
  events: string[]
  secret: string
  active: boolean
  createdAt: string
}

export function WebhookManager() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [newUrl, setNewUrl] = useState('')

  useEffect(() => {
    fetchWebhooks()
  }, [])

  async function fetchWebhooks() {
    try {
      const res = await fetch('/api/webhooks')
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function createWebhook() {
    if (!newUrl) return
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: newUrl, 
          events: ['generation.completed', 'generation.failed'] 
        })
      })
      if (res.ok) {
        setNewUrl('')
        fetchWebhooks()
      }
    } catch (error) {
      console.error(error)
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm('Delete this webhook?')) return
    try {
      await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
      fetchWebhooks()
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      <h3 className="text-xl font-semibold mb-4">Webhooks</h3>
      
      <div className="flex gap-4 mb-6">
        <input 
          type="url" 
          placeholder="https://your-api.com/webhook" 
          className="flex-1 border rounded-md px-3 py-2"
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
        />
        <button
          onClick={createWebhook}
          disabled={!newUrl}
          className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          Add Endpoint
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p>Loading...</p>
        ) : webhooks.length === 0 ? (
          <p className="text-gray-500">No webhooks configured.</p>
        ) : (
          webhooks.map(wh => (
            <div key={wh.id} className="p-4 border rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-medium">{wh.url}</span>
                <button
                  onClick={() => deleteWebhook(wh.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </div>
              <div className="text-sm text-gray-500 mb-2">
                Events: {wh.events.join(', ')}
              </div>
              <div className="bg-gray-50 p-2 rounded text-xs font-mono break-all">
                Secret: {wh.secret}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
