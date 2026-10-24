import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Les arguments des actions peuvent contenir des mots de passe ou des données médicales.
  logging: { serverFunctions: false },
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // Évite que Next remonte jusqu'à un package-lock.json parasite dans le dossier utilisateur.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
