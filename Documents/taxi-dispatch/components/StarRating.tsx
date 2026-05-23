'use client'

import { useState } from 'react'

interface StarRatingProps {
  value: number        // 1-5, 0 = unset
  onChange?: (v: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const SIZE: Record<NonNullable<StarRatingProps['size']>, string> = {
  sm:  'text-base gap-0.5',
  md:  'text-2xl gap-1',
  lg:  'text-3xl gap-1.5',
}

export function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)

  const active = hovered || value

  return (
    <div
      className={`inline-flex ${SIZE[size]}`}
      onMouseLeave={() => !readonly && setHovered(0)}
      role={readonly ? undefined : 'radiogroup'}
      aria-label="Star rating"
    >
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          aria-label={`${star} star`}
          className={`leading-none transition-transform ${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } ${star <= active ? 'text-taxi-yellow' : 'text-taxi-border'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
