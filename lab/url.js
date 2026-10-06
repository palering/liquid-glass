// Lab-only URLs follow Vite's base for both root and project Pages hosting.
// Keep this out of the reusable core: consumers own their asset locations.
export const labUrl = (path = "") =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
