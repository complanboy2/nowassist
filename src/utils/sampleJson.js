/**
 * Sample JSON generator for JSON Utility Tool
 * Provides various sample JSON structures that change each time
 */

const sampleJsonTemplates = [
  // User profile
  {
    name: 'User Profile',
    generator: () => ({
      user: {
        id: Math.floor(Math.random() * 10000),
        name: ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams'][Math.floor(Math.random() * 4)],
        email: `user${Math.floor(Math.random() * 1000)}@example.com`,
        role: ['admin', 'user', 'moderator', 'guest'][Math.floor(Math.random() * 4)],
        preferences: {
          theme: ['light', 'dark'][Math.floor(Math.random() * 2)],
          notifications: Math.random() > 0.5,
          language: ['en', 'es', 'fr', 'de'][Math.floor(Math.random() * 4)]
        },
        createdAt: new Date().toISOString(),
        active: Math.random() > 0.3
      }
    })
  },
  
  // E-commerce product
  {
    name: 'Product',
    generator: () => ({
      product: {
        id: `PROD-${Math.floor(Math.random() * 10000)}`,
        name: ['Laptop', 'Smartphone', 'Headphones', 'Monitor', 'Keyboard'][Math.floor(Math.random() * 5)],
        price: (Math.random() * 1000 + 10).toFixed(2),
        currency: 'USD',
        inStock: Math.random() > 0.4,
        stock: Math.floor(Math.random() * 100),
        ratings: {
          average: (Math.random() * 2 + 3).toFixed(1),
          count: Math.floor(Math.random() * 1000)
        },
        tags: ['electronics', 'computers', 'accessories'].slice(0, Math.floor(Math.random() * 3) + 1),
        specifications: {
          weight: `${Math.floor(Math.random() * 5 + 1)}kg`,
          dimensions: `${Math.floor(Math.random() * 50 + 10)}x${Math.floor(Math.random() * 50 + 10)}x${Math.floor(Math.random() * 20 + 5)}cm`
        }
      }
    })
  },
  
  // API response
  {
    name: 'API Response',
    generator: () => ({
      status: 'success',
      data: {
        items: Array.from({ length: Math.floor(Math.random() * 5) + 2 }, (_, i) => ({
          id: i + 1,
          title: `Item ${i + 1}`,
          value: Math.floor(Math.random() * 100),
          category: ['A', 'B', 'C'][Math.floor(Math.random() * 3)]
        })),
        total: Math.floor(Math.random() * 1000),
        page: Math.floor(Math.random() * 10) + 1,
        pageSize: 20
      },
      timestamp: new Date().toISOString(),
      requestId: `req-${Math.random().toString(36).substr(2, 9)}`
    })
  },
  
  // Configuration object
  {
    name: 'Configuration',
    generator: () => ({
      config: {
        app: {
          name: 'My Application',
          version: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
          environment: ['development', 'staging', 'production'][Math.floor(Math.random() * 3)],
          debug: Math.random() > 0.5
        },
        database: {
          host: `db${Math.floor(Math.random() * 5)}.example.com`,
          port: [3306, 5432, 27017][Math.floor(Math.random() * 3)],
          name: 'mydb',
          pool: {
            min: 2,
            max: 10
          }
        },
        features: {
          analytics: Math.random() > 0.3,
          caching: Math.random() > 0.2,
          logging: true
        }
      }
    })
  },
  
  // Nested structure
  {
    name: 'Nested Structure',
    generator: () => ({
      company: {
        name: ['Acme Corp', 'Tech Solutions', 'Global Systems'][Math.floor(Math.random() * 3)],
        founded: Math.floor(Math.random() * 30) + 1990,
        employees: Math.floor(Math.random() * 5000) + 100,
        departments: {
          engineering: {
            head: ['Alice', 'Bob', 'Charlie'][Math.floor(Math.random() * 3)],
            size: Math.floor(Math.random() * 100) + 20,
            projects: Math.floor(Math.random() * 20) + 5
          },
          sales: {
            head: ['David', 'Eve', 'Frank'][Math.floor(Math.random() * 3)],
            size: Math.floor(Math.random() * 50) + 10,
            revenue: Math.floor(Math.random() * 1000000)
          },
          marketing: {
            head: ['Grace', 'Henry', 'Ivy'][Math.floor(Math.random() * 3)],
            size: Math.floor(Math.random() * 30) + 5,
            campaigns: Math.floor(Math.random() * 10) + 2
          }
        },
        locations: ['New York', 'San Francisco', 'London', 'Tokyo'].slice(0, Math.floor(Math.random() * 4) + 1)
      }
    })
  }
];

/**
 * Generate a random sample JSON
 * @returns {string} Formatted JSON string
 */
export const generateSampleJson = () => {
  const template = sampleJsonTemplates[Math.floor(Math.random() * sampleJsonTemplates.length)];
  const json = template.generator();
  return JSON.stringify(json, null, 2);
};

/**
 * Get default sample JSON (for initial load)
 * @returns {string} Formatted JSON string
 */
export const getDefaultSampleJson = () => {
  return JSON.stringify({
    "message": "Welcome to JSON Utility Tool",
    "instructions": "Paste your JSON here or click 'Generate Sample' to try different examples",
    "features": [
      "Format and minify JSON",
      "Validate syntax",
      "Sort keys alphabetically",
      "Flatten nested structures",
      "Convert to/from CSV",
      "Compare two JSON objects",
      "Tree view navigation"
    ],
    "example": {
      "name": "Sample Data",
      "value": 42,
      "active": true,
      "items": ["item1", "item2", "item3"]
    }
  }, null, 2);
};

