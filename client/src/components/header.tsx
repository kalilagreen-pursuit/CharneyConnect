import { Link, useLocation } from "wouter";
import { Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Header() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Unit Map", icon: Building2, testId: "link-dashboard" },
    { path: "/leads", label: "Leads", icon: Users, testId: "link-leads" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="flex h-16 items-center justify-between px-6 gap-4">
        <div className="flex items-center gap-8">
          <Link href="/">
            <div className="flex items-center gap-2 hover-elevate active-elevate-2 px-3 py-2 rounded-md transition-all cursor-pointer" data-testid="link-home">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Charney CRM</h1>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="default"
                    className="gap-2"
                    data-testid={item.testId}
                    asChild
                  >
                    <a>
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </a>
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" data-testid="indicator-realtime" />
            <span className="text-xs font-medium">Real-time</span>
          </div>
        </div>
      </div>
    </header>
  );
}
