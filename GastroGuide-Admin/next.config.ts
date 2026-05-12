import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // react-leaflet 4.x несовместим с React 18 StrictMode (двойной mount ломает Map container).
  // Отключаем в dev — на прод-сборке это и так не влияет.
  reactStrictMode: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
