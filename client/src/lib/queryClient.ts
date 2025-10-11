import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
  return {
    mutationFn: (payload: TouredUpdatePayload) => updateTouredUnits({ leadId, payload }),
    onSuccess: () => {
      // Invalidate the specific lead query to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/leads', leadId] });
      console.log('Toured Units updated successfully on the backend.');
    },
  };
};
