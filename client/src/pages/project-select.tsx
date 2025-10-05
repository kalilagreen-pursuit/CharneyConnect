import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, ArrowLeft } from 'lucide-react';
import { agentContextStore } from '@/lib/localStores';

interface ProjectWithCounts {
  id: number;
  name: string;
  address: string;
  available: number;
  reserved: number;
  sold: number;
  totalUnits: number;
}

export default function ProjectSelect() {
  const [, setLocation] = useLocation();
  const agentName = agentContextStore.getAgentName();

  const { data: projects, isLoading } = useQuery<ProjectWithCounts[]>({
    queryKey: ['/api/projects/counts'],
  });

  const handleSelectProject = (projectId: number, projectName: string) => {
    agentContextStore.setProject(projectId.toString(), projectName);
    console.log('[ProjectSelect] Project selected', { projectId, projectName, actionId: crypto.randomUUID() });
    
    setTimeout(() => {
      setLocation('/agent/unit-map');
    }, 150);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">Loading projects...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation('/agent/select')}
            className="mb-4"
            data-testid="button-back-agent"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            BACK
          </Button>
          
          <div className="text-center">
            <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
              <span className="text-foreground">SELECT</span>{' '}
              <span className="text-primary">PROPERTY</span>
            </h1>
            {agentName && (
              <p className="text-muted-foreground">
                Agent: <span className="font-semibold text-foreground">{agentName}</span>
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          {projects?.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-all hover-elevate active-elevate-2"
              onClick={() => handleSelectProject(project.id, project.name)}
              data-testid={`card-project-${project.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded bg-muted flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl uppercase">{project.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">{project.address}</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" data-testid={`badge-total-${project.id}`}>
                    {project.totalUnits} UNITS
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600" data-testid={`text-available-${project.id}`}>
                      {project.available}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-600" data-testid={`text-reserved-${project.id}`}>
                      {project.reserved}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">Reserved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600" data-testid={`text-sold-${project.id}`}>
                      {project.sold}
                    </div>
                    <div className="text-xs text-muted-foreground uppercase">Sold</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
