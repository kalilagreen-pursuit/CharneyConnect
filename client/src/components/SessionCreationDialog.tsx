
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LeadSearchAutocomplete } from './LeadSearchAutocomplete';
import { CreateNewLeadForm } from './CreateNewLeadForm';
import type { Lead } from '@shared/schema';

interface SessionCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  onSessionStart: (sessionId: string, leadId: string, projectId: string) => void;
}

export function SessionCreationDialog({
  isOpen,
  onClose,
  agentId,
  onSessionStart,
}: SessionCreationDialogProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'create'>('search');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const handleLeadSelect = async (lead: Lead) => {
    setSelectedLead(lead);
    
    // For now, we'll use a default project ID (THE JACKSON)
    // In a future enhancement, we could add project selection here
    const defaultProjectId = "2320eeb4-596b-437d-b4cb-830bdb3c3b01";

    try {
      // Create showing session
      const response = await fetch('/api/showing-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          leadId: lead.id,
          projectId: defaultProjectId,
        }),
      });

      if (!response.ok) throw new Error('Failed to create session');

      const session = await response.json();
      const sessionId = session.id || session.sessionId;

      // Call success callback
      onSessionStart(sessionId, lead.id, defaultProjectId);
      
      // Reset state and close
      handleClose();
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleLeadCreate = async (newLead: Lead) => {
    // Pass the newly created lead to handleLeadSelect
    await handleLeadSelect(newLead);
  };

  const handleClose = () => {
    setSelectedLead(null);
    setActiveTab('search');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-session-creation">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">
            Start New Showing Session
          </DialogTitle>
          <DialogDescription>
            Search for an existing lead or create a new one to begin tracking the showing
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'search' | 'create')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="uppercase font-bold">
              Search Existing Lead
            </TabsTrigger>
            <TabsTrigger value="create" className="uppercase font-bold">
              Create New Lead
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <LeadSearchAutocomplete
              agentId={agentId}
              onLeadSelect={handleLeadSelect}
            />
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <CreateNewLeadForm
              agentId={agentId}
              onLeadCreated={handleLeadCreate}
              onCancel={() => setActiveTab('search')}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
