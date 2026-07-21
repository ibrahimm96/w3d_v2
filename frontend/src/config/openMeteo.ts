export const openMeteoConfig = {
  enabled: import.meta.env.VITE_OPEN_METEO_ENABLED !== "false",
  archiveBaseUrl: import.meta.env.VITE_OPEN_METEO_ARCHIVE_BASE_URL ?? "https://archive-api.open-meteo.com",
  archiveRequestBaseUrl: import.meta.env.VITE_OPEN_METEO_ARCHIVE_PROXY_BASE_URL || import.meta.env.VITE_OPEN_METEO_ARCHIVE_BASE_URL || "/api/open-meteo",
  archiveEndpoint: "/v1/archive",
};

export function getOpenMeteoArchiveUrl() {
  // Concatenate, never `new URL(endpoint, base)`: the endpoint's leading slash
  // would discard the base's path if the proxy base ever carries one.
  return `${openMeteoConfig.archiveRequestBaseUrl.replace(/\/$/, "")}${openMeteoConfig.archiveEndpoint}`;
}
