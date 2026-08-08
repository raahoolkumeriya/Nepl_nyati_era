import swaggerUi from 'swagger-ui-express';

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: '🏏 NEPL Box Cricket League — OpenAPI 3.0 Documentation',
    version: '2026.2.0',
    description: [
      '## 🚀 Nyati Era Box Cricket League API',
      '**Motto**: *"कर्मण्येवाधिकारस्ते"* (Season 2026+)',
      '',
      'Welcome to the official, interactive API documentation for **NEPL Box Cricket League**. Built with Express, Node.js, and MongoDB Atlas.',
      '',

      '---',
      '',
      '### ⚡ Available Interactive UI Modes',
      '- **Swagger UI (FastAPI Dark Theme)**: `/api/docs` or `/docs`',
      '- **Redoc UI (3-Column OpenAPI View)**: `/redoc`',
      '- **OpenAPI JSON Schema**: `/api/openapi.json`',
      '',
      '---',
      '',
      '### 🗄️ Database Infrastructure',
      '- **Cluster**: MongoDB Atlas Cloud (`nepl_cricket` database)',
    ].join('\n'),
    contact: {
      name: 'NEPL Technical Committee',
      url: 'https://github.com/raahoolkumeriya/Nepl_nyati_era',
    },
  },
  servers: [
    {
      url: '/api',
      description: '⚡ Relative API Path (Works seamlessly on Local Dev & Render.com)',
    },
    {
      url: 'http://localhost:3001/api',
      description: '💻 Local Express Server (Port 3001)',
    },
  ],
  tags: [
    { name: 'Health', description: '🏥 System health, uptime & MongoDB Atlas connectivity status' },
    { name: 'Players', description: '🏏 Player roster management, profiles, categories, CricHeroes URLs & base prices' },
    { name: 'Teams', description: '👥 Team registration, squad allocation, purse budgets & captain assignments' },
    { name: 'Auction History', description: '⚡ Real-time auction bid activity logs and sold transaction records' },
    { name: 'Tournament Rules', description: '📜 Official NEPL league directives and prize pool configurations' },
  ],
  security: [
    { ApiKeyAuth: [] }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API Server & MongoDB Atlas Health',
        description: 'Returns real-time status of the Express API server and MongoDB Atlas database connection.',
        security: [],
        responses: {
          200: {
            description: 'Server & Database connection healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    db: { type: 'string', example: 'connected' },
                    dbState: { type: 'number', example: 1 },
                    timestamp: { type: 'string', example: '2026-08-08T11:55:00.000Z' },
                  },
                },
              },
            },
          },
        },
      },
    },

    /* ── PLAYERS ── */
    '/players': {
      get: {
        tags: ['Players'],
        summary: 'List all registered players',
        description: 'Retrieve complete roster of players registered for NEPL 2026 auction.',
        security: [],
        responses: {
          200: {
            description: 'List of player objects from MongoDB Atlas',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Player' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Players'],
        summary: 'Register a new player',
        description: 'Add a new player to the auction pool. Requires API Key authentication (`x-api-key`).',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/NewPlayerInput' },
            },
          },
        },
        responses: {
          201: {
            description: 'Player registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Player' },
              },
            },
          },
          401: { description: 'Unauthorized — Invalid or missing API Key' },
        },
      },
      put: {
        tags: ['Players'],
        summary: 'Bulk replace all player records',
        description: 'Overwrites the entire players collection in MongoDB Atlas. Used for auction state sync.',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/Player' },
              },
            },
          },
        },
        responses: {
          200: { description: 'Bulk player list updated' },
        },
      },
    },

    '/players/{id}': {
      put: {
        tags: ['Players'],
        summary: 'Update single player profile',
        description: 'Update specific fields (status, soldPrice, soldTo, role, basePrice) of a player by ID.',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Player ID (e.g. ply-1786127601000)',
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Player' },
            },
          },
        },
        responses: {
          200: { description: 'Player record updated' },
          404: { description: 'Player not found' },
        },
      },
      delete: {
        tags: ['Players'],
        summary: 'Delete player from roster',
        description: 'Remove player record from MongoDB Atlas.',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Player deleted' },
          404: { description: 'Player not found' },
        },
      },
    },

    /* ── TEAMS ── */
    '/teams': {
      get: {
        tags: ['Teams'],
        summary: 'List all teams and purse statistics',
        description: 'Fetch all registered teams, total purse budgets, spent purse, owner/captain info, and acquired squad lists.',
        security: [],
        responses: {
          200: {
            description: 'Array of teams with live purse balances',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Team' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Teams'],
        summary: 'Register a new team',
        description: 'Create a new team with logo, color accent, total purse budget, and captain.',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Team' },
            },
          },
        },
        responses: {
          201: { description: 'Team created successfully' },
        },
      },
      put: {
        tags: ['Teams'],
        summary: 'Bulk update all team records',
        description: 'Overwrites team records for real-time purse and squad synchronization.',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { $ref: '#/components/schemas/Team' },
              },
            },
          },
        },
        responses: {
          200: { description: 'Teams updated' },
        },
      },
    },

    '/teams/{id}': {
      put: {
        tags: ['Teams'],
        summary: 'Update single team profile & budget',
        description: 'Update purse budget, max squad size, owner/captain, or acquired squad list for a team.',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Team' },
            },
          },
        },
        responses: {
          200: { description: 'Team updated' },
          404: { description: 'Team not found' },
        },
      },
      delete: {
        tags: ['Teams'],
        summary: 'Delete team',
        description: 'Delete team from MongoDB Atlas and return squad members to available auction pool.',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Team deleted' },
        },
      },
    },

    /* ── AUCTION HISTORY ── */
    '/history': {
      get: {
        tags: ['Auction History'],
        summary: 'Get live auction activity logs',
        description: 'Retrieve real-time audit log of bids, sold transactions, and unsold events.',
        security: [],
        responses: {
          200: {
            description: 'Array of auction history log entries',
          },
        },
      },
      post: {
        tags: ['Auction History'],
        summary: 'Log a new bid or transaction entry',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          201: { description: 'History entry logged' },
        },
      },
      put: {
        tags: ['Auction History'],
        summary: 'Bulk update auction history',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: { description: 'History updated' },
        },
      },
    },

    /* ── TOURNAMENT RULES ── */
    '/rules': {
      get: {
        tags: ['Tournament Rules'],
        summary: 'Fetch official tournament guidelines & prize pool',
        description: 'Retrieve all tournament directives and official prize pool configurations stored in MongoDB Atlas.',
        security: [],
        responses: {
          200: {
            description: 'Array of rules and official prize pool document',
          },
        },
      },
      post: {
        tags: ['Tournament Rules'],
        summary: 'Add a new official rule or prize pool config',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          201: { description: 'Rule added to MongoDB Atlas' },
        },
      },
      put: {
        tags: ['Tournament Rules'],
        summary: 'Bulk update rules',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: { description: 'Rules updated' },
        },
      },
    },

    '/rules/{id}': {
      delete: {
        tags: ['Tournament Rules'],
        summary: 'Delete rule',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          200: { description: 'Rule deleted from MongoDB Atlas' },
        },
      },
    },
  },

  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'Enter your authorized API Key to authorize write operations.',
      },
    },
    schemas: {
      Player: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ply-1786127601000' },
          name: { type: 'string', example: 'Rahul Kumeriya' },
          role: { type: 'string', example: 'Batting All-Rounder' },
          category: { type: 'string', example: 'Male' },
          basePrice: { type: 'number', example: 100 },
          status: { type: 'string', enum: ['available', 'sold', 'unsold'], example: 'available' },
          soldPrice: { type: 'number', example: 1200 },
          soldTo: { type: 'string', example: 'team-1' },
          matches: { type: 'number', example: 15 },
          runs: { type: 'number', example: 340 },
          avg: { type: 'number', example: 34.0 },
          strikeRate: { type: 'number', example: 155.0 },
          wickets: { type: 'number', example: 12 },
          economy: { type: 'number', example: 6.5 },
          bestBowling: { type: 'string', example: '3/14' },
          cricHeroesUrl: { type: 'string', example: 'https://cricheroes.com' },
          avatarUrl: { type: 'string', example: '/avatars/male.png' },
        },
      },
      NewPlayerInput: {
        type: 'object',
        required: ['name', 'role', 'category', 'basePrice'],
        properties: {
          name: { type: 'string', example: 'Sachin Tendulkar' },
          role: { type: 'string', example: 'Pure Batsman' },
          category: { type: 'string', example: 'Icon' },
          basePrice: { type: 'number', example: 300 },
          cricHeroesUrl: { type: 'string', example: 'https://cricheroes.com' },
          avatarUrl: { type: 'string', example: '/avatars/male.png' },
        },
      },
      Team: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'team-1' },
          name: { type: 'string', example: 'Dhanori Super Kings' },
          shortName: { type: 'string', example: 'DSK' },
          owner: { type: 'string', example: 'Harish R. (Captain)' },
          logo: { type: 'string', example: '👑' },
          color: { type: 'string', example: '#c9a227' },
          totalPurse: { type: 'number', example: 10000 },
          spentPurse: { type: 'number', example: 1200 },
          maxSquadSize: { type: 'number', example: 8 },
          playersCount: { type: 'number', example: 1 },
          squad: {
            type: 'array',
            items: { $ref: '#/components/schemas/Player' },
          },
        },
      },
    },
  },
};

// ── Custom Modern FastAPI / Dark Theme CSS for Swagger UI ─────────────────────
const customFastApiDarkCss = `
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Inter:wght@400;500;600;700;800;900&display=swap');

body {
  margin: 0 !important;
  padding: 0 !important;
  background-color: #070b14 !important;
  color: #e2e8f0 !important;
  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
}

.swagger-ui {
  font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
  color: #e2e8f0 !important;
  max-width: 1400px !important;
  margin: 0 auto !important;
  padding: 20px !important;
}

/* Hide default topbar */
.swagger-ui .topbar {
  display: none !important;
}

/* FastAPI / Modern Info Card */
.swagger-ui .info {
  margin: 20px 0 30px 0 !important;
  background: #0b1120 !important;
  border: 1px solid rgba(6, 182, 212, 0.3) !important;
  border-radius: 20px !important;
  padding: 28px !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6) !important;
}

.swagger-ui .info .title {
  color: #38bdf8 !important;
  font-weight: 900 !important;
  font-size: 30px !important;
  letter-spacing: -0.02em !important;
  font-family: 'Inter', sans-serif !important;
}

.swagger-ui .info p, .swagger-ui .info li {
  color: #94a3b8 !important;
  font-size: 14.5px !important;
  line-height: 1.6 !important;
}

.swagger-ui .info h2, .swagger-ui .info h3, .swagger-ui .info h4 {
  color: #f8fafc !important;
  font-weight: 800 !important;
}

.swagger-ui .info code {
  background: #1e293b !important;
  color: #06b6d4 !important;
  padding: 4px 8px !important;
  border-radius: 6px !important;
  font-family: 'Fira Code', monospace !important;
  font-size: 13px !important;
  border: 1px solid rgba(6, 182, 212, 0.25) !important;
}

/* Filter Input Bar */
.swagger-ui .wrapper input[type=text] {
  background: #0b1120 !important;
  border: 1px solid #1e293b !important;
  color: #f8fafc !important;
  border-radius: 12px !important;
  padding: 12px 16px !important;
  font-family: 'Inter', sans-serif !important;
  font-size: 14px !important;
}

.swagger-ui .wrapper input[type=text]:focus {
  border-color: #06b6d4 !important;
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.35) !important;
  outline: none !important;
}

/* Authorize Button */
.swagger-ui .btn.authorize {
  background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%) !important;
  color: #090d16 !important;
  border: none !important;
  font-weight: 900 !important;
  border-radius: 12px !important;
  padding: 10px 22px !important;
  font-size: 13px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.4) !important;
  transition: all 0.2s ease !important;
}

.swagger-ui .btn.authorize:hover {
  transform: scale(1.03) !important;
  box-shadow: 0 0 30px rgba(6, 182, 212, 0.6) !important;
}

.swagger-ui .btn.authorize svg {
  fill: #090d16 !important;
}

/* Section Header Tags */
.swagger-ui .opblock-tag {
  color: #f1f5f9 !important;
  font-weight: 800 !important;
  font-size: 20px !important;
  border-bottom: 2px solid #1e293b !important;
  padding: 20px 0 12px 0 !important;
}

.swagger-ui .opblock-tag small {
  color: #64748b !important;
  font-weight: 500 !important;
  font-size: 13px !important;
  margin-left: 10px !important;
}

/* Endpoint Operation Block */
.swagger-ui .opblock {
  background: #0b1120 !important;
  border-radius: 16px !important;
  border: 1px solid #1e293b !important;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4) !important;
  margin-bottom: 16px !important;
  overflow: hidden !important;
  transition: border-color 0.2s ease !important;
}

.swagger-ui .opblock .opblock-summary {
  padding: 12px 18px !important;
  align-items: center !important;
}

/* Method Badges */
.swagger-ui .opblock .opblock-summary-method {
  font-weight: 900 !important;
  font-size: 12px !important;
  border-radius: 8px !important;
  padding: 6px 14px !important;
  min-width: 70px !important;
  text-align: center !important;
  font-family: 'Fira Code', monospace !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
}

/* GET Method */
.swagger-ui .opblock.opblock-get {
  border-color: rgba(16, 185, 129, 0.4) !important;
}
.swagger-ui .opblock.opblock-get .opblock-summary-method {
  background: #10b981 !important;
  color: #022c22 !important;
}

/* POST Method */
.swagger-ui .opblock.opblock-post {
  border-color: rgba(6, 182, 212, 0.4) !important;
}
.swagger-ui .opblock.opblock-post .opblock-summary-method {
  background: #06b6d4 !important;
  color: #083344 !important;
}

/* PUT Method */
.swagger-ui .opblock.opblock-put {
  border-color: rgba(245, 158, 11, 0.4) !important;
}
.swagger-ui .opblock.opblock-put .opblock-summary-method {
  background: #f59e0b !important;
  color: #451a03 !important;
}

/* DELETE Method */
.swagger-ui .opblock.opblock-delete {
  border-color: rgba(244, 63, 94, 0.4) !important;
}
.swagger-ui .opblock.opblock-delete .opblock-summary-method {
  background: #f43f5e !important;
  color: #4c0519 !important;
}

/* Summary Path & Description */
.swagger-ui .opblock .opblock-summary-path {
  color: #f8fafc !important;
  font-family: 'Fira Code', monospace !important;
  font-size: 15px !important;
  font-weight: 600 !important;
}

.swagger-ui .opblock .opblock-summary-description {
  color: #94a3b8 !important;
  font-size: 13px !important;
}

/* Expanded Body & Forms */
.swagger-ui .opblock-body {
  background: #070b14 !important;
  padding: 24px !important;
  border-top: 1px solid #1e293b !important;
}

.swagger-ui table thead tr th {
  color: #94a3b8 !important;
  font-weight: 700 !important;
  border-bottom: 2px solid #1e293b !important;
  font-size: 12px !important;
  text-transform: uppercase !important;
}

.swagger-ui table tbody tr td {
  color: #cbd5e1 !important;
  border-bottom: 1px solid #1e293b !important;
  padding: 12px 10px !important;
}

.swagger-ui .parameter__name {
  color: #38bdf8 !important;
  font-family: 'Fira Code', monospace !important;
  font-size: 13.5px !important;
  font-weight: 700 !important;
}

.swagger-ui .parameter__type {
  color: #c084fc !important;
  font-family: 'Fira Code', monospace !important;
  font-size: 12px !important;
}

.swagger-ui highlight-code pre, .swagger-ui microlight {
  background: #020617 !important;
  color: #e2e8f0 !important;
  border: 1px solid #1e293b !important;
  border-radius: 12px !important;
  font-family: 'Fira Code', monospace !important;
  padding: 16px !important;
}

.swagger-ui select, .swagger-ui input[type=text]:not(.wrapper input) {
  background: #0b1120 !important;
  border: 1px solid #334155 !important;
  color: #f8fafc !important;
  border-radius: 8px !important;
  padding: 8px 12px !important;
}

/* Models / Schemas Box */
.swagger-ui section.models {
  background: #0b1120 !important;
  border: 1px solid #1e293b !important;
  border-radius: 20px !important;
  padding: 24px !important;
  margin-top: 40px !important;
}

.swagger-ui section.models h4 {
  color: #38bdf8 !important;
  font-weight: 800 !important;
  font-size: 18px !important;
}

.swagger-ui .model-container {
  background: #070b14 !important;
  border-radius: 12px !important;
  padding: 16px !important;
  border: 1px solid #1e293b !important;
}

.swagger-ui .model {
  color: #e2e8f0 !important;
  font-family: 'Fira Code', monospace !important;
}

.swagger-ui .model-title {
  color: #c084fc !important;
  font-weight: 700 !important;
}

.swagger-ui .prop-type {
  color: #06b6d4 !important;
}

/* Try it Out & Execute Buttons */
.swagger-ui .btn.execute {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  color: #ffffff !important;
  border: none !important;
  border-radius: 10px !important;
  font-weight: 800 !important;
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.4) !important;
}

.swagger-ui .btn.try-out__btn {
  background: #1e293b !important;
  color: #38bdf8 !important;
  border: 1px solid rgba(56, 189, 248, 0.4) !important;
  border-radius: 8px !important;
  font-weight: 700 !important;
}
`;

export const serveSwaggerUi = swaggerUi.serve;
export const setupSwaggerUi = swaggerUi.setup(openApiSpec, {
  customCss: customFastApiDarkCss,
  customSiteTitle: 'NEPL Box Cricket League API Docs (Season 2026+)',
  swaggerOptions: {
    docExpansion: 'list', // FastAPI / ReDoc style expandable list
    filter: true, // Live search filter for endpoints
    displayRequestDuration: true, // Request execution timer in ms
    defaultModelsExpandDepth: 2,
    persistAuthorization: true,
  },
});
