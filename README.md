# Financial Advisor AI

An intelligent AI assistant for financial advisors that integrates with Gmail, Google Calendar, and HubSpot CRM to provide proactive assistance and insights.

## Features

- 🤖 **AI-Powered Chat Interface** - ChatGPT-like interface for financial advisor assistance
- 📧 **Gmail Integration** - Read and send emails, extract client information
- 📅 **Google Calendar Integration** - Schedule meetings, manage appointments
- 🏢 **HubSpot CRM Integration** - Manage contacts, track interactions
- 🔍 **RAG System** - Retrieve relevant information from emails and CRM data
- 🛠️ **Tool Calling** - AI can perform actions like scheduling, emailing, creating contacts
- 📊 **Task Management** - Multi-step workflows with persistent memory
- 🔄 **Proactive Agent** - Responds to integration events automatically
- 🌐 **Real-time Monitoring** - Webhook system for live updates

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: SQLite (development), PostgreSQL (production)
- **AI**: OpenAI GPT-4, text-embedding-3-small
- **Integrations**: Gmail API, Google Calendar API, HubSpot API
- **Deployment**: Docker, Render, Fly.io, Vercel

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google OAuth app (for Gmail/Calendar)
- HubSpot OAuth app (for CRM)
- OpenAI API key

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd jump-challenge
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env.local
   ```
   
   Fill in your values in `.env.local`:
   ```bash
   # Database
   DATABASE_URL="file:./dev.db"
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
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

4. **Set up the database**:
   
   **Option A: Use SQLite (recommended for development)**:
   ```bash
   npx prisma db push
   ```
   
   **Option B: Use PostgreSQL with Docker**:
   ```bash
   docker-compose up -d
   # Update DATABASE_URL in .env.local to:
   # DATABASE_URL="postgresql://postgres:password@localhost:5433/financial_advisor_ai"
   npx prisma db push
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Authentication
- Sign in with Google to access Gmail and Calendar
- Connect HubSpot for CRM integration

### 2. Data Ingestion
- Import Gmail emails
- Import Google Calendar events
- Import HubSpot contacts and notes

### 3. AI Assistant
- Chat with the AI about your clients and meetings
- Ask questions about your data
- Request actions like scheduling meetings or sending emails

### 4. Proactive Features
- Enable real-time monitoring
- Set up instructions for automatic actions
- Receive proactive assistance based on events

## API Endpoints

### Authentication
- `GET /api/auth/signin` - Sign in with Google
- `GET /api/auth/callback/google` - Google OAuth callback
- `GET /api/hubspot/auth` - HubSpot OAuth

### Data Management
- `POST /api/ingest` - Import data from integrations
- `GET /api/user/data-status` - Check user data status

### Chat
- `POST /api/chat` - Chat with AI assistant

### Webhooks
- `POST /api/webhooks/start` - Start webhook monitoring
- `POST /api/webhooks/stop` - Stop webhook monitoring
- `GET /api/webhooks/service` - Check background service status

## Deployment

### Option 1: Render (Recommended)

1. **Connect Repository**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Create new Web Service
   - Connect GitHub repository

2. **Configure Service**:
   - Use `render.yaml` configuration
   - Set environment variables
   - Add PostgreSQL database

3. **Deploy**:
   ```bash
   # Using the deployment script
   .\scripts\deploy.ps1 -Platform render
   ```

### Option 2: Fly.io

1. **Install Fly CLI**:
   ```bash
   # Windows
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Deploy**:
   ```bash
   .\scripts\deploy.ps1 -Platform fly
   ```

### Option 3: Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   .\scripts\deploy.ps1 -Platform vercel
   ```

## Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Gmail API and Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.com/api/auth/callback/google` (production)

### HubSpot OAuth Setup

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com)
2. Create a new app
3. Configure OAuth settings
4. Add redirect URIs:
   - `http://localhost:3000/api/hubspot/callback` (development)
   - `https://your-domain.com/api/hubspot/callback` (production)

### OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Create API key
3. Add to environment variables

## Development

### Project Structure

```
src/
├── app/                 # Next.js app router
│   ├── api/            # API routes
│   ├── auth/           # Authentication pages
│   ├── demo/           # Demo chat interface
│   └── setup/          # Setup wizard
├── components/         # React components
│   ├── chat/           # Chat interface components
│   └── ui/             # UI components
├── lib/                # Utility libraries
│   ├── auth.ts         # NextAuth configuration
│   ├── openai.ts       # OpenAI integration
│   ├── rag.ts          # RAG system
│   ├── tools.ts        # Tool calling
│   └── webhooks.ts     # Webhook management
└── types/              # TypeScript type definitions
```

### Database Schema

The application uses Prisma with the following models:

- `User` - User accounts and authentication
- `Conversation` - Chat conversations
- `Message` - Chat messages
- `Task` - AI tasks and workflows
- `Instruction` - User instructions for proactive actions
- `Email` - Gmail emails
- `Contact` - HubSpot contacts
- `Meeting` - Calendar events
- `VectorEmbedding` - RAG embeddings
- `WebhookEvent` - Webhook events

### Adding New Features

1. **New API Endpoints**: Add to `src/app/api/`
2. **New Components**: Add to `src/components/`
3. **New Tools**: Add to `src/lib/tools.ts`
4. **Database Changes**: Update `prisma/schema.prisma`

## Troubleshooting

### Common Issues

1. **Database Connection**:
   - Check `DATABASE_URL` is correct
   - Run `npx prisma db push`

2. **OAuth Errors**:
   - Verify redirect URIs match
   - Check client ID/secret

3. **Build Failures**:
   - Check Node.js version
   - Clear `.next` folder

4. **Runtime Errors**:
   - Check environment variables
   - Review console logs

### Getting Help

- Check the [Deployment Guide](DEPLOYMENT.md)
- Review [Database Setup](DATABASE_SETUP.md)
- Open an issue for bugs or feature requests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the deployment guide

---

**Built with ❤️ for Financial Advisors**