# Dual Database Setup Guide

This guide will walk you through setting up both PostgreSQL and Oracle databases in a development environment using Docker Compose. We will also cover Prisma configuration, environment variables, migration strategies, and testing approaches.

## Table of Contents
1. [Requirements](#requirements)
2. [Docker Compose Setup](#docker-compose-setup)
3. [Prisma Configuration](#prisma-configuration)
4. [Environment Variables](#environment-variables)
5. [Migration Strategies](#migration-strategies)
6. [Testing Approaches](#testing-approaches)

## Requirements
- Docker
- Docker Compose
- Node.js (for Prisma)

## Docker Compose Setup

### 1. Define Services in `docker-compose.yml`
Create a file named `docker-compose.yml` in your project root:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:latest
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: devdb
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  oracle:
    image: oracle/database:19.3.0-ee
    environment:
      ORACLE_PWD: password
    ports:
      - "1521:1521"
    volumes:
      - oracle_data:/opt/oracle/oradata

volumes:
  pg_data:
  oracle_data:
```

### 2. Start Services
Run the following command to start both PostgreSQL and Oracle databases:
```bash
docker-compose up -d
```

## Prisma Configuration
1. Install Prisma in your Node.js application:
   ```bash
   npm install @prisma/client prisma
   ```
2. Initialize Prisma:
   ```bash
   npx prisma init
   ```
3. Configure your `prisma/schema.prisma` file:
   ```prisma
   datasource postgres {
     provider = "postgresql"
     url      = env("DATABASE_URL_POSTGRES")
   }

   datasource oracle {
     provider = "oracle"
     url      = env("DATABASE_URL_ORACLE")
   }
   ```

## Environment Variables
Create a `.env` file in your project root:
```env
DATABASE_URL_POSTGRES=postgresql://user:password@localhost:5432/devdb
DATABASE_URL_ORACLE=oracle://user:password@localhost:1521/ORCLCDB.localdomain
```

## Migration Strategies
- Use `prisma migrate` to manage database migrations.
- Run the command to create a migration for PostgreSQL:
  ```bash
  npx prisma migrate dev --name init
  ```
- For Oracle, ensure your migration strategy is compatible with Oracle SQL standards.

## Testing Approaches
- Use Jest or Mocha for running tests in your application.
- Mock database connections for integration tests to avoid running tests against your actual databases.
- Ensure your tests cover critical functionality in both PostgreSQL and Oracle setups.

## Conclusion
This guide provides a foundational setup for using both PostgreSQL and Oracle with Docker Compose in a development environment alongside Prisma. Adjust configurations as necessary for production environments and ensure robust testing before deployment.