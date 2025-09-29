# Deployment Guide

This guide covers deploying the Financial Advisor AI application to various platforms.

## Prerequisites

1. **Environment Variables**: Set up all required environment variables
2. **Database**: PostgreSQL database (for production)
3. **OAuth Apps**: Google and HubSpot OAuth applications configured
4. **OpenAI API Key**: For AI functionality

## Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# HubSpot OAuth
HUBSPOT_CLIENT_ID="your-hubspot-client-id"
HUBSPOT_CLIENT_SECRET="your-hubspot-client-secret"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"
```

## Deployment Options

### Option 1: Render (Recommended)

1. **Connect Repository**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**:
   - **Name**: `financial-advisor-ai`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`

3. **Add Database**:
   - Click "New +" → "PostgreSQL"
   - **Name**: `financial-advisor-db`
   - **Plan**: Starter (Free)

4. **Set Environment Variables**:
   - Add all variables from `.env.production`
   - Set `NEXTAUTH_URL` to your Render URL
   - Set `DATABASE_URL` to the database connection string

5. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment to complete

### Option 2: Fly.io

1. **Install Fly CLI**:
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   
   # macOS/Linux
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login and Initialize**:
   ```bash
   fly auth login
   fly launch
   ```

3. **Set Environment Variables**:
   ```bash
   fly secrets set NEXTAUTH_URL=https://your-app.fly.dev
   fly secrets set NEXTAUTH_SECRET=your-secret
   fly secrets set GOOGLE_CLIENT_ID=your-client-id
   fly secrets set GOOGLE_CLIENT_SECRET=your-client-secret
   fly secrets set HUBSPOT_CLIENT_ID=your-hubspot-client-id
   fly secrets set HUBSPOT_CLIENT_SECRET=your-hubspot-client-secret
   fly secrets set OPENAI_API_KEY=your-openai-key
   fly secrets set DATABASE_URL=your-database-url
   ```

4. **Deploy**:
   ```bash
   fly deploy
   ```

### Option 3: Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables**:
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all variables from `.env.production`

4. **Add Database**:
   - Use Vercel Postgres or external PostgreSQL service
   - Update `DATABASE_URL` in environment variables

## Post-Deployment Setup

### 1. Database Migration

After deployment, run database migrations:

```bash
# For Render/Fly.io, use their CLI or dashboard
npx prisma db push

# Or run migrations
npx prisma migrate deploy
```

### 2. OAuth Configuration

Update OAuth app settings:

**Google OAuth**:
- Add your production URL to authorized redirect URIs
- Format: `https://your-domain.com/api/auth/callback/google`

**HubSpot OAuth**:
- Add your production URL to redirect URIs
- Format: `https://your-domain.com/api/hubspot/callback`

### 3. Test Deployment

1. **Visit your deployed URL**
2. **Test Google OAuth** sign-in
3. **Test HubSpot connection**
4. **Test chat functionality**
5. **Verify data ingestion**

## Monitoring

### Health Checks

The application includes health check endpoints:

- `GET /api/health` - Basic health check
- `GET /api/user/data-status` - User data status

### Logs

Monitor application logs:

**Render**:
- Dashboard → Service → Logs

**Fly.io**:
```bash
fly logs
```

**Vercel**:
- Dashboard → Project → Functions → Logs

## Troubleshooting

### Common Issues

1. **Database Connection**:
   - Verify `DATABASE_URL` is correct
   - Check database is accessible from deployment platform

2. **OAuth Errors**:
   - Verify redirect URIs match deployment URL
   - Check client ID/secret are correct

3. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are in `package.json`

4. **Runtime Errors**:
   - Check environment variables are set
   - Review application logs

### Performance Optimization

1. **Database Indexing**:
   - Add indexes for frequently queried fields
   - Use connection pooling

2. **Caching**:
   - Implement Redis for session storage
   - Cache API responses

3. **CDN**:
   - Use Cloudflare or similar for static assets
   - Enable gzip compression

## Security Considerations

1. **Environment Variables**:
   - Never commit secrets to version control
   - Use platform-specific secret management

2. **HTTPS**:
   - Ensure all traffic uses HTTPS
   - Set secure cookies

3. **CORS**:
   - Configure CORS for production domains only
   - Restrict API access

4. **Rate Limiting**:
   - Implement rate limiting for API endpoints
   - Monitor for abuse

## Scaling

### Horizontal Scaling

- Use load balancers for multiple instances
- Implement session sharing (Redis)
- Use database connection pooling

### Vertical Scaling

- Increase memory/CPU allocation
- Optimize database queries
- Implement caching strategies

## Backup Strategy

1. **Database Backups**:
   - Enable automated backups
   - Test restore procedures

2. **Code Backups**:
   - Use Git for version control
   - Tag releases for rollback

3. **Configuration Backups**:
   - Document environment variables
   - Backup deployment configurations