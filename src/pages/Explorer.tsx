import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Database, Upload } from "lucide-react";
import AppSidebar from "@/components/dashboard/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { User } from "@supabase/supabase-js";

interface DataSource {
  id: string;
  name: string;
  row_count: number | null;
  column_count: number | null;
  created_at: string;
}

const Explorer = () => {
  const [user, setUser] = useState<User | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
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
      await loadDataSources(session.user.id);
    };

    checkUser();
  }, [navigate]);

  const loadDataSources = async (userId: string) => {
    const { data, error } = await supabase
      .from("data_sources")
      .select("id, name, row_count, column_count, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDataSources(data);
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
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold gradient-text">Data Explorer</h1>
                <p className="text-muted-foreground mt-2">Browse and manage your datasets</p>
              </div>
              <Button>
                <Upload className="mr-2 h-4 w-4" />
                Upload Dataset
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dataSources.map((source) => (
                <motion.div
                  key={source.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6 rounded-2xl hover:glow transition-all cursor-pointer"
                >
                  <Database className="h-10 w-10 text-primary mb-4" />
                  <h3 className="font-bold text-lg mb-2">{source.name}</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {source.row_count && <p>{source.row_count} rows</p>}
                    {source.column_count && <p>{source.column_count} columns</p>}
                    <p>{new Date(source.created_at).toLocaleDateString()}</p>
                  </div>
                </motion.div>
              ))}

              {dataSources.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Database className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No datasets yet. Upload your first CSV to get started!</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Explorer;
