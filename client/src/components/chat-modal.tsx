import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatModal({ open, onOpenChange }: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string>();

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      // Server loads history from database, no need to send it
      const response = await apiRequest(
        "POST",
        "/api/chat/strategy",
        { 
          message: userMessage, 
          conversationId,
          agentId: "default_agent"  // TODO: Get from auth context
        }
      );
      return await response.json() as { message: string; conversationId: string };
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message },
      ]);
      setConversationId(data.conversationId);
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    chatMutation.mutate(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Charney <span className="text-primary">Sales Assistant</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <Sparkles className="h-16 w-16 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-bold uppercase tracking-wide">
                  How Can I Help Today?
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Ask me about property details, objection handling, buyer qualification, or market intelligence.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${message.role}-${index}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {chatMutation.isPending && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <div className="flex gap-1">
                      <span className="animate-pulse">●</span>
                      <span className="animate-pulse animation-delay-200">●</span>
                      <span className="animate-pulse animation-delay-400">●</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="px-6 py-4 border-t">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a sales strategy question..."
              disabled={chatMutation.isPending}
              data-testid="input-chat-message"
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
              size="icon"
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
