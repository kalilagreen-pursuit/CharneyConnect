import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { ChatModal } from "@/components/chat-modal";

export function FloatingAIButton() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50"
        onClick={() => setChatOpen(true)}
        data-testid="button-open-ai-chat"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      <ChatModal open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
}
