# Guide: Cypher Query Editor Integration

This guide details how to integrate a Cypher query editor, specifically `@neo4j-cypher/react-codemirror`, into the dashboard module's settings panel. It covers installation, setup, connection to the Zustand store (`useDashboardStore`), and triggering data refetches.

This assumes the existing structure of `ReportSettingsPanel.tsx` (from `REPORT_CARD_AND_SETTINGS_DESIGN.md`) and the data handling mechanisms in `useDashboardStore` and `ReportCard.tsx` (from `ZUSTAND_AND_REPORT_CARD_DATA_HANDLING.md`).

## 1. Installation and Basic Setup

To use the `@neo4j-cypher/react-codemirror` editor, you'll need to install it and its CodeMirror peer dependencies.

```bash
yarn add @neo4j-cypher/react-codemirror @codemirror/state @codemirror/view
# Optional: For Neo4j-specific theme and schema support
yarn add @neo4j-cypher/codemirror-theme @neo4j-cypher/language-support
```

**Client Component:**
The component that wraps or uses the Cypher editor must be a Next.js Client Component. Ensure the file starts with `'use client';`.

```tsx
// src/components/dashboard/CypherEditorComponent.tsx (or directly in ReportSettingsPanel.tsx)
'use client';

import React from 'react';
import { CypherEditor, CypherEditorProps } // Main editor component
  from '@neo4j-cypher/react-codemirror';
// Optional: Theme and schema setup
// import { neo4jTheme } from '@neo4j-cypher/codemirror-theme';
// import { autocompletion, CypherLanguageSupport } from '@neo4j-cypher/language-support';

interface CustomCypherEditorProps extends Omit<CypherEditorProps, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  // schema?: Record<string, any>; // Optional: For autocompletion
}

const CustomCypherEditor: React.FC<CustomCypherEditorProps> = ({ value, onChange, ...props }) => {
  // const extensions = [
  //   neo4jTheme, // Apply Neo4j theme
  //   autocompletion(props.schema ? new CypherLanguageSupport(props.schema) : undefined),
  // ];

  return (
    <CypherEditor
      value={value}
      onValueChanged={onChange} // Note: The prop is onValueChanged in some versions, check documentation
      // extensions={extensions} // Apply custom extensions
      {...props} // Pass through other props like placeholder, etc.
      className="border rounded-md" // Basic styling
      // Ensure editor has a defined height, e.g., via Tailwind h-64 or min-h-[10rem]
    />
  );
};

export default CustomCypherEditor;
```

## 2. Integration into Card Settings Panel

The Cypher editor should be placed within the `ReportSettingsPanel` (e.g., inside the `DialogContent`). Its display can be conditional, for instance, if a card is configured to use a custom Cypher query rather than predefined settings.

**File:** `src/components/dashboard/ReportSettingsPanel.tsx` (Conceptual Modifications)

```tsx
// ... (imports from REPORT_CARD_AND_SETTINGS_DESIGN.md)
import dynamic from 'next/dynamic'; // For client-side only components
const CustomCypherEditor = dynamic(() => import('./CustomCypherEditor'), { ssr: false }); // Lazy load

// ... (ReportSettingsPanelProps interface)

export const ReportSettingsPanel: React.FC<ReportSettingsPanelProps> = ({
  cardId,
  cardType,
  currentSettings, // contains current query: currentSettings.query
  isOpen,
  onClose,
}) => {
  const { updateCard } = useDashboardStore();

  // Local state for the query editor, initialized from currentSettings
  const [currentQuery, setCurrentQuery] = useState(currentSettings?.query || '');
  // ... other local states for title, etc.

  useEffect(() => {
    setCurrentQuery(currentSettings?.query || '');
    // ... reset other states
  }, [currentSettings, cardType]);

  const handleSaveChanges = () => {
    const updatedCardDetails: Partial<Pick<CardReport, 'title' | 'settings' | 'query'>> = {
      // ... title, settings
      query: currentQuery, // Save the query from the editor
    };
    updateCard(cardId, updatedCardDetails);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]"> {/* Wider dialog for editor */}
        <DialogHeader>
          <DialogTitle>Edit Settings: {currentSettings?.title || 'Report'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* ... other settings like Card Title ... */}

          {/* Conditional display for Cypher Query Editor */}
          {/* This condition could be based on cardType or a specific setting */}
          {(cardType === 'custom_cypher_chart' || currentSettings?.enableCustomQuery) && (
            <div className="grid gap-2">
              <Label htmlFor="settings-query">Cypher Query</Label>
              <div className="min-h-[150px]"> {/* Ensure editor has space */}
                <CustomCypherEditor
                  value={currentQuery}
                  onChange={setCurrentQuery}
                  placeholder="Enter your Cypher query here..."
                  // schema={neo4jSchema} // Optional: Pass your Neo4j schema for autocompletion
                />
              </div>
            </div>
          )}

          {/* ... other settings like for Bar Chart (if not using custom query) ... */}
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
          <Button onClick={handleSaveChanges}>Save & Fetch Data</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

**Key Changes:**

*   **Lazy Loading:** The `CustomCypherEditor` is lazy-loaded using `next/dynamic` with `ssr: false` as CodeMirror components are client-side only.
*   **Local State for Query:** `currentQuery` is introduced in the panel's local state to manage the editor's content before saving to Zustand.
*   **Conditional Display:** The editor is shown based on a condition (e.g., `cardType === 'custom_cypher_chart'` or a boolean `currentSettings.enableCustomQuery`). This allows the same panel to handle cards with predefined settings versus cards with custom queries.
*   **Save Action:** `handleSaveChanges` now also includes `query: currentQuery` in the `updatedCardDetails` passed to the `updateCard` Zustand action.

## 3. Connecting Editor to Zustand Store

The connection involves:

1.  **Reading the Query:** The `value` prop of `CustomCypherEditor` is bound to `currentQuery` (local state in `ReportSettingsPanel`). This `currentQuery` is initialized from `cardDetailsById[cardId].query` (via `currentSettings.query`).
2.  **Updating the Query:**
    *   The `onChange` handler of `CustomCypherEditor` updates the local `currentQuery` state in the `ReportSettingsPanel`.
    *   When the user clicks "Save & Fetch Data", the `handleSaveChanges` function in `ReportSettingsPanel` calls the Zustand action `updateCard(cardId, { query: currentQuery, ...otherChanges })`.

The `updateCard` action in `useDashboardStore` (as defined in previous guides) already handles merging partial updates into `cardDetailsById[cardId]`. No new specific action like `updateCardQuery` is strictly necessary if `updateCard` is flexible enough.

```typescript
// In useDashboardStore.ts - (No change needed if updateCard is generic)
// updateCard: (cardId, updates: Partial<CardReport>) =>
//   set((state) => {
//     if (!state.cardDetailsById[cardId]) { /* ... */ return state; }
//     return {
//       cardDetailsById: {
//         ...state.cardDetailsById,
//         [cardId]: { ...state.cardDetailsById[cardId], ...updates },
//       },
//     };
//   }),
```

## 4. Triggering Data Refetch on Query Change

When the query is updated via the settings panel and saved, the `ReportCard` should refetch its data.

**Option 1: `updateCard` action calls `fetchCardData` (Simpler, Direct)**

Modify the `updateCard` action to optionally trigger a refetch if the query has changed.

```typescript
// In useDashboardStore.ts
updateCard: (cardId: string, updates: Partial<CardReport>, refetch: boolean = false) =>
  set((state) => {
    const card = state.cardDetailsById[cardId];
    if (!card) {
      console.warn(`Card with ID ${cardId} not found. Cannot update.`);
      return state;
    }

    // Check if the query is actually changing
    const queryChanged = updates.query !== undefined && updates.query !== card.query;

    const newState = {
      cardDetailsById: {
        ...state.cardDetailsById,
        [cardId]: { ...card, ...updates },
      },
    };

    // If query changed and refetch is true (or always if query changed)
    // This needs access to `fetchCardData`, which might require `get()` or restructuring actions.
    // For simplicity, the component-based refetch (Option 2) is often cleaner.
    // If doing it here, ensure `fetchCardData` is callable.
    // if (queryChanged && refetch) {
    //   // This is a conceptual placement; actual call might need `get().fetchCardData(cardId)`
    //   // and careful handling of async operations within `set`.
    //   // It's generally easier to trigger effects from components based on state changes.
    // }

    return newState;
  }),

// In ReportSettingsPanel.tsx's handleSaveChanges:
// updateCard(cardId, updatedCardDetails, true); // Pass refetch flag
```
*   **Pros:** Logic is somewhat centralized.
*   **Cons:** Can make the `updateCard` action more complex. Managing async `fetchCardData` directly within the setter of a Zustand action is tricky and usually discouraged; `fetchCardData` should be a top-level action. A better approach if doing it from an action is for `handleSaveChanges` to call `updateCard` and *then* `fetchCardData`.

**Option 2: `useEffect` in `ReportCard` (Recommended for Decoupling & Debouncing)**

The `ReportCard` already has a `useEffect` hook that listens for changes to `card.query`. This is the most natural place to trigger a refetch.

```tsx
// In src/components/dashboard/ReportCard.tsx (from ZUSTAND_AND_REPORT_CARD_DATA_HANDLING.md)
// ...
useEffect(() => {
  // Only fetch if card and query exist, and query is not empty
  if (card && card.query && card.query.trim() !== '') {
    // Optional: Implement debouncing here if query updates frequently
    // For example, if settings panel updated query on every keystroke (not current design)
    // const handler = setTimeout(() => {
    //   fetchCardData(cardId);
    // }, 500); // Debounce by 500ms
    // return () => clearTimeout(handler);

    fetchCardData(cardId); // Fetch immediately if query changes upon save
  }
  // Dependencies: cardId and the query itself. fetchCardData is stable.
}, [cardId, card?.query, fetchCardData]);
// ...
```

*   **Pros:**
    *   Clear separation of concerns: `ReportSettingsPanel` updates the query, `ReportCard` reacts to the updated query.
    *   Debouncing or other effects (like only fetching if the panel is closed) can be implemented easily within the `ReportCard`'s `useEffect`.
*   **Cons:** The `ReportCard` re-renders when `card.query` changes, which is usually the desired behavior anyway to reflect updates or trigger loading states.

**Recommended Approach:** Option 2 is generally cleaner and more aligned with React's reactive patterns. The `ReportSettingsPanel` focuses on updating the state, and the `ReportCard` (which consumes that state) reacts to those changes by fetching new data. The "Save & Fetch Data" button text in the settings panel implies this immediate refetch.

## Conclusion

Integrating `@neo4j-cypher/react-codemirror` involves installing the package, adding it as a client component to the settings panel, connecting its value and changes to the `useDashboardStore` via local state in the panel and the `updateCard` action. Data refetching is best handled by the existing `useEffect` in the `ReportCard` component, which naturally reacts to changes in the `card.query` state managed by Zustand. This provides a responsive and user-friendly way to allow custom Cypher queries for dashboard cards.
