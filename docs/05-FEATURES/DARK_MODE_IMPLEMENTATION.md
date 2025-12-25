# Dark Mode Implementation Guide

**Status:** Planned (not implemented)
**Effort:** ~4 hours
**Priority:** Nice-to-have for v2

---

## Executive Summary

Dark mode infrastructure is **90% complete**. The codebase already has CSS variables, `.dark` class definitions, Tailwind semantic colors, and a theme toggle UI. The remaining work is:

1. Wire up the theme toggle to actually apply the `.dark` class
2. Replace ~500 hardcoded gray colors with semantic equivalents

---

## Design Principles

### DO: Soft, Easy on the Eyes

```
Background:     hsl(0, 0%, 7%)      → #121212 (not pure black)
Cards:          hsl(0, 0%, 12%)     → #1f1f1f (subtle elevation)
Borders:        hsl(0, 0%, 20%)     → #333333 (barely visible)
Muted text:     hsl(0, 0%, 65%)     → #a6a6a6 (readable, not harsh)
Primary text:   hsl(0, 0%, 95%)     → #f2f2f2 (not pure white)
```

### DON'T: Sharp Contrast

```
❌ Pure black (#000000) backgrounds - too harsh
❌ Pure white (#ffffff) text - causes eye strain
❌ Neon accent colors - jarring in dark mode
❌ Hard borders with high contrast - visually noisy
```

### Color Temperature

- Keep the same **blue primary** (`hsl(221, 83%, 53%)`) - works in both modes
- Wellness colors (green/amber/red) should be **slightly muted** in dark mode
- Avoid warm grays - stick to **neutral or cool grays** for consistency

---

## Current State

### What's Already Done ✅

**CSS Variables (`packages/ui/src/globals.css`):**
```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 10%;
  --card: 0 0% 100%;
  --primary: 221 83% 53%;
  --secondary: 0 0% 96%;
  --muted: 0 0% 96%;
  --muted-foreground: 0 0% 45%;
  --border: 0 0% 90%;
  /* ... */
}

.dark {
  --background: 0 0% 7%;        /* soft dark, not black */
  --foreground: 0 0% 95%;       /* off-white, not pure white */
  --card: 0 0% 12%;
  --secondary: 0 0% 15%;
  --muted: 0 0% 15%;
  --muted-foreground: 0 0% 65%;
  --border: 0 0% 20%;
  /* ... */
}
```

**Tailwind Config (`packages/ui/tailwind.config.ts`):**
```typescript
colors: {
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
  primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
  secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
  muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
  border: 'hsl(var(--border))',
  // ...
}
```

**Theme Toggle UI (`SettingsView.tsx`):**
- Dropdown with "Light", "Dark", "System" options
- Saves to `settingsStore.theme`
- Persists to SQLite via IPC

---

## What's Missing

### 1. Theme Application Hook

The toggle saves the preference but doesn't apply it. Add to `App.tsx`:

```typescript
// apps/desktop/src/renderer/hub/App.tsx

import { useSettingsStore } from '@lumina/ui';

function App() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const applyTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
      document.documentElement.classList.toggle('dark', isDark);
    };

    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', applyTheme);
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [theme]);

  // ... rest of component
}
```

### 2. Hardcoded Colors to Replace

**Total: ~500 instances across 42 files**

#### Replacement Map

| Hardcoded | Semantic Replacement | Notes |
|-----------|---------------------|-------|
| `bg-white` | `bg-background` | Main backgrounds |
| `bg-gray-50` | `bg-muted/50` | Subtle backgrounds |
| `bg-gray-100` | `bg-secondary` | Card backgrounds |
| `bg-gray-200` | `bg-muted` | Disabled states |
| `bg-gray-800` | `bg-foreground` | Inverted backgrounds |
| `bg-gray-900` | `bg-foreground` | Dark backgrounds |
| `text-gray-400` | `text-muted-foreground/70` | Very muted text |
| `text-gray-500` | `text-muted-foreground` | Muted text |
| `text-gray-600` | `text-muted-foreground` | Secondary text |
| `text-gray-700` | `text-foreground/80` | Near-primary text |
| `text-gray-800` | `text-foreground` | Primary text |
| `text-gray-900` | `text-foreground` | Primary text |
| `border-gray-100` | `border-border/50` | Subtle borders |
| `border-gray-200` | `border-border` | Standard borders |
| `border-gray-300` | `border-border` | Standard borders |

#### Keep As-Is (Semantic Colors)

These colors convey meaning and should NOT change:

```
✅ bg-green-500, text-green-600    → Success/healthy states
✅ bg-amber-500, text-amber-600    → Warning states
✅ bg-red-500, text-red-600        → Error/danger states
✅ bg-blue-500, text-blue-600      → Primary actions
✅ bg-wellness-good/fair/poor      → Already semantic
```

---

## Files to Update (Priority Order)

### Critical (Must Update)

| File | Instances | Notes |
|------|-----------|-------|
| `apps/desktop/src/renderer/hub/App.tsx` | 1 | Add theme hook |
| `apps/desktop/src/renderer/hub/views/SettingsView.tsx` | ~300 | Biggest offender |
| `packages/ui/src/globals.css` | ~10 | Enhance `.dark` styles |

### High Priority

| File | Instances | Notes |
|------|-----------|-------|
| `apps/desktop/src/renderer/hub/AuthScreen.tsx` | ~40 | Login screen |
| `packages/ui/src/components/AlertToast.tsx` | ~25 | Notifications |
| `packages/ui/src/components/EarWaveform.tsx` | ~15 | Charts |
| `packages/ui/src/components/BlinkRateChart.tsx` | ~20 | Charts |
| `packages/ui/src/components/PostureStatusCard.tsx` | ~15 | Cards |
| `packages/ui/src/components/PreBreakToast.tsx` | ~10 | Toasts |

### Medium Priority

| File | Instances |
|------|-----------|
| `apps/desktop/src/renderer/overlay/App.tsx` | ~20 |
| `apps/desktop/src/renderer/status/App.tsx` | ~15 |
| `packages/ui/src/components/onboarding/*.tsx` | ~50 total |
| `packages/ui/src/components/ProductTour/*.tsx` | ~20 total |

### Lower Priority

All other components in `packages/ui/src/components/`

---

## Implementation Steps

### Phase 1: Foundation (30 min)

1. Add theme application hook to `App.tsx`
2. Test toggle works (add `.dark` class to `<html>`)
3. Verify CSS variables switch correctly

### Phase 2: Global Styles (30 min)

1. Review `globals.css` dark mode completeness
2. Add any missing component-level dark styles
3. Ensure scrollbars, selects, inputs all work

### Phase 3: Batch Replace (1.5 hours)

Use VSCode find-and-replace across workspace:

```
Find:    bg-white(?!\S)
Replace: bg-background

Find:    bg-gray-100(?!\S)
Replace: bg-secondary

Find:    text-gray-500(?!\S)
Replace: text-muted-foreground

Find:    border-gray-200(?!\S)
Replace: border-border
```

**Regex flag ON**, review each replacement.

### Phase 4: Manual Review (1 hour)

1. Toggle between light/dark mode
2. Check every major screen:
   - Auth/Login
   - Main monitor view
   - Settings
   - Onboarding flow
   - Alerts/toasts
   - Charts and visualizations
3. Fix contrast issues in charts
4. Ensure no text is unreadable

### Phase 5: Polish (30 min)

1. Smooth transitions between themes:
   ```css
   :root {
     transition: background-color 0.2s ease, color 0.2s ease;
   }
   ```
2. Test "System" preference follows OS
3. Verify persistence across app restart

---

## Chart-Specific Considerations

### EarWaveform

Current: `bg-gray-900` hardcoded
Solution: Use CSS variable or keep dark (waveforms look better on dark)

```typescript
// Option 1: Always dark (looks good in both modes)
className="bg-[#1a1a2e]"

// Option 2: Adapt to theme
className="bg-foreground dark:bg-background"
```

### BlinkRateChart

- Green/amber bars should have **slightly reduced saturation** in dark mode
- Grid lines: use `border-border` (will auto-adapt)
- Axis labels: use `text-muted-foreground`

---

## Accessibility Considerations

### Contrast Ratios (WCAG 2.1 AA)

| Element | Light Mode | Dark Mode | Target |
|---------|------------|-----------|--------|
| Body text | 10:1 | 12:1 | ≥4.5:1 ✅ |
| Muted text | 4.5:1 | 5:1 | ≥4.5:1 ✅ |
| Primary buttons | 4.8:1 | 4.8:1 | ≥4.5:1 ✅ |

### Focus States

Ensure focus rings are visible in both modes:
```css
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

---

## Testing Checklist

- [ ] Theme toggle applies immediately
- [ ] "System" follows OS preference
- [ ] Theme persists after app restart
- [ ] All text readable in both modes
- [ ] Charts have sufficient contrast
- [ ] Toasts/alerts visible in both modes
- [ ] Onboarding flow works in dark mode
- [ ] Meeting mode calibration overlay works
- [ ] No flash of wrong theme on startup

---

## Future Enhancements

### Auto Dark Mode by Time

```typescript
const hour = new Date().getHours();
const isNightTime = hour >= 20 || hour < 6;
// Suggest dark mode at night
```

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    transition: none !important;
  }
}
```

### Per-Component Overrides

For charts that always look better dark:
```typescript
<div className="dark">
  <EarWaveform />
</div>
```

---

## Estimated Effort

| Task | Time |
|------|------|
| Add theme hook | 30 min |
| Update globals.css | 30 min |
| Batch replace colors | 1.5 hours |
| Manual review & fixes | 1 hour |
| Testing | 30 min |
| **Total** | **4 hours** |

---

## Related Files

- `packages/ui/src/globals.css` - CSS variables
- `packages/ui/tailwind.config.ts` - Tailwind theme
- `packages/ui/src/stores/settingsStore.ts` - Theme state
- `apps/desktop/src/renderer/hub/views/SettingsView.tsx` - Toggle UI
- `apps/desktop/src/renderer/hub/App.tsx` - Apply theme

---

**Note:** This is a cosmetic enhancement. Core functionality works without dark mode. Implement when time permits or user feedback requests it.
