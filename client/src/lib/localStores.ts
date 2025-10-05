export interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  contactMethod: 'email' | 'phone' | 'in_person';
  budget: number;
  consentGiven: boolean;
  consentTimestamp: string;
  type?: 'buyer' | 'broker_client';
  createdAt: string;
  agentId?: string;
  projectId?: string;
}

export interface Visit {
  id: string;
  prospectId: string;
  unitId: string;
  agentId: string;
  timestamp: string;
  notes?: string;
  duration?: number;
}

export interface Interaction {
  id: string;
  prospectId: string;
  type: 'call' | 'email' | 'meeting' | 'showing' | 'follow_up';
  notes: string;
  timestamp: string;
  agentId: string;
}

export interface Hold {
  id: string;
  unitId: number;
  prospectId: string;
  agentId: string;
  startTime: string;
  expiresAt: string;
  quotePrice?: number;
  status: 'active' | 'expired' | 'converted' | 'released';
}

export interface FollowUp {
  id: string;
  prospectId: string;
  agentId: string;
  dueAt: string;
  type: 'call' | 'email' | 'tour' | 'contract_review';
  notes?: string;
  completed: boolean;
  completedAt?: string;
}

export interface Agreement {
  id: string;
  prospectId: string;
  type: 'tour_agreement' | 'nda' | 'buyer_agency';
  signedAt: string;
  documentUrl?: string;
}

export interface Task {
  id: string;
  managerId: string;
  assignedTo?: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  completedAt?: string;
}

export interface UnitMatrixFilter {
  building?: string;
  bedrooms?: number[];
  bathrooms?: number[];
  priceMin?: number;
  priceMax?: number;
  sqftMin?: number;
  sqftMax?: number;
}

class LocalStore<T> {
  private storeName: string;

  constructor(storeName: string) {
    this.storeName = storeName;
  }

  getAll(): T[] {
    const data = localStorage.getItem(this.storeName);
    return data ? JSON.parse(data) : [];
  }

  get(id: string): T | undefined {
    const items = this.getAll();
    return items.find((item: any) => item.id === id);
  }

  add(item: T): void {
    const items = this.getAll();
    items.push(item);
    localStorage.setItem(this.storeName, JSON.stringify(items));
    console.log(`[LocalStore:${this.storeName}] Added item`, { id: (item as any).id, actionId: crypto.randomUUID() });
  }

  update(id: string, updates: Partial<T>): T | undefined {
    const items = this.getAll();
    const index = items.findIndex((item: any) => item.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      localStorage.setItem(this.storeName, JSON.stringify(items));
      console.log(`[LocalStore:${this.storeName}] Updated item`, { id, actionId: crypto.randomUUID() });
      return items[index];
    }
    return undefined;
  }

  delete(id: string): boolean {
    const items = this.getAll();
    const filtered = items.filter((item: any) => item.id !== id);
    if (filtered.length !== items.length) {
      localStorage.setItem(this.storeName, JSON.stringify(filtered));
      console.log(`[LocalStore:${this.storeName}] Deleted item`, { id, actionId: crypto.randomUUID() });
      return true;
    }
    return false;
  }

  clear(): void {
    localStorage.setItem(this.storeName, JSON.stringify([]));
    console.log(`[LocalStore:${this.storeName}] Cleared all items`, { actionId: crypto.randomUUID() });
  }
}

export const prospectsStore = new LocalStore<Prospect>('charney_prospects');
export const visitsStore = new LocalStore<Visit>('charney_visits');
export const interactionsStore = new LocalStore<Interaction>('charney_interactions');
export const holdsStore = new LocalStore<Hold>('charney_holds');
export const followupsStore = new LocalStore<FollowUp>('charney_followups');
export const agreementsStore = new LocalStore<Agreement>('charney_agreements');
export const tasksStore = new LocalStore<Task>('charney_tasks');

export const filterStore = {
  get(): UnitMatrixFilter | null {
    const data = localStorage.getItem('charney_unit_filter');
    return data ? JSON.parse(data) : null;
  },
  set(filter: UnitMatrixFilter): void {
    localStorage.setItem('charney_unit_filter', JSON.stringify(filter));
    console.log('[FilterStore] Saved filter state', { actionId: crypto.randomUUID() });
  },
  clear(): void {
    localStorage.removeItem('charney_unit_filter');
    console.log('[FilterStore] Cleared filter state', { actionId: crypto.randomUUID() });
  }
};

export const mlsSafeStore = {
  get(): boolean {
    const value = localStorage.getItem('charney_mls_safe');
    return value === 'true';
  },
  set(enabled: boolean): void {
    localStorage.setItem('charney_mls_safe', enabled.toString());
    console.log('[MLSSafeStore] Set MLS-Safe mode', { enabled, actionId: crypto.randomUUID() });
  }
};

export const agentContextStore = {
  setAgent(agentId: string, agentName: string): void {
    localStorage.setItem('charney_current_agent_id', agentId);
    localStorage.setItem('charney_current_agent_name', agentName);
    console.log('[AgentContext] Set current agent', { agentId, agentName, actionId: crypto.randomUUID() });
  },
  setProject(projectId: string, projectName: string): void {
    localStorage.setItem('charney_current_project_id', projectId);
    localStorage.setItem('charney_current_project_name', projectName);
    console.log('[AgentContext] Set current project', { projectId, projectName, actionId: crypto.randomUUID() });
  },
  getAgentId(): string | null {
    return localStorage.getItem('charney_current_agent_id');
  },
  getAgentName(): string | null {
    return localStorage.getItem('charney_current_agent_name');
  },
  getProjectId(): string | null {
    return localStorage.getItem('charney_current_project_id');
  },
  getProjectName(): string | null {
    return localStorage.getItem('charney_current_project_name');
  },
  clear(): void {
    localStorage.removeItem('charney_current_agent_id');
    localStorage.removeItem('charney_current_agent_name');
    localStorage.removeItem('charney_current_project_id');
    localStorage.removeItem('charney_current_project_name');
    console.log('[AgentContext] Cleared context', { actionId: crypto.randomUUID() });
  }
};

export function isQuietHours(date: Date = new Date()): boolean {
  const hours = date.getHours();
  const isQuiet = hours >= 20 || hours < 9;
  console.log('[QuietHours] Check', { hours, isQuiet, actionId: crypto.randomUUID() });
  return isQuiet;
}

export function getNextAvailableFollowUpTime(preferredDate?: Date): Date {
  const date = preferredDate || new Date();
  const hours = date.getHours();
  
  if (hours >= 20) {
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
  } else if (hours < 9) {
    date.setHours(9, 0, 0, 0);
  }
  
  console.log('[QuietHours] Next available time', { result: date.toISOString(), actionId: crypto.randomUUID() });
  return date;
}
