# Charney CRM - AI-Native Condo Sales Tracking

## Overview
Charney CRM is a professional iPad-optimized CRM system designed for real-time condo sales tracking and lead management. Built for Demo Day, it features a visual Unit Map with color-coded status tracking, comprehensive lead management, and WebSocket-powered real-time updates.

## Project Architecture

### Frontend (React + TypeScript)
- **Framework**: React with TypeScript, Vite for build tooling
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query v5 for server state
- **Styling**: Tailwind CSS with custom design system, Shadcn UI components
- **Real-time**: WebSocket client with auto-reconnection

### Backend (Express + Node.js)
- **Server**: Express.js with TypeScript
- **Storage**: In-memory storage (MemStorage) with comprehensive seed data
- **Real-time**: WebSocket server on `/ws` path for live unit updates
- **Validation**: Zod schemas for request validation

### Key Features
1. **Unit Map Dashboard**
   - Color-coded unit cards by status:
     - Available: Green
     - On Hold: Yellow
     - Contract: Blue
     - Sold: Red
   - Real-time stats (Total Units, Available, On Hold, Contract, Sold, Total Value)
   - Responsive grid layout optimized for iPad (1-4 columns based on screen size)

2. **Leads Management**
   - Lead cards with contact info, broker details, associated units
   - Lead status tracking (New, Contacted, Qualified, Negotiating, Closed, Lost)
   - Activity timeline integration
   - Lead scoring system

3. **Real-time Updates**
   - WebSocket connection for live unit status changes
   - Visual pulse animation on updated cards
   - Automatic cache invalidation and UI refresh

4. **iPad Optimization**
   - Large touch targets (min 44x44px)
   - Responsive layouts for portrait and landscape
   - Clean, professional design with Charney brand colors
   - Optimized for split-screen multitasking

## Design System

### Colors
- **Primary**: Deep Blue (220 85% 45%) - Professional brand color
- **Status Colors**:
  - Available: Green (142 70% 45%)
  - On Hold: Amber (45 90% 55%)
  - Contract: Blue (210 85% 55%)
  - Sold: Red (0 70% 50%)

### Typography
- **Primary Font**: Inter (sans-serif)
- **Monospace Font**: JetBrains Mono (for prices and data)

### Components
- All interactive elements use Shadcn UI components
- Consistent spacing using Tailwind utilities (p-4, p-6, gap-4)
- Hover and active states with elevation system (hover-elevate, active-elevate-2)

## API Endpoints

### Units
- `GET /api/units` - Get all units
- `GET /api/units/:id` - Get unit by ID
- `PUT /api/units/:id` - Update unit status/price

### Leads
- `GET /api/leads` - Get all leads with full details (contact, broker, unit, activities)
- `GET /api/leads/:id` - Get lead by ID with full details

### WebSocket
- `WS /ws` - Real-time connection for unit updates
  - Broadcasts `unit_update` events when units are modified

## Data Models

### Unit
- unitNumber, floor, bedrooms, bathrooms, squareFeet, price, status, building

### Lead (with details)
- contact: Contact info
- broker: Broker details (optional)
- unit: Associated unit (optional)
- activities: Activity timeline
- status, score, notes

### Contact
- firstName, lastName, email, phone, type

### Broker
- firstName, lastName, email, phone, company, license

### Activity
- leadId, type (call/email/meeting/viewing/note), description, createdAt

## Mock Data
The system includes comprehensive seed data:
- 12 units across two buildings (Tower A & Tower B)
- 5 contacts (potential buyers)
- 3 brokers from different agencies
- 5 leads in various stages
- 8 activities across different leads

## Development

### Running the Project
```bash
npm run dev
```
This starts both the Express backend and Vite frontend on the same port.

### File Structure
```
client/
  src/
    components/     # Reusable UI components
    pages/          # Page components (dashboard, leads)
    hooks/          # Custom hooks (useWebSocket)
    lib/            # Utilities (queryClient, utils)
server/
  routes.ts         # API routes and WebSocket server
  storage.ts        # In-memory storage implementation
shared/
  schema.ts         # TypeScript types and Zod schemas
```

## Recent Changes
- Initial project setup with full-stack TypeScript
- Implemented Unit Map with color-coded status visualization
- Built comprehensive lead tracking system
- Added WebSocket support for real-time updates
- Created iPad-optimized responsive layouts
- Integrated Shadcn UI components with custom design tokens

## User Preferences
- iPad-first design with large touch targets
- Professional color scheme with status-based visualization
- Real-time updates are critical for sales tracking
- Clean, data-focused interface without unnecessary decorations
