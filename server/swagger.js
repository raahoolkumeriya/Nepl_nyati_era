import swaggerUi from 'swagger-ui-express';

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'NEPL Box Cricket League API Documentation',
    version: '2026.1.0',
    description: [
      '### 🏏 Nyati Era Dhanori Box Cricket League API',
      'Version: **"कर्मण्येवाधिकारस्ते"** (Season 2026+)',
      '',
      'This interactive API documentation provides endpoints for managing **Players, Teams, Purse Budgets, Live Auction Bids, and MongoDB Tournament Rules**.',
      '',
      '#### 🔐 API Security & Authentication:',
      'All mutating API write operations (`POST`, `PUT`, `DELETE`) require an **API Key** passed in the `x-api-key` HTTP header.',
      '- Default Dev API Key: `NEPL-API-KEY-2026`',
      '- Click the **Authorize 🔒** button above to authenticate requests directly inside Swagger UI.',
      '',
      '#### 🗄️ Database Connection:',
      '- Connection String: `mongodb+srv://codelocked:*****@nyatiera.v653v8g.mongodb.net/nepl_cricket`',
    ].join('\n'),
    contact: {
      name: 'NEPL Technical Committee',
      url: 'https://github.com/raahoolkumeriya/Nepl_nyati_era',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Primary API Server (Relative / API path for Local & Render.com)',
    },
    {
      url: 'http://localhost:3001/api',
      description: 'Local Express Backend Direct Port',
    },
  ],
  tags: [
    { name: 'Health', description: 'API Server and MongoDB Atlas Health Checks' },
    { name: 'Players', description: 'Player Registration, Profiles, Categories & Photos' },
    { name: 'Teams', description: 'Team Squads, Owner/Captain Assignment, Purse Budgets & Capacity' },
    { name: 'Auction History', description: 'Live Auction Bidding Activity Logs' },
    { name: 'Tournament Rules', description: 'Super Admin MongoDB Tournament Rules Engine' },
  ],
  security: [
    { ApiKeyAuth: [] }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API and MongoDB Atlas connection status',
        security: [],
        responses: {
          200: {
            description: 'Server and Database Health Status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    db: { type: 'string', example: 'connected' },
                    dbState: { type: 'number', example: 1 },
                    timestamp: { type: 'string', example: '2026-08-08T09:20:00.000Z' },
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
        summary: 'Get all registered players',
        security: [],
        responses: {
          200: {
            description: 'Array of all player records from MongoDB Atlas',
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
        summary: 'Create / Register a new player',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PlayerInput' },
            },
          },
        },
        responses: {
          201: { description: 'Player registered successfully' },
          401: { description: 'Unauthorized - Missing or invalid x-api-key header' },
        },
      },
      put: {
        tags: ['Players'],
        summary: 'Bulk update / replace all players',
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
          200: { description: 'Bulk player save successful' },
          401: { description: 'Unauthorized - Missing or invalid x-api-key header' },
        },
      },
    },
    '/players/{id}': {
      get: {
        tags: ['Players'],
        summary: 'Get a player by ID',
        security: [],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Player object found' },
          404: { description: 'Player not found' },
        },
      },
      put: {
        tags: ['Players'],
        summary: 'Update single player profile / auction status',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
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
          200: { description: 'Player updated' },
          401: { description: 'Unauthorized - Missing or invalid x-api-key header' },
        },
      },
      delete: {
        tags: ['Players'],
        summary: 'Delete player by ID',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Player deleted successfully' },
          401: { description: 'Unauthorized - Missing or invalid x-api-key header' },
        },
      },
    },

    /* ── TEAMS ── */
    '/teams': {
      get: {
        tags: ['Teams'],
        summary: 'Get all registered teams & squads',
        security: [],
        responses: {
          200: {
            description: 'Array of teams with purse stats and squad lists',
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
      put: {
        tags: ['Teams'],
        summary: 'Bulk replace teams',
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
          200: { description: 'Bulk teams save successful' },
          401: { description: 'Unauthorized - Missing or invalid x-api-key header' },
        },
      },
    },
    '/teams/{id}': {
      put: {
        tags: ['Teams'],
        summary: 'Create or Update single team (Purse Budget & Squad Capacity)',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
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
          200: { description: 'Team document updated in MongoDB Atlas' },
          401: { description: 'Unauthorized - Missing or invalid x-api-key header' },
        },
      },
      delete: {
        tags: ['Teams'],
        summary: 'Delete team by ID',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Team deleted' },
          401: { description: 'Unauthorized - Missing or invalid x-api-key header' },
        },
      },
    },

    /* ── HISTORY ── */
    '/history': {
      get: {
        tags: ['Auction History'],
        summary: 'Get live bid history logs (newest first)',
        security: [],
        responses: {
          200: { description: 'Array of bid log entries' },
        },
      },
      post: {
        tags: ['Auction History'],
        summary: 'Log a new bid or sale event',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  playerId: { type: 'string' },
                  playerName: { type: 'string' },
                  teamId: { type: 'string' },
                  teamName: { type: 'string' },
                  amount: { type: 'number' },
                  type: { type: 'string', example: 'SOLD' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Bid log entry created' },
          401: { description: 'Unauthorized - Missing or invalid x-api-key header' },
        },
      },
    },

    /* ── RULES ── */
    '/rules': {
      get: {
        tags: ['Tournament Rules'],
        summary: 'Get all tournament rules from MongoDB Atlas',
        security: [],
        responses: {
          200: { description: 'Array of tournament rules' },
        },
      },
      post: {
        tags: ['Tournament Rules'],
        summary: 'Add a new tournament rule (Super Admin)',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  number: { type: 'string', example: '11' },
                  title: { type: 'string', example: 'Custom Rule' },
                  desc: { type: 'string' },
                  icon: { type: 'string', example: 'ShieldAlert' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Rule created' },
          401: { description: 'Unauthorized - Missing or invalid x-api-key header' },
        },
      },
      put: {
        tags: ['Tournament Rules'],
        summary: 'Bulk update all rules in MongoDB',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          200: { description: 'Rules updated' },
          401: { description: 'Unauthorized - Missing or invalid x-api-key header' },
        },
      },
    },
    '/rules/{id}': {
      delete: {
        tags: ['Tournament Rules'],
        summary: 'Delete rule by ID (Super Admin)',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Rule deleted' },
          401: { description: 'Unauthorized - Missing or invalid x-api-key header' },
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
        description: 'Pass API key in header `x-api-key`. Default key: `NEPL-API-KEY-2026`',
      },
    },
    schemas: {
      Player: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ply-1' },
          name: { type: 'string', example: 'Pooja Patil' },
          role: { type: 'string', example: 'Batting All-Rounder' },
          category: { type: 'string', example: 'Female' },
          basePrice: { type: 'number', example: 400 },
          status: { type: 'string', example: 'available' },
          soldPrice: { type: 'number', example: 0 },
          soldTo: { type: 'string', nullable: true },
          avatarUrl: { type: 'string', example: '/avatars/female.png' },
          cricHeroesUrl: { type: 'string', example: 'https://cricheroes.com/...' },
        },
      },
      PlayerInput: {
        type: 'object',
        required: ['name', 'role', 'category', 'basePrice'],
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          category: { type: 'string' },
          basePrice: { type: 'number' },
          avatarUrl: { type: 'string' },
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
          color: { type: 'string', example: '#eab308' },
          totalPurse: { type: 'number', example: 10000 },
          spentPurse: { type: 'number', example: 0 },
          maxSquadSize: { type: 'number', example: 8 },
          playersCount: { type: 'number', example: 0 },
          squad: {
            type: 'array',
            items: { $ref: '#/components/schemas/Player' },
          },
        },
      },
    },
  },
};

export const serveSwaggerUi = swaggerUi.serve;
export const setupSwaggerUi = swaggerUi.setup(openApiSpec, {
  customCss: '.swagger-ui .topbar { display: none } body { background-color: #070b14; } .swagger-ui { filter: invert(88%) hue-rotate(180deg); }',
  customSiteTitle: 'NEPL API Documentation (Season 2026+)',
});
