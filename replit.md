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
- **Database**: Supabase PostgreSQL (Neon-backed) with Drizzle ORM
- **Storage**: PostgreSQL storage layer with SQL joins for related data
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

2. **Advanced Filtering System**
   - Comprehensive filters for unit search:
     - Building/Tower selection (Tower A, Tower B)
     - Bedrooms filter (1-4 bedrooms)
     - Bathrooms filter (1-4 bathrooms)
     - Price range slider ($425K - $1.75M)
     - Square footage range slider (650 - 2,500 SF)
   - All filters work together with AND logic
   - Real-time stats update to reflect filtered results
   - Visual indicators: filter count, active badge, "Clear All" button
   - iPad-optimized with 44px+ touch targets on all controls
   - Collapsible filter panel to maximize screen space

3. **Leads Management**
   - Lead cards with contact info, broker details, associated units
   - Lead status tracking (New, Contacted, Qualified, Negotiating, Closed, Lost)
   - Activity timeline integration
   - Lead scoring system

4. **Real-time Updates**
   - WebSocket connection for live unit status changes
   - Visual pulse animation on updated cards
   - Automatic cache invalidation and UI refresh

5. **3D Building Viewer**
   - Interactive 3D visualization of building models using three.js
   - Click unit numbers on dashboard to open immersive 3D modal
   - Three buildings supported: The Jackson, The Dime, Gowanus
   - Color-coded units in 3D (Available=Green, On Hold=Yellow, Contract=Blue, Sold=Red)
   - Touch controls: Tap to select unit, drag to rotate, pinch to zoom
   - Unit details panel with status editing and save functionality
   - Rotating compass for orientation awareness
   - Project switcher to view different buildings
   - Graceful WebGL error handling for unsupported environments
   - Charney brand styling: cream background, uppercase UI, red accents

6. **iPad Optimization**
   - Large touch targets (min 44x44px)
   - Responsive layouts for portrait and landscape
   - Clean, professional design with Charney brand colors
   - Optimized for split-screen multitasking

## Design System - Charney Brand

### Colors
- **Charney Red**: #FF5959 (0 100% 67% HSL) - Primary brand color for accents, active states, CTA buttons
- **Charney Black**: #000000 (0 0% 0% HSL) - Primary text color
- **Charney Cream**: #F6F1EB (33 35% 94% HSL) - Background color
- **White**: #FFFFFF - Card backgrounds
- **Gray**: #666666 (0 0% 40% HSL) - Muted text

**Critical Brand Rule**: Red backgrounds MUST have black text for proper contrast

### Status Colors
- **Available**: Green (142 70% 45%)
- **On Hold**: Amber (45 90% 55%)
- **Contract**: Blue (210 85% 55%)
- **Sold**: Red (0 70% 50%)

### Typography
- **Primary Font**: Franklin Gothic with fallbacks (Arial Narrow, Arial, sans-serif)
- **Headings**: Uppercase, bold/black weight, tight tracking (-1.5px to -0.5px letter-spacing)
- **Mixed Headlines**: Black + Red color combination (e.g., "CHARNEY" in black, "CRM" in red)
- **Buttons**: Uppercase, bold, with wide letter spacing (1px)
- **Body Text**: Regular weight, black color

### Visual Elements
- **Red Accent Bar**: 4px red border at bottom of header (border-b-4 border-primary)
- **Border Radius**: 4px (sm), 8px (md), 12px (lg)
- **Spacing**: Consistent spacing system (8px, 16px, 24px, 40px, 60px, 80px)
- **Elevation**: Subtle shadows and hover states

### Components
- All interactive elements use Shadcn UI components
- All headings are uppercase per Charney brand guidelines
- Navigation buttons are uppercase and bold
- Hover and active states with elevation system (hover-elevate, active-elevate-2)
- Consistent 4px border radius on most UI elements

## API Endpoints

### Units
- `GET /api/units` - Get all units
- `GET /api/units/:id` - Get unit by ID
- `PUT /api/units/:id` - Update unit status/price

### Leads
- `GET /api/leads` - Get all leads from public.leads table
- `GET /api/leads/:id` - Get lead by ID
- `POST /api/leads` - Create a new lead (broadcasts WebSocket update)
- `PUT /api/leads/:id` - Update a lead (broadcasts WebSocket update)

### WebSocket
- `WS /ws` - Real-time connection for unit and lead updates
  - Broadcasts `unit_update` events when units are modified
  - Broadcasts `lead_update` events when leads are created or updated

## Data Models & Supabase Integration

### Database Architecture
The CRM uses an **existing Supabase PostgreSQL database** with the following structure:

#### Supabase Tables
- **Units**: id, project_id, floor_plan_id, unit_number, price, floor, status, notes, created_at
- **FloorPlans**: id, project_id, plan_name, bedrooms, bathrooms, sq_ft, img_url, created_at
- **Projects**: id, name, address, status, image_url, created_at
- **Contacts**: id, first_name, last_name, email, phone, contact_type, consent_given_at, created_at
- **Deals**: id, unit_id, buyer_contact_id, broker_contact_id, deal_stage, sale_price, category, created_at
- **Activities**: id, deal_id, activity_type, notes, created_at
- **public.leads**: id, name, email, company, status, value, phone, address (simple CRM lead tracking with realtime updates)

#### Data Joins & Mapping
The storage layer performs SQL joins to combine data:
- **Units + FloorPlans** → Provides bedrooms, bathrooms, and square footage
- **Units + Projects** → Provides building/project name
- **Deals + Contacts + Units** → Maps to CRM "Leads" with full contact and unit details

#### Status Value Mapping
Supabase status values are automatically mapped to CRM status values:
- `"Available"` → `"available"` (Green)
- `"Held"` → `"on_hold"` (Yellow/Amber)
- `"Sold"` → `"sold"` (Red)
- `"Contract"` → `"contract"` (Blue)

### CRM Data Models

#### UnitWithDetails (Frontend)
- All Unit table fields
- bedrooms, bathrooms, squareFeet (from FloorPlans join)
- building (from Projects join as project name)
- floorPlan, project (optional related objects)

#### Lead/Deal Mapping
- Supabase "Deals" → CRM "Leads"
- contact: Buyer contact information
- broker: Broker contact (optional, from broker_contact_id)
- unit: Associated unit with full details
- activities: Activity timeline from Activities table
- status: Mapped from deal_stage
- score: Calculated from deal stage and activity count

### Live Data
The system connects to a **live Supabase database** with:
- **94 units** across multiple projects
- Real unit data from FloorPlans and Projects tables
- Contact records for buyers and brokers
- Deal records tracked as leads
- Activity history linked to deals

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
      FloorplanViewer3D.tsx  # 3D building viewer using three.js
    pages/          # Page components (dashboard, leads)
    hooks/          # Custom hooks (useWebSocket)
    lib/            # Utilities (queryClient, utils)
public/
  the_jackson_v2.glb   # 3D model for The Jackson
  the_dime_v1.glb      # 3D model for The Dime
  gowanus_v1.glb       # 3D model for Gowanus
  compass.png          # Compass asset for 3D viewer
server/
  routes.ts         # API routes and WebSocket server
  storage.ts        # Storage interface definition
  postgres-storage.ts  # PostgreSQL/Supabase storage implementation
  db.ts            # Drizzle ORM database connection
shared/
  schema.ts         # Drizzle schema matching Supabase tables + TypeScript types
```

### Database Connection
- **Provider**: Supabase PostgreSQL (Transaction Pooler)
- **ORM**: Drizzle ORM with postgres-js driver
- **Connection**: Managed via `DATABASE_URL` environment variable
- **Schema**: Defined in `shared/schema.ts` matching existing Supabase tables

## Recent Changes
- **2025-10-04 (Latest)**: Integrated 3D building viewer with three.js
  - Created FloorplanViewer3D React component converting vanilla JS to React with hooks
  - Downloaded 3D models (The Jackson, The Dime, Gowanus) and compass assets to public/ folder
  - Dashboard unit cards now open 3D viewer modal when clicking unit number
  - Implemented touch controls: tap to select, drag to rotate, pinch to zoom
  - Unit details panel shows unit info with status editing and save functionality
  - Project switcher allows viewing different buildings in 3D
  - Added WebGL error handling for unsupported environments (shows error dialog with close button)
  - Applied Charney brand styling: cream background (#F6F1EB), uppercase text, red accents
  - Verified E2E: 3D viewer opens, WebGL error handled gracefully, close button works
- **2025-10-04**: Integrated public.leads table with realtime WebSocket updates
  - Created public.leads table in Supabase with fields: id, name, email, company, status, value, phone, address
  - Enabled Supabase realtime publication for public.leads table
  - Implemented CRUD API endpoints: GET/POST /api/leads, GET/PUT /api/leads/:id
  - Added WebSocket broadcasting for lead_update events (create and update actions)
  - Updated frontend Leads page to display public.leads data with status badges and stats
  - Extended useWebSocket hook to handle lead_update messages for realtime UI updates
  - Fixed schema to mark nullable fields (company, value, phone, address) as optional in insertLeadSchema
  - Verified E2E: lead creation (minimal/full payloads), realtime updates, stats calculations
- **2025-10-04**: Integrated with existing Supabase PostgreSQL database
  - Connected CRM to user's live Supabase database using Replit's Supabase integration
  - Implemented PostgresStorage layer with SQL joins (Units+FloorPlans+Projects for unit details)
  - Added automatic status value mapping (Supabase "Available"/"Held"/"Sold" → CRM format)
  - Verified 94 units display correctly with joined data (bedrooms, bathrooms, sqft, building names)
  - Confirmed real-time WebSocket updates work with Supabase data persistence
  - Tested unit status updates (PUT /api/units/:id/status) successfully update database
  - All E2E tests passing with live Supabase data
- **2025-10-04**: Complete Charney brand design implementation
  - Updated color system to Charney Red (#FF5959), Black, Cream (#F6F1EB), and White
  - Implemented Franklin Gothic typography with uppercase headings throughout
  - Added 4px red accent bar to header
  - Applied mixed-color headlines (e.g., "CHARNEY CRM" with red emphasis)
  - Updated all buttons and navigation to uppercase with bold styling
  - Maintained full functionality while enhancing brand consistency
  - Verified brand implementation through comprehensive E2E testing
- **2025-10-04**: Added comprehensive filtering system to Unit Map dashboard
  - Implemented Building/Tower, Bedrooms, Bathrooms, Price Range, and Square Footage filters
  - All filters work in combination with real-time stats updates
  - Fixed touch target accessibility (44px+ for iPad optimization)
  - Added visual feedback (filter count, active indicators, Clear All button)
- Initial project setup with full-stack TypeScript
- Implemented Unit Map with color-coded status visualization
- Built comprehensive lead tracking system
- Added WebSocket support for real-time updates
- Created iPad-optimized responsive layouts
- Integrated Shadcn UI components with custom design tokens

## User Preferences
- **Brand Guidelines**: Charney brand design system with red (#FF5959), black, and cream colors
- **Typography**: Franklin Gothic exclusively, uppercase headings, bold emphasis
- **Visual Style**: Simplicity and strength, 6px red accent bars, mixed-color headlines
- iPad-first design with large touch targets (44px+ minimum)
- Real-time updates are critical for sales tracking
- Clean, data-focused interface without unnecessary decorations
- Professional appearance suitable for Demo Day presentations
