import swaggerJsdoc from 'swagger-jsdoc';
import { config } from '.';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Casino Management Platform API',
      version: '1.0.0',
      description: 'API documentation for the Casino Management Platform',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: config.server.apiUrl,
        description: `${config.server.env} server`
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'session',
          description: 'Session cookie authentication'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'ERROR_CODE'
                },
                message: {
                  type: 'string',
                  example: 'Error message'
                },
                details: {
                  type: 'object'
                }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object'
            },
            meta: {
              type: 'object',
              properties: {
                page: {
                  type: 'number'
                },
                limit: {
                  type: 'number'
                },
                total: {
                  type: 'number'
                },
                totalPages: {
                  type: 'number'
                }
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes.ts', './src/features/**/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);

export const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }'
};
