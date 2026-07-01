import React from 'react'

interface Props {
  options: string[]
  value: string
  onChange: (value: string) => void
}

export default function SegmentedControl({ options, value, onChange }: Props) {
  return (
    <div className="segmented-control" role="radiogroup">
      {options.map(option => (
        <button
          key={option}
          role="radio"
          aria-checked={value === option}
          className={`segmented-control-btn${value === option ? ' active' : ''}`}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
