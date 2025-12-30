// Netlify serverless function to create GitHub issues
// Set GITHUB_TOKEN in Netlify environment variables

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
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
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { title, body, labels, issueType } = JSON.parse(event.body);

    // Validate required fields
    if (!title || !body) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Title and body are required' })
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
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

