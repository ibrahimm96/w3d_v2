import { afterEach, describe, expect, it } from "vitest";
import { climateToolboxConfig, getClimateToolboxCfsUrl } from "./climate";
import { getGridMetNetcdfUrl, gridMetConfig } from "./gridmet";
import { getOpenMeteoArchiveUrl, openMeteoConfig } from "./openMeteo";

// Regression: `new URL("/endpoint", base)` silently discards the base's path,
// so a proxy base like https://w3d.ucmerced.edu/api/gridmet lost its prefix
// and requests fell through to the proxy's catch-all route.
describe("endpoint URL builders keep the proxy base's path", () => {
  const original = {
    gridmet: gridMetConfig.requestBaseUrl,
    cfs: climateToolboxConfig.cfsRequestBaseUrl,
    openMeteo: openMeteoConfig.archiveRequestBaseUrl,
  };

  afterEach(() => {
    gridMetConfig.requestBaseUrl = original.gridmet;
    climateToolboxConfig.cfsRequestBaseUrl = original.cfs;
    openMeteoConfig.archiveRequestBaseUrl = original.openMeteo;
  });

  it("absolute base with a path", () => {
    gridMetConfig.requestBaseUrl = "https://w3d.ucmerced.edu/api/gridmet";
    climateToolboxConfig.cfsRequestBaseUrl = "https://w3d.ucmerced.edu/api/climate-toolbox";
    openMeteoConfig.archiveRequestBaseUrl = "https://w3d.ucmerced.edu/api/open-meteo";
    expect(getGridMetNetcdfUrl()).toBe("https://w3d.ucmerced.edu/api/gridmet/Services/get-netcdf-data/");
    expect(getClimateToolboxCfsUrl()).toBe("https://w3d.ucmerced.edu/api/climate-toolbox/Services/get-cfs-data/");
    expect(getOpenMeteoArchiveUrl()).toBe("https://w3d.ucmerced.edu/api/open-meteo/v1/archive");
  });

  it("relative proxy base", () => {
    gridMetConfig.requestBaseUrl = "/api/gridmet";
    expect(getGridMetNetcdfUrl()).toBe("/api/gridmet/Services/get-netcdf-data/");
  });

  it("absolute host-only base (trailing slash trimmed)", () => {
    gridMetConfig.requestBaseUrl = "https://toolbox-webservices.nkn.uidaho.edu/";
    expect(getGridMetNetcdfUrl()).toBe("https://toolbox-webservices.nkn.uidaho.edu/Services/get-netcdf-data/");
  });
});
