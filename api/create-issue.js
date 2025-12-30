// Serverless function to create GitHub issues
// Deploy this to Vercel, Netlify, or Cloudflare Workers
// REQUIRED: Set GITHUB_TOKEN environment variable with a personal access token
// REQUIRED: Set ALLOWED_ORIGINS to restrict CORS (comma-separated list of domains)
//   Example: ALLOWED_ORIGINS=https://nowassist.app,https://complanboy2.github.io

// Rate limiting (in-memory, resets on function restart)
// More aggressive limits to prevent abuse
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 3; // 3 requests per minute per IP (reduced from 5)
const RATE_LIMIT_DAILY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_DAILY_MAX = 20; // 20 requests per day per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip;
  const record = rateLimitMap.get(key);

  if (!record) {
    rateLimitMap.set(key, { 
      firstRequest: now, 
      count: 1,
      dailyFirstRequest: now,
      dailyCount: 1
    });
    return true;
  }

  // Check daily limit
  if (now - record.dailyFirstRequest > RATE_LIMIT_DAILY_WINDOW) {
    record.dailyFirstRequest = now;
    record.dailyCount = 1;
  } else if (record.dailyCount >= RATE_LIMIT_DAILY_MAX) {
    return false; // Daily limit exceeded
  }

  // Check per-minute limit
  if (now - record.firstRequest > RATE_LIMIT_WINDOW) {
    record.firstRequest = now;
    record.count = 1;
  } else if (record.count >= RATE_LIMIT_MAX) {
    return false; // Per-minute limit exceeded
  }

  record.count++;
  record.dailyCount++;
  return true;
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.connection?.remoteAddress || 
         'unknown';
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers - STRICTLY restrict to allowed origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
  
  if (allowedOrigins.length === 0) {
    console.error('ALLOWED_ORIGINS not configured - rejecting request for security');
    return res.status(403).json({ error: 'Server configuration error' });
  }

  const origin = req.headers.origin;
  const isAllowed = origin && allowedOrigins.includes(origin);
  
  if (!isAllowed && req.method !== 'OPTIONS') {
    console.warn(`Blocked request from unauthorized origin: ${origin}`);
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  const corsOrigin = isAllowed ? origin : allowedOrigins[0];
  
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  if (!checkRateLimit(clientIP)) {
    return res.status(429).json({ 
      error: 'Too many requests. Please wait a moment before trying again.' 
    });
  }

  try {
    const { title, body, labels, issueType } = req.body;
    
    // Strict input validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
    }
    
    if (title.length > 200) {
      return res.status(400).json({ error: 'Title must be less than 200 characters' });
    }
    
    // Check for suspicious patterns (potential spam/abuse)
    const suspiciousPatterns = [
      /(.)\1{10,}/, // Repeated characters (e.g., "aaaaaaaaaaa")
      /.{500,}/, // Very long single words
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(title))) {
      console.warn(`Suspicious title pattern detected from IP: ${clientIP}`);
      return res.status(400).json({ error: 'Invalid title format' });
    }
    
    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return res.status(400).json({ error: 'Body is required and must be a non-empty string' });
    }
    
    if (body.length > 10000) { // Reduced from 50k to prevent abuse
      return res.status(400).json({ error: 'Body must be less than 10,000 characters' });
    }
    
    if (body.length < 10) {
      return res.status(400).json({ error: 'Body must be at least 10 characters' });
    }
    
    // Additional spam detection
    const bodyLines = body.split('\n').length;
    if (bodyLines > 500) {
      return res.status(400).json({ error: 'Body contains too many lines' });
    }


    // Get GitHub token from environment
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error('GITHUB_TOKEN not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    // Log request for monitoring (without sensitive data)
    console.log(`Creating issue: "${title.substring(0, 50)}..." from IP: ${clientIP}`);

    // Determine label
    const label = issueType === 'bug' ? 'bug' : issueType === 'feature' ? 'enhancement' : 'question';

    // Create issue via GitHub API
    const response = await fetch('https://api.github.com/repos/complanboy2/nowassist/issues', {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'NowAssist-Support-Form'
      },
      body: JSON.stringify({
        title,
        body,
        labels: [label]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`GitHub API error (${response.status}):`, errorData.substring(0, 200));
      
      // Don't expose GitHub API errors to client (security)
      if (response.status === 403 || response.status === 401) {
        return res.status(500).json({ 
          error: 'Authentication error. Please contact support.' 
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to create issue. Please try again later.' 
      });
    }

    const issue = await response.json();

    return res.status(200).json({
      success: true,
      issue: {
        number: issue.number,
        url: issue.html_url,
        title: issue.title
      }
    });

  } catch (error) {
    console.error('Error creating issue:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

