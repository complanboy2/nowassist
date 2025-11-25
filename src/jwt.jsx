import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'

function JwtDecoder() {
  const [token, setToken] = useState('')
  const [decoded, setDecoded] = useState(null)
  const [status, setStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('header')

  const base64UrlDecode = (str) => {
    str = str.replace(/-/g, '+').replace(/_/g, '/')
    const pad = str.length % 4
    if (pad) str += '='.repeat(4 - pad)
    return decodeURIComponent(escape(atob(str)))
  }

  const parseJWT = (token) => {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid JWT')
    
    return {
      header: JSON.parse(base64UrlDecode(parts[0])),
      payload: JSON.parse(base64UrlDecode(parts[1])),
      signature: parts[2]
    }
  }

  const checkStatus = (payload) => {
    const now = Math.floor(Date.now() / 1000)
    
    if (!payload.exp) {
      return { type: 'warning', message: 'No expiration time set' }
    }
    
    if (payload.exp < now) {
      const days = Math.floor((now - payload.exp) / 86400)
      return { type: 'error', message: `Expired ${days > 0 ? days + ' days ago' : 'recently'}` }
    }
    
    const timeLeft = payload.exp - now
    if (timeLeft < 3600) {
      const mins = Math.floor(timeLeft / 60)
      return { type: 'warning', message: `Expires in ${mins} minutes` }
    }
    
    const hours = Math.floor(timeLeft / 3600)
    return { type: 'success', message: `Valid • Expires in ${hours} hours` }
  }

  useEffect(() => {
    if (!token.trim()) {
      setDecoded(null)
      setStatus(null)
      return
    }

    try {
      const parsed = parseJWT(token)
      setDecoded(parsed)
      setStatus(checkStatus(parsed.payload))
    } catch (e) {
      setDecoded(null)
      setStatus({ type: 'error', message: 'Invalid JWT format' })
    }
  }, [token])

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  const statusColors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  }

  const statusDot = {
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">JWT Decoder</h1>
          <p className="text-gray-600">Decode and validate JSON Web Tokens</p>
        </div>

        {/* Input */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">JWT Token</label>
            <button
              onClick={() => setToken('')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your JWT token here..."
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm"
          />
        </div>

        {/* Status */}
        {status && (
          <div className={`px-6 py-4 rounded-xl border mb-6 ${statusColors[status.type]}`}>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${statusDot[status.type]}`} />
              <span className="font-medium">{status.message}</span>
            </div>
          </div>
        )}

        {/* Output */}
        {decoded && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex px-6">
                {['header', 'payload', 'signature'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-4 text-sm font-medium transition-colors capitalize ${
                      activeTab === tab
                        ? 'text-gray-900 border-b-2 border-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === 'header' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Header</h3>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(decoded.header, null, 2))}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border border-gray-200 font-mono">
                    {JSON.stringify(decoded.header, null, 2)}
                  </pre>
                </div>
              )}

              {activeTab === 'payload' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold">Payload</h3>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(decoded.payload, null, 2))}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border border-gray-200 font-mono">
                    {JSON.stringify(decoded.payload, null, 2)}
                  </pre>

                  {/* Key Claims */}
                  {Object.keys(decoded.payload).length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold mb-3">Key Claims</h4>
                      <div className="space-y-2">
                        {['sub', 'name', 'email', 'user_name', 'sys_id', 'iat', 'exp'].map((key) => {
                          if (!decoded.payload[key]) return null
                          let value = decoded.payload[key]
                          if (key === 'iat' || key === 'exp') {
                            value = `${value} (${new Date(value * 1000).toLocaleString()})`
                          }
                          return (
                            <div key={key} className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <span className="text-xs font-semibold text-gray-600 uppercase min-w-[80px]">{key}</span>
                              <span className="text-sm text-gray-800 break-all">{value}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'signature' && (
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold">Signature</h3>
                  </div>
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm border border-gray-200 font-mono break-all">
                    {decoded.signature}
                  </pre>
                  <p className="text-sm text-gray-600 mt-4">
                    Signature verification requires the secret key
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<JwtDecoder />)