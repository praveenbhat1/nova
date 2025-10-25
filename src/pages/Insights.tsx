import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import AppSidebar from "@/components/dashboard/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const Insights = () => {
  const [user, setUser] = useState<User | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadData();
    };

    checkUser();
  }, [navigate]);

  const loadData = async () => {
    const { data: insightsData } = await supabase
      .from('insights')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: sources } = await supabase
      .from('data_sources')
      .select('*')
      .eq('status', 'ready');

    setInsights(insightsData || []);
    setDataSources(sources || []);
  };

  const generateInsights = async (dataSourceId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('insights', {
        body: { dataSourceId }
      });

      if (error) throw error;

      toast.success('Insights generated!');
      loadData();
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar user={user} />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold gradient-text mb-2">AI Insights</h1>
                <p className="text-muted-foreground">Discover patterns and trends in your data</p>
              </div>
              {dataSources.length > 0 && (
                <Button 
                  onClick={() => generateInsights(dataSources[0].id)}
                  disabled={loading}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Insights
                </Button>
              )}
            </div>

            {insights.length > 0 ? (
              <div className="grid gap-6">
                {insights.map((insight, index) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="glass-card p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-primary/10">
                          <TrendingUp className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg">{insight.title}</h3>
                            <Badge variant="secondary">{insight.insight_type}</Badge>
                          </div>
                          <p className="text-muted-foreground">{insight.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(insight.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 rounded-2xl text-center">
                <Lightbulb className="h-16 w-16 text-primary mx-auto mb-4 opacity-50" />
                <h2 className="text-xl font-bold mb-2">No Insights Yet</h2>
                <p className="text-muted-foreground">
                  {dataSources.length > 0 
                    ? 'Click "Generate Insights" to analyze your data'
                    : 'Upload datasets to generate AI-powered insights'}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Insights;
