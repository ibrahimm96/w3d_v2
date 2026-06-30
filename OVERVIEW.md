# Water 3D Data Status

This document tracks which data paths are live, which are mocked or fallback-only, and what still needs to be added before the dashboard should be treated as production decision support.

## Update 2026-06-22: Analytics UI overhaul (full-year charts, metric tools, top-bar field controls)

The Analytics view was reorganized for clarity and faster, contextual interaction:

- **Per-metric tools.** The chart is now a `GDD | Chill | ET` tool selector (`Dashboard.tsx`). Switching tabs swaps the chart, metric cards, legend, and inline controls. Chill is enabled only for crops with `chill.enabled`; ET is always available.
- **ET is back as a reference-ET tool.** Rather than re-wiring OpenET (still unwired, no key in this env), the ET tab is built from data already fetched: gridMET reference ET (`WeatherRecord.etoMm`) and the analytics-derived crop ET (`etcMm`/`cumulativeEtcMm` from `buildAnalyticsSnapshot`), plus the Climate Toolbox forecast PET p10/p90 band. It shows daily ET bars (history vs forecast), cumulative crop ET, optional cumulative reference ETo, and the forecast uncertainty band. mm/in toggle.
- **Full calendar-year GDD chart.** The GDD x-axis now spans Jan 1–Dec 31. The current-season line (observed history + forecast) extends to year-end as a dashed projection using the 5-yr-average daily curve. Default overlays are last year + the 5-yr average only; additional comparison years moved into Advanced settings. A "today" reference line marks the present.
- **Inline, real-time essential controls.** Base/upper temp, custom target, F/C unit (GDD); chill thresholds (Chill); reference-ETo/forecast-band toggles and mm/in (ET) sit in a control row above the chart and write straight through to live settings — the chart updates as you type. The old draft/Apply gate is gone. Less-common options (comparison-year picker, y-axis max, forecast range, date overrides, stage/projection toggles) live in an **Advanced Graph Settings** modal.
- **Field identity at the top.** The persistent left field-editing sidebar (`FieldSidebar`) was removed; the dashboard is full-width. The top bar carries the field selector plus **Edit** and **Location** buttons that open modals. `EditFieldModal` reuses a shared `FieldEditorForm` (name, crop, acreage, biofix, GDD base/upper, stage thresholds); `AdjustLocationModal` carries the Mapbox search + map. A new optional `FieldConfig.areaAcres` is persisted (localStorage always; PocketBase `metadata.areaAcres`).
- **Setup page redesigned** on the same building blocks (`SetupPanel` = map column + `FieldEditorForm`).
- **Loading/caching.** gridMET responses now also persist to a versioned localStorage cache (`src/api/weatherCache.ts`, 7-day TTL) so reloads paint quickly; comparison/5-yr-baseline years stream in without blocking first paint, and the chart shows a shimmer skeleton + an "loading overlays" hint.

## Update 2026-06-12: gridMET history wired; CFS client rebuilt on verified behavior

The historical-weather gap is closed and the forecast client now matches the verified service behavior:

- New gridMET provider (`src/api/gridMet.ts`) fetches observed daily `tmmx`, `tmmn`, `pr`, `pet` (ETo), `rmax`, `rmin`, and `vpd` from the Climate Toolbox `get-netcdf-data` service through `/api/gridmet`. The previously documented whitelist blocker is resolved: the literal `PATH_TO_DODS/agg_met_<var>_1979_CurrentYear_CONUS.nc` placeholder path works (verified live).
- gridMET is now the dashboard's primary history source (season weather, comparison years, 5-yr baselines), putting history, CFS forecast, and OpenET on the same gridMET reference basis. Open-Meteo remains only for the chill-season fetch because it is the sole source of real hourly temperatures.
- gridMET lags ~2 days and silently truncates ranges that extend past its tail; the provider reports the actual last available date via a metadata quality flag and the dashboard surfaces it as a data note.
- The CFS forecast client was rebuilt around verified behavior: only `calc-mode=all` works (pre-reduced modes return 500), so PET p10/median/p90 are now computed client-side from the 48 ensemble members. Cumulative handling is explicit per variable (PET and precip are running totals — precip verified live; temps/sph/vpd are true dailies) instead of inferred from monotonicity.
- Forecast `vpd` is now fetched natively (both models serve VPD), carried on `WeatherRecord.vpdKpa`, and preferred by `dailyMeanVpd` over RH/dewpoint estimation.

The product surface was narrowed to a farmer-facing GDD/growth-stage dashboard. Key changes:

- The dashboard no longer fetches or renders OpenET/ET data. The OpenET adapter, PocketBase ET cache, and Climate Toolbox ET parsing remain in `src/api` for future use, but the UI is GDD, growth stages, chill, and year-over-year comparison only. (Climate Toolbox forecast Tmin/Tmax still drives forecast GDD.)
- Metric cards now answer farmer questions: cumulative GDD with days ahead/behind the 5-yr normal, current stage, projected next-stage arrival date, and chill hours (perennials) or season progress (annuals). The developer-facing "Data Source" card was removed.
- New Growth Stage Timeline panel: actual/forecast/projected calendar dates per stage, with the most recent comparison year's stage dates and the day shift alongside.
- Comparison and baseline (5-yr normal) weather is fetched for full prior years (Jan 1-Dec 31, daily only) so the normal curve and prior-year stage dates extend past today's day-of-year; overlays align by calendar month-day, not array index.
- Chill accumulation now honors `defaultStartRule` (e.g. previous July 15) with a dedicated dormant-season weather fetch, instead of starting Jan 1.
- Added a F/C unit toggle (GDD shown in Fahrenheit degree-days by default), working CSV export, and a slimmed field setup (location, crop, plant/biofix date, GDD base/upper temps, stage thresholds, name). Soil/AWHC/MAD/irrigation-efficiency inputs and the placeholder Weather Cell/Elevation values were removed; the soil adapter remains available in `src/api`.
- Removed the sidebar, dead header bell, and dead "Start Date + Forecast" button.

The ET-era notes below are retained for historical context on provider status.

## Working Now

| Area | Status | Notes |
| --- | --- | --- |
| Field search and setup map | Live | Mapbox Search and Mapbox GL are used during field setup. |
| Field thumbnails | Live | Mapbox Static Images render saved field thumbnails. |
| Soil lookup | Live with fallback | NRCS Soil Data Access detects map unit, component, texture, hydrologic group, drainage class, and AWHC when enabled. Local defaults remain as fallback. |
| OpenET historical ET/ETo | Live with fallback | OpenET raster point time series is requested for saved field coordinates. Responses are cached in PocketBase `openet_cache` when PocketBase is enabled. |
| OpenET response storage | Live | `openet_cache` stores request payload, raw response, field coordinate, variable, date range, and fetched timestamp. |
| gridMET historical weather | Live, session-cached | Observed daily Tmin/Tmax, precip, ETo, RH, and VPD back to 1979 are fetched through `/api/gridmet` (~2-day lag; truncated tails are flagged with the actual last available date). |
| Climate Toolbox forecast PET | Live, not cached | 28-day CFS PET forecast is fetched through `/api/climate-toolbox` with `calc-mode=all`, de-accumulated per ensemble member, and reduced to median with client-computed p10/p90 bounds. |
| Climate Toolbox forecast weather | Live, not cached | 28-day CFS `tmmx`, `tmmn`, `pr`, `sph`, and `vpd` are fetched through `/api/climate-toolbox`. Temperature is converted from K to C, precipitation is de-accumulated to daily increments (cumulative behavior verified live), specific humidity is converted to approximate RH/dewpoint, and hourly temperatures are interpolated from daily Tmin/Tmax. |
| Forecast PET percentiles | Working | PET p10/p90 bounds are computed client-side from the 48 ensemble members (the service cannot pre-reduce; non-`all` calc-modes return 500). These are forecast uncertainty bounds, not historical climatology bands. |
| ET graph | Working | Bar chart shows historical Actual ET, historical Reference ETo, forecast PET, and forecast PET p10/p90 bound lines. If live historical ET is unavailable, mock past-30-day ET is displayed with a clear warning. No mock forecast is generated. |
| Crop selection | Working | Field setup supports crop selection and saves it with the field. |
| Planting / stage start date | Working | Field setup accepts a date. Live historical ET requests and GDD calculations start from that date; if no date is supplied, Jan 1 of the current year is used. |
| User-adjustable crop stage thresholds | Working | Field setup exposes editable GDD thresholds for the selected crop. The values are stored with the field locally and in PocketBase field `metadata.stageThresholds`, then used by analytics. |
| Irrigation depletion / days-until-irrigation | Forecast estimate | Dashboard estimates days until management allowed depletion is reached using forecast ETc and precipitation with no irrigation applied. Applied-water input is still required before this becomes an irrigation recommendation. |
| Field persistence | Working with conditions | Fields persist to localStorage always. PocketBase field storage works when PocketBase is enabled and the user is authenticated. |

## Mocked Or Fallback Data

| Area | Current behavior | Needed replacement |
| --- | --- | --- |
| Historical ET fallback | Uses `frontend/src/data/weather.ts` to create past-30-day mock ET only when live historical ET is unavailable. | Keep as demo fallback; do not use for advisory decisions. |
| Historical GDD, chill, VPD, heat/frost stress | Historical daily weather is wired via gridMET (Tmin/Tmax, precip, ETo, RH, VPD). Chill hours still use Open-Meteo for real hourly temperatures; all other historical calcs run on gridMET dailies. | Provider-supplied hourly temperatures from a gridMET-consistent source if Open-Meteo is to be retired entirely. |
| Applied water | No live applied-water source. | User entry, irrigation controller export/API, meter telemetry, or pump telemetry. |
| Weather cell / station id | Placeholder field value. | Provider-specific grid/station lookup. |
| Elevation | Static/defaulted. | Elevation/terrain provider if elevation is needed in calculations. |
| Export data button | UI only. | CSV/JSON export implementation. |

## Not Yet Added

| Feature | Status |
| --- | --- |
| Historical Climate Toolbox/gridMET weather | Done (2026-06-12). The literal `PATH_TO_DODS/agg_met_<var>_1979_CurrentYear_CONUS.nc` placeholder is the whitelisted form; the gridMET provider uses it through `/api/gridmet`. |
| Provider-supplied hourly weather or dewpoint | Partially implemented. Daily forecast specific humidity is converted to approximate dewpoint and hourly temperatures are interpolated from daily Tmin/Tmax. Exact chill/frost/heat workflows still need real hourly temperatures or observed dewpoint. |
| Historical percentile bands | Not implemented. Forecast PET p10/p90 bounds are shown, but historical p10/p30/p50/p70/p90 climatology paths still need whitelisted Climate Toolbox dataset keys. |
| Historical ET climatology / baseline | Not implemented. No prior-year or normal-year baseline provider exists yet because the historical percentile/climatology data paths are not configured. |
| Irrigation recommendations with applied water | Partially implemented. A no-irrigation forecast depletion estimate is visible; applied-water records are still required before recommending irrigation timing. |
| Repository access for Emery | External process, not code. |
| Periodic screenshots to Emery | External process unless a reporting workflow is defined. |

## Crop Profiles

Local crop profiles currently exist for:

- Almond
- Processing tomato
- Wine grape
- Pistachio
- Cotton
- Alfalfa

The profiles include base/upper temperatures, Kc curve, GDD stage thresholds, MAD, root depth, TAW, chill requirement where relevant, and stress thresholds. These are v1 defaults and should be reviewed before advisory use.

Reference notes used while filling gaps:

- UC IPM cotton planting guidance says cotton seed requires about 50 degree-days for emergence under good planting-depth conditions.
- UC IPM pistachio shell-hardening model lists shell hardening at 665 C degree-days from 75% bloom.
- UC ANR almond hull-split material documents GDD-based hull-split prediction from bloom.
- Existing tomato, grape, almond, and alfalfa values remain local Water 3D v1 defaults pending agronomic review.

## Current Dashboard Data Rules

- Historical ET comes from OpenET when available.
- OpenET responses are cached in PocketBase.
- Historical season weather, comparison years, and 5-yr baselines come from gridMET (in-memory session cache only; cache keys include the date range, so day-old provisional values refresh naturally).
- Chill-season weather comes from Open-Meteo for its real hourly temperatures.
- Forecast PET, Tmin, Tmax, precipitation, specific humidity, and VPD come from Climate Toolbox and are not cached.
- Forecast PET p10/median/p90 are computed client-side from the 48 ensemble members.
- Daily VPD prefers the provider-supplied value (gridMET history, CFS forecast) and falls back to RH/dewpoint estimation.
- Forecast daily specific humidity is converted to approximate RH/dewpoint; hourly temperatures are interpolated from daily Tmin/Tmax.
- If OpenET historical ET is unavailable, mock past-30-day ET is displayed and labeled as mock.
- If Climate Toolbox forecast weather is unavailable, no forecast PET/weather is displayed.
- gridMET history ends ~2 days before today; the dashboard notes the actual last available date.
- Stage thresholds are editable per field and override crop profile defaults for analytics.
- Irrigation depletion assumes no applied water until applied-water records are integrated.
- The `Precision Insights` panel has been removed from the dashboard.

## Next Implementation Targets

1. ~~Get whitelisted Climate Toolbox `get-netcdf-data` keys/data paths for historical gridMET weather~~ Done 2026-06-12; historical percentile/climatology dataset keys are still outstanding.
2. Add applied-water input or telemetry so depletion can include irrigation and become actionable.
3. Replace interpolated hourly temperatures with provider-supplied hourly data or a confirmed dewpoint endpoint.
4. Add CSV/JSON export for the ET/weather/irrigation data now visible in the dashboard.


# Water 3D Architecture Plan

## Summary
Water 3D is an analytics-first decision support app for Central Valley growers and irrigation managers. The map is used during setup to locate a field, then the core product becomes a crop-aware analytics dashboard driven by ET, GDD, chill, historical comparisons, and stress signals.

The current implementation should start as a self-contained frontend with mock weather/OpenET data and a framework-agnostic TypeScript calculation core. PocketBase remains available for future persistence, but v1 stores field configuration locally and avoids backend coupling until API contracts are finalized.

## Key Implementation Choices
- Build a `frontend/` React + Vite + TypeScript app.
- Keep agronomic math in pure TypeScript modules under `src/calcs`.
- Keep API/provider contracts in `src/api` so live OpenET, Catherine/Climate, Mapbox, and later PocketBase implementations can replace mocks without changing UI calculations.
- Use static crop profiles and deterministic mock weather records for v1.
- Persist selected/configured fields in localStorage.
- Scaffold PocketBase behind `VITE_POCKETBASE_ENABLED=false`; do not make auth or storage calls until explicitly enabled.
- Keep the map out of the primary workflow after setup.
- Remove v1 irrigation scheduling, budgeting, profitability, scouting, groundwater, and station-management surfaces.
- Prioritize the “new direction” Stitch samples:
  - `field_setup_analytics_configuration`
  - `field_analytics_dashboard_new_direction`

## Product Surface
- Field setup:
  - search/drop-pin style location panel
  - detected soil/weather properties
  - crop selection
  - field name entry
  - activation into local field list
- Analytics dashboard:
  - field selector
  - ET accumulation
  - cumulative GDD
  - crop-aware chill card
  - VPD/weather stress status
  - ET forecast and historical comparison chart
  - precision insights generated from calculated state
- No separate map, scheduler, budget, reports, scouting, or groundwater screens in v1.

## Interfaces
- `FieldConfig`: field identity, crop, location, soil, stage dates, and optional irrigation settings.
- `WeatherRecord`: daily weather/ET inputs, with optional RH/dewpoint/hourly temperatures.
- `CropProfile`: crop defaults for GDD, Kc, MAD, root depth, chill, and stress thresholds.
- `AnalyticsSnapshot`: computed dashboard state from field + weather + crop profile.
- `DataProvider`: later boundary for live OpenET/weather providers.
- `LocationProvider`, `WeatherProvider`, and `EtProvider`: active v1 API boundaries for setup and analytics.
- `AuthRepository`: PocketBase login/session/logout boundary, disabled by default.
- `FieldRepository`: future PocketBase field storage boundary; current app remains localStorage-backed.

## Test Plan
- Unit-test GDD, ETc, VPD, chill gating, and analytics snapshot generation.
- Verify crop-aware dashboard behavior, especially chill visibility.
- Verify localStorage field setup/save/load behavior manually in the app.
- Run TypeScript build before delivery.

## Assumptions
- v1 does not include irrigation scheduling, budgeting, profitability, groundwater integrations, scouting, reports, or station management.
- Live OpenET/Catherine API credentials are not available in the current workspace, so the app uses mock provider data behind replaceable interfaces.
- PocketBase has no domain collections yet, so localStorage is the implementation default.
- PocketBase auth/storage code is present only as a disabled adapter. No records should be created until backend schema and enablement are approved.
