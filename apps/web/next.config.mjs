import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Em monorepo pnpm, a raiz de tracing precisa ser o repo todo.
    outputFileTracingRoot: path.join(__dirname, '../../'),
    // Prisma sem engine nativo usa um query engine em WASM, carregado
    // dinamicamente. Forçamos sua inclusão no bundle serverless (WASM é
    // independente de plataforma — sem o problema de hash/SO do .so.node).
    // Cobrimos as duas bases possíveis de resolução do glob (app e raiz).
    outputFileTracingIncludes: {
      '/**': [
        '../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/*.wasm',
        '../../node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/*.wasm',
        'node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/*.wasm',
        'node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/*.wasm',
      ],
    },
    serverComponentsExternalPackages: ['@prisma/client', '@bussola/db'],
  },
};

export default nextConfig;
