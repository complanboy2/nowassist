// Netlify serverless function to create GitHub issues
// REQUIRED: Set GITHUB_TOKEN in Netlify environment variables
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
  const record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, { 
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

function getClientIP(event) {
  return event.headers['x-forwarded-for']?.split(',')[0] || 
         event.headers['x-real-ip'] || 
         event.requestContext?.identity?.sourceIp || 
         'unknown';
}

exports.handler = async (event, context) => {
  // CORS headers - STRICTLY restrict to allowed origins
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
  
  if (allowedOrigins.length === 0) {
    console.error('ALLOWED_ORIGINS not configured - rejecting request for security');
    return {
      statusCode: 403,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }

  const origin = event.headers.origin;
  const isAllowed = origin && allowedOrigins.includes(origin);
  
  if (!isAllowed && event.httpMethod !== 'OPTIONS') {
    console.warn(`Blocked request from unauthorized origin: ${origin}`);
    return {
      statusCode: 403,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Origin not allowed' })
    };
  }

  const corsOrigin = isAllowed ? origin : allowedOrigins[0];
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Credentials': 'false'
      },
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Credentials': 'false'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Rate limiting
  const clientIP = getClientIP(event);
  if (!checkRateLimit(clientIP)) {
    return {
      statusCode: 429,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Credentials': 'false'
      },
      body: JSON.stringify({ 
        error: 'Too many requests. Please wait a moment before trying again.' 
      })
    };
  }

  try {
    const { title, body, labels, issueType } = JSON.parse(event.body);

    // Input validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin
        },
        body: JSON.stringify({ error: 'Title is required and must be a non-empty string' })
      };
    }
    
    if (title.length > 200) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin
        },
        body: JSON.stringify({ error: 'Title must be less than 200 characters' })
      };
    }
    
    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin
        },
        body: JSON.stringify({ error: 'Body is required and must be a non-empty string' })
      };
    }
    
    if (body.length > 50000) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin
        },
        body: JSON.stringify({ error: 'Body must be less than 50,000 characters' })
      };
    }

    // Get GitHub token from environment
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      console.error('GITHUB_TOKEN not configured');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Server configuration error' })
      };
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
      console.error(`GitHub API error (${response.status}):`, errorData.substring(0, 200));
      
      // Don't expose GitHub API errors to client (security)
      if (response.status === 403 || response.status === 401) {
        return {
          statusCode: 500,
          headers: {
            'Access-Control-Allow-Origin': corsOrigin
          },
          body: JSON.stringify({ 
            error: 'Authentication error. Please contact support.' 
          })
        };
      }
      
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin
        },
        body: JSON.stringify({ 
          error: 'Failed to create issue. Please try again later.' 
        })
      };
    }

    const issue = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        issue: {
          number: issue.number,
          url: issue.html_url,
          title: issue.title
        }
      })
    };

  } catch (error) {
    console.error('Error creating issue:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

