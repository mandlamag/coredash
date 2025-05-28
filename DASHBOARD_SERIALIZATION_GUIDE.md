# Guide: Dashboard Serialization (Export/Import JSON)

This guide details how to implement dashboard serialization (exporting the dashboard configuration to a JSON file and importing it back) using the Zustand store (`useDashboardStore`).

## 1. JSON Structure for Export/Import

The exported JSON file will represent the configurable state of the dashboard. Runtime states like fetched data, loading indicators, or error messages for individual cards will be excluded.

The structure should include:

*   **`version`**: A version number for the schema (e.g., `1.0`) to handle future migrations if the structure changes.
*   **`pages`**: An array of `DashboardPage` objects (as defined in `ZUSTAND_STORE_DESIGN.md`).
    *   Example: `[{ id: "page1", title: "Overview" }, ...]`
*   **`pageOrder`**: An array of page IDs, defining the order of tabs.
    *   Example: `["page1", "page2"]`
*   **`activePageId`**: The ID of the currently active page (or `null`).
*   **`cardsByPageId`**: A record mapping page IDs to arrays of card IDs on that page.
    *   Example: `{ "page1": ["cardA", "cardB"], ... }`
*   **`cardOrderByPageId`**: A record mapping page IDs to ordered arrays of card IDs on that page.
    *   Example: `{ "page1": ["cardA", "cardB"], ... }`
*   **`cardDetailsById`**: A record mapping card IDs to their configuration.
    *   **Crucially, each card object in this record should only contain serializable configuration fields**: `id`, `title`, `type`, `settings` (chart-specific configurations), and `query`.
    *   **Exclude runtime fields**: `data`, `isLoading`, `error`, `lastFetched`.
    *   Example:
        ```json
        {
          "cardA": {
            "id": "cardA",
            "title": "Sales Over Time",
            "type": "bar",
            "settings": { "barChart": { "keys": ["sales"], "indexBy": "month" } },
            "query": "GraphQL query for sales..."
          },
          // ... other cards
        }
        ```

**Full Example JSON Structure:**

```json
{
  "version": "1.0",
  "pages": [
    { "id": "p1", "title": "Summary" },
    { "id": "p2", "title": "Details" }
  ],
  "pageOrder": ["p1", "p2"],
  "activePageId": "p1",
  "cardsByPageId": {
    "p1": ["c1"],
    "p2": ["c2", "c3"]
  },
  "cardOrderByPageId": {
    "p1": ["c1"],
    "p2": ["c2", "c3"]
  },
  "cardDetailsById": {
    "c1": {
      "id": "c1",
      "title": "Total Revenue",
      "type": "single-value",
      "settings": {},
      "query": "{ totalRevenue }"
    },
    "c2": {
      "id": "c2",
      "title": "User Signups",
      "type": "line",
      "settings": { "lineChart": { "xScale": "time", "yScale": "linear" } },
      "query": "{ userSignupsByDate }"
    },
    "c3": {
      "id": "c3",
      "title": "Page Views",
      "type": "bar",
      "settings": { "barChart": { "indexBy": "pagePath", "keys": ["views"] } },
      "query": "{ pageViews }"
    }
  }
}
```

## 2. Zustand Action for Exporting Dashboard

This action retrieves the current dashboard state, strips runtime card details, and triggers a JSON file download.

**In `useDashboardStore.ts`:**

```typescript
// ... (inside create<DashboardState>((set, get) => ({ ...

  exportDashboardToJson: () => {
    const {
      pages,
      pageOrder,
      activePageId,
      cardsByPageId,
      cardOrderByPageId,
      cardDetailsById,
    } = get(); // Get current state

    // Create a "clean" version of cardDetailsById for export
    const exportableCardDetails: Record<string, Omit<CardReport, 'data' | 'isLoading' | 'error' | 'lastFetched'>> = {};
    for (const cardId in cardDetailsById) {
      const card = cardDetailsById[cardId];
      // Explicitly pick only serializable fields
      exportableCardDetails[cardId] = {
        id: card.id,
        title: card.title,
        type: card.type,
        settings: card.settings, // Assuming settings are serializable
        query: card.query,
      };
    }

    const dashboardJson = {
      version: "1.0", // Add a version for future compatibility
      pages,
      pageOrder,
      activePageId,
      cardsByPageId,
      cardOrderByPageId,
      cardDetailsById: exportableCardDetails,
    };

    try {
      const jsonString = JSON.stringify(dashboardJson, null, 2); // Pretty print
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dashboard_export_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log("Dashboard exported successfully.");
    } catch (error) {
      console.error("Error exporting dashboard:", error);
      // Optionally, update store with an error message for UI display
      // set({ exportError: 'Failed to export dashboard.' });
    }
  },

// ...
```

## 3. Zustand Action for Importing Dashboard

This action parses a JSON string, validates it, resets the current dashboard state, and rehydrates the store with the imported configuration.

**In `useDashboardStore.ts`:**

```typescript
// ... (inside create<DashboardState>((set, get) => ({ ...

  importDashboardFromJson: (jsonString: string) => {
    try {
      const importedDashboard = JSON.parse(jsonString);

      // --- Basic Validation ---
      if (!importedDashboard || typeof importedDashboard !== 'object') {
        throw new Error("Invalid JSON format.");
      }
      if (importedDashboard.version !== "1.0") { // Example version check
        // Potentially handle migrations or throw error for incompatible versions
        console.warn(`Importing dashboard with version ${importedDashboard.version}, expected 1.0. Compatibility issues may arise.`);
      }
      if (!importedDashboard.pages || !importedDashboard.pageOrder || !importedDashboard.cardDetailsById) {
        throw new Error("Missing essential dashboard structure (pages, pageOrder, cardDetailsById).");
      }

      // --- Rehydrate Card Details with Runtime Fields ---
      const rehydratedCardDetailsById: Record<string, CardReport> = {};
      for (const cardId in importedDashboard.cardDetailsById) {
        const importedCardConfig = importedDashboard.cardDetailsById[cardId];
        rehydratedCardDetailsById[cardId] = {
          ...importedCardConfig, // Spread serializable fields: id, title, type, settings, query
          // Initialize runtime fields
          data: null,
          isLoading: false,
          error: null,
          lastFetched: null,
        };
      }

      // --- Reset and Update Store State ---
      set({
        pages: importedDashboard.pages,
        pageOrder: importedDashboard.pageOrder,
        activePageId: importedDashboard.activePageId || (importedDashboard.pageOrder.length > 0 ? importedDashboard.pageOrder[0] : null),
        cardsByPageId: importedDashboard.cardsByPageId || {},
        cardOrderByPageId: importedDashboard.cardOrderByPageId || {},
        cardDetailsById: rehydratedCardDetailsById,
        // Reset any error/status fields related to import/export
        // importError: null,
      }, true); // 'true' replaces the entire state, useful here for a full overwrite.

      console.log("Dashboard imported successfully.");
      // Optional: Trigger a refetch for the active page's cards or all cards
      // const activePage = get().pages.find(p => p.id === get().activePageId);
      // if (activePage) {
      //   const cardsOnActivePage = get().cardsByPageId[activePage.id] || [];
      //   cardsOnActivePage.forEach(cardId => get().fetchCardData(cardId));
      // }

    } catch (error: any) {
      console.error("Error importing dashboard:", error);
      // Update store with an error message for UI display
      set({ importError: error.message || 'Failed to import dashboard.' });
    }
  },

// ...
```

**Key points for `importDashboardFromJson`:**

*   **Validation:** Performs basic checks on the JSON structure and version. More robust validation (e.g., using a schema validation library like Zod or Yup) is recommended for production.
*   **State Reset:** Uses `set({ ... }, true)` to replace the relevant parts of the dashboard state. This ensures a clean import.
*   **Rehydration of Cards:** Iterates through `cardDetailsById` from the imported JSON and explicitly adds back the non-serializable runtime fields (`data`, `isLoading`, `error`, `lastFetched`), initializing them to their default states. This is crucial for the `ReportCard` components to function correctly after import.
*   **Error Handling:** Catches parsing or validation errors and can set an error state in the store for UI feedback.

## 4. UI for Export/Import (using Shadcn/ui)

Provide UI elements for users to trigger these actions.

**Conceptual React Component (`DashboardActions.tsx`):**

```tsx
'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
// import { DownloadIcon, UploadIcon } from 'lucide-react'; // Example icons
import useDashboardStore from '@/store/dashboardStore';
// For toast notifications (optional)
// import { useToast } from "@/components/ui/use-toast";

const DashboardActions: React.FC = () => {
  const { exportDashboardToJson, importDashboardFromJson } = useDashboardStore();
  // const { toast } = useToast(); // Optional for user feedback

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportDashboardToJson();
    // toast({ title: "Dashboard Exported", description: "Your dashboard configuration has been downloaded." });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click(); // Trigger hidden file input
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json") {
      // toast({ variant: "destructive", title: "Import Error", description: "Please select a valid .json file." });
      console.error("Invalid file type. Please select a .json file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonString = e.target?.result as string;
        importDashboardFromJson(jsonString); // Call Zustand action
        // toast({ title: "Dashboard Imported", description: "Your dashboard has been restored." });
      } catch (error) {
        console.error("Error reading or parsing file:", error);
        // toast({ variant: "destructive", title: "Import Error", description: "Failed to read or parse the dashboard file." });
      }
    };
    reader.onerror = () => {
      console.error("Error reading file:", reader.error);
      // toast({ variant: "destructive", title: "Import Error", description: "Failed to read the file." });
    };
    reader.readAsText(file);

    // Reset file input to allow importing the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex space-x-2">
      <Button onClick={handleExport} variant="outline">
        {/* <DownloadIcon className="mr-2 h-4 w-4" /> */}
        Export Dashboard
      </Button>
      <Button onClick={handleImportClick} variant="outline">
        {/* <UploadIcon className="mr-2 h-4 w-4" /> */}
        Import Dashboard
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleFileChange}
        className="hidden" // Style as needed or keep hidden
      />
    </div>
  );
};

export default DashboardActions;
```

**Key UI Aspects:**

*   **Export Button:** A simple Shadcn `Button` that calls `exportDashboardToJson()` when clicked.
*   **Import Button:**
    *   A visible Shadcn `Button` ("Import Dashboard").
    *   A hidden `<input type="file" accept=".json">`.
    *   Clicking the visible button programmatically clicks the hidden file input.
    *   The `onChange` event of the file input triggers `handleFileChange`.
*   **File Reading:** `FileReader` API is used to read the content of the selected JSON file as a string.
*   **Passing to Action:** The read JSON string is then passed to the `importDashboardFromJson` Zustand action.
*   **User Feedback:** (Optional but recommended) Use Shadcn `Toast` or other notification methods to inform the user about the success or failure of export/import operations.

This setup provides a complete workflow for users to save and load their dashboard configurations. Remember to include appropriate error handling and user feedback for a good user experience.
