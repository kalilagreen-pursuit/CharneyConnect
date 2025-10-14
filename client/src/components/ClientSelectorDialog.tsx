
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { Search, UserPlus, Building2, AlertCircle } from 'lucide-react';
import { Lead } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface ClientSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  onSessionStart: (sessionId: string, leadId: string, projectId: string) => void;
}

const PROJECTS = [
  { id: "2320eeb4-596b-437d-b4cb-830bdb3c3b01", name: "THE JACKSON" },
  { id: "f3ae960d-a0a9-4449-82fe-ffab7b01f3fa", name: "THE DIME" },
  { id: "6f9a358c-0fc6-41bd-bd5e-6234b68295cb", name: "GOWANUS" },
];

export function ClientSelectorDialog({ isOpen, onClose, agentId, onSessionStart }: ClientSelectorDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(PROJECTS[0].id);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const { toast } = useToast();

  // Fetch qualified leads for the selected project
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads", agentId, selectedProjectId, "qualified"],
    queryFn: async () => {
      const response = await fetch(`/api/leads?agentId=${agentId}&projectId=${selectedProjectId}&status=qualified`);
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json();
    },
    enabled: isOpen && !!agentId && !!selectedProjectId,
  });

  // Filter leads based on search
  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    const query = searchTerm.toLowerCase();
    return leads.filter(lead => {
      const name = lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
      const email = lead.email || '';
      return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
    });
  }, [leads, searchTerm]);

  const selectedLead = leads.find(l => l.id === selectedLeadId);
  const selectedProject = PROJECTS.find(p => p.id === selectedProjectId);

  const handleStartSession = async () => {
    if (!selectedLeadId || !selectedProjectId) {
      toast({
        title: "Selection Required",
        description: "Please select a client and project",
        variant: "destructive",
      });
      return;
    }

    setIsStarting(true);

    try {
      const response = await fetch('/api/showing-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          contactId: selectedLeadId,
          projectId: selectedProjectId,
        }),
      });

      if (!response.ok) throw new Error("Failed to start session");

      const session = await response.json();

      toast({
        title: "Session Started",
        description: `Showing session started for ${selectedLead?.name || 'client'}`,
      });

      onSessionStart(session.id || session.sessionId, selectedLeadId, selectedProjectId);
      handleClose();
    } catch (error) {
      console.error("Error starting session:", error);
      toast({
        title: "Error",
        description: "Failed to start showing session",
        variant: "destructive",
      });
      setIsStarting(false);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedLeadId(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-client-selector">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase">Start Showing Session</DialogTitle>
          <DialogDescription>
            Select a qualified client and project to begin tracking the showing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Project Selection */}
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase">Project</label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full" data-testid="select-project">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECTS.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Search */}
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase">Select Client</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search qualified clients by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                disabled={isLoading}
                data-testid="input-search-clients"
              />
            </div>
          </div>

          {/* Client List */}
          <div className="space-y-2">
            {isLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Loading qualified clients...
              </p>
            )}

            {!isLoading && filteredLeads.length === 0 && (
              <div className="text-center p-6 border border-dashed rounded-lg bg-muted/50">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  No qualified clients found for {selectedProject?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {searchTerm ? `No matches for "${searchTerm}"` : 'Qualify leads first in the Leads page'}
                </p>
              </div>
            )}

            {!isLoading && filteredLeads.length > 0 && (
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {filteredLeads.map(lead => {
                  const name = lead.name || `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
                  const isSelected = selectedLeadId === lead.id;

                  return (
                    <Button
                      key={lead.id}
                      variant={isSelected ? "default" : "outline"}
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => setSelectedLeadId(lead.id)}
                      data-testid={`button-select-client-${lead.id}`}
                    >
                      <div className="flex flex-col items-start w-full">
                        <div className="font-bold">{name}</div>
                        <div className="text-sm text-muted-foreground">{lead.email}</div>
                        {lead.leadScore && (
                          <div className="text-xs mt-1">Score: {lead.leadScore}</div>
                        )}
                      </div>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isStarting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartSession}
              className="flex-1 uppercase font-black"
              disabled={!selectedLeadId || isStarting}
              data-testid="button-start-session"
            >
              {isStarting ? 'Starting...' : 'Start Session'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
