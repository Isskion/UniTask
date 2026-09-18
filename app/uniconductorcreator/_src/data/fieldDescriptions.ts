// Field tooltip descriptions for the mapper UI
import { MAX_TRANSPORTES, MAX_OPERACIONES } from './schema';

export const FIELD_DESCRIPTIONS: Record<string, string> = {
    'Root.Conductor.Login': 'Identificador único del conductor en UNIGIS (login de acceso, no visible al conductor necesariamente).',
    'Root.Conductor.Nombre': 'Nombre de pila del conductor.',
    'Root.Conductor.Apellido': 'Apellido(s) del conductor.',
    'Root.Conductor.EMail': 'Correo electrónico de contacto.',
    'Root.Conductor.Telefono1': 'Teléfono principal de contacto.',
    'Root.Conductor.ReferenciaExterna': 'Clave de negocio externa del conductor (ej. código interno de empresa, "CHOF-00142").',
    'Root.Conductor.NroDocumento': 'Número de documento de identidad (DNI/NIE/CIF). Se usa como clave única para deduplicar envíos.',
    'Root.Conductor.TipoDocumento': 'Código del tipo de documento en UNIGIS (valores conocidos: DNI, LC, CO-REMM, CO-RVM).',
    'Root.Conductor.SincronizarUsuario': 'Si es true, UNIGIS crea/sincroniza además un usuario de acceso asociado al conductor.',
    'Root.Conductor.Licencia': 'Número de licencia/carnet de conducir (columna UNIGIS: NroLicencia).',
    'Root.Conductor.Expedicion': 'Fecha de expedición de la licencia (columna UNIGIS: Emision).',
    'Root.Conductor.Vencimiento': 'Fecha de vencimiento de la licencia.',
    'Root.Conductor.TipoConductor': 'Tipo de conductor en UNIGIS (valores conocidos: PROPIO, EXT).',
    ...Object.fromEntries(
        Array.from({ length: MAX_TRANSPORTES }, (_, i) => i + 1).flatMap((n) => [
            [`Root.Conductor.transportes[${n}].Referencia`, `Transporte ${n}: referencia del transporte al que se asigna el conductor.`],
            [`Root.Conductor.transportes[${n}].HabilitadoAdministrativo`, `Transporte ${n}: habilitación administrativa (true/false).`],
            [`Root.Conductor.transportes[${n}].HabilitadoOperativo`, `Transporte ${n}: habilitación operativa (true/false).`],
        ])
    ),
    ...Object.fromEntries(
        Array.from({ length: MAX_OPERACIONES }, (_, i) => i + 1).map((n) => [
            `Root.Conductor.operaciones[${n}].IdOperacion`,
            `Operación ${n}: ID numérico de la operación en UNIGIS a la que se asigna el conductor.`,
        ])
    ),
};
