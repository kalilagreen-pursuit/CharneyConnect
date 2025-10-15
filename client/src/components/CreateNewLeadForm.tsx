
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Lead } from '@shared/schema';

interface CreateNewLeadFormProps {
  agentId: string;
  onLeadCreated: (lead: Lead) => void;
  onCancel: () => void;
}

export function CreateNewLeadForm({
  agentId,
  onLeadCreated,
  onCancel,
}: CreateNewLeadFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    targetPriceMin: '',
    targetPriceMax: '',
    targetBedrooms: '',
    targetBathrooms: '',
  });

  const createLeadMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
          status: 'qualified',
          pipelineStage: 'qualified',
          agentId,
          targetPriceMin: data.targetPriceMin || undefined,
          targetPriceMax: data.targetPriceMax || undefined,
          targetBedrooms: data.targetBedrooms ? parseInt(data.targetBedrooms) : undefined,
          targetBathrooms: data.targetBathrooms ? parseInt(data.targetBathrooms) : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to create lead');
      return response.json();
    },
    onSuccess: (newLead: Lead) => {
      toast({
        title: 'Lead Created',
        description: `${newLead.name} has been added and qualified`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      onLeadCreated(newLead);
    },
    onError: (error) => {
      console.error('Error creating lead:', error);
      toast({
        title: 'Error',
        description: 'Failed to create lead. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for the lead',
        variant: 'destructive',
      });
      return;
    }

    createLeadMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="uppercase text-xs font-bold">
            Name *
          </Label>
          <Input
            id="name"
            placeholder="Client Name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            required
            data-testid="input-lead-name"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="uppercase text-xs font-bold">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              data-testid="input-lead-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="uppercase text-xs font-bold">
              Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              data-testid="input-lead-phone"
            />
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <h4 className="text-sm font-bold uppercase">Initial Preferences (Optional)</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetPriceMin" className="uppercase text-xs font-bold">
                Min Price
              </Label>
              <Input
                id="targetPriceMin"
                type="number"
                placeholder="400000"
                value={formData.targetPriceMin}
                onChange={(e) => handleInputChange('targetPriceMin', e.target.value)}
                data-testid="input-price-min"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetPriceMax" className="uppercase text-xs font-bold">
                Max Price
              </Label>
              <Input
                id="targetPriceMax"
                type="number"
                placeholder="1500000"
                value={formData.targetPriceMax}
                onChange={(e) => handleInputChange('targetPriceMax', e.target.value)}
                data-testid="input-price-max"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetBedrooms" className="uppercase text-xs font-bold">
                Bedrooms
              </Label>
              <Input
                id="targetBedrooms"
                type="number"
                placeholder="2"
                min="0"
                max="10"
                value={formData.targetBedrooms}
                onChange={(e) => handleInputChange('targetBedrooms', e.target.value)}
                data-testid="input-bedrooms"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetBathrooms" className="uppercase text-xs font-bold">
                Bathrooms
              </Label>
              <Input
                id="targetBathrooms"
                type="number"
                placeholder="2"
                min="0"
                max="10"
                value={formData.targetBathrooms}
                onChange={(e) => handleInputChange('targetBathrooms', e.target.value)}
                data-testid="input-bathrooms"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={createLeadMutation.isPending}
          className="flex-1"
          data-testid="button-cancel-create"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createLeadMutation.isPending || !formData.name.trim()}
          className="flex-1 uppercase font-black"
          data-testid="button-create-qualify"
        >
          {createLeadMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create & Qualify Lead'
          )}
        </Button>
      </div>
    </form>
  );
}
