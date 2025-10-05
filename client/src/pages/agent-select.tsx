import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import { agentContextStore } from '@/lib/localStores';

const AGENTS = [
  { id: 'agent-001', name: 'Sarah Chen', role: 'Senior Sales Agent' },
  { id: 'agent-002', name: 'Michael Rodriguez', role: 'Sales Agent' },
  { id: 'agent-003', name: 'Emily Park', role: 'Sales Agent' },
  { id: 'agent-004', name: 'David Thompson', role: 'Junior Sales Agent' },
  { id: 'agent-005', name: 'Jessica Williams', role: 'Sales Agent' },
];

export default function AgentSelect() {
  const [, setLocation] = useLocation();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

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

        <div className="grid gap-4 md:grid-cols-2">
          {AGENTS.map((agent) => (
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
                    <CardDescription className="uppercase text-sm">{agent.role}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

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
