// Serverless function to create GitHub issues
// Deploy this to Vercel, Netlify, or Cloudflare Workers
// Set GITHUB_TOKEN environment variable with a personal access token
// Optional: Set ALLOWED_ORIGINS to restrict CORS (comma-separated list of domains)

// Simple rate limiting (in-memory, resets on function restart)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const key = ip;
  const record = rateLimitMap.get(key);

  if (!record || now - record.firstRequest > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { firstRequest: now, count: 1 });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
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

  // CORS headers - restrict to allowed origins if set
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = req.headers.origin;
  const corsOrigin = allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))
    ? origin || '*'
    : 'null';
  
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
    
    // Input validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required and must be a non-empty string' });
    }
    
    if (title.length > 200) {
      return res.status(400).json({ error: 'Title must be less than 200 characters' });
    }
    
    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return res.status(400).json({ error: 'Body is required and must be a non-empty string' });
    }
    
    if (body.length > 50000) {
      return res.status(400).json({ error: 'Body must be less than 50,000 characters' });
    }


    // Get GitHub token from environment
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error('GITHUB_TOKEN not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

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
      console.error('GitHub API error:', errorData);
      return res.status(response.status).json({ 
        error: 'Failed to create issue',
        details: errorData
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

