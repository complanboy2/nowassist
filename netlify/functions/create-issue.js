// Netlify serverless function to create GitHub issues
// Set GITHUB_TOKEN in Netlify environment variables
// Optional: Set ALLOWED_ORIGINS to restrict CORS (comma-separated list of domains)

// Simple rate limiting (in-memory, resets on function restart)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 requests per minute per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.firstRequest > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { firstRequest: now, count: 1 });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

function getClientIP(event) {
  return event.headers['x-forwarded-for']?.split(',')[0] || 
         event.headers['x-real-ip'] || 
         event.requestContext?.identity?.sourceIp || 
         'unknown';
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
  const origin = event.headers.origin;
  const corsOrigin = allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))
    ? origin || '*'
    : 'null';
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin
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
        'Access-Control-Allow-Origin': corsOrigin
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
      console.error('GitHub API error:', errorData);
      return {
        statusCode: response.status,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Failed to create issue',
          details: errorData
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

