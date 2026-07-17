import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom'
import Logo from '../components/Logo'

function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  const navItems = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'New Review', path: '/new-review' },
  { name: 'Diff Review', path: '/diff-review' },
  { name: 'Multi-Agent Review', path: '/multi-agent-review' },
  { name: 'RAG Review', path: '/rag-review' },
  { name: 'Standards', path: '/standards' },
  { name: 'GitHub Integration', path: '/github-integration' },
  { name: 'History', path: '/history' },
  { name: 'Analytics', path: '/analytics' },
  { name: 'Profile', path: '/profile' },
]

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <aside
        className="w-64 flex flex-col border-r border-white/10"
        style={{ background: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(20px)' }}
      >
        <div className="px-6 py-6 flex items-center gap-2.5 border-b border-white/10">
          <Logo size={26} />
          <span className="text-[var(--color-text)] font-medium text-sm">AI Code Review</span>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className="block px-4 py-2.5 rounded-full text-sm font-medium transition"
                style={
                  active
                    ? {
                        background: 'linear-gradient(90deg, var(--color-accent-blue), var(--color-accent-purple), var(--color-accent-coral))',
                        color: 'white',
                      }
                    : { color: 'var(--color-text-muted)' }
                }
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent'
                }}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2.5 rounded-full text-sm font-medium text-[var(--color-text-muted)] hover:bg-white/5 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default DashboardLayout