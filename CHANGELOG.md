# Changelog - UniTask

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning: **V.R.E** (Version.Rama.Etapa).

---

## [14.7.0] - 2026-06-02

### Added
- **UniVisio Sessions**: Introduced persistent, project-scoped sessions for UniVisio diagrams and analysis.
- **Firestore Integration**: Built full CRUD operations and `isDirty` state protection to ensure progress isn't lost on project switch.
- **Session Management UI**: Save Modals, Load Selectors, and intuitive project associations added to the UniVisio dashboard.

---

## [14.6.0] - 2026-06-02

### Added
- **UniVisio Narrative Mode**: Introduced a new "Relato" view mode that renders workflows as hierarchical narrative cards.
- **Auto-generated Closing Artifacts**: Added global aggregation for Entity State Matrix and Interface Registry directly computed from flow nodes.
- **Enhanced Gemini Prompt**: Updated `actions.ts` schema and prompt to explicitly request `subtitle`, `systems`, `stateChanges`, `conditionalPaths`, `interfaceRefs`, `isLoop`, and `operativeDesc` for accurate narrative generation.

---

## [13.1.1] - 2026-01-28

### Added
- **Dynamic Label System for Master Data**: Implemented centralized `useMasterDataLabels` hook that reads labels from Firestore
  - Admin users can now change master data labels (e.g., "Módulo" → "Circuito") in Gestión de Tareas
  - Changes automatically propagate to all components (ABM, Filters, Dashboard) without code modifications
  - Works seamlessly across all supported languages (ES, PT, FR)
  - Falls back to static translations if no override exists in database

### Changed
- **Improved Status Badge Visibility in Light Theme**: Updated task status badges in sidebar cards
  - Light theme now uses vibrant solid colors with white text for better contrast
  - Completed: Blue-600, In Progress: Emerald-600, Review: Amber-600, Pending: Zinc-500
  - Dark theme maintains original translucent style
  - Fixes issue where badges were barely visible (gray on white) in light mode

### Technical Details
- Created `hooks/useMasterDataLabels.ts` with real-time Firestore snapshot integration
- Updated `components/TaskManagement.tsx` to use dynamic labels for priority, area, scope, module
- Updated `components/TaskFilters.tsx` to use dynamic labels for filter options
- Modified status badge styling in `TaskManagement.tsx` (lines 1040-1053) with theme-aware colors

---

## [13.1.0] - Previous Version
_(Previous changelog entries would go here)_
