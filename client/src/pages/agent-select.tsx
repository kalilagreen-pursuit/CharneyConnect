import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { agentContextStore } from '@/lib/localStores';
import type { Agent } from '@shared/schema';

export default function AgentSelect() {
  const [, setLocation] = useLocation();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  const handleSelectAgent = (agentId: string, agentName: string) => {
    setSelectedAgent(agentId);
    agentContextStore.setAgent(agentId, agentName);
    console.log('[AgentSelect] Agent selected', { agentId, agentName, actionId: crypto.randomUUID() });
    
    setTimeout(() => {
      setLocation('/agent/project-select');
    }, 150);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
            <span className="text-foreground">SELECT</span>{' '}
            <span className="text-primary">AGENT</span>
          </h1>
          <p className="text-muted-foreground">Choose your agent profile to continue</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No agents available</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {agents.map((agent) => (
              <Card
                key={agent.id}
                className={`cursor-pointer transition-all hover-elevate active-elevate-2 ${
                  selectedAgent === agent.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleSelectAgent(agent.id, agent.name)}
                data-testid={`card-agent-${agent.id}`}
              >
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-xl uppercase">{agent.name}</CardTitle>
                      <CardDescription className="uppercase text-sm">{agent.role || 'Sales Agent'}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => setLocation('/')}
            data-testid="button-back-dashboard"
          >
            BACK TO DASHBOARD
          </Button>
        </div>
      </div>
    </div>
  );
}
