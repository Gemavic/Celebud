import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const healthReport = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_health_report`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!healthReport.ok) {
      throw new Error(`Health check failed: ${healthReport.statusText}`);
    }

    const report = await healthReport.json();

    const hasErrors = report.content_accessibility?.some(
      (check: { status: string }) => check.status === "ERROR"
    );

    const hasCriticalIssues = report.rls_status?.some(
      (check: { status: string }) => check.status?.includes("CRITICAL")
    );

    return new Response(
      JSON.stringify({
        status: hasErrors || hasCriticalIssues ? "UNHEALTHY" : "HEALTHY",
        timestamp: report.timestamp,
        details: report,
      }),
      {
        status: hasErrors || hasCriticalIssues ? 503 : 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({
        status: "ERROR",
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});