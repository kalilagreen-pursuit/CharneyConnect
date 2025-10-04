# Charney CRM - Design Guidelines

## Design Approach: Design System-Based (Linear + Material Design Hybrid)

**Rationale**: As an iPad-optimized, data-intensive productivity tool for sales teams, Charney CRM prioritizes clarity, efficiency, and professional aesthetics. Drawing inspiration from Linear's minimal precision and Material Design's data visualization patterns.

**Core Principles**:
- Clean, uncluttered interfaces that prioritize data visibility
- Generous touch targets (minimum 44x44px) for iPad interaction
- Real-time visual feedback for status changes
- Professional, trustworthy aesthetic for enterprise sales context

---

## Color Palette

### Light Mode
- **Primary Brand**: 220 85% 45% (Professional deep blue)
- **Secondary Brand**: 220 20% 25% (Charcoal for text/accents)
- **Background**: 220 15% 98% (Soft white)
- **Surface**: 0 0% 100% (Pure white for cards)
- **Text Primary**: 220 20% 15%
- **Text Secondary**: 220 10% 45%

### Dark Mode
- **Primary Brand**: 220 75% 55% (Lighter blue for contrast)
- **Background**: 220 20% 8% (Deep navy-black)
- **Surface**: 220 15% 12% (Elevated surfaces)
- **Text Primary**: 220 10% 95%
- **Text Secondary**: 220 8% 70%

### Status Colors (Both Modes)
- **Available**: 142 70% 45% (Green) / 142 60% 55% (Dark)
- **On Hold**: 45 90% 55% (Amber) / 45 85% 60% (Dark)
- **Contract**: 210 85% 55% (Blue) / 210 75% 60% (Dark)
- **Sold**: 0 70% 50% (Red) / 0 65% 55% (Dark)

### Functional Colors
- **Success**: 142 70% 45%
- **Warning**: 45 90% 55%
- **Error**: 0 70% 50%
- **Info**: 210 85% 55%

---

## Typography

**Primary Font**: Inter (via Google Fonts CDN)
**Monospace Font**: JetBrains Mono (for data/numbers)

### Type Scale
- **Hero/Page Title**: text-3xl font-bold (30px) - Limited use
- **Section Headers**: text-2xl font-semibold (24px)
- **Card Titles**: text-lg font-semibold (18px)
- **Body Text**: text-base font-normal (16px)
- **Secondary Text**: text-sm font-normal (14px)
- **Labels/Captions**: text-xs font-medium (12px)
- **Data/Numbers**: text-lg font-mono (monospace for alignment)

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16
- Tight spacing: p-2, gap-2 (component internals)
- Standard spacing: p-4, gap-4 (card padding, list gaps)
- Section spacing: p-8, gap-8 (major layout sections)
- Large spacing: p-12, gap-12 (page-level separation)

**Grid System**:
- Dashboard: 12-column grid with 4-unit gap
- Unit Map: Responsive grid (grid-cols-2 md:grid-cols-3 lg:grid-cols-4)
- Forms: Single column, max-w-2xl for optimal readability

**Responsive Breakpoints** (iPad-focused):
- sm: 640px (Portrait iPad Mini)
- md: 768px (Portrait iPad)
- lg: 1024px (Landscape iPad)
- xl: 1280px (Landscape iPad Pro)

---

## Component Library

### Navigation
- **Top App Bar**: Fixed, h-16, with logo, search, notifications, user menu
- **Sidebar Navigation** (Optional for tablet landscape): w-64, collapsible
- **Tab Navigation**: For view switching within dashboard (Units, Leads, Contacts)
- Touch targets: min h-12 for all interactive elements

### Unit Map Cards
- **Card Container**: Rounded-lg, border-2, shadow-sm, p-4
- **Status Indicator**: Left border (border-l-4) in status color
- **Unit ID**: text-lg font-bold
- **Price**: text-2xl font-mono font-semibold
- **Status Badge**: Pill-shaped, small, in corner with status color background
- **Hover State**: Subtle shadow-md elevation, scale-102 transform
- **Touch Feedback**: Active state with opacity-90

### Data Display
- **Property Cards**: White/surface background, rounded-lg, p-6, shadow-sm
- **Stat Cards**: Grid display showing key metrics (Total Units, Available, Sold, Revenue)
- **Lists**: Alternate row background for scannability, pl-4 pr-4 pt-3 pb-3
- **Tables**: Sticky headers, zebra striping, responsive stacking on mobile

### Forms & Inputs
- **Text Inputs**: h-12, rounded-lg, px-4, border-2, focus:ring-2 focus:ring-primary
- **Dropdowns/Selects**: h-12, styled consistently with inputs
- **Buttons Primary**: h-12, px-8, rounded-lg, font-semibold
- **Buttons Secondary**: h-12, px-8, rounded-lg, border-2, variant="outline"
- **Touch Targets**: All interactive elements minimum 44x44px

### Overlays
- **Modals**: max-w-2xl, rounded-xl, shadow-2xl, backdrop-blur
- **Sidebars/Drawers**: Slide in from right, w-96 for details panels
- **Toasts/Notifications**: Top-right, rounded-lg, shadow-lg, auto-dismiss

### Status Visualization
- **Color-Coded Dots**: w-3 h-3 rounded-full inline indicators
- **Progress Bars**: h-2, rounded-full, showing conversion metrics
- **Charts**: Use Chart.js or Recharts for sales funnel, time-series data

---

## Interactions & Animations

**Minimal Animation Philosophy**: Subtle, purposeful motion only

- **Transitions**: transition-all duration-200 for hover states
- **Status Changes**: Fade color transition over 300ms when unit status updates
- **Loading States**: Skeleton screens with pulse animation
- **Real-time Updates**: Gentle highlight flash (bg-yellow-100 → transparent) when WebSocket updates arrive
- **Page Transitions**: None - instant navigation for productivity

---

## iPad-Specific Optimizations

- **Gesture Support**: Swipe to dismiss modals, pull to refresh lists
- **Split View Ready**: Responsive at all sizes from 1/3 split to full screen
- **Keyboard Shortcuts**: Display shortcuts in tooltips (⌘K for search, etc.)
- **Touch Precision**: No hover-dependent interactions, all info visible or one-tap away
- **Orientation**: Optimized for both portrait and landscape modes

---

## Accessibility

- Maintain WCAG AA contrast ratios (4.5:1 text, 3:1 UI)
- Status information conveyed through both color AND text labels
- Keyboard navigation support for all interactive elements
- Focus indicators: ring-2 ring-primary ring-offset-2
- Screen reader labels for all icons and status indicators

---

## No Images Required

This is a data-centric dashboard application. Visual interest comes from:
- Clean typography and color-coded data visualization
- Well-organized information hierarchy
- Status indicators and live data updates
- Professional, functional aesthetic without decorative imagery