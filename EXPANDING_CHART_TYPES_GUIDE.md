# Guide: Expanding Chart/Report Types in Dashboard

This guide outlines the process for adding new chart or report types to the dashboard module, using the integration of a **Table visualization** with Shadcn/ui's `Table` component as a specific example.

## 1. General Steps for Adding a New Chart/Report Type (Recap)

Adding a new visualization type generally follows these steps:

1.  **Identify Visualization Component:** Choose the React component for rendering (e.g., a Nivo chart, a custom component, or a Shadcn/ui component like `Table`).
2.  **Define State & Settings:**
    *   Determine what specific settings this chart type needs (e.g., axes configuration for a bar chart, column definitions for a table).
    *   Define a structure for these settings within the Zustand store, typically namespaced under `cardDetailsById[cardId].settings.<newChartType>Settings` (e.g., `settings.tableSettings`).
    *   Specify the initial state for these settings when a new card of this type is created.
3.  **Implement Rendering in `ReportCard`:**
    *   Add a new `case` to the `switch` statement (or equivalent logic) in `ReportCard.tsx`'s rendering function for the new `cardType`.
    *   This case will render the chosen visualization component, passing it the fetched `data` and relevant settings from the Zustand store.
4.  **Build Settings Panel UI:**
    *   Extend `ReportSettingsPanel.tsx` to include UI elements for configuring the new chart type's specific settings.
    *   These UI elements will update the local state in the panel, which is then saved to the Zustand store via the `updateCard` action.
5.  **Handle Data Transformation/Presentation:**
    *   Implement any necessary data transformations or client-side operations (like filtering, sorting, pagination for a table) based on the fetched data and the configured settings. This can happen within the `ReportCard` or through selectors/utility functions.

## 2. Example: Integrating a Table Visualization

Let's illustrate this by adding a configurable Table visualization using Shadcn/ui's `Table` components.

### A. Visualization Component

We'll use Shadcn/ui's `Table` components:
*   `<Table>`: The main table container.
*   `<TableHeader>`: Contains the header row.
*   `<TableRow>`: Represents a row.
*   `<TableHead>`: A header cell.
*   `<TableBody>`: Contains the data rows.
*   `<TableCell>`: A data cell.

### B. Zustand Store Settings (`settings.tableSettings`)

For a table, we might want to configure columns, pagination, and search functionality.

**In `useDashboardStore.ts` (conceptual addition to `CardReport` interface):**

```typescript
// Within CardReport interface in your Zustand store definition
interface CardReport {
  // ... other properties
  settings: {
    // ... other chart type settings like barChart, lineChart
    tableSettings?: {
      columns: Array<{
        key: string;      // Key from the data object
        header: string;   // Display name for the column header
        type?: 'string' | 'number' | 'date'; // Optional: for formatting or sorting
      }>;
      itemsPerPage: number;
      enableSearch: boolean;
      // Potentially defaultSortColumn, defaultSortDirection, etc.
    };
  };
}

// Initial state for tableSettings when a 'table' card is created:
// (Inside addCardToPage action in useDashboardStore.ts)
// ...
if (cardType === 'table') {
  newCard.settings.tableSettings = {
    columns: [], // Or attempt to infer from first data item if data is pre-loaded
    itemsPerPage: 10,
    enableSearch: false,
  };
}
// ...
```

### C. `ReportCard` Rendering Logic for Table

Modify `ReportCard.tsx` to render the Shadcn `Table` when `cardType` is 'table'.

**File:** `src/components/dashboard/ReportCard.tsx` (Conceptual Additions)

```tsx
// ... (existing imports)
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption, // Optional
} from "@/components/ui/table"; // Shadcn Table components
import { Input } from "@/components/ui/input"; // For search
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"; // For pagination

// ... (inside ReportCard component, within renderContent function)

const renderContent = () => {
  // ... (isLoading, error, no query/data handling as before)

  switch (cardType) {
    case 'bar':
      // ... (bar chart rendering)
      break;

    case 'table':
      const tableSettings = settings?.tableSettings || { columns: [], itemsPerPage: 10, enableSearch: false };
      const rawData = Array.isArray(data) ? data : [];

      // --- Client-side Search (Basic Example) ---
      const [searchTerm, setSearchTerm] = useState('');
      const filteredData = tableSettings.enableSearch && searchTerm
        ? rawData.filter(item =>
            tableSettings.columns.some(col =>
              String(item[col.key]).toLowerCase().includes(searchTerm.toLowerCase())
            )
          )
        : rawData;

      // --- Client-side Pagination ---
      const [currentPage, setCurrentPage] = useState(1);
      const totalPages = Math.ceil(filteredData.length / tableSettings.itemsPerPage);
      const paginatedData = filteredData.slice(
        (currentPage - 1) * tableSettings.itemsPerPage,
        currentPage * tableSettings.itemsPerPage
      );

      if (tableSettings.columns.length === 0) {
        return <p className="text-muted-foreground">Table columns not configured. Please edit settings.</p>;
      }

      return (
        <div className="w-full h-full flex flex-col">
          {tableSettings.enableSearch && (
            <Input
              placeholder="Search table..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} // Reset page on search
              className="mb-2 max-w-sm"
            />
          )}
          <div className="flex-grow overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  {tableSettings.columns.map((col) => (
                    <TableHead key={col.key}>{col.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.length > 0 ? (
                  paginatedData.map((item, rowIndex) => (
                    <TableRow key={`row-${rowIndex}`}>
                      {tableSettings.columns.map((col) => (
                        <TableCell key={`${col.key}-${rowIndex}`}>
                          {item[col.key] !== undefined && item[col.key] !== null ? String(item[col.key]) : 'N/A'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={tableSettings.columns.length} className="text-center">
                      No data to display.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeftIcon className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      );

    default:
      return <div className="text-center text-muted-foreground">Unsupported chart type: {cardType}</div>;
  }
};
// ...
```

### D. Settings Panel (for Table)

Extend `ReportSettingsPanel.tsx` to include controls for `tableSettings`.

**File:** `src/components/dashboard/ReportSettingsPanel.tsx` (Conceptual Additions)

```tsx
// ... (existing imports)
import { Switch } from "@/components/ui/switch"; // For boolean toggles
import { TrashIcon } from "lucide-react"; // For deleting columns

// ... (inside ReportSettingsPanel component)

  // Local state for table settings
  const initialTableSettings = currentSettings?.tableSettings || { columns: [], itemsPerPage: 10, enableSearch: false };
  const [tableColumns, setTableColumns] = useState(initialTableSettings.columns);
  const [itemsPerPage, setItemsPerPage] = useState(initialTableSettings.itemsPerPage);
  const [enableSearch, setEnableSearch] = useState(initialTableSettings.enableSearch);

  useEffect(() => {
    // ... (resetting other settings like title, barChart settings)
    const newTableSettings = currentSettings?.tableSettings || { columns: [], itemsPerPage: 10, enableSearch: false };
    setTableColumns(newTableSettings.columns);
    setItemsPerPage(newTableSettings.itemsPerPage);
    setEnableSearch(newTableSettings.enableSearch);
  }, [currentSettings, cardType]);

  const handleSaveChanges = () => {
    let newSettings = { ...currentSettings }; // Preserve settings for other chart types

    if (cardType === 'table') {
      newSettings.tableSettings = { columns: tableColumns, itemsPerPage, enableSearch };
    }
    // else if (cardType === 'bar') { newSettings.barChart = { ... } }

    const updatedCardDetails: Partial<Pick<CardReport, 'title' | 'settings' | 'query'>> = {
      title: title, // General card title (if it's part of local state)
      settings: newSettings,
      query: currentQuery, // If query editor is used
    };
    updateCard(cardId, updatedCardDetails);
    onClose();
  };

  // --- Column Management Functions for Table Settings ---
  const handleAddTableColumn = () => {
    setTableColumns([...tableColumns, { key: '', header: '', type: 'string' }]);
  };

  const handleTableColumnChange = (index: number, field: 'key' | 'header', value: string) => {
    const updatedColumns = tableColumns.map((col, i) =>
      i === index ? { ...col, [field]: value } : col
    );
    setTableColumns(updatedColumns);
  };

  const handleRemoveTableColumn = (index: number) => {
    setTableColumns(tableColumns.filter((_, i) => i !== index));
  };

  const renderTableSettings = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Table Columns</Label>
        {tableColumns.map((col, index) => (
          <div key={index} className="flex items-center space-x-2 mt-2 p-2 border rounded-md">
            <Input
              placeholder="Data Key"
              value={col.key}
              onChange={(e) => handleTableColumnChange(index, 'key', e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Header Text"
              value={col.header}
              onChange={(e) => handleTableColumnChange(index, 'header', e.target.value)}
              className="flex-1"
            />
            {/* Optional: Select for column type */}
            <Button variant="ghost" size="icon" onClick={() => handleRemoveTableColumn(index)}>
              <TrashIcon className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={handleAddTableColumn} className="mt-2">
          Add Column
        </Button>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="settings-itemsPerPage">Items Per Page</Label>
        <Input
          id="settings-itemsPerPage"
          type="number"
          value={itemsPerPage}
          onChange={(e) => setItemsPerPage(Math.max(1, parseInt(e.target.value, 10) || 1))}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="settings-enableSearch"
          checked={enableSearch}
          onCheckedChange={setEnableSearch}
        />
        <Label htmlFor="settings-enableSearch">Enable Search Bar</Label>
      </div>
    </div>
  );

// ... (inside the main return of ReportSettingsPanel)
// Modify to include the new settings section:
// <div className="grid gap-4 py-4">
//   <div className="grid gap-2">
//     <Label htmlFor="settings-title">Card Title</Label>
//     <Input id="settings-title" value={title} onChange={(e) => setTitle(e.target.value)} />
//   </div>
//
//   {cardType === 'bar' && renderBarChartSettings()}
//   {cardType === 'table' && renderTableSettings()}
//   {/* ... other chart types or custom query editor ... */}
// </div>
// ...
```

### E. Data Handling for Tables

*   **Data Format:** Assume `data` fetched via GraphQL is an array of flat objects, e.g., `[{ id: 1, name: 'Alice', age: 30 }, { id: 2, name: 'Bob', age: 24 }]`.
*   **Filtering (Search):** Implemented client-side in the `ReportCard`'s rendering logic. The search term filters the raw data before pagination. For large datasets, server-side filtering via GraphQL variables would be more performant.
*   **Pagination:** Implemented client-side in the `ReportCard`. The `paginatedData` is a slice of the (potentially filtered) data.
*   **Sorting:** Not shown for brevity, but could be added with local state for sort key and direction, and a sort function applied before pagination. Column headers could be made clickable to trigger sorting.

## Conclusion

Expanding chart/report types involves a consistent pattern of defining settings, updating the `ReportCard` to render the new type, and enhancing the `ReportSettingsPanel` to manage these settings. By namespacing settings within the Zustand store (e.g., `card.settings.tableSettings`), the system remains organized and scalable for various visualization needs. Client-side data manipulation like pagination and search can be handled within the `ReportCard` for smaller datasets, while larger datasets might require server-side operations via GraphQL.
