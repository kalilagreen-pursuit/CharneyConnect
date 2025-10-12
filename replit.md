# Charney CRM - AI-Native Condo Sales Tracking

## Overview
Charney CRM is an iPad-optimized CRM system for real-time condo sales tracking and lead management. It features a visual Unit Map with color-coded status, comprehensive lead management, WebSocket-powered real-time updates, and an AI-powered sales assistant. The project aims to provide a professional, data-focused interface for Demo Day presentations, enabling efficient lead conversion and unit sales tracking with intelligent sales coaching.

## User Preferences
- **Brand Guidelines**: Charney brand design system with red (#FF5959), black, and cream colors
- **Typography**: Franklin Gothic exclusively, uppercase headings, bold emphasis
- **Visual Style**: Simplicity and strength, 6px red accent bars, mixed-color headlines
- iPad-first design with large touch targets (44px+ minimum)
- Real-time updates are critical for sales tracking
- Clean, data-focused interface without unnecessary decorations
- Professional appearance suitable for Demo Day presentations

## System Architecture
The application consists of a React (TypeScript) frontend using Vite, Wouter for routing, TanStack Query for state management, and Tailwind CSS with Shadcn UI for styling. The backend is an Express.js (TypeScript) server.

### UI/UX Decisions
- **Unit Map Dashboard**: Color-coded unit cards (Available: Green, On Hold: Yellow, Contract: Blue, Sold: Red) with real-time stats and responsive grid layout.
- **Advanced Filtering System**: Comprehensive filters for units (Building, Bedrooms, Bathrooms, Price, Square Footage) with AND logic, real-time stats, and iPad-optimized touch targets.
- **Leads Management**: Lead cards with contact info, broker details, associated units, status tracking, and activity timeline. Features real-time search by name, email, or phone (case-insensitive) that combines with pipeline stage filters for refined lead discovery.
- **Prospect Qualification Workflow**: Complete lead qualification system with:
  - Lead Qualification Sheet: Form-based qualification with budget range, target locations, and timeframe; uses useEffect pattern to reset form state on lead change
  - Matched Units Drawer: Shows scored unit matches with Charney brand status colors (bg-status-available/on-hold/contract/sold)
  - Tasks Panel: Agent task management with semantic priority colors (destructive/accent/secondary tokens) and task completion
  - Pipeline Stage Filters: Filter leads by stage (All, New, Contacted, Qualified, Contract, Closed Won, Lost) with button group UI
  - Automated Unit Matching: Backend logic matches units based on price range, location preferences, and availability
  - Task Automation: Auto-creates follow-up tasks on qualification and engagement spikes
  - Lead Scoring: Engagement tracking with score calculation and spike detection
- **Quick Prospect Workflow Enhancements**: Streamlined prospect creation with advanced features:
  - Agent Assignment: Dropdown to select which agent owns the prospect (5 agents: Sarah Chen, Michael Rodriguez, Emily Park, David Thompson, Jessica Williams)
  - Duplicate Prevention: Autocomplete search to find and select existing prospects by name, email, or phone (min 2 characters)
  - Smart Form States: Contact fields auto-populate and become read-only when existing prospect selected; "Existing Prospect Selected" badge appears
  - Unit Card Integration: "Add Prospect" buttons on Unit Map cards open Quick Prospect with unit pre-selected
  - Dynamic Button Text: Changes based on context ("Add Prospect for Unit 803", "Link to Unit 803", "Update Prospect", "Add & Show Units")
  - Backend Intelligence: Supports both new contact creation and linking existing prospects to units via contactId parameter
- **Manager View**: Real-time Kanban board with 4 columns (Available, On Hold, Contract, Sold). Units are grouped by status and update automatically via Supabase Realtime without page refresh. Shows count badges and unit details including price, bedrooms, bathrooms, and square footage.
- **Agent View**: 3D building viewer with interactive unit selection, "Hold Unit" button, and Quick-Add Prospect feature. Agents can add prospects directly from the 3D unit details modal with automatic unit and agent linking. Status changes write directly to Supabase and trigger real-time updates across all views.
- **3D Building Viewer**: Interactive 3D visualization using three.js with unit highlighting, touch controls (tap, drag, pinch), and Charney brand styling. Unit details modal includes "Add Prospect" button that opens ProspectQuickAddForm with pre-populated unit and agent context.
- **AI Sales Assistant**: Floating action button (bottom-right, all pages) provides instant access to Gemini-powered sales coaching. Features multi-turn conversational context for follow-up questions, custom sales persona with objection handling and closing strategies, and Charney-branded chat modal. Conversation history maintained within session for contextual responses. Future: database persistence, knowledge base integration with property data, and feedback-based learning.
- **iPad Optimization**: Large touch targets (min 44x44px), responsive layouts, and clean professional design.

### Design System - Charney Brand
- **Colors**: Primary Red (#FF5959), Black, Cream (#F6F1EB), White, and Gray (#666666). Red backgrounds must have black text.
- **Status Colors**: Green (Available), Amber (On Hold), Blue (Contract), Red (Sold).
- **Typography**: Franklin Gothic for all text. Uppercase, bold headings with tight tracking. Mixed-color headlines. Uppercase, bold buttons with wide letter spacing.
- **Visual Elements**: 4px red accent bar at header bottom, 4px/8px/12px border radii, consistent spacing, subtle shadows, and hover states.
- **Components**: All interactive elements use Shadcn UI with custom design tokens, uppercase headings, and elevation for hover/active states.

### Technical Implementations
- **Frontend**: React with TypeScript, Vite, Wouter, TanStack Query, Tailwind CSS, Shadcn UI. WebSocket client for real-time updates.
- **Backend**: Express.js with TypeScript, Supabase PostgreSQL with Drizzle ORM, Zod for validation.
- **Real-time**: WebSocket server on `/ws` for live unit and lead updates, powered by Supabase Realtime for instant synchronization.
- **Data Models**: Frontend `UnitWithDetails` and `Lead/Deal` models are mapped from Supabase tables (`Units`, `FloorPlans`, `Projects`, `Contacts`, `Deals`, `Activities`, `public.leads`).
- **Database Architecture**: 
  - **Agents Table**: Centralized agent data (id, name, email, role, phone, avatarUrl) with foreign key relationships to `Deals`, `Leads`, `Visits`, and `Tasks` tables for proper referential integrity
  - SQL joins combine `Units`, `FloorPlans`, `Projects` for detailed unit data, and `Deals`, `Contacts`, `Units`, `Activities` for lead management
  - Agent data is fetched from database via `/api/agents` endpoint instead of hardcoded frontend arrays
  - Supabase status values are mapped to CRM status values
- **Quick-Add Prospect**: Atomic transaction creates Contact, Deal, Activity, and Lead records simultaneously. POST /api/prospects endpoint uses Drizzle transaction to ensure all-or-nothing persistence. Frontend invalidates query cache for real-time Leads page updates. Prospects appear immediately on Leads page with agent assignment preserved.
- **API Testing Support**: The `/api/agents/:agentId/units` endpoint supports an optional `showAllProjectUnits=true` query parameter that bypasses the deal requirement and returns all units from the specified project, enabling comprehensive testing and QA workflows.

## External Dependencies
- **Database**: Supabase PostgreSQL (Neon-backed)
- **ORM**: Drizzle ORM
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Routing**: Wouter
- **State Management**: TanStack Query v5
- **3D Graphics**: three.js
- **Validation**: Zod
- **WebSocket**: Integrated WebSocket server and client
- **AI**: Google Gemini 2.0 Flash (via @google/generative-ai)