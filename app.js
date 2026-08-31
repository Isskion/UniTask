/**
 * UniTask UNIGIS TMS Discovery Web Application Logic
 * Interactive Wizard, Section State, Smart Pre-fills & Printable DDS Document Generator
 */

document.addEventListener("DOMContentLoaded", () => {
  // Estado de la Aplicación
  const state = {
    activeProject: {
      id: "proj_demo_2026",
      clientName: "Cliente Europastry Demo 2026",
      projectLead: "Consultor UNIGIS",
      lastUpdated: new Date().toISOString(),
      progressPercent: 0,
      answers: {},
      tablesData: {}
    },
    currentSectionIndex: 0,
    viewMode: "matrix" // 'matrix', 'wizard', 'dds_print'
  };

  // Referencias DOM
  const dom = {
    sidebarMenu: document.getElementById("sidebarMenu"),
    currentSectionContainer: document.getElementById("currentSectionContainer"),
    projectProgressFill: document.getElementById("projectProgressFill"),
    projectProgressText: document.getElementById("projectProgressText"),
    projectSelector: document.getElementById("projectSelector"),
    btnNewProject: document.getElementById("btnNewProject"),
    btnSaveCloud: document.getElementById("btnSaveCloud"),
    btnExportDDS: document.getElementById("btnExportDDS"),
    btnExportWBS: document.getElementById("btnExportWBS"),
    btnExportJSON: document.getElementById("btnExportJSON"),
    templateSelector: document.getElementById("templateSelector"),
    btnApplyTemplate: document.getElementById("btnApplyTemplate"),
    btnModeMatrix: document.getElementById("btnModeMatrix"),
    btnModeWizard: document.getElementById("btnModeWizard"),
    btnModeDDS: document.getElementById("btnModeDDS"),
    wizardControls: document.getElementById("wizardControls"),
    btnPrevSection: document.getElementById("btnPrevSection"),
    btnNextSection: document.getElementById("btnNextSection"),
    ddsPrintView: document.getElementById("ddsPrintView")
  };

  // Inicialización
  function init() {
    loadSavedProjectsList();
    loadActiveProject();
    renderSidebar();
    renderCurrentSection();
    attachEventListeners();
  }

  // Carga lista de proyectos
  function loadSavedProjectsList() {
    const list = window.UniTaskCloud.listProjects();
    dom.projectSelector.innerHTML = "";

    if (list.length === 0) {
      // Crear proyecto inicial por defecto
      window.UniTaskCloud.saveProject(state.activeProject);
      list.push(state.activeProject);
    }

    list.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.clientName} (${p.progressPercent || 0}%)`;
      dom.projectSelector.appendChild(opt);
    });
  }

  // Carga proyecto activo
  function loadActiveProject() {
    const selectedId = dom.projectSelector.value || "proj_demo_2026";
    const proj = window.UniTaskCloud.getProject(selectedId);
    if (proj) {
      state.activeProject = proj;
    }
    calculateProgress();
  }

  // Guarda estado del proyecto
  function saveActiveProject() {
    state.activeProject.lastUpdated = new Date().toISOString();
    calculateProgress();
    window.UniTaskCloud.saveProject(state.activeProject);
    updateProgressUI();
  }

  // Calcula el progreso global del relevamiento (%)
  function calculateProgress() {
    let totalItems = 0;
    let completedItems = 0;

    SECTIONS_DATA.forEach(sec => {
      if (sec.questions) {
        sec.questions.forEach(q => {
          totalItems++;
          if (state.activeProject.answers[q.id]) completedItems++;
        });
      }
    });

    const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    state.activeProject.progressPercent = pct;
  }

  // Actualiza barra de progreso en la cabecera
  function updateProgressUI() {
    dom.projectProgressFill.style.width = `${state.activeProject.progressPercent}%`;
    dom.projectProgressText.textContent = `${state.activeProject.progressPercent}% Completado`;
  }

  // Renderiza menú lateral con las 22 secciones
  function renderSidebar() {
    dom.sidebarMenu.innerHTML = "";
    SECTIONS_DATA.forEach((sec, idx) => {
      const li = document.createElement("li");
      li.className = `sidebar-item ${idx === state.currentSectionIndex ? "active" : ""}`;
      
      // Estado de la sección
      let statusBadge = `<span class="sidebar-status-badge badge-pending">Pendiente</span>`;
      const sectionAnsweredCount = sec.questions ? sec.questions.filter(q => state.activeProject.answers[q.id]).length : 0;
      if (sectionAnsweredCount === sec.questions?.length && sec.questions.length > 0) {
        statusBadge = `<span class="sidebar-status-badge badge-complete">Completo</span>`;
      } else if (sectionAnsweredCount > 0) {
        statusBadge = `<span class="sidebar-status-badge badge-progress">En Progreso</span>`;
      }

      li.innerHTML = `
        <div class="sidebar-item-info">
          <div class="sidebar-item-icon"><i class="fas ${sec.icon || 'fa-folder'}"></i></div>
          <div>
            <div style="font-weight: 600;">${sec.code}. ${sec.title}</div>
          </div>
        </div>
        ${statusBadge}
      `;

      li.addEventListener("click", () => {
        state.currentSectionIndex = idx;
        renderSidebar();
        renderCurrentSection();
      });

      dom.sidebarMenu.appendChild(li);
    });

    updateProgressUI();
  }

  // Renderiza la sección activa
  function renderCurrentSection() {
    if (state.viewMode === "dds_print") {
      renderDDSPrintView();
      return;
    }

    dom.ddsPrintView.style.display = "none";
    dom.currentSectionContainer.style.display = "block";

    const sec = SECTIONS_DATA[state.currentSectionIndex];
    let html = `
      <div class="section-card-header">
        <div class="section-code-tag">Sección ${sec.code} de 22</div>
        <h2>${sec.title}</h2>
        <p>${sec.desc}</p>
      </div>
    `;

    // Renderiza preguntas interactivas
    if (sec.questions && sec.questions.length > 0) {
      html += `<div class="questions-grid">`;
      sec.questions.forEach(q => {
        const val = state.activeProject.answers[q.id] || "";
        html += `<div class="question-box">
          <label class="question-label">${q.label}</label>`;

        if (q.type === "chip") {
          html += `<div class="chips-group">`;
          q.options.forEach(opt => {
            const selected = val === opt ? "selected" : "";
            html += `<span class="chip-item ${selected}" data-qid="${q.id}" data-val="${opt}">${opt}</span>`;
          });
          html += `</div>`;
        } else {
          html += `<input type="${q.type || 'text'}" class="input-text text-q-input" data-qid="${q.id}" value="${val}" placeholder="${q.placeholder || ''}" />`;
        }

        html += `</div>`;
      });
      html += `</div>`;
    }

    // Renderiza las 67 tablas interactivas
    if (sec.tables && sec.tables.length > 0) {
      sec.tables.forEach(tbl => {
        const tableRowsData = state.activeProject.tablesData[tbl.id] || tbl.rows;
        
        html += `
          <div class="table-card">
            <div class="table-header-flex">
              <h3>${tbl.title}</h3>
              <button class="btn-secondary-dark btn-add-row" data-tid="${tbl.id}"><i class="fas fa-plus"></i> Añadir Fila</button>
            </div>
            <div style="overflow-x: auto;">
              <table class="unigis-table" data-tid="${tbl.id}">
                <thead>
                  <tr>
                    ${tbl.columns.map(c => `<th>${c.label}</th>`).join("")}
                    <th style="width: 50px;">Acción</th>
                  </tr>
                </thead>
                <tbody>
        `;

        tableRowsData.forEach((row, rIdx) => {
          const isGap = row.cobertura === "No (Desarrollo)" || row.cobertura === "Parcial" || row.aplica === "No";
          html += `<tr class="${isGap ? 'gap-row' : ''}">`;

          tbl.columns.forEach(col => {
            const cellVal = row[col.key] || "";
            if (col.type === "readonly") {
              html += `<td><strong>${cellVal}</strong></td>`;
            } else if (col.type === "chip") {
              html += `<td><div class="chips-group">`;
              col.options.forEach(opt => {
                const selected = cellVal === opt ? "selected" : "";
                html += `<span class="chip-item ${selected} table-chip" data-tid="${tbl.id}" data-ridx="${rIdx}" data-col="${col.key}" data-val="${opt}">${opt}</span>`;
              });
              html += `</div></td>`;
            } else {
              html += `<td><input type="text" class="table-cell-input" data-tid="${tbl.id}" data-ridx="${rIdx}" data-col="${col.key}" value="${cellVal}" /></td>`;
            }
          });

          html += `<td><button class="btn-danger-icon btn-del-row" data-tid="${tbl.id}" data-ridx="${rIdx}"><i class="fas fa-trash-alt"></i></button></td>`;
          html += `</tr>`;
        });

        html += `
                </tbody>
              </table>
            </div>
          </div>
        `;
      });
    }

    dom.currentSectionContainer.innerHTML = html;
    attachSectionEvents();
  }

  // Eventos dentro de la sección renderizada
  function attachSectionEvents() {
    // Click en Chips de Preguntas
    document.querySelectorAll(".chip-item:not(.table-chip)").forEach(chip => {
      chip.addEventListener("click", (e) => {
        const qid = e.target.getAttribute("data-qid");
        const val = e.target.getAttribute("data-val");
        state.activeProject.answers[qid] = val;
        saveActiveProject();
        renderSidebar();
        renderCurrentSection();
      });
    });

    // Input en preguntas de texto
    document.querySelectorAll(".text-q-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const qid = e.target.getAttribute("data-qid");
        state.activeProject.answers[qid] = e.target.value;
        saveActiveProject();
      });
    });

    // Click en Chips de Tablas
    document.querySelectorAll(".table-chip").forEach(chip => {
      chip.addEventListener("click", (e) => {
        const tid = e.target.getAttribute("data-tid");
        const rIdx = parseInt(e.target.getAttribute("data-ridx"));
        const col = e.target.getAttribute("data-col");
        const val = e.target.getAttribute("data-val");

        ensureTableData(tid);
        state.activeProject.tablesData[tid][rIdx][col] = val;
        saveActiveProject();
        renderCurrentSection();
      });
    });

    // Input en Celdas de Tablas
    document.querySelectorAll(".table-cell-input").forEach(input => {
      input.addEventListener("input", (e) => {
        const tid = e.target.getAttribute("data-tid");
        const rIdx = parseInt(e.target.getAttribute("data-ridx"));
        const col = e.target.getAttribute("data-col");
        const val = e.target.value;

        ensureTableData(tid);
        state.activeProject.tablesData[tid][rIdx][col] = val;
        saveActiveProject();
      });
    });

    // Añadir fila a tabla
    document.querySelectorAll(".btn-add-row").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tid = e.currentTarget.getAttribute("data-tid");
        ensureTableData(tid);

        const sec = SECTIONS_DATA[state.currentSectionIndex];
        const tblDef = sec.tables.find(t => t.id === tid);
        const newRow = {};
        tblDef.columns.forEach(c => {
          newRow[c.key] = c.options ? c.options[0] : "";
        });

        state.activeProject.tablesData[tid].push(newRow);
        saveActiveProject();
        renderCurrentSection();
      });
    });

    // Eliminar fila de tabla
    document.querySelectorAll(".btn-del-row").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tid = e.currentTarget.getAttribute("data-tid");
        const rIdx = parseInt(e.currentTarget.getAttribute("data-ridx"));
        ensureTableData(tid);
        state.activeProject.tablesData[tid].splice(rIdx, 1);
        saveActiveProject();
        renderCurrentSection();
      });
    });
  }

  function ensureTableData(tid) {
    if (!state.activeProject.tablesData[tid]) {
      const sec = SECTIONS_DATA[state.currentSectionIndex];
      const tblDef = sec.tables.find(t => t.id === tid);
      state.activeProject.tablesData[tid] = JSON.parse(JSON.stringify(tblDef.rows));
    }
  }

  // Genera Vista Oficial del Documento DDS para Impresión/PDF
  function renderDDSPrintView() {
    dom.currentSectionContainer.style.display = "none";
    dom.ddsPrintView.style.display = "block";

    let html = `
      <div class="dds-cover-page">
        <div style="margin-bottom: 20px;"><span class="brand-logo-badge" style="font-size: 20px;">UNIGIS TMS</span></div>
        <div class="dds-cover-title">Guía de Descubrimiento y Consultoría</div>
        <div class="dds-cover-subtitle">DOCUMENTO DE DISEÑO DE SOLUCIÓN (DDS)</div>
        <p style="margin-top: 30px; font-weight: 600;">PROYECTO: ${state.activeProject.clientName}</p>
        <p style="color: #6B7280; font-size: 13px;">Fecha de Generación: ${new Date().toLocaleDateString()}</p>
      </div>

      <div class="dds-content">
        <h2>ÍNDICE DE SECCIONES RELEVADAS</h2>
        <ul style="margin: 20px 0 40px 20px; line-height: 2;">
          ${SECTIONS_DATA.map(s => `<li><strong>Sección ${s.code}:</strong> ${s.title}</li>`).join("")}
        </ul>
    `;

    SECTIONS_DATA.forEach(sec => {
      html += `
        <div style="margin-bottom: 40px; page-break-inside: avoid;">
          <h3 style="border-bottom: 2px solid var(--unigis-red); padding-bottom: 6px; color: var(--unigis-black);">${sec.code}. ${sec.title}</h3>
      `;

      if (sec.questions && sec.questions.length > 0) {
        html += `<table class="unigis-table" style="margin: 15px 0;"><tbody>`;
        sec.questions.forEach(q => {
          const ans = state.activeProject.answers[q.id] || "No especificado";
          html += `<tr><td style="width: 40%; font-weight: 600;">${q.label}</td><td>${ans}</td></tr>`;
        });
        html += `</tbody></table>`;
      }

      html += `</div>`;
    });

    html += `</div>`;
    dom.ddsPrintView.innerHTML = html;
  }

  // Event Listeners Principales
  function attachEventListeners() {
    // Cambio de Proyecto
    dom.projectSelector.addEventListener("change", () => {
      loadActiveProject();
      renderSidebar();
      renderCurrentSection();
    });

    // Nuevo Proyecto
    dom.btnNewProject.addEventListener("click", () => {
      const clientName = prompt("Ingrese el Nombre del Cliente / Proyecto:", "Nuevo Cliente UNIGIS 2026");
      if (clientName) {
        const newProj = {
          id: `proj_${Date.now()}`,
          clientName: clientName,
          lastUpdated: new Date().toISOString(),
          progressPercent: 0,
          answers: {},
          tablesData: {}
        };
        state.activeProject = newProj;
        saveActiveProject();
        loadSavedProjectsList();
        renderSidebar();
        renderCurrentSection();
      }
    });

    // Guardar en Nube
    dom.btnSaveCloud.addEventListener("click", () => {
      saveActiveProject();
      alert("✅ Proyecto guardado exitosamente en Firestore / LocalStorage.");
    });

    // Aplicar Plantilla Inteligente (Smart Pre-fill)
    dom.btnApplyTemplate.addEventListener("click", () => {
      const templateKey = dom.templateSelector.value;
      if (INDUSTRY_TEMPLATES[templateKey]) {
        const tmpl = INDUSTRY_TEMPLATES[templateKey];
        if (confirm(`¿Deseas precargar las respuestas y módulos estándar para "${tmpl.name}"?`)) {
          state.activeProject.answers["p1_2"] = tmpl.name;
          state.activeProject.answers["p2_1"] = tmpl.sector;

          saveActiveProject();
          renderSidebar();
          renderCurrentSection();
          alert(`⚡ Plantilla "${tmpl.name}" precargada con éxito.`);
        }
      }
    });

    // Modos de Vista
    dom.btnModeMatrix.addEventListener("click", () => {
      state.viewMode = "matrix";
      dom.btnModeMatrix.classList.add("active");
      dom.btnModeWizard.classList.remove("active");
      dom.btnModeDDS.classList.remove("active");
      dom.wizardControls.style.display = "none";
      renderCurrentSection();
    });

    dom.btnModeWizard.addEventListener("click", () => {
      state.viewMode = "wizard";
      dom.btnModeWizard.classList.add("active");
      dom.btnModeMatrix.classList.remove("active");
      dom.btnModeDDS.classList.remove("active");
      dom.wizardControls.style.display = "flex";
      renderCurrentSection();
    });

    dom.btnModeDDS.addEventListener("click", () => {
      state.viewMode = "dds_print";
      dom.btnModeDDS.classList.add("active");
      dom.btnModeMatrix.classList.remove("active");
      dom.btnModeWizard.classList.remove("active");
      renderCurrentSection();
    });

    // Botones Anterior / Siguiente Wizard
    dom.btnPrevSection.addEventListener("click", () => {
      if (state.currentSectionIndex > 0) {
        state.currentSectionIndex--;
        renderSidebar();
        renderCurrentSection();
      }
    });

    dom.btnNextSection.addEventListener("click", () => {
      if (state.currentSectionIndex < SECTIONS_DATA.length - 1) {
        state.currentSectionIndex++;
        renderSidebar();
        renderCurrentSection();
      }
    });

    // Atajos de teclado para Wizard (Ctrl + Flechas)
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "ArrowRight") {
        dom.btnNextSection.click();
      } else if (e.ctrlKey && e.key === "ArrowLeft") {
        dom.btnPrevSection.click();
      }
    });

    // Exportar Impresión PDF / Documento
    dom.btnExportDDS.addEventListener("click", () => {
      state.viewMode = "dds_print";
      renderDDSPrintView();
      window.print();
    });

    // Exportar JSON
    dom.btnExportJSON.addEventListener("click", () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.activeProject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Relevamiento_${state.activeProject.clientName.replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

    // Exportar WBS (Excel / CSV Independiente de DDS)
    if (dom.btnExportWBS) {
      dom.btnExportWBS.addEventListener("click", () => {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "Fase de Proyecto;Descripción;Entregables Clave;Duración Estimada;Responsable;Requisito DDS\n";

        const sec21 = SECTIONS_DATA.find(s => s.id === "sec-21");
        const tbl65Data = (state.activeProject.tablesData && state.activeProject.tablesData["t65"]) 
          || (sec21 && sec21.tables && sec21.tables[0] ? sec21.tables[0].rows : []);

        const isDdsRequired = state.activeProject.answers["p21_2"] || "No Obligatorio (Solo WBS Excel)";

        tbl65Data.forEach(r => {
          const line = `"${r.fase || ''}";"${r.desc || ''}";"${r.entregables || ''}";"${r.duracion || ''}";"${r.resp || ''}";"${isDdsRequired}"`;
          csvContent += line + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `WBS_Proyecto_${state.activeProject.clientName.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        alert("📊 Estructura WBS (Excel) exportada exitosamente. El DDS es un documento opcional.");
      });
    }
  }

  // Arrancar aplicación
  init();
});
