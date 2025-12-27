import React from 'react';
import ReactDOM from 'react-dom/client';
import { ShieldCheck, FileKey2, ServerCog, FileJson } from 'lucide-react';
import './styles.css';

const tools = [
  {
    id: 'jwt',
    name: 'JWT Decoder',
    description: 'Decode, verify, and analyze JWT tokens with security insights.',
    href: 'jwt.html',
    status: 'Ready',
    icon: ShieldCheck,
    accent: 'from-success/10 to-success/5',
  },
  {
    id: 'saml',
    name: 'SAML Inspector',
    description: 'Decode assertions, validate certificates, and inspect SAML messages.',
    href: 'saml.html',
    status: 'Ready',
    icon: FileKey2,
    accent: 'from-success/10 to-success/5',
  },
  {
    id: 'rest',
    name: 'REST API Tester',
    description: 'Test REST APIs with custom headers, authentication, and request bodies.',
    href: 'rest.html',
    status: 'Ready',
    icon: ServerCog,
    accent: 'from-success/10 to-success/5',
  },
  {
    id: 'json',
    name: 'JSON Utility',
    description: 'Format, validate, transform, and analyze JSON data.',
    href: 'json-utility.html',
    status: 'Ready',
    icon: FileJson,
    accent: 'from-success/10 to-success/5',
  },
];

const getInternalUrl = (path) => {
  if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  return `/${path}`;
};

const openTool = (path) => {
  const url = getInternalUrl(path);
  window.open(url, '_blank', 'noopener');
};

const StatusBadge = ({ status }) => {
  const map = {
    Ready: 'bg-success/10 text-success',
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${map[status] || map.Ready}`}>
      {status}
    </span>
  );
};

const Popup = () => (
  <div className="w-[320px] bg-white">
    <div className="p-4 space-y-4">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-primary/60">NowAssist</p>
        <h1 className="text-xl font-semibold text-primary">Developer Toolkit</h1>
        <p className="text-sm text-primary/70">
          Power tools for ServiceNow engineers. Pick a utility to launch a full screen workspace.
        </p>
      </header>

      <div className="space-y-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => openTool(tool.href)}
              className="w-full rounded-xl border border-slate-200 bg-gradient-to-br from-white to-muted p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/40"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`rounded-lg bg-gradient-to-br ${tool.accent} p-2 text-primary shadow-inner`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-primary">{tool.name}</p>
                    <StatusBadge status={tool.status} />
                  </div>
                  <p className="text-sm text-primary/70">{tool.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <footer className="rounded-lg bg-muted px-3 py-2 text-xs text-primary/60">
        <p className="font-medium text-primary">NowAssist</p>
        <p>Professional developer utilities. Everything happens in your browser.</p>
      </footer>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')).render(<Popup />);


