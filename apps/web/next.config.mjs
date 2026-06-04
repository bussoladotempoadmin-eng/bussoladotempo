import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Em monorepo pnpm, a raiz de tracing precisa ser o repo todo.
    outputFileTracingRoot: path.join(__dirname, '../../'),
    // O engine do Prisma é carregado dinamicamente (fora do file-tracing
    // automático). Forçamos a inclusão dos binários .node, cobrindo AS DUAS
    // bases possíveis de resolução (pasta do app e raiz de tracing) e os dois
    // diretórios onde o engine pode cair (.prisma/client e @prisma/client).
    outputFileTracingIncludes: {
      '/**': [
        // relativo à pasta do app (apps/web)
        '../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/*.node',
        '../../node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/*.node',
        '../../node_modules/.pnpm/prisma@*/node_modules/prisma/*.node',
        // relativo à raiz de tracing (repo root)
        'node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/*.node',
        'node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/*.node',
        'node_modules/.pnpm/prisma@*/node_modules/prisma/*.node',
      ],
    },
    // Mantém o Prisma fora do bundle (Next file-traça o .node em vez de empacotar).
    serverComponentsExternalPackages: ['@prisma/client', '@bussola/db'],
  },
};

export default nextConfig;
