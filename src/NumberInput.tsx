import { useEffect, useState, type InputHTMLAttributes } from 'react'

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max'> & {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function NumberInput({ value, min, max, onChange, onBlur, onKeyDown, ...props }: NumberInputProps) {
  const [draft, setDraft] = useState(String(value))

  useEffect(() => setDraft(String(value)), [value])

  const commit = () => {
    const parsed = Number(draft)
    const next = draft.trim() && Number.isFinite(parsed) ? clamp(parsed, min, max) : value
    setDraft(String(next))
    if (next !== value) onChange(next)
  }

  return <input
    {...props}
    type="number"
    min={min}
    max={max}
    value={draft}
    onChange={event => {
      const nextDraft = event.target.value
      setDraft(nextDraft)
      if (!nextDraft.trim()) return
      const parsed = Number(nextDraft)
      if (Number.isFinite(parsed)) onChange(clamp(parsed, min, max))
    }}
    onBlur={event => { commit(); onBlur?.(event) }}
    onKeyDown={event => {
      if (event.key === 'Enter') event.currentTarget.blur()
      onKeyDown?.(event)
    }}
  />
}
