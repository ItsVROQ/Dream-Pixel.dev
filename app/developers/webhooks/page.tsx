import { WebhookManager } from '@/components/developers/WebhookManager'

export default function WebhooksPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-4">Webhooks</h1>
        <p className="text-gray-600">
          Register URL endpoints to be notified when image generations complete or fail.
        </p>
      </div>

      <WebhookManager />
    </div>
  )
}
