# Documentation & Help System Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plan

**Goal:** Make all instructions, notes, changelogs, and hints accessible in the UI through a sidebar help panel and inline contextual help elements.

**Architecture:** Markdown-based documentation files are organized via a manifest file and dynamically loaded into a help sidebar. Inline "?" icons throughout the UI provide quick contextual tips that link to comprehensive docs in the sidebar.

**Tech Stack:** Next.js, React, TypeScript, Markdown files, JSON manifest, TailwindCSS for styling

---

## Architecture Overview

The system consists of three integrated components:

1. **Markdown-based Documentation** - Existing docs files (ADAPTERS.md, TESTING.md, etc.) live in the repo and are the single source of truth
2. **Help Sidebar Panel** - Right-side collapsible panel that dynamically loads and displays organized documentation with hierarchical navigation
3. **Inline Help Elements** - Tooltips and "?" icons scattered throughout the UI that explain individual features without opening the full sidebar

**Data Flow:**
- Documentation markdown files are bundled with the app at build time
- A metadata file (`docs/docs-manifest.json`) defines the sidebar structure, grouping, and which markdown files go where
- The UI reads the manifest and loads markdown on demand, rendering to HTML
- No backend calls needed - everything is static content bundled with the app

**Key Benefits:**
- Documentation is version-controlled and deployed with code
- Changes to docs are PR-reviewed like regular code
- Markdown is human-readable and easy to edit
- No database or CMS needed - pure static content
- Can be hosted from the same server as the app

---

## Help Sidebar Organization & UX

The sidebar is accessed via a help icon (?) in the top-right corner of the app and can be toggled on/off. It has a fixed width (~350px) and scrollable content. The structure is hierarchical with collapsible sections:

**Top-level categories (from docs-manifest.json):**
1. **Getting Started** - How to use the app, basic workflow
2. **Features** - Detailed guides for each feature (uploading PDFs, grid layouts, etc.)
3. **Adapter System** - Complete guide to discovering and using adapters
4. **Testing** - How to run tests, test results, CI/CD info
5. **API Reference** - Technical docs for developers
6. **Changelog** - Version history, recent updates
7. **Troubleshooting** - FAQ, common issues, solutions
8. **Tips & Tricks** - Best practices, hints for power users

Each category can expand/collapse and contains linked markdown pages. Clicking a link renders the markdown content in the sidebar (or below it). Basic navigation includes breadcrumbs and "back" button.

**Basic search** (optional, nice-to-have): Simple text search across all documentation headings/titles that filters the sidebar tree.

---

## Inline Help Elements & Integration

Throughout the main interface, strategic "?" icons appear next to important features and buttons. These provide quick, contextual tips without opening the full sidebar.

**Inline help types:**
1. **Tooltips** - Hover over "?" to see a 1-2 sentence explanation (e.g., "Grid Layout: Arrange images in a grid pattern. Choose 3x2, 2x3, 4x1, or 2x2")
2. **Popover hints** - Click "?" for slightly longer hints with a "Learn more" link that opens the relevant sidebar section
3. **Field descriptions** - Small gray text below form inputs explaining what to do (e.g., under file upload: "Upload 2-10 PDF files to combine")

**Key placements:**
- Next to "Grid Layout" selector → links to Features/Grid Layouts section
- Next to "Upload files" button → links to Getting Started/Uploading
- Next to "Discover Adapter" button → links to Adapter System/Discovery
- Next to test result indicators → links to Testing section
- Throughout forms and dialogs → contextual explanations

**Implementation:**
- Inline help content stored in a separate `docs/help-content.json` file (short tips only)
- Longer "Learn more" content points back to full markdown docs in sidebar
- Help icons styled consistently (light color, cursor: help)

---

## Implementation Structure

**New files to create:**

1. **`docs/docs-manifest.json`** - Defines the sidebar structure, maps categories to markdown files, and metadata
2. **`docs/help-content.json`** - Stores short inline help text for "?" icons throughout the UI
3. **`app/components/HelpSidebar.tsx`** - React component that renders the help sidebar panel
4. **`app/components/HelpIcon.tsx`** - Reusable component for "?" icons with tooltips/popovers
5. **`app/hooks/useDocumentation.ts`** - Hook to load and parse markdown documentation

**Existing files to leverage:**
- `docs/ADAPTERS.md` - Maps to "Adapter System" section
- `docs/TESTING.md` - Maps to "Testing" section
- `README.md` - Maps to "Getting Started"
- Any other existing markdown docs

**Build process:**
- During build, markdown files are parsed and bundled with the app
- `docs-manifest.json` defines the organization structure
- At runtime, the UI loads markdown on demand and renders to HTML
- Everything is static - no API calls needed

**Integration points:**
- Help sidebar available on all pages via top-right icon
- Inline help elements can be added to any component via `<HelpIcon>` wrapper
- Help content is responsive and works on mobile (sidebar becomes a modal or bottom sheet)

---

## User Experience Flow

1. **New User Discovery:** User sees "?" icon in top-right, clicks to explore docs
   - Sidebar opens showing "Getting Started" expanded
   - User reads "Uploading PDFs" guide
   - Closes sidebar and follows instructions

2. **Feature-Specific Help:** User clicks upload button, notices "?" icon nearby
   - Hovers to see quick tooltip
   - Clicks for longer explanation with "Learn more" link
   - Opens sidebar to relevant section for details

3. **Developer Reference:** Developer opens app, needs adapter API docs
   - Clicks help icon, navigates to "API Reference"
   - Browses adapter endpoints and examples

---

**Design Status:** ✅ Validated and ready for implementation planning

**Next Step:** Create detailed implementation plan with task breakdown using superpowers:writing-plans
