import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { HelpCircle, Mail, User, FileText, Send, AlertCircle, CheckCircle2, X, Image, AlertTriangle } from 'lucide-react';
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
    screenshot: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [createdIssue, setCreatedIssue] = useState(null);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('Screenshot size must be less than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      setFormData(prev => ({ ...prev, screenshot: file }));
      setError('');
    }
  };

  const removeScreenshot = () => {
    setFormData(prev => ({ ...prev, screenshot: null }));
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
      // To enable direct POST: Deploy the serverless function and set VITE_GITHUB_ISSUE_API env var
      // See SERVERLESS_SETUP.md for instructions
      const API_ENDPOINT = import.meta.env.VITE_GITHUB_ISSUE_API;
      
      // Try to use API endpoint if configured
      if (API_ENDPOINT && API_ENDPOINT.trim() !== '') {
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
            setCreatedIssue(result.issue);
            setSubmitted(true);
            setSubmitting(false);
            
            // Automatically open the issue in a new tab after a brief delay
            setTimeout(() => {
              window.open(result.issue.url, '_blank');
            }, 500);
            
            // Reset form after 5 seconds (give user time to see success message)
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
                screenshot: null,
              });
              setSubmitted(false);
              setCreatedIssue(null);
            }, 5000);
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
      
      // Calculate URL length - GitHub has practical limit of ~8000 chars for URL
      // We'll use up to 6000 chars for body to be safe (leaves room for title, labels, base URL)
      let body = issueBody;
      const maxBodyLength = 6000; // Increased from 1500 to handle longer content
      const bodyLength = body.length;
      let isTruncated = false;
      
      if (bodyLength > maxBodyLength) {
        // Truncate but keep important parts
        const truncatedBody = body.substring(0, maxBodyLength);
        const truncationNote = `\n\n---\n\n**⚠️ Content Truncated:** Your submission was ${bodyLength} characters. The first ${maxBodyLength} characters are pre-filled below. Please add the remaining content manually in the GitHub issue editor.\n\n**Remaining content to add:**\n\`\`\`\n${body.substring(maxBodyLength)}\n\`\`\``;
        body = truncatedBody + truncationNote;
        isTruncated = true;
      }
      
      // Add screenshot note if provided
      if (formData.screenshot) {
        body += `\n\n---\n\n**📷 Screenshot:** A screenshot was prepared. Please attach it manually in the GitHub issue editor by dragging and dropping the image file into the comment box.`;
      }
      
      const encodedBody = encodeURIComponent(body);
      const labels = encodeURIComponent(formData.issueType === 'bug' ? 'bug' : formData.issueType === 'feature' ? 'enhancement' : 'question');
      
      // Check total URL length
      const githubUrl = `https://github.com/${repo}/issues/new?title=${title}&body=${encodedBody}&labels=${labels}`;
      
      // Re-encode to check final URL length
      const testUrl = `https://github.com/${repo}/issues/new?title=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(body)}&labels=${labels}`;
      
      if (testUrl.length > 8000) {
        // If still too long, truncate more aggressively
        const safeBodyLength = 4000;
        body = issueBody.substring(0, safeBodyLength) + `\n\n---\n\n**⚠️ Large Content Detected:** Your submission is very long (${bodyLength} characters). Only the first ${safeBodyLength} characters are pre-filled. Please copy the remaining content from your form and paste it into the GitHub issue editor.`;
        isTruncated = true;
      }
      
      // Final URL
      const finalUrl = `https://github.com/${repo}/issues/new?title=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(body)}&labels=${labels}`;
      
      // Show warning if content was truncated
      if (isTruncated) {
        setError(`Your content is very long (${bodyLength} characters). The GitHub issue will open with the first portion pre-filled. Please add the remaining content manually in the GitHub issue editor.`);
        // Still proceed, but user knows to add more
      }
      
      // Try to open the URL
      const newWindow = window.open(finalUrl, '_blank');
      
      // Check if popup was blocked or failed
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Fallback: copy URL to clipboard and show instructions
        try {
          await navigator.clipboard.writeText(finalUrl);
          setError('Popup was blocked. The issue URL has been copied to your clipboard. Please paste it in a new browser tab.');
        } catch (clipboardErr) {
          // If clipboard fails, show the URL directly
          setError(`Popup was blocked. Please copy this URL and open it manually:\n\n${finalUrl}`);
        }
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setSubmitting(false);
      
      // Reset form after 5 seconds (give time to see message)
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
          screenshot: null,
        });
        setSubmitted(false);
        setError('');
      }, 5000);

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
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">
                      {createdIssue ? 'Issue Created Successfully!' : 'Issue Prepared Successfully!'}
                    </h3>
                    {createdIssue ? (
                      <div className="space-y-2">
                        <p className="text-sm text-green-700 dark:text-green-400">
                          Your issue #{createdIssue.number} has been created on GitHub. A new tab has opened to view it.
                        </p>
                        <a
                          href={createdIssue.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 underline"
                        >
                          View Issue #{createdIssue.number} on GitHub
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-green-700 dark:text-green-400">
                        A new tab has opened with your issue ready to submit. Please review and click "Submit new issue" on GitHub.
                      </p>
                    )}
                  </div>
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

              {/* Screenshot Upload */}
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div>
                  <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Image className="inline h-4 w-4 mr-1" />
                    Screenshot <span className="text-gray-400 text-sm font-normal">(optional)</span>
                  </label>
                  <div className="space-y-2">
                    {formData.screenshot ? (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <Image className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {formData.screenshot.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(formData.screenshot.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={removeScreenshot}
                          className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
                          aria-label="Remove screenshot"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="screenshot"
                        className="flex flex-col items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-sky-400 dark:hover:border-sky-500 transition bg-gray-50 dark:bg-gray-700/30"
                      >
                        <Image className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-sky-600 dark:text-sky-400">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                      </label>
                    )}
                    <input
                      type="file"
                      id="screenshot"
                      name="screenshot"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex gap-2">
                      <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-blue-800 dark:text-blue-300">
                        <p className="font-medium mb-1">📎 How to attach your screenshot:</p>
                        <ol className="list-decimal list-inside space-y-0.5 ml-1">
                          <li>Fill out the form and click "Create GitHub Issue"</li>
                          <li>When the GitHub issue page opens, you'll see your issue details pre-filled</li>
                          <li>In the GitHub issue editor, drag and drop your screenshot file into the comment box, or click the attachment icon</li>
                          <li>Your screenshot will be uploaded and attached to the issue</li>
                        </ol>
                      </div>
                    </div>
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

