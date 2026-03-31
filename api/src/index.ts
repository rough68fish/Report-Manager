import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { AppDataSource } from './database/datasource';
import { reportsRouter } from './routes/reports';
import { dataFieldsRouter } from './routes/dataFields';
import { categoriesRouter } from './routes/categories';
import { errorHandler } from './middleware/errorHandler';
import { swaggerSpec } from './swagger';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));

// Swagger UI — disable helmet's CSP for this route so the UI assets load
app.use('/api-docs', helmet({ contentSecurityPolicy: false }), swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(morgan('dev'));
app.use(express.json());

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     security: []
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string }
 *                 db: { type: string }
 *                 timestamp: { type: string, format: date-time }
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    db: process.env.DB_TYPE || 'postgres',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/reports', reportsRouter);
app.use('/api/data-fields', dataFieldsRouter);
app.use('/api/categories', categoriesRouter);

app.use(errorHandler);

AppDataSource.initialize()
  .then(() => {
    console.log(`Connected to ${process.env.DB_TYPE || 'postgres'} database`);
    app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });
