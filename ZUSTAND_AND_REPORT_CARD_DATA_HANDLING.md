# Guide: GraphQL Data Loading for Charts with Zustand and ReportCard

This guide details how to update the `useDashboardStore` (Zustand) and the `ReportCard` component to handle dynamic data loading for charts via GraphQL.

## 1. Zustand Store Updates (`useDashboardStore`)

We need to ensure each card's state within `cardDetailsById` can manage its data, query, and loading status.

### State Variables for `CardReport`

The `CardReport` interface (defined in `ZUSTAND_STORE_DESIGN.md`) should include these fields:

```typescript
interface CardReport {
  id: string;
  title: string;
  type: string; // e.g., 'bar', 'line', 'table'
  settings: Record<string, any>; // Visualization-specific settings

  // --- Data Handling Fields ---
  query: string;                 // The GraphQL query string for this card
  data?: any | null;              // Stores the fetched data for the report
  isLoading: boolean;            // True while data is being fetched
  error?: string | null;          // Stores any error message from fetching
  lastFetched?: Date | null;      // Optional: Timestamp of the last successful fetch
}
```

### Initial State for New Cards

When a new card is created (e.g., in the `addCardToPage` action), these fields should be initialized appropriately:

```typescript
// In useDashboardStore.ts, within addCardToPage action:
// ...
const newCard: CardReport = {
  id: cardId,
  title: title || `New ${cardType} Card`,
  type: cardType,
  settings: {}, // Default empty settings

  // --- Initial Data Handling State ---
  query: '',                 // Default to an empty query string
  data: null,
  isLoading: false,
  error: null,
  lastFetched: null,
};
// ...
// Then add newCard to state.cardDetailsById
```
The `query` can be set initially or updated later via the settings panel.

## 2. Zustand Actions for Data Fetching

A dedicated action will handle the asynchronous data fetching logic.

### `fetchCardData(cardId: string)` Action

This asynchronous action fetches data for a specific card using its stored query.

```typescript
// In useDashboardStore.ts
// Assume GraphQLApiService is imported:
// import GQLService from '@/services/GraphQLApiService'; // Your adapted service

// ...
fetchCardData: async (cardId: string) => {
  const { cardDetailsById, updateCard } = get(); // Get current state and other actions
  const card = cardDetailsById[cardId];

  if (!card) {
    console.error(`Card with ID ${cardId} not found.`);
    return;
  }

  if (!card.query || card.query.trim() === '') {
    // Optional: Set an error or specific state if query is missing, or just return
    // updateCard(cardId, { error: 'Query is missing.', isLoading: false, data: null });
    console.warn(`No query defined for card ${cardId}. Skipping fetch.`);
    return;
  }

  // 1. Set loading state and clear previous error
  updateCard(cardId, { isLoading: true, error: null });

  try {
    // 2. Call the GraphQL service with the card's query
    // Variables can also be stored in card.settings or card.queryVariables if needed
    const responseData = await GQLService.query(card.query /*, card.variables */);

    // 3. On success: update data, clear loading, set lastFetched
    updateCard(cardId, {
      data: responseData, // Or responseData.data if your service wraps it
      isLoading: false,
      lastFetched: new Date(),
      error: null, // Clear any previous error
    });
  } catch (err: any) {
    // 4. On error: update error message, clear loading
    console.error(`Failed to fetch data for card ${cardId}:`, err);
    updateCard(cardId, {
      error: err.message || 'An unknown error occurred.',
      isLoading: false,
      data: null, // Clear potentially stale data
    });
  }
},
// ...
```

**Key points for `fetchCardData`:**

*   It uses the `updateCard` action (already defined for modifying card properties) to update `isLoading`, `error`, `data`, and `lastFetched`.
*   It retrieves the specific card's `query` from the store using `get().cardDetailsById[cardId].query`.
*   The actual GraphQL call is delegated to the `GraphQLApiService`.

### Triggering `fetchCardData`

This action can be triggered from several places:

1.  **Component Mount/Update:** In the `ReportCard` component using `useEffect` when it first loads or when its `query` (or `cardId`) changes.
2.  **Manual Refresh:** Via a "Refresh" button on the `ReportCard`.
3.  **Settings Change:** After a user modifies the card's `query` in the settings panel and saves.
4.  **Global Refresh:** A dashboard-level "Refresh All" button could iterate through cards and call this action.
5.  **Polling:** If real-time updates are needed, a `setInterval` could periodically call this (use with caution).

## 3. `ReportCard` Component Modifications

The `ReportCard` component (conceptually designed in `REPORT_CARD_AND_SETTINGS_DESIGN.md`) will use these new state fields to render UI accordingly and provide refresh capabilities.

**File:** `src/components/dashboard/ReportCard.tsx` (Conceptual Updates)

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { ResponsiveBar } from '@nivo/bar'; // Example chart
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // For errors
import { Loader2, AlertTriangle, SettingsIcon, RefreshCwIcon } from 'lucide-react';
import useDashboardStore from '@/store/dashboardStore'; // Zustand store
// import { ReportSettingsPanel } from './ReportSettingsPanel';

// Simplified Props - cardId is primary, other details are selected from store
interface ReportCardProps {
  pageId: string; // Needed for context if card removal is initiated from here
  cardId: string;
}

const ReportCard: React.FC<ReportCardProps> = ({ cardId }) => {
  // Select specific card details from the store
  const card = useDashboardStore((state) => state.cardDetailsById[cardId]);
  const { fetchCardData, updateCard } = useDashboardStore(); // Actions

  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);

  // Effect for initial data fetch or when query/cardId changes
  useEffect(() => {
    if (card && card.query) { // Only fetch if card and query exist
      fetchCardData(cardId);
    }
    // Add other dependencies if needed, e.g., card.queryVariables
  }, [cardId, card?.query, fetchCardData]);


  if (!card) {
    return (
      <Card>
        <CardHeader><CardTitle>Error</CardTitle></CardHeader>
        <CardContent>Card data not found in store. This is unexpected.</CardContent>
      </Card>
    );
  }

  const { title, cardType, settings, data, isLoading, error, query } = card;


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Loading data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Chart</AlertTitle>
          <AlertDescription>
            {error}
            <Button variant="link" size="sm" onClick={() => fetchCardData(cardId)} className="p-0 h-auto ml-2">
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    if (!data && !query) {
        return <div className="text-center text-muted-foreground p-4">No query configured for this card. Edit settings to add a query.</div>;
    }

    if (!data && query) {
        return <div className="text-center text-muted-foreground p-4">No data available. <Button variant="link" size="sm" onClick={() => fetchCardData(cardId)}>Fetch data</Button></div>;
    }


    // --- Chart Rendering (Example for Nivo Bar Chart) ---
    const barSettings = settings?.barChart || {};
    const chartData = Array.isArray(data) ? data : []; // Ensure data is an array

    switch (cardType) {
      case 'bar':
        return (
          <div style={{ height: '300px' }}>
            <ResponsiveBar
              data={chartData}
              keys={barSettings.keys || ['value']}
              indexBy={barSettings.indexBy || 'id'}
              // ... other Nivo props from settings
              margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
              padding={0.3}
              colors={{ scheme: barSettings.colorScheme || 'nivo' }}
            />
          </div>
        );
      // Other chart types
      default:
        return <div className="text-center text-muted-foreground">Unsupported chart type: {cardType}</div>;
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pr-2">
        <CardTitle className="text-sm font-medium pl-4">{title}</CardTitle>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchCardData(cardId)}
            disabled={isLoading || !query}
            aria-label="Refresh data"
          >
            <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsPanelOpen(true)}
            aria-label="Open settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center">
        {renderContent()}
      </CardContent>

      {/* {isSettingsPanelOpen && (
        <ReportSettingsPanel
          cardId={cardId}
          // Pass necessary props to settings panel
          // ...
          isOpen={isSettingsPanelOpen}
          onClose={() => setIsSettingsPanelOpen(false)}
        />
      )} */}
    </Card>
  );
};

export default ReportCard;
```

**Key `ReportCard` Modifications:**

*   **Props:** The component now primarily needs `cardId`. It then uses a Zustand selector (`useDashboardStore((state) => state.cardDetailsById[cardId])`) to get all card details. This simplifies prop drilling if `ReportCard` is rendered deep in the component tree.
*   **`useEffect` for Initial/Automatic Fetch:**
    *   Calls `fetchCardData(cardId)` when the component mounts.
    *   It also re-fetches if `cardId` or `card.query` changes, ensuring data reflects the current configuration.
*   **Rendering Logic:**
    *   **Loading:** Displays a `Loader2` icon (from `lucide-react`, commonly used with Shadcn).
    *   **Error:** Uses Shadcn `Alert` with `AlertTitle` and `AlertDescription` to show error messages, including a "Try again" button.
    *   **No Query/No Data:** Handles cases where there's no query or no data yet.
    *   **Data:** Passes the fetched `data` to the Nivo chart component.
*   **Refresh Button:**
    *   A `Button` with a `RefreshCwIcon` is added.
    *   It calls `fetchCardData(cardId)` when clicked.
    *   It's disabled if `isLoading` is true or if there's no `query` to execute. The icon can also animate during loading.

This setup provides a robust way to handle data loading per card, giving users visual feedback and control over data fetching. The separation of concerns (Zustand for state and actions, `GraphQLApiService` for API calls, `ReportCard` for UI) makes the system maintainable.I have successfully created the `ZUSTAND_AND_REPORT_CARD_DATA_HANDLING.md` file in the previous step.

The file contains:

1.  **Zustand Store Updates (`useDashboardStore`):**
    *   **New State Variables for `CardReport`:** Confirmed and listed `query: string`, `data: any | null`, `isLoading: boolean`, `error: string | null`, and `lastFetched: Date | null`.
    *   **Initial State:** Defined the initial values for these fields within the conceptual `addCardToPage` action (e.g., `query: ''`, `isLoading: false`).

2.  **Zustand Actions for Data Fetching:**
    *   **`fetchCardData(cardId: string)` Action:**
        *   Gets the `query` from the card's state using `get()`.
        *   Sets `isLoading` to `true` and `error` to `null` via `updateCard`.
        *   Conceptually calls an imported `GraphQLApiService.query(query)`.
        *   On success: updates `data`, sets `isLoading` to `false`, updates `lastFetched` via `updateCard`.
        *   On error: updates `error`, sets `isLoading` to `false` via `updateCard`.
    *   **Trigger Points:** Discussed triggering `fetchCardData` on component mount (`useEffect`), manual refresh, settings changes, or global refresh.

3.  **`ReportCard` Component Modifications:**
    *   **Props:** Noted that `isLoading`, `error`, `data` are now selected from the store using `cardId`.
    *   **Rendering Logic:**
        *   `isLoading`: Renders `Loader2` icon.
        *   `error`: Renders Shadcn `Alert` component with `AlertTriangle`, error message, and a "Try again" button.
        *   `data`: Passes to the Nivo chart component.
        *   Handles states for "No query configured" and "No data available" with options to fetch or edit settings.
        *   **Refresh Button:** Added a Shadcn `Button` with `RefreshCwIcon` to call `fetchCardData(cardId)`, disabled during loading or if no query exists.
    *   **Effect Hook for Initial Fetch:** Includes a `useEffect` hook to call `fetchCardData` on mount or when `cardId` or `card.query` changes.

The guide is presented in markdown with illustrative conceptual code snippets for Zustand store actions and React component structure.

All requirements from the task description have been met. I will now submit the subtask report.
