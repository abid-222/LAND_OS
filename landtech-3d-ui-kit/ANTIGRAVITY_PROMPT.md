# Gemini 3.8 / Antigravity: Integrate the LandTech 3D UI Kit

You are modifying my existing LandTech repository. I have provided a starter UI kit containing `LandTechShowcase.tsx` and `landtech.css`. Treat these files as a design and implementation reference, not as permission to replace the entire app blindly.

## Mandatory first step
Inspect the complete repository, existing frontend routes, API client, auth/session handling, i18next resources, Zustand stores, TanStack Query setup, MapLibre implementation, PWA/offline queue, backend routers, and Pydantic response schemas. Create a recoverable Git checkpoint before modifying existing files.

## What to implement
1. Integrate the included 3D-inspired cadastral visualization and refined black/emerald + white/emerald themes into the existing application.
2. Reuse and adapt the supplied CSS and React patterns. Fit them into the existing design system and routing rather than creating a disconnected second application.
3. Replace demo-only parcel geometry with real authorized GeoJSON/API data only after verifying the actual API response format. Never present sample geometry, coordinates, areas, identifiers, status values, or statistics as real land records.
4. Keep the existing MapLibre GL map for real geographic coordinates and authoritative cadastral layers. The supplied SVG/CSS scene is a lightweight visual overview, not a replacement for the GIS engine.
5. Preserve backend code, endpoints, database schema, migrations, authentication, JWT/MFA, OCR, verification, PostGIS, MinIO, audit ledger, and existing permissions.
6. Integrate theme preference with the existing app settings/store. Ensure both themes are readable and consistent across every route, modal, table, map panel, form, and mobile view.
7. Integrate the Bangla/English switch with the existing i18next setup. Move all user-facing strings into translation files; the sample component contains demonstration strings that must be internationalized before production.
8. Keep the visual design premium: controlled 3D depth, emerald parcel boundaries, animated scan line, selected parcel state, subtle hover effects, refined cards, and clear data hierarchy. Avoid excessive neon, glass blur, or animation.
9. Add mobile-specific layouts for 320, 360, 375, 390, 430, 768, 1024, and desktop widths. Avoid horizontal overflow. Keep map controls touch-friendly and use reduced-motion support.
10. Respect `prefers-reduced-motion`, avoid costly WebGL scenes on low-powered devices, lazy-load heavy maps/3D, and preserve keyboard access.
11. Use real backend data and explicit loading/error/empty states. Do not fake successful verification or legal ownership conclusions.
12. Preserve and test PWA/offline behavior, local queue safety, upload workflows, and API error handling.

## Integration checklist
- [ ] Review current architecture and record key API contracts.
- [ ] Back up or checkpoint the project.
- [ ] Integrate the supplied component/CSS into existing routes.
- [ ] Refactor demo strings into i18next translation resources.
- [ ] Connect real parcel data safely, with typed models.
- [ ] Preserve MapLibre for actual GIS.
- [ ] Make theme global and persistent using the current architecture.
- [ ] Verify dark and light themes on all core pages.
- [ ] Verify Bangla and English on all core pages.
- [ ] Test document upload, OCR, verification, record matching, audit, and map flows where supported.
- [ ] Run typecheck, tests, production build, and Playwright responsive checks.
- [ ] Report what passed, what was not testable, and any backend endpoints still required.

Do the actual implementation in the repository. Do not stop after writing a plan or displaying a mockup. Do not delete backend files or replace real API integrations with hardcoded data. Finish with a concise summary of modified files, tested flows, build results, and remaining issues.
