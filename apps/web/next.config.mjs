import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Em monorepo pnpm, a raiz de tracing precisa ser o repo todo.
    outputFileTracingRoot: path.join(__dirname, '../../'),
    // O engine do Prisma é carregado dinamicamente em runtime, então o
    // file-tracing automático não o detecta. Forçamos a inclusão do .so.node
    // (e todo o client gerado) no bundle serverless de TODAS as rotas.
    outputFileTracingIncludes: {
      '/**': [
        '../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*',
      ],
    },
    // Não empacotar o Prisma — deixa em node_modules pra ele achar o engine.
    serverComponentsExternalPackages: ['@prisma/client', '@bussola/db'],
  },
};

export default nextConfig;
