import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'

function Popup() {
  const tools = [
    {
      name: 'JWT Decoder',
      desc: 'Decode and validate tokens',
      icon: '🔐',
      page: 'jwt.html'
    },
    {
      name: 'SAML Inspector',
      desc: 'Decode SAML responses',
      icon: '🔏',
      page: 'saml.html'
    },
    {
      name: 'REST API Tester',
      desc: 'Test API endpoints',
      icon: '📡',
      page: 'rest.html'
    }
  ]

  const openTool = (page) => {
    chrome.tabs.create({ url: chrome.runtime.getURL(page) })
  }

  return (
    <div className="w-80 bg-white">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">NowAssist</h1>
        <p className="text-sm text-gray-600 mt-1">Select a tool to open</p>
      </div>
      
      <div className="p-2">
        {tools.map((tool, i) => (
          <button
            key={i}
            onClick={() => openTool(tool.page)}
            className="w-full flex items-center p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl mr-3">
              {tool.icon}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">{tool.name}</h3>
              <p className="text-xs text-gray-600 mt-0.5">{tool.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Popup />)