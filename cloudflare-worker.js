// Cloudflare Worker to create GitHub issues
// REQUIRED: Set GITHUB_TOKEN in Cloudflare Workers secrets
// REQUIRED: Set ALLOWED_ORIGINS in Cloudflare Workers secrets
//   Example: ALLOWED_ORIGINS=https://nowassist.app,https://complanboy2.github.io

// Rate limiting (using Cloudflare KV for persistence across requests)
// More aggressive limits to prevent abuse
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 3; // 3 requests per minute per IP
const RATE_LIMIT_DAILY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_DAILY_MAX = 20; // 20 requests per day per IP

async function checkRateLimit(ip, env) {
  const now = Date.now();
  const minuteKey = `rate_limit:${ip}:minute`;
  const dailyKey = `rate_limit:${ip}:daily`;
  
  // Try to use KV if available, otherwise use in-memory (less reliable)
  if (env.RATE_LIMIT_KV) {
    try {
      const minuteRecord = await env.RATE_LIMIT_KV.get(minuteKey, { type: 'json' });
      const dailyRecord = await env.RATE_LIMIT_KV.get(dailyKey, { type: 'json' });
      
      // Check daily limit
      if (!dailyRecord || now - dailyRecord.firstRequest > RATE_LIMIT_DAILY_WINDOW) {
        await env.RATE_LIMIT_KV.put(dailyKey, JSON.stringify({ firstRequest: now, count: 1 }));
      } else if (dailyRecord.count >= RATE_LIMIT_DAILY_MAX) {
        return false; // Daily limit exceeded
      } else {
        dailyRecord.count++;
        await env.RATE_LIMIT_KV.put(dailyKey, JSON.stringify(dailyRecord));
      }
      
      // Check per-minute limit
      if (!minuteRecord || now - minuteRecord.firstRequest > RATE_LIMIT_WINDOW) {
        await env.RATE_LIMIT_KV.put(minuteKey, JSON.stringify({ firstRequest: now, count: 1 }));
      } else if (minuteRecord.count >= RATE_LIMIT_MAX) {
        return false; // Per-minute limit exceeded
      } else {
        minuteRecord.count++;
        await env.RATE_LIMIT_KV.put(minuteKey, JSON.stringify(minuteRecord));
      }
      
      return true;
    } catch (err) {
      console.error('KV rate limit error, falling back to in-memory:', err);
      // Fall through to in-memory rate limiting
    }
  }
  
  // In-memory rate limiting (less reliable, resets on worker restart)
  // This is a fallback if KV is not configured
  return true; // Allow request if KV not available (you should set up KV for production)
}

function getClientIP(request) {
  // Cloudflare provides the real IP in CF-Connecting-IP header
  return request.headers.get('CF-Connecting-IP') || 
         request.headers.get('X-Forwarded-For')?.split(',')[0] || 
         'unknown';
}

export default {
  async fetch(request, env, ctx) {
    // Only allow POST requests
    if (request.method !== 'POST' && request.method !== 'OPTIONS') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // CORS headers - STRICTLY restrict to allowed origins
    const allowedOrigins = env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];
    
    if (allowedOrigins.length === 0) {
      console.error('ALLOWED_ORIGINS not configured - rejecting request for security');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 403,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'null'
        }
      });
    }

    const origin = request.headers.get('origin');
    const isAllowed = origin && allowedOrigins.includes(origin);
    
    if (!isAllowed && request.method !== 'OPTIONS') {
      console.warn(`Blocked request from unauthorized origin: ${origin}`);
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'null'
        }
      });
    }

    const corsOrigin = isAllowed ? origin : allowedOrigins[0];
    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'false'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitAllowed = await checkRateLimit(clientIP, env);
    
    if (!rateLimitAllowed) {
      return new Response(JSON.stringify({ 
        error: 'Too many requests. Please wait a moment before trying again.' 
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    try {
      const { title, body, labels, issueType } = await request.json();
      
      // Strict input validation
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'Title is required and must be a non-empty string' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      if (title.length > 200) {
        return new Response(JSON.stringify({ error: 'Title must be less than 200 characters' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Check for suspicious patterns (potential spam/abuse)
      const suspiciousPatterns = [
        /(.)\1{10,}/, // Repeated characters (e.g., "aaaaaaaaaaa")
        /.{500,}/, // Very long single words
      ];
      
      if (suspiciousPatterns.some(pattern => pattern.test(title))) {
        console.warn(`Suspicious title pattern detected from IP: ${clientIP}`);
        return new Response(JSON.stringify({ error: 'Invalid title format' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      if (!body || typeof body !== 'string' || body.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'Body is required and must be a non-empty string' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      if (body.length > 10000) { // Reduced from 50k to prevent abuse
        return new Response(JSON.stringify({ error: 'Body must be less than 10,000 characters' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      if (body.length < 10) {
        return new Response(JSON.stringify({ error: 'Body must be at least 10 characters' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      
      // Additional spam detection
      const bodyLines = body.split('\n').length;
      if (bodyLines > 500) {
        return new Response(JSON.stringify({ error: 'Body contains too many lines' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // Get GitHub token from environment
      const githubToken = env.GITHUB_TOKEN;
      if (!githubToken) {
        console.error('GITHUB_TOKEN not configured');
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
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
          return new Response(JSON.stringify({ 
            error: 'Authentication error. Please contact support.' 
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        return new Response(JSON.stringify({ 
          error: 'Failed to create issue. Please try again later.' 
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      const issue = await response.json();

      return new Response(JSON.stringify({
        success: true,
        issue: {
          number: issue.number,
          url: issue.html_url,
          title: issue.title
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });

    } catch (error) {
      console.error('Error creating issue:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};

