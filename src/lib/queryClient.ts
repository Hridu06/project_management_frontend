import { QueryClient } from "@tanstack/react-query";

// Shared cache so pages that need the same resource (e.g. the Teams page,
// the Projects page, and the sidebar all wanting the team/project list)
// dedupe into a single request instead of each firing its own fetch.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
