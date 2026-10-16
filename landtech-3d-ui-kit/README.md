# LandTech 3D UI Kit

A React 18 + TypeScript + Vite starter component pack for a premium LandTech interface.

## Included
- CSS/SVG 3D-inspired cadastral parcel visualization (lightweight; no WebGL dependency)
- Black/emerald dark theme and white/emerald light theme
- Interactive parcel selection and animated scan indicator
- Responsive layout and reduced-motion support
- English/Bangla UI toggle example
- Integration notes and a Gemini/Antigravity implementation prompt

## Integration
1. Copy `src/components/landtech/` into your existing frontend `src/components/landtech/`.
2. Import `landtech.css` once in your app entry point, for example `src/main.tsx`.
3. Render `<LandTechShowcase />` on a page or adapt `<CadastralScene />` into the existing GIS page.
4. Do not replace your existing MapLibre/PostGIS layer with the demo geometry. The included parcels are explicitly illustrative.
5. Replace the `demoParcels` array with actual GeoJSON features from your existing API only after checking the backend response schema and permissions.
6. Keep existing auth, API client, React Query, i18next, Zustand, offline queue, and PWA configuration.

No backend code or API contracts are changed by this package.

## Compatibility
Designed for React 18 and TypeScript. Uses CSS and inline SVG only, so it does not require a 3D engine. For true geographic rendering, keep MapLibre GL as the source of truth and use this scene as a visual overview/hero component.
