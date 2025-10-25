import { Database, Calendar, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Dataset {
  id: string;
  name: string;
  row_count: number;
  column_count: number;
  created_at: string;
  status: string;
}

interface DatasetCardProps {
  dataset: Dataset;
  onAnalyze: (id: string) => void;
}

export const DatasetCard = ({ dataset, onAnalyze }: DatasetCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="glass-card p-6 hover:shadow-glow transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{dataset.name}</h3>
              <Badge variant={dataset.status === 'ready' ? 'default' : 'secondary'}>
                {dataset.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            <span>{dataset.row_count?.toLocaleString()} rows</span>
            <span>•</span>
            <span>{dataset.column_count} columns</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{new Date(dataset.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <Button 
          onClick={() => onAnalyze(dataset.id)}
          className="w-full"
          disabled={dataset.status !== 'ready'}
        >
          Analyze Dataset
        </Button>
      </Card>
    </motion.div>
  );
};
