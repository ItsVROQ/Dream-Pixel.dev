'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import './admin.css'

export default function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const navItems = [
    { href: '/admin', label: 'Dashboard', exact: true },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/generations', label: 'Generations' },
    { href: '/admin/seeds', label: 'Seeds' },
    { href: '/admin/analytics', label: 'Analytics' },
    { href: '/admin/system-health', label: 'System Health' }
  ]

  const isActive = (href: string, exact: boolean = false) => {
    if (exact) {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <h1>Admin Panel</h1>
        <nav>
          <ul className="admin-nav">
            {navItems.map(item => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={isActive(item.href, item.exact) ? 'active' : ''}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="admin-content">
        {children}
      </main>
    </div>
  )
}
