import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const TypingIndicator = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
        <Sparkles className="h-5 w-5 text-white" />
      </div>

      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">Nova is thinking</span>
          <div className="flex gap-1 ml-2">
            <div className="typing-dot w-2 h-2 rounded-full bg-primary"></div>
            <div className="typing-dot w-2 h-2 rounded-full bg-primary"></div>
            <div className="typing-dot w-2 h-2 rounded-full bg-primary"></div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TypingIndicator;
