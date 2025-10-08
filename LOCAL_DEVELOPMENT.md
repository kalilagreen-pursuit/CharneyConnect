# Charney CRM - File Structure & Local Development Guide

## 📋 Project Overview

This is a full-stack TypeScript application with a React frontend and Express backend, using PostgreSQL (via Supabase) for data storage, WebSockets for real-time updates, and Google Gemini AI for intelligent features.

## 🗂️ File Structure

```
charney-crm/
├── client/                    # Frontend React Application
│   ├── src/
│   │   ├── components/       # Reusable UI components (Shadcn UI)
│   │   │   ├── ui/          # Base Shadcn components
│   │   │   ├── header.tsx   # Main navigation header
│   │   │   ├── unit-card.tsx
│   │   │   ├── lead-dialog.tsx
│   │   │   └── ...
│   │   ├── pages/           # Route components
│   │   │   ├── dashboard.tsx     # Main unit map view
│   │   │   ├── leads.tsx         # Lead management
│   │   │   ├── manager-view.tsx  # Kanban board
│   │   │   ├── agent-viewer.tsx  # 3D building view
│   │   │   └── ...
│   │   ├── hooks/           # Custom React hooks
│   │   │   ├── use-websocket.ts  # WebSocket connection
│   │   │   ├── use-mobile.ts     # Mobile detection
│   │   │   └── use-toast.ts
│   │   ├── contexts/        # React Context providers
│   │   │   └── RealtimeContext.tsx  # Realtime sync state
│   │   ├── lib/             # Utilities & configurations
│   │   │   ├── queryClient.ts    # TanStack Query setup
│   │   │   ├── utils.ts          # Utility functions
│   │   │   └── supabase.ts       # Supabase client
│   │   ├── App.tsx          # Main app component & routing
│   │   ├── main.tsx         # Frontend entry point
│   │   └── index.css        # Global styles & Tailwind
│   └── index.html           # HTML template
│
├── server/                   # Backend Express Application
│   ├── index.ts             # Server entry point
│   ├── routes.ts            # API routes & WebSocket setup
│   ├── storage.ts           # Data access layer (IStorage interface)
│   ├── db.ts                # Drizzle ORM database client
│   └── vite.ts              # Vite dev server integration
│
├── shared/                   # Shared Types & Schemas
│   └── schema.ts            # Drizzle tables, Zod schemas, types
│
├── src/server/routes/       # Additional API routes
│   └── rag.ts               # AI RAG (Retrieval-Augmented Generation)
│
├── public/                   # Static Assets
│   └── *.glb                # 3D building models
│
├── attached_assets/          # User-uploaded assets
│
├── migrations/               # Database Migration Files
│   └── *.sql                # Drizzle Kit generated migrations
│
├── scripts/                  # Utility Scripts
│   ├── ingest-data.ts       # Populate database with sample data
│   └── check-model.ts       # Verify AI model availability
│
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite build configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── postcss.config.js        # PostCSS configuration
├── drizzle.config.ts        # Drizzle ORM configuration
├── components.json          # Shadcn UI configuration
├── design_guidelines.md     # Charney brand design system
└── README.md                # Project documentation
```

## 🔧 Configuration Files Explained

### Build & Development Tools

- **`package.json`** - Dependencies and npm scripts
  - `dev`: Runs development server with tsx watch mode
  - `build`: Builds both frontend (Vite) and backend (esbuild)
  - `start`: Runs production build
  - `db:push`: Pushes schema changes to database

- **`vite.config.ts`** - Vite configuration
  - Path aliases: `@` → `client/src`, `@shared` → `shared`, `@assets` → `attached_assets`
  - Dev server settings
  - Build output: `dist/public`
  - **⚠️ Replit-specific plugins** (lines 10-20): May need removal for local dev

- **`tsconfig.json`** - TypeScript compiler settings
  - Module resolution: `bundler`
  - Strict mode enabled
  - Includes client, server, and shared directories

### Database & ORM

- **`drizzle.config.ts`** - Drizzle ORM configuration
  - Requires `DATABASE_URL` environment variable
  - Migration output: `./migrations`
  - Schema source: `./shared/schema.ts`

- **`shared/schema.ts`** - Database schema definitions
  - Tables: Projects, FloorPlans, Units, Contacts, Deals, Activities, Leads, AI Feedback
  - Zod validation schemas for type-safe API requests
  - Type exports for TypeScript

### Styling

- **`tailwind.config.ts`** - Tailwind CSS configuration
  - Custom color scheme (Charney brand: red, cream, black)
  - Shadcn UI theming variables
  - Custom animations

- **`postcss.config.js`** - PostCSS plugins (Tailwind + Autoprefixer)

## 🔑 Environment Variables Required

Create a `.env` file in the root directory with:

```env
# Database (Required)
DATABASE_URL=postgresql://user:password@localhost:5432/charney_crm

# Supabase (Required for realtime features)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# AI Features (Required for chat assistant)
GEMINI_API_KEY=your-gemini-api-key

# Server Configuration (Optional)
PORT=5000  # Defaults to 5000 if not set
NODE_ENV=development  # or 'production'
```

### Where Each Variable is Used

- **`DATABASE_URL`**: 
  - `drizzle.config.ts` (line 3-5)
  - `server/db.ts` (line 6-8)
  
- **`VITE_SUPABASE_URL`** & **`VITE_SUPABASE_ANON_KEY`**:
  - `client/src/lib/supabase.ts` (frontend Supabase client)
  - Prefixed with `VITE_` to be accessible in frontend
  
- **`SUPABASE_SERVICE_KEY`**:
  - `scripts/ingest-data.ts` (backend operations)
  
- **`GEMINI_API_KEY`**:
  - `server/routes.ts` (AI chat functionality)
  - `scripts/ingest-data.ts` (data ingestion)
  
- **`PORT`**:
  - `server/index.ts` (line 63)

## ⚠️ Changes Required for Local Development

### 1. Remove Replit-Specific Plugins

In `vite.config.ts`, lines 10-20 include Replit-specific plugins that check for `process.env.REPL_ID`. For local development, you have two options:

**Option A: Keep as-is** (plugins won't load locally since `REPL_ID` is undefined)

**Option B: Remove completely**:
```typescript
// Replace lines 10-20 with empty array
plugins: [
  react(),
  runtimeErrorOverlay(),
],
```

### 2. Server Configuration

In `server/index.ts`:
- Line 63: Port defaults to 5000
- Line 66: Host is `0.0.0.0` (suitable for both local & cloud)
- Line 67: `reusePort: true` (may not be supported on all systems)

For local development, you might want to change:
```typescript
server.listen(
  {
    port,
    host: "localhost", // Change from 0.0.0.0 if needed
    // reusePort: true, // Comment out if unsupported
  },
  () => {
    log(`serving on port ${port}`);
  },
);
```

### 3. Vite Server Hosts

In `vite.config.ts`, line 39-42:
```typescript
allowedHosts: [
  ".replit.dev",  // Remove this for local dev
],
```

Change to:
```typescript
allowedHosts: [
  "localhost",
  "127.0.0.1",
],
```

### 4. Database Setup

You'll need a PostgreSQL database. Options:

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL locally
# Create database
createdb charney_crm

# Update .env
DATABASE_URL=postgresql://localhost:5432/charney_crm
```

**Option B: Use Supabase** (recommended - already configured)
```bash
# Create free Supabase project at https://supabase.com
# Get connection string from project settings
DATABASE_URL=postgresql://[user]:[password]@db.[project].supabase.co:5432/postgres
```

**Run migrations:**
```bash
npm run db:push
```

### 5. WebSocket Configuration

The WebSocket server is set up in `server/routes.ts`. It uses the same HTTP server instance, so no additional configuration needed. Just ensure:
- Frontend connects to `ws://localhost:5000` (handled automatically)
- No firewall blocking WebSocket connections

## 📦 Dependencies

### Runtime Dependencies (Main Features)
- **Frontend**: React, Wouter (routing), TanStack Query, Shadcn UI
- **Backend**: Express, Drizzle ORM, WebSocket (ws)
- **Database**: PostgreSQL via @neondatabase/serverless
- **AI**: @google/generative-ai (Gemini)
- **Real-time**: @supabase/supabase-js
- **3D Rendering**: Three.js

### Dev Dependencies
- **Build**: Vite, esbuild, tsx (TypeScript execution)
- **Types**: Full TypeScript support with @types/* packages
- **Database**: drizzle-kit (migrations)
- **Styling**: Tailwind CSS, PostCSS

## 🚀 Running Locally

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env  # If exists, or create new .env
   # Edit .env with your credentials
   ```

3. **Run database migrations:**
   ```bash
   npm run db:push
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```
   This runs `tsx watch server/index.ts` which:
   - Starts Express backend on port 5000
   - Sets up Vite dev server for frontend
   - Enables hot reload for both

5. **Access the app:**
   ```
   http://localhost:5000
   ```

## 🏗️ Building for Production

```bash
# Build both frontend and backend
npm run build

# This creates:
# - dist/public/ (frontend static files)
# - dist/index.js (bundled backend)

# Run production build
npm start
```

## 🧪 Optional: Seed Database

```bash
npx tsx scripts/ingest-data.ts
```

Requires all environment variables to be set (especially Supabase and Gemini keys).

## 📝 Key Architecture Notes

1. **Monorepo Structure**: Frontend, backend, and shared code in one repository
2. **Type Safety**: Shared types from `schema.ts` used in both frontend and backend
3. **Real-time Sync**: Dual approach with WebSockets + Supabase Realtime
4. **Data Layer**: `IStorage` interface allows switching between PostgreSQL and in-memory storage
5. **Build Process**: Vite for frontend, esbuild for backend
6. **Development**: Single command (`npm run dev`) runs both servers

## 🔍 Troubleshooting Local Development

### Issue: Database connection fails
- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Ensure database exists

### Issue: Vite fails to start
- Check port 5000 is not in use
- Remove Replit plugins from `vite.config.ts`
- Clear `node_modules` and reinstall

### Issue: WebSocket connection fails
- Ensure backend is running on same port as frontend
- Check browser console for connection errors
- Verify no proxy blocking WebSocket upgrade

### Issue: AI features don't work
- Verify `GEMINI_API_KEY` is set
- Check API key is valid in Google AI Studio
- Review console logs for API errors

---

**Happy coding!** 🚀
