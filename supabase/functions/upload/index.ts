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

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upload to storage
    const filePath = `${user.id}/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('datasets')
      .upload(filePath, file, {
        contentType: 'text/csv',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse CSV to extract metadata
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const rowCount = lines.length - 1;

    // Insert data source record
    const { data: dataSource, error: dbError } = await supabaseClient
      .from('data_sources')
      .insert({
        user_id: user.id,
        name: fileName,
        file_path: filePath,
        file_size: file.size,
        row_count: rowCount,
        column_count: headers.length,
        status: 'ready',
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB error:', dbError);
      return new Response(JSON.stringify({ error: dbError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert column metadata
    const columnMeta = headers.map(colName => {
      // Sample first few values to infer type
      const sampleValues = lines.slice(1, Math.min(6, lines.length))
        .map(line => {
          const values = line.split(',');
          const index = headers.indexOf(colName);
          return values[index]?.trim();
        })
        .filter(Boolean);

      const dataType = inferDataType(sampleValues);

      return {
        data_source_id: dataSource.id,
        column_name: colName,
        data_type: dataType,
        sample_values: sampleValues.slice(0, 5),
      };
    });

    const { error: metaError } = await supabaseClient
      .from('tables_meta')
      .insert(columnMeta);

    if (metaError) {
      console.error('Meta error:', metaError);
    }

    return new Response(JSON.stringify({ data: dataSource }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload function error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function inferDataType(values: string[]): string {
  if (values.length === 0) return 'text';
  
  const numericCount = values.filter(v => !isNaN(Number(v))).length;
  if (numericCount === values.length) return 'numeric';
  
  const dateCount = values.filter(v => !isNaN(Date.parse(v))).length;
  if (dateCount === values.length) return 'date';
  
  return 'text';
}
