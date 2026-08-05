const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const excelPath = path.join(__dirname, 'transpais_plantilla_integracion.xlsx');
const sqlStatesPath = path.join(__dirname, '..', 'docs', 'TSP', 'full_estados_tsp.sql');
const sqlIntlPath = path.join(__dirname, '..', 'docs', 'TSP', 'full_transiciones_tsp.sql');
const sqlIntermPath = path.join(__dirname, '..', 'docs', 'TSP', 'full_transiciones_intermodal.sql');

const tables = {
    "Pedido": "EstadoPedido",
    "Orden": "EstadoOrden",
    "Viaje": "EstadoViaje",
    "Parada": "EstadoParada",
    "Ruta": "EstadoRuta"
};

const transitionTables = {
    "Pedido": "EstadoPedidoTransicion",
    "Orden": "EstadoOrdenTransicion",
    "Ruta": "EstadoRutaTransicion",
    "Viaje": "EstadoViajeTransicion",
    "Parada": "EstadoParadaTransicion"
};

const entityOrder = ["Pedido", "Orden", "Ruta", "Viaje", "Parada"];

// Load State Names from full_estados_tsp.sql
function loadStateNames() {
    const sql = fs.readFileSync(sqlStatesPath, 'utf8');
    const stateNames = {
        "Pedido": {}, "Orden": {}, "Viaje": {}, "Parada": {}, "Ruta": {}, "ParadaVisita": {}
    };
    
    // Fallbacks
    stateNames["Pedido"][1] = "INGRESADO";
    stateNames["Pedido"][2] = "ERROR-REQUIERE AJUSTE";
    stateNames["Pedido"][3] = "GRABADO";
    stateNames["Pedido"][100] = "CONFIRMADO";
    stateNames["Pedido"][101] = "PROGRAMAR DIRECTO REMITENTE DESTINO";
    stateNames["Pedido"][102] = "PROGRAMAR RECOLECCIÓN";
    stateNames["Pedido"][103] = "PROGRAMAR DIRECTO A DEPÓSITO SALIDA DESTINO";
    stateNames["Pedido"][104] = "PROGRAMAR ARRASTRE";
    stateNames["Pedido"][105] = "PROGRAMAR REPARTO";

    const blocks = sql.split('GO');
    for (let block of blocks) {
        block = block.trim();
        if (!block) continue;
        
        let foundTbl = null;
        let foundEnt = null;
        for (let [ent, tbl] of Object.entries(tables)) {
            if (block.includes(`dbo.${tbl}`)) {
                foundTbl = tbl;
                foundEnt = ent;
                break;
            }
        }
        // Check ParadaVisita
        if (block.includes("dbo.EstadoParadaVisita")) {
            foundTbl = "EstadoParadaVisita";
            foundEnt = "ParadaVisita";
        }
        
        if (!foundTbl) continue;
        
        const idCol = `Id${foundTbl}`;
        let mId = block.match(new RegExp(`WHERE\\s+${idCol}\\s*=\\s*(\\d+)`, 'i'));
        if (!mId) {
            mId = block.match(/VALUES\s*\(\s*(\d+)\s*,/i);
        }
        let mDesc = block.match(/SET\\s+Descripcion\\s*=\\s*'([^']+)'/i);
        if (!mDesc) {
            mDesc = block.match(/VALUES\s*\(\s*\d+\s*,\s*'([^']+)'/i);
        }
        
        if (mId && mDesc) {
            const idVal = parseInt(mId[1]);
            const desc = mDesc[1].toUpperCase();
            stateNames[foundEnt][idVal] = desc;
        }
    }
    return stateNames;
}

const stateNames = loadStateNames();

// Parse States list
function getStatesList() {
    const sql = fs.readFileSync(sqlStatesPath, 'utf8');
    const states = [];
    const seenKeys = new Set();
    
    const blocks = sql.split('GO');
    for (let block of blocks) {
        block = block.trim();
        if (!block) continue;
        
        let foundTbl = null;
        let foundEnt = null;
        for (let [ent, tbl] of Object.entries(tables)) {
            if (block.includes(`dbo.${tbl}`)) {
                foundTbl = tbl;
                foundEnt = ent;
                break;
            }
        }
        if (!foundTbl) continue;
        
        const idCol = `Id${foundTbl}`;
        let mId = block.match(new RegExp(`WHERE\\s+${idCol}\\s*=\\s*(\\d+)`, 'i'));
        if (!mId) {
            mId = block.match(/VALUES\s*\(\s*(\d+)\s*,/i);
        }
        let mDesc = block.match(/SET\\s+Descripcion\\s*=\\s*'([^']+)'/i);
        if (!mDesc) {
            mDesc = block.match(/VALUES\s*\(\s*\d+\s*,\s*'([^']+)'/i);
        }
        
        if (mId && mDesc) {
            const idVal = parseInt(mId[1]);
            const desc = mDesc[1].toUpperCase();
            
            const key = `${foundEnt}_${idVal}`;
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);
            
            let moment = "Ingreso/Programación";
            if (idVal >= 100 && idVal < 200) moment = "Planificación/Asignación";
            else if (idVal >= 200 && idVal < 300) moment = "Tránsito/Ejecución";
            else if (idVal >= 300 && idVal < 400) moment = "Carga/Entrega";
            else if (idVal >= 400 && idVal < 500) moment = "Logística Inversa/Cierre/Rendición";
            else if (idVal >= 500) moment = "Liquidación/Cierre";
            
            states.push({
                entidad: foundEnt,
                codigo: idVal,
                nombre: desc,
                momento: moment,
                descripcion: `ESTADO ${desc} PARA LA ENTIDAD ${foundEnt.toUpperCase()}`,
                activo: "TRUE"
            });
        }
    }
    
    // Sort
    states.sort((a, b) => {
        const entA = entityOrder.indexOf(a.entidad);
        const entB = entityOrder.indexOf(b.entidad);
        if (entA !== entB) return entA - entB;
        return a.codigo - b.codigo;
    });
    
    return states;
}

// Parse Transitions list
function getTransitionsList(sqlPath, defaultOpId) {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const transitions = [];
    
    const blocks = sql.split('GO');
    for (let block of blocks) {
        block = block.trim();
        if (!block) continue;
        
        let foundTbl = null;
        let foundEnt = null;
        for (let [ent, tbl] of Object.entries(transitionTables)) {
            if (block.includes(`dbo.${tbl}`)) {
                foundTbl = tbl;
                foundEnt = ent;
                break;
            }
        }
        if (!foundTbl) continue;
        
        const idCol = `Id${foundTbl}`;
        let mTransId = block.match(new RegExp(`WHERE\\s+${idCol}\\s*=\\s*(\\d+)`, 'i'));
        if (!mTransId) {
            mTransId = block.match(/VALUES\s*\(\s*(\d+)\s*,/i);
        }
        if (!mTransId) continue;
        const transId = parseInt(mTransId[1]);
        
        const srcCol = `IdEstado${foundEnt}Origen`;
        const dstCol = `IdEstado${foundEnt}Destino`;
        
        let mSrc = block.match(new RegExp(`${srcCol}\\s*=\\s*(\\d+|NULL)`, 'i'));
        let mDst = block.match(new RegExp(`${dstCol}\\s*=\\s*(\\d+|NULL)`, 'i'));
        
        let srcVal, dstVal;
        if (!mSrc || !mDst) {
            const mVal = block.match(/VALUES\s*\(\s*\d+\s*,\s*(\d+|NULL)\s*,\s*(\d+|NULL)/i);
            if (mVal) {
                srcVal = mVal[1];
                dstVal = mVal[2];
            } else {
                srcVal = "NULL";
                dstVal = "NULL";
            }
        } else {
            srcVal = mSrc[1];
            dstVal = mDst[1];
        }
        
        // RequiereFoto, RequiereFirma, RequiereMotivo, ValidarGeocerca
        const mFoto = block.match(/RequiereFoto\s*=\s*(\d+)/i);
        const reqFoto = mFoto && parseInt(mFoto[1]) === 1 ? "TRUE" : "FALSE";
        
        const mFirma = block.match(/RequiereFirma\s*=\s*(\d+)/i);
        const reqFirma = mFirma && parseInt(mFirma[1]) === 1 ? "TRUE" : "FALSE";
        
        const mMotivo = block.match(/RequiereMotivo\s*=\s*(\d+)/i);
        const reqMotivo = mMotivo && parseInt(mMotivo[1]) === 1 ? "TRUE" : "FALSE";
        
        const mGeo = block.match(/ValidarGeocerca\s*=\s*(\d+)/i);
        const valGeo = mGeo && parseInt(mGeo[1]) === 1 ? "TRUE" : "FALSE";
        
        const mVisita = block.match(/IdEstadoParadaVisita\s*=\s*(\d+)/i);
        const idVisita = mVisita && mVisita[1] !== "NULL" ? parseInt(mVisita[1]) : "";
        
        // Cascades
        let cascadeParts = [];
        const mCascadeOrd = block.match(/IdEstadoOrden\s*=\s*(\d+)/i);
        if (mCascadeOrd && mCascadeOrd[1] !== "NULL" && mCascadeOrd[1] !== "0") {
            cascadeParts.push(`Orden = ${mCascadeOrd[1]}`);
        }
        const mCascadePed = block.match(/IdEstadoPedido\s*=\s*(\d+)/i);
        if (mCascadePed && mCascadePed[1] !== "NULL" && mCascadePed[1] !== "0") {
            cascadeParts.push(`Pedido = ${mCascadePed[1]}`);
        }
        const mCascadeViaje = block.match(/IdEstadoViaje\s*=\s*(\d+)/i);
        if (mCascadeViaje && mCascadeViaje[1] !== "NULL" && mCascadeViaje[1] !== "0") {
            cascadeParts.push(`Viaje = ${mCascadeViaje[1]}`);
        }
        const triggerCascada = cascadeParts.join(', ');
        
        // Disparado Por
        let disparadoPor = "Tráfico";
        if (foundEnt === "Parada" || (foundEnt === "Viaje" && (dstVal === "200" || dstVal === "403"))) {
            disparadoPor = "Conductor";
        } else if (triggerCascada && (dstVal === "303" || dstVal === "304" || dstVal === "305" || dstVal === "306" || dstVal === "401")) {
            disparadoPor = "Sistema";
        }
        
        const srcName = srcVal !== "NULL" ? (stateNames[foundEnt][parseInt(srcVal)] || `ESTADO_${srcVal}`) : "INICIO";
        const dstName = dstVal !== "NULL" ? (stateNames[foundEnt][parseInt(dstVal)] || `ESTADO_${dstVal}`) : "FIN";
        
        transitions.push({
            entidad: foundEnt,
            estadoOrigen: srcVal !== "NULL" ? parseInt(srcVal) : "",
            estadoDestino: dstVal !== "NULL" ? parseInt(dstVal) : "",
            requiereFoto: reqFoto,
            requiereFirma: reqFirma,
            requiereMotivo: reqMotivo,
            validarGeocerca: valGeo,
            idEstadoParadaVisita: idVisita,
            triggerCascada: triggerCascada,
            disparadoPor: disparadoPor,
            nota: `${srcName} -> ${dstName} (ID TRANSICION: ${transId})`,
            activo: "TRUE"
        });
    }
    
    // Sort
    transitions.sort((a, b) => {
        const entA = entityOrder.indexOf(a.entidad);
        const entB = entityOrder.indexOf(b.entidad);
        if (entA !== entB) return entA - entB;
        if (a.estadoOrigen !== b.estadoOrigen) return a.estadoOrigen - b.estadoOrigen;
        return a.estadoDestino - b.estadoDestino;
    });
    
    return transitions;
}

async function run() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    console.log("Loaded workbook.");
    
    // 1. Fill Estados
    const statesSheet = workbook.getWorksheet("Estados");
    if (statesSheet) {
        console.log(`Clearing "Estados" sheet...`);
        // Remove rows from row 2 onwards
        const rowCount = statesSheet.rowCount;
        if (rowCount > 1) {
            statesSheet.spliceRows(2, rowCount - 1);
        }
        
        const statesData = getStatesList();
        console.log(`Writing ${statesData.length} states to "Estados"...`);
        statesData.forEach(s => {
            statesSheet.addRow([s.entidad, s.codigo, s.nombre, s.momento, s.descripcion, s.activo]);
        });
    }
    
    // 2. Load transitions data
    const intlTransitions = getTransitionsList(sqlIntlPath, 1);
    const intermTransitions = getTransitionsList(sqlIntermPath, 1);
    
    // 3. Rename "TransicionesTSP" to "TransicionesTSP_Internacional"
    let tspSheet = workbook.getWorksheet("TransicionesTSP");
    if (tspSheet) {
        tspSheet.name = "TransicionesTSP_Internacional";
        console.log(`Renamed "TransicionesTSP" to "TransicionesTSP_Internacional".`);
    } else {
        tspSheet = workbook.getWorksheet("TransicionesTSP_Internacional");
    }
    
    if (tspSheet) {
        console.log(`Populating "TransicionesTSP_Internacional"...`);
        const rowCount = tspSheet.rowCount;
        if (rowCount > 1) {
            tspSheet.spliceRows(2, rowCount - 1);
        }
        
        intlTransitions.forEach(t => {
            tspSheet.addRow([
                t.entidad, t.estadoOrigen, t.estadoDestino, t.requiereFoto,
                t.requiereFirma, t.requiereMotivo, t.validarGeocerca,
                t.idEstadoParadaVisita, t.triggerCascada, t.disparadoPor,
                t.nota, t.activo
            ]);
        });
    }
    
    // 4. Create duplicate sheet "TransicionesTSP_Intermodal"
    // ExcelJS doesn't have a direct "duplicateSheet" method, but we can add a new sheet
    // and copy columns/rows or copy properties. Since we want it exactly the same:
    console.log(`Creating and populating "TransicionesTSP_Intermodal"...`);
    
    // Remove if it already exists
    const existingInterm = workbook.getWorksheet("TransicionesTSP_Intermodal");
    if (existingInterm) {
        workbook.removeWorksheet(existingInterm.id);
    }
    
    const intermSheet = workbook.addWorksheet("TransicionesTSP_Intermodal");
    // Copy headers from tspSheet
    const headerRow = tspSheet.getRow(1);
    const headerVals = [];
    headerRow.eachCell({ includeEmpty: true }, (c) => headerVals.push(c.value));
    intermSheet.addRow(headerVals);
    
    // Populate
    intermTransitions.forEach(t => {
        intermSheet.addRow([
            t.entidad, t.estadoOrigen, t.estadoDestino, t.requiereFoto,
            t.requiereFirma, t.requiereMotivo, t.validarGeocerca,
            t.idEstadoParadaVisita, t.triggerCascada, t.disparadoPor,
            t.nota, t.activo
        ]);
    });
    
    // Format columns width and styles if needed (optional but good practice)
    intermSheet.columns = tspSheet.columns.map(c => ({ header: c.header, key: c.key, width: c.width }));

    // Save
    await workbook.xlsx.writeFile(excelPath);
    console.log("Saved updated workbook back to scratch.");
}

run().catch(console.error);
