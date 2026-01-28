# Changelog - UniTask

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to Semantic Versioning: **V.R.E** (Version.Rama.Etapa).

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
