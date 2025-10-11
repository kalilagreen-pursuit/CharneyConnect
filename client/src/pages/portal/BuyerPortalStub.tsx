
import React from 'react';
import { useParams } from 'wouter';

const BuyerPortalStub: React.FC = () => {
  const params = useParams();
  const leadId = params?.leadId || 'Valued Client'; 
  
  // NOTE: This array would be dynamically fetched using the leadId in a real app
  const mockTouredUnits = ['14A', '20C', '32F']; 

  return (
    <div className="min-h-screen bg-[#F6F1EB] text-foreground font-sans">
      {/* Charney Red Accent Bar */}
      <div className="w-full h-1.5 bg-primary" />
      
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-12">
          <h1 className="text-5xl md:text-6xl uppercase font-black tracking-tight mb-2">
            CHARNEY
          </h1>
          <p className="text-xl text-muted-foreground uppercase tracking-wide">
            Your Exclusive Portal
          </p>
        </header>

        <main>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-4">
            Welcome Back, {leadId}
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-3xl">
            Thank you for visiting us. Below are the key residences you toured during your session.
            Click any unit for full specifications and high-resolution renderings.
          </p>

          <div className="border-l-4 border-primary pl-6 mb-6">
            <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              Your Toured Residences
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockTouredUnits.map((id) => (
              <div 
                key={id} 
                className="bg-card border border-card-border rounded-lg p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
              >
                <h4 className="text-2xl font-black uppercase mb-3">Unit {id}</h4>
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-bold uppercase">Views:</span> City Skyline
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-bold uppercase">SqFt:</span> Approx. 1,850
                  </p>
                </div>
                <a 
                  href="#" 
                  className="inline-block text-primary font-bold uppercase text-sm hover:underline transition-all"
                >
                  View Floor Plan →
                </a>
              </div>
            ))}
          </div>
        </main>

        <footer className="mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Charney & Co. All Rights Reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default BuyerPortalStub;
