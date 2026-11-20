import type { NextConfig } from "next";

// Publicar permite hasta 10 fotos de 5 MB (FE-01.1). Los límites por defecto
// (1 MB en Server Actions y 10 MB en el proxy) cortarían el envío.
const LIMITE_SUBIDA = "55mb";

const nextConfig: NextConfig = {
  // Build autocontenido para la imagen de Docker (MP4-131, docs/despliegue.md).
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: LIMITE_SUBIDA,
    },
    proxyClientMaxBodySize: LIMITE_SUBIDA,
  },
};

export default nextConfig;
