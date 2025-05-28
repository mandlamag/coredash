# Guide: Drag-and-Drop Card Reordering with @dnd-kit

This guide details how to implement drag-and-drop functionality for reordering `ReportCard` components within a page in the dashboard module, using `@dnd-kit`. It assumes the existing Zustand store structure (`useDashboardStore`) with `cardOrderByPageId` and the `reorderCardsOnPage` action.

## 1. Installation

First, install the necessary packages from `@dnd-kit`:

```bash
yarn add @dnd-kit/core @dnd-kit/sortable
# Optional, but often useful for utilities like arrayMove:
yarn add @dnd-kit/utilities
```

## 2. Core Concepts of `@dnd-kit` (Briefly)

*   **`DndContext`**: The main provider component that sets up the drag-and-drop context. It requires an `onDragEnd` handler (and others like `onDragStart`, `onDragOver` for more complex scenarios).
*   **`SortableContext`**: Used for lists where items can be reordered. It requires an `items` prop (an array of unique IDs for the sortable items) and a sorting `strategy` (e.g., `verticalListSortingStrategy`, `horizontalListSortingStrategy`, `rectSortingStrategy`).
*   **`useSortable`**: A hook used by individual draggable items within a `SortableContext`. It provides:
    *   `attributes`: ARIA attributes for accessibility.
    *   `listeners`: Event handlers to attach to the draggable element (or a drag handle).
    *   `setNodeRef`: A ref to attach to the draggable DOM node.
    *   `transform`: CSS transform values (for position during drag).
    *   `transition`: CSS transition values (for smooth animations).
    *   `isDragging`: A boolean indicating if the item is currently being dragged.
*   **Event Handlers**:
    *   **`onDragEnd`**: This is the most crucial handler for reordering. It fires after a drag operation finishes and provides `active` (the dragged item) and `over` (the droppable area or item it was dropped on) objects, both containing the `id` of the items.

## 3. Integration into the Card Grid (Page View)

Let's assume you have a component that renders the grid of cards for the currently active page, perhaps named `ActivePageContent.tsx` or similar. This component will be modified to integrate `@dnd-kit`.

**File:** `src/components/dashboard/ActivePageContent.tsx` (Conceptual)

```tsx
'use client';

import React from 'react';
import useDashboardStore from '@/store/dashboardStore';
import ReportCard from './ReportCard'; // Your existing ReportCard component

import {
  DndContext,
  closestCenter, // Or closestCorners, rectIntersection, etc.
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy, // Good for grids
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities'; // For transform/transition utilities

// Wrapper for ReportCard to make it sortable
interface SortableReportCardProps {
  id: string; // Card ID
  // Potentially other props to pass to ReportCard if not directly selected in ReportCard via ID
}

const SortableReportCard: React.FC<SortableReportCardProps> = ({ id }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform), // Or CSS.Translate.toString(transform)
    transition,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 10 : undefined, // Ensure dragging item is on top
    // Add a border or shadow when dragging for better visual feedback
    boxShadow: isDragging ? '0 0 10px rgba(0,0,0,0.2)' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* Pass the actual cardId to ReportCard for it to fetch its details from Zustand */}
      <ReportCard cardId={id} pageId="" /* pageId might not be needed by ReportCard directly */ />
    </div>
  );
};


const ActivePageContent: React.FC = () => {
  const activePageId = useDashboardStore((state) => state.activePageId);
  // Get the ordered list of card IDs for the active page
  const cardOrder = useDashboardStore((state) =>
    activePageId ? state.cardOrderByPageId[activePageId] || [] : []
  );
  const reorderCardsOnPage = useDashboardStore((state) => state.reorderCardsOnPage);

  const sensors = useSensors(
    useSensor(PointerSensor), // For mouse/touch interactions
    useSensor(KeyboardSensor, { // For keyboard accessibility
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (activePageId && over && active.id !== over.id) {
      const oldIndex = cardOrder.indexOf(active.id as string);
      const newIndex = cardOrder.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(cardOrder, oldIndex, newIndex);
        reorderCardsOnPage(activePageId, newOrder); // Update Zustand store
      }
    }
  };

  if (!activePageId) {
    return <div className="p-4">Please select a page.</div>;
  }

  if (cardOrder.length === 0) {
    return <div className="p-4">This page is empty. Add some cards!</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter} // Adjust strategy as needed
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
          {cardOrder.map((cardId) => (
            <SortableReportCard key={cardId} id={cardId} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default ActivePageContent;
```

**Key Changes:**

*   **`SortableReportCard` Wrapper:** A new component `SortableReportCard` is created. It uses the `useSortable` hook and applies the necessary `ref`, `style` (for `transform` and `transition`), `attributes`, and `listeners` to its root `div`. It then renders the actual `ReportCard` inside.
*   **`DndContext`:** Wraps the entire sortable area. It's configured with sensors (Pointer and Keyboard) and the `onDragEnd` handler.
*   **`SortableContext`:** Wraps the direct parent of the sortable items.
    *   `items={cardOrder}`: This is crucial. It must be an array of the unique IDs of the sortable items, in their current order.
    *   `strategy={rectSortingStrategy}`: Suitable for grid layouts where items can move horizontally and vertically. Other strategies like `verticalListSortingStrategy` exist for simple lists.
*   **Rendering:** The grid now maps over `cardOrder` (from `cardOrderByPageId[activePageId]`) to render `SortableReportCard` components, passing the `cardId` as the `id` prop.

## 4. Updating Zustand Store

The `handleDragEnd` function is responsible for updating the card order in the Zustand store.

```typescript
// Inside ActivePageContent.tsx

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  // Ensure activePageId is present and an item was actually moved over another
  if (activePageId && over && active.id !== over.id) {
    const currentCardOrder = useDashboardStore.getState().cardOrderByPageId[activePageId] || [];
    
    const oldIndex = currentCardOrder.indexOf(active.id as string);
    const newIndex = currentCardOrder.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Use arrayMove utility from @dnd-kit/sortable for robust reordering
      const newOrder = arrayMove(currentCardOrder, oldIndex, newIndex);
      
      // Call the Zustand action to update the store
      reorderCardsOnPage(activePageId, newOrder);
    }
  }
};
```

**Explanation:**

1.  The `event` object provides `active.id` (the ID of the card being dragged) and `over.id` (the ID of the card it was dropped onto).
2.  It checks if `active.id` and `over.id` are different. If they are the same, no reordering occurred.
3.  It finds the `oldIndex` and `newIndex` of these cards in the current `cardOrder` array from Zustand.
4.  `arrayMove(cardOrder, oldIndex, newIndex)` (from `@dnd-kit/sortable`) is used to create a new array with the moved item. This utility handles edge cases correctly.
5.  Finally, `reorderCardsOnPage(activePageId, newOrder)` (the existing Zustand action) is called to update the `cardOrderByPageId[activePageId]` in the store. React will then re-render the list based on the new order from the store.

The `reorderCardsOnPage` action in `useDashboardStore` (as defined in `ZUSTAND_STORE_DESIGN.md`) should simply update the state:

```typescript
// In useDashboardStore.ts
// reorderCardsOnPage: (pageId, newCardOrder) =>
//   set((state) => {
//     if (!state.cardOrderByPageId[pageId]) { /* ... */ return state; }
//     return {
//       cardOrderByPageId: {
//         ...state.cardOrderByPageId,
//         [pageId]: newCardOrder,
//       },
//     };
//   }),
```

## 5. Visual Feedback during Drag

*   **Transform and Transition:** The `transform` and `transition` styles returned by `useSortable` are applied to the `SortableReportCard`. This makes the card follow the cursor and animate smoothly into its new position. `CSS.Transform.toString(transform)` or `CSS.Translate.toString(transform)` from `@dnd-kit/utilities` helps convert the transform object to a CSS string.
*   **`isDragging` State:** The `isDragging` boolean from `useSortable` can be used to apply additional styles to the card being dragged (e.g., reduced opacity, box shadow, different background color) for better visual indication.
*   **Drag Overlay (Optional):** For more complex drag previews or to prevent layout shifts in the original item, `@dnd-kit` offers a `<DragOverlay>` component. This allows rendering a custom component that follows the cursor while the original item remains in place or is styled differently. This is more advanced and might not be needed for basic card reordering.

## 6. Accessibility

`@dnd-kit` is designed with accessibility in mind.

*   **Keyboard Support:** By using `KeyboardSensor` and `sortableKeyboardCoordinates`, users can reorder items using the keyboard (typically Tab to focus, Space/Enter to pick up/drop, and arrow keys to move).
*   **ARIA Attributes:** The `attributes` provided by `useSortable` include necessary ARIA attributes (like `role`, `aria-roledescription`, `aria-describedby`) to make the interactions understandable to screen reader users.
*   Ensure that your draggable items (or their drag handles) are focusable.
*   Refer to the `@dnd-kit` documentation for best practices on accessible drag-and-drop implementations.

This setup provides a robust and accessible way for users to reorder cards within a page, with the changes persisted in the Zustand store. Remember to test thoroughly across different devices and input methods.
