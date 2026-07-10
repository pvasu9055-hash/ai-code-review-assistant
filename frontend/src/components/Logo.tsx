function Logo({ size = 48 }: { size?: number }) {
  const colors = ['#4C8DF6', '#7C7DD9', '#9168C0', '#B466A0', '#D96570', '#8B7AE8']

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <g transform="translate(24,24)">
        {colors.map((color, i) => (
          <rect
            key={i}
            x="-3"
            y="-19"
            width="6"
            height="16"
            rx="3"
            fill={color}
            transform={`rotate(${i * 60})`}
          />
        ))}
      </g>
    </svg>
  )
}

export default Logo