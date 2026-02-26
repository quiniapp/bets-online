# Under Construction Page — Design Document

**Date:** 2026-02-26
**Platform:** Arenabet
**Branch:** add-in-construction-page

## Summary

Replace the current landing page (`/`) with a polished "under construction" page while the platform is being built. The page will live in a reusable feature component so it can be easily swapped out or reused in other routes later.

## Design Decisions

- **Style:** Dark, premium, minimalist — black background with a subtle gold glow, centered layout, no header/footer
- **Approach:** Reusable feature component imported into `page.tsx` (not inline)
- **Animation:** Slow CSS pulse on the background glow — subtle, not distracting
- **No external dependencies** — Tailwind CSS only, server component

## File Structure

```
web/
├── feature/
│   └── under-construction/
│       └── index.tsx          ← New: full UI component
└── app/
    └── page.tsx               ← Modified: renders <UnderConstructionPage />
```

## Visual Layout (top to bottom, full screen centered)

1. **Background** — black (`#000`) with a radial gold glow pulsing slowly at center
2. **Brand name** — `ARENABET` large, white, GeistSans — with a gold accent element
3. **Status label** — `"Sitio en construcción"` medium, light gray
4. **Decorative line** — thin gold horizontal rule
5. **Secondary message** — `"Estamos preparando algo grande. Volvé pronto."` small, muted gray

## Technical Notes

- Server component (no `"use client"` needed)
- Uses GeistSans variable font already configured in `layout.tsx`
- Gold color: `#D4AF37`
- Background pulse via `@keyframes` in Tailwind arbitrary CSS or inline style
- `layout.tsx` and `ClientLayout` remain untouched
