// Serverless function to create GitHub issues
// Deploy this to Vercel, Netlify, or Cloudflare Workers
// Set GITHUB_TOKEN environment variable with a personal access token

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { title, body, labels, issueType } = req.body;

    // Validate required fields
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
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

