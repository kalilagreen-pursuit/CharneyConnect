
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLeadsForShowing, useCreateQuickLead } from '@/lib/queryClient';
import { Search, UserPlus } from 'lucide-react';

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface StartShowingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agentId: string;
  projectId: string;
  onSelectLead: (leadId: string) => void;
  projectName?: string;
  agentName?: string;
}

export function StartShowingDialog({ 
  isOpen, 
  onClose, 
  agentId, 
  projectId, 
  onSelectLead,
  projectName = 'this project',
  agentName = 'Agent'
}: StartShowingDialogProps) {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  
  const { data: leads = [], isLoading } = useLeadsForShowing(agentId, projectId);
  const createMutation = useCreateQuickLead(agentId, projectId);

  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    const search = searchTerm.toLowerCase();
    return leads.filter(lead => 
      lead.firstName.toLowerCase().includes(search) || 
      lead.lastName.toLowerCase().includes(search) ||
      lead.email?.toLowerCase().includes(search)
    );
  }, [leads, searchTerm]);

  const handleCreateSubmit = async () => {
    if (!newLeadData.firstName || !newLeadData.lastName) {
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        firstName: newLeadData.firstName,
        lastName: newLeadData.lastName,
        email: newLeadData.email || undefined,
        phone: newLeadData.phone || undefined,
      });

      if (result?.id) {
        onSelectLead(result.id);
        handleClose();
      }
    } catch (error) {
      console.error('Failed to create lead:', error);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setIsCreating(false);
    setNewLeadData({ firstName: '', lastName: '', email: '', phone: '' });
    onClose();
  };

  const handleLeadSelect = (leadId: string) => {
    onSelectLead(leadId);
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="dialog-start-showing">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">
            Start Showing Session
          </DialogTitle>
          <DialogDescription>
            Select a qualified lead or create a new one for this showing session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Field - Always Visible */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search qualified leads by name or email..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              disabled={isLoading || isCreating}
              data-testid="input-search-leads"
            />
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading qualified leads...
            </p>
          )}
          
          {/* Display List or No Results */}
          {!isLoading && !isCreating && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredLeads.length > 0 ? (
                // Display search results
                filteredLeads.map(lead => (
                  <Button 
                    key={lead.id} 
                    variant="outline" 
                    className="w-full justify-start text-left"
                    onClick={() => handleLeadSelect(lead.id)}
                    data-testid={`button-select-lead-${lead.id}`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">
                        {lead.firstName} {lead.lastName}
                      </span>
                      {lead.email && (
                        <span className="text-xs text-muted-foreground">
                          {lead.email}
                        </span>
                      )}
                    </div>
                  </Button>
                ))
              ) : (
                // No results found: Prompt to create a new lead
                <div className="text-center p-6 border border-dashed rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-1">
                    No qualified leads available
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {searchTerm ? `No matches for "${searchTerm}"` : `Project: ${projectName} • Agent: ${agentName}`}
                  </p>
                  <Button 
                    onClick={() => { setSearchTerm(''); setIsCreating(true); }}
                    variant="default"
                    className="uppercase font-black"
                    data-testid="button-create-new-lead"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    CREATE NEW LEAD
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Inline Creation Form */}
          {isCreating && (
            <div className="p-4 border rounded-lg bg-primary/5 space-y-3">
              <h4 className="text-sm font-bold uppercase mb-3">Quick Add Prospect</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  placeholder="First Name *" 
                  value={newLeadData.firstName}
                  onChange={(e) => setNewLeadData(p => ({ ...p, firstName: e.target.value }))}
                  data-testid="input-first-name"
                />
                <Input 
                  placeholder="Last Name *" 
                  value={newLeadData.lastName}
                  onChange={(e) => setNewLeadData(p => ({ ...p, lastName: e.target.value }))}
                  data-testid="input-last-name"
                />
              </div>
              
              <Input 
                placeholder="Email (Optional)" 
                type="email"
                value={newLeadData.email}
                onChange={(e) => setNewLeadData(p => ({ ...p, email: e.target.value }))}
                data-testid="input-email"
              />
              
              <Input 
                placeholder="Phone (Optional)" 
                type="tel"
                value={newLeadData.phone}
                onChange={(e) => setNewLeadData(p => ({ ...p, phone: e.target.value }))}
                data-testid="input-phone"
              />
              
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreating(false)} 
                  disabled={createMutation.isPending}
                  className="flex-1"
                  data-testid="button-back-to-search"
                >
                  ← Back to Search
                </Button>
                <Button 
                  onClick={handleCreateSubmit} 
                  disabled={!newLeadData.firstName || !newLeadData.lastName || createMutation.isPending}
                  className="flex-1 uppercase font-black"
                  data-testid="button-save-and-start"
                >
                  {createMutation.isPending ? 'SAVING...' : 'SAVE & START'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
