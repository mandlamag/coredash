# Zustand Store Design for Dashboard Module

This document outlines a conceptual design for Zustand stores to manage the state of the dashboard module. The design prioritizes a single, comprehensive store for ease of managing interconnected state, while allowing for selective updates and subscriptions inherent to Zustand.

## Proposed Store: `useDashboardStore`

A single store named `useDashboardStore` is proposed to manage all dashboard-related states. This approach simplifies state management by keeping related data in one place, making it easier to perform complex operations like adding or deleting pages and their associated cards.

The store will be structured with distinct "slices" or sections for clarity and organization.

### State Structure and Key Variables

```typescript
import { create } from 'zustand';

// Interface definitions for clarity (conceptual)
interface DashboardPage {
  id: string;
  title: string;
  // Potentially other page-specific settings
}

interface CardReport {
  id: string;
  title: string;
  type: string; // e.g., 'bar', 'line', 'table', 'single-value'
  settings: Record<string, any>; // Visualization-specific settings
  query: string; // The query to fetch data for this card
  data?: any; // Fetched data for the report
  isLoading: boolean;
  error?: string | null;
  // Potentially other card-specific settings like dimensions, position
}

interface DashboardState {
  // 1. Dashboard Structure
  pages: DashboardPage[];
  activePageId: string | null;
  pageOrder: string[]; // Array of page IDs to maintain order

  // 2. Page Structure (mapping page IDs to their cards)
  // Stores an array of card IDs for each page ID
  cardsByPageId: Record<string, string[]>;
  // Stores the order of cards for each page ID
  cardOrderByPageId: Record<string, string[]>;


  // 3. Card/Report Details (mapping card IDs to their full details)
  cardDetailsById: Record<string, CardReport>;

  // Actions (conceptual examples)
  addPage: (page: DashboardPage) => void;
  setActivePage: (pageId: string) => void;
  removePage: (pageId: string) => void; // This would also need to handle removing associated cards
  reorderPages: (newPageOrder: string[]) => void;

  addCardToPage: (pageId: string, card: CardReport, position?: number) => void;
  removeCard: (cardId: string) => void; // This would also need to handle removing card from its page
  updateCard: (cardId: string, updates: Partial<CardReport>) => void;
  reorderCardsOnPage: (pageId: string, newCardOrder: string[]) => void;
  fetchCardData: (cardId: string) => Promise<void>; // Example async action
}

// Conceptual Zustand store definition
const useDashboardStore = create<DashboardState>((set, get) => ({
  // Initial State
  pages: [],
  activePageId: null,
  pageOrder: [],
  cardsByPageId: {},
  cardOrderByPageId: {},
  cardDetailsById: {},

  // --- Actions ---

  // Dashboard Structure Actions
  addPage: (page) =>
    set((state) => {
      const newPages = [...state.pages, page];
      const newPageOrder = [...state.pageOrder, page.id];
      return {
        pages: newPages,
        pageOrder: newPageOrder,
        activePageId: state.activePageId ?? page.id, // Activate first page added
        cardsByPageId: { ...state.cardsByPageId, [page.id]: [] }, // Initialize cards for new page
        cardOrderByPageId: { ...state.cardOrderByPageId, [page.id]: [] }, // Initialize card order for new page
      };
    }),

  setActivePage: (pageId) => set({ activePageId: pageId }),

  removePage: (pageId) =>
    set((state) => {
      // Collect all card IDs associated with the page to be removed
      const cardsToRemove = state.cardsByPageId[pageId] || [];

      // Create a new cardDetailsById object excluding the cards to be removed
      const newCardDetailsById = { ...state.cardDetailsById };
      cardsToRemove.forEach(cardId => delete newCardDetailsById[cardId]);

      // Create new cardsByPageId and cardOrderByPageId objects excluding the removed page
      const newCardsByPageId = { ...state.cardsByPageId };
      delete newCardsByPageId[pageId];
      const newCardOrderByPageId = { ...state.cardOrderByPageId };
      delete newCardOrderByPageId[pageId];

      return {
        pages: state.pages.filter((p) => p.id !== pageId),
        pageOrder: state.pageOrder.filter((id) => id !== pageId),
        activePageId: state.activePageId === pageId ? state.pageOrder.find(id => id !== pageId) || null : state.activePageId,
        cardsByPageId: newCardsByPageId,
        cardOrderByPageId: newCardOrderByPageId,
        cardDetailsById: newCardDetailsById,
      };
    }),

  reorderPages: (newPageOrder) => set({ pageOrder: newPageOrder }),

  // Card/Report Actions
  addCardToPage: (pageId, card, position) =>
    set((state) => {
      if (!state.cardsByPageId[pageId]) {
        console.warn(`Page with ID ${pageId} not found. Cannot add card.`);
        return state; // Or handle error appropriately
      }
      const newCardDetailsById = { ...state.cardDetailsById, [card.id]: card };
      const currentPageCards = state.cardsByPageId[pageId] || [];
      const currentPageCardOrder = state.cardOrderByPageId[pageId] || [];

      let newPageCardOrder;
      if (position !== undefined && position >= 0 && position <= currentPageCardOrder.length) {
        newPageCardOrder = [
          ...currentPageCardOrder.slice(0, position),
          card.id,
          ...currentPageCardOrder.slice(position),
        ];
      } else {
        newPageCardOrder = [...currentPageCardOrder, card.id];
      }

      return {
        cardDetailsById: newCardDetailsById,
        cardsByPageId: {
          ...state.cardsByPageId,
          [pageId]: [...currentPageCards, card.id], // Keep a simple list for existence check
        },
        cardOrderByPageId: {
          ...state.cardOrderByPageId,
          [pageId]: newPageCardOrder,
        }
      };
    }),

  removeCard: (cardIdToRemove) =>
    set((state) => {
      const newCardDetailsById = { ...state.cardDetailsById };
      delete newCardDetailsById[cardIdToRemove];

      const newCardsByPageId = { ...state.cardsByPageId };
      const newCardOrderByPageId = { ...state.cardOrderByPageId };

      // Find which page contains this card and remove it
      for (const pageId in newCardsByPageId) {
        if (newCardsByPageId[pageId].includes(cardIdToRemove)) {
          newCardsByPageId[pageId] = newCardsByPageId[pageId].filter(id => id !== cardIdToRemove);
          newCardOrderByPageId[pageId] = newCardOrderByPageId[pageId].filter(id => id !== cardIdToRemove);
          break; // Assuming card IDs are unique across pages
        }
      }

      return {
        cardDetailsById: newCardDetailsById,
        cardsByPageId: newCardsByPageId,
        cardOrderByPageId: newCardOrderByPageId,
      };
    }),

  updateCard: (cardId, updates) =>
    set((state) => {
      if (!state.cardDetailsById[cardId]) {
        console.warn(`Card with ID ${cardId} not found. Cannot update.`);
        return state;
      }
      return {
        cardDetailsById: {
          ...state.cardDetailsById,
          [cardId]: { ...state.cardDetailsById[cardId], ...updates },
        },
      };
    }),

  reorderCardsOnPage: (pageId, newCardOrder) =>
    set((state) => {
      if (!state.cardOrderByPageId[pageId]) {
        console.warn(`Page with ID ${pageId} not found for card reordering.`);
        return state;
      }
      return {
        cardOrderByPageId: {
          ...state.cardOrderByPageId,
          [pageId]: newCardOrder,
        },
      };
    }),

  // Example of an async action for fetching data
  fetchCardData: async (cardId) => {
    const { updateCard } = get(); // Access other actions
    updateCard(cardId, { isLoading: true, error: null });
    try {
      // const query = get().cardDetailsById[cardId]?.query;
      // const response = await yourGraphQLApiService(query); // Replace with actual API call
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockData = { value: Math.random() * 100 }; // Replace with actual data
      updateCard(cardId, { data: mockData, isLoading: false });
    } catch (error: any) {
      updateCard(cardId, { error: error.message, isLoading: false });
    }
  },
}));

export default useDashboardStore;
```

### Explanation of Suitability

This single-store structure with normalized data is well-suited for the dynamic nature of the dashboard:

1.  **Centralized State Management:**
    *   Having pages, their card lists, and card details in one store simplifies actions that affect multiple parts of the state. For example, when a page is deleted, its associated cards and their details can be cleaned up in the same action (`removePage`).
    *   It makes it easier to maintain consistency and relationships between different entities (pages and cards).

2.  **Normalized Data:**
    *   **`pages` (Array of `DashboardPage` objects):** Directly stores page information.
    *   **`pageOrder` (Array of `string` (page IDs)):** Manages the display order of pages/tabs, allowing for easy reordering.
    *   **`cardsByPageId` (Record<`string`, `string[]`>):** Maps a page ID to an array of its card IDs. This defines the parent-child relationship between pages and cards.
    *   **`cardOrderByPageId` (Record<`string`, `string[]`>):** Maps a page ID to an ordered array of its card IDs. This is crucial for maintaining the layout and order of cards within a specific page, especially for features like drag-and-drop reordering of cards.
    *   **`cardDetailsById` (Record<`string`, `CardReport`>):** Stores the actual data and settings for each card, indexed by a unique card ID. This avoids data duplication if a card were to (hypothetically) appear on multiple pages or if its details are needed independently. Updates to a card's details only need to happen in one place.

3.  **Dynamic Creation and Modification:**
    *   **Adding Pages/Cards:** New pages can be added to the `pages` array and `pageOrder`. New cards can be added to `cardDetailsById`, and their IDs can be added to the appropriate page in `cardsByPageId` and `cardOrderByPageId`.
    *   **Removing Pages/Cards:** Removing a page involves removing its entry from `pages` and `pageOrder`, and then using `cardsByPageId` to identify and remove all associated cards from `cardDetailsById`, and finally cleaning up entries in `cardsByPageId` and `cardOrderByPageId`. Removing a card involves removing it from `cardDetailsById` and then updating the relevant page's entry in `cardsByPageId` and `cardOrderByPageId`.
    *   **Reordering:** Reordering pages is a simple update to the `pageOrder` array. Reordering cards on a page is an update to the specific page's array in `cardOrderByPageId`.

4.  **Performance and Selectivity (Zustand Specific):**
    *   Zustand allows components to subscribe to specific parts of the store. Even though it's a single store, a component displaying a single card can subscribe only to updates for that specific card's details in `cardDetailsById[cardId]`.
    *   A component rendering page tabs would only subscribe to `pages` and `pageOrder`.
    *   This minimizes re-renders compared to a more monolithic state object in other state management libraries if not handled carefully.

5.  **Extensibility:**
    *   New properties or settings for pages or cards can be easily added to their respective interfaces (`DashboardPage`, `CardReport`) and managed within the existing structure.
    *   More complex interactions (e.g., linking cards, global dashboard settings) can be layered on top of this foundational structure.

This design provides a robust and flexible foundation for managing the dashboard's state, accommodating dynamic content and interactions efficiently. The conceptual actions provided illustrate how common operations would manipulate these state variables.
