'use client'

import { useRef } from 'react'

interface UploadTabProps {
  onFilesSelected: (files: File[]) => void
  selectedFiles: File[]
}

export default function UploadTab({
  onFilesSelected,
  selectedFiles,
}: UploadTabProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('border-indigo-600', 'bg-indigo-50')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('border-indigo-600', 'bg-indigo-50')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('border-indigo-600', 'bg-indigo-50')

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'application/pdf'
    )
    if (files.length > 0) {
      onFilesSelected(files)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      onFilesSelected(files)
    }
  }

  return (
    <div className="space-y-4 mb-8">
      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 cursor-pointer transition-colors hover:border-indigo-600 hover:bg-indigo-50"
      >
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-8-12l-4-4m0 0l-4 4m4-4v12"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="mt-2 text-sm font-medium text-gray-700">
            Drag and drop PDFs here, or click to select
          </p>
          <p className="mt-1 text-xs text-gray-500">
            PDF files only • Max 100MB total
          </p>
        </div>
      </div>

      {/* Hidden Input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            {selectedFiles.length} file(s) selected
          </p>
          <ul className="space-y-2">
            {selectedFiles.map((file, index) => (
              <li key={index} className="text-sm text-gray-600">
                {index + 1}. {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
