import {
  QueryClient,
  QueryFunction,
  useMutation,
  useQuery,
} from "@tanstack/react-query";

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

const updateTouredUnits = async ({
  leadId,
  payload,
}: {
  leadId: string;
  payload: TouredUpdatePayload;
}) => {
  const response = await apiRequest(
    "PUT",
    `/api/leads/${leadId}/toured`,
    payload,
  );
  return response.json();
};

export const useUpdateTouredUnits = (leadId: string) => {
  const queryClientInstance = queryClient;

  return useMutation({
    mutationFn: (payload: TouredUpdatePayload) =>
      updateTouredUnits({ leadId, payload }),
    onSuccess: () => {
      // Invalidate the specific lead query to refetch fresh data
      queryClientInstance.invalidateQueries({
        queryKey: ["/api/leads", leadId],
      });
      console.log("Toured Units updated successfully on the backend.");
    },
  });
};

// Type for showing itinerary summary (matches backend response from server/routes/showings.ts)
export type ViewedUnitSummary = {
  unitId: string;
  unitNumber: string;
  timestamp: string;
};

// Fetch showing itinerary (viewed units for active session)
const fetchItinerary = async (
  visitId: string,
): Promise<ViewedUnitSummary[]> => {
  const response = await apiRequest(
    "GET",
    `/api/showings/${visitId}/summary`,
    undefined,
  );
  return response.json();
};

export const useShowingItinerary = (visitId: string | null) => {
  return useQuery<ViewedUnitSummary[]>({
    queryKey: ["/api/showings", visitId, "summary"],
    queryFn: () => {
      if (!visitId) throw new Error("No active visit session");
      return fetchItinerary(visitId);
    },
    enabled: !!visitId, // Only fetch if we have an active visit
    staleTime: 0, // Always fetch fresh data
    refetchInterval: 5000, // Auto-refresh every 5 seconds during active showing
  });
};

// Mutation to log a unit view
const logUnitView = async ({
  visitId,
  unitId,
}: {
  visitId: string;
  unitId: string;
}) => {
  const response = await apiRequest(
    "POST",
    `/api/showings/${visitId}/log-view`,
    { unitId },
  );
  return response.json();
};

export const useLogUnitView = (visitId: string | null) => {
  const queryClientInstance = queryClient;

  return useMutation({
    mutationFn: (unitId: string) => {
      if (!visitId) throw new Error("No active visit session");
      return logUnitView({ visitId, unitId });
    },
    onMutate: async (unitId: string) => {
      // Cancel outgoing refetches
      await queryClientInstance.cancelQueries({
        queryKey: [`/api/showings/${visitId}/summary`],
      });

      // Snapshot previous value
      const previousData = queryClientInstance.getQueryData<
        ViewedUnitSummary[]
      >([`/api/showings/${visitId}/summary`]);

      // Optimistically update cache
      if (visitId) {
        queryClientInstance.setQueryData<ViewedUnitSummary[]>(
          [`/api/showings/${visitId}/summary`],
          (old = []) => {
            // Check if unit already exists
            if (old.some((item) => item.unitId === unitId)) {
              return old;
            }
            // Add new viewed unit
            return [
              ...old,
              {
                unitId,
                unitNumber: "", // Will be filled by server response
                timestamp: new Date().toISOString(),
              },
            ];
          },
        );
      }

      return { previousData };
    },
    onError: (_err, _unitId, context) => {
      // Rollback on error
      if (context?.previousData && visitId) {
        queryClientInstance.setQueryData(
          [`/api/showings/${visitId}/summary`],
          context.previousData,
        );
      }
    },
    onSuccess: () => {
      // Invalidate the itinerary to show the newly logged unit with server data
      if (visitId) {
        queryClientInstance.invalidateQueries({
          queryKey: [`/api/showings/${visitId}/summary`],
        });
      }
      console.log("Unit view logged successfully");
    },
  });
};

// Type for starting a showing session
type StartShowingPayload = {
  leadId: string;
  agentId: string;
  projectId: string;
};

type StartShowingResponse = {
  id: string;
  leadId: string;
  agentId: string;
  projectId: string;
  startedAt: string;
};

// Mutation to start a showing session
const startShowingSession = async (
  payload: StartShowingPayload,
): Promise<StartShowingResponse> => {
  const response = await apiRequest("POST", "/api/showings/start", payload);
  return response.json();
};

export const useStartShowing = () => {
  return useMutation({
    mutationFn: (payload: StartShowingPayload) => startShowingSession(payload),
    onSuccess: (data) => {
      console.log("Showing session started:", data.id);
    },
    onError: (error) => {
      console.error("Failed to start showing session:", error);
    },
  });
};

// Type for ending a showing session and triggering automation
type EndShowingPayload = {
  visitId: string;
};

// Mutation to end showing and trigger post-showing automation
const triggerPostShowingAutomation = async (visitId: string) => {
  const response = await apiRequest(
    "POST",
    "/api/automation/trigger-post-showing",
    { visitId },
  );
  return response.json();
};

export const useEndShowing = () => {
  const queryClientInstance = queryClient;

  return useMutation({
    mutationFn: (visitId: string) => triggerPostShowingAutomation(visitId),
    onSuccess: () => {
      // Invalidate tasks to show the new follow-up task
      queryClientInstance.invalidateQueries({ queryKey: ["/api/tasks"] });
      console.log("Showing ended. Post-showing automation triggered.");
    },
    onError: (error) => {
      console.error("Failed to end showing session:", error);
    },
  });
};

// Fetch client details with preferences
const fetchClientDetails = async (clientId: string) => {
  const response = await apiRequest("GET", `/api/leads/${clientId}`, undefined);
  return response.json();
};

export const useClientDetails = (clientId: string | null) => {
  return useQuery({
    queryKey: ["/api/leads", clientId],
    queryFn: () => {
      if (!clientId) throw new Error("No client ID provided");
      return fetchClientDetails(clientId);
    },
    enabled: !!clientId,
    staleTime: Infinity, // Client details rarely change during a session
  });
};

// Type for lead list
type LeadList = Array<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status?: string;
  pipelineStage?: string;
}>;

// Fetch leads available for showing sessions
const fetchLeadsForShowing = async (
  agentId: string,
  projectId: string,
): Promise<LeadList> => {
  const response = await apiRequest(
    "GET",
    `/api/leads?agentId=${agentId}&projectId=${projectId}`,
    undefined,
  );
  return response.json();
};

export const useLeadsForShowing = (
  agentId: string | null,
  projectId: string | null,
) => {
  return useQuery<LeadList>({
    queryKey: ["leadsForShowing", agentId, projectId],
    queryFn: () => {
      if (!agentId) throw new Error("No agent ID provided");
      if (!projectId) throw new Error("No project ID provided");
      return fetchLeadsForShowing(agentId, projectId);
    },
    enabled: !!agentId && !!projectId,
    staleTime: 30000, // Cache for 30 seconds
  });
};

// Type for task count response
type TaskCountResponse = { count: number };

// Fetch pending task count for an agent
const fetchPendingTaskCount = async (
  agentId: string,
): Promise<TaskCountResponse> => {
  const response = await apiRequest(
    "GET",
    `/api/tasks/count?agentId=${agentId}&status=pending`,
    undefined,
  );
  return response.json();
};

export const usePendingTaskCount = (agentId: string | null) => {
  return useQuery<TaskCountResponse>({
    queryKey: ["/api/tasks/count", agentId],
    queryFn: () => {
      if (!agentId) throw new Error("No agent ID provided");
      return fetchPendingTaskCount(agentId);
    },
    enabled: !!agentId,
    staleTime: 5000, // Low staleTime ensures count updates after 'End Showing'
  });
};

// Type for creating a quick lead
type CreateQuickLeadPayload = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
};

type CreateQuickLeadResponse = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
};

// Create a quick lead and automatically qualify them
const createQuickLead = async (
  agentId: string,
  projectId: string,
  payload: CreateQuickLeadPayload,
): Promise<CreateQuickLeadResponse> => {
  const response = await apiRequest("POST", "/api/leads", {
    name: `${payload.firstName} ${payload.lastName}`,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    status: "qualified",
    pipelineStage: "qualified",
    agentId,
    projectId,
  });
  return response.json();
};

export const useCreateQuickLead = (agentId: string, projectId: string) => {
  const queryClientInstance = queryClient;

  return useMutation({
    mutationFn: (data: CreateQuickLeadPayload) =>
      createQuickLead(agentId, projectId, data),
    onSuccess: (newLead) => {
      // Invalidate the leads query so the newly created and qualified lead appears in the list
      queryClientInstance.invalidateQueries({
        queryKey: ["leadsForShowing", agentId, projectId],
      });
      console.log(`New lead ${newLead.id} created and qualified.`);
    },
    onError: (error) => {
      console.error("Error creating quick lead:", error);
    },
  });
};

// Type for dashboard metrics response
type DashboardMetrics = {
  activeSessions: number;
  pendingFollowUps: number;
  projectCount: number;
};

// Type for active client response
type ActiveClient = {
  id: string;
  name: string;
  leadScore: number;
  nextFollowUpDate: string;
};

// Fetch dashboard metrics for an agent
const fetchDashboardMetrics = async (
  agentId: string,
): Promise<DashboardMetrics> => {
  const response = await apiRequest(
    "GET",
    `/api/agents/${agentId}/dashboard`,
    undefined,
  );
  return response.json();
};

// Fetch active clients (qualified leads) for an agent
const fetchActiveClients = async (
  agentId: string,
): Promise<ActiveClient[]> => {
  const response = await apiRequest(
    "GET",
    `/api/agents/${agentId}/active-clients`,
    undefined,
  );
  return response.json();
};

// Hook to fetch dashboard metrics
export const useDashboardMetrics = (agentId: string | null) => {
  return useQuery<DashboardMetrics>({
    queryKey: ["/api/agents", agentId, "dashboard"],
    queryFn: () => {
      if (!agentId) throw new Error("No agent ID provided");
      return fetchDashboardMetrics(agentId);
    },
    enabled: !!agentId,
    staleTime: 30000, // Cache for 30 seconds
  });
};

// Hook to fetch active clients for dashboard
export const useActiveClients = (agentId: string | null) => {
  return useQuery<ActiveClient[]>({
    queryKey: ["/api/agents", agentId, "active-clients"],
    queryFn: () => {
      if (!agentId) throw new Error("No agent ID provided");
      return fetchActiveClients(agentId);
    },
    enabled: !!agentId,
    staleTime: 30000, // Cache for 30 seconds
  });
};

// Type for showing session response (used by both session and visit endpoints)
export type ShowingSession = {
  id: string;
  agentId: string;
  contactId?: string;
  leadId?: string;
  projectId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  endedAt?: string;
  totalUnitsViewed: number;
  duration?: number;
};

// Type for starting a session payload
type StartSessionPayload = {
  agentId: string;
  contactId: string;
  projectId: string;
};

// Start a new showing session via showing-sessions endpoint
const startNewShowingSession = async (payload: StartSessionPayload): Promise<ShowingSession> => {
  const response = await apiRequest("POST", "/api/showing-sessions", payload);
  return response.json();
};

// End a showing session via showing-sessions endpoint
const endShowingSession = async (sessionId: string): Promise<ShowingSession> => {
  const response = await apiRequest("POST", `/api/showing-sessions/${sessionId}/end`, undefined);
  return response.json();
};

// Fetch session status via showing-sessions endpoint
const fetchSessionStatus = async (sessionId: string): Promise<ShowingSession> => {
  const response = await apiRequest("GET", `/api/showing-sessions/${sessionId}`, undefined);
  return response.json();
};

// Hook to start a showing session
export const useStartSession = (agentId: string, projectId: string) => {
  const queryClientInstance = queryClient;

  return useMutation({
    mutationFn: (contactId: string) => 
      startNewShowingSession({ agentId, contactId, projectId }),
    onSuccess: () => {
      // Invalidate dashboard metrics to update 'Active Sessions' count
      queryClientInstance.invalidateQueries({ 
        queryKey: ["/api/agents", agentId, "dashboard"] 
      });
      console.log("Showing session started successfully");
    },
    onError: (error) => {
      console.error("Failed to start showing session:", error);
    },
  });
};

// Hook to end a showing session
export const useEndSession = () => {
  const queryClientInstance = queryClient;

  return useMutation({
    mutationFn: (sessionId: string) => endShowingSession(sessionId),
    onSuccess: () => {
      // Invalidate dashboard queries to reflect new tasks/ended session
      queryClientInstance.invalidateQueries({ 
        queryKey: ["/api/agents"] 
      });
      queryClientInstance.invalidateQueries({ 
        queryKey: ["/api/tasks/count"] 
      });
      console.log("Showing session ended successfully");
    },
    onError: (error) => {
      console.error("Failed to end showing session:", error);
    },
  });
};

// Hook to fetch current session status (for bottom tracker/context)
export const useSessionStatus = (sessionId: string | null) => {
  return useQuery<ShowingSession>({
    queryKey: ["/api/showing-sessions", sessionId],
    queryFn: () => {
      if (!sessionId) throw new Error("No session ID provided");
      return fetchSessionStatus(sessionId);
    },
    enabled: !!sessionId,
    staleTime: 0, // Always fetch fresh data
    refetchInterval: 10000, // Refetch every 10 seconds to keep tracker updated
  });
};

// Type for toured unit response
type TouredUnitResponse = {
  id: string;
  sessionId: string;
  unitId: string;
  unitNumber?: string;
  viewedAt: string;
  agentNotes?: string;
  clientInterestLevel?: string;
};

// Mark a unit as toured
const markUnitToured = async (sessionId: string, unitId: string): Promise<TouredUnitResponse> => {
  const response = await apiRequest("POST", "/api/toured-units", {
    sessionId,
    unitId,
  });
  return response.json();
};

// Fetch list of toured units for a session
const fetchTouredUnits = async (sessionId: string): Promise<TouredUnitResponse[]> => {
  const response = await apiRequest(
    "GET",
    `/api/showing-sessions/${sessionId}/toured-units`,
    undefined
  );
  return response.json();
};

// Hook to mark a unit as toured during a showing session
export const useMarkUnitToured = (sessionId: string | null) => {
  const queryClientInstance = queryClient;

  return useMutation({
    mutationFn: (unitId: string) => {
      if (!sessionId) throw new Error("No active session");
      return markUnitToured(sessionId, unitId);
    },
    onSuccess: () => {
      if (sessionId) {
        // Invalidate session status to update 'Units Toured' count in bottom tracker
        queryClientInstance.invalidateQueries({
          queryKey: ["/api/showing-sessions", sessionId],
        });
        // Invalidate toured units list for sidebar/context display
        queryClientInstance.invalidateQueries({
          queryKey: ["touredUnits", sessionId],
        });
      }
      console.log("Unit marked as toured successfully");
    },
    onError: (error) => {
      console.error("Failed to mark unit as toured:", error);
    },
  });
};

// Hook to fetch the current list of toured units for sidebar/context
export const useTouredUnits = (sessionId: string | null) => {
  return useQuery<TouredUnitResponse[]>({
    queryKey: ["touredUnits", sessionId],
    queryFn: () => {
      if (!sessionId) throw new Error("No session ID provided");
      return fetchTouredUnits(sessionId);
    },
    enabled: !!sessionId,
    staleTime: 0, // Always fetch fresh data
    refetchInterval: 5000, // Refetch every 5 seconds during active session
  });
};

// Type for portal link generation request
type GeneratePortalPayload = {
  sessionId: string;
  contactId: string;
  touredUnitIds: string[];
};

// Type for portal link generation response
type GeneratePortalResponse = {
  linkToken: string;
  portalUrl: string;
  expiresAt: string;
};

// Generate a portal link for a completed showing session
const generatePortalLink = async (payload: GeneratePortalPayload): Promise<GeneratePortalResponse> => {
  const response = await apiRequest("POST", "/api/portal-links", payload);
  return response.json();
};

// Hook to generate portal link after showing session ends
export const useGeneratePortal = () => {
  return useMutation({
    mutationFn: (data: GeneratePortalPayload) => generatePortalLink(data),
    onSuccess: (response) => {
      console.log(`Portal link generated: ${response.portalUrl} (expires: ${response.expiresAt})`);
    },
    onError: (error) => {
      console.error("Failed to generate portal link:", error);
    },
  });
};
