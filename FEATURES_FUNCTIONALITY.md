# LedgerCore Dashboard: Key Features and Functionality

This document summarizes the key features and functionality of the LedgerCore Dashboard, based on the project's `README.md` and overall application understanding.

## 1. Core Purpose

LedgerCore Dashboard is a **web-based visualization tool** designed to interact with and display data from a **GraphQL API**, specifically for analyzing blockchain data. It aims to provide users with an intuitive interface to explore and understand complex datasets originating from distributed ledgers.

## 2. Dashboarding

The application offers robust dashboarding capabilities, allowing users to organize and interact with various data visualizations.

*   **Grouping Visualizations:** Users can create dashboards that group multiple "reports" or visualizations together. This allows for a consolidated view of different aspects of the data.
*   **Interactions Between Reports:** The `README.md` mentions "interactions between reports," suggesting that visualizations within a dashboard are not static and isolated. This could imply features like:
    *   **Cross-filtering:** Selecting data in one report might filter or highlight data in other reports on the same dashboard.
    *   **Drill-downs:** Users might be able to click on parts of a report to see more detailed information, possibly in another report or view.
    *   The `Dashboard.tsx` component, with its management of pages and reports, supports this concept of a collection of interactive elements.

## 3. Report Types

LedgerCore Dashboard supports a diverse range of report types to visualize data in various formats. As stated in the `README.md`, these include:

*   **Tables:** For displaying structured, row-based data.
*   **Graphs:** General term, likely encompassing various network or relational data visualizations.
*   **Bar Charts:** For comparing categorical data.
*   **Line Charts:** For showing trends over time or continuous data.
*   **Maps:** For visualizing geospatial data, potentially plotting transaction origins/destinations or node locations.
*   **Single Value Displays:** For highlighting key metrics or KPIs.
*   **(Other visualizations)** The list suggests flexibility, and the architecture likely allows for adding new visualization types. The `Card` component in `Dashboard.tsx` dynamically renders reports based on their `type`, which aligns with this.

## 4. Querying and Collaboration

The dashboard provides tools for data exploration and sharing:

*   **Query Editor:** A significant feature is the inclusion of a "query editor." This allows users to directly write and execute queries against the backend GraphQL API. This is a powerful feature for advanced users who want to explore data beyond pre-defined reports or create new visualizations from scratch.
*   **Saving and Sharing Dashboards:** Users can save their customized dashboards (collections of reports, layouts, and configurations). The `README.md` also mentions the ability to "share dashboards," facilitating collaboration among users or teams. The Redux state persistence for `dashboard` state (seen in `store.ts`) likely supports saving dashboard configurations locally, while sharing might involve exporting/importing configurations or a backend mechanism.

## 5. Specific Use Case Example

The `README.md` highlights a specific application: **analysis of the Bitcoin blockchain**. This suggests that LedgerCore is particularly well-suited for, or was initially developed with, the exploration of cryptocurrency and blockchain data in mind. The types of visualizations and the direct query capability would be valuable for tasks like:

*   Tracking transaction patterns.
*   Analyzing network activity.
*   Monitoring wallet balances or smart contract interactions (if applicable to the specific blockchain).

In summary, LedgerCore Dashboard aims to be a comprehensive and interactive platform for users to connect to blockchain data via GraphQL, build custom dashboards with a variety of visualizations, directly query the data, and share their insights.
