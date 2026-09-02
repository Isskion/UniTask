/**
 * main.js - UNIGIS Logistic Service Integrator
 * Features: Swagger Parsing, Dynamic Form Building, Field Mapping, Mass Integration
 */

// Secreto compartido para los endpoints /api/proxy y /api/uniswagger/cache.
// NO es un secreto real de seguridad (va en JS público, cualquiera que abra
// esta página puede leerlo) — solo corta el acceso anónimo/automatizado a
// quien golpea la URL directamente sin haber cargado nunca la herramienta.
const INTEGRATOR_SHARED_SECRET = '0e9a30536dc24c6633495766da86e36d6661beb39628ab0e65b93384265222d4';

function integratorFetch(url, options = {}) {
    const headers = { ...(options.headers || {}), 'X-Integrator-Key': INTEGRATOR_SHARED_SECRET };
    return fetch(url, { ...options, headers });
}

let state = {
    swagger: null,
    selectedMethod: null,
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

    els.loadSwagger.addEventListener('click', () => loadSwagger(els.swaggerUrl.value));

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

    // Paste JSON Logic
    if (els.pasteJsonBtn) {
        els.pasteJsonBtn.addEventListener('click', () => {
            console.log('Opening Paste Modal');
            els.pasteModal.classList.remove('hidden');
        });

        els.closePaste.addEventListener('click', () => els.pasteModal.classList.add('hidden'));

        els.processPaste.addEventListener('click', async () => {
            let parsed;
            try {
                parsed = JSON.parse(els.jsonInputArea.value);
            } catch (err) {
                alert('JSON inválido. Asegúrate de copiar todo el contenido.');
                return;
            }
            state.swagger = parsed;
            renderMethods();
            els.pasteModal.classList.add('hidden');
            await saveSwaggerCache(els.swaggerUrl ? els.swaggerUrl.value : null, parsed);
            notify('Swagger cargado y guardado en Firestore (no hace falta volver a pegarlo)', 'success');
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

    // Template JSON Logic
    els.openTemplateModal.addEventListener('click', () => els.templateModal.classList.remove('hidden'));
    els.closeTemplate.addEventListener('click', () => els.templateModal.classList.add('hidden'));
    els.processTemplate.addEventListener('click', () => {
        let raw = els.templateJsonInput.value.trim();
        if (!raw) return alert('Pega un JSON primero');

        try {
            // Limpieza básica de caracteres invisibles o comillas "curvas" comunes al copiar de docs
            raw = raw.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

            const template = JSON.parse(raw);
            state.requestBody = template;
            renderDynamicForm(state.selectedMethod.definition, template);
            updateJsonPreview();
            notify('JSON Preformado aplicado al formulario', 'success');
            els.templateModal.classList.add('hidden');
        } catch (err) {
            console.error('JSON Parse Error:', err);
            alert(`JSON inválido: ${err.message}\n\nConsejo: Revisa si faltan comas, llaves o si hay caracteres extraños.`);
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
        // Mejorar limpieza de la URL base
        let baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        // Quitar sufijos comunes si el usuario pegó la URL de Swagger
        baseUrl = baseUrl.split('/swagger/')[0].split('/Mapi/')[0].split('/Bapi/')[0];
        
        // Fix for 404: The Login method is typically under Auth/service.asmx
        const loginEndpoint = `${baseUrl}/Mapi/SOAP/Auth/service.asmx/Login`;
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(loginEndpoint)}`;

        // UNIGIS .asmx via HTTP POST typically requires x-www-form-urlencoded
        const formData = new URLSearchParams();
        formData.append('user', user);
        formData.append('password', pass);
        formData.append('system', 'MAPI');

        const response = await integratorFetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
        });

        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

        const rawResponse = await response.text();
        let data;
        let isSuccess = false;

        try {
            data = JSON.parse(rawResponse);

            // .NET ASMX typically wraps JSON responses in a "d" object.
            if (data && data.d) {
                if (typeof data.d === 'string') {
                    try {
                        data = JSON.parse(data.d);
                    } catch (e) {
                        data = data.d;
                    }
                } else {
                    data = data.d;
                }
            }
        } catch (e) {
            // Intentar parsear como XML si no es JSON (común en respuestas HTTP POST de ASMX)
            console.log("Respuesta no es JSON, intentando parsear XML...");
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(rawResponse, "text/xml");
            
            // Buscar nodos comunes de UNIGIS login
            // NOTA: 'Token' contiene el token completo (Base64@MAC). 'MapiToken' es solo el MAC corto.
            const resultNode = xmlDoc.getElementsByTagName("Result")[0];
            const fullTokenNode = xmlDoc.getElementsByTagName("Token")[0] || xmlDoc.getElementsByTagName("JMT")[0] || xmlDoc.getElementsByTagName("JWT")[0];
            const mapiTokenNode = xmlDoc.getElementsByTagName("MapiToken")[0];
            const messageNode = xmlDoc.getElementsByTagName("Message")[0];

            if (resultNode) {
                const fullToken = fullTokenNode ? fullTokenNode.textContent : '';
                const mapiToken = mapiTokenNode ? mapiTokenNode.textContent : '';
                data = {
                    Result: resultNode.textContent.toLowerCase() === 'true',
                    Token: fullToken,
                    MapiToken: fullToken || mapiToken,  // Usar el token completo para autenticar
                    Message: messageNode ? messageNode.textContent : ''
                };
                console.log('[Login XML] Token completo:', fullToken ? fullToken.slice(0, 30) + '...' : 'NO encontrado');
                console.log('[Login XML] MapiToken (MAC):', mapiToken || 'NO encontrado');
            } else {
                throw new Error("Respuesta del servidor no es JSON ni XML válido: " + rawResponse.slice(0, 100));
            }
        }

        isSuccess = data.Result === true || (data.Result && String(data.Result).toLowerCase() !== "false" && String(data.Result) !== "0");

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

            // Cargar Swagger: primero desde Firestore (instantáneo, no depende de la
            // sesión de sitio ni del navegador), y en segundo plano intentar refrescarlo
            // desde la red sin pisar la lista si ese intento falla (loadSwagger silent:true).
            const swaggerUrl = `${baseUrl}/swagger/docs/v1`;
            els.swaggerUrl.value = swaggerUrl;

            const cached = await loadSwaggerCache(swaggerUrl);
            if (cached && cached.json) {
                state.swagger = cached.json;
                renderMethods();
                const savedDate = cached.savedAt ? new Date(cached.savedAt).toLocaleString() : 'fecha desconocida';
                notify(`Swagger cargado desde Firestore (guardado ${savedDate})`, 'success');
                loadSwagger(swaggerUrl, { silent: true });
            } else {
                loadSwagger(swaggerUrl);
            }
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
    // Limpiar variables de estado y UI
    els.apiKey.value = "";
    els.swaggerUrl.value = "";
    document.getElementById('methodList').innerHTML = '<div class="loading-spinner">Esperando Login...</div>';
    state.selectedMethod = null;
    els.appContainer.classList.add('hidden');

    // Restaurar Top Bar (por si luego se entra sin login)
    if (els.userInfoBar) {
        els.userInfoBar.classList.add('hidden');
        els.userInfoBar.style.display = 'none';
    }
    if (els.topConfigBar) els.topConfigBar.classList.remove('hidden');

    // Mostrar pantalla de Login
    els.loginScreenWrapper.classList.remove('hidden');
    els.loginPass.value = ""; // Limpiar constraseña por seguridad

    // Limpiar consola
    document.getElementById('logContent').innerHTML = '';
}

// --- Swagger Logic ---
// --- Cache del Swagger en Firestore (para no depender del fetch automático
// cada vez, y para que quede compartido entre navegadores/usuarios) ---
async function saveSwaggerCache(url, swaggerJson) {
    try {
        const res = await integratorFetch('/api/uniswagger/cache', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url || null, json: swaggerJson })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
        console.warn('[UniSwagger] No se pudo guardar el cache en Firestore:', e);
    }
}

async function loadSwaggerCache(url) {
    try {
        const qs = url ? `?url=${encodeURIComponent(url)}` : '';
        const res = await integratorFetch(`/api/uniswagger/cache${qs}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.found) return null;
        return { url: data.url, json: data.json, savedAt: data.savedAt };
    } catch (e) {
        console.warn('[UniSwagger] No se pudo leer el cache de Firestore:', e);
        return null;
    }
}

async function loadSwagger(url, opts = {}) {
    const silent = !!opts.silent; // true = intento de refresco en segundo plano: no pisar la UI si falla
    if (!url) return alert('Por favor ingresa una URL');

    let finalUrl = url.trim();

    // 1. Convert UI URL to JSON URL
    if (finalUrl.includes('/swagger/ui/index')) {
        finalUrl = finalUrl.split('/swagger/ui/index')[0] + '/swagger/docs/v1';
    }

    // Actualizar también la URL de Login si está vacía o contiene la URL de swagger
    const baseUrl = finalUrl.split('/swagger/')[0];
    if (els.loginUrl && (!els.loginUrl.value || els.loginUrl.value === 'https://')) {
        els.loginUrl.value = baseUrl;
    }
    // 2. If it's just the base URL, append swagger path
    else if (!finalUrl.includes('/swagger/')) {
        // Ensure we don't double slash
        const separator = finalUrl.endsWith('/') ? '' : '/';
        finalUrl = finalUrl + separator + 'swagger/docs/v1';
    }

    // Update input to show the final path we are using
    els.swaggerUrl.value = finalUrl;
    if (!silent) notify(`Cargando desde: ${finalUrl}`, 'info');

    if (!silent) toggleLoading(true);
    try {
        // Use local proxy to bypass CORS automatically
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(finalUrl)}`;
        const response = await integratorFetch(proxyUrl);

        const rawBody = await response.text();

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}. ${rawBody.slice(0, 200)}`);
        }

        // Caso frecuente en UNIGIS: /swagger/docs/v1 exige sesión de sitio (cookie de
        // Login.aspx), distinta del token de API que da el login de este integrador.
        // Si no hay sesión, el servidor devuelve la página de login en vez del JSON.
        const looksLikeLoginPage = /<!DOCTYPE|<html/i.test(rawBody) && /login/i.test(rawBody);
        if (looksLikeLoginPage) {
            throw new Error(
                'El servidor devolvió la página de login (HTML) en vez del JSON del Swagger. ' +
                'Esta ruta exige sesión de sitio (distinta del login de API que usa este integrador). ' +
                'Iniciá sesión en el sitio de UNIGIS en otra pestaña, abrí ahí la misma URL del Swagger, ' +
                'copiá el JSON y usá el botón "Pegar JSON de Swagger".'
            );
        }

        let parsed;
        try {
            parsed = JSON.parse(rawBody);
        } catch (e) {
            throw new Error(`La respuesta no es JSON válido: ${rawBody.slice(0, 200)}`);
        }

        state.swagger = parsed;
        await saveSwaggerCache(finalUrl, parsed);
        renderMethods();
        notify(silent ? 'Swagger actualizado en segundo plano' : 'Swagger cargado automáticamente (vía Proxy local)', 'success');
    } catch (err) {
        console.error('[UniSwagger] Fallo al cargar Swagger desde', finalUrl, err);
        if (silent) {
            // Refresco en segundo plano: ya hay una lista cacheada visible, no la pisamos.
            console.warn('[UniSwagger] Refresco en segundo plano falló, se mantiene el cache local.');
            return;
        }
        notify('Fallo carga automática. Intenta con "Pegar JSON".', 'error');
        // Mostrar el motivo real donde el usuario está mirando (la barra izquierda),
        // no solo en un toast que puede pasar desapercibido.
        els.methodList.innerHTML = `
            <div class="log-entry error">
                <strong>No se pudieron cargar los servicios.</strong><br>
                URL intentada: <code>${finalUrl}</code><br>
                Motivo: ${err.message || 'Error desconocido'}<br><br>
                Usá el botón "📋 Pegar JSON de Swagger" (arriba de esta lista) para cargarlo manualmente.
            </div>`;
    } finally {
        if (!silent) toggleLoading(false);
    }
}

function renderMethods() {
    console.log('Rendering methods...', state.swagger);
    const paths = state.swagger.paths;
    if (!paths) {
        console.error('No paths found in Swagger JSON', state.swagger);
        notify('El JSON cargado no contiene rutas (paths)', 'error');
        els.methodList.innerHTML = `
            <div class="log-entry error">
                <strong>El JSON cargado no contiene rutas ("paths").</strong><br>
                Claves recibidas: <code>${Object.keys(state.swagger || {}).join(', ') || '(vacío)'}</code><br><br>
                Verificá que sea un Swagger/OpenAPI válido (Swagger 2.0 con clave "paths").
            </div>`;
        return;
    }

    els.methodList.innerHTML = '';
    const groups = {};
    let totalMethods = 0;

    Object.keys(paths).forEach(path => {
        Object.keys(paths[path]).forEach(verb => {
            if (verb === 'parameters') return;
            const method = paths[path][verb];
            const tag = (method.tags && method.tags[0]) || 'General';
            if (!groups[tag]) groups[tag] = [];
            groups[tag].push({ path, verb, method });
            totalMethods++;
        });
    });

    console.log(`Found ${totalMethods} methods in ${Object.keys(groups).length} groups`);

    const groupKeys = Object.keys(groups);
    if (groupKeys.length === 0) {
        els.methodList.innerHTML = '<div class="log-entry error">No se encontraron métodos.</div>';
        return;
    }

    const HIDDEN_TAGS = ['logisticasync', 'inforasync', 'alerts', 'appointmentsasync', 'mapserver',
        'calculateddistance', 'resources', 'searchaddress', 'searchpoi', 'shipmentevents',
        'shipments', 'searchzipcode', 'shipmentsstate', 'unigisrouted'];

    let visibleGroups = 0;

    groupKeys.forEach((tag, index) => {
        const lowerTag = tag.toLowerCase();
        if (HIDDEN_TAGS.includes(lowerTag)) return; // Hide these from the UI list
        visibleGroups++;

        const tagHeader = document.createElement('div');
        tagHeader.className = 'tag-header';
        tagHeader.textContent = tag;

        // Expand LogisticService or the first group by default
        const shouldBeActive = tag.toLowerCase().includes('logistic') || index === 0;
        if (shouldBeActive) tagHeader.classList.add('active');
        els.methodList.appendChild(tagHeader);

        const methodContainer = document.createElement('div');
        methodContainer.className = `method-group ${shouldBeActive ? '' : 'hidden'}`;

        tagHeader.onclick = () => {
            tagHeader.classList.toggle('active');
            methodContainer.classList.toggle('hidden');
        };

        groups[tag].forEach(m => {
            // Fix: If operationId is missing or generic "Default", extract a meaningful name from the path.
            let name = m.method.operationId;
            // Loosen the check: sometimes it's 'default', ' Default ', or just missing.
            if (!name || name.trim().toLowerCase() === 'default') {
                const parts = m.path.split('/').filter(p => p && !p.startsWith('{')); // Remove path variable placeholders
                // Take the last part, but if it's something generic like 'v1', take the one before it
                name = parts[parts.length - 1];
                if (name && (name.toLowerCase() === 'v1' || name.toLowerCase() === 'api')) {
                    name = parts.length > 1 ? parts[parts.length - 2] : name;
                }
                if (!name) name = `${m.verb.toUpperCase()}`; // Fallback to verb if path is completely dynamic
            }

            // Clean up common prefixes that take up too much vertical space
            const displayName = name.replace('LogisticService_', '').replace(tag + '_', '');

            const div = document.createElement('div');
            div.className = 'method-item';
            div.textContent = displayName;
            div.onclick = (e) => {
                e.stopPropagation();
                document.querySelectorAll('.method-item').forEach(i => i.classList.remove('active'));
                div.classList.add('active');
                selectMethod(m.path, m.verb, m.method);
            };
            methodContainer.appendChild(div);
        });
        els.methodList.appendChild(methodContainer);
    });

    if (visibleGroups === 0) {
        // Se cargaron métodos, pero el filtro de tags los ocultó a todos.
        // Mostrar diagnóstico real en vez de dejar la barra vacía en silencio.
        console.warn('[UniSwagger] Todos los grupos quedaron ocultos por el filtro de tags. Tags encontrados:', groupKeys);
        els.methodList.innerHTML = `
            <div class="log-entry error">
                <strong>Se cargaron ${totalMethods} métodos pero ninguno es visible.</strong><br>
                Todos los tags encontrados están en la lista oculta del integrador.<br>
                Tags encontrados: <code>${groupKeys.join(', ')}</code><br><br>
                Si esperabas ver "LogisticService", revisá que el Swagger cargado sea el correcto,
                o ajustá la lista <code>HIDDEN_TAGS</code> en main.js (función renderMethods).
            </div>`;
        notify('Todos los métodos quedaron ocultos por el filtro de tags', 'error');
    }
}

function selectMethod(path, verb, definition) {
    state.selectedMethod = { path, verb, definition };
    state.mapping = {}; // Limpiar mapeo al cambiar de método
    const optId = definition.operationId || "";
    els.currentMethodName.textContent = optId || `${verb.toUpperCase()} ${path}`;

    const exampleTabBtn = document.querySelector('[data-tab="example"]');
    if (exampleTabBtn) {
        if (optId.toLowerCase().includes('consultar') || optId.toLowerCase().includes('get')) {
            exampleTabBtn.textContent = 'Visualizador de respuestas';
        } else {
            exampleTabBtn.textContent = 'Ejemplos';
        }
    }

    // Configurar y mostrar el Toggle Asíncrono
    const tag = (definition.tags && definition.tags[0]) || 'General';
    els.asyncToggleContainer.classList.remove('hidden');
    // Prender por defecto si el Swagger ya dice que es Async
    if (tag.toLowerCase() === 'logisticasync') {
        els.asyncToggle.checked = true;
    } else {
        els.asyncToggle.checked = false;
    }

    els.welcomeScreen.classList.add('hidden');
    els.methodDetail.classList.remove('hidden');

    renderDynamicForm(definition);
    if (state.excelData && state.excelData.length > 0) {
        renderMappingUI();
    }
    showTab('unitary');
}

// --- Dynamic Form Builder ---
function renderDynamicForm(definition, initialData = null) {
    if (els.formSearch) els.formSearch.value = ''; // Reset search when rendering new form
    els.dynamicForm.innerHTML = '';
    state.requestBody = {};

    const bodyParam = (definition.parameters || []).find(p => p.in === 'body');
    if (!bodyParam) {
        els.dynamicForm.innerHTML = '<p>Este método no requiere body.</p>';
        return;
    }

    const resolvedSchema = resolveSchema(bodyParam.schema);
    if (resolvedSchema) {
        if (resolvedSchema.properties) {
            state.requestBody = {};
            buildFormRecursive(resolvedSchema.properties, els.dynamicForm, state.requestBody, initialData);
        } else if (resolvedSchema.type === 'array') {
            state.requestBody = Array.isArray(initialData) ? initialData : [];
            // Para arrays raíz, creamos un contenedor especial en el form
            const dummyProps = { "items": resolvedSchema };
            const dummyParent = { "items": state.requestBody };
            const dummyData = { "items": initialData };
            buildFormRecursive(dummyProps, els.dynamicForm, dummyParent, dummyData);
            // Sincronizar el real con el dummy
            state.requestBody = dummyParent.items;
        }
    }

    // Examples
    const exampleOutput = document.getElementById('exampleOutput');
    if (bodyParam.schema.example) {
        exampleOutput.textContent = JSON.stringify(bodyParam.schema.example, null, 2);
    } else if (resolvedSchema.example) {
        exampleOutput.textContent = JSON.stringify(resolvedSchema.example, null, 2);
    } else {
        exampleOutput.textContent = '// No hay ejemplo disponible';
    }

    updateJsonPreview();
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

function resolveSchema(schema) {
    if (!schema) return {};
    if (schema.$ref) {
        const refPath = schema.$ref.replace('#/', '').split('/');
        let current = state.swagger;
        refPath.forEach(part => { current = current ? current[part] : null; });
        return resolveSchema(current);
    }
    if (schema.allOf) {
        const merged = { type: 'object', properties: {} };
        schema.allOf.forEach(s => {
            const resolved = resolveSchema(s);
            if (resolved.properties) {
                merged.properties = { ...merged.properties, ...resolved.properties };
            }
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
    const swaggerFields = getSwaggerFields();

    const table = document.createElement('table');
    table.className = 'mapping-grid';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Campo Servicio (Swagger)</th>
                <th>Columna Excel</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    swaggerFields.forEach(field => {
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

function getSwaggerFields() {
    const definition = state.selectedMethod.definition;
    const bodyParam = (definition.parameters || []).find(p => p.in === 'body');
    if (!bodyParam || !bodyParam.schema) return [];

    const fields = [];
    const resolvedRoot = resolveSchema(bodyParam.schema);

    function flatten(schema, prefix = '') {
        const resolved = resolveSchema(schema);
        if (resolved.type === 'object' && resolved.properties) {
            Object.keys(resolved.properties).forEach(prop => {
                const fullPath = prefix ? `${prefix}.${prop}` : prop;
                flatten(resolved.properties[prop], fullPath);
            });
        } else if (resolved.type === 'array') {
            // No aplanamos dentro de arrays para el mapeador masivo,
            // ya que se manejan por pestañas independientes.
        } else {
            fields.push({
                name: prefix,
                type: resolved.type
            });
        }
    }

    if (resolvedRoot.type === 'array') {
        flatten(resolvedRoot.items);
    } else {
        flatten(resolvedRoot);
    }

    // Exclude ApiKey from the mappable fields since it is auto-injected globally
    return fields.filter(f => f.name.toLowerCase() !== 'apikey');
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

    const { definition } = state.selectedMethod;
    const bodyParam = (definition.parameters || []).find(p => p.in === 'body');
    const rootSchema = resolveSchema(bodyParam.schema);

    const total = state.excelData.length;
    notify(`Iniciando integración masiva de ${total} registros...`, 'success');

    // Intentar obtener la ApiKey estática de la plantilla de request unitaria
    let templateApiKey = "";
    if (state.requestBody) {
        if (Array.isArray(state.requestBody) && state.requestBody.length > 0 && typeof state.requestBody[0] === 'object') {
            const first = state.requestBody[0];
            if (first.ApiKey) templateApiKey = first.ApiKey;
            else if (first.apiKey) templateApiKey = first.apiKey;
        } else if (typeof state.requestBody === 'object') {
            if (state.requestBody.ApiKey) templateApiKey = state.requestBody.ApiKey;
            else if (state.requestBody.apiKey) templateApiKey = state.requestBody.apiKey;
        }
    }
    // Si la api key de la plantilla es un token largo, extraer la estática:
    if (templateApiKey && templateApiKey.includes('@')) {
        const decodedKey = extractStaticApiKeyFromToken(templateApiKey);
        if (decodedKey) templateApiKey = decodedKey;
    }

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
        const concurrencyLimit = 20; // Enviar hasta 10 peticiones a la vez

        for (let i = 0; i < total; i += concurrencyLimit) {
            if (state.cancelRequested) {
                notify(`Integración masiva cancelada por el usuario en el registro ${i}.`, 'warning');
                break;
            }

            const batch = state.excelData.slice(i, i + concurrencyLimit);
            const promises = batch.map((row, index) => {
                let request;

                if (rootSchema.type === 'array') {
                    const itemSchema = resolveSchema(rootSchema.items);
                    let draftRaw = assembleDeepObject(row, itemSchema);
                    draftRaw = enforceSchemaArrays(draftRaw, itemSchema.properties || {});
                    if (templateApiKey && !draftRaw.ApiKey && !draftRaw.apiKey) {
                        draftRaw.ApiKey = templateApiKey;
                    }
                    request = [draftRaw];
                } else {
                    let draftRaw = assembleDeepObject(row, rootSchema);
                    draftRaw = enforceSchemaArrays(draftRaw, rootSchema.properties || {});
                    if (templateApiKey && !draftRaw.ApiKey && !draftRaw.apiKey) {
                        draftRaw.ApiKey = templateApiKey;
                    }
                    request = draftRaw;
                }

                // El índice real global es i + index + 1
                return executeServiceCall(request, i + index + 1, total).then(() => {
                    processedCount++;
                    const percent = Math.round((processedCount / total) * 100);
                    els.progressCount.textContent = processedCount;
                    els.progressPercent.textContent = percent;
                    els.progressBar.style.width = `${percent}%`;
                });
            });

            // Esperar a que todo el bloque concurrente termine antes de seguir con el siguiente bloque
            await Promise.all(promises);
            // Pequeña pausa para no bloquear la UI del navegador completamente
            await new Promise(r => setTimeout(r, 50));
        }

        if (!state.cancelRequested) {
            notify('Integración masiva completada.', 'success');
        }
    } finally {
        els.startBatch.classList.remove('hidden');
        els.cancelBatch.classList.add('hidden');
        // Hide progress bar after 2 seconds
        setTimeout(() => els.progressContainer.classList.add('hidden'), 2000);
    }
}

function extractStaticApiKeyFromToken(token) {
    if (!token || !token.includes('@')) return null;
    try {
        const base64Part = token.split('@')[0].replace(/[^A-Za-z0-9+/=]/g, '');
        let binaryString;
        if (typeof atob === 'function') {
            binaryString = atob(base64Part);
        } else {
            binaryString = Buffer.from(base64Part, 'base64').toString('binary');
        }
        
        let decoded = "";
        for (let i = 0; i < binaryString.length; i += 2) {
            const charCode = binaryString.charCodeAt(i) + (binaryString.charCodeAt(i + 1) << 8);
            if (charCode > 0) decoded += String.fromCharCode(charCode);
        }
        
        if (!decoded.includes('!')) {
            decoded = binaryString;
        }
        
        if (decoded.includes('!')) {
            const parts = decoded.split('!');
            const potentialKey = parts[parts.length - 1];
            if (potentialKey && potentialKey.includes('-')) {
                return potentialKey.trim();
            }
        }
    } catch (e) {
        console.warn("Error al extraer ApiKey del token:", e);
    }
    return null;
}

function sanitizeApiKeyInObject(node, targetKey) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
        node.forEach(item => sanitizeApiKeyInObject(item, targetKey));
    } else {
        for (const key in node) {
            if (Object.prototype.hasOwnProperty.call(node, key)) {
                const lowKey = key.toLowerCase();
                if (lowKey === 'apikey') {
                    const val = node[key];
                    const isLongToken = val && typeof val === 'string' && val.includes('@');
                    if (!val || val === "" || isLongToken) {
                        node[key] = targetKey;
                        if (key !== 'ApiKey') {
                            node['ApiKey'] = targetKey;
                        }
                    }
                } else if (typeof node[key] === 'object' && node[key] !== null) {
                    sanitizeApiKeyInObject(node[key], targetKey);
                }
            }
        }
    }
}

async function sendUnitaryRequest() {
    if (!state.selectedMethod) return alert('Selecciona un método primero');

    notify(`Enviando petición unitaria a ${state.selectedMethod.path}...`, 'info');
    await executeServiceCall(state.requestBody);
}

async function executeServiceCall(originalBody, current = null, total = null) {
    // Clonar el body para evitar mutaciones accidentales en state.requestBody
    const body = originalBody ? JSON.parse(JSON.stringify(originalBody)) : originalBody;

    const { path, verb, definition } = state.selectedMethod;
    let baseUrl = els.swaggerUrl.value.split('/swagger')[0];
    if (!baseUrl || baseUrl === '.' || baseUrl === './') {
        baseUrl = els.loginUrl.value ? els.loginUrl.value.trim() : '';
    }
    if (baseUrl && !baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = 'https://' + baseUrl;
    }

    let targetUrl = baseUrl + path;

    // Custom URL routing based on the Async toggle
    const tag = (definition.tags && definition.tags[0]) || 'General';
    let isAsync = els.asyncToggle.checked;
    let methodName = definition.operationId;

    if (isAsync) {
        if (!methodName || methodName.trim().toLowerCase() === 'default') {
            const parts = path.split('/').filter(p => p && !p.startsWith('{'));
            methodName = parts[parts.length - 1];
            if (methodName && (methodName.toLowerCase() === 'v1' || methodName.toLowerCase() === 'api')) {
                methodName = parts.length > 1 ? parts[parts.length - 2] : methodName;
            }
        }
        // Eliminate potential duplicate slashes
        const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        targetUrl = `${cleanBase}/Mapi/SOAP/LogisticAsync/${methodName}`;
    }

    const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
    const apikey = els.apiKey.value;

    // Intentar extraer la ApiKey estática del token de sesión si no hay una explícita
    let staticApiKey = extractStaticApiKeyFromToken(apikey);

    // --- Auto Inject ApiKey in body if root schema asks for it ---
    if (body && apikey) {
        const bSchema = (state.selectedMethod.definition.parameters || []).find(p => p.in === 'body');
        if (bSchema && bSchema.schema) {
            function injectApiKey(dataNode, schemaNode) {
                if (!dataNode || typeof dataNode !== 'object' || !schemaNode) return;
                const sNode = resolveSchema(schemaNode);
                if (sNode.type === 'array' && Array.isArray(dataNode)) {
                    dataNode.forEach(item => injectApiKey(item, sNode.items));
                } else if (sNode.type === 'object' && sNode.properties && !Array.isArray(dataNode)) {
                    for (const prop in sNode.properties) {
                        const lowProp = prop.toLowerCase();
                        if (lowProp === 'apikey') {
                            const currentValue = dataNode[prop];
                            const isLongToken = currentValue && typeof currentValue === 'string' && currentValue.includes('@');
                            if (!currentValue || currentValue === "" || isLongToken) {
                                const targetKey = staticApiKey || apikey;
                                dataNode[prop] = targetKey;
                                if (prop !== 'ApiKey') dataNode['ApiKey'] = targetKey; // Forzar mayúscula también
                            }
                        } else if (dataNode[prop] !== undefined) {
                            injectApiKey(dataNode[prop], sNode.properties[prop]);
                        }
                    }
                }
            }
            injectApiKey(body, bSchema.schema);
        }
    }

    // NO agregar ApiKey como query param en la URL REST — interfiere con el routing del servidor UNIGIS
    // La autenticación va SIEMPRE por header MapiToken y por el cuerpo JSON
    
    // Si la petición no tiene ApiKey explícita en la raíz pero la requiere, la forzamos
    const targetKey = staticApiKey || apikey;
    if (body && targetKey) {
        if (Array.isArray(body)) {
            body.forEach(item => {
                if (item && typeof item === 'object') {
                    const currentKey = item.ApiKey || item.apiKey;
                    const isLongToken = currentKey && typeof currentKey === 'string' && currentKey.includes('@');
                    if (!currentKey || currentKey === "" || isLongToken) {
                        item.ApiKey = targetKey;
                    }
                }
            });
        } else if (typeof body === 'object') {
            const currentRootKey = body.ApiKey || body.apiKey;
            const isLongToken = currentRootKey && typeof currentRootKey === 'string' && currentRootKey.includes('@');
            if (!currentRootKey || currentRootKey === "" || isLongToken) {
                body.ApiKey = targetKey;
            }
        }
        sanitizeApiKeyInObject(body, targetKey);
    }

    // Determinar la API Key a enviar en los headers:
    // Si el body contiene un ApiKey explícito (y no es el token largo), usamos ese.
    // De lo contrario, usamos la ApiKey estática extraída o el token de sesión.
    let headerApiKey = targetKey;
    if (body && typeof body === 'object') {
        const node = Array.isArray(body) ? body[0] : body;
        if (node && typeof node === 'object') {
            const bodyKey = node.ApiKey || node.apiKey;
            if (bodyKey && typeof bodyKey === 'string' && !bodyKey.includes('@')) {
                headerApiKey = bodyKey;
            }
        }
    }

    const finalProxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;

    // Preparar el Body y Headers de la petición
    let fetchBody;
    let contentType = 'application/json';

    // Si es Asincrono, UNIGIS exige SOAP XML en el Payload.
    if (isAsync) {
        contentType = 'text/xml; charset=utf-8';
        fetchBody = buildSoapXmlForAsync(methodName, body, apikey);
    } else {
        fetchBody = JSON.stringify(body);
    }

    try {
        const response = await integratorFetch(finalProxyUrl, {
            method: verb.toUpperCase(),
            headers: {
                'Content-Type': contentType,
                'X-ApiKey': headerApiKey,
                'ApiKey': headerApiKey,
                'MapiToken': apikey,
                'Authorization': `Bearer ${apikey}`,
                'Token': apikey,
                'SOAPAction': `http://unigis.com/Mapi/SOAP/LogisticAsync/${methodName}`
            },
            body: fetchBody
        });

        const rawResponse = await response.text();
        let data;
        let isJson = false;
        try {
            data = JSON.parse(rawResponse);
            isJson = true;
        } catch (e) {
            data = rawResponse; // Fallback to raw string
        }

        const isUnitary = !current;
        const msg = isUnitary ? 'Petición unitaria' : `Registro ${current}/${total}`;
        const time = new Date().toLocaleTimeString();
        const isError = !response.ok || (isJson && (String(data) !== "1" && (data.Result !== undefined && String(data.Result) !== "1")));

        const logContainer = document.getElementById('logContent');
        const entry = document.createElement('div');
        entry.className = `log-entry ${isError ? 'error' : 'success'}`;
        
        let html = `<strong>[${time}]</strong> ${msg}: ${!response.ok ? 'Error HTTP ' + response.status : (isError ? 'Error en lógica' : 'Completado')}`;
        
        html += `<details style="margin-top: 5px; cursor: pointer;">`;
        html += `<summary style="font-size: 0.85em; color: #888;">Ver Payload Enviado</summary>`;
        html += `<pre style="background: #111; padding: 5px; font-size: 0.75em; border-radius: 3px;">${fetchBody.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
        html += `</details>`;

        html += `<div style="font-size: 0.85em; margin-top: 5px;"><strong>Response:</strong> ${isJson ? JSON.stringify(data) : data}</div>`;
        entry.innerHTML = html;
        logContainer.prepend(entry);

        if (isUnitary) {
            const outEl = document.getElementById('exampleOutput');
            if (outEl) {
                // Determine whether it's an error so we visually distinguish it if needed (extra logic can go here later)
                outEl.textContent = isJson ? JSON.stringify(data, null, 2) : rawResponse;
            }
            // Mueve la vista automáticamente a la pestaña de respuesta tras ejecutar un request unitario
            showTab('example');
        }

        if (response.ok) {
            // UNIGIS a veces devuelve 200 pero con un código de error en el body
            let translated = "OK";
            if (isJson) {
                translated = translateUnigisError(data);
            }

            const isError = isJson && (String(data) !== "1" && (data.Result !== undefined && String(data.Result) !== "1"));

            if (isJson && translated !== "OK" && translated !== JSON.stringify(data)) {
                notify(`${msg}: Aviso/Error - ${translated}`, 'warning');
            } else {
                const displayData = isJson ? JSON.stringify(data) : data;
                notify(`${msg}: Éxito - ${displayData}`, 'success');
            }
        } else {
            const displayErr = isJson ? translateUnigisError(data) : data;
            notify(`${msg}: Error HTTP ${response.status} - ${displayErr}`, 'error');
        }
    } catch (err) {
        const msg = current ? `Registro ${current}/${total}` : 'Petición unitaria';
        notify(`${msg}: Error de red/CORS. Revisa la consola.`, 'error');
        console.error(err);
    }
}

// --- Utility: Convert JSON Request to SOAP XML for Async Endpoints ---
function buildSoapXmlForAsync(methodName, jsonData, token) {
    let xml = `<?xml version="1.0" encoding="utf-8"?>\n`;
    xml += `<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n`;
    xml += `  <soap:Body>\n`;
    xml += `    <${methodName} xmlns="http://unigis.com/">\n`;

    // Process JSON properties into XML Nodes
    if (jsonData && typeof jsonData === 'object') {
        const mainParamName = Object.keys(jsonData)[0] || 'request';

        // Comprobar si la raíz del JSON es el objeto directo o un contenedor (como 'crearOrdenesPedidoRequest')
        let content = jsonData;
        if (Object.keys(jsonData).length === 1 && typeof jsonData[mainParamName] === 'object') {
            // Inyectar la llave principal
            xml += `      <${mainParamName}>\n`;
            content = jsonData[mainParamName];
            xml += objectToXml(content, 4);
            xml += `      </${mainParamName}>\n`;
        } else {
            // Es flat, iterar sobre keys
            for (let key in jsonData) {
                xml += objectToXmlItem(key, jsonData[key], 3);
            }
        }
    }

    xml += `    </${methodName}>\n`;
    xml += `  </soap:Body>\n`;
    xml += `</soap:Envelope>`;
    return xml;
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

// --- UI Utilities ---
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
}

function updateJsonPreview() {
    els.jsonOutput.textContent = JSON.stringify(state.requestBody, null, 2);
}

function notify(msg, type) {
    const log = document.getElementById('logContent');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    log.prepend(entry);
}

// --- Excel Custom Data Export (From current Request Body) ---
function downloadExcelTemplate() {
    if (!state.requestBody || Object.keys(state.requestBody).length === 0) {
        return notify('No hay datos mapeados para exportar. Carga un JSON primero.', 'warning');
    }

    const { operationId } = state.selectedMethod.definition;
    const filename = (operationId || 'Template').replace('LogisticService_', '');

    // We will build a single array of rows representing the flattened structure
    let flatRows = [];

    /**
     * Procesa recursivamente el objeto para generar filas planas.
     * Si hay listas (arrays), cada elemento de la lista multiplicará la fila actual.
     * @param {Object|Array} data El nodo actual
     * @param {Object} currentRow Objeto con los datos acumulados bajando en el árbol
     */
    function processDataFlat(data, currentRow = {}) {
        let baseRow = { ...currentRow };
        let arraysToProcess = [];

        // Extraemos valores simples y guardamos arrays pendientes
        function flattenLevel(obj, prefix = '') {
            Object.keys(obj).forEach(key => {
                const val = obj[key];
                const fullKey = prefix ? `${prefix}.${key}` : key;

                if (Array.isArray(val)) {
                    arraysToProcess.push({ data: val, name: fullKey });
                } else if (val !== null && typeof val === 'object') {
                    flattenLevel(val, fullKey);
                } else {
                    baseRow[fullKey] = val;
                }
            });
        }

        flattenLevel(data);

        // Si no hay arrays en este nivel, añadimos la fila actual
        if (arraysToProcess.length === 0) {
            flatRows.push(baseRow);
            return;
        }

        // Si hay arrays, tenemos que combinar. 
        // Para simplificar, asumiremos que si hay múltiples arrays (ej: transportes[], etiquetas[]),
        // se generan combinaciones o se ponen lado a lado. Lo más común es un array principal (ej: Items[])
        // y sub-arrays dentro de este. En una tabla plana real, cruzar 2 arrays hermanos genera un producto cartesiano.
        // Haremos un producto cartesiano recursivo.

        function crossArrays(arrayIndex, currentAccRow) {
            if (arrayIndex >= arraysToProcess.length) {
                flatRows.push(currentAccRow);
                return;
            }

            const arrInfo = arraysToProcess[arrayIndex];
            if (arrInfo.data.length === 0) {
                // Si el array está vacío, continuamos con el siguiente array
                crossArrays(arrayIndex + 1, currentAccRow);
                return;
            }

            arrInfo.data.forEach(item => {
                // Hacemos una llamada recursiva principal para procesar los campos/arrays de ESTE item
                // y que sus hojas lleguen al flatRows
                // Pero, en vez de usar flatRows global temporalmente, pasamos el currentAccRow como base
                processDataFlat(item, currentAccRow);
            });
        }

        // En un caso real con producto cartesiano puro, processDataFlat inyectaría repetidos.
        // Un modelo más manejable para Excel: solo hacer loop del primer array si hay varios paralelos,
        // o asumir que los datos vienen jerárquicos.
        // Haremos lo simple: iterar sobre cada sub-array individualmente fusionándolo con el padre.

        let subRowsGenerators = [];
        arrInfo = arraysToProcess[0]; // Tomamos el primer array que encontremos (el dominante)
        if (arraysToProcess.length > 1) {
            console.warn("Múltiples listas paralelas (hermanas) detectadas. El Excel plano podría duplicar filas inesperadamente.");
        }

        // Empezar cadena de productos:
        // En lugar de cruces complejos, procesamos recursivamente.
        // Las propiedades primitivas de ESTE nivel ya están en baseRow.
        // Si hay un array (ej. Items), por cada Item llamamos processDataFlat(item, baseRow)
        if (arraysToProcess.length === 1) {
            arraysToProcess[0].data.forEach(item => {
                // Al "bajar" de nivel, añadimos como prefijo el nombre del array + '.' + clave del hijo
                // Pero para mantener simple el Excel, omitiremos renombrar las raíces de los arrays 
                // para que mantengan la estructura "Items.0.Producto..." NO, queremos "Items.Producto..."
                let subData = {};
                // Repack subData with prefix:
                if (typeof item === 'object' && item !== null) {
                    Object.keys(item).forEach(k => {
                        subData[`${arraysToProcess[0].name}.${k}`] = item[k];
                    });
                    processDataFlat(subData, baseRow);
                } else {
                    let primitiveData = {};
                    primitiveData[`${arraysToProcess[0].name}`] = item;
                    processDataFlat(primitiveData, baseRow);
                }
            });
        } else {
            // Manejar múltiples arrays nivel hermano. 
            // Para UNIGIS, rara vez cruzas "Transportes" con "Items" para crear todas las permutaciones.
            // Los ponemos todos. Es avanzado, simplifiquemos a iterar por todos y cruzar.
            let currentRows = [baseRow];
            arraysToProcess.forEach(arrList => {
                let nextRows = [];
                if (arrList.data.length === 0) return;

                currentRows.forEach(crow => {
                    arrList.data.forEach(item => {
                        let rowCopy = { ...crow };
                        if (typeof item === 'object' && item !== null) {
                            Object.keys(item).forEach(k => {
                                let subK = `${arrList.name}.${k}`;
                                flattenLevel({ [subK]: item[k] }, "", rowCopy); // Rehusar flattenLevel local adaptado
                                // Wait, flattenLevel is closure scope inside. Better to just recursively wrap:
                            });
                            // Simple merge for sibling arrays
                            let subObj = {}; Object.keys(item).forEach(k => subObj[`${arrList.name}.${k}`] = item[k]);
                            // Deep merge by delegating
                            nextRows.push({ subObj: subObj, parent: rowCopy });
                        } else {
                            rowCopy[arrList.name] = item;
                            nextRows.push({ subObj: {}, parent: rowCopy });
                        }
                    });
                });
                // process nextRows... (Too complex for simple robust template)
            });
        }
    }

    // Simplificación radical para el cliente: 
    // Un solo flatten que si detecta un Object lo baja (.), y si detecta Array lo deja como array vacío o toma el primer elemento.
    // Como el usuario pidió "simplificar porque Parent_Key es engorro", lo mejor es que el Excel sea 1 sola Pestaña (Main).
    // Y si hay sub-listas (ej. Items), que las comunique en columnas repetidas o asuma que 1 fila Excel = 1 Item (Padre duplicado).

    function generateFlatTemplate(data) {
        let results = [];

        function recurse(node, currentAcc = {}) {
            let row = { ...currentAcc };
            let childArrays = [];

            // 1. Extraer todo lo que no sea array
            function extractScalars(obj, prefix = '') {
                Object.keys(obj).forEach(key => {
                    const val = obj[key];
                    const fullKey = prefix ? `${prefix}.${key}` : key;
                    if (Array.isArray(val)) {
                        childArrays.push({ name: fullKey, items: val });
                    } else if (val !== null && typeof val === 'object') {
                        extractScalars(val, fullKey);
                    } else {
                        // Omit ApiKey from export as it is now auto-injected
                        if (key.toLowerCase() !== 'apikey') {
                            row[fullKey] = val;
                        }
                    }
                });
            }

            extractScalars(node);

            // 2. Si no hay arrays hijos, esta fila está terminada
            if (childArrays.length === 0) {
                results.push(row);
                return;
            }

            // 3. Si hay arrays hijos, multiplicamos la fila por los elementos del array dominante (el primero con datos)
            let mainArray = childArrays.filter(a => a.items.length > 0)[0];

            if (!mainArray) {
                results.push(row); // Todos vacíos
                return;
            }

            // Ignoramos arrays en paralelo complejos y forzamos a que si hay 2, advertimos (UNIGIS casi siempre es 1 lista fuerte Ej. Items)
            mainArray.items.forEach(childItem => {
                let proxyNode = {};
                // Le pasamos el nombre del array para que mantenga 'Items.Producto.Ref'
                if (typeof childItem === 'object' && childItem !== null) {
                    Object.keys(childItem).forEach(k => proxyNode[`${mainArray.name}.${k}`] = childItem[k]);
                } else {
                    proxyNode[mainArray.name] = childItem;
                }
                recurse(proxyNode, row);
            });
        }

        if (Array.isArray(data)) {
            data.forEach(d => recurse(d));
        } else {
            recurse(data);
        }

        return results;
    }

    flatRows = generateFlatTemplate(state.requestBody);

    if (flatRows.length === 0) flatRows = [{}]; // Al menos una fila vacía con cabeceras si no hay datos

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(flatRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Datos Massivos');

    XLSX.writeFile(wb, `${filename}_Flat_Template.xlsx`);
    notify('Excel exportado con los campos actuales del JSON', 'success');
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
