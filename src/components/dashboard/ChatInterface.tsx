import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { ChartRenderer } from "@/components/charts/ChartRenderer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
  chart?: {
    type: 'bar' | 'line' | 'pie' | 'area';
    data: any[];
    config: any;
  };
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm Nova, your AI data analyst. Upload a dataset to get started, or ask me anything about your data." }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('query', {
        body: { message: userMessage }
      });

      if (error) throw error;

      const assistantMessage: Message = { 
        role: "assistant", 
        content: data.response || "I apologize, but I couldn't process that request."
      };

      if (data.chart) {
        assistantMessage.chart = data.chart;
      }

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      toast.error("Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4 pb-4">
          {messages.map((message, index) => (
            <div key={index}>
              <MessageBubble message={message} />
              {message.chart && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6 rounded-2xl mt-4 ml-12"
                >
                  <ChartRenderer
                    type={message.chart.type}
                    data={message.chart.data}
                    config={message.chart.config}
                  />
                </motion.div>
              )}
            </div>
          ))}
          {isLoading && <TypingIndicator />}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="glass-card p-4 rounded-2xl mt-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Nova about your data..."
            className="min-h-[60px] resize-none bg-background/50 border-border/50 focus:border-primary"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={isLoading || !input.trim()}
            className="h-[60px] w-[60px]"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
