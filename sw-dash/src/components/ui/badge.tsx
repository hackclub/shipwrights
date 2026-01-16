interface Props {
  name: string
  color: string
  onClick?: () => void
  className?: string
}

export default function Badge({ name, color, onClick, className = '' }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`font-mono text-xs px-2 py-1 rounded transition-all ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} ${className}`}
      style={{ backgroundColor: `#${color}20`, color: `#${color}`, border: `1px solid #${color}` }}
    >
      {name}
    </button>
  )
}
