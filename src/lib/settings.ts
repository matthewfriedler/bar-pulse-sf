export interface AppSettings {
  /** Neighborhood filter applied when the app opens. */
  defaultNeighborhood: string;
  /** Vibe filter applied when the app opens. */
  defaultVibe: string;
  /** Hide bars that have no live data yet. */
  hideUnknown: boolean;
  /** Sort the side panel by how close you are to each bar. */
  sortByDistance: boolean;
  /** Theme preference that follows the account. */
  theme: "light" | "dark";
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultNeighborhood: "all",
  defaultVibe: "all",
  hideUnknown: false,
  sortByDistance: false,
  theme: "light",
};

export function parseSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  const value = raw as Partial<AppSettings>;
  return {
    defaultNeighborhood: value.defaultNeighborhood ?? DEFAULT_SETTINGS.defaultNeighborhood,
    defaultVibe: value.defaultVibe ?? DEFAULT_SETTINGS.defaultVibe,
    hideUnknown: value.hideUnknown ?? DEFAULT_SETTINGS.hideUnknown,
    sortByDistance: value.sortByDistance ?? DEFAULT_SETTINGS.sortByDistance,
    theme: value.theme === "dark" ? "dark" : "light",
  };
}
