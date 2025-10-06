# Technology Stack Documentation

Comprehensive documentation of all technologies, frameworks, and libraries used in the Charney CRM application.

## 📋 Table of Contents

- [Frontend Technologies](#frontend-technologies)
- [Backend Technologies](#backend-technologies)
- [Database & ORM](#database--orm)
- [Real-time Communication](#real-time-communication)
- [Development Tools](#development-tools)
- [External Services](#external-services)
- [UI Components & Styling](#ui-components--styling)

---

## 🎨 Frontend Technologies

### Core Framework
- **React 18** - UI library for building component-based interfaces
- **TypeScript** - Type-safe JavaScript for improved developer experience
- **Vite** - Next-generation build tool for fast development and optimized production builds

### Routing & Navigation
- **Wouter** - Lightweight routing library for React
  - Used for client-side routing between Dashboard, Leads, Manager View, and Agent View
  - Provides `useLocation` hook and `Link` component for navigation

### State Management
- **TanStack Query v5** (React Query) - Powerful asynchronous state management
  - Server state synchronization
  - Automatic caching and refetching
  - Optimistic updates for better UX
  - Configured with custom query functions in `client/src/lib/queryClient.ts`

### Form Management
- **React Hook Form** - Performant form validation and management
- **@hookform/resolvers** - Zod integration for form validation
- **Input OTP** - One-time password input component

### 3D Visualization
- **Three.js** - 3D graphics library for WebGL rendering
  - Used in Agent View for interactive building visualization
  - Custom unit highlighting and touch controls
  - Optimized for iPad touch interactions (tap, drag, pinch)

---

## ⚙️ Backend Technologies

### Server Framework
- **Express.js** - Fast, minimalist web framework for Node.js
  - RESTful API endpoints for units, leads, projects
  - Middleware for request logging and error handling
  - Static file serving for 3D models and assets

### Runtime
- **Node.js 18+** - JavaScript runtime environment
- **TypeScript** - Type-safe backend development

### Validation
- **Zod** - TypeScript-first schema validation
  - Shared schemas between frontend and backend
  - Runtime type checking for API requests/responses
  - Integration with Drizzle ORM via `drizzle-zod`

---

## 💾 Database & ORM

### Database
- **Supabase PostgreSQL** - Managed PostgreSQL database (Neon-backed)
  - Real-time capabilities built-in
  - Row-level security
  - Automatic backups

### ORM & Migrations
- **Drizzle ORM** - TypeScript ORM for PostgreSQL
  - Type-safe database queries
  - Schema definition in `shared/schema.ts`
  - Migration management via `drizzle-kit`
- **Drizzle Zod** - Automatic Zod schema generation from Drizzle schemas

### Database Schema
Key tables:
- `Units` - Condo unit inventory
- `FloorPlans` - Unit layouts and specifications
- `Projects` - Building/development projects
- `Contacts` - Customer and broker information
- `Deals` - Sales opportunities and contracts
- `Activities` - Lead activity timeline
- `public.leads` - Lead management view

---

## 🔄 Real-time Communication

### WebSocket
- **ws** - WebSocket library for Node.js
  - Custom WebSocket server on `/ws` endpoint
  - Broadcasts unit and lead updates to all connected clients
  - Client-side hook: `useWebSocket()` in `client/src/hooks/use-websocket.ts`

### Supabase Realtime
- **@supabase/supabase-js** - Supabase client library
  - Real-time database subscriptions
  - Instant synchronization across all views
  - RealtimeContext provider in `client/src/contexts/RealtimeContext.tsx`
  - Listens to INSERT, UPDATE, DELETE events on Units table

### Integration
- WebSocket for custom application events
- Supabase Realtime for database change subscriptions
- Both systems work together to ensure instant UI updates

---

## 🛠 Development Tools

### Build & Bundle
- **Vite** - Fast development server and build tool
  - Hot Module Replacement (HMR)
  - Optimized production builds
  - Custom aliases: `@/`, `@shared/`, `@assets/`

### TypeScript Configuration
- **TypeScript 5.x** - Strict type checking enabled
- **@types packages** - Type definitions for all libraries
  - `@types/react`, `@types/express`, `@types/node`, etc.

### Code Quality
- **ESBuild** - Fast JavaScript bundler and minifier
- **PostCSS** - CSS transformation tool
- **Autoprefixer** - Automatic CSS vendor prefixing

### Package Management
- **npm** - Node package manager
- **Concurrently** - Run multiple commands simultaneously (dev server + API)

---

## 🎨 UI Components & Styling

### Component Library
- **Shadcn UI** - High-quality React components built on Radix UI
  - Accordion, Alert Dialog, Avatar, Badge, Button, Card, Checkbox, Dialog
  - Dropdown Menu, Form, Input, Label, Popover, Progress, Radio Group
  - Scroll Area, Select, Separator, Slider, Switch, Tabs, Toast, Tooltip
  - All components customized to match Charney brand guidelines

### Radix UI Primitives
- **@radix-ui/react-*** - Unstyled, accessible component primitives
  - Foundation for Shadcn UI components
  - Full accessibility support (ARIA, keyboard navigation)

### Styling
- **Tailwind CSS** - Utility-first CSS framework
  - Custom color system for Charney brand
  - Responsive design utilities
  - Dark mode support via class-based strategy
- **@tailwindcss/typography** - Beautiful typographic defaults
- **tailwindcss-animate** - Animation utilities
- **tw-animate-css** - Additional animation classes

### Utility Libraries
- **clsx** - Conditional className construction
- **tailwind-merge** - Merge Tailwind classes without conflicts
- **class-variance-authority** - Component variant management

### Icons
- **Lucide React** - Beautiful, consistent icon set
- **React Icons** - Additional icons including company logos (react-icons/si)

### Additional UI Libraries
- **Framer Motion** - Animation library for React
- **Embla Carousel** - Lightweight carousel library
- **React Day Picker** - Date picker component
- **React Resizable Panels** - Resizable panel layouts
- **Recharts** - Composable charting library
- **cmdk** - Command menu component
- **Vaul** - Drawer/bottom sheet component
- **Next Themes** - Theme management (light/dark mode)

---

## 🌐 External Services

### AI & Embeddings
- **Google Generative AI** (@google/generative-ai)
  - Gemini API for AI-powered features
  - Text embeddings for semantic search
  - Content generation capabilities

### Database Services
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database hosting
  - Real-time subscriptions
  - Authentication (if needed)
  - Row-level security

### Additional Libraries
- **date-fns** - Modern JavaScript date utility library
- **dotenv** - Environment variable management

---

## 📦 Development Workflow

### Scripts
```bash
npm run dev          # Start development server (frontend + backend)
npm run build        # Build for production
npm run db:push      # Push database schema changes
npm run db:studio    # Open Drizzle Studio (database GUI)
```

### Environment Variables
Required configuration:
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL  
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `GEMINI_API_KEY` - Google Gemini API key
- `PORT` - Server port (default: 5000)

---

## 🏗 Architecture Patterns

### Frontend Architecture
- Component-based architecture with React
- Custom hooks for shared logic (`useWebSocket`, `useRealtime`)
- Context providers for global state (RealtimeContext)
- TanStack Query for server state management
- Wouter for client-side routing

### Backend Architecture
- Express.js RESTful API
- Storage interface layer (`IStorage`) for data access abstraction
- Thin route handlers with business logic in storage layer
- Zod schema validation for all API inputs
- WebSocket server for real-time events

### Database Architecture
- Normalized relational schema
- SQL joins for complex queries (Units + FloorPlans + Projects)
- Supabase views for simplified data access
- Real-time subscriptions for instant updates

### Real-time Strategy
- Dual real-time systems:
  1. WebSocket for application-level events
  2. Supabase Realtime for database changes
- Query invalidation on updates
- Optimistic UI updates where applicable

---

## 🔒 Security & Best Practices

- TypeScript for type safety across the stack
- Zod validation for runtime type checking
- Environment variable management with dotenv
- CORS configuration for API security
- Prepared statements via Drizzle ORM (SQL injection prevention)

---

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Shadcn UI Components](https://ui.shadcn.com)

---

*Last Updated: October 2025*
