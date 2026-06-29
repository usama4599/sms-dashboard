export default function CreditBadge({ credits, size = 'md' }) {
  const isLow = credits < 5
  const isEmpty = credits <= 0

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  }

  const colorClasses = isEmpty
    ? 'bg-danger/10 text-danger border-danger/30'
    : isLow
    ? 'bg-warning/10 text-warning border-warning/30'
    : 'bg-success/10 text-success border-success/30'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${sizeClasses[size]} ${colorClasses}`}
    >
      <svg
        className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {credits} {credits === 1 ? 'credit' : 'credits'}
    </span>
  )
}
