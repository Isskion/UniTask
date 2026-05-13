BEGIN TRAN;

-- 1. Declarar la variable para la Consulta SQL Optimizada (Sargable)
DECLARE @NuevoSQL NVARCHAR(MAX) = N'-- 1. CONFIGURACIÓN DE OFFSET Y FECHAS
DECLARE @OffsetMin INT;

SET @OffsetMin = DATEDIFF(
    MINUTE, 
    GETUTCDATE(), 
    CONVERT(DATETIME2(0), GETUTCDATE(), 126) AT TIME ZONE ''CENTRAL EUROPEAN STANDARD TIME''
);

DECLARE @Inicio DATETIME;
DECLARE @Fin DATETIME;

SET @Inicio = DATEADD(MINUTE, @OffsetMin, ISNULL(TRY_CONVERT(DATETIME, ''!!FECHA_DESDE!!'', 103), ''2000-01-01''));
SET @Fin    = DATEADD(MINUTE, @OffsetMin + 1439, ISNULL(TRY_CONVERT(DATETIME, ''!!FECHA_HASTA!!'', 103), ''2099-12-31''));

SELECT 
    ''''                                       AS [Apuntado por],
    Deposito.RefDepositoExterno            AS [DC],
    Viaje.Descripcion                      AS [No. Ruta],
    Cliente.NombreFantasia                 AS [Business],
    DomicilioOrden.RefDomicilioExterno     AS [No.],
    Parada.Descripcion                     AS [Restaurante],
    Vehiculo.Dominio                       AS [Camion],
    ISNULL(VH.Dominio, '''')                 AS [Vehiculo Secundario],
    ISNULL(Conductor.ReferenciaExterna, '''') AS [Driver],
    CONVERT(VARCHAR(10), DATEADD(MINUTE, -(@OffsetMin), COALESCE(PD.InicioVisitaRealHAVI, AL.FechaHoraEvento)), 103) AS [Fecha],
    DATEPART(WEEK, DATEADD(MINUTE, -(@OffsetMin), COALESCE(PD.InicioVisitaRealHAVI, AL.FechaHoraEvento))) AS [Semana],
    FORMAT(DATEADD(MINUTE, -(@OffsetMin), Parada.InicioVisitaPlanificado), ''HH:mm:ss'') AS [Horas Previstas],
    ISNULL(FORMAT(DATEADD(MINUTE, -(@OffsetMin), PD.InicioVisitaRealHAVI), ''HH:mm:ss''), ''Sin Dato'') AS [Hora HAVI],
    ISNULL(DATEDIFF(MINUTE, Parada.InicioVisitaPlanificado, PD.InicioVisitaRealHAVI), 0) AS [Retraso HAVI],
    ISNULL(FORMAT(DATEADD(MINUTE, -(@OffsetMin), AL.FechaHoraEvento), ''HH:mm:ss''), ''Sin Dato'') AS [Hora UNIGIS],
    ISNULL(DATEDIFF(MINUTE, Parada.InicioVisitaPlanificado, AL.FechaHoraEvento), 0) AS [Retraso UNIGIS],
    CASE 
        WHEN PD.InicioVisitaRealHAVI = Parada.InicioVisitaPlanificado AND AL.FechaHoraEvento IS NOT NULL 
            THEN DATEDIFF(MINUTE, Parada.InicioVisitaPlanificado, AL.FechaHoraEvento)
        WHEN PD.InicioVisitaRealHAVI = Parada.InicioVisitaPlanificado AND ES.IdEncuestaSolucion IS NOT NULL 
            THEN NULL
        ELSE ISNULL(DATEDIFF(MINUTE, Parada.InicioVisitaPlanificado, COALESCE(PD.InicioVisitaRealHAVI, AL.FechaHoraEvento)), 0) 
    END AS [Retraso Final],
    ISNULL(SUBSTRING((
        SELECT '' | '' + ISNULL(r2.Respuesta, '''') 
        FROM EncuestaSolucion es2 WITH (NOLOCK) 
        INNER JOIN EncuestaSolucionRespuesta r2 WITH (NOLOCK) ON r2.IdEncuestaSolucion = es2.IdEncuestaSolucion 
        WHERE es2.IdParada = Parada.IdParada AND es2.IdEncuesta = 3 
        FOR XML PATH(''''), TYPE).value(''.'', ''NVARCHAR(MAX)''), 
    4, 1000), ''Sin informe'') AS [MOTIVO],
    '''' AS [COMENTARIOS], '''' AS [AVISO], '''' AS [QUIEN AVISA], '''' AS [A QUIEN AVISA], '''' AS [ACCIONES],
    CASE WHEN Parada.IdCliente IN (2, 6, 14) THEN 30 ELSE 45 END AS [Max_SLA],
    Parada.IdParada AS [UID]
FROM Viaje WITH (NOLOCK)
INNER JOIN Jornada WITH (NOLOCK) ON Jornada.IdJornada = Viaje.IdJornada
INNER JOIN Parada WITH (NOLOCK) ON Parada.IdViaje = Viaje.IdViaje
INNER JOIN Cliente WITH (NOLOCK) ON Cliente.IdCliente = Parada.IdCliente
INNER JOIN DomicilioOrden WITH (NOLOCK) ON Parada.IdDomicilioOrden = DomicilioOrden.IdDomicilioOrden
INNER JOIN Conductor WITH (NOLOCK) ON Conductor.IdConductor = Viaje.IdConductor
INNER JOIN Vehiculo WITH (NOLOCK) ON Viaje.IdVehiculo = Vehiculo.IdVehiculo
LEFT JOIN Vehiculo VH WITH (NOLOCK) ON Viaje.idVehiculoSecundario = VH.IdVehiculo
INNER JOIN Deposito WITH (NOLOCK) ON Deposito.IdDeposito = Viaje.IdDepositoSalida
LEFT JOIN Parada_DYN PD WITH (NOLOCK) ON PD.IdParada = Parada.IdParada
LEFT JOIN Alarma AL WITH (NOLOCK) ON AL.IdParada = Parada.IdParada AND AL.IdTipoAlarma = 4
LEFT JOIN EncuestaSolucion ES WITH (NOLOCK) ON ES.IdParada = Parada.IdParada AND ES.IdEncuesta = 3
WHERE Jornada.Eliminado = 0
  AND Jornada.IdOperacion IN (!!ID_OPERACION!!)
  AND Vehiculo.IdTipoVehiculo NOT IN (14, 15, 16, 17, 18, 19, 20, 21, 22, 23)
  AND Jornada.IdJornada IN (!!ID_JORNADA!!)

  -- LÓGICA SARGABLE: Descomponemos el COALESCE para permitir Index Seeks
  AND (
      -- 1. Si HAVI tiene dato y llegó tarde
      (PD.InicioVisitaRealHAVI > DATEADD(MINUTE, 15, Parada.InicioVisitaPlanificado))

      -- 2. O si HAVI no tiene dato, confiamos en la Alarma de UNIGIS
      OR (PD.InicioVisitaRealHAVI IS NULL AND AL.FechaHoraEvento > DATEADD(MINUTE, 15, Parada.InicioVisitaPlanificado))

      -- 3. O si el operador reportó incidencia
      OR (ES.IdEncuestaSolucion IS NOT NULL)
  );';

-- 2. Declarar el Custom Javascript (ES5 con las columnas de Grid habilitadas)
DECLARE @NuevoJS NVARCHAR(MAX) = N'(function() {
    if (!rp || !rp.data || rp.data.length <= 1) {
        div.html(''<div style="padding:20px;text-align:center;color:#64748b;font-family:sans-serif;">Dashboard Vacío: No se detectan desvíos.</div>'');
        return;
    }

    const parseNum = val => isNaN(Number(val)) || val === null ? 0 : Number(val);
    let totalDelay = 0;
    let reported = 0;
    const businessData = {};

    const rows = rp.data.slice(1).map((r, index) => {
        const retFinal = parseNum(r[16]);
        const motivo = r[17] || "Sin informe";
        const business = r[3] || "Otros";

        totalDelay += retFinal;
        if (motivo !== "Sin informe") reported++;

        if (!businessData[business]) businessData[business] = { name: business, count: 0, totalRet: 0, maxRet: 0 };
        businessData[business].count++;
        businessData[business].totalRet += retFinal;
        if (retFinal > businessData[business].maxRet) businessData[business].maxRet = retFinal;

        return {
            id: index, cl: business, ruta: r[2], rest: r[5], cam: r[6], dr: r[8] || "--",
            hPrev: r[11], hHavi: r[12], hUnigis: r[14], retFinal: retFinal, mot: motivo,
            com: r[18] || "", avi: r[19] || "", qAvi: r[20] || "", aqAvi: r[21] || "", acc: r[22] || "",
            maxSla: parseNum(r[23]), uid: r[24] || "",
            searchStr: r.join(" ").toLowerCase().replace(/[''"]/g, "")
        };
    });

    const businessArray = Object.values(businessData).sort((a, b) => b.totalRet - a.totalRet);
    const globalMaxDelay = Math.max(...businessArray.map(b => b.maxRet), 1);
    const repPerc = rows.length > 0 ? Math.round((reported / rows.length) * 100) : 0;

    const styles = ''<style>.db-container{display:flex;flex-direction:column;gap:20px;background:#f8fafc;font-family:"Segoe UI",sans-serif;padding:20px;box-sizing:border-box}.db-card{background:#ffffff;padding:20px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #e2e8f0}.kpi-row{display:flex;gap:15px;margin-bottom:20px}.kpi-box{flex:1;border-left:4px solid #3b82f6;padding:15px;background:#f8fafc;border-radius:4px}.kpi-label{font-size:11px;color:#64748b;font-weight:bold;text-transform:uppercase;margin-bottom:5px}.kpi-val{font-size:24px;font-weight:bold;color:#0f172a}.chart-title{font-size:14px;font-weight:600;color:#334155;margin-bottom:15px;padding-bottom:10px;border-bottom:1px solid #e2e8f0}.chart-row{display:flex;align-items:center;margin-bottom:12px;cursor:pointer;transition:opacity 0.2s;padding:5px;border-radius:4px}.chart-row:hover{background:#f1f5f9}.chart-row.active{background:#e0f2fe;outline:1px solid #bae6fd}.chart-label{width:60px;font-weight:bold;font-size:12px;color:#475569}.chart-bar-bg{flex:1;background:#e2e8f0;height:12px;border-radius:6px;margin:0 15px;overflow:hidden}.chart-bar-fill{height:100%;border-radius:6px;background:#3b82f6;transition:width 0.5s ease}.chart-stats{width:220px;font-size:11px;color:#64748b;text-align:right}.search-box{width:100%;padding:10px 15px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;margin-bottom:15px;box-sizing:border-box}.ux-table{width:100%;border-collapse:collapse;text-align:left;font-size:12px;white-space:nowrap}.ux-table th{background:#f1f5f9;padding:12px 10px;border:1px solid #cbd5e1;color:#475569;position:sticky;top:0}.ux-table td{padding:10px;border:1px solid #e2e8f0;color:#334155}.ux-table tr:hover{background:#f8fafc}.badge{padding:4px 8px;border-radius:12px;font-weight:bold;font-size:11px}.badge-red{background:#fee2e2;color:#ef4444}.badge-orange{background:#ffedd5;color:#f97316}.badge-gray{background:#f1f5f9;color:#64748b}</style>'';

    const getDelayBadge = (delay, maxSla) => {
        if (delay === 0) return ''<span class="badge badge-gray">0 min</span>'';
        if (delay >= maxSla) return ''<span class="badge badge-red">'' + delay + '' min</span>'';
        return ''<span class="badge badge-orange">'' + delay + '' min</span>'';
    };

    div.empty().css({ padding: 0 }).append(styles);

    const kpiColor = repPerc < 60 ? ''#ef4444'' : ''#10b981'';

    const layoutHtml = ''<div class="db-container">'' +
        ''<div class="kpi-row">'' +
            ''<div class="kpi-box" style="border-color:#0f172a;"><div class="kpi-label">Total Registros</div><div class="kpi-val">'' + rows.length + ''</div></div>'' +
            ''<div class="kpi-box" style="border-color:'' + kpiColor + '';"><div class="kpi-label">Incidencias Justificadas</div><div class="kpi-val">'' + repPerc + ''%</div></div>'' +
            ''<div class="kpi-box" style="border-color:#f97316;"><div class="kpi-label">Horas de Retraso</div><div class="kpi-val">'' + (totalDelay / 60).toFixed(1) + ''h</div></div>'' +
        ''</div>'' +
        ''<div class="db-card">'' +
            ''<div class="chart-title">📊 Retraso Máximo por Línea de Negocio (Clic para filtrar)</div>'' +
            ''<div id="chart-container"></div>'' +
        ''</div>'' +
        ''<div class="db-card">'' +
            ''<input type="text" id="ux-search" class="search-box" placeholder="🔍 Buscar por restaurante, ruta, matrícula o motivo...">'' +
            ''<div style="max-height:400px;overflow-x:auto;overflow-y:auto;">'' +
                ''<table class="ux-table">'' +
                    ''<thead><tr><th>Línea</th><th>Ruta</th><th>Restaurante</th><th>Camión</th><th>Driver</th><th>Previsto</th><th>H. HAVI</th><th>H. UNIGIS</th><th>Desvío Final</th><th>Motivo</th><th>Comentarios</th><th>Aviso</th><th>Quien Avisa</th><th>A Quien Avisa</th><th>Acciones</th><th>Max SLA</th><th>UID</th></tr></thead>'' +
                    ''<tbody id="ux-table-body"></tbody>'' +
                ''</table>'' +
            ''</div>'' +
        ''</div>'' +
    ''</div>'';

    div.append($(layoutHtml));

    let activeBusinessFilter = null;
    let searchTerm = "";

    const renderChart = () => {
        const container = document.getElementById(''chart-container'');
        container.innerHTML = '''';
        businessArray.forEach(b => {
            const avg = Math.round(b.totalRet / b.count);
            const widthPct = Math.min((b.maxRet / globalMaxDelay) * 100, 100);
            const color = b.maxRet >= 45 ? ''#ef4444'' : (b.maxRet > 0 ? ''#f97316'' : ''#94a3b8'');
            const rowClass = activeBusinessFilter === b.name ? ''chart-row active'' : ''chart-row'';

            const rowHTML = ''<div class="'' + rowClass + ''">'' +
                ''<div class="chart-label">'' + b.name + ''</div>'' +
                ''<div class="chart-bar-bg"><div class="chart-bar-fill" style="width:'' + widthPct + ''%;background-color:'' + color + '';"></div></div>'' +
                ''<div class="chart-stats"><b>Max: '' + b.maxRet + ''m</b> | Prom: '' + avg + ''m | '' + b.count + '' viajes</div>'' +
            ''</div>'';

            const rowEl = $(rowHTML);
            rowEl.on(''click'', () => {
                activeBusinessFilter = activeBusinessFilter === b.name ? null : b.name;
                renderChart();
                renderTable();
            });
            $(container).append(rowEl);
        });
    };

    const renderTable = () => {
        const tbody = document.getElementById(''ux-table-body'');
        tbody.innerHTML = '''';

        const filtered = rows.filter(r => {
            const matchBusiness = activeBusinessFilter ? r.cl === activeBusinessFilter : true;
            const matchSearch = r.searchStr.includes(searchTerm);
            return matchBusiness && matchSearch;
        });

        filtered.forEach(r => {
            const motColor = r.mot === ''Sin informe'' ? ''#ef4444'' : ''#10b981'';
            const trHTML = ''<tr>'' +
                ''<td><b>'' + r.cl + ''</b></td>'' +
                ''<td>'' + r.ruta + ''</td>'' +
                ''<td>'' + r.rest + ''</td>'' +
                ''<td>'' + r.cam + ''</td>'' +
                ''<td>'' + r.dr + ''</td>'' +
                ''<td>'' + r.hPrev + ''</td>'' +
                ''<td style="color:#94a3b8;">'' + r.hHavi + ''</td>'' +
                ''<td style="color:#94a3b8;">'' + r.hUnigis + ''</td>'' +
                ''<td>'' + getDelayBadge(r.retFinal, r.maxSla) + ''</td>'' +
                ''<td style="color:'' + motColor + '';">'' + r.mot + ''</td>'' +
                ''<td>'' + r.com + ''</td>'' +
                ''<td>'' + r.avi + ''</td>'' +
                ''<td>'' + r.qAvi + ''</td>'' +
                ''<td>'' + r.aqAvi + ''</td>'' +
                ''<td>'' + r.acc + ''</td>'' +
                ''<td>'' + r.maxSla + ''</td>'' +
                ''<td style="color:#94a3b8;font-size:10px;">'' + r.uid + ''</td>'' +
            ''</tr>'';
            $(tbody).append(trHTML);
        });
    };

    $(''#ux-search'').on(''keyup'', e => {
        searchTerm = e.target.value.toLowerCase();
        renderTable();
    });

    renderChart();
    renderTable();

})();';

-- 3. Ejecutar el UPDATE en el reporte
UPDATE reporte 
SET consultasql = @NuevoSQL, 
    customjavascript = @NuevoJS 
WHERE idreporte = 76;

-- COMMIT de la transacción
COMMIT TRAN;
