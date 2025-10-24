import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Lightbulb } from "lucide-react";
import AppSidebar from "@/components/dashboard/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

interface Insight {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const Insights = () => {
  const [user, setUser] = useState<User | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadInsights(session.user.id);
    };

    checkUser();
  }, [navigate]);

  const loadInsights = async (userId: string) => {
    const { data, error } = await supabase
      .from("insights")
      .select("id, title, content, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setInsights(data);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar user={user} />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold gradient-text mb-2">AI Insights</h1>
            <p className="text-muted-foreground mb-8">
              Discover patterns and trends in your data
            </p>

            <div className="space-y-4">
              {insights.map((insight) => (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6 rounded-2xl"
                >
                  <div className="flex items-start gap-4">
                    <Lightbulb className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">{insight.title}</h3>
                      <p className="text-muted-foreground">{insight.content}</p>
                      <span className="text-xs text-muted-foreground mt-4 block">
                        {new Date(insight.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {insights.length === 0 && (
                <div className="glass-card p-12 rounded-2xl text-center">
                  <Lightbulb className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    No insights yet. Chat with NOVA to generate insights from your data!
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Insights;
