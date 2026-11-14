import type { NextConfig } from "next";

// Valide les variables d'environnement dès le build : échec bruyant si l'une manque.
import "./src/env";

const nextConfig: NextConfig = {};

export default nextConfig;
