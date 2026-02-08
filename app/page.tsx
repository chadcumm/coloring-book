'use client'

import { useState } from 'react'
import UploadTab from '@/components/UploadTab'
import UrlTab from '@/components/UrlTab'
import GridSelector from '@/components/GridSelector'
import ProgressIndicator from '@/components/ProgressIndicator'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedUrl, setSelectedUrl] = useState('')
  const [gridLayout, setGridLayout] = useState('3x2')
  const [isProcessing, setIsProcessing] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleUpload = (files: File[]) => {
    setSelectedFiles(files)
    setErrorMessage(null)
  }

  const handleUrlChange = (url: string) => {
    setSelectedUrl(url)
    setErrorMessage(null)
  }

  const handleProcess = async () => {
    try {
      setIsProcessing(true)
      setErrorMessage(null)
      setDownloadUrl(null)

      const formData = new FormData()
      formData.append('gridLayout', gridLayout)

      if (activeTab === 'upload') {
        if (selectedFiles.length === 0) {
          setErrorMessage('Please select at least one PDF file')
          setIsProcessing(false)
          return
        }
        selectedFiles.forEach((file) => {
          formData.append('files', file)
        })
      } else {
        if (!selectedUrl.trim()) {
          setErrorMessage('Please enter a valid URL')
          setIsProcessing(false)
          return
        }
        formData.append('url', selectedUrl)
      }

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to process files')
      }

      const data = await response.json()
      setDownloadUrl(data.downloadUrl)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'An error occurred'
      )
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Coloring Book Grid Maker
          </h1>
          <p className="text-gray-600">
            Combine coloring pages into a printable grid PDF
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Tab Navigation */}
          <div className="flex gap-4 mb-8 border-b border-gray-200">
            <button
              onClick={() => {
                setActiveTab('upload')
                setErrorMessage(null)
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Upload PDFs
            </button>
            <button
              onClick={() => {
                setActiveTab('url')
                setErrorMessage(null)
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'url'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Download from URL
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'upload' ? (
            <UploadTab
              onFilesSelected={handleUpload}
              selectedFiles={selectedFiles}
            />
          ) : (
            <UrlTab onUrlChange={handleUrlChange} selectedUrl={selectedUrl} />
          )}

          {/* Grid Layout Selector */}
          <GridSelector
            selectedLayout={gridLayout}
            onLayoutChange={setGridLayout}
          />

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Progress Indicator */}
          {isProcessing && (
            <ProgressIndicator />
          )}

          {/* Download Button */}
          {downloadUrl && !isProcessing && (
            <div className="mt-6 flex gap-4">
              <a
                href={downloadUrl}
                download
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
              >
                ✓ Download PDF
              </a>
              <button
                onClick={() => {
                  setDownloadUrl(null)
                  setSelectedFiles([])
                  setSelectedUrl('')
                  setGridLayout('3x2')
                }}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Create Another
              </button>
            </div>
          )}

          {/* Submit Button */}
          {!downloadUrl && !isProcessing && (
            <button
              onClick={handleProcess}
              disabled={
                (activeTab === 'upload' && selectedFiles.length === 0) ||
                (activeTab === 'url' && !selectedUrl.trim())
              }
              className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Create Grid PDF
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
