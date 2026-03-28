import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Report } from '../entities/Report';
import { DataField } from '../entities/DataField';
import { Category } from '../entities/Category';
import { ReportDataField } from '../entities/ReportDataField';
import { ReportCategory } from '../entities/ReportCategory';
import { ReportTag } from '../entities/ReportTag';

const entities = [Report, DataField, Category, ReportDataField, ReportCategory, ReportTag];

const oracleDataSource = new DataSource({
  type: 'oracle',
  host: process.env.ORACLE_HOST || 'localhost',
  port: parseInt(process.env.ORACLE_PORT || '1521'),
  serviceName: process.env.ORACLE_SERVICE || 'FREEPDB1',
  username: process.env.ORACLE_USER || 'catalog_user',
  password: process.env.ORACLE_PASSWORD || 'catalog_password',
  entities,
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

const postgresDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'report_catalog',
  username: process.env.POSTGRES_USER || 'catalog',
  password: process.env.POSTGRES_PASSWORD || 'catalog_password',
  entities,
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});

export const AppDataSource =
  process.env.DB_TYPE === 'oracle' ? oracleDataSource : postgresDataSource;
