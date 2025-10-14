# Charney CRM - AI-Native Condo Sales Tracking

An iPad-optimized CRM system for real-time condo sales tracking and lead management, featuring visual unit maps, comprehensive lead management, and WebSocket-powered real-time updates.

## 🎯 Overview

Charney CRM is a professional, data-focused CRM platform designed specifically for condo sales teams. Built with enterprise-grade real-time capabilities, it provides instant visibility into unit availability, lead status, and sales progress across your entire team.

### Key Features

- **📊 Visual Unit Map Dashboard** - Color-coded unit cards with real-time status (Available, On Hold, Contract, Sold)
- **👥 Lead Management** - Comprehensive tracking of contacts, broker details, associated units, and activity timelines
- **📋 Manager View** - Real-time Kanban board with automatic updates via Supabase Realtime
- **🏢 Agent View** - Interactive 3D building viewer with unit selection and instant status updates
- **🔄 Real-time Synchronization** - WebSocket-powered updates ensure all views stay in sync instantly
- **📱 iPad Optimized** - Large touch targets (44px+ minimum) and responsive layouts
- **🎨 Advanced Filtering** - Filter units by building, bedrooms, bathrooms, price, and square footage

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (or Supabase account)
- Environment variables configured (see `.env.example`)

### New Agent Workflow Features

**Showing Session Management**
- Start showing sessions with client selection and preference matching
- Real-time unit view tracking during sessions
- Tour checkbox to mark units as toured
- Automatic portal generation for clients after session ends
- Post-showing automation triggers follow-up tasks

**Client Portal**
- Personalized link generated after each showing
- Displays toured units with details
- 30-day expiration for security
- Mobile-optimized for client review

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd charney-crm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file with:
   - `DATABASE_URL` - Your PostgreSQL/Supabase connection string
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `GEMINI_API_KEY` - Google Gemini API key (for AI features)

4. **Run database migrations**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

## 📂 Project Structure

```
charney-crm/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (Dashboard, Leads, etc.)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── contexts/      # React contexts (Realtime, etc.)
│   │   ├── lib/           # Utilities and configurations
│   │   └── App.tsx        # Main application component
│   └── index.html
├── server/                 # Backend Express server
│   ├── db.ts              # Database configuration
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Data access layer
│   └── index.ts           # Server entry point
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Drizzle schema and Zod validation
└── public/                 # Static assets (3D models, etc.)
```

## 🎨 Design System

Built with the **Charney Brand Guidelines**:

- **Colors**: Primary Red (#FF5959), Black, Cream (#F6F1EB), Gray (#666666)
- **Typography**: Franklin Gothic exclusively, uppercase headings, bold emphasis
- **Visual Style**: Simplicity and strength, 6px red accent bars, mixed-color headlines
- **Status Colors**: 
  - 🟢 Green (Available)
  - 🟡 Amber (On Hold)
  - 🔵 Blue (Contract)
  - 🔴 Red (Sold)

## 🔧 Usage

### Dashboard View
Access the main dashboard at `/` to view all units with filtering and real-time stats.

### Lead Management
Navigate to `/leads` to manage contacts, track deal progress, and view activity timelines.

### Manager View
Visit `/manager` for a Kanban-style overview with real-time unit status updates.

### Agent Workflow (NEW)
1. **Agent Dashboard** - `/agent/dashboard` - View metrics, active clients, and quick actions
2. **Project Selection** - `/agent/project-select` - Choose which project to show
3. **Agent Viewer** - `/agent/viewer` - Interactive showing session management:
   - Start showing session with client selection
   - View units with real-time preference matching
   - Mark units as toured during walkthrough
   - End session to generate client portal and trigger automation

### Client Portal
Access via generated link at `/portal/{token}` to review toured units from showing session.

## 🔌 API Endpoints

**Showing Sessions**
- `POST /api/showing-sessions` - Start a new showing session
- `POST /api/showing-sessions/:id/end` - End session and trigger automation
- `GET /api/showing-sessions/:id` - Get session status
- `GET /api/showing-sessions/:id/toured-units` - Get toured units list

**Portal Generation**
- `POST /api/portals/generate` - Generate client portal link

**Agent Dashboard**
- `GET /api/agents/:id/dashboard` - Get agent metrics
- `GET /api/agents/:id/active-clients` - Get active client list

## 📦 Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.

## 📞 Support

For questions or support, please contact the development team.

---

Built with ❤️ for efficient condo sales tracking
