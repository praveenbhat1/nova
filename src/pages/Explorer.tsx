import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import AppSidebar from "@/components/dashboard/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { FileUpload } from "@/components/explorer/FileUpload";
import { DatasetCard } from "@/components/explorer/DatasetCard";

const Explorer = () => {
  const [user, setUser] = useState<User | null>(null);
  const [datasets, setDatasets] = useState<any[]>([]);
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
      loadDatasets();
    };

    checkUser();
  }, [navigate]);

  const loadDatasets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('data_sources')
      .select('*')
      .order('created_at', { ascending: false });
    
    setDatasets(data || []);
    setLoading(false);
  };

  const handleAnalyze = (datasetId: string) => {
    navigate('/dashboard', { state: { datasetId } });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar user={user} />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold gradient-text mb-2">Data Explorer</h1>
            <p className="text-muted-foreground mb-8">Upload and browse your datasets</p>
            
            <div className="mb-8">
              <FileUpload onUploadComplete={loadDatasets} />
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : datasets.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {datasets.map(dataset => (
                  <DatasetCard 
                    key={dataset.id} 
                    dataset={dataset}
                    onAnalyze={handleAnalyze}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Explorer;
