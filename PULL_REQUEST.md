# Feat: Party Voting Statistics & Behavioral Analytics Dashboard (#10)

## Overview
This Pull Request introduces a comprehensive **Party Voting Statistics & Behavioral Analytics Dashboard** for the 10th term of the Polish Sejm (Resolves #10). It provides citizens, journalists, and researchers with deep analytical insights into party discipline, voting cohesion, political polarization, and individual MP rebellions against party lines.

---

## Key Features & Changes

### 1. Backend Analytics API (`backend/app/routers/clubs.py`)
Implemented a dedicated FastAPI router with 5 core analytical endpoints:
*   **`GET /api/clubs` (Clubs Overview)**: Aggregates average cohesion (discipline), attendance, majority support rate, and decision breakdown (`YES`, `NO`, `ABSTAIN`, `MIXED`) across all parliamentary clubs.
*   **`GET /api/clubs/compare` (Direct Club Comparison)**: Side-by-side confrontation of 2–3 selected clubs, calculating their percentage **Alignment Score** and isolating specific **disagreement points** (contested votings).
*   **`GET /api/clubs/matrix` (NxN Agreement Matrix)**: Generates a full relationship heatmap connecting every active parliamentary club to visualize formal and informal coalitions.
*   **`GET /api/clubs/filter` (Behavioral Search Engine)**: Enables searching for votings by specific party behavior (e.g., opposition voting `YES`) or low cohesion thresholds (e.g., `cohesion <= 75%`) to detect internal party splits.
*   **`GET /api/clubs/{id}/stats` (Club Profile & Rebel MPs Index)**: Deep dive into a single club's history, highlighting **Rebel MPs** (voting against party majority), **Top Absentees**, and historical cohesion trends over time.

### 2. Active MPs & Term Rotation Filtering (`active_only=True`)
*   **The 559 vs. 460 MPs Challenge**: During the 10th term, parliamentary circles dissolve, MPs resign, and new MPs take office, resulting in 16 total historical clubs/circles and 559 MPs in historical records.
*   **Dynamic Proxy Verification**: Integrated `SejmAPIClient` (`get_active_mps_info`) to filter analytics on the fly. By default (`active_only=True`), dissolved circles are hidden and only currently active MPs are analyzed—ensuring the total parliamentary seat count equals exactly **460**.
*   **Hybrid Toggle**: Added a UI toggle switch in the global filter bar allowing users to switch between the current active Sejm (460 MPs) and full historical term view (559 MPs).

### 3. High-Performance Caching (`analytics_cache`)
*   To prevent database overload when calculating cohesion and matrix alignments across hundreds of votings, all analytical endpoints utilize in-memory RAM caching with a **5-minute TTL** and `Cache-Control: public, max-age=300` headers.
*   Cache keys dynamically incorporate all active query filters (date ranges, attendance thresholds, close votings, active MPs toggle).

### 4. Bootstrap Frontend Dashboard (`frontend/src/components/Clubs/`)
*   Built a modern, responsive React dashboard (`ClubsDashboard.jsx`) styled with Bootstrap and Lucide icons.
*   Includes a centralized **Global Analytics Filter Bar**:
    *   Date range picker with quick presets (30/90 days).
    *   Minimum attendance slider (`min_attendance`) to filter out boycotted votes or lack of quorum.
    *   Close / contested votings toggle (`close_votings_only` for $<15$ vote margin).
    *   Active MPs toggle (`active_only`).
*   Implemented 5 intuitive sub-views: `ClubsOverview`, `ClubComparison`, `AgreementMatrix`, `ClubBehaviorSearch`, and `ClubDetailRebels`.

### 5. Comprehensive Documentation
*   Added `docs/club_analytics.md`: Full mathematical and methodological documentation of all analytical formulas (Cohesion, Alignment, Rebel Index) and use cases.
*   Updated `docs/proxy.md`: Documented caching strategy and active MP filtering in the Proxy layer.

---

## Verification & Testing
*   **Automated Tests**: Added complete unit test suite in `backend/tests/test_clubs_endpoints.py` covering all analytical endpoints, filtering logic, and edge cases (100% passing).
*   **Frontend Build**: Verified production build using `npm run build` / `vite build` (compiled successfully with zero errors).
*   **Manual Verification**: Verified UI responsiveness and filter synchronization across all 5 analytical views.
