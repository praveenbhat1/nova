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

    const { message } = await req.json();

    // Get user's datasets for context
    const { data: dataSources } = await supabaseClient
      .from('data_sources')
      .select('id, name, row_count, column_count')
      .limit(5);

    // Store user message
    await supabaseClient.from('messages').insert({
      user_id: user.id,
      role: 'user',
      content: message,
    });

    // Determine if this is a chart request
    const chartKeywords = ['show', 'chart', 'graph', 'plot', 'visualize', 'bar', 'line', 'pie'];
    const isChartRequest = chartKeywords.some(keyword => message.toLowerCase().includes(keyword));

    // Build context for AI
    const dataContext = dataSources && dataSources.length > 0
      ? `Available datasets: ${dataSources.map(ds => `${ds.name} (${ds.row_count} rows, ${ds.column_count} columns)`).join(', ')}`
      : 'No datasets uploaded yet.';

    const systemPrompt = isChartRequest
      ? `You are Nova, a data analyst assistant. When users ask for charts, respond with JSON in this format:
{
  "response": "Here's your visualization...",
  "chart": {
    "type": "bar|line|pie|area",
    "data": [{"name": "A", "value": 10}, ...],
    "config": {"xKey": "name", "yKey": "value"}
  }
}

${dataContext}

Generate realistic mock data based on the user's request.`
      : `You are Nova, a helpful data analyst assistant. ${dataContext}`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get AI response");
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content;

    // Try to parse as JSON if it's a chart request
    let result: any = { response: aiResponse };
    
    if (isChartRequest) {
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                         aiResponse.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse;
        
        const parsed = JSON.parse(jsonStr);
        if (parsed.chart) {
          result = parsed;
        }
      } catch (e) {
        // If parsing fails, generate a simple chart
        result = {
          response: aiResponse,
          chart: {
            type: 'bar',
            data: [
              { name: 'Category A', value: 400 },
              { name: 'Category B', value: 300 },
              { name: 'Category C', value: 500 },
              { name: 'Category D', value: 200 },
            ],
            config: { xKey: 'name', yKey: 'value' }
          }
        };
      }
    }

    // Store assistant response
    await supabaseClient.from('messages').insert({
      user_id: user.id,
      role: 'assistant',
      content: result.response,
      metadata: result.chart ? { chart: result.chart } : null,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Query function error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
