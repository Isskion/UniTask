import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL no está configurado en las variables de entorno.');
    }
    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({ adapter });
}

// Lazy proxy: no lanza hasta que se usa un método real.
// Permite importar el módulo aunque DATABASE_URL no esté disponible.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
    get(_target, prop) {
        const client = globalForPrisma.prisma ?? (() => {
            const c = createPrismaClient();
            if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = c;
            return c;
        })();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (client as any)[prop];
    },
});
