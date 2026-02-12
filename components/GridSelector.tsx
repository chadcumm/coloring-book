'use client'

interface GridSelectorProps {
  selectedLayout: string
  onLayoutChange: (layout: string) => void
}

const layouts = [
  { id: '3x2', label: '3 wide × 2 high (6 per page)', description: '3 columns, 2 rows' },
  { id: '2x3', label: '2 wide × 3 high (6 per page)', description: '2 columns, 3 rows' },
  { id: '4x1', label: '4 wide × 1 high (4 per page)', description: '4 columns, 1 row' },
  { id: '2x2', label: '2 wide × 2 high (4 per page)', description: '2 columns, 2 rows' },
]

export default function GridSelector({
  selectedLayout,
  onLayoutChange,
}: GridSelectorProps) {
  return (
    <div className="mb-8">
      <label className="block text-sm font-medium text-gray-700 mb-4">
        Grid Layout
      </label>
      <div className="grid grid-cols-2 gap-3">
        {layouts.map((layout) => (
          <button
            key={layout.id}
            onClick={() => onLayoutChange(layout.id)}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedLayout === layout.id
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <div className="font-medium text-gray-900">{layout.label}</div>
            <div className="text-sm text-gray-600">{layout.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
