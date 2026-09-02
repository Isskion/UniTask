import "server-only";

/**
 * Protección mínima (secreto compartido) para los proxies abiertos que usan
 * las herramientas de integración estáticas (UniSwagger, UniSOAP): /api/proxy,
 * /api/unigis/proxy, /api/unigis/soap, /api/uniswagger/cache.
 *
 * OJO: el secreto se embebe en el JS público de esas herramientas (main.js),
 * así que cualquiera que abra la página y mire el código fuente puede leerlo.
 * Esto NO es autenticación real — solo corta el acceso anónimo/automatizado
 * a quien golpea la URL directamente sin haber cargado nunca la herramienta.
 */

const HEADER_NAME = 'x-integrator-key';

export function isAuthorizedIntegratorRequest(req: Request): boolean {
    const expected = process.env.INTEGRATOR_SHARED_SECRET;
    if (!expected) {
        console.error('[IntegratorAuth] INTEGRATOR_SHARED_SECRET no está configurado — bloqueando por defecto.');
        return false;
    }
    const provided = req.headers.get(HEADER_NAME);
    return !!provided && provided === expected;
}
