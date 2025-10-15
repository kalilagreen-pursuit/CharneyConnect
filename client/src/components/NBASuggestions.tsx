
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Star, TrendingUp } from "lucide-react";

interface NBASuggestionsProps {
  suggestions: string[];
  sessionId: string;
}

export function NBASuggestions({ suggestions, sessionId }: NBASuggestionsProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <Alert className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 shadow-lg">
      <Lightbulb className="h-5 w-5 text-primary" />
      <AlertTitle className="font-black uppercase text-base flex items-center gap-2">
        Next Best Actions
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
          AI Powered
        </Badge>
      </AlertTitle>
      <AlertDescription className="mt-3 space-y-2">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border/50"
            data-testid={`nba-suggestion-${index}`}
          >
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              {index === 0 ? (
                <Star className="h-3.5 w-3.5 text-primary fill-primary" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
              )}
            </div>
            <p className="text-sm font-medium leading-relaxed">{suggestion}</p>
          </div>
        ))}
      </AlertDescription>
    </Alert>
  );
}
