# Database Setup Guide

This guide will help you set up PostgreSQL with pgvector for the Financial Advisor AI application.

## Option 1: Using Docker (Recommended for Development)

### 1. Start PostgreSQL with pgvector

```bash
# Start the database
npm run docker:up

# Check if it's running
docker ps
```

The database will be available at:
- Host: `localhost`
- Port: `5432`
- Database: `financial_advisor_ai`
- Username: `postgres`
- Password: `password`

### 2. Update Environment Variables

Update your `.env.local` file:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/financial_advisor_ai"
```

### 3. Initialize the Database

```bash
# Run the complete database setup
npm run db:setup
```

This will:
- Generate Prisma client
- Push schema to database
- Enable vector extension
- Create search functions and indexes

## Option 2: Local PostgreSQL Installation

### 1. Install PostgreSQL with pgvector

**On macOS (using Homebrew):**
```bash
brew install postgresql
brew install pgvector
```

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo apt install postgresql-16-pgvector
```

**On Windows:**
1. Install PostgreSQL from https://www.postgresql.org/download/windows/
2. Install pgvector extension from https://github.com/pgvector/pgvector

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE financial_advisor_ai;

# Connect to the new database
\c financial_advisor_ai

# Enable vector extension
CREATE EXTENSION vector;

# Exit
\q
```

### 3. Update Environment Variables

```env
DATABASE_URL="postgresql://username:password@localhost:5432/financial_advisor_ai"
```

### 4. Initialize the Database

```bash
npm run db:setup
```

## Option 3: Cloud Database (Production)

### Using Supabase (Recommended)

1. Create a new project at https://supabase.com
2. Go to Settings > Database
3. Copy the connection string
4. Update your `.env.local`:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

5. Run the setup:

```bash
npm run db:setup
```

### Using Neon

1. Create a new database at https://neon.tech
2. Copy the connection string
3. Update your `.env.local`
4. Run the setup:

```bash
npm run db:setup
```

## Verification

### 1. Check Database Connection

```bash
# Open Prisma Studio
npm run db:studio
```

### 2. Test Vector Search

```bash
# Run a test query
psql -U postgres -d financial_advisor_ai -c "SELECT version();"
psql -U postgres -d financial_advisor_ai -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### 3. Test the Application

1. Start the development server: `npm run dev`
2. Go to `http://localhost:3000`
3. Sign in with Google
4. Import some data
5. Try asking questions in the chat

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Make sure PostgreSQL is running
   - Check the port (default: 5432)
   - Verify credentials in `.env.local`

2. **Vector Extension Not Found**
   - Make sure pgvector is installed
   - Run: `CREATE EXTENSION vector;` in your database

3. **Permission Denied**
   - Check database user permissions
   - Make sure the user can create extensions

4. **Docker Issues**
   - Make sure Docker is running
   - Try: `docker-compose down && docker-compose up -d`

### Reset Database

If you need to start fresh:

```bash
# Stop and remove containers
npm run docker:down

# Remove volumes (this will delete all data)
docker volume rm jump-challenge_postgres_data

# Start fresh
npm run docker:up
npm run db:setup
```

## Production Considerations

1. **Use a managed database service** (Supabase, Neon, AWS RDS)
2. **Set up proper backups**
3. **Use connection pooling** for high traffic
4. **Monitor performance** and optimize indexes
5. **Set up proper security** (SSL, firewall rules)

## Next Steps

Once your database is set up:

1. Configure Google OAuth credentials
2. Configure HubSpot OAuth credentials
3. Add your OpenAI API key
4. Start using the application!

For more help, check the main README.md file.