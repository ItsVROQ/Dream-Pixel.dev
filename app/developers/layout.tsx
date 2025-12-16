import Link from 'next/link'

export default function DevelopersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-50 border-r border-gray-200 p-6 hidden md:block">
        <h2 className="text-xl font-bold mb-6">Developer Portal</h2>
        <nav className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Documentation</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/developers/docs/getting-started" className="text-gray-600 hover:text-gray-900">
                  Getting Started
                </Link>
              </li>
              <li>
                <Link href="/developers/docs/authentication" className="text-gray-600 hover:text-gray-900">
                  Authentication
                </Link>
              </li>
              <li>
                <Link href="/developers/docs/rate-limits" className="text-gray-600 hover:text-gray-900">
                  Rate Limits & Quotas
                </Link>
              </li>
              <li>
                <Link href="/developers/docs/errors" className="text-gray-600 hover:text-gray-900">
                  Error Codes
                </Link>
              </li>
              <li>
                <Link href="/developers/docs/sdks" className="text-gray-600 hover:text-gray-900">
                  SDKs
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">API Reference</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/developers/api-reference" className="text-gray-600 hover:text-gray-900">
                  API Reference (Swagger)
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Tools</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/developers/dashboard" className="text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/developers/playground" className="text-gray-600 hover:text-gray-900">
                  API Playground
                </Link>
              </li>
              <li>
                <Link href="/developers/webhooks" className="text-gray-600 hover:text-gray-900">
                  Webhooks
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
