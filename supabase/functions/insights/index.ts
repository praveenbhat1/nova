import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { dataSourceId } = await req.json();

    // Fetch data source and metadata
    const { data: dataSource } = await supabaseClient
      .from('data_sources')
      .select('*')
      .eq('id', dataSourceId)
      .single();

    const { data: columns } = await supabaseClient
      .from('tables_meta')
      .select('*')
      .eq('data_source_id', dataSourceId);

    if (!dataSource || !columns) {
      return new Response(JSON.stringify({ error: 'Data source not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate insights using Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Analyze this dataset and generate 3-5 key insights:

Dataset: ${dataSource.name}
Rows: ${dataSource.row_count}
Columns: ${columns.map(c => `${c.column_name} (${c.data_type})`).join(', ')}

Sample values:
${columns.map(c => `${c.column_name}: ${JSON.stringify(c.sample_values)}`).join('\n')}

Provide insights about:
1. Data distribution patterns
2. Potential trends or correlations
3. Data quality observations
4. Recommended visualizations
5. Business implications

Format each insight as a separate, concise observation.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a data analyst providing clear, actionable insights." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("Failed to generate insights");
    }

    const aiData = await aiResponse.json();
    const insightContent = aiData.choices[0].message.content;

    // Parse insights (split by numbered list)
    const insightLines = insightContent.split(/\n/).filter((line: string) => line.trim());
    const insights = [];

    for (let i = 0; i < Math.min(5, insightLines.length); i++) {
      const line = insightLines[i];
      const title = `Insight ${i + 1}`;
      const content = line.replace(/^\d+\.\s*/, '').trim();

      if (content) {
        const { data: insight } = await supabaseClient
          .from('insights')
          .insert({
            user_id: user.id,
            data_source_id: dataSourceId,
            title,
            content,
            insight_type: 'auto',
          })
          .select()
          .single();

        if (insight) insights.push(insight);
      }
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Insights function error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
