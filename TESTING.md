
# Agent Workflow Testing Guide

## End-to-End Workflow Test

### Prerequisites
- Ensure database is seeded with units and leads
- Clear any existing showing sessions in database

### Test Steps

#### 1. Agent Dashboard
1. Navigate to `/agent/dashboard`
2. Verify agent name displays correctly
3. Check metrics show accurate counts:
   - Active Sessions (should be 0 initially)
   - Pending Follow-ups
   - Projects Qualified
4. Verify "START SHOWING" button is visible and enabled

#### 2. Start Showing Session
1. Click "START SHOWING" button
2. Verify StartShowingDialog opens
3. Search for a lead by typing in search box
4. Select a lead from the list
5. Verify lead appears in "Selected Client" section
6. Click "Start Showing Session" button
7. Verify success toast appears
8. Verify session status in left sidebar shows "ACTIVE"
9. Verify selected client details appear in sidebar

#### 3. Unit Viewing & Touring
1. Verify units are displayed in grid
2. Verify units matching client preferences show:
   - Green border highlight
   - "RECOMMENDED" badge
   - Match reasons listed
3. Click on a unit card
4. Verify "VIEWED" badge appears on the card
5. Check the tour checkbox for the unit
6. Verify toast notification appears
7. Verify unit appears in "Toured Units" list in sidebar
8. Verify bottom tracker updates with view count

#### 4. End Session & Portal Generation
1. Click "END SHOWING" button
2. Wait for processing (should take 1-2 seconds)
3. Verify success toast appears with portal URL
4. Verify portal URL format: `/portal/{token}`
5. Copy portal URL from toast
6. Verify session status changes to "INACTIVE"
7. Check that metrics updated (pending follow-ups increased)

#### 5. Portal Access
1. Navigate to the copied portal URL
2. Verify toured units are displayed
3. Verify unit details are correct
4. Test on mobile device for responsiveness

## Touch Target Verification (iPad)

### Minimum Requirements
- All interactive buttons: **44px × 44px minimum**
- Touch areas should have visual feedback on tap
- No overlapping touch targets

### Components to Test
- [ ] START SHOWING button
- [ ] END SHOWING button  
- [ ] Project selector tabs
- [ ] Unit card actions
- [ ] Tour checkboxes
- [ ] Dialog buttons
- [ ] Sidebar toggle (mobile)

### Test on Device
1. Open app on iPad or iPad simulator
2. Test all touch targets with finger (not stylus)
3. Verify comfortable tap zones with no missed taps
4. Check visual feedback on press

## Error Scenarios

### Test Error Handling
1. **Network Error**: Disconnect network, try to start session
   - Should show error toast
   - Should not break UI
2. **Invalid Lead**: Try to start session with deleted lead
   - Should show appropriate error
3. **Session Already Active**: Try to start second session while one is active
   - Should prevent or handle gracefully

## Performance Testing

### Real-time Updates
1. Open agent viewer in two browser tabs
2. Mark unit as toured in Tab 1
3. Verify toured status updates in Tab 2 within 5 seconds
4. Check WebSocket connection status in console

### Load Testing
1. Navigate to project with 100+ units
2. Verify smooth scrolling
3. Check card rendering performance
4. Monitor console for errors

## Success Criteria
- ✅ All workflow steps complete without errors
- ✅ Real-time updates function correctly
- ✅ Portal generation works and displays toured units
- ✅ All touch targets meet 44px minimum
- ✅ Loading states display appropriately
- ✅ Error messages are clear and actionable
