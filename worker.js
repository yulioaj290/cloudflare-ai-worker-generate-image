export default {
  async fetch(request, env) {
    // 1. CORS handling
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }

    // 2. API KEY validation
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${env.API_KEY}`) {
      return json({ error: "Unauthorized" }, 401);
    }

    try {
      // 3. Content-Type (Debug) verification
      const contentType = request.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return json({ error: "The system was expecting a multipart/form-data", received: contentType }, 400);
      }

      // 4. Form Data parsing
      const formData = await request.formData();
      const prompt = formData.get("prompt");
      const imageFile = formData.get("image");
      const width = formData.get("width") || 1080;    // fallback reccommended width for Instagram/Facebook
      const height = formData.get("height") || 1350;  // fallback reccommended height for Instagram/Facebook

      if (!prompt || !imageFile) {
        return json({ error: "Field missing: prompt or image" }, 400);
      }

      // 5. Convert to Uint8Array (Optimized format for Cloudflare AI)
      const imageArrayBuffer = await imageFile.arrayBuffer();
      const imageData = new Uint8Array(imageArrayBuffer);

      // 6. Execution of the AI model
      // Note: We are using Uint8Array directly for better perfomance
      const response = await env.AI.run(
        "@cf/runwayml/stable-diffusion-v1-5-img2img",
        {
          prompt: prompt,
          image: [...imageData], // The model expects an array of numbers (bytes)
          width: width,
          height: height,
          strength: 0.5,         // Transformation level (0.4-0.6 ideal for e-commerce)
          num_steps: 20,         // 20 is the maximum allowed by CLoudflare for this model
          guidance_factor: 7.5   // Controls how closely the generated image should adhere to the prompt
        }
      );

      return new Response(response, {
        headers: {
          ...cors(),
          "content-type": "image/jpeg",
        },
      });

    } catch (err) {
      // Capturing the real error to send it on the response
      return json({ 
        error: "Generation failed", 
        details: err.message,
        stack: err.stack 
      }, 500);
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
