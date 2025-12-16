export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Dream Pixel API',
    version: '1.0.0',
    description: 'API for programmatically interacting with Dream Pixel services.',
    contact: {
      name: 'API Support',
      email: 'support@dreampixel.com'
    }
  },
  servers: [
    {
      url: 'https://api.dreampixel.com',
      description: 'Production server'
    },
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key'
      }
    },
    schemas: {
      GenerationRequest: {
        type: 'object',
        required: ['prompt'],
        properties: {
          prompt: {
            type: 'string',
            description: 'Text description of the image to generate'
          },
          negativePrompt: {
            type: 'string',
            description: 'What to exclude from the image'
          },
          seed: {
            type: 'integer',
            description: 'Random seed for reproducibility'
          },
          width: {
            type: 'integer',
            default: 512
          },
          height: {
            type: 'integer',
            default: 512
          },
          steps: {
            type: 'integer',
            default: 30
          }
        }
      },
      GenerationResponse: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier for the generation'
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED']
          },
          resultImageUrl: {
            type: 'string',
            format: 'uri'
          },
          createdAt: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string'
          }
        }
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  paths: {
    '/api/v1/generate': {
      post: {
        summary: 'Generate an image',
        tags: ['Generations'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/GenerationRequest'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Generation started',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/GenerationResponse'
                }
              }
            }
          },
          400: {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          },
          401: {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          },
          429: {
            description: 'Too many requests',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error'
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/generations/{id}': {
      get: {
        summary: 'Get generation status',
        tags: ['Generations'],
        parameters: [
          {
            in: 'path',
            name: 'id',
            schema: {
              type: 'string'
            },
            required: true,
            description: 'Generation ID'
          }
        ],
        responses: {
          200: {
            description: 'Generation status',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/GenerationResponse'
                }
              }
            }
          },
          404: {
            description: 'Generation not found'
          }
        }
      }
    },
    '/api/v1/generations': {
      get: {
        summary: 'List generations',
        tags: ['Generations'],
        parameters: [
          {
            in: 'query',
            name: 'limit',
            schema: {
              type: 'integer',
              default: 10
            }
          },
          {
            in: 'query',
            name: 'offset',
            schema: {
              type: 'integer',
              default: 0
            }
          }
        ],
        responses: {
          200: {
            description: 'List of generations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/GenerationResponse'
                      }
                    },
                    total: {
                      type: 'integer'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/seeds': {
      get: {
        summary: 'List seeds',
        tags: ['Seeds'],
        responses: {
          200: {
            description: 'List of seeds',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      seedNumber: { type: 'integer' },
                      title: { type: 'string' },
                      category: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        summary: 'Submit a seed (Pro only)',
        tags: ['Seeds'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['seedNumber', 'title', 'category'],
                properties: {
                  seedNumber: { type: 'integer' },
                  title: { type: 'string' },
                  category: { type: 'string' },
                  description: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Seed created'
          },
          403: {
            description: 'Pro tier required'
          }
        }
      }
    }
  }
}
