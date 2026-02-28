import { useAuth } from '../hooks/useAuth'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function HomeView() {
  const { user } = useAuth()
  const name = user?.email?.split('@')[0] ?? ''

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[840px] mx-auto" style={{ padding: '40px 48px' }}>
        <h1 className="font-display text-[26px] font-extrabold tracking-tight text-text-primary mb-2">
          {getGreeting()}, {name}
        </h1>
        <p className="font-body text-[13px] text-text-secondary leading-relaxed">
          Activity feed and intelligence briefings — coming in the next update.
        </p>
      </div>
    </div>
  )
}
