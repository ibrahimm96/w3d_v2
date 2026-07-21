export const climateToolboxConfig = {
  enabled: import.meta.env.VITE_CLIMATE_TOOLBOX_ENABLED === "true",
  cfsBaseUrl: import.meta.env.VITE_CLIMATE_TOOLBOX_CFS_BASE_URL ?? "https://climate-dev.nkn.uidaho.edu",
  cfsRequestBaseUrl:
    import.meta.env.VITE_CLIMATE_TOOLBOX_CFS_PROXY_BASE_URL ||
    import.meta.env.VITE_CLIMATE_TOOLBOX_CFS_BASE_URL ||
    "https://climate-dev.nkn.uidaho.edu",
  cfsEndpoint: "/Services/get-cfs-data/",
  defaultDecimalPrecision: "4",
  forecastVariable: "pet",
  forecastHorizonDays: 28,
};

export function getClimateToolboxCfsUrl() {
  // Concatenate, never `new URL(endpoint, base)`: the endpoint's leading slash
  // would discard the base's path (e.g. https://w3d.ucmerced.edu/api/climate-toolbox).
  return `${climateToolboxConfig.cfsRequestBaseUrl.replace(/\/$/, "")}${climateToolboxConfig.cfsEndpoint}`;
}
