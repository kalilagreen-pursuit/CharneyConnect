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

5. **iPad Optimization**
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
- **2025-10-04 (Latest)**: Complete Charney brand design implementation
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
