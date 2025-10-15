
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, User, Mail, Phone, ChevronRight } from 'lucide-react';
import type { Lead } from '@shared/schema';

interface LeadSearchAutocompleteProps {
  agentId: string;
  onLeadSelect: (lead: Lead) => void;
}

export function LeadSearchAutocomplete({
  agentId,
  onLeadSelect,
}: LeadSearchAutocompleteProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all leads for the agent
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['/api/leads', agentId],
    queryFn: async () => {
      const response = await fetch(`/api/leads?agentId=${agentId}`);
      if (!response.ok) throw new Error('Failed to fetch leads');
      return response.json();
    },
  });

  // Filter leads based on search query (client-side filtering)
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase();
    return leads.filter((lead) => {
      const name = lead.name?.toLowerCase() || '';
      const email = lead.email?.toLowerCase() || '';
      const phone = lead.phone?.toLowerCase() || '';

      return (
        name.includes(query) ||
        email.includes(query) ||
        phone.includes(query)
      );
    }).slice(0, 10); // Limit to 10 results
  }, [leads, searchQuery]);

  const handleLeadClick = (lead: Lead) => {
    onLeadSelect(lead);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone (min 2 characters)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-lead-search"
        />
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Loading leads...
        </p>
      )}

      {searchQuery.length >= 2 && filteredLeads.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-8 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No leads found matching "{searchQuery}"</p>
            <p className="text-sm text-muted-foreground">
              Try a different search term or create a new lead
            </p>
          </CardContent>
        </Card>
      )}

      {filteredLeads.length > 0 && (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredLeads.map((lead) => (
            <Card
              key={lead.id}
              className="cursor-pointer hover-elevate active-elevate-2 transition-all"
              onClick={() => handleLeadClick(lead)}
              data-testid={`lead-result-${lead.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="font-bold uppercase">{lead.name}</p>
                    </div>
                    {lead.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{lead.email}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searchQuery.length > 0 && searchQuery.length < 2 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Type at least 2 characters to search
        </p>
      )}
    </div>
  );
}
