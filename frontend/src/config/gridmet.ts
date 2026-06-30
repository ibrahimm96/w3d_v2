export type GridMetVariableCode = "pet" | "tmmx" | "tmmn" | "pr" | "vpd" | "rmax" | "rmin";

export interface GridMetVariableConfig {
  longName: string;
  kelvin?: boolean;
}

// gridMET serves one auto-extending file per variable; columns come back keyed
// as "<longName>(<unit>)" so parsing matches on the longName prefix.
export const gridMetVariables: Record<GridMetVariableCode, GridMetVariableConfig> = {
  pet: { longName: "daily_mean_reference_evapotranspiration_grass" },
  tmmx: { longName: "daily_maximum_temperature", kelvin: true },
  tmmn: { longName: "daily_minimum_temperature", kelvin: true },
  pr: { longName: "precipitation_amount" },
  vpd: { longName: "daily_mean_vapor_pressure_deficit" },
  rmax: { longName: "daily_maximum_relative_humidity" },
  rmin: { longName: "daily_minimum_relative_humidity" },
};

export const gridMetConfig = {
  enabled: import.meta.env.VITE_GRIDMET_ENABLED !== "false",
  baseUrl: import.meta.env.VITE_GRIDMET_BASE_URL ?? "https://toolbox-webservices.nkn.uidaho.edu",
  requestBaseUrl: import.meta.env.VITE_GRIDMET_PROXY_BASE_URL || import.meta.env.VITE_GRIDMET_BASE_URL || "/api/gridmet",
  netcdfEndpoint: "/Services/get-netcdf-data/",
  defaultDecimalPrecision: "2",
};

export function getGridMetNetcdfUrl() {
  if (gridMetConfig.requestBaseUrl.startsWith("/")) {
    return `${gridMetConfig.requestBaseUrl.replace(/\/$/, "")}${gridMetConfig.netcdfEndpoint}`;
  }

  return new URL(gridMetConfig.netcdfEndpoint, gridMetConfig.requestBaseUrl).toString();
}

export function getGridMetDataPath(code: GridMetVariableCode) {
  return `PATH_TO_DODS/agg_met_${code}_1979_CurrentYear_CONUS.nc`;
}
