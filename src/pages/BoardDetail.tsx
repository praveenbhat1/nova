import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import AppSidebar from "@/components/dashboard/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { ChartRenderer } from "@/components/charts/ChartRenderer";

const BoardDetail = () => {
  const [user, setUser] = useState<User | null>(null);
  const [board, setBoard] = useState<any>(null);
  const [layout, setLayout] = useState<any[]>([]);
  const [charts, setCharts] = useState<any[]>([]);
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
      loadBoard();
    };

    checkUser();
  }, [navigate, id]);

  const loadBoard = async () => {
    if (!id) return;

    const { data: boardData } = await supabase
      .from('boards')
      .select('*')
      .eq('id', id)
      .single();

    if (boardData) {
      setBoard(boardData);
      setLayout(Array.isArray(boardData.layout) ? boardData.layout : []);
    }

    const { data: chartsData } = await supabase
      .from('charts')
      .select('*')
      .limit(10);

    setCharts(chartsData || []);
  };

  const saveLayout = async () => {
    if (!id) return;

    const { error } = await supabase
      .from('boards')
      .update({ layout })
      .eq('id', id);

    if (error) {
      toast.error('Failed to save layout');
    } else {
      toast.success('Layout saved!');
    }
  };

  const addChart = () => {
    const newChart = {
      i: `chart-${Date.now()}`,
      x: (layout.length * 2) % 12,
      y: Infinity,
      w: 6,
      h: 4,
    };
    setLayout([...layout, newChart]);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar user={user} />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold gradient-text mb-2">
                  {board?.title || 'Chart Board'}
                </h1>
                <p className="text-muted-foreground">{board?.description}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={addChart} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Chart
                </Button>
                <Button onClick={saveLayout}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Layout
                </Button>
              </div>
            </div>

            {layout.length > 0 ? (
              <GridLayout
                className="layout"
                layout={layout}
                cols={12}
                rowHeight={60}
                width={1200}
                onLayoutChange={setLayout}
                draggableHandle=".drag-handle"
              >
                {layout.map((item, index) => (
                  <div key={item.i} className="glass-card rounded-2xl overflow-hidden">
                    <div className="drag-handle p-4 bg-background/50 cursor-move border-b border-border">
                      <h3 className="font-bold">Chart {index + 1}</h3>
                    </div>
                    <div className="p-4">
                      {charts[index] ? (
                        <ChartRenderer
                          type={charts[index].chart_type}
                          data={charts[index].config.data || []}
                          config={charts[index].config}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          No data
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </GridLayout>
            ) : (
              <div className="glass-card p-12 rounded-2xl text-center">
                <p className="text-muted-foreground mb-4">
                  No charts yet. Click "Add Chart" to get started.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default BoardDetail;
