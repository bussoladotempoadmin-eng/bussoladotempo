import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Em monorepo pnpm, a raiz de tracing precisa ser o repo todo pra o Next
    // copiar o engine do Prisma (.so.node) pro bundle serverless da Vercel.
    outputFileTracingRoot: path.join(__dirname, '../../'),
    // Não empacotar o Prisma — deixa em node_modules pra ele achar o engine.
    serverComponentsExternalPackages: ['@prisma/client', '@bussola/db'],
  },
};

export default nextConfig;
