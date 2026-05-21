'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import {
  startOfToday,
  endOfToday,
  startOfYesterday,
  endOfYesterday,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from 'date-fns'
import { CalendarIcon, ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateRange {
  from: Date
  to: Date
}

interface Preset {
  label: string
  getRange: () => DateRange
}

const getPresets = (): Preset[] => {
  const today = startOfToday()
  return [
    { label: 'Today', getRange: () => ({ from: startOfToday(), to: endOfToday() }) },
    {
      label: 'Yesterday',
      getRange: () => ({ from: startOfYesterday(), to: endOfYesterday() }),
    },
    {
      label: 'Last 7 Days',
      getRange: () => ({ from: subDays(startOfToday(), 6), to: endOfToday() }),
    },
    {
      label: 'Last 30 Days',
      getRange: () => ({ from: subDays(startOfToday(), 29), to: endOfToday() }),
    },
    {
      label: 'This Month',
      getRange: () => ({ from: startOfMonth(today), to: endOfMonth(today) }),
    },
    {
      label: 'Last Month',
      getRange: () => ({
        from: startOfMonth(subMonths(today, 1)),
        to: endOfMonth(subMonths(today, 1)),
      }),
    },
    { label: 'Custom Range', getRange: () => ({ from: subDays(startOfToday(), 29), to: endOfToday() }) },
  ]
}

interface DateRangePickerProps {
  value?: DateRange | undefined
  onRangeChange: (range: DateRange) => void
}

export function DateRangePicker({ value, onRangeChange }: DateRangePickerProps) {
  const defaultRange = { from: subDays(startOfToday(), 29), to: endOfToday() }
  const [range, setRange] = useState<DateRange>(value ?? defaultRange)
  const [open, setOpen] = useState(false)
  const [activePreset, setActivePreset] = useState('Last 30 Days')
  const [customFrom, setCustomFrom] = useState(format(range.from, 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = useState(format(range.to, 'yyyy-MM-dd'))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      setRange(value)
      setCustomFrom(format(value.from, 'yyyy-MM-dd'))
      setCustomTo(format(value.to, 'yyyy-MM-dd'))
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectPreset(preset: Preset) {
    if (preset.label === 'Custom Range') {
      setActivePreset('Custom Range')
      return
    }
    const newRange = preset.getRange()
    setRange(newRange)
    setActivePreset(preset.label)
    setCustomFrom(format(newRange.from, 'yyyy-MM-dd'))
    setCustomTo(format(newRange.to, 'yyyy-MM-dd'))
    onRangeChange(newRange)
    setOpen(false)
  }

  function applyCustomRange() {
    if (!customFrom || !customTo) return
    const from = new Date(customFrom + 'T00:00:00')
    const to = new Date(customTo + 'T23:59:59')
    if (from > to) return
    setRange({ from, to })
    setActivePreset('Custom Range')
    onRangeChange({ from, to })
    setOpen(false)
  }

  const presets = getPresets()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-navy hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange/30"
      >
        <CalendarIcon className="size-4 text-text-muted" />
        <span>
          {format(range.from, 'MMM dd, yyyy')} — {format(range.to, 'MMM dd, yyyy')}
        </span>
        <ChevronDownIcon className="size-4 text-text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border border-border bg-white shadow-lg">
          <div className="p-3">
            <p className="mb-2 text-xs font-medium text-text-muted uppercase tracking-wide">
              Preset Ranges
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                    activePreset === preset.label
                      ? 'bg-orange text-white'
                      : 'text-navy hover:bg-background',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {activePreset === 'Custom Range' && (
            <div className="border-t border-border p-3">
              <p className="mb-2 text-xs font-medium text-text-muted uppercase tracking-wide">
                Custom Range
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label className="w-8 text-xs text-text-muted">From</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="flex-1 rounded-md border border-border px-2 py-1 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange/30"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-8 text-xs text-text-muted">To</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="flex-1 rounded-md border border-border px-2 py-1 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-orange/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={applyCustomRange}
                  className="mt-1 rounded-md bg-orange px-3 py-1.5 text-sm font-medium text-white hover:bg-orange/90"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
