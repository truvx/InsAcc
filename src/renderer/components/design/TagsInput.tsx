import React, { useState } from 'react'

interface TagsInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  label?: string
  placeholder?: string
}

export function TagsInput({ tags, onChange, label, placeholder }: TagsInputProps) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  const addTag = () => {
    const trimmed = inputValue.trim().replace(/,/g, '')
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInputValue('')
  }

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove))
  }

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div 
        className="tags-input-container" 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-primary)',
          alignItems: 'center'
        }}
        onClick={() => document.getElementById('tags-input-field')?.focus()}
      >
        {tags.map((tag, index) => (
          <span 
            key={index} 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary-text)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(index); }}
              style={{
                background: 'none',
                border: 'none',
                color: 'currentColor',
                cursor: 'pointer',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          id="tags-input-field"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? (placeholder || 'Type and press Enter') : ''}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            minWidth: '120px',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            fontSize: '14px'
          }}
        />
      </div>
    </div>
  )
}
