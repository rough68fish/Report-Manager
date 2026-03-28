import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { AppDataSource } from './database/datasource';
import { reportsRouter } from './routes/reports';
import { dataFieldsRouter } from './routes/dataFields';
import { categoriesRouter } from './routes/categories';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

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
