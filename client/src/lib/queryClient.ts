import { QueryClient, QueryFunction, useMutation } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// Type for the toured units update payload
type TouredUpdatePayload = {
  toured_unit_ids: string[];
};

const updateTouredUnits = async ({ leadId, payload }: { leadId: string; payload: TouredUpdatePayload }) => {
  const response = await apiRequest('PUT', `/api/leads/${leadId}/toured`, payload);
  return response.json();
};

export const useUpdateTouredUnits = (leadId: string) => {
  const queryClientInstance = queryClient;

  return useMutation({
    mutationFn: (payload: TouredUpdatePayload) => updateTouredUnits({ leadId, payload }),
    onSuccess: () => {
      // Invalidate the specific lead query to refetch fresh data
      queryClientInstance.invalidateQueries({ queryKey: ['/api/leads', leadId] });
      console.log('Toured Units updated successfully on the backend.');
    },
  });
};

// Type for showing itinerary summary
type ViewedUnitSummary = {
  unitId: string;
  unitNumber: string;
  timestamp: string;
};

// Fetch showing itinerary (viewed units for active session)
const fetchItinerary = async (visitId: string): Promise<ViewedUnitSummary[]> => {
  const response = await apiRequest('GET', `/api/showings/${visitId}/summary`, undefined);
  return response.json();
};

export const useShowingItinerary = (visitId: string | null) => {
  return {
    queryKey: [`/api/showings/${visitId}/summary`],
    queryFn: () => {
      if (!visitId) throw new Error('No active visit session');
      return fetchItinerary(visitId);
    },
    enabled: !!visitId, // Only fetch if we have an active visit
    staleTime: 0, // Always fetch fresh data
  };
};

// Mutation to log a unit view
const logUnitView = async ({ visitId, unitId }: { visitId: string; unitId: string }) => {
  const response = await apiRequest('POST', `/api/showings/${visitId}/log-view`, { unitId });
  return response.json();
};

export const useLogUnitView = (visitId: string | null) => {
  const queryClientInstance = queryClient;

  return useMutation({
    mutationFn: (unitId: string) => {
      if (!visitId) throw new Error('No active visit session');
      return logUnitView({ visitId, unitId });
    },
    onSuccess: () => {
      // Invalidate the itinerary to show the newly logged unit
      if (visitId) {
        queryClientInstance.invalidateQueries({ queryKey: [`/api/showings/${visitId}/summary`] });
      }
      console.log('Unit view logged successfully');
    },
  });
};

// Type for starting a showing session
type StartShowingPayload = {
  leadId: string;
  agentId: string;
  projectId: string;
};

// Mutation to start a showing session
const startShowingSession = async (payload: StartShowingPayload) => {
  const response = await apiRequest('POST', '/api/showings/start', payload);
  return response.json();
};

export const useStartShowing = () => {
  const queryClientInstance = queryClient;

  return useMutation({
    mutationFn: (payload: StartShowingPayload) => startShowingSession(payload),
    onSuccess: (data) => {
      console.log('Showing session started successfully:', data.id);
      // Invalidate any relevant queries if needed
    },
    onError: (error) => {
      console.error('Failed to start showing session:', error);
    },
  });
};
