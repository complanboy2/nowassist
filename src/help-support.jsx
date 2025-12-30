import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { HelpCircle, Mail, User, FileText, Send, AlertCircle, CheckCircle2, X } from 'lucide-react';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import './styles.css';

const HelpSupport = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    issueType: 'bug',
    subject: '',
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    browser: '',
    os: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const issueTypes = [
    { value: 'bug', label: 'Bug Report', description: 'Something is not working as expected' },
    { value: 'feature', label: 'Feature Request', description: 'Suggest a new feature or improvement' },
    { value: 'question', label: 'Question', description: 'Ask a question or need help' },
    { value: 'other', label: 'Other', description: 'Something else' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const formatIssueBody = () => {
    let body = `## Issue Details\n\n`;
    body += `**Type:** ${issueTypes.find(t => t.value === formData.issueType)?.label}\n\n`;
    
    if (formData.description) {
      body += `**Description:**\n${formData.description}\n\n`;
    }
    
    if (formData.stepsToReproduce) {
      body += `**Steps to Reproduce:**\n${formData.stepsToReproduce}\n\n`;
    }
    
    if (formData.expectedBehavior) {
      body += `**Expected Behavior:**\n${formData.expectedBehavior}\n\n`;
    }
    
    if (formData.actualBehavior) {
      body += `**Actual Behavior:**\n${formData.actualBehavior}\n\n`;
    }
    
    body += `---\n\n`;
    body += `**Submitted by:** ${formData.name || 'Anonymous'}\n`;
    body += `**Email:** ${formData.email || 'Not provided'}\n`;
    
    if (formData.browser || formData.os) {
      body += `\n**Environment:**\n`;
      if (formData.browser) body += `- Browser: ${formData.browser}\n`;
      if (formData.os) body += `- OS: ${formData.os}\n`;
    }
    
    return body;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!formData.subject.trim()) {
      setError('Please provide a subject');
      return;
    }
    
    if (!formData.description.trim()) {
      setError('Please provide a description');
      return;
    }

    setSubmitting(true);

    try {
      // Format the issue body
      const issueBody = formatIssueBody();

      // API endpoint for creating issues (serverless function)
      // Set this to your deployed serverless function URL, or leave empty to use URL method
      const API_ENDPOINT = import.meta.env.VITE_GITHUB_ISSUE_API || 'https://your-serverless-function.vercel.app/api/create-issue';
      
      // Try to use API endpoint if configured (not the default placeholder)
      if (API_ENDPOINT && !API_ENDPOINT.includes('your-serverless-function')) {
        try {
          const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: formData.subject,
              body: issueBody,
              issueType: formData.issueType,
            }),
          });

          const result = await response.json();

          if (response.ok && result.success) {
            // Success! Issue created
            setSubmitted(true);
            setSubmitting(false);
            
            // Show success with link to issue
            setTimeout(() => {
              window.open(result.issue.url, '_blank');
            }, 500);
            
            // Reset form after 3 seconds
            setTimeout(() => {
              setFormData({
                name: '',
                email: '',
                issueType: 'bug',
                subject: '',
                description: '',
                stepsToReproduce: '',
                expectedBehavior: '',
                actualBehavior: '',
                browser: '',
                os: '',
              });
              setSubmitted(false);
            }, 3000);
            return;
          } else {
            // API error, fall through to URL method
            console.warn('API error, falling back to URL method:', result.error);
          }
        } catch (apiError) {
          // API failed, fall through to URL method
          console.warn('API request failed, falling back to URL method:', apiError);
        }
      }

      // Fallback: Use URL method (opens GitHub issue creation page)
      const repo = 'complanboy2/nowassist';
      const title = encodeURIComponent(formData.subject);
      
      // Truncate body if too long (keep it under 1500 chars after encoding to be safe)
      let body = issueBody;
      const maxBodyLength = 1500;
      if (body.length > maxBodyLength) {
        body = body.substring(0, maxBodyLength) + '\n\n... (content truncated due to length - please add remaining details manually)';
      }
      
      const encodedBody = encodeURIComponent(body);
      const labels = encodeURIComponent(formData.issueType === 'bug' ? 'bug' : formData.issueType === 'feature' ? 'enhancement' : 'question');
      
      // Open GitHub issue creation page
      const githubUrl = `https://github.com/${repo}/issues/new?title=${title}&body=${encodedBody}&labels=${labels}`;
      
      // Try to open the URL
      const newWindow = window.open(githubUrl, '_blank');
      
      // Check if popup was blocked or failed
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Fallback: copy URL to clipboard and show instructions
        try {
          await navigator.clipboard.writeText(githubUrl);
          setError('Popup was blocked. The issue URL has been copied to your clipboard. Please paste it in a new browser tab.');
        } catch (clipboardErr) {
          // If clipboard fails, show the URL directly
          setError(`Popup was blocked. Please copy this URL and open it manually:\n\n${githubUrl}`);
        }
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setSubmitting(false);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          name: '',
          email: '',
          issueType: 'bug',
          subject: '',
          description: '',
          stepsToReproduce: '',
          expectedBehavior: '',
          actualBehavior: '',
          browser: '',
          os: '',
        });
        setSubmitted(false);
      }, 3000);

    } catch (err) {
      setError('Failed to submit issue. Please try again.');
      setSubmitting(false);
      console.error('Error submitting issue:', err);
    }
  };

  const isRouterMode = typeof window !== 'undefined' && window.__ROUTER_MODE__;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex flex-col" style={{ width: '100%', minWidth: 0 }}>
      <div className="flex-1 flex flex-col">
        <div className="mx-auto max-w-4xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <div className="space-y-6">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm px-6 py-6">
              <div className="flex items-center gap-3 mb-2">
                <HelpCircle className="h-8 w-8 text-gray-900 dark:text-white" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Help & Support</h1>
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Found a bug, have a question, or want to suggest a feature? We're here to help!
              </p>
            </header>

            {/* Success Message */}
            {submitted && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">Issue Created Successfully!</h3>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Your issue has been created on GitHub. A new tab will open shortly to view it.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm p-6 space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Your Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Issue Type */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Issue Type
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {issueTypes.map((type) => (
                    <label
                      key={type.value}
                      className={`relative flex items-start p-4 rounded-lg border-2 cursor-pointer transition ${
                        formData.issueType === type.value
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="issueType"
                        value={type.value}
                        checked={formData.issueType === type.value}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">{type.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{type.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Issue Details */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Issue Details
                </h2>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500"
                    placeholder="Brief summary of your issue"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={5}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500 resize-none"
                    placeholder="Describe your issue, question, or feature request in detail..."
                  />
                </div>
              </div>

              {/* Bug Report Specific Fields */}
              {formData.issueType === 'bug' && (
                <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Bug Report Details</h3>
                  <div>
                    <label htmlFor="stepsToReproduce" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Steps to Reproduce <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      id="stepsToReproduce"
                      name="stepsToReproduce"
                      value={formData.stepsToReproduce}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500 resize-none"
                      placeholder="1. Go to...\n2. Click on...\n3. See error..."
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="expectedBehavior" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Expected Behavior <span className="text-gray-400">(optional)</span>
                      </label>
                      <textarea
                        id="expectedBehavior"
                        name="expectedBehavior"
                        value={formData.expectedBehavior}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500 resize-none"
                        placeholder="What should happen?"
                      />
                    </div>
                    <div>
                      <label htmlFor="actualBehavior" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Actual Behavior <span className="text-gray-400">(optional)</span>
                      </label>
                      <textarea
                        id="actualBehavior"
                        name="actualBehavior"
                        value={formData.actualBehavior}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500 resize-none"
                        placeholder="What actually happens?"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Environment Information */}
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Environment <span className="text-gray-400 text-sm font-normal">(optional)</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="browser" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Browser
                    </label>
                    <input
                      type="text"
                      id="browser"
                      name="browser"
                      value={formData.browser}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500"
                      placeholder="e.g., Chrome 120, Firefox 121"
                    />
                  </div>
                  <div>
                    <label htmlFor="os" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Operating System
                    </label>
                    <input
                      type="text"
                      id="os"
                      name="os"
                      value={formData.os}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-sky-400 dark:focus:border-sky-500"
                      placeholder="e.g., Windows 11, macOS 14, Linux"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={submitting || submitted}
                  className="flex items-center gap-2 px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Preparing Issue...</span>
                    </>
                  ) : submitted ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Issue Prepared!</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Create GitHub Issue</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Help Text */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">How it works</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                    When you submit this form, a new GitHub issue will be opened in a new tab with all your information pre-filled. 
                    You can review and edit it before clicking "Submit new issue" on GitHub. This helps us track and respond to your requests efficiently.
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    <strong>Tip:</strong> You can attach screenshots, files, or other attachments directly in the GitHub issue interface by dragging and dropping them into the comment box after the issue is created.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default HelpSupport;

// Render directly if running as standalone (extension mode)
if (typeof window !== 'undefined' && document.getElementById('root') && !window.__ROUTER_MODE__) {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<HelpSupport />);
}

