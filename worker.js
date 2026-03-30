export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() })
    };

    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${env.API_KEY}`) {
      return json({ error: "Unauthorized" }, 401)
    };

    try {
      // Usaremos FormData para recibir la imagen y el prompt desde n8n
      const formData = await request.formData();
      const prompt = formData.get("prompt");
      const imageFile = formData.get("image"); // El archivo binario de Amazon

      if (!prompt || !imageFile) {
        return json({ error: "Prompt and image are required for showcase mode" }, 400);
      }

      const imageArrayBuffer = await imageFile.arrayBuffer();

      // Ejecutamos SDXL en modo Image-to-Image
      const response = await env.AI.run(
        "@cf/stabilityai/stable-diffusion-xl-base-1.0",
        {
          prompt: prompt,
          image: [...new Uint8Array(imageArrayBuffer)], // Convertimos a array de bytes
          strength: 0.6, // 0.6 permite cambiar el fondo manteniendo la forma del producto
          num_steps: 30
        }
      );

      return new Response(response, {
        headers: { ...cors(), "content-type": "image/jpeg" },
      });
    } catch (err) {
      return json({ error: "Generation failed", details: String(err) }, 500);
    }
  },
};

function cors() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors(),
      "content-type": "application/json",
    },
  });
}
