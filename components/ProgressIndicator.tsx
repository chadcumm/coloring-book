'use client'

import { useState, useEffect } from 'react'

const messages = [
  'Processing your files...',
  'Converting PDFs to images...',
  'Creating grid layout...',
  'Generating PDF...',
  'Almost done...',
]

export default function ProgressIndicator() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 border-r-indigo-600 animate-spin"></div>
      </div>
      <p className="text-gray-600 font-medium">{messages[messageIndex]}</p>
    </div>
  )
}
