# Dashboard Overview API Enhancement Plan

## Goal
Extend `/api/v1/bite-brew/dashboard/overview?limit=5` to return additional sections matching the UI requirements.

## UI Sections Required
1. **Cards** (already exists): ordersCount, menuCount, unreadMessages, unreadNotifications, totalSales
2. **Traffic Summary**: Last 7 days of visitor activity and trend movement
3. **Top Selling Items**: Best performers by order volume
4. **Recent Orders** (already exists): Latest N orders
5. **Recent Messages**: Latest 5 customer messages
6. **Notifications**: Latest 5 alerts
7. **Top Locations**: Where traffic is coming from

## Files to Modify
1. `src/repository/dashboard/dashboard.repository.ts` - Add 5 new query methods
2. `src/service/dashboard/dashboard.service.ts` - Aggregate all data sources
3. `src/controller/dashboard/dashboard.controller.ts` - No changes needed (limit already handled)

## Implementation Steps
- [x] Step 1: Update DashboardRepository with new query methods
- [x] Step 2: Update DashboardService to aggregate new data
- [x] Step 3: Type-check and verify compilation
- [x] Step 4: Test endpoint

## Expected Response Shape
```json
{
  "message": "Operation successful",
  "data": {
    "cards": { "ordersCount": 15, "menuCount": 6, "unreadMessages": 1, "unreadNotifications": 0, "totalSales": 6120 },
    "trafficSummary": { "days": [...], "trend": "up|down|stable" },
    "topSellingItems": [...],
    "recentOrders": [...],
    "recentMessages": [...],
    "notifications": [...],
    "topLocations": [...]
  }
}
```

