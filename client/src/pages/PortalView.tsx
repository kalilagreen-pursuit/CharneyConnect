
import React from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bed, Bath, Maximize2, Calendar, Mail, Phone, CheckCircle, AlertCircle } from 'lucide-react';

interface PortalData {
  id: string;
  sessionId: string;
  contactId: string;
  linkToken: string;
  touredUnitIds: string[];
  sentAt: string;
  expiresAt: string;
  contactName?: string;
  contactEmail?: string;
  agentName?: string;
  agentEmail?: string;
  agentPhone?: string;
  projectName?: string;
  units?: Array<{
    id: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    price: string | number;
    floor: number;
    views?: string;
  }>;
}

const PortalView: React.FC = () => {
  const params = useParams();
  const linkToken = params?.token;

  const { data: portalData, isLoading, error, refetch } = useQuery<PortalData>({
    queryKey: ['/api/portals', linkToken],
    queryFn: async () => {
      const response = await fetch(`/api/portals/${linkToken}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Portal not found');
        }
        throw new Error('Failed to fetch portal data');
      }
      return response.json();
    },
    enabled: !!linkToken,
    retry: 1,
  });

  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numPrice);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isExpired = portalData?.expiresAt && new Date(portalData.expiresAt) < new Date();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto"></div>
          <p className="text-lg font-bold uppercase text-muted-foreground">Loading Your Tour Summary...</p>
        </div>
      </div>
    );
  }

  if (error || (!isLoading && !portalData)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold text-destructive">Portal Not Found</h2>
          <p className="text-muted-foreground">
            {error ? (error as Error).message : 'This portal link may have expired or is invalid.'}
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact your agent for a new link.
          </p>
          <Button 
            onClick={() => refetch()} 
            className="w-full min-h-[48px] touch-manipulation"
            variant="outline"
          >
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md p-8 text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">Portal Expired</h2>
          <p className="text-muted-foreground mb-6">
            This portal link expired on {formatDate(portalData.expiresAt)}. Please contact your agent for an updated link.
          </p>
          {portalData.agentEmail && (
            <Button asChild className="w-full">
              <a href={`mailto:${portalData.agentEmail}`}>
                <Mail className="h-4 w-4 mr-2" />
                Contact Agent
              </a>
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-12 px-6 shadow-2xl">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div>
              <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tight mb-3 leading-none">
                {portalData.projectName || 'Luxury Residences'}
              </h1>
              <p className="text-xl opacity-95 font-medium">Your Personalized Tour Summary</p>
            </div>
            <Badge variant="secondary" className="bg-green-600 text-white text-base px-6 py-3 shadow-lg font-black uppercase">
              <CheckCircle className="h-5 w-5 mr-2 fill-white" />
              Tour Confirmed
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Welcome Section */}
        <Card className="p-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Welcome{portalData.contactName ? `, ${portalData.contactName}` : ''}
              </h2>
              <p className="text-muted-foreground mb-4">
                Thank you for touring with {portalData.agentName || 'us'}. Below is a summary of the residences you viewed during your visit.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Tour Date: {formatDate(portalData.sentAt)}</span>
              </div>
            </div>
            
            {portalData.agentEmail && (
              <div className="space-y-2">
                <Button asChild variant="default" size="lg">
                  <a href={`mailto:${portalData.agentEmail}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email {portalData.agentName?.split(' ')[0]}
                  </a>
                </Button>
                {portalData.agentPhone && (
                  <Button asChild variant="outline" size="lg" className="w-full">
                    <a href={`tel:${portalData.agentPhone}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Call Agent
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Toured Units */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold uppercase">
              Units Toured ({portalData.units?.length || portalData.touredUnitIds.length})
            </h3>
            <Badge variant="outline" className="text-sm">
              <CheckCircle className="h-4 w-4 mr-1" />
              Exclusive Access
            </Badge>
          </div>

          {portalData.units && portalData.units.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="portal-toured-units-grid">
              {portalData.units.map((unit) => (
                <Card 
                  key={unit.id} 
                  className="p-8 hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-2"
                  data-testid={`portal-unit-${unit.unitNumber}`}
                >
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-3xl font-black uppercase tracking-tight">Unit {unit.unitNumber}</h4>
                      <p className="text-4xl font-black text-primary mt-3">
                        {formatPrice(unit.price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        <span>{unit.bedrooms} BD</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        <span>{unit.bathrooms} BA</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Maximize2 className="h-4 w-4" />
                        <span>{unit.squareFeet.toLocaleString()} SF</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">Floor {unit.floor}</p>
                      {unit.views && (
                        <p className="text-sm text-muted-foreground">Views: {unit.views}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                {portalData.touredUnitIds.length} unit(s) toured. Contact your agent for detailed information.
              </p>
            </Card>
          )}
        </div>

        {/* Next Steps */}
        <Card className="p-8 bg-primary/5 border-l-4 border-primary">
          <h3 className="text-xl font-bold mb-4">Next Steps</h3>
          <p className="text-muted-foreground mb-4">
            {portalData.agentName || 'Your agent'} will follow up with you shortly to discuss these residences in detail and answer any questions you may have.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>This link is valid until {formatDate(portalData.expiresAt)}</span>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-muted mt-12 py-8 px-6">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          <p>
            Questions? Contact {portalData.agentName || 'your agent'} directly at{' '}
            {portalData.agentEmail && (
              <a href={`mailto:${portalData.agentEmail}`} className="text-primary hover:underline">
                {portalData.agentEmail}
              </a>
            )}
            {portalData.agentPhone && (
              <>
                {' or '}
                <a href={`tel:${portalData.agentPhone}`} className="text-primary hover:underline">
                  {portalData.agentPhone}
                </a>
              </>
            )}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PortalView;
