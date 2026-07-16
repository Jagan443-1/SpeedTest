const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (url.pathname === "/download") {
      const chunkSize = 64 * 1024; // 64KB per chunk
      const totalSize = 100 * 1024 * 1024; // 100MB total
      const totalChunks = Math.ceil(totalSize / chunkSize);

      let chunksSent = 0;
      const template = new Uint8Array(chunkSize);
      for (let i = 0; i < chunkSize; i++) template[i] = i % 256;

      const stream = new ReadableStream({
        pull(controller) {
          if (chunksSent >= totalChunks) {
            controller.close();
            return Promise.resolve();
          }
          controller.enqueue(template.slice(0));
          chunksSent++;
          return Promise.resolve();
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/octet-stream",
        },
      });
    }

    if (url.pathname === "/upload" && request.method === "POST") {
      const body = await request.arrayBuffer();
      return new Response(JSON.stringify({ bytes: body.byteLength }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/ping") {
      return new Response(JSON.stringify({ t: Date.now() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
