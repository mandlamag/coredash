# Shadcn/ui Components and Zustand Actions for Dynamic Dashboard

This document outlines suggested Shadcn/ui components for building the basic UI shells of a dynamic dashboard and details the corresponding Zustand actions based on the design in `ZUSTAND_STORE_DESIGN.md`.

## 1. Shadcn/ui Component List for Basic UI Shells

Shadcn/ui components are well-suited for creating a modern and accessible dashboard interface. They are unstyled by default (brought in via CLI) and can be easily customized with Tailwind CSS.

*   **Main Dashboard Container/Layout:**
    *   **Component:** Not a specific Shadcn/ui component, but rather a composition using standard HTML elements (`div`, `main`, `header`, `aside` etc.) styled with Tailwind CSS.
    *   **Suitability:** Shadcn/ui is designed to work seamlessly with Tailwind CSS. The overall page structure can be defined using Flexbox or CSS Grid, providing flexibility for sidebars, headers, and the main content area. Shadcn/ui components will then populate these structural elements.
    *   **Example:**
        ```html
        <div class="flex h-screen">
          <aside class="w-64 bg-background border-r p-4"> {/* Sidebar for global controls or navigation */} </aside>
          <main class="flex-1 flex flex-col">
            <header class="bg-background border-b p-4"> {/* Header for page titles, global actions */} </header>
            <div class="flex-1 p-4 overflow-auto"> {/* Content Area */} </div>
          </main>
        </div>
        ```

*   **Tab Component for Managing Pages:**
    *   **Components:** `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
    *   **Suitability:** These components provide a clean and accessible way to switch between different dashboard pages. Each `TabsTrigger` can represent a page title, and the corresponding `TabsContent` will hold the grid of cards for that page.
    *   **Example:**
        ```tsx
        // <Tabs value={activePageId} onValueChange={setActivePage}>
        //   <TabsList>
        //     {pages.map(page => <TabsTrigger value={page.id}>{page.title}</TabsTrigger>)}
        //   </TabsList>
        //   {pages.map(page => (
        //     <TabsContent value={page.id}>
        //       {/* Grid Area for Cards for this page */}
        //     </TabsContent>
        //   ))}
        // </Tabs>
        ```

*   **Grid Area for Displaying Cards on a Page:**
    *   **Component:** No direct Shadcn/ui grid system. Use **CSS Grid or Flexbox** for layout. Individual items in the grid will be Shadcn/ui `Card` components.
    *   **Suitability:** CSS Grid is powerful for creating responsive, resizable, and draggable dashboard layouts (potentially with a library like `react-grid-layout` or a custom implementation). Each grid item would be a `Card`.
    *   **Shadcn/ui `Card` Components:** `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`. These are ideal for encapsulating individual reports, charts, or data visualizations.
    *   **Example (Conceptual within a `TabsContent`):**
        ```html
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* {cardsForCurrentPage.map(card => (
            <Card key={card.id}>
              <CardHeader>
                <CardTitle>{card.title}</CardTitle>
                <DropdownMenu> ... actions ... </DropdownMenu>
              </CardHeader>
              <CardContent> {/* Chart or data goes here */} </CardContent>
            </Card>
          ))} */}
        </div>
        ```

*   **Buttons for Actions:**
    *   **Component:** `Button`.
    *   **Suitability:** Versatile for all user actions like "Add Page", "Add Card to Page", "Save Layout", etc. Can be styled with different variants (`default`, `destructive`, `outline`, `ghost`, `link`).
    *   **Example:**
        ```tsx
        // <Button onClick={handleAddPage}>Add Page</Button>
        // <Button variant="outline" onClick={() => handleAddCard(activePageId)}>Add Card</Button>
        ```

*   **Dialogs for Forms/Modals:**
    *   **Components:** `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `Input`, `Label`, `Select`.
    *   **Suitability:** Essential for creating forms to add new pages (prompting for a title) or add/edit cards (selecting type, setting options, defining queries).
    *   **Example:**
        ```tsx
        // <Dialog>
        //   <DialogTrigger asChild><Button>Add New Page</Button></DialogTrigger>
        //   <DialogContent>
        //     <DialogHeader><DialogTitle>Create New Page</DialogTitle></DialogHeader>
        //     {/* Form inputs for page title */}
        //     <DialogFooter><Button type="submit">Create</Button></DialogFooter>
        //   </DialogContent>
        // </Dialog>
        ```

*   **Dropdown Menus for Contextual Actions:**
    *   **Components:** `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`.
    *   **Suitability:** Useful for card-specific actions (e.g., "Edit", "Delete", "Duplicate", "Refresh data") accessible via an icon button on each card.
    *   **Example (within a CardHeader):**
        ```tsx
        // <DropdownMenu>
        //   <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVerticalIcon /></Button></DropdownMenuTrigger>
        //   <DropdownMenuContent>
        //     <DropdownMenuItem onSelect={handleEditCard}>Edit</DropdownMenuItem>
        //     <DropdownMenuItem onSelect={handleDeleteCard}>Delete</DropdownMenuItem>
        //   </DropdownMenuContent>
        // </DropdownMenu>
        ```

## 2. Outline of Basic Zustand Actions

These actions are based on the `useDashboardStore` structure defined in `ZUSTAND_STORE_DESIGN.md`. They include more detail on arguments and state manipulations. (Helper functions like `generateId()` are assumed).

```typescript
// Assumed type definitions from ZUSTAND_STORE_DESIGN.md
// interface DashboardPage { id: string; title: string; }
// interface CardReport { id: string; title: string; type: string; settings: object; query: string; ... }
// interface DashboardState { ... }

// --- Dashboard Structure Actions ---

/**
 * Adds a new page to the dashboard.
 * @param title - The title for the new page.
 */
addPage: (title: string) =>
  set((state) => {
    const newPageId = `page_${generateId()}`; // Helper to generate unique ID
    const newPage: DashboardPage = { id: newPageId, title };
    const newPages = [...state.pages, newPage];
    const newPageOrder = [...state.pageOrder, newPageId];

    return {
      pages: newPages,
      pageOrder: newPageOrder,
      activePageId: state.activePageId ?? newPageId, // Activate if it's the first page
      cardsByPageId: { ...state.cardsByPageId, [newPageId]: [] },
      cardOrderByPageId: { ...state.cardOrderByPageId, [newPageId]: [] },
    };
  }),

/**
 * Sets the currently active (visible) page.
 * @param pageId - The ID of the page to activate.
 */
setActivePage: (pageId: string) => set((state) => {
  if (state.pages.find(p => p.id === pageId)) {
    return { activePageId: pageId };
  }
  return {}; // Or handle error if pageId not found
}),

/**
 * Removes a page and all its associated cards from the dashboard.
 * @param pageIdToRemove - The ID of the page to remove.
 */
removePage: (pageIdToRemove: string) =>
  set((state) => {
    // Cards associated with the page to be removed
    const cardsOnPage = state.cardsByPageId[pageIdToRemove] || [];

    // Filter out the page
    const remainingPages = state.pages.filter((p) => p.id !== pageIdToRemove);
    const remainingPageOrder = state.pageOrder.filter((id) => id !== pageIdToRemove);

    // Remove the page's card list
    const newCardsByPageId = { ...state.cardsByPageId };
    delete newCardsByPageId[pageIdToRemove];
    const newCardOrderByPageId = { ...state.cardOrderByPageId };
    delete newCardOrderByPageId[pageIdToRemove];

    // Remove the details of the cards that were on the deleted page
    const newCardDetailsById = { ...state.cardDetailsById };
    cardsOnPage.forEach(cardId => delete newCardDetailsById[cardId]);

    // Determine the next active page
    let newActivePageId = state.activePageId;
    if (newActivePageId === pageIdToRemove) {
      newActivePageId = remainingPageOrder.length > 0 ? remainingPageOrder[0] : null;
    }

    return {
      pages: remainingPages,
      pageOrder: remainingPageOrder,
      activePageId: newActivePageId,
      cardsByPageId: newCardsByPageId,
      cardOrderByPageId: newCardOrderByPageId,
      cardDetailsById: newCardDetailsById,
    };
  }),

/**
 * Reorders the pages/tabs.
 * @param newPageOrder - An array of page IDs in the new desired order.
 */
reorderPages: (newPageOrder: string[]) => set({ pageOrder: newPageOrder }),


// --- Card/Report Actions ---

/**
 * Adds a new card/report to a specified page.
 * @param pageId - The ID of the page to add the card to.
 * @param cardType - The type of the card (e.g., 'bar', 'line', 'table').
 * @param title - Optional title for the new card.
 * @param position - Optional index to insert the card at.
 */
addCardToPage: (pageId: string, cardType: string, title?: string, position?: number) =>
  set((state) => {
    if (!state.cardsByPageId[pageId]) {
      console.error(`Page with ID ${pageId} not found.`);
      return state;
    }
    const cardId = `card_${generateId()}`; // Helper to generate unique ID
    const newCard: CardReport = {
      id: cardId,
      title: title || `New ${cardType} Card`,
      type: cardType,
      settings: {}, // Default empty settings
      query: '',    // Default empty query
      isLoading: false,
      error: null,
    };

    const newCardDetailsById = { ...state.cardDetailsById, [cardId]: newCard };

    // Add card to the page's list of cards
    const currentPageCards = state.cardsByPageId[pageId]; // This is just a set of IDs for existence
    const newCardsForPageSet = [...currentPageCards, cardId];

    // Add card to the page's ordered list of cards
    const currentCardOrder = state.cardOrderByPageId[pageId] || [];
    let newCardOrderForPage;
    if (position !== undefined && position >= 0 && position <= currentCardOrder.length) {
        newCardOrderForPage = [
            ...currentCardOrder.slice(0, position),
            cardId,
            ...currentCardOrder.slice(position),
        ];
    } else {
        newCardOrderForPage = [...currentCardOrder, cardId];
    }

    return {
      cardDetailsById: newCardDetailsById,
      cardsByPageId: {
        ...state.cardsByPageId,
        [pageId]: newCardsForPageSet,
      },
      cardOrderByPageId: {
        ...state.cardOrderByPageId,
        [pageId]: newCardOrderForPage,
      }
    };
  }),

/**
 * Removes a card from its page and from the store.
 * @param pageId - The ID of the page from which to remove the card.
 * @param cardIdToRemove - The ID of the card to remove.
 */
removeCard: (pageId: string, cardIdToRemove: string) =>
  set((state) => {
    if (!state.cardsByPageId[pageId] || !state.cardsByPageId[pageId].includes(cardIdToRemove)) {
        console.error(`Card with ID ${cardIdToRemove} not found on page ${pageId}.`);
        return state;
    }

    // Remove card from page's card list and ordered list
    const newCardsByPageId = {
      ...state.cardsByPageId,
      [pageId]: state.cardsByPageId[pageId].filter(id => id !== cardIdToRemove),
    };
    const newCardOrderByPageId = {
      ...state.cardOrderByPageId,
      [pageId]: state.cardOrderByPageId[pageId].filter(id => id !== cardIdToRemove),
    };

    // Remove card details
    const newCardDetailsById = { ...state.cardDetailsById };
    delete newCardDetailsById[cardIdToRemove];

    return {
      cardsByPageId: newCardsByPageId,
      cardOrderByPageId: newCardOrderByPageId,
      cardDetailsById: newCardDetailsById,
    };
  }),

/**
 * Updates properties of a specific card.
 * @param cardId - The ID of the card to update.
 * @param updates - An object containing the properties of CardReport to update.
 */
updateCard: (cardId: string, updates: Partial<Omit<CardReport, 'id'>>) =>
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

/**
 * Reorders the cards on a specific page.
 * @param pageId - The ID of the page whose cards are to be reordered.
 * @param newCardOrder - An array of card IDs in the new desired order for that page.
 */
reorderCardsOnPage: (pageId: string, newCardOrder: string[]) =>
  set((state) => {
    if (!state.cardOrderByPageId[pageId]) {
      console.warn(`Page with ID ${pageId} not found for card reordering.`);
      return state;
    }
    // Validate that all card IDs in newCardOrder actually exist for that page
    // const currentPageCardSet = new Set(state.cardsByPageId[pageId]);
    // const newOrderIsValid = newCardOrder.every(cardId => currentPageCardSet.has(cardId));
    // if (!newOrderIsValid || newCardOrder.length !== currentPageCardSet.size) {
    //   console.error("Invalid card order provided for page ${pageId}");
    //   return state;
    // }

    return {
      cardOrderByPageId: {
        ...state.cardOrderByPageId,
        [pageId]: newCardOrder,
      },
    };
  }),

/**
 * Fetches data for a specific card (conceptual async action).
 * @param cardId - The ID of the card to fetch data for.
 */
fetchCardData: async (cardId: string) => {
  const { updateCard, cardDetailsById } = get(); // Access other actions and state
  const card = cardDetailsById[cardId];

  if (!card) {
    console.error(`Card with ID ${cardId} not found for fetching data.`);
    return;
  }

  updateCard(cardId, { isLoading: true, error: null });
  try {
    // const query = card.query;
    // const response = await yourGraphQLApiService(query); // Replace with actual API call
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    const mockData = { result: `Data for query: ${card.query || 'N/A'} - ${Math.random()}` };
    updateCard(cardId, { data: mockData, isLoading: false });
  } catch (error: any) {
    updateCard(cardId, { error: error.message, isLoading: false, data: null });
  }
},

```

This detailed outline provides a solid foundation for implementing the UI shells with Shadcn/ui and managing the dashboard's state with Zustand. Helper functions (like `generateId`) and actual API service calls (`yourGraphQLApiService`) would need to be implemented separately.I have successfully created the `SHADCN_UI_AND_ZUSTAND_ACTIONS.md` file in the previous step.

The file contains:
1.  **Shadcn/ui Component List:**
    *   Main Dashboard Container/Layout: Composition with Tailwind CSS, using HTML elements.
    *   Tab Component: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
    *   Grid Area: CSS Grid/Flexbox with Shadcn/ui `Card` components (`Card`, `CardHeader`, `CardTitle`, `CardContent`).
    *   Action Buttons: `Button`.
    *   Dialogs for Forms: `Dialog`, `DialogTrigger`, `DialogContent`, etc.
    *   Dropdown Menus: `DropdownMenu`, `DropdownMenuTrigger`, etc.
    *   Brief explanations for suitability and example usage are provided for each.

2.  **Outline of Basic Zustand Actions:**
    *   `addPage(title: string)`: Details on ID generation, updating `pages`, `pageOrder`, `activePageId`, `cardsByPageId`, `cardOrderByPageId`.
    *   `setActivePage(pageId: string)`: Details on updating `activePageId`.
    *   `removePage(pageIdToRemove: string)`: Details on removing from `pages`, `pageOrder`, handling `activePageId`, and cleaning up associated cards from `cardsByPageId`, `cardOrderByPageId`, and `cardDetailsById`.
    *   `reorderPages(newPageOrder: string[])`: Details on updating `pageOrder`.
    *   `addCardToPage(pageId: string, cardType: string, title?: string, position?: number)`: Details on card ID generation, creating a default `CardReport` object in `cardDetailsById`, and updating `cardsByPageId[pageId]` and `cardOrderByPageId[pageId]`.
    *   `removeCard(pageId: string, cardIdToRemove: string)`: Details on removing card ID from `cardsByPageId[pageId]`, `cardOrderByPageId[pageId]`, and its details from `cardDetailsById`.
    *   `updateCard(cardId: string, updates: Partial<Omit<CardReport, 'id'>>)`: Details on updating a card in `cardDetailsById`.
    *   `reorderCardsOnPage(pageId: string, newCardOrder: string[])`: Details on updating `cardOrderByPageId[pageId]`.
    *   `fetchCardData(cardId: string)`: Conceptual async action updating `isLoading`, `data`, and `error` for a card.

All requirements from the task description have been met. I will now submit the subtask report.
