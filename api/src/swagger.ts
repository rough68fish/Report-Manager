import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Report & Dashboard Catalog API',
      version: '1.0.0',
      description: 'Internal NIST catalog of reports and dashboards.',
    },
    servers: [{ url: 'http://localhost:3001' }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Okta access token',
        },
      },
      schemas: {
        Report: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string', nullable: true },
            type: { type: 'string', enum: ['bi_dashboard', 'pdf_report', 'web_report', 'sql_extract'] },
            url: { type: 'string', nullable: true },
            ownerName: { type: 'string', nullable: true },
            ownerEmail: { type: 'string', format: 'email', nullable: true },
            department: { type: 'string', nullable: true },
            refreshCadence: { type: 'string', nullable: true },
            dataStartDate: { type: 'string', format: 'date', nullable: true },
            dataEndDate: { type: 'string', format: 'date', nullable: true },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
            drupalNodeId: { type: 'integer', nullable: true },
            createdBy: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            tags: { type: 'array', items: { $ref: '#/components/schemas/ReportTag' } },
            dataFields: { type: 'array', items: { $ref: '#/components/schemas/ReportDataField' } },
            categories: { type: 'array', items: { $ref: '#/components/schemas/ReportCategory' } },
          },
        },
        ReportInput: {
          type: 'object',
          required: ['title', 'type'],
          properties: {
            title: { type: 'string' },
            type: { type: 'string', enum: ['bi_dashboard', 'pdf_report', 'web_report', 'sql_extract'] },
            description: { type: 'string', nullable: true },
            url: { type: 'string', nullable: true },
            ownerName: { type: 'string', nullable: true },
            ownerEmail: { type: 'string', format: 'email', nullable: true },
            department: { type: 'string', nullable: true },
            refreshCadence: { type: 'string', nullable: true },
            dataStartDate: { type: 'string', format: 'date', nullable: true },
            dataEndDate: { type: 'string', format: 'date', nullable: true },
            status: { type: 'string', enum: ['draft', 'published', 'archived'], default: 'draft' },
            tags: { type: 'array', items: { type: 'string' } },
            dataFieldIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
            categoryIds: { type: 'array', items: { type: 'string', format: 'uuid' } },
          },
        },
        ReportTag: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            tag: { type: 'string' },
          },
        },
        ReportDataField: {
          type: 'object',
          properties: {
            dataFieldId: { type: 'string', format: 'uuid' },
            dataField: { $ref: '#/components/schemas/DataField' },
          },
        },
        ReportCategory: {
          type: 'object',
          properties: {
            categoryId: { type: 'string', format: 'uuid' },
            category: { $ref: '#/components/schemas/Category' },
          },
        },
        DataField: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string', nullable: true },
            dataType: { type: 'string', nullable: true },
            sourceSystem: { type: 'string', nullable: true },
          },
        },
        DataFieldInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            dataType: { type: 'string', nullable: true },
            sourceSystem: { type: 'string', nullable: true },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            slug: { type: 'string' },
            type: { type: 'string', enum: ['department', 'topic', 'data_domain', 'audience'], nullable: true },
            parentId: { type: 'string', format: 'uuid', nullable: true },
            children: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
          },
        },
        CategoryInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: ['department', 'topic', 'data_domain', 'audience'], nullable: true },
            parentId: { type: 'string', format: 'uuid', nullable: true },
          },
        },
        PaginatedReports: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { $ref: '#/components/schemas/Report' } },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                pages: { type: 'integer' },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: [
    './src/index.ts',
    './src/routes/*.ts',
    // compiled paths (for production build)
    './dist/index.js',
    './dist/routes/*.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
