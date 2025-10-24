import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import AppSidebar from "@/components/dashboard/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { LayoutDashboard } from "lucide-react";

const BoardDetail = () => {
  const [user, setUser] = useState<User | null>(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };

    checkUser();
  }, [navigate]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar user={user} />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold gradient-text mb-2">Chart Board</h1>
            <p className="text-muted-foreground mb-8">Create and organize your visualizations</p>
            
            <div className="glass-card p-12 rounded-2xl text-center">
              <LayoutDashboard className="h-16 w-16 text-primary mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold mb-2">Coming Soon</h2>
              <p className="text-muted-foreground">
                Drag-and-drop chart boards will be available in the next update
              </p>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default BoardDetail;
