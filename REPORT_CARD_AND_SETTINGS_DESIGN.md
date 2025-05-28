# ReportCard Component and Settings Panel Design

This document outlines the conceptual design for a `ReportCard` React component and its associated basic settings panel, specifically tailored for displaying a Nivo Bar Chart. This design assumes a Next.js client component (`'use client'`) context and leverages Shadcn/ui components.

## 1. `ReportCard` Component Design

The `ReportCard` component is responsible for rendering an individual chart or report within the dashboard grid. It receives its data and configuration via props, which are derived from the Zustand store.

**File:** `src/components/dashboard/ReportCard.tsx` (Conceptual)

```tsx
'use client';

import React, { useState } from 'react';
import { ResponsiveBar } from '@nivo/bar'; // Specific Nivo component
// Import other Nivo chart types as needed for dynamic rendering
// import { ResponsiveLine } from '@nivo/line';
// import { ResponsivePie } from '@nivo/pie';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'; // Shadcn
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, SettingsIcon } from 'lucide-react'; // Icons
import useDashboardStore, { CardReport } from '@/store/dashboardStore'; // Zustand store

// Import the Settings Panel component
// import { ReportSettingsPanel } from './ReportSettingsPanel';

// Props for the ReportCard, derived from cardDetailsById[cardId] in Zustand
interface ReportCardProps extends CardReport {
  // cardId is already part of CardReport
  // cardType is already part of CardReport
  // title is already part of CardReport
  // settings is already part of CardReport
  // data is already part of CardReport
  // isLoading is already part of CardReport
  // error is already part of CardReport
}

const ReportCard: React.FC<ReportCardProps> = ({
  id: cardId, // Renaming for clarity within the component
  cardType,
  title,
  settings,
  data,
  isLoading,
  error,
}) => {
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const { fetchCardData } = useDashboardStore(); // For a refresh button

  const renderChart = () => {
    if (!data) {
      return <div className="text-center text-muted-foreground">No data available.</div>;
    }

    // --- Data Transformation (Example for Nivo Bar Chart) ---
    // Nivo Bar often expects data in an array of objects, e.g.,
    // [{ "country": "AD", "hot dog": 190, "burger": 150, ... }, ...]
    // The 'keys' prop for <ResponsiveBar> would be ["hot dog", "burger"]
    // The 'indexBy' prop would be "country"
    // 'settings' from Zustand should ideally store these (keys, indexBy)
    // For this example, let's assume data is pre-formatted or settings guide formatting.

    const barSettings = settings?.barChart || {}; // Namespace settings by chart type

    switch (cardType) {
      case 'bar':
        // Ensure data is an array before passing to Nivo
        const chartData = Array.isArray(data) ? data : [];
        return (
          <div style={{ height: '300px' }}> {/* Nivo charts often need explicit height */}
            <ResponsiveBar
              data={chartData}
              keys={barSettings.keys || ['value']} // e.g., ['value1', 'value2'] from settings
              indexBy={barSettings.indexBy || 'id'} // e.g., 'category' from settings
              margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
              padding={0.3}
              colors={{ scheme: barSettings.colorScheme || 'nivo' }} // e.g., 'nivo', 'category10'
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: barSettings.xAxisTickRotation ?? 0, // Example setting
                legend: barSettings.xAxisLegend || '',
                legendPosition: 'middle',
                legendOffset: 32,
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: barSettings.yAxisLegend || 'Value', // Example setting
                legendPosition: 'middle',
                legendOffset: -40,
              }}
              // ... other Nivo Bar Chart props configured via 'settings'
            />
          </div>
        );
      // case 'line':
      //   return <ResponsiveLine data={data} {...settings.lineChart} />;
      // case 'table':
      //   return <DataTable data={data} {...settings.tableChart} />;
      default:
        return <div className="text-center text-muted-foreground">Unsupported chart type: {cardType}</div>;
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsPanelOpen(true)}
            aria-label="Open settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </Button>
          {/* Placeholder for Refresh Button */}
          {/* <Button variant="ghost" size="icon" onClick={() => fetchCardData(cardId)} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button> */}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading data...</p>
          </div>
        )}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center h-full text-destructive">
            <AlertTriangle className="h-8 w-8" />
            <p className="mt-2">Error loading data: {error}</p>
            <Button variant="link" onClick={() => fetchCardData(cardId)}>Try again</Button>
          </div>
        )}
        {!isLoading && !error && renderChart()}
      </CardContent>
      {/* Optional CardFooter for additional info or actions */}
      {/* <CardFooter> <p>Last updated: ...</p> </CardFooter> */}

      {/* {isSettingsPanelOpen && (
        <ReportSettingsPanel
          cardId={cardId}
          cardType={cardType}
          currentSettings={settings}
          isOpen={isSettingsPanelOpen}
          onClose={() => setIsSettingsPanelOpen(false)}
        />
      )} */}
    </Card>
  );
};

export default ReportCard;
```

**Key Aspects:**

*   **Props:** Receives all necessary details for a card (`id`, `cardType`, `title`, `settings`, `data`, `isLoading`, `error`) directly from the Zustand store's `cardDetailsById[cardId]` object.
*   **Dynamic Rendering:** A `switch` statement (or a more sophisticated dynamic import mechanism) based on `cardType` determines which Nivo (or other) chart component to render. The example focuses on `ResponsiveBar`.
*   **Loading/Error States:** Displays a spinner (`Loader2`) during `isLoading` and an error message (`AlertTriangle`) with a retry option if `error` is present.
*   **Settings Trigger:** A `SettingsIcon` button will toggle the `isSettingsPanelOpen` state, which would conditionally render the `ReportSettingsPanel`.
*   **Data Transformation:**
    *   Nivo charts have specific data format expectations. For `ResponsiveBar`, data is typically an array of objects.
    *   The `settings` prop (from Zustand) should ideally contain Nivo-specific configurations like `keys` (which series to plot from the data objects) and `indexBy` (the key to use for categories/labels on one axis).
    *   The component might need to perform minor transformations or rely on the data being structured correctly by the data fetching logic, guided by these settings. For example, ensuring `data` is an array.

## 2. Basic Settings Panel Design

The settings panel allows users to customize the appearance and data mapping for a specific `ReportCard`.

**File:** `src/components/dashboard/ReportSettingsPanel.tsx` (Conceptual)

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'; // Or Sheet for a side panel
// import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useDashboardStore, { CardReportSettings } from '@/store/dashboardStore'; // Assuming CardReportSettings is part of store types

interface ReportSettingsPanelProps {
  cardId: string;
  cardType: string; // To show relevant settings
  currentSettings: CardReportSettings; // The 'settings' object for this card from Zustand
  isOpen: boolean;
  onClose: () => void;
}

export const ReportSettingsPanel: React.FC<ReportSettingsPanelProps> = ({
  cardId,
  cardType,
  currentSettings,
  isOpen,
  onClose,
}) => {
  const { updateCard } = useDashboardStore(); // Get the action to update card details

  // Local state for form inputs, initialized from currentSettings
  // Namespace settings by chart type to avoid conflicts, e.g., currentSettings.barChart.title
  const initialBarChartSettings = currentSettings?.barChart || {};
  const [title, setTitle] = useState(currentSettings?.title || ''); // General card title
  const [xAxisKey, setXAxisKey] = useState(initialBarChartSettings?.indexBy || 'category');
  const [yAxisKeys, setYAxisKeys] = useState((initialBarChartSettings?.keys || ['value']).join(', ')); // Storing as comma-separated string for input
  const [colorScheme, setColorScheme] = useState(initialBarChartSettings?.colorScheme || 'nivo');
  // Add more settings specific to the bar chart as needed

  useEffect(() => {
    // Reset local state if currentSettings change from outside (e.g., another user updates)
    const barSettings = currentSettings?.barChart || {};
    setTitle(currentSettings?.title || '');
    setXAxisKey(barSettings?.indexBy || 'category');
    setYAxisKeys((barSettings?.keys || ['value']).join(', '));
    setColorScheme(barSettings?.colorScheme || 'nivo');
  }, [currentSettings, cardType]);

  const handleSaveChanges = () => {
    const updatedCardDetails: Partial<Pick<CardReport, 'title' | 'settings'>> = {
      title: title, // Update general card title
      settings: {
        ...currentSettings, // Preserve other settings (e.g., for other chart types)
        barChart: { // Update only bar chart specific settings
          ...(currentSettings?.barChart || {}),
          indexBy: xAxisKey,
          keys: yAxisKeys.split(',').map(k => k.trim()).filter(k => k), // Convert back to array
          colorScheme: colorScheme,
        },
      },
    };
    updateCard(cardId, updatedCardDetails);
    onClose(); // Close the panel
  };

  // Render settings specific to 'bar' chart type
  const renderBarChartSettings = () => (
    <>
      <div className="grid gap-2">
        <Label htmlFor="settings-xaxis">X-axis Key (indexBy)</Label>
        <Input id="settings-xaxis" value={xAxisKey} onChange={(e) => setXAxisKey(e.target.value)} placeholder="e.g., categoryName" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="settings-yaxis">Y-axis Keys (comma-separated)</Label>
        <Input id="settings-yaxis" value={yAxisKeys} onChange={(e) => setYAxisKeys(e.target.value)} placeholder="e.g., value1, value2" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="settings-color">Color Scheme</Label>
        <Select value={colorScheme} onValueChange={setColorScheme}>
          <SelectTrigger id="settings-color">
            <SelectValue placeholder="Select color scheme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nivo">Nivo</SelectItem>
            <SelectItem value="category10">Category10</SelectItem>
            <SelectItem value="spectral">Spectral</SelectItem>
            <SelectItem value="blues">Blues</SelectItem>
            {/* Add more Nivo schemes */}
          </SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}> {/* Or <Sheet open={isOpen} ...> */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Settings: {currentSettings?.title || 'Report'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="settings-title">Card Title</Label>
            <Input id="settings-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {cardType === 'bar' && renderBarChartSettings()}
          {/* Add sections for other chart types:
            else if (cardType === 'line') { renderLineChartSettings(); }
          */}
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline" onClick={onClose}>Cancel</Button></DialogClose>
          <Button onClick={handleSaveChanges}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

**Key Aspects:**

*   **Triggering Mechanism:** The `ReportSettingsPanel` is opened by the `ReportCard` when its "Settings" button is clicked (toggling `isSettingsPanelOpen` which controls the `isOpen` prop of the panel).
*   **Shadcn/ui Components:**
    *   **Panel:** `Dialog` is used for a modal overlay. `Sheet` could be an alternative for a side panel.
    *   **Inputs:** `Input` for text fields (title, X/Y axis keys), `Label` for associating text with inputs, and `Select` for predefined choices like color schemes.
*   **Settings to Include (Bar Chart Focus):**
    *   **Card Title:** General title for the `ReportCard`.
    *   **X-axis Data Key (`indexBy`):** The key in data objects that Nivo uses for the main categories/bars.
    *   **Y-axis Data Keys (`keys`):** An array of keys in data objects representing the values to plot for each bar (can be multiple for grouped/stacked bars). The input takes a comma-separated string for simplicity.
    *   **Color Scheme:** A `Select` to choose from a few predefined Nivo color schemes.
*   **State Interaction:**
    *   The panel maintains local state for its form inputs, initialized from `currentSettings`.
    *   When "Save Changes" is clicked, `handleSaveChanges` constructs an `updatedCardDetails` object. This object includes the general card title and a namespaced `settings.barChart` object (to avoid overwriting settings for other potential chart types on the same card if the type were switchable).
    *   It then calls the `updateCard(cardId, updatedCardDetails)` action from the Zustand store to persist these changes. The `updateCard` action in Zustand would merge these settings into the `cardDetailsById[cardId].settings` object.
*   **Dynamic Settings Fields:** The panel can conditionally render settings fields based on `cardType` (e.g., `renderBarChartSettings()` is only called if `cardType === 'bar'`).

This design provides a solid foundation for user-configurable report cards within the dashboard. More advanced settings and data transformations can be built upon this structure.I have successfully created the `REPORT_CARD_AND_SETTINGS_DESIGN.md` file in the previous step.

The file contains:

1.  **`ReportCard` Component Design (`'use client'`):**
    *   **Props:** Defined to match `CardReport` interface from Zustand store (`id`, `cardType`, `title`, `settings`, `data`, `isLoading`, `error`).
    *   **Internal Logic:**
        *   Dynamic rendering based on `cardType` with a focus on `@nivo/bar`.
        *   Handling of `isLoading` (shows `Loader2`) and `error` states (shows `AlertTriangle` and error message).
        *   Placeholder for a "Settings" button (`SettingsIcon`) to toggle the settings panel.
    *   **Data Transformation:** Briefly mentions how Nivo Bar Chart expects data and how `settings` (like `keys`, `indexBy`) from Zustand would guide this, with an example of ensuring data is an array.

2.  **Basic Settings Panel Design (using Shadcn/ui):**
    *   **Triggering Mechanism:** Opened from the `ReportCard`'s settings button, controlling an `isOpen` prop for the panel component.
    *   **Shadcn/ui Components:** Suggests `Dialog` (or `Sheet`) for the panel, `Input` for text, `Label`, and `Select` for predefined options.
    *   **Settings to Include (Bar Chart):**
        *   Chart Title (`Input`).
        *   X-axis data key (`indexBy`) (`Input`).
        *   Y-axis data keys (`keys`) (`Input`, comma-separated).
        *   Color scheme (`Select` with Nivo schemes).
    *   **State Interaction:**
        *   Panel uses local state for form inputs, initialized from `currentSettings` prop.
        *   On save, it calls `updateCard(cardId, updatedDetails)` action from Zustand store.
        *   `updatedDetails` includes the general card title and namespaced `settings.barChart` to avoid conflicts.
        *   Conditional rendering of settings fields based on `cardType` is mentioned.

Illustrative conceptual React/JSX snippets are provided for both the `ReportCard` and the `ReportSettingsPanel`.

All requirements from the task description have been met. I will now submit the subtask report.
