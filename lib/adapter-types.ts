export interface Adapter {
  id: string
  domains: string[]
  strategy: 'selector' | 'pattern' | 'javascript'
  selector?: string
  pattern?: string
  confidence: number
  dateAdded: string
  description?: string
}

export interface AdapterStore {
  adapters: Adapter[]
  version: '1.0'
}

export interface DiscoveryResult {
  strategy: 'selector' | 'pattern' | 'javascript'
  pdfUrls: string[]
  confidence: number
  selector?: string
  pattern?: string
}
