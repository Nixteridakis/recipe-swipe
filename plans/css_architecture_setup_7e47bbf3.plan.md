# CSS Architecture Plan

## Layer Strategy

| Layer | Purpose | Specificity |

|-------|---------|-------------|

| `reset` | Modern CSS reset (box-sizing, margins) | Lowest |

| `base` | Element defaults (body, headings, links) | Low |

| `tokens` | Custom properties (colors, spacing, fonts) | N/A |

| `components` | Component styles (.recipe-card, .btn) | Medium |

| `utilities` | Single-purpose helpers (.sr-only) | Highest |

## File Structure

```javascript
app/
├── globals.css          # Layer declarations + imports
styles/
├── reset.css            # Modern reset
├── tokens.css           # Design tokens (colors, spacing, typography)
├── base.css             # Element defaults
├── components/
│   ├── button.css
│   ├── card.css
│   ├── header.css
│   └── ...
└── utilities.css        # Utility classes
```

## Design Tokens ([styles/tokens.css](styles/tokens.css))

```css
@layer tokens {
  :root {
    /* Colors - Light theme */
    --color-bg: oklch(98% 0.01 90);
    --color-surface: oklch(100% 0 0);
    --color-text: oklch(20% 0.02 260);
    --color-text-muted: oklch(45% 0.02 260);
    --color-primary: oklch(55% 0.18 145); /* Green - food/fresh */
    --color-primary-hover: oklch(48% 0.18 145);
    --color-accent: oklch(70% 0.15 55); /* Warm orange */
    --color-border: oklch(88% 0.01 260);

    /* Spacing scale */
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-6: 1.5rem;
    --space-8: 2rem;
    --space-12: 3rem;

    /* Typography */
    --font-sans: system-ui, -apple-system, sans-serif;
    --font-display: "Fraunces", Georgia, serif;

    /* Radii */
    --radius-sm: 0.25rem;
    --radius-md: 0.5rem;
    --radius-lg: 1rem;

    /* Shadows */
    --shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.05);
    --shadow-md: 0 4px 6px oklch(0% 0 0 / 0.07);
  }

  [data-theme="dark"] {
    --color-bg: oklch(15% 0.02 260);
    --color-surface: oklch(20% 0.02 260);
    --color-text: oklch(92% 0.01 90);
    --color-text-muted: oklch(65% 0.01 90);
    --color-border: oklch(30% 0.02 260);
  }
}
```

## Theme Toggle Implementation

1. Store preference in localStorage

2. Apply `data-theme` attribute to `<html>`

3. Default to system preference via `prefers-color-scheme`

```tsx
// hooks/useTheme.ts
// Reads/writes localStorage, applies data-theme attribute
// Returns { theme, toggleTheme, systemPreference }
```

## Changes Required

1. **Remove Tailwind**

- Delete `@tailwindcss/postcss` and `tailwindcss` from [package.json](package.json)

- Remove Tailwind import from [app/globals.css](app/globals.css)

- Update [postcss.config.mjs](postcss.config.mjs) (may become unnecessary)

2. **Create CSS files**

- [styles/reset.css](styles/reset.css) - Modern reset (Andy Bell or similar)
- [styles/tokens.css](styles/tokens.css) - Custom properties
- [styles/base.css](styles/base.css) - Element defaults

- [styles/utilities.css](styles/utilities.css) - Helper classes

- [styles/components/](styles/components/) - Component styles

3. **Update globals.css**

- Declare layers in order
- Import all stylesheets

4. **Add theme hook**

- [hooks/useTheme.ts](hooks/useTheme.ts) - Theme state management

- Script in `<head>` to prevent flash (set theme before render)

5. **Add display font** (optional)

- Fraunces from Google Fonts for headings (or pick another)

## Modern CSS Features to Use

- **Container queries** for recipe cards (responsive without media queries)

- **`:has()`** for selection states (`.card:has(input:checked)`)

- **CSS nesting** for component organization
