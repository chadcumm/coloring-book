'use client'

interface UrlTabProps {
  onUrlChange: (url: string) => void
  selectedUrl: string
}

export default function UrlTab({ onUrlChange, selectedUrl }: UrlTabProps) {
  return (
    <div className="space-y-4 mb-8">
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
          Website URL
        </label>
        <input
          id="url"
          type="url"
          placeholder="https://example.com/coloring-pages"
          value={selectedUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <p className="mt-2 text-sm text-gray-600">
          Enter the URL of a website containing coloring page PDFs. The service will find and download all PDFs from that page.
        </p>
      </div>
    </div>
  )
}
