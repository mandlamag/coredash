# LedgerCore Dashboard Styling Guide

This guide outlines how to apply the Shadcn UI-inspired styling to the LedgerCore Dashboard components. The styling approach focuses on clean, modern design with consistent spacing, typography, and color usage.

## Table of Contents
1. [Typography](#typography)
2. [Color Scheme](#color-scheme)
3. [Component Styling](#component-styling)
4. [Responsive Design](#responsive-design)
5. [Implementation Guide](#implementation-guide)

## Typography

### Font Family
We use the Inter font family as our primary typeface, with system fallbacks:

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
```

### Typography Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Heading 1 | 2rem (32px) | 700 | 1.2 |
| Heading 2 | 1.5rem (24px) | 700 | 1.2 |
| Heading 3 | 1.25rem (20px) | 600 | 1.2 |
| Body | 1rem (16px) | 400 | 1.5 |
| Small | 0.875rem (14px) | 400 | 1.5 |
| Tiny | 0.75rem (12px) | 400 | 1.5 |

## Color Scheme

The LedgerCore color scheme uses a neutral base with orange as the primary brand color:

### Light Mode
```css
--background: 0 0% 100%;        /* White */
--foreground: 240 10% 3.9%;     /* Near black */
--primary: 24 100% 50%;         /* Orange */
--border: 240 5.9% 90%;         /* Light gray */
```

### Dark Mode
```css
--background: 240 10% 3.9%;     /* Near black */
--foreground: 0 0% 98%;         /* Off-white */
--primary: 24 100% 50%;         /* Orange */
--border: 240 3.7% 15.9%;       /* Dark gray */
```

## Component Styling

### Cards
Cards use subtle borders, rounded corners, and minimal shadows:

```css
.shadcn-card {
  border-radius: var(--radius);
  background-color: hsl(var(--card));
  color: hsl(var(--card-foreground));
  box-shadow: var(--shadow);
  border: 1px solid hsl(var(--border));
  overflow: hidden;
}
```

### Buttons
Buttons have consistent height, padding, and hover states:

```css
.shadcn-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  font-weight: 500;
  font-size: 0.875rem;
  height: 2.5rem;
  padding-left: 1rem;
  padding-right: 1rem;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Tabs
Tabs use a simple underline style for active states:

```css
.shadcn-tabs-trigger[data-state="active"] {
  color: hsl(var(--primary));
  border-bottom-color: hsl(var(--primary));
}
```

## Responsive Design

The design system is built to be responsive with these breakpoints:

| Breakpoint | Width |
|------------|-------|
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

## Implementation Guide

### 1. Import the CSS

Add the following to your main CSS file:

```css
@import './styles/shadcn-inspired.css';
```

### 2. Apply to Components

#### Card Example
```jsx
<div className="shadcn-card">
  <div className="shadcn-card-header">
    <h3 className="shadcn-card-title">Bitcoin Transactions</h3>
    <p className="shadcn-card-description">Recent transaction activity</p>
  </div>
  <div className="shadcn-card-content">
    {/* Card content here */}
  </div>
  <div className="shadcn-card-footer">
    <button className="shadcn-button shadcn-button-primary">View All</button>
  </div>
</div>
```

#### Button Example
```jsx
<button className="shadcn-button shadcn-button-primary">
  View Transactions
</button>

<button className="shadcn-button shadcn-button-secondary">
  Cancel
</button>
```

#### Tabs Example
```jsx
<div className="shadcn-tabs">
  <div className="shadcn-tabs-list">
    <button className="shadcn-tabs-trigger" data-state="active">Overview</button>
    <button className="shadcn-tabs-trigger">Transactions</button>
    <button className="shadcn-tabs-trigger">Analytics</button>
  </div>
  <div className="shadcn-tabs-content">
    {/* Tab content here */}
  </div>
</div>
```

### 3. Dark Mode Support

The styling automatically supports dark mode when the `.dark` class is applied to an ancestor element (typically the `html` or `body` tag).

To toggle dark mode:

```jsx
document.documentElement.classList.toggle('dark');
```

## Best Practices

1. **Consistent Spacing**: Use multiples of 4px for spacing (0.25rem, 0.5rem, 1rem, etc.)
2. **Color Usage**: Stick to the defined color palette
3. **Typography**: Follow the type scale for consistent text sizing
4. **Borders & Shadows**: Use subtle borders and shadows for depth
5. **Animations**: Keep transitions short (150-300ms) and subtle
