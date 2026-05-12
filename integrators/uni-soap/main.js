/**
 * main.js - UNIGIS Logistic Service Integrator
 * Features: WSDL Parsing, Dynamic Form Building, Field Mapping, Mass SOAP Integration
 */

let state = {
    wsdlMethods: [],    // [{ name, inputType, schema }] from WSDL
    wsdlTypes: {},      // complex types dictionary from WSDL
    selectedMethod: null,
    baseUrl: '',        // Base URL after login
    requestBody: {},
    excelData: null,    // Main sheet data
    excelSheets: {},   // All worksheets { name: data[] }
    mapping: {},
    cancelRequested: false
};

const UNIGIS_ERRORS = {
    "1": "OK",
    "-1": "Operación no encontrada",
    "-2": "Vehículo no encontrado",
    "-3": "Prestador no encontrado",
    "-4": "Sucursal no encontrada",
    "-5": "Referencia no encontrada",
    "-6": "Error en Fecha",
    "-7": "No encontrado en base de datos",
    "-8": "Depósito no encontrado",
    "-9": "Estado no encontrado",
    "-10": "Transporte no encontrado",
    "-11": "Conductor no encontrado",
    "-12": "Se debe especificar dominio",
    "-13": "El vehículo no posee recorridos",
    "-14": "Cliente dador no encontrado",
    "-15": "Custodio no encontrado",
    "-16": "Recurso no encontrado",
    "-17": "Empresa Custodia no encontrada",
    "-18": "Tipo Recurso no encontrado",
    "-19": "Tipo Vehículo no encontrado",
    "-20": "Registro duplicado",
    "-21": "Error Remito",
    "-22": "Error al crear el Transporte",
    "-23": "Error Jornada",
    "-24": "Error al crear Jornada",
    "-25": "Error al crear Viaje por un duplicado",
    "-26": "Error al crear Vehículo",
    "-27": "Campo sin completar",
    "-28": "Producto no encontrado",
    "-29": "El método del Viaje es inválido",
    "-30": "El registro no existe en el catálogo",
    "-31": "El Vehículo ya existe",
    "-32": "Cambio no permitido por estado",
    "-33": "Error domicilio",
    "-34": "Tipo Jornada no existe",
    "-35": "Viaje ya asignado a Ruta",
    "-36": "Debe especificar un Cliente",
    "-37": "Error Tipo de Impuesto",
    "-38": "Error Cliente Orden",
    "-39": "Domicilio Orden no encontrada",
    "-40": "Domicilio Orden no encontrada",
    "-41": "Requiere Forma de Pago",
    "-42": "Requiere Descripción",
    "-43": "Las fechas están en orden incorrecto",
    "-44": "Se requieren datos adicionales",
    "-45": "No se encontraron paradas",
    "-46": "Error de asociación de entidades",
    "-47": "No se encuentra la transición",
    "-48": "Error en motivo transición",
    "-49": "Tipo Orden no encontrado",
    "-50": "Empresa no encontrada",
    "-51": "Error Orden de Trabajo",
    "-52": "Error Cantidad",
    "-53": "Error Referencia Orden de Trabajo",
    "-54": "Error Viaje activo",
    "-55": "Error referencia Item",
    "-56": "Error Zona Horaria Operación",
    "-57": "Error Proveedor Orden",
    "-58": "Tipo Cita no encontrado",
    "-100": "Error con la API Key",
    "-200": "Error al iniciar sesión"
};

function translateUnigisError(data) {
    if (typeof data === 'number' || !isNaN(data)) {
        return UNIGIS_ERRORS[String(data)] || `Código ${data}`;
    }
    if (data && typeof data === 'object') {
        const potentialCode = data.Result || data.result || data.Code || data.code || data.status;
        if (potentialCode !== undefined && UNIGIS_ERRORS[String(potentialCode)]) {
            return UNIGIS_ERRORS[String(potentialCode)];
        }
    }
    return JSON.stringify(data);
}

// UI Elements
const els = {
    swaggerUrl: document.getElementById('swaggerUrl'),
    loadSwagger: document.getElementById('loadSwagger'),
    methodList: document.getElementById('methodList'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    methodDetail: document.getElementById('methodDetail'),
    dynamicForm: document.getElementById('dynamicForm'),
    jsonOutput: document.getElementById('jsonOutput'),
    currentMethodName: document.getElementById('currentMethodName'),
    dropZone: document.getElementById('dropZone'),
    excelFile: document.getElementById('excelFile'),
    mappingSection: document.getElementById('mappingSection'),
    mappingTable: document.getElementById('mappingTable'),
    startBatch: document.getElementById('startBatch'),
    cancelBatch: document.getElementById('cancelBatch'),
    methodSearch: document.getElementById('methodSearch'),
    pasteJsonBtn: document.getElementById('pasteJsonBtn'),
    jsonInputArea: document.getElementById('jsonInputArea'),
    processPaste: document.getElementById('processPaste'),
    closePaste: document.getElementById('closePaste'),
    pasteModal: document.getElementById('pasteModal'),
    apiKey: document.getElementById('apiKey'),
    sendUnitary: document.getElementById('sendUnitary'),
    templateModal: document.getElementById('templateModal'),
    openTemplateModal: document.getElementById('openTemplateModal'),
    templateJsonInput: document.getElementById('templateJsonInput'),
    processTemplate: document.getElementById('processTemplate'),
    closeTemplate: document.getElementById('closeTemplate'),
    btnDownloadTemplate: document.getElementById('btnDownloadTemplate'),
    mappingSearch: document.getElementById('mappingSearch'),
    formSearch: document.getElementById('formSearch'),
    progressContainer: document.getElementById('progressContainer'),
    progressCount: document.getElementById('progressCount'),
    progressTotal: document.getElementById('progressTotal'),
    progressPercent: document.getElementById('progressPercent'),
    progressBar: document.getElementById('progressBar'),
    clearLogBtn: document.getElementById('clearLogBtn'),
    asyncToggleContainer: document.getElementById('asyncToggleContainer'),
    asyncToggle: document.getElementById('asyncToggle'),
    // Login UI
    loginScreenWrapper: document.getElementById('loginScreenWrapper'),
    appContainer: document.getElementById('appContainer'),
    loginUrl: document.getElementById('loginUrl'),
    loginUser: document.getElementById('loginUser'),
    loginPass: document.getElementById('loginPass'),
    loginBtn: document.getElementById('loginBtn'),
    loginError: document.getElementById('loginError'),
    loginSpinner: document.getElementById('loginSpinner'),
    loginRemember: document.getElementById('loginRemember'),
    // Top Bar UI
    topConfigBar: document.getElementById('topConfigBar'),
    userInfoBar: document.getElementById('userInfoBar'),
    welcomeMessage: document.getElementById('welcomeMessage'),
    logoutBtn: document.getElementById('logoutBtn')
};

// --- Initialization ---
function init() {
    console.log('UNIGIS Integrator Initializing...');

    // Botón manual de recarga del WSDL (si el input está visible)
    if (els.loadSwagger) els.loadSwagger.addEventListener('click', () => loadWsdl(state.baseUrl));

    // Restore saved credentials
    const savedLogin = localStorage.getItem('unigis_login');
    if (savedLogin) {
        try {
            const data = JSON.parse(savedLogin);
            if (els.loginUrl && data.url) els.loginUrl.value = data.url;
            if (els.loginUser && data.user) els.loginUser.value = data.user;
            if (els.loginPass && data.pass) els.loginPass.value = data.pass;
            if (els.loginRemember) els.loginRemember.checked = true;
        } catch (e) { }
    }

    // Instalar evento de login
    if (els.loginBtn) els.loginBtn.addEventListener('click', handleLogin);
    if (els.logoutBtn) els.logoutBtn.addEventListener('click', handleLogout);

    els.clearLogBtn.addEventListener('click', () => {
        document.getElementById('logContent').innerHTML = '';
        notify('Consola limpiada', 'info');
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            showTab(tab);
        });
    });

    // Excel Logic
    els.dropZone.addEventListener('click', () => els.excelFile.click());
    els.excelFile.addEventListener('change', (e) => handleExcel(e.target.files[0]));
    els.dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.target.classList.add('dragging'); });
    els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('dragging'));
    els.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        els.dropZone.classList.remove('dragging');
        handleExcel(e.dataTransfer.files[0]);
    });

    els.startBatch.addEventListener('click', startMassIntegration);

    els.cancelBatch.addEventListener('click', () => {
        state.cancelRequested = true;
        els.cancelBatch.disabled = true;
        els.cancelBatch.textContent = 'Cancelando...';
    });

    els.btnDownloadTemplate.addEventListener('click', () => {
        if (!state.selectedMethod) return notify('Selecciona un método primero', 'warning');
        downloadExcelTemplate();
    });

    // Paste JSON Logic (modal can be reused for pasting WSDL XML if needed)
    if (els.pasteJsonBtn) {
        els.pasteJsonBtn.addEventListener('click', () => {
            els.pasteModal.classList.remove('hidden');
        });

        els.closePaste.addEventListener('click', () => els.pasteModal.classList.add('hidden'));

        els.processPaste.addEventListener('click', () => {
            try {
                const raw = els.jsonInputArea.value.trim();
                parseAndLoadWsdl(raw);
                notify('WSDL cargado desde texto pegado', 'success');
                els.pasteModal.classList.add('hidden');
            } catch (err) {
                alert('WSDL inválido: ' + err.message);
            }
        });
    }

    // Search Logic
    els.methodSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.method-item').forEach(item => {
            const visible = item.textContent.toLowerCase().includes(query);
            item.classList.toggle('hidden', !visible);
        });
        // También filtrar headers si no tienen items visibles
        document.querySelectorAll('.method-group').forEach(group => {
            const hasVisibleItems = Array.from(group.children).some(child => !child.classList.contains('hidden'));
            const header = group.previousElementSibling;
            if (header && header.classList.contains('tag-header')) {
                header.classList.toggle('hidden', !hasVisibleItems);
            }
        });
    });

    // Template XML Logic
    els.openTemplateModal.addEventListener('click', () => els.templateModal.classList.remove('hidden'));
    els.closeTemplate.addEventListener('click', () => els.templateModal.classList.add('hidden'));
    els.processTemplate.addEventListener('click', () => {
        let raw = els.templateJsonInput.value.trim();
        if (!raw) return alert('Pega un XML primero');

        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(raw, "text/xml");

            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                throw new Error("Error de sintaxis XML");
            }

            // Convertir el documento XML a un objeto Javascript compatible con el state
            const template = xmlToObject(xmlDoc.documentElement);

            state.requestBody = template;
            if (state.selectedMethod) {
                renderDynamicForm(state.selectedMethod.schema, template);
            }
            updateXmlPreview();
            notify('XML Preformado aplicado al formulario', 'success');
            els.templateModal.classList.add('hidden');
        } catch (err) {
            console.error('XML Parse Error:', err);
            alert(`XML inválido: ${err.message}`);
        }
    });

    els.sendUnitary.addEventListener('click', sendUnitaryRequest);

    // Mapping Search Filter
    els.mappingSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.mapping-grid tbody tr').forEach(tr => {
            const fieldName = tr.querySelector('td:first-child').textContent.toLowerCase();
            tr.classList.toggle('hidden', !fieldName.includes(query));
        });
    });

    // Form Search Filter (Selected Method Fields)
    els.formSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const allGroups = document.querySelectorAll('#dynamicForm .form-group, #dynamicForm .form-section, #dynamicForm .array-container');

        if (!query) {
            allGroups.forEach(el => el.classList.remove('hidden'));
            return;
        }

        // Primero ocultamos todo
        allGroups.forEach(el => el.classList.add('hidden'));

        // Luego mostramos lo que coincide y sus ancestros
        allGroups.forEach(el => {
            const label = el.querySelector('label, legend, h4');
            if (label && label.textContent.toLowerCase().includes(query)) {
                el.classList.remove('hidden');

                // Mostrar padres ascendiendo por el DOM
                let parent = el.parentElement;
                while (parent && parent.id !== 'dynamicForm') {
                    if (parent.classList.contains('form-section') || parent.classList.contains('array-container') || parent.classList.contains('form-group')) {
                        parent.classList.remove('hidden');
                    }
                    parent = parent.parentElement;
                }
            }
        });
    });
}

// --- Login Logic ---
async function handleLogin() {
    const url = els.loginUrl.value.trim();
    const user = els.loginUser.value.trim();
    const pass = els.loginPass.value.trim();

    if (!url || !user || !pass) {
        els.loginError.textContent = "URL, Usuario y Contraseña son requeridos.";
        els.loginError.classList.remove('hidden');
        return;
    }

    els.loginError.classList.add('hidden');
    els.loginSpinner.classList.remove('hidden');
    els.loginBtn.disabled = true;

    try {
        const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        // Fix for 404: The Login method is typically under Auth/service.asmx
        const loginEndpoint = `${baseUrl}/Mapi/SOAP/Auth/service.asmx/Login`;
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(loginEndpoint)}`;

        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: user, password: pass, system: 'MAPI' })
        });

        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

        const rawResponse = await response.text();
        let data;
        let isSuccess = false;

        try {
            data = JSON.parse(rawResponse);

            // .NET ASMX typically wraps JSON responses in a "d" object.
            if (data && data.d) {
                // Sometime the "d" property is also a JSON string that needs secondary parsing
                if (typeof data.d === 'string') {
                    try {
                        data = JSON.parse(data.d);
                    } catch (e) {
                        data = data.d; // Unlikely to be a raw string if result is true, but fallback
                    }
                } else {
                    data = data.d;
                }
            }
        } catch (e) {
            throw new Error("Respuesta del servidor no es JSON válido: " + rawResponse);
        }

        isSuccess = data.Result === true || (data.Result && String(data.Result) !== "False" && String(data.Result) !== "0");

        if (isSuccess && (data.MapiToken || data.ApiKeyToken || data.Token || data.JMT)) {
            // Guardar credenciales si "Recuérdame" está activado
            if (els.loginRemember && els.loginRemember.checked) {
                localStorage.setItem('unigis_login', JSON.stringify({
                    url: url,
                    user: user,
                    pass: pass
                }));
            } else {
                localStorage.removeItem('unigis_login');
            }

            // Guardar el token (se usa en el resto de peticiones como ApiKey)
            // Priorizamos MapiToken por encima del genérico Token para asegurar el envó correcto a las APIs REST/SOAP
            els.apiKey.value = data.MapiToken || data.ApiKeyToken || data.Token || data.JMT || "";

            // Actualizar UI superior
            if (els.topConfigBar) els.topConfigBar.classList.add('hidden');
            if (els.userInfoBar) {
                els.userInfoBar.classList.remove('hidden');
                els.userInfoBar.style.display = 'flex';
            }
            if (els.welcomeMessage) els.welcomeMessage.textContent = `Bienvenido ${user}`;

            // Ocultar login y mostrar app principal
            els.loginScreenWrapper.classList.add('hidden');
            els.appContainer.classList.remove('hidden');

            // Guardar base URL y cargar WSDL automáticamente
            state.baseUrl = baseUrl;
            if (els.swaggerUrl) els.swaggerUrl.value = `${baseUrl}/Mapi/SOAP/Logistic/Service.asmx?wsdl`;
            loadWsdl(baseUrl);
        } else {
            // Intentar recuperar el mensaje de error de la estructura de UNIGIS
            let errMessage = data.Message || data.error || data.ExceptionMessage;
            if (!errMessage && typeof translateUnigisError === "function") {
                errMessage = translateUnigisError(data);
            }
            throw new Error(errMessage || "Credenciales inválidas o Error en el servidor.");
        }
    } catch (err) {
        console.error("Login Falló:", err);
        els.loginError.textContent = err.message || "Error al conectar con UNIGIS.";
        els.loginError.classList.remove('hidden');
    } finally {
        els.loginSpinner.classList.add('hidden');
        els.loginBtn.disabled = false;
    }
}

// --- Logout Logic ---
function handleLogout() {
    els.apiKey.value = "";
    if (els.swaggerUrl) els.swaggerUrl.value = "";
    document.getElementById('methodList').innerHTML = '<div class="loading-spinner">Esperando Login...</div>';
    state.selectedMethod = null;
    state.wsdlMethods = [];
    state.baseUrl = '';
    els.appContainer.classList.add('hidden');

    if (els.userInfoBar) {
        els.userInfoBar.classList.add('hidden');
        els.userInfoBar.style.display = 'none';
    }
    if (els.topConfigBar) els.topConfigBar.classList.remove('hidden');

    els.loginScreenWrapper.classList.remove('hidden');
    els.loginPass.value = "";
    document.getElementById('logContent').innerHTML = '';
}

// ============================================================
// --- SOAP / WSDL Logic ---
// ============================================================

/**
 * Carga y parsea el WSDL desde /Mapi/SOAP/Logistic/Service.asmx?wsdl
 * @param {string} baseUrl - URL base del servidor UNIGIS (sin trailing slash)
 */
async function loadWsdl(baseUrl) {
    if (!baseUrl) return;
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const wsdlUrl = `${cleanBase}/Mapi/SOAP/Logistic/Service.asmx?wsdl`;
    if (els.swaggerUrl) els.swaggerUrl.value = wsdlUrl;
    notify(`Cargando WSDL desde: ${wsdlUrl}`, 'info');
    toggleLoading(true);
    try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(wsdlUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const xmlText = await response.text();
        parseAndLoadWsdl(xmlText);
        notify(`WSDL cargado: ${state.wsdlMethods.length} métodos encontrados`, 'success');
    } catch (err) {
        console.error('Error cargando WSDL:', err);
        notify('No se pudo cargar el WSDL. Verifica la URL base o conéctate primero.', 'error');
    } finally {
        toggleLoading(false);
    }
}

/**
 * Parsea el texto XML del WSDL y puebla state.wsdlMethods y state.wsdlTypes
 * @param {string} xmlText - Contenido XML del WSDL
 */
function parseAndLoadWsdl(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) throw new Error('XML inválido: ' + parserError.textContent.substring(0, 200));

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers namespace-agnostic (ignoran prefijo: s:, xs:, xsd:, wsdl:, tns:)
    // ─────────────────────────────────────────────────────────────────────────
    function byLocalName(root, localName) {
        return Array.from(root.getElementsByTagName('*'))
            .filter(el => el.localName === localName);
    }
    function firstByLocalName(root, localName) {
        const els = root.getElementsByTagName('*');
        for (const el of els) if (el.localName === localName) return el;
        return null;
    }
    function stripNs(qname) {
        return qname && qname.includes(':') ? qname.split(':')[1] : qname;
    }

    // Mapa de tipos XSD primitivos → tipo interno
    const XSD_PRIMITIVES = {
        string: 'string', normalizedstring: 'string', token: 'string',
        int: 'integer', integer: 'integer', long: 'integer', short: 'integer',
        unsignedint: 'integer', unsignedlong: 'integer', unsignedshort: 'integer',
        decimal: 'number', double: 'number', float: 'number',
        boolean: 'boolean',
        datetime: 'string', date: 'string', time: 'string',
        base64binary: 'string', anyuri: 'string', guid: 'string',
        byte: 'integer', unsignedbyte: 'integer',
        nonnegativeinteger: 'integer', positiveinteger: 'integer',
    };
    function xsdPrimitive(typeName) {
        return XSD_PRIMITIVES[stripNs(typeName || '').toLowerCase()] || null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Extraer tipos complejos y elementos raíz del XSD embebido en <types>
    // ─────────────────────────────────────────────────────────────────────────
    state.wsdlTypes = {};  // name → schema
    state.wsdlElements = {};  // name → schema  (para los element name="X" de primer nivel)

    /**
     * Construye el schema a partir de una secuencia de elementos XSD.
     * Llama recursivamente para complexTypes inline.
     */
    function buildSchemaFromSequence(seqEl) {
        const properties = {};
        const children = Array.from(seqEl.children);
        children.forEach(child => {
            const lname = child.localName;
            if (lname !== 'element') return;   // ignorar choice/group/etc de momento

            const elName = child.getAttribute('name');
            const elType = child.getAttribute('type') || '';
            const elRef = child.getAttribute('ref') || '';
            const maxOccurs = child.getAttribute('maxOccurs') || '1';
            const isArray = maxOccurs === 'unbounded' || parseInt(maxOccurs, 10) > 1;

            if (!elName && !elRef) return;
            const propName = elName || stripNs(elRef);

            // 1a. Tipo primitivo XSD
            const primitive = xsdPrimitive(elType);
            if (primitive) {
                properties[propName] = isArray
                    ? { type: 'array', items: { type: primitive } }
                    : { type: primitive };
                return;
            }

            // 1b. Tipo referenciado (complexType por nombre)
            if (elType) {
                const refName = stripNs(elType);
                const fieldSchema = { $ref: refName };
                properties[propName] = isArray
                    ? { type: 'array', items: fieldSchema }
                    : fieldSchema;
                return;
            }

            // 1c. ComplexType inline (hijo DIRECTO del element, no recursivo)
            const inlineCT = Array.from(child.children).find(c => c.localName === 'complexType');
            if (inlineCT) {
                const inlineSeq = Array.from(inlineCT.children).find(c => c.localName === 'sequence' || c.localName === 'all');
                const inlineSchema = inlineSeq
                    ? { type: 'object', properties: buildSchemaFromSequence(inlineSeq) }
                    : { type: 'object', properties: {} };
                properties[propName] = isArray
                    ? { type: 'array', items: inlineSchema }
                    : inlineSchema;
                return;
            }

            // 1d. Solo ref (si tiene ref sin type)
            if (elRef) {
                const refName = stripNs(elRef);
                properties[propName] = isArray
                    ? { type: 'array', items: { $ref: refName } }
                    : { $ref: refName };
            }
        });
        return properties;
    }

    // Procesar todos los <complexType name="...">
    byLocalName(doc, 'complexType').forEach(ct => {
        const typeName = ct.getAttribute('name');
        if (!typeName) return; // inline, se procesa en buildSchemaFromSequence

        const seqEl = firstByLocalName(ct, 'sequence') || firstByLocalName(ct, 'all');
        if (seqEl) {
            state.wsdlTypes[typeName] = {
                type: 'object',
                properties: buildSchemaFromSequence(seqEl)
            };
        } else {
            // Puede ser un complexContent con extension
            const ext = firstByLocalName(ct, 'extension');
            if (ext) {
                const base = stripNs(ext.getAttribute('base') || '');
                const extSeq = firstByLocalName(ext, 'sequence') || firstByLocalName(ext, 'all');
                const extProps = extSeq ? buildSchemaFromSequence(extSeq) : {};
                state.wsdlTypes[typeName] = { type: 'object', $base: base, properties: extProps };
            } else {
                state.wsdlTypes[typeName] = { type: 'object', properties: {} };
            }
        }
    });

    // Procesar <element name="..."> de primer nivel en el schema (las operaciones raíz)
    // ASMX .NET usa un <element name="MethodName"> con un complexType HIJO DIRECTO que tiene los parámetros
    byLocalName(doc, 'schema').forEach(schema => {
        Array.from(schema.children).forEach(child => {
            if (child.localName !== 'element') return;
            const elName = child.getAttribute('name');
            if (!elName) return;

            const elType = child.getAttribute('type') || '';
            if (elType) {
                const primitive = xsdPrimitive(elType);
                state.wsdlElements[elName] = primitive
                    ? { type: primitive }
                    : { $ref: stripNs(elType) };
            } else {
                // Buscar complexType como HIJO DIRECTO del element (no recursivo)
                const inlineCT = Array.from(child.children).find(c => c.localName === 'complexType');
                if (inlineCT) {
                    // Buscar sequence/all como hijo directo del complexType
                    const seqEl = Array.from(inlineCT.children).find(c => c.localName === 'sequence' || c.localName === 'all');
                    state.wsdlElements[elName] = {
                        type: 'object',
                        properties: seqEl ? buildSchemaFromSequence(seqEl) : {}
                    };
                }
            }
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Extraer operaciones del portType y vincularlas con los schemas
    // ─────────────────────────────────────────────────────────────────────────
    state.wsdlMethods = [];

    // Construir mapa de messages: name → element/type
    const messageMap = {};
    byLocalName(doc, 'message').forEach(msg => {
        const msgName = msg.getAttribute('name');
        if (!msgName) return;
        const part = firstByLocalName(msg, 'part');
        if (!part) return;
        const element = part.getAttribute('element') || '';
        const type = part.getAttribute('type') || '';
        messageMap[msgName] = { element: stripNs(element), type: stripNs(type) };
    });

    // Leer operaciones del portType
    const portTypes = byLocalName(doc, 'portType');
    const target = portTypes.length > 0 ? portTypes[0] : null;
    const ops = target ? byLocalName(target, 'operation') : byLocalName(doc, 'operation');

    ops.forEach(op => {
        const name = op.getAttribute('name');
        if (!name) return;

        const inputEl = firstByLocalName(op, 'input');
        const outputEl = firstByLocalName(op, 'output');

        let inputSchema = null;
        let outputSchema = null;

        function resolveMessageSchema(msgEl) {
            if (!msgEl) return { type: 'object', properties: {} };
            const msgAttr = msgEl.getAttribute('message') || '';
            const msgName = stripNs(msgAttr);
            const mapEntry = messageMap[msgName];
            if (!mapEntry) return { type: 'object', properties: {} };

            // Primero buscar como elemento raíz del schema
            if (mapEntry.element && state.wsdlElements[mapEntry.element]) {
                return state.wsdlElements[mapEntry.element];
            }
            // Luego como complexType
            if (mapEntry.element && state.wsdlTypes[mapEntry.element]) {
                return state.wsdlTypes[mapEntry.element];
            }
            if (mapEntry.type && state.wsdlTypes[mapEntry.type]) {
                return state.wsdlTypes[mapEntry.type];
            }
            return { type: 'object', properties: {} };
        }

        inputSchema = resolveMessageSchema(inputEl);
        outputSchema = resolveMessageSchema(outputEl);

        state.wsdlMethods.push({ name, inputType: null, schema: inputSchema, outputSchema });
    });

    // Fallback: si portType no tiene ops, usar binding
    if (state.wsdlMethods.length === 0) {
        byLocalName(doc, 'binding').forEach(b => {
            byLocalName(b, 'operation').forEach(op => {
                const name = op.getAttribute('name');
                if (name && !state.wsdlMethods.find(m => m.name === name)) {
                    state.wsdlMethods.push({ name, inputType: null, schema: { type: 'object', properties: {} } });
                }
            });
        });
    }

    console.log(`WSDL parseado ✅: ${Object.keys(state.wsdlTypes).length} tipos, ${Object.keys(state.wsdlElements).length} elementos, ${state.wsdlMethods.length} operaciones`);
    if (state.wsdlMethods.length > 0) console.table(state.wsdlMethods.map(m => ({ name: m.name, props: Object.keys(m.schema?.properties || {}).length })));
    renderMethods();
}


/**
 * Parsea la respuesta SOAP XML y extrae el código de resultado UNIGIS
 * @param {string} xmlString - Respuesta XML del servidor SOAP
 * @returns {{ code: string|null, rawXml: string, fullText: string }}
 */
function parseSoapResponse(xmlString) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');

        // Verificar si hay un fault SOAP
        const fault = doc.querySelector('Fault, faultcode');
        if (fault) {
            const faultString = doc.querySelector('faultstring');
            return { code: null, isError: true, message: faultString ? faultString.textContent : 'SOAP Fault', rawXml: xmlString };
        }

        // Extraer código de resultado UNIGIS (puede variar según el método)
        const resultEl = doc.querySelector('Result, CodigoResultado, Resultado, result, codigoResultado');
        const code = resultEl ? resultEl.textContent.trim() : null;

        return { code, isError: code !== null && Number(code) < 0, rawXml: xmlString };
    } catch (e) {
        return { code: null, isError: false, rawXml: xmlString };
    }
}

function renderMethods() {
    const methods = state.wsdlMethods;
    if (!methods || methods.length === 0) {
        els.methodList.innerHTML = '<div class="log-entry error">No se encontraron métodos en el WSDL.</div>';
        return;
    }

    els.methodList.innerHTML = '';

    // Agrupar bajo un único grupo "LogisticService"
    const tagHeader = document.createElement('div');
    tagHeader.className = 'tag-header active';
    tagHeader.textContent = 'LogisticService';
    els.methodList.appendChild(tagHeader);

    const methodContainer = document.createElement('div');
    methodContainer.className = 'method-group';

    tagHeader.onclick = () => {
        tagHeader.classList.toggle('active');
        methodContainer.classList.toggle('hidden');
    };

    methods.forEach(m => {
        const div = document.createElement('div');
        div.className = 'method-item';
        div.textContent = m.name;
        div.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.method-item').forEach(i => i.classList.remove('active'));
            div.classList.add('active');
            selectMethod(m);
        };
        methodContainer.appendChild(div);
    });
    els.methodList.appendChild(methodContainer);
}

/**
 * Selecciona un método SOAP del WSDL y construye el formulario dinámico
 * @param {Object} methodDef - Objeto { name, inputType, schema } del catálogo WSDL
 */
function selectMethod(methodDef) {
    state.selectedMethod = methodDef;
    state.mapping = {};
    els.currentMethodName.textContent = methodDef.name;

    // Renombrar la pestaña de ejemplos como "XML Preview"
    const exampleTabBtn = document.querySelector('[data-tab="example"]');
    if (exampleTabBtn) exampleTabBtn.textContent = 'XML Preview';

    // Ocultar el toggle Asíncrono (ya no aplica, todo es SOAP)
    if (els.asyncToggleContainer) els.asyncToggleContainer.style.display = 'none';

    els.welcomeScreen.classList.add('hidden');
    els.methodDetail.classList.remove('hidden');

    renderDynamicForm(methodDef.schema);
    if (state.excelData && state.excelData.length > 0) {
        renderMappingUI();
    }
    showTab('unitary');
}

// --- Dynamic Form Builder ---
/**
 * Construye el formulario dinámico a partir del schema WSDL del método seleccionado.
 * @param {Object} schema - Schema { type, properties } obtenido del parseo del WSDL
 * @param {Object|null} initialData - Datos iniciales para prellenar el formulario
 */
function renderDynamicForm(schema, initialData = null) {
    if (els.formSearch) els.formSearch.value = '';
    els.dynamicForm.innerHTML = '';
    state.requestBody = {};

    if (!schema) {
        els.dynamicForm.innerHTML = '<p>No hay información de schema para este método.</p>';
        return;
    }

    const resolvedSchema = resolveSchema(schema);
    if (resolvedSchema && resolvedSchema.properties && Object.keys(resolvedSchema.properties).length > 0) {
        state.requestBody = {};
        buildFormRecursive(resolvedSchema.properties, els.dynamicForm, state.requestBody, initialData);
    } else if (resolvedSchema && resolvedSchema.type === 'array') {
        state.requestBody = Array.isArray(initialData) ? initialData : [];
        const dummyProps = { "items": resolvedSchema };
        const dummyParent = { "items": state.requestBody };
        const dummyData = { "items": initialData };
        buildFormRecursive(dummyProps, els.dynamicForm, dummyParent, dummyData);
        state.requestBody = dummyParent.items;
    } else {
        els.dynamicForm.innerHTML = '<p style="color:var(--text-muted)">El schema de este método no tiene campos definidos en el WSDL.<br>Puedes usar "Cargar XML" para precargar datos manualmente.</p>';
    }

    // Mostrar XML preview inicial en la pestaña de XML Preview
    const exampleOutput = document.getElementById('exampleOutput');
    if (exampleOutput) exampleOutput.textContent = buildSoapXml(state.requestBody);

    updateXmlPreview();
}

function buildFormRecursive(properties, container, parentObj, currentData = null) {
    Object.keys(properties).forEach(prop => {
        const field = resolveSchema(properties[prop]);

        // Búsqueda inteligente en el template (insensible a mayúsculas y flexible con estructuras)
        let val = undefined;
        if (currentData && typeof currentData === 'object') {
            const keys = Object.keys(currentData);
            const lowerProp = prop.toLowerCase();
            const foundKey = keys.find(k => k.toLowerCase() === lowerProp);

            if (foundKey) {
                val = currentData[foundKey];
            } else if (!Array.isArray(currentData)) {
                // Si no está en este nivel, pero es un campo simple, quizá esté en el raíz del template original?
                // (Solo si estamos en un nivel profundo y el template es plano)
            }

            // SMART WRAPPING: Si el campo es un array pero el template es un object/primitive, y tiene sentido envolverlo
            if (val === undefined && field.type === 'array' && currentData !== null && typeof currentData === 'object' && !Array.isArray(currentData)) {
                const itemSchema = resolveSchema(field.items);
                if (itemSchema.properties) {
                    const matches = Object.keys(itemSchema.properties).filter(k => {
                        const lk = k.toLowerCase();
                        return keys.some(ck => ck.toLowerCase() === lk);
                    });
                    // Only wrap if it's highly likely it's the intended item (e.g. at least 2 matching properties, or 100% of the properties if there's only 1)
                    if (matches.length >= 2 || (matches.length === 1 && Object.keys(itemSchema.properties).length === 1)) {
                        val = [currentData];
                    }
                }
            }
        }

        if (field.type === 'object' && field.properties) {
            const fieldset = document.createElement('fieldset');
            fieldset.className = 'form-section glass';
            fieldset.innerHTML = `<legend>${prop}</legend>`;
            parentObj[prop] = {};
            buildFormRecursive(field.properties, fieldset, parentObj[prop], val || {});
            container.appendChild(fieldset);
        } else if (field.type === 'array') {
            const arrayContainer = document.createElement('div');
            arrayContainer.className = 'array-container glass';
            arrayContainer.innerHTML = `<h4>${prop} (Lista)</h4>`;

            parentObj[prop] = [];

            const itemSchema = resolveSchema(field.items);

            const addItem = (itemVal = null) => {
                let itemObj;
                if (itemSchema.type === 'object') {
                    itemObj = {};
                } else {
                    itemObj = itemVal !== null ? itemVal : '';
                }

                // Add to state unconditionally
                parentObj[prop].push(itemObj);

                const itemDiv = document.createElement('div');
                itemDiv.className = 'array-item';

                // Wrapper for content and delete button
                const itemWrapper = document.createElement('div');
                itemWrapper.className = 'array-item-wrapper';

                const contentDiv = document.createElement('div');
                contentDiv.className = 'array-item-content';

                if (itemSchema.type === 'object') {
                    buildFormRecursive(itemSchema.properties, contentDiv, itemObj, itemVal || {});
                } else {
                    // Primitive array handling
                    // Create an object wrapper for the primitive just to uniquely identify it in the callback
                    // Wait, we can just use the index for reliable updates.
                    const myIdx = parentObj[prop].length - 1;
                    const group = createFormField('Valor', itemSchema, (newVal) => {
                        parentObj[prop][myIdx] = newVal;
                        updateJsonPreview();
                    }, itemVal);
                    contentDiv.appendChild(group);
                }

                // Delete Button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn-remove';
                deleteBtn.innerHTML = '×'; // or Icon
                deleteBtn.title = 'Eliminar elemento';
                deleteBtn.type = 'button';
                deleteBtn.onclick = () => {
                    // Update value to undefined or remove, but we must rebuild or keep array intact
                    // To remove from UI and JSON:
                    const idx = parentObj[prop].indexOf(itemObj);
                    if (idx > -1) {
                        parentObj[prop].splice(idx, 1);
                    } else if (itemSchema.type !== 'object') {
                        // For primitives, the itemObj reference might not match since it's a primitive value
                        // Let's use the DOM position to find the index since indexOf can find duplicate primitives
                        const childElements = Array.from(arrayContainer.children).filter(c => c.classList.contains('array-item'));
                        const actualIdx = childElements.indexOf(itemDiv);
                        if (actualIdx > -1) {
                            parentObj[prop].splice(actualIdx, 1);
                        }
                    }
                    arrayContainer.removeChild(itemDiv);
                    updateJsonPreview();
                };

                itemWrapper.appendChild(contentDiv);
                itemWrapper.appendChild(deleteBtn);
                itemDiv.appendChild(itemWrapper);
                arrayContainer.appendChild(itemDiv);
            };

            // Pre-llenar si hay datos
            if (Array.isArray(val)) {
                val.forEach(item => addItem(item));
            }

            const btn = document.createElement('button');
            btn.className = 'btn-add';
            btn.textContent = '+ Agregar elemento';
            btn.onclick = (e) => { e.preventDefault(); addItem(); updateJsonPreview(); };
            arrayContainer.appendChild(btn);
            container.appendChild(arrayContainer);
        } else {
            if (val !== undefined) parentObj[prop] = val;
            const group = createFormField(prop, field, (newVal) => {
                parentObj[prop] = newVal;
                updateJsonPreview();
            }, val);
            container.appendChild(group);
        }
    });
}

/**
 * Resuelve un schema que puede contener $ref apuntando a un tipo del WSDL.
 * Reemplaza la resolución anterior que miraba state.swagger.
 */
function resolveSchema(schema) {
    if (!schema) return {};
    if (schema.$ref) {
        const refName = schema.$ref;
        // Primero buscar en los tipos WSDL
        if (state.wsdlTypes && state.wsdlTypes[refName]) {
            return resolveSchema(state.wsdlTypes[refName]);
        }
        // Fallback: buscar sin prefijos de namespace (tns:, s:, etc.)
        const simpleName = refName.includes(':') ? refName.split(':')[1] : refName;
        if (state.wsdlTypes && state.wsdlTypes[simpleName]) {
            return resolveSchema(state.wsdlTypes[simpleName]);
        }
        return { type: 'string' }; // tipo desconocido, tratar como string
    }
    if (schema.allOf) {
        const merged = { type: 'object', properties: {} };
        schema.allOf.forEach(s => {
            const resolved = resolveSchema(s);
            if (resolved.properties) merged.properties = { ...merged.properties, ...resolved.properties };
            if (resolved.type) merged.type = resolved.type;
        });
        return merged;
    }
    return schema;
}

function createFormField(name, field, onChange, defaultValue = undefined) {
    if (defaultValue !== undefined) {
        console.log(`Setting default value for field "${name}":`, defaultValue);
    }
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = name;
    group.appendChild(label);

    let input;
    if (field.type === 'boolean') {
        input = document.createElement('select');
        input.innerHTML = '<option value="">--</option><option value="false">false</option><option value="true">true</option>';
        if (defaultValue !== undefined && defaultValue !== null) input.value = String(defaultValue);
    } else {
        input = document.createElement('input');
        input.type = field.type === 'integer' || field.type === 'number' ? 'number' : 'text';
        input.placeholder = field.description || field.format || field.type || '';
        if (defaultValue !== undefined && defaultValue !== null) input.value = defaultValue;
    }

    input.oninput = (e) => {
        let val = e.target.value;
        if (val === '') return onChange(undefined);
        if (field.type === 'integer' || field.type === 'number') val = Number(val);
        if (field.type === 'boolean') val = val === 'true';
        onChange(val);
    };

    group.appendChild(input);
    return group;
}

// --- Excel & Mapping Logic ---
function handleExcel(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        state.excelSheets = {};
        workbook.SheetNames.forEach(name => {
            state.excelSheets[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name]);
        });

        // La primera hoja siempre se considera la "Principal" (Main)
        state.excelData = state.excelSheets[workbook.SheetNames[0]] || [];

        notify(`Excel cargado: ${workbook.SheetNames.length} pestañas encontradas`, 'success');

        // Update drag zone visuals
        els.dropZone.classList.add('success');
        const dropSpan = els.dropZone.querySelector('span');
        if (dropSpan) dropSpan.textContent = `Archivo cargado: ${file.name}`;

        renderMappingUI();
    };
    reader.readAsArrayBuffer(file);
}

function renderMappingUI() {
    if (!state.excelData || !state.excelData.length) return;

    els.mappingSection.classList.remove('hidden');
    els.mappingTable.innerHTML = '';

    const excelColumns = Object.keys(state.excelData[0]);
    const soapFields = getSoapFields();

    const table = document.createElement('table');
    table.className = 'mapping-grid';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Campo SOAP (WSDL)</th>
                <th>Columna Excel</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    soapFields.forEach(field => {
        const tr = document.createElement('tr');

        const tdService = document.createElement('td');
        tdService.textContent = field.name;

        const tdExcel = document.createElement('td');
        const select = document.createElement('select');
        select.innerHTML = '<option value="">-- No mapear --</option>';
        excelColumns.forEach(id => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = id;

            const colLower = id.toLowerCase();
            const targetLower = field.name.toLowerCase();

            // Auto match priority: Exact > Excel contains Swagger > Swagger contains Excel
            if (colLower === targetLower) {
                option.selected = true;
            } else if (colLower.includes(targetLower) || targetLower.includes(colLower)) {
                // Solo si la columna es suficientemente larga para no dar falsos positivos (p.ej. > 3 chars)
                if (colLower.length > 3 || colLower === targetLower) {
                    option.selected = true;
                }
            }
            select.appendChild(option);
        });

        select.onchange = (e) => {
            if (e.target.value) state.mapping[field.name] = e.target.value;
            else delete state.mapping[field.name];
        };

        // Initial auto-mapping
        if (select.value) state.mapping[field.name] = select.value;

        tdExcel.appendChild(select);
        tr.appendChild(tdService);
        tr.appendChild(tdExcel);
        tbody.appendChild(tr);
    });

    els.mappingTable.appendChild(table);
}

/**
 * Obtiene la lista plana de campos del schema del método SOAP seleccionado.
 * Reemplaza a getSwaggerFields() que usaba el bodyParam de Swagger.
 */
function getSoapFields() {
    if (!state.selectedMethod || !state.selectedMethod.schema) return [];

    const fields = [];
    function flatten(schema, prefix = '') {
        const resolved = resolveSchema(schema);
        if (resolved.type === 'object' && resolved.properties) {
            Object.keys(resolved.properties).forEach(prop => {
                const fullPath = prefix ? `${prefix}.${prop}` : prop;
                flatten(resolved.properties[prop], fullPath);
            });
        } else if (resolved.type === 'array') {
            // No aplanamos dentro de arrays para el mapeador; cada fila Excel = un item
        } else {
            fields.push({ name: prefix, type: resolved.type || 'string' });
        }
    }

    const root = resolveSchema(state.selectedMethod.schema);
    if (root.type === 'array') {
        flatten(root.items || {});
    } else {
        flatten(root);
    }

    return fields;
}

/**
 * Reconstruye un objeto JSON profundo a partir de una fila de Excel.
 * Soporta anidamiento por puntos (Cliente.Nombre) y arrays simples en una fila plana.
 * Ya no dependemos de Template_Key o Parent_Key.
 */
function assembleDeepObject(row, schema) {
    const obj = {};

    // 1. Aplicar mapeo explícito del usuario
    Object.keys(state.mapping).forEach(serviceField => {
        const excelCol = state.mapping[serviceField];
        if (row.hasOwnProperty(excelCol)) {
            // Guardamos el mapeo mapeándolo al path de destino ("Cliente.Nombre")
            // Pero en un flat table, el servicio field YA ES el dot path si vino de `getSwaggerFields`
            setDeepValue(obj, serviceField.split('.'), row[excelCol]);
        }
    });

    // 2. Procesar el resto de columnas de la fila (incluyendo dot-notation automática)
    // Esto asegura que Cliente.RefCliente funcione aunque no esté en el mapeo explícito
    Object.keys(row).forEach(col => {
        if (Object.values(state.mapping).includes(col)) return; // Ya mapeado

        // Skip internal/empty values
        if (col === 'Template_Key' || col === 'Parent_Key' || row[col] === null || row[col] === undefined || row[col] === '') return;

        setDeepValue(obj, col.split('.'), row[col]);
    });

    return obj;
}

// Función auxiliar para asignar valores profundamente manejando arrays y objetos
function setDeepValue(target, pathParts, value) {
    let current = target;
    for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        const isLast = i === pathParts.length - 1;

        if (isLast) {
            current[part] = value;
        } else {
            // Verificamos si la siguiente parte debería ser un elemento de array
            // Esto es complicado en dot-notation implícita sin esquema detallado, pero 
            // como generamos el flat template usando "Items.Producto.Nombre", lo guardaremos en 
            // un array de 1 elemento: target.Items[0].Producto.Nombre para reconstruir.

            // Asumimos que cualquier nodo intermedio es un array temporal si 
            // la lógica lo pide, pero es más seguro hacerlo objeto y luego limpiamos.
            // Para simplificar: lo hacemos objeto. El schema final dicta si es array.
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        }
    }
}

// Función auxiliar para forzar que las propiedades que deberían ser Array según el schema lo sean
function enforceSchemaArrays(dataObj, schemaProps) {
    if (!dataObj || typeof dataObj !== 'object') return dataObj;

    Object.keys(schemaProps).forEach(propKey => {
        const field = resolveSchema(schemaProps[propKey]);
        if (field.type === 'array') {
            // Si dataObj tiene esta propiedad como Objeto, la envolvemos en un Array de 1 elemento
            if (dataObj[propKey] !== undefined && !Array.isArray(dataObj[propKey])) {
                // Check if it's an object with array index keys (0, 1) or just a single obj
                // Our setDeepValue creates objects.
                const itemSchema = resolveSchema(field.items);
                if (itemSchema.type === 'object') {
                    // Envolvemos el objeto en un array de 1 elemento
                    dataObj[propKey] = [enforceSchemaArrays(dataObj[propKey], itemSchema.properties || {})];
                } else {
                    // Es array de primitivos, lovolvemos array de 1
                    dataObj[propKey] = [dataObj[propKey]];
                }
            } else if (dataObj[propKey] === undefined) {
                // dataObj[propKey] = []; // Opcional: inicializar vacíos
            }
        } else if (field.type === 'object' && field.properties) {
            if (dataObj[propKey]) {
                enforceSchemaArrays(dataObj[propKey], field.properties);
            }
        }
    });

    return dataObj;
}

async function startMassIntegration() {
    if (!state.excelSheets || Object.keys(state.excelSheets).length === 0) {
        return alert('No hay datos de Excel cargados.');
    }
    if (!state.selectedMethod) return alert('Selecciona un método primero.');

    const rootSchema = resolveSchema(state.selectedMethod.schema);
    const total = state.excelData.length;
    notify(`Iniciando integración masiva SOAP de ${total} registros...`, 'success');

    state.cancelRequested = false;
    els.startBatch.classList.add('hidden');
    els.cancelBatch.classList.remove('hidden');
    els.cancelBatch.disabled = false;
    els.cancelBatch.textContent = 'Cancelar';

    els.progressContainer.classList.remove('hidden');
    els.progressTotal.textContent = total;
    els.progressCount.textContent = '0';
    els.progressPercent.textContent = '0';
    els.progressBar.style.width = '0%';

    let processedCount = 0;

    try {
        const concurrencyLimit = 10;

        for (let i = 0; i < total; i += concurrencyLimit) {
            if (state.cancelRequested) {
                notify(`Integración masiva cancelada en registro ${i}.`, 'warning');
                break;
            }

            const batch = state.excelData.slice(i, i + concurrencyLimit);
            const promises = batch.map((row, index) => {
                let request;
                if (rootSchema.type === 'array') {
                    const itemSchema = resolveSchema(rootSchema.items);
                    let draftRaw = assembleDeepObject(row, itemSchema);
                    draftRaw = enforceSchemaArrays(draftRaw, itemSchema.properties || {});
                    request = [draftRaw];
                } else {
                    let draftRaw = assembleDeepObject(row, rootSchema);
                    draftRaw = enforceSchemaArrays(draftRaw, rootSchema.properties || {});
                    request = draftRaw;
                }
                return executeServiceCall(request, i + index + 1, total).then(() => {
                    processedCount++;
                    const percent = Math.round((processedCount / total) * 100);
                    els.progressCount.textContent = processedCount;
                    els.progressPercent.textContent = percent;
                    els.progressBar.style.width = `${percent}%`;
                });
            });

            await Promise.all(promises);
            await new Promise(r => setTimeout(r, 50));
        }

        if (!state.cancelRequested) notify('Integración masiva completada.', 'success');
    } finally {
        els.startBatch.classList.remove('hidden');
        els.cancelBatch.classList.add('hidden');
        setTimeout(() => els.progressContainer.classList.add('hidden'), 2000);
    }
}

async function sendUnitaryRequest() {
    if (!state.selectedMethod) return alert('Selecciona un método primero');
    notify(`Enviando petición SOAP: ${state.selectedMethod.name}...`, 'info');
    await executeServiceCall(state.requestBody);
}

/**
 * Ejecuta una llamada SOAP al endpoint del método seleccionado.
 * Siempre envía XML en formato SOAP 1.1, parsea la respuesta XML y muestra el resultado.
 */
async function executeServiceCall(body, current = null, total = null) {
    if (!state.selectedMethod) return;

    const { name } = state.selectedMethod;
    const cleanBase = state.baseUrl.endsWith('/') ? state.baseUrl.slice(0, -1) : state.baseUrl;
    const targetUrl = `${cleanBase}/Mapi/SOAP/Logistic/Service.asmx`;
    const finalProxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
    const apikey = els.apiKey.value;
    const soapXml = buildSoapXml(name, body, apikey);

    try {
        const response = await fetch(finalProxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'SOAPAction': `"http://unigis.com/${name}"`,
                'ApiKey': apikey
            },
            body: soapXml
        });

        const rawResponse = await response.text();
        const { code, isError, message } = parseSoapResponse(rawResponse);
        const isUnitary = !current;
        const msgPrefix = isUnitary ? 'Petición unitaria' : `Registro ${current}/${total}`;

        // En la petición unitaria, mostrar el XML de respuesta en el panel XML Preview
        if (isUnitary) {
            const outEl = document.getElementById('exampleOutput');
            if (outEl) {
                // Pretty-print el XML de respuesta
                outEl.textContent = rawResponse;
            }
            showTab('example');
        }

        if (response.ok) {
            if (code !== null) {
                const translated = UNIGIS_ERRORS[code] || `Código ${code}`;
                if (Number(code) === 1) {
                    notify(`${msgPrefix}: ✅ OK`, 'success');
                } else {
                    notify(`${msgPrefix}: ⚠️ ${translated} (${code})`, 'warning');
                }
            } else {
                notify(`${msgPrefix}: HTTP ${response.status} OK`, 'success');
            }
        } else {
            notify(`${msgPrefix}: Error HTTP ${response.status} - ${message || rawResponse.substring(0, 200)}`, 'error');
        }
    } catch (err) {
        const msgPrefix = current ? `Registro ${current}/${total}` : 'Petición unitaria';
        notify(`${msgPrefix}: Error de red. Consola para detalles.`, 'error');
        console.error(err);
    }
}

// ============================================================
// --- SOAP XML Builder ---
// ============================================================

/**
 * Construye un SOAP Envelope XML 1.1 completo para el método y datos dados.
 * Reemplaza a buildSoapXmlForAsync (ahora es la función universal para todas las peticiones SOAP).
 * @param {string} methodName - Nombre de la operación SOAP (ej: "CrearOrdenesPedido")
 * @param {Object} jsonData   - Objeto JS con los datos del request
 * @param {string} [apikey]   - Token/ApiKey a inyectar en el header SOAP
 * @returns {string} XML SOAP como string
 */
function buildSoapXml(methodName, jsonData, apikey) {
    // Si se llama sin methodName (solo con los datos), usar el método seleccionado
    if (typeof methodName === 'object') {
        apikey = jsonData;
        jsonData = methodName;
        methodName = state.selectedMethod ? state.selectedMethod.name : 'Request';
    }
    let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
    xml += `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n`;
    // En UNIGIS, la ApiKey a menudo viaja dentro del Body o query string, no siempre en el Header.
    // Para adaptarlo a lo requerido:
    xml += `  <soap:Body>\n`;
    xml += `    <${methodName} xmlns="http://unigis.com/">\n`;

    // Inyectar el token/ApiKey en el nodo principal (si el schema lo requiriera, usualmente se llama ApiKey)
    if (apikey) {
        xml += `      <ApiKey>${escapeXml(apikey)}</ApiKey>\n`;
    }

    if (jsonData && typeof jsonData === 'object') {
        const keys = Object.keys(jsonData);
        if (keys.length === 1 && typeof jsonData[keys[0]] === 'object') {
            const mainKey = keys[0];
            xml += `      <${mainKey}>\n`;
            xml += objectToXml(jsonData[mainKey], 4);
            xml += `      </${mainKey}>\n`;
        } else {
            for (const key of keys) {
                xml += objectToXmlItem(key, jsonData[key], 3);
            }
        }
    }
    xml += `    </${methodName}>\n`;
    xml += `  </soap:Body>\n`;
    xml += `</soap:Envelope>`;
    return xml;
}

// Mantener buildSoapXmlForAsync como alias para compatibilidad
const buildSoapXmlForAsync = buildSoapXml;

/** Escapa caracteres especiales XML */
function escapeXml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function objectToXmlItem(key, value, indentLevel) {
    const indent = "  ".repeat(indentLevel);
    if (value === null || value === undefined) {
        return `${indent}<${key} />\n`;
    }

    if (Array.isArray(value)) {
        let arrXml = "";
        value.forEach(item => {
            // UNIGIS XML Lists usually wrap items in singular node names or generic object nodes
            arrXml += objectToXmlItem(key, item, indentLevel);
        });
        return arrXml; // Arrays are rendered as consecutive identical elements in SOAP
    }

    if (typeof value === 'object') {
        let objXml = `${indent}<${key}>\n`;
        objXml += objectToXml(value, indentLevel + 1);
        objXml += `${indent}</${key}>\n`;
        return objXml;
    }

    // Primitive Formats
    // Handle booleans (SOAP expects lower case 'true' or 'false' usually)
    let finalValue = value;
    if (typeof value === 'boolean') finalValue = value.toString().toLowerCase();

    // HTML Escape text
    if (typeof finalValue === 'string') {
        finalValue = finalValue.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    return `${indent}<${key}>${finalValue}</${key}>\n`;
}

function objectToXml(obj, indentLevel) {
    let xml = "";
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            xml += objectToXmlItem(key, obj[key], indentLevel);
        }
    }
    return xml;
}

/**
 * Convierte un elemento DOM (XML) a un objeto JavaScript para inicializar el formulario.
 * Agrupa nodos repetidos en arrays automáticamente.
 */
function xmlToObject(xmlNode) {
    const obj = {};
    if (xmlNode.nodeType === 1) { // Element node
        if (xmlNode.attributes.length > 0) {
            // Se ignoran atributos para simplificar la UI de UNIGIS, o se podrían guardar
        }
    }

    // Si no tiene hijos elemento sino texto
    if (xmlNode.children.length === 0) {
        return xmlNode.textContent;
    }

    for (let i = 0; i < xmlNode.children.length; i++) {
        const item = xmlNode.children[i];
        const nodeName = item.localName;
        const nodeValue = xmlToObject(item);

        if (obj[nodeName] !== undefined) {
            if (!Array.isArray(obj[nodeName])) {
                obj[nodeName] = [obj[nodeName]];
            }
            obj[nodeName].push(nodeValue);
        } else {
            // UNIGIS usa a veces contenedores de array explícitos como <Items><Item>...</Item></Items>
            // Mantendremos la estructura uno a uno con el XML.
            obj[nodeName] = nodeValue;
        }
    }
    return obj;
}

// --- UI Utilities ---
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

/**
 * Actualiza el panel lateral derecho con el XML SOAP generado en tiempo real.
 * Reemplaza a updateJsonPreview() - ahora muestra XML en vez de JSON.
 */
function updateXmlPreview() {
    if (!els.jsonOutput) return;
    if (!state.selectedMethod) {
        els.jsonOutput.textContent = '// Selecciona un método para ver el XML SOAP';
        return;
    }
    const xml = buildSoapXml(state.selectedMethod.name, state.requestBody, els.apiKey ? els.apiKey.value : '');
    els.jsonOutput.textContent = xml;
}

// Alias para compatibilidad con buildFormRecursive que llama a updateJsonPreview
const updateJsonPreview = updateXmlPreview;

function notify(msg, type) {
    const log = document.getElementById('logContent');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    log.prepend(entry);
}

// --- Excel Custom Data Export (From WSDL Schema) ---
function downloadExcelTemplate() {
    if (!state.selectedMethod) {
        return notify('Selecciona un método primero.', 'warning');
    }

    const filename = state.selectedMethod.name || 'Template';
    const soapFields = getSoapFields();

    if (!soapFields || soapFields.length === 0) {
        return notify('Este método no tiene campos en el WSDL para exportar.', 'warning');
    }

    // Construir una sola fila que servirá como encabezado de la plantilla Excel
    const headerRow = {};
    soapFields.forEach(field => {
        // Omitir ApiKey ya que se inyecta automáticamente o es irrelevante para carga masiva usualmente
        if (field.name.toLowerCase() !== 'apikey') {
            // Ponemos el tipo de dato como valor de ejemplo/pista
            headerRow[field.name] = `[${field.type}]`;
        }
    });

    const flatRows = [headerRow];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(flatRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Datos Massivos');

    XLSX.writeFile(wb, `${filename}_Template.xlsx`);
    notify('Plantilla Excel descargada correctamente', 'success');
}

function toggleLoading(show) {
    if (show) {
        els.methodList.innerHTML = '<div class="loading-spinner">Cargando...</div>';
    } else {
        const hasMethods = els.methodList.querySelector('.tag-header');
        if (!hasMethods) {
            els.methodList.innerHTML = '';
        }
    }
}

init();
