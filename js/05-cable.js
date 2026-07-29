// ============================================================
// 05-cable.js  —  Casos Cable Color
// Parte de la aplicación NOC Tekcom. Se carga en orden desde index.html;
// NO reordenar las etiquetas <script> ni renombrar estos archivos.
// ============================================================

const CABLE_REST_URL = `${SUPABASE_URL}/rest/v1/casos_cablecolor`;
let allCable = [];
let currentCableEditId = null;
let pendingCableDeleteId = null;
let viewingCable = null;
let cableMaterialesActuales = [];

function initCableSelects(){
  const anoSel = document.getElementById('cb_anos');
  let anoOpts = '<option value="">—</option>';
  for(let y=2020;y<=2035;y++) anoOpts += `<option>${y}</option>`;
  anoSel.innerHTML = anoOpts;

  const semSel = document.getElementById('cb_semana');
  let semOpts = '<option value="">—</option>';
  for(let i=1;i<=54;i++) semOpts += `<option>${i}</option>`;
  semSel.innerHTML = semOpts;
}

async function fetchCable(){
  initCableSelects();
  const wrap = document.getElementById('cableTableWrap');
  wrap.innerHTML = '<div class="loading-row"><div class="spinner"></div>Cargando casos…</div>';
  try{
    const res = await fetch(`${CABLE_REST_URL}?select=*&order=created_at.desc`, { headers: sbHeaders });
    if(!res.ok) throw new Error('Error al cargar casos (' + res.status + ')');
    allCable = await res.json();
    if(typeof triggerMapaDraw === 'function') triggerMapaDraw();
    populateCableFiltros();
    renderCableTable();
    const tabActivo = document.querySelector('[data-subtab-cb].active');
    if(tabActivo){
      if(tabActivo.dataset.subtabCb === 'dashboard') initCableDashboard();
      if(tabActivo.dataset.subtabCb === 'materiales') initCableMateriales();
    }
  }catch(err){
    console.error(err);
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div class="empty-title">No se pudo conectar con la base de datos</div>
        <div class="empty-desc">${err.message}. Verifica que la tabla <strong>casos_cablecolor</strong> exista en Supabase.</div>
      </div>`;
    showToast('Error al conectar con Supabase (casos_cablecolor)', 'error');
  }
}

function populateCableFiltros(){
  const fillSelect = (id, defaultLabel, values) => {
    const sel = document.getElementById(id);
    const current = msRestoreOrCurrent(id);
    let unique = [...new Set(values.filter(v => v !== null && v !== undefined && v !== ''))];
    unique.sort();
    sel.innerHTML = `<option value="">${defaultLabel}</option>` +
      unique.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    msSetVal(id, current.filter(v => unique.map(String).includes(v)));
  };
  fillSelect('cableZonaFilter', 'Todas las zonas', allCable.map(c=>c.zona));

  const anoSel = document.getElementById('cableAnoFilter');
  const curAno = msRestoreOrCurrent('cableAnoFilter');
  const anosUnicos = [...new Set(allCable.map(c=>c.anos).filter(v => v !== null && v !== undefined && v !== ''))].sort((a,b)=>a-b);
  anoSel.innerHTML = '<option value="">Todos los años</option>' +
    anosUnicos.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  msSetVal('cableAnoFilter', curAno.filter(v => anosUnicos.map(String).includes(v)));

  updateCableCascadaFiltros('cable');
}

/* ---- Cascada genérica para Cable Color (Año → Mes → Semana/Tipo de Falla) ---- */
function updateCableCascadaFiltros(prefijo){
  const MESES_ORDEN = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const getVal = id => { const el = document.getElementById(id); return el ? msVal(id) : []; };
  const setOpts = (id, defaultLabel, values, sortNum=false) => {
    const sel = document.getElementById(id); if(!sel) return;
    const cur = msRestoreOrCurrent(id);
    let unique = [...new Set(values.filter(v => v !== null && v !== undefined && v !== ''))];
    unique.sort(sortNum ? (a,b)=>a-b : (a,b)=>String(a).localeCompare(String(b)));
    sel.innerHTML = `<option value="">${defaultLabel}</option>` +
      unique.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    msSetVal(id, cur.filter(v => unique.map(String).includes(v)));
  };
  const setMesOpts = (id, values) => {
    const sel = document.getElementById(id); if(!sel) return;
    const cur = msRestoreOrCurrent(id);
    const presentes = [...new Set(values.filter(Boolean))];
    const ordenados = MESES_ORDEN.filter(m => presentes.includes(m));
    sel.innerHTML = '<option value="">Todos los meses</option>' +
      ordenados.map(m=>`<option>${escapeHtml(m)}</option>`).join('');
    msSetVal(id, cur.filter(v => ordenados.includes(v)));
  };

  const anoVal = getVal(`${prefijo}AnoFilter`);
  const mesVal = getVal(`${prefijo}MesFilter`);

  const paso1 = allCable.filter(c => anoVal.length === 0 || anoVal.includes(String(c.anos)));
  setMesOpts(`${prefijo}MesFilter`, paso1.map(c=>c.mes));

  const paso2 = paso1.filter(c => mesVal.length === 0 || mesVal.includes(c.mes));
  if(document.getElementById(`${prefijo}SemanaFilter`)){
    setOpts(`${prefijo}SemanaFilter`, 'Todas las semanas', paso2.map(c=>c.semana), true);
  }
  if(document.getElementById(`${prefijo}ClasificacionFilter`)){
    setOpts(`${prefijo}ClasificacionFilter`, 'Todas', paso2.map(c=>c.tipo_falla));
  }
}

const CABLE_POR_PAGINA = 20;
let cablePaginaActual = 1;

function getCableFiltrados(){
  const searchTerm = document.getElementById('cableSearch').value.trim().toLowerCase();
  const statusFilter = msVal('cableStatusFilter');
  const zonaFilter = msVal('cableZonaFilter');
  const tipoFallaFilter = msVal('cableClasificacionFilter');
  const anoFilter = msVal('cableAnoFilter');
  const mesFilter = msVal('cableMesFilter');
  const semanaFilter = msVal('cableSemanaFilter');

  return allCable.filter(c => {
    const matchesSearch = !searchTerm || [c.descripcion,c.numero,c.ot,c.cuadrilla,c.tipo_falla]
      .some(f => (f||'').toString().toLowerCase().includes(searchTerm));
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(c.status);
    const matchesZona = zonaFilter.length === 0 || zonaFilter.includes(c.zona);
    const matchesTipoFalla = tipoFallaFilter.length === 0 || tipoFallaFilter.includes(c.tipo_falla);
    const matchesAno = anoFilter.length === 0 || anoFilter.includes(String(c.anos));
    const matchesMes = mesFilter.length === 0 || mesFilter.includes(c.mes);
    const matchesSemana = semanaFilter.length === 0 || semanaFilter.includes(String(c.semana));
    return matchesSearch && matchesStatus && matchesZona && matchesTipoFalla && matchesAno && matchesMes && matchesSemana;
  });
}

function renderCableTable(resetPagina = true){
  const wrap = document.getElementById('cableTableWrap');
  if(resetPagina) cablePaginaActual = 1;

  let rows = getCableFiltrados();

  if(rows.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <div class="empty-title">${allCable.length === 0 ? 'Aún no hay casos registrados' : 'Sin resultados'}</div>
        <div class="empty-desc">${allCable.length === 0 ? 'Agrega el primer caso usando el botón "Agregar Caso".' : 'Prueba con otro término de búsqueda o filtro.'}</div>
      </div>`;
    return;
  }

  const totalPaginas = Math.max(1, Math.ceil(rows.length / CABLE_POR_PAGINA));
  if(cablePaginaActual > totalPaginas) cablePaginaActual = totalPaginas;
  const startIdx = (cablePaginaActual - 1) * CABLE_POR_PAGINA;
  const pageRows = rows.slice(startIdx, startIdx + CABLE_POR_PAGINA);

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Nombre del Técnico</th>
          <th>Zona</th>
          <th>Escalonamiento</th>
          <th>Causa</th>
          <th>Status</th>
          <th>T. Respuesta</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows.map(c => cableRowHtml(c)).join('')}
      </tbody>
    </table>
    <div class="pagination-bar">
      <div class="pagination-info">Mostrando ${startIdx + 1}–${Math.min(startIdx + CABLE_POR_PAGINA, rows.length)} de ${rows.length} casos</div>
      <div class="pagination-controls" id="cablePaginationControls"></div>
    </div>
  `;

  renderCablePaginationControls(totalPaginas);

  wrap.querySelectorAll('[data-cbaction]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.cbaction;
      const caso = allCable.find(c => String(c.id) === String(id));
      if(action === 'view') openCableViewModal(caso);
      if(action === 'edit') openCableFormModal(caso);
      if(action === 'delete') openCableDeleteModal(caso);
    });
  });
}

function renderCablePaginationControls(totalPaginas){
  const wrap = document.getElementById('cablePaginationControls');
  if(!wrap || totalPaginas <= 1) return;

  const pages = [];
  const cur = cablePaginaActual;
  pages.push(1);
  if(cur > 3) pages.push('…');
  for(let p = Math.max(2, cur-1); p <= Math.min(totalPaginas-1, cur+1); p++) pages.push(p);
  if(cur < totalPaginas - 2) pages.push('…');
  if(totalPaginas > 1) pages.push(totalPaginas);

  const btnHtml = (label, page, disabled, active) => `
    <button class="page-btn ${active ? 'active' : ''}" ${disabled ? 'disabled' : ''} data-page="${page}">${label}</button>
  `;

  let html = '';
  html += btnHtml('‹', cur - 1, cur === 1, false);
  pages.forEach(p => {
    if(p === '…'){
      html += `<span class="page-ellipsis">…</span>`;
    } else {
      html += btnHtml(p, p, false, p === cur);
    }
  });
  html += btnHtml('›', cur + 1, cur === totalPaginas, false);

  wrap.innerHTML = html;

  wrap.querySelectorAll('.page-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      cablePaginaActual = parseInt(btn.dataset.page, 10);
      renderCableTable(false);
    });
  });
}

function cableRowHtml(c){
  const statusClass = statusChipClass(c.status);
  return `
    <tr>
      <td>
        <div class="person-name">${escapeHtml(c.descripcion || '—')}</div>
        <div class="person-puesto">${escapeHtml(c.numero || '')}${c.ot ? ' · OT ' + escapeHtml(c.ot) : ''}</div>
      </td>
      <td>${escapeHtml(c.cuadrilla || '—')}</td>
      <td>${escapeHtml(c.zona || '—')}</td>
      <td class="mono">${escapeHtml(plFechaHoraMilitar(c.escalonamiento) || '—')}</td>
      <td>${escapeHtml(c.causa || '—')}</td>
      <td>${c.status ? `<span class="status-chip ${statusClass}">${escapeHtml(c.status)}</span>` : '<span style="color:var(--text-faint);">—</span>'}</td>
      <td>${slaChipHtml(c.tiempo_respuesta, 'cable', c.tipo_falla)}</td>
      <td>
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="icon-btn accent" data-cbaction="view" data-id="${c.id}" title="Ver">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="icon-btn" data-cbaction="edit" data-id="${c.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="icon-btn danger" data-cbaction="delete" data-id="${c.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

document.getElementById('cableSearch').addEventListener('input', () => renderCableTable(true));
document.getElementById('cableStatusFilter').addEventListener('change', () => renderCableTable(true));
document.getElementById('cableZonaFilter').addEventListener('change', () => renderCableTable(true));
document.getElementById('cableClasificacionFilter').addEventListener('change', () => { updateCableCascadaFiltros('cable'); renderCableTable(true); });
document.getElementById('cableAnoFilter').addEventListener('change', () => { updateCableCascadaFiltros('cable'); renderCableTable(true); });
document.getElementById('cableMesFilter').addEventListener('change', () => { updateCableCascadaFiltros('cable'); renderCableTable(true); });
document.getElementById('cableSemanaFilter').addEventListener('change', () => renderCableTable(true));

document.getElementById('btnLimpiarCableListado').addEventListener('click', () => {
  ['cableStatusFilter','cableZonaFilter','cableClasificacionFilter','cableAnoFilter','cableMesFilter','cableSemanaFilter'].forEach(id => msSetVal(id, []));
  document.getElementById('cableSearch').value = '';
  updateCableCascadaFiltros('cable');
  renderCableTable(true);
});

/* ---- Cálculos automáticos de tiempos ---- */
function recalcCableTiempos(){
  const escal = document.getElementById('cb_escalonamiento').value;
  const resol = document.getElementById('cb_resolucion').value;
  const pausaTxt = document.getElementById('cb_pausa').value;

  let afectacionMin = null;
  if(escal && resol){
    const dEscal = new Date(escal);
    const dResol = new Date(resol);
    afectacionMin = (dResol - dEscal) / 60000;
    document.getElementById('cb_tiempo_afectacion').value = minutesToHHMM(afectacionMin);
  } else {
    document.getElementById('cb_tiempo_afectacion').value = '';
  }

  const pausaMin = hhmmToMinutes(pausaTxt);
  if(afectacionMin !== null && pausaMin !== null){
    document.getElementById('cb_tiempo_respuesta').value = minutesToHHMM(afectacionMin - pausaMin);
  } else if(afectacionMin !== null){
    document.getElementById('cb_tiempo_respuesta').value = minutesToHHMM(afectacionMin);
  } else {
    document.getElementById('cb_tiempo_respuesta').value = '';
  }

  // Fecha de Validación (Hyve) = Resolución, y el tiempo se calcula contra la solicitud.
  if(resol) document.getElementById('cb_validacion_hyve').value = resol;
  const sVal = document.getElementById('cb_s_validacion').value;
  const valHyve = document.getElementById('cb_validacion_hyve').value;
  document.getElementById('cb_t_validacion').value = (sVal && valHyve)
    ? minutesToHHMM((new Date(valHyve) - new Date(sVal)) / 60000)
    : '';
}
['cb_escalonamiento','cb_resolucion','cb_pausa','cb_s_validacion'].forEach(id => {
  document.getElementById(id).addEventListener('input', recalcCableTiempos);
});

/* ---- Gestión de materiales dentro del formulario de Cable Color ---- */
function renderCableMaterialList(){
  const wrap = document.getElementById('cb_material_list');
  if(cableMaterialesActuales.length === 0){
    wrap.innerHTML = '<div class="material-empty">Aún no se han agregado materiales a este caso.</div>';
    return;
  }
  wrap.innerHTML = cableMaterialesActuales.map((m, i) => `
    <div class="material-item">
      <div class="material-item-name">${escapeHtml(m.label)}</div>
      <input type="number" min="0" step="1" value="${m.cantidad}" data-cbmat-index="${i}" class="mat-qty-input">
      <button type="button" class="material-item-remove" data-cbmat-remove="${i}" title="Quitar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `).join('');

  wrap.querySelectorAll('.mat-qty-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.cbmatIndex, 10);
      cableMaterialesActuales[idx].cantidad = parseFloat(inp.value) || 0;
    });
  });
  wrap.querySelectorAll('[data-cbmat-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      cableMaterialesActuales.splice(parseInt(btn.dataset.cbmatRemove, 10), 1);
      renderCableMaterialList();
    });
  });
}

const cbMaterialSearch = document.getElementById('cb_material_search');
const cbMaterialResults = document.getElementById('cb_material_results');

function addCableMaterial(col){
  if(cableMaterialesActuales.find(m => m.col === col)){
    showToast('Ese material ya está en la lista', 'error');
    return;
  }
  const entry = MATERIALES_CATALOGO.find(([label, c]) => c === col);
  if(!entry) return;
  cableMaterialesActuales.push({ label: entry[0], col, cantidad: 1 });
  renderCableMaterialList();
}

cbMaterialSearch.addEventListener('input', () => {
  const term = cbMaterialSearch.value.trim().toLowerCase();
  if(!term){ cbMaterialResults.classList.remove('show'); cbMaterialResults.innerHTML=''; return; }
  const yaAgregados = new Set(cableMaterialesActuales.map(m => m.col));
  const matches = MATERIALES_CATALOGO.filter(([label,col]) =>
    !yaAgregados.has(col) && label.toLowerCase().includes(term)
  ).slice(0, 20);
  if(matches.length === 0){
    cbMaterialResults.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    cbMaterialResults.innerHTML = matches.map(([label,col]) => `
      <div class="site-result-item" data-cbmaterial-col="${escapeHtml(col)}">
        <div class="site-result-name">${escapeHtml(label)}</div>
      </div>
    `).join('');
  }
  cbMaterialResults.classList.add('show');
});
cbMaterialResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-cbmaterial-col]');
  if(!item) return;
  addCableMaterial(item.dataset.cbmaterialCol);
  cbMaterialSearch.value = '';
  cbMaterialResults.classList.remove('show');
  cbMaterialResults.innerHTML = '';
  cbMaterialSearch.focus();
});
document.addEventListener('click', (e) => {
  if(!e.target.closest('#cb_material_search') && !e.target.closest('#cb_material_results')){
    cbMaterialResults.classList.remove('show');
  }
});

/* ---- Buscador de técnico dentro del formulario de Cable Color ---- */
const cbTecnicoSearch = document.getElementById('cb_tecnico_search');
const cbTecnicoResults = document.getElementById('cb_tecnico_results');

function setCableTecnico(persona){
  document.getElementById('cb_tecnico_id').value = persona ? persona.id : '';
  if(persona){
    const c = colorFor(persona.cuadrilla || persona.nombre || '');
    document.getElementById('cb_tecnico_avatar').textContent = initials(persona.nombre);
    document.getElementById('cb_tecnico_avatar').style.background = c;
    document.getElementById('cb_tecnico_name').textContent = persona.nombre;
    document.getElementById('cb_tecnico_meta').textContent = (persona.cuadrilla || '—') + ' · ' + (persona.puesto || '—');
    document.getElementById('cb_tecnico_selected').style.display = 'block';
  } else {
    document.getElementById('cb_tecnico_selected').style.display = 'none';
  }
}

cbTecnicoSearch.addEventListener('input', () => {
  const term = cbTecnicoSearch.value.trim().toLowerCase();
  if(!term){ cbTecnicoResults.classList.remove('show'); cbTecnicoResults.innerHTML=''; return; }
  const matches = allPeople.filter(p => (p.nombre||'').toLowerCase().includes(term)).slice(0, 20);
  if(matches.length === 0){
    cbTecnicoResults.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    cbTecnicoResults.innerHTML = matches.map(p => `
      <div class="site-result-item" data-cbtecnico-id="${escapeHtml(p.id)}">
        <div class="site-result-name">${escapeHtml(p.nombre)}</div>
        <div class="site-result-meta">${escapeHtml(p.cuadrilla || '—')} · ${escapeHtml(p.puesto || '—')}</div>
      </div>
    `).join('');
  }
  cbTecnicoResults.classList.add('show');
});
cbTecnicoResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-cbtecnico-id]');
  if(!item) return;
  const persona = allPeople.find(p => String(p.id) === String(item.dataset.cbtecnicoId));
  if(persona){ setCableTecnico(persona); }
  cbTecnicoSearch.value = '';
  cbTecnicoResults.classList.remove('show');
  cbTecnicoResults.innerHTML = '';
});
document.addEventListener('click', (e) => {
  if(!e.target.closest('#cb_tecnico_search') && !e.target.closest('#cb_tecnico_results')){
    cbTecnicoResults.classList.remove('show');
  }
});
document.getElementById('cb_tecnico_clear').addEventListener('click', () => setCableTecnico(null));

/* ---- Form modal (Agregar / Editar Cable Color) ---- */
const cableFormModalOverlay = document.getElementById('cableFormModalOverlay');

function openCableFormModal(caso){
  if(document.getElementById('cb_anos').options.length <= 1){
    initCableSelects();
  }

  // Sugerencias de Tipo de Falla
  const tiposUnicos = [...new Set(allCable.map(c => c.tipo_falla).filter(Boolean))].sort();
  document.getElementById('cb_tipo_falla_list').innerHTML =
    tiposUnicos.map(v => `<option value="${escapeHtml(v)}"></option>`).join('');

  // Poblar Sub Categoría con las mismas opciones que Movistar
  const cbSubCatSel = document.getElementById('cb_sub_categoria');
  cbSubCatSel.innerHTML = '<option value="">—</option>' +
    SUB_CATEGORIA_OPCIONES.map(s => `<option>${escapeHtml(s)}</option>`).join('');

  currentCableEditId = caso ? caso.id : null;
  document.getElementById('cableFormModalTitle').textContent = caso ? 'Editar Caso' : 'Agregar Caso';

  document.getElementById('cb_numero').value = caso?.numero || '';
  // Tolerante: hay registros viejos con nombres de cuadrilla en vez de zona.
  setSelectValorTolerante('cb_zona', caso?.zona);
  document.getElementById('cb_tipo_falla').value = caso?.tipo_falla || '';
  document.getElementById('cb_ot').value = caso?.ot || '';
  opActualizarSelect('cb_operador_tekcom', 'tekcom');
  opActualizarSelect('cb_operador_telco', 'cable');
  setSelectValorTolerante('cb_operador_tekcom', caso?.operador_tekcom);
  setSelectValorTolerante('cb_operador_telco', caso?.operador_telco);
  document.getElementById('cb_s_validacion').value = caso?.s_validacion ? isoToDatetimeLocal(caso.s_validacion) : '';
  document.getElementById('cb_validacion_hyve').value = caso?.validacion_hyve ? isoToDatetimeLocal(caso.validacion_hyve) : '';
  document.getElementById('cb_descripcion').value = caso?.descripcion || '';
  // Técnico / Cuadrilla
  const cbPersonaExistente = caso?.cuadrilla
    ? allPeople.find(p => p.nombre === caso.cuadrilla)
    : null;
  cbTecnicoSearch.value = '';
  if(cbPersonaExistente){
    setCableTecnico(cbPersonaExistente);
  } else if(caso?.cuadrilla){
    document.getElementById('cb_tecnico_id').value = '';
    document.getElementById('cb_tecnico_selected').style.display = 'block';
    document.getElementById('cb_tecnico_avatar').textContent = initials(caso.cuadrilla);
    document.getElementById('cb_tecnico_avatar').style.background = colorFor(caso.cuadrilla);
    document.getElementById('cb_tecnico_name').textContent = caso.cuadrilla;
    document.getElementById('cb_tecnico_meta').textContent = 'No encontrado en Listado del Personal';
  } else {
    setCableTecnico(null);
  }
  document.getElementById('cb_status').value = caso?.status || '';
  document.getElementById('cb_causa').value = caso ? (caso.causa || '') : 'Corte de Fibra';
  document.getElementById('cb_sub_categoria').value = caso?.sub_categoria || '';
  document.getElementById('cb_coordenadas').value = formatCoordenadas(caso?.latitud, caso?.longitud);
  document.getElementById('cb_observacion').value = caso?.observacion || '';

  if(caso){
    document.getElementById('cb_anos').value = caso.anos ?? '';
    document.getElementById('cb_mes').value = caso.mes || '';
    document.getElementById('cb_semana').value = caso.semana ?? '';
    document.getElementById('cb_escalonamiento').value = isoToDatetimeLocal(caso.escalonamiento);
  } else {
    const now = new Date();
    document.getElementById('cb_anos').value = now.getFullYear();
    document.getElementById('cb_mes').value = MESES_ES[now.getMonth()];
    document.getElementById('cb_semana').value = getSemanaISO(now);
    document.getElementById('cb_escalonamiento').value = isoToDatetimeLocal(now.toISOString());
  }

  document.getElementById('cb_resolucion').value = isoToDatetimeLocal(caso?.resolucion);
  document.getElementById('cb_pausa').value = caso?.pausa || '';

  // Materiales: reconstruir desde columnas con valor > 0
  cableMaterialesActuales = [];
  if(caso){
    MATERIALES_CATALOGO.forEach(([label, col]) => {
      const val = caso[col];
      if(val !== null && val !== undefined && Number(val) > 0){
        cableMaterialesActuales.push({ label, col, cantidad: Number(val) });
      }
    });
  }
  renderCableMaterialList();

  recalcCableTiempos();
  cableFormModalOverlay.classList.add('active');
}
function closeCableFormModal(){ cableFormModalOverlay.classList.remove('active'); currentCableEditId = null; }

document.getElementById('btnAddCable').addEventListener('click', () => openCableFormModal(null));
document.getElementById('cableFormModalClose').addEventListener('click', closeCableFormModal);
document.getElementById('cableFormCancelBtn').addEventListener('click', closeCableFormModal);
cableFormModalOverlay.addEventListener('click', (e) => { if(e.target === cableFormModalOverlay) closeCableFormModal(); });

document.getElementById('cableFormSaveBtn').addEventListener('click', async () => {
  const toIntOrNull = (id) => {
    const v = document.getElementById(id).value.trim();
    return v === '' ? null : parseInt(v, 10);
  };
  const toNumOrNull = (id) => {
    const v = document.getElementById(id).value.trim();
    return v === '' ? null : parseFloat(v);
  };
  const toIsoOrNull = (id) => {
    const v = document.getElementById(id).value;
    return v ? new Date(v).toISOString() : null;
  };
  const toTextOrNull = (id) => {
    const v = document.getElementById(id).value.trim();
    return v === '' ? null : v;
  };
  const cbTecnicoId = document.getElementById('cb_tecnico_id').value;
  const cbTecnicoPersona = cbTecnicoId ? allPeople.find(p => String(p.id) === String(cbTecnicoId)) : null;
  const cbNombreTecnico = cbTecnicoPersona ? cbTecnicoPersona.nombre : (document.getElementById('cb_tecnico_name').textContent !== '—' ? document.getElementById('cb_tecnico_name').textContent : null);

  const payload = {
    numero: toTextOrNull('cb_numero'),
    zona: toTextOrNull('cb_zona'),
    tipo_falla: toTextOrNull('cb_tipo_falla'),
    ot: toTextOrNull('cb_ot'),
    descripcion: toTextOrNull('cb_descripcion'),
    operador_tekcom: toTextOrNull('cb_operador_tekcom'),
    operador_telco: toTextOrNull('cb_operador_telco'),
    s_validacion: toIsoOrNull('cb_s_validacion'),
    validacion_hyve: toIsoOrNull('cb_validacion_hyve'),
    t_validacion: toTextOrNull('cb_t_validacion'),
    cuadrilla: cbNombreTecnico,
    status: toTextOrNull('cb_status'),
    causa: toTextOrNull('cb_causa'),
    sub_categoria: toTextOrNull('cb_sub_categoria'),
    latitud: parseCoordenadasNum(document.getElementById('cb_coordenadas').value).lat,
    longitud: parseCoordenadasNum(document.getElementById('cb_coordenadas').value).lng,
    observacion: toTextOrNull('cb_observacion'),
    anos: toIntOrNull('cb_anos'),
    mes: toTextOrNull('cb_mes'),
    semana: toIntOrNull('cb_semana'),
    escalonamiento: toIsoOrNull('cb_escalonamiento'),
    resolucion: toIsoOrNull('cb_resolucion'),
    tiempo_afectacion: toTextOrNull('cb_tiempo_afectacion'),
    pausa: toTextOrNull('cb_pausa'),
    tiempo_respuesta: toTextOrNull('cb_tiempo_respuesta'),
  };

  const materialesMap = {};
  cableMaterialesActuales.forEach(m => { materialesMap[m.col] = m.cantidad; });
  MATERIALES_CATALOGO.forEach(([label, col]) => {
    payload[col] = materialesMap.hasOwnProperty(col) ? materialesMap[col] : 0;
  });

  const saveBtn = document.getElementById('cableFormSaveBtn');
  saveBtn.textContent = 'Guardando...';
  saveBtn.disabled = true;

  try{
    let res;
    if(currentCableEditId){
      res = await fetch(`${CABLE_REST_URL}?id=eq.${currentCableEditId}`, {
        method:'PATCH',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(CABLE_REST_URL, {
        method:'POST',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    }
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al guardar'); }

    showToast(currentCableEditId ? 'Caso actualizado' : 'Caso agregado');
    closeCableFormModal();
    await fetchCable();
  }catch(err){
    console.error(err);
    showToast('No se pudo guardar: ' + err.message, 'error');
  }finally{
    saveBtn.textContent = 'Guardar';
    saveBtn.disabled = false;
  }
});

/* ---- View modal (Ver Cable Color) ---- */
const cableViewModalOverlay = document.getElementById('cableViewModalOverlay');

// Tiempo de Validación de Cable Color = Fecha de Validación (Hyve) - Solicitud.
// Sin solicitud registrada devuelve 00:00.
function cableTiempoValidacion(caso){
  if(caso.t_validacion) return caso.t_validacion;
  const fin = caso.validacion_hyve || caso.resolucion;
  if(!caso.s_validacion || !fin) return '00:00';
  const min = (new Date(fin) - new Date(caso.s_validacion)) / 60000;
  return isNaN(min) ? '00:00' : minutesToHHMM(min);
}

function openCableViewModal(caso){
  viewingCable = caso;
  const grid = document.getElementById('cableViewGrid');
  // Tiempo de Validación: usa lo guardado o lo calcula con la Resolución como cierre.
  const fieldsMap = [
    ['Zona', caso.zona], ['Tipo de Falla', caso.tipo_falla],
    // OT es el número de ticket; en registros viejos venía vacío y se toma de `numero`.
    ['OT', caso.ot || caso.numero],
    ['Descripción', caso.descripcion], ['Cuadrilla', caso.cuadrilla], ['Status', caso.status],
    ['Causa', caso.causa], ['Sub Categoría', caso.sub_categoria],
    ['Año', caso.anos], ['Mes', caso.mes], ['Semana', caso.semana],
    ['Escalonamiento', plFechaHoraMilitar(caso.escalonamiento)],
    ['Resolución', plFechaHoraMilitar(caso.resolucion)],
    ['Tiempo de Afectación', caso.tiempo_afectacion], ['Pausa', caso.pausa], ['Tiempo de Respuesta', caso.tiempo_respuesta],
    ['Operador NOC-Tekcom', caso.operador_tekcom], ['Operador Cable Color', caso.operador_telco],
    ['Solicitud de Validación a Hyve', plFechaHoraMilitar(caso.s_validacion) || 'No aplica'],
    ['Fecha de Validación (Hyve)', plFechaHoraMilitar(caso.validacion_hyve || caso.resolucion) || 'No aplica'],
    ['Tiempo de Validación', cableTiempoValidacion(caso)],
    ['Observación', caso.observacion],
    ['Coordenadas', formatCoordenadas(caso.latitud, caso.longitud)],
  ];
  grid.innerHTML = fieldsMap.map(([label,val]) => {
    // Un valor puede venir como texto simple o como {texto, color} para resaltarlo.
    const esObj = val && typeof val === 'object';
    const texto = esObj ? val.texto : val;
    const estilo = (esObj && val.color) ? ` style="color:${val.color};font-weight:700;"` : '';
    const contenido = escapeHtml(texto)
      ? `<span${estilo}>${escapeHtml(texto)}</span>`
      : '<span style="color:var(--text-faint);">—</span>';
    return `
    <div>
      <div class="view-field-label">${label}</div>
      <div class="view-field-value">${contenido}</div>
    </div>`;
  }).join('');

  const matWrap = document.getElementById('cableViewMateriales');
  const materialesUsados = MATERIALES_CATALOGO.filter(([label,col]) => caso[col] && Number(caso[col]) > 0);
  if(materialesUsados.length === 0){
    matWrap.innerHTML = '<div class="material-empty">No se registraron materiales en este caso.</div>';
  } else {
    matWrap.innerHTML = materialesUsados.map(([label,col]) => `
      <div class="material-item">
        <div class="material-item-name">${escapeHtml(label)}</div>
        <div class="mono" style="font-weight:600;">${escapeHtml(caso[col])}</div>
      </div>
    `).join('');
  }

  cableViewModalOverlay.classList.add('active');
}
function closeCableViewModal(){ cableViewModalOverlay.classList.remove('active'); viewingCable = null; }

document.getElementById('cableViewModalClose').addEventListener('click', closeCableViewModal);
document.getElementById('cableViewCloseBtn').addEventListener('click', closeCableViewModal);
cableViewModalOverlay.addEventListener('click', (e) => { if(e.target === cableViewModalOverlay) closeCableViewModal(); });
document.getElementById('cableViewEditBtn').addEventListener('click', () => {
  const c = viewingCable;
  closeCableViewModal();
  openCableFormModal(c);
});

/* ---- Delete modal (Eliminar Cable Color) ---- */
const cableDeleteModalOverlay = document.getElementById('cableDeleteModalOverlay');

function openCableDeleteModal(caso){
  pendingCableDeleteId = caso.id;
  document.getElementById('cableDeleteName').textContent = caso.descripcion || 'este caso';
  cableDeleteModalOverlay.classList.add('active');
}
function closeCableDeleteModal(){ cableDeleteModalOverlay.classList.remove('active'); pendingCableDeleteId = null; }

document.getElementById('cableDeleteCancelBtn').addEventListener('click', closeCableDeleteModal);
cableDeleteModalOverlay.addEventListener('click', (e) => { if(e.target === cableDeleteModalOverlay) closeCableDeleteModal(); });

document.getElementById('cableDeleteConfirmBtn').addEventListener('click', async () => {
  if(!pendingCableDeleteId) return;
  const btn = document.getElementById('cableDeleteConfirmBtn');
  btn.textContent = 'Eliminando...';
  btn.disabled = true;
  try{
    const res = await fetch(`${CABLE_REST_URL}?id=eq.${pendingCableDeleteId}`, {
      method:'DELETE',
      headers: sbHeaders
    });
    if(!res.ok) throw new Error('Error al eliminar');
    showToast('Caso eliminado');
    closeCableDeleteModal();
    await fetchCable();
  }catch(err){
    console.error(err);
    showToast('No se pudo eliminar: ' + err.message, 'error');
  }finally{
    btn.textContent = 'Eliminar';
    btn.disabled = false;
  }
});

/* ---- Exportar a Excel ---- */
document.getElementById('btnExportarCable').addEventListener('click', () => {
  const casosAExportar = getCableFiltrados();
  if(casosAExportar.length === 0){
    showToast('No hay casos que coincidan con los filtros para exportar', 'error');
    return;
  }

  const generalHeaders = [
    ['numero','#'],['zona','Zona'],['tipo_falla','Tipo de Falla'],['descripcion','Descripción'],
    ['escalonamiento','Fecha_Escalonamiento'],['anos','Año'],['mes','Mes'],['semana','Semana'],['ot','OT'],
    ['status','Estatus'],['cuadrilla','Cuadrilla'],['resolucion','Fecha_Resolucion'],
    ['tiempo_afectacion','Tiempo_Afectacion'],['latitud','Latitud'],['longitud','Longitud'],
    ['pausa','Pausa'],['tiempo_respuesta','Tiempo_Respuesta'],['causa','Causa'],
    ['sub_categoria','Sub_Categoria'],['observacion','Observacion'],
  ];
  const allHeaders = [...generalHeaders, ...MATERIALES_CATALOGO.map(([label,col]) => [col,label])];

  const rows = casosAExportar.map(c => {
    return allHeaders.map(([col,label]) => {
      let val = c[col];
      if(['escalonamiento','resolucion'].includes(col)){
        val = val ? new Date(val).toLocaleString('es-SV') : '';
      }
      return (val === null || val === undefined) ? '' : val;
    });
  });

  const escapeXlsHtml = (v) => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let html = '<table border="1" style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt;">';
  html += '<thead><tr>';
  allHeaders.forEach(([col,label]) => {
    html += `<th style="background-color:#0A6A99;color:#FFFFFF;font-weight:bold;padding:6px 10px;border:1px solid #08526E;white-space:nowrap;">${escapeXlsHtml(label)}</th>`;
  });
  html += '</tr></thead><tbody>';
  rows.forEach(row => {
    html += '<tr>';
    row.forEach(val => {
      html += `<td style="padding:5px 10px;border:1px solid #DDDDDD;">${escapeXlsHtml(val)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  const xlsHeader = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8">
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
    <x:Name>Cable Color</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head><body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsHeader], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `cable-color-${new Date().toISOString().slice(0,10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast(`Excel generado con ${casosAExportar.length} caso${casosAExportar.length === 1 ? '' : 's'} filtrado${casosAExportar.length === 1 ? '' : 's'}`);
});


/* ============================================================
   DASHBOARD - CABLE COLOR
============================================================ */
let cableDashMesTab = 'casos';
let cableDashCausaTab = 'casos';
let cableDashTecTab = 'casos';

function getCableDashFiltrados(){
  const clasif = msVal('cableDashClasificacionFilter');
  const ano = msVal('cableDashAnoFilter');
  const mes = msVal('cableDashMesFilter');
  const semana = msVal('cableDashSemanaFilter');
  const folio = document.getElementById('cableDashFolioSearch').value.trim().toLowerCase();

  return allCable.filter(c => {
    if(c.status !== 'Finalizada') return false;
    const mClasif = clasif.length === 0 || clasif.includes(c.tipo_falla);
    const mAno = ano.length === 0 || ano.includes(String(c.anos));
    const mMes = mes.length === 0 || mes.includes(c.mes);
    const mSemana = semana.length === 0 || semana.includes(String(c.semana));
    const mFolio = !folio || (c.descripcion||'').toLowerCase().includes(folio) || (c.ot||'').toLowerCase().includes(folio) || (c.numero||'').toLowerCase().includes(folio);
    return mClasif && mAno && mMes && mSemana && mFolio;
  });
}

function initCableDashboard(){
  const anoSel = document.getElementById('cableDashAnoFilter');
  const curAno = msRestoreOrCurrent('cableDashAnoFilter');
  const anosUnicos = [...new Set(allCable.map(c=>c.anos).filter(v => v !== null && v !== undefined && v !== ''))].sort((a,b)=>a-b);
  anoSel.innerHTML = '<option value="">Todos</option>' +
    anosUnicos.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  msSetVal('cableDashAnoFilter', curAno.filter(v => anosUnicos.map(String).includes(v)));

  updateCableCascadaFiltros('cableDash');

  renderCableDashboardMain();

  ['cableDashClasificacionFilter','cableDashAnoFilter','cableDashMesFilter','cableDashSemanaFilter'].forEach(id => {
    const el = document.getElementById(id);
    if(!el._cableDashListener){
      el._cableDashListener = true;
      el.addEventListener('change', () => {
        if(id === 'cableDashAnoFilter' || id === 'cableDashMesFilter' || id === 'cableDashClasificacionFilter'){
          updateCableCascadaFiltros('cableDash');
        }
        renderCableDashboardMain();
      });
    }
  });
  const folioEl = document.getElementById('cableDashFolioSearch');
  if(!folioEl._cableDashListener){
    folioEl._cableDashListener = true;
    folioEl.addEventListener('input', renderCableDashboardMain);
  }
  const limpiarBtn = document.getElementById('btnCableDashLimpiarFiltros');
  if(!limpiarBtn._cableDashListener){
    limpiarBtn._cableDashListener = true;
    limpiarBtn.addEventListener('click', () => {
      ['cableDashClasificacionFilter','cableDashAnoFilter','cableDashMesFilter','cableDashSemanaFilter'].forEach(id => msSetVal(id, []));
      document.getElementById('cableDashFolioSearch').value = '';
      updateCableCascadaFiltros('cableDash');
      renderCableDashboardMain();
    });
  }
  const pdfBtn = document.getElementById('btnCableDashExportarPDF');
  if(pdfBtn && !pdfBtn._cableDashListener){
    pdfBtn._cableDashListener = true;
    pdfBtn.addEventListener('click', () => exportarDashboardPDF('subtabcb-dashboard', 'Dashboard - Casos Atendidos Cable Color'));
  }
  const pptxBtn = document.getElementById('btnCableDashExportarPPTX');
  if(pptxBtn && !pptxBtn._cableDashListener){
    pptxBtn._cableDashListener = true;
    pptxBtn.addEventListener('click', () => exportarCablePPTXNativo());
  }
}

function renderCableGraficoMes(datos){
  const mesWrap = document.getElementById('cableDashChartMes');
  document.querySelectorAll('.cable-mes-tab-btn').forEach(btn => {
    const isActive = btn.dataset.cablemestab === cableDashMesTab;
    btn.style.background = isActive ? 'var(--accent)' : 'transparent';
    btn.style.color = isActive ? '#fff' : 'var(--text-dim)';
  });

  const mesActivo = msVal('cableDashMesFilter').length > 0;
  const agrupador = mesActivo ? 'semana' : 'mes';

  const titulo = document.getElementById('cableDashChartMesTitulo');
  const tituloTexto = agrupador === 'semana'
    ? (cableDashMesTab === 'casos' ? 'Casos Por Semana' : 'SLA Prom. Por Semana')
    : (cableDashMesTab === 'casos' ? 'Casos Por Mes' : 'SLA Prom. Por Mes');
  if(titulo) titulo.textContent = tituloTexto;

  if(cableDashMesTab === 'casos'){
    const porGrupo = {};
    datos.forEach(c => { const key = c[agrupador]; if(key !== null && key !== undefined && key !== '') porGrupo[key] = (porGrupo[key]||0)+1; });

    let labels, vals;
    if(agrupador === 'mes'){
      labels = MESES_ORDEN_DASH.filter(m => porGrupo[m]);
      vals = labels.map(m => porGrupo[m]);
    } else {
      labels = Object.keys(porGrupo).sort((a,b) => Number(a)-Number(b)).map(String);
      vals = labels.map(l => porGrupo[l]);
    }

    if(!labels.length){
      mesWrap.innerHTML = '<div class="material-empty" style="padding:60px 0;text-align:center;">Sin datos</div>';
      return;
    }
    mesWrap.innerHTML = `<canvas id="cableCanvasMes" style="width:100%;height:240px;"></canvas>`;
    dibujarLineaMes('cableCanvasMes', labels, vals, 'num');
  } else {
    const slaSuma = {}; const slaCount = {};
    datos.forEach(c => {
      const key = c[agrupador];
      if(key === null || key === undefined || key === '') return;
      const min = hhmmToMinutesDash(c.tiempo_respuesta);
      if(min !== null && min >= 0){
        slaSuma[key] = (slaSuma[key]||0) + min;
        slaCount[key] = (slaCount[key]||0) + 1;
      }
    });
    let labels;
    if(agrupador === 'mes'){
      labels = MESES_ORDEN_DASH.filter(m => slaCount[m]);
    } else {
      labels = Object.keys(slaCount).sort((a,b) => Number(a)-Number(b)).map(String);
    }
    const vals = labels.map(l => Math.round(slaSuma[l] / slaCount[l]));
    if(!labels.length){
      mesWrap.innerHTML = '<div class="material-empty" style="padding:60px 0;text-align:center;">Sin datos de SLA</div>';
      return;
    }
    mesWrap.innerHTML = `<canvas id="cableCanvasMes" style="width:100%;height:240px;"></canvas>`;
    dibujarLineaMes('cableCanvasMes', labels, vals, 'hhmm');
  }
}

// ---- Respuesta de Validaciones (Dashboard de Cable Color) ----
// Mide desde que se solicita la validación a Hyve hasta que queda validada.
function renderCableDashValidacion(datos){
  const wrap = document.getElementById('cableDashValidacion');
  if(!wrap) return;

  const conValidacion = datos
    .map(c => {
      const fin = c.validacion_hyve || c.resolucion;
      if(!c.s_validacion || !fin) return null;
      const min = (new Date(fin) - new Date(c.s_validacion)) / 60000;
      if(isNaN(min) || min < 0) return null;
      return { caso: c, min };
    })
    .filter(Boolean)
    .sort((a, b) => b.min - a.min);

  if(!conValidacion.length){
    wrap.innerHTML = '<div class="material-empty">Ningún caso con validación registrada en este filtro</div>';
    return;
  }

  const promedio = conValidacion.reduce((a, x) => a + x.min, 0) / conValidacion.length;

  wrap.innerHTML = `
    <div style="text-align:center; padding:18px 0 20px;">
      <div style="font-size:34px; font-weight:800; line-height:1;">${minutesToHHMM(promedio)}</div>
      <div style="font-size:12px; color:var(--text-dim); margin-top:4px;">Tiempo promedio de respuesta</div>
    </div>
    <button type="button" id="cableDashValidacionToggle"
      style="width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px;
             padding:10px 12px; border:1px solid var(--border); border-radius:8px;
             background:var(--surface-2); cursor:pointer; font-size:13px; color:var(--text);">
      <span>Casos con validación</span>
      <span style="display:flex; align-items:center; gap:6px; font-weight:700;">
        ${conValidacion.length}
        <svg id="cableDashValidacionChevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;transition:transform .15s;">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </span>
    </button>
    <div id="cableDashValidacionLista" style="display:none; margin-top:10px; max-height:230px; overflow-y:auto;">
      ${conValidacion.map(({ caso, min }) => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;
                    padding:7px 2px; border-bottom:1px solid var(--border);">
          <div style="min-width:0;">
            <div style="font-size:12.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(caso.ot || caso.numero || '—')}
            </div>
            <div style="font-size:11px; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(caso.descripcion || '')}
            </div>
          </div>
          <span style="font-size:12.5px; font-weight:700; flex-shrink:0;
                       color:${min > VALIDACION_MOVISTAR_META_MIN ? '#DC2626' : '#16A34A'};">
            ${minutesToHHMM(min)}
          </span>
        </div>`).join('')}
    </div>
  `;

  const btn = document.getElementById('cableDashValidacionToggle');
  const lista = document.getElementById('cableDashValidacionLista');
  const chevron = document.getElementById('cableDashValidacionChevron');
  btn.addEventListener('click', () => {
    const abierto = lista.style.display !== 'none';
    lista.style.display = abierto ? 'none' : '';
    chevron.style.transform = abierto ? '' : 'rotate(180deg)';
  });
}

function renderCableRankingCausas(datos){
  setTabStyle(document.querySelectorAll('.cable-causa-tab-btn'), cableDashCausaTab, 'data-cablecausatab');
  const wrap = document.getElementById('cableDashRankingCausas');
  if(cableDashCausaTab === 'casos'){
    const porCausa = {};
    datos.forEach(c => { if(c.causa){ porCausa[c.causa]=(porCausa[c.causa]||0)+1; } });
    const top = Object.entries(porCausa).sort((a,b)=>b[1]-a[1]).slice(0,3);
    wrap.innerHTML = top.length ? top.map(([causa,count]) => `
      <div class="dash-rank-item"><div class="dash-rank-name">${escapeHtml(causa)}</div><div class="dash-rank-meta">Casos: ${count}</div></div>`).join('')
      : '<div class="material-empty">Sin datos</div>';
  } else {
    const slaData = calcSlaPromPorGrupo(datos, 'causa').slice(0,3);
    wrap.innerHTML = slaData.length ? slaData.map(([causa,min]) => `
      <div class="dash-rank-item"><div class="dash-rank-name">${escapeHtml(causa)}</div><div class="dash-rank-meta">SLA Prom: ${minToHHMM(min)}</div></div>`).join('')
      : '<div class="material-empty">Sin datos de SLA</div>';
  }
}

function renderCableGraficoTecnico(datos){
  setTabStyle(document.querySelectorAll('.cable-tec-tab-btn'), cableDashTecTab, 'data-cabletectab');
  const wrap = document.getElementById('cableDashChartTecnico');
  if(cableDashTecTab === 'casos'){
    const porTec = {};
    datos.forEach(c => { if(c.cuadrilla){ porTec[c.cuadrilla]=(porTec[c.cuadrilla]||0)+1; } });
    const ordered = Object.entries(porTec).sort((a,b)=>b[1]-a[1]);
    const maxV = Math.max(...ordered.map(([,v])=>v),1);
    wrap.innerHTML = ordered.length ? `<div class="dash-bar-wrap">${ordered.map(([tec,count]) => {
      const pct=Math.round((count/maxV)*100);
      return `<div class="dash-bar-row">
        <div class="dash-bar-label" title="${escapeHtml(tec)}">${escapeHtml(tec.split(' ').slice(0,2).join(' '))}</div>
        <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.max(pct,3)}%;"><span class="dash-bar-val">${count}</span></div></div>
      </div>`;}).join('')}</div>` : '<div class="material-empty">Sin datos</div>';
  } else {
    const slaData = calcSlaPromPorGrupo(datos, 'cuadrilla');
    const maxV = Math.max(...slaData.map(([,v])=>v),1);
    wrap.innerHTML = slaData.length ? `<div class="dash-bar-wrap">${slaData.map(([tec,min]) => {
      const pct=Math.round((min/maxV)*100);
      return `<div class="dash-bar-row">
        <div class="dash-bar-label" title="${escapeHtml(tec)}">${escapeHtml(tec.split(' ').slice(0,2).join(' '))}</div>
        <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.max(pct,3)}%;"><span class="dash-bar-val">${minToHHMM(min)}</span></div></div>
      </div>`;}).join('')}</div>` : '<div class="material-empty">Sin datos de SLA</div>';
  }
}

function renderCableDashboardMain(){
  const datos = getCableDashFiltrados();

  document.getElementById('cableDashTotalCasos').textContent = datos.length;

  const SLA_UMBRAL = slaLimite('cable');
  const slaMinutos = datos.map(c => hhmmToMinutesDash(c.tiempo_respuesta)).filter(v => v !== null && v >= 0);
  const slaEl = document.getElementById('cableDashSlaPromedio');
  const slaCard = document.getElementById('cableDashSlaCard');
  if(slaMinutos.length > 0){
    const promMin = Math.round(slaMinutos.reduce((a,b)=>a+b,0) / slaMinutos.length);
    const h = Math.floor(promMin/60); const m = promMin % 60;
    slaEl.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    const dentro = promMin <= SLA_UMBRAL;
    slaEl.style.color = dentro ? '#16A34A' : '#DC2626';
    slaCard.style.borderLeft = `4px solid ${dentro ? '#16A34A' : '#DC2626'}`;
  } else {
    slaEl.textContent = '—'; slaEl.style.color = ''; slaCard.style.borderLeft = '';
  }

  let dentro = 0, fuera = 0;
  datos.forEach(c => {
    const min = hhmmToMinutesDash(c.tiempo_respuesta);
    if(min === null || min < 0) return;
    if(min <= SLA_UMBRAL) dentro++; else fuera++;
  });
  const total = dentro + fuera;
  const pctDentro = total > 0 ? Math.round((dentro/total)*100) : 0;
  const pctFuera  = total > 0 ? Math.round((fuera/total)*100)  : 0;
  document.getElementById('cableDashDentroSla').textContent = total > 0 ? `${dentro} (${pctDentro}%)` : '—';
  document.getElementById('cableDashFueraSla').textContent  = total > 0 ? `${fuera} (${pctFuera}%)`  : '—';

  setTimeout(() => {
    renderCableGraficoMes(datos);
    document.querySelectorAll('.cable-mes-tab-btn').forEach(btn => {
      btn.onclick = () => { cableDashMesTab = btn.dataset.cablemestab; renderCableGraficoMes(getCableDashFiltrados()); };
    });
    renderCableRankingCausas(datos);
    renderCableDashValidacion(datos);
    document.querySelectorAll('.cable-causa-tab-btn').forEach(btn => {
      btn.onclick = () => { cableDashCausaTab = btn.dataset.cablecausatab; renderCableRankingCausas(getCableDashFiltrados()); };
    });
    renderCableGraficoTecnico(datos);
    document.querySelectorAll('.cable-tec-tab-btn').forEach(btn => {
      btn.onclick = () => { cableDashTecTab = btn.dataset.cabletectab; renderCableGraficoTecnico(getCableDashFiltrados()); };
    });
  }, 100);
}

/* ============================================================
   MATERIALES — CABLE COLOR (Resumen + Tabla por caso)
============================================================ */
let cableMaterialesInitialized = false;

function getCableMaterialesFiltrados(){
  const ano = msVal('cableMatAnoFilter');
  const mes = msVal('cableMatMesFilter');
  const semana = msVal('cableMatSemanaFilter');
  const clasif = msVal('cableMatClasificacionFilter');

  return allCable.filter(c => {
    const mAno = ano.length === 0 || ano.includes(String(c.anos));
    const mMes = mes.length === 0 || mes.includes(c.mes);
    const mSemana = semana.length === 0 || semana.includes(String(c.semana));
    const mClasif = clasif.length === 0 || clasif.includes(c.tipo_falla);
    return mAno && mMes && mSemana && mClasif;
  });
}

function initCableMateriales(){
  if(cableMaterialesInitialized){ renderCableMaterialesActivo(); return; }
  cableMaterialesInitialized = true;

  const anoSel = document.getElementById('cableMatAnoFilter');
  const curAno = msRestoreOrCurrent('cableMatAnoFilter');
  const anosUnicos = [...new Set(allCable.map(c=>c.anos).filter(v => v !== null && v !== undefined && v !== ''))].sort((a,b)=>a-b);
  anoSel.innerHTML = '<option value="">Todos</option>' +
    anosUnicos.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  msSetVal('cableMatAnoFilter', curAno.filter(v => anosUnicos.map(String).includes(v)));

  updateCableCascadaFiltros('cableMat');

  ['cableMatAnoFilter','cableMatMesFilter','cableMatSemanaFilter','cableMatClasificacionFilter'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      if(id !== 'cableMatSemanaFilter'){
        updateCableCascadaFiltros('cableMat');
      }
      renderCableMaterialesActivo();
    });
  });
  document.getElementById('cableMatBuscador').addEventListener('input', renderCableMaterialesActivo);

  document.querySelectorAll('[data-cablemattab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-cablemattab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('cablemattab-resumen').classList.toggle('active', btn.dataset.cablemattab === 'resumen');
      document.getElementById('cablemattab-tabla').classList.toggle('active', btn.dataset.cablemattab === 'tabla');
      cableMatTablaSubtab = btn.dataset.cablemattab;
      renderCableMaterialesActivo();
    });
  });

  renderCableMaterialesActivo();
}

let cableMatTablaSubtab = 'resumen';
function renderCableMaterialesActivo(){
  if(cableMatTablaSubtab === 'tabla') renderCableMaterialesTabla();
  else renderCableMateriales();
}

function renderCableMateriales(){
  const casos = getCableMaterialesFiltrados();
  const wrap = document.getElementById('cableMaterialesResumenWrap');
  const busqueda = (document.getElementById('cableMatBuscador')?.value || '').trim().toLowerCase();
  document.getElementById('cableMatCasosContados').textContent = `${casos.length} caso${casos.length !== 1 ? 's' : ''} en el filtro`;

  const totales = {};
  MATERIALES_CATALOGO.forEach(([label, col]) => {
    const total = casos.reduce((sum, c) => sum + (parseFloat(c[col]) || 0), 0);
    if(total > 0) totales[col] = { label, total };
  });

  let usados = Object.entries(totales).sort((a,b) => b[1].total - a[1].total);
  if(busqueda){
    usados = usados.filter(([col, {label}]) => label.toLowerCase().includes(busqueda));
  }

  if(usados.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
        <div class="empty-title">${busqueda ? 'Sin resultados para "'+escapeHtml(busqueda)+'"' : 'Sin materiales registrados'}</div>
        <div class="empty-desc">${busqueda ? 'Prueba con otro término de búsqueda.' : 'No hay materiales con cantidad mayor a 0 en los casos filtrados.'}</div>
      </div>`;
    return;
  }

  const maxVal = usados[0][1].total;

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Material</th>
          <th style="width:55%;">Distribución</th>
          <th style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${usados.map(([col, {label, total}]) => {
          const pct = Math.round((total / maxVal) * 100);
          return `
            <tr>
              <td style="font-weight:600; white-space:nowrap;">${escapeHtml(label)}</td>
              <td>
                <div style="background:var(--surface-3); border-radius:6px; height:18px; overflow:hidden;">
                  <div style="width:${pct}%; background:var(--accent); height:100%; border-radius:6px; transition:width .3s;"></div>
                </div>
              </td>
              <td class="mono" style="text-align:right; font-weight:700; color:var(--accent);">${total % 1 === 0 ? total : total.toFixed(1)}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

const CABLE_MAT_TABLA_POR_PAGINA = 20;
let cableMatTablaPaginaActual = 1;

function getCableMaterialesUsados(c){
  return MATERIALES_CATALOGO
    .map(([label, col]) => ({ label, cantidad: parseFloat(c[col]) || 0 }))
    .filter(m => m.cantidad > 0);
}

function renderCableMaterialesTabla(resetPagina = true){
  if(resetPagina) cableMatTablaPaginaActual = 1;

  const wrap = document.getElementById('cableMaterialesTablaWrap');
  const busqueda = (document.getElementById('cableMatBuscador')?.value || '').trim().toLowerCase();

  let rows = getCableMaterialesFiltrados()
    .map(c => ({ caso: c, materiales: getCableMaterialesUsados(c) }))
    .filter(r => r.materiales.length > 0);

  if(busqueda){
    rows = rows.filter(r =>
      (r.caso.descripcion||'').toLowerCase().includes(busqueda) ||
      (r.caso.cuadrilla||'').toLowerCase().includes(busqueda) ||
      r.materiales.some(m => m.label.toLowerCase().includes(busqueda))
    );
  }

  document.getElementById('cableMatTablaCasosContados').textContent = `${rows.length} caso${rows.length !== 1 ? 's' : ''} con materiales`;

  if(rows.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
        <div class="empty-title">${busqueda ? 'Sin resultados para "'+escapeHtml(busqueda)+'"' : 'Ningún caso con materiales registrados'}</div>
        <div class="empty-desc">${busqueda ? 'Prueba con otro término de búsqueda.' : 'Los casos filtrados no tienen materiales con cantidad mayor a 0.'}</div>
      </div>`;
    return;
  }

  const totalPaginas = Math.max(1, Math.ceil(rows.length / CABLE_MAT_TABLA_POR_PAGINA));
  if(cableMatTablaPaginaActual > totalPaginas) cableMatTablaPaginaActual = totalPaginas;
  const startIdx = (cableMatTablaPaginaActual - 1) * CABLE_MAT_TABLA_POR_PAGINA;
  const pageRows = rows.slice(startIdx, startIdx + CABLE_MAT_TABLA_POR_PAGINA);

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Nombre del Técnico</th>
          <th>Zona</th>
          <th style="width:38%;">Materiales usados</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows.map(r => cableMatTablaRowHtml(r.caso, r.materiales)).join('')}
      </tbody>
    </table>
    <div class="pagination-bar">
      <div class="pagination-info">Mostrando ${startIdx + 1}–${Math.min(startIdx + CABLE_MAT_TABLA_POR_PAGINA, rows.length)} de ${rows.length} casos</div>
      <div class="pagination-controls" id="cableMatTablaPaginationControls"></div>
    </div>
  `;

  renderCableMatTablaPaginationControls(totalPaginas);

  wrap.querySelectorAll('[data-cbmtaction]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const caso = allCable.find(c => String(c.id) === String(id));
      if(caso) openCableViewModal(caso);
    });
  });
}

function cableMatTablaRowHtml(c, materiales){
  const MAX_CHIPS = 3;
  const visibles = materiales.slice(0, MAX_CHIPS);
  const restantes = materiales.length - visibles.length;
  const chipsHtml = visibles.map(m => `
    <span class="chip" style="background:var(--surface-3); color:var(--text);">
      ${escapeHtml(m.label)} <span class="mono" style="font-weight:700; margin-left:3px;">${m.cantidad % 1 === 0 ? m.cantidad : m.cantidad.toFixed(1)}</span>
    </span>`).join(' ');
  const masHtml = restantes > 0 ? `<span class="chip" style="background:var(--surface-3); color:var(--text-dim);">+${restantes} más</span>` : '';

  return `
    <tr>
      <td>
        <div class="person-name">${escapeHtml(c.descripcion || '—')}</div>
        <div class="person-puesto">${escapeHtml(c.mes || '')}${c.anos ? ' ' + escapeHtml(c.anos) : ''}</div>
      </td>
      <td>${escapeHtml(c.cuadrilla || '—')}</td>
      <td>${escapeHtml(c.zona || '—')}</td>
      <td>
        <div style="display:flex; flex-wrap:wrap; gap:5px;">${chipsHtml}${masHtml}</div>
      </td>
      <td>
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="icon-btn accent" data-cbmtaction="view" data-id="${c.id}" title="Ver caso completo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderCableMatTablaPaginationControls(totalPaginas){
  const wrap = document.getElementById('cableMatTablaPaginationControls');
  if(!wrap || totalPaginas <= 1) return;

  const pages = [];
  const cur = cableMatTablaPaginaActual;
  pages.push(1);
  if(cur > 3) pages.push('…');
  for(let p = Math.max(2, cur-1); p <= Math.min(totalPaginas-1, cur+1); p++) pages.push(p);
  if(cur < totalPaginas - 2) pages.push('…');
  if(totalPaginas > 1) pages.push(totalPaginas);

  const btnHtml = (label, page, disabled, active) => `
    <button class="page-btn ${active ? 'active' : ''}" ${disabled ? 'disabled' : ''} data-page="${page}">${label}</button>
  `;

  let html = '';
  html += btnHtml('‹', cur - 1, cur === 1, false);
  pages.forEach(p => {
    if(p === '…'){
      html += `<span class="page-ellipsis">…</span>`;
    } else {
      html += btnHtml(p, p, false, p === cur);
    }
  });
  html += btnHtml('›', cur + 1, cur === totalPaginas, false);

  wrap.innerHTML = html;

  wrap.querySelectorAll('.page-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      cableMatTablaPaginaActual = parseInt(btn.dataset.page, 10);
      renderCableMaterialesTabla(false);
    });
  });
}

function exportarCableResumenMateriales(){
  const casos = getCableMaterialesFiltrados();
  if(casos.length === 0){ showToast('No hay casos con los filtros actuales', 'error'); return; }

  const busqueda = (document.getElementById('cableMatBuscador')?.value || '').trim().toLowerCase();
  const totales = {};
  MATERIALES_CATALOGO.forEach(([label, col]) => {
    const total = casos.reduce((sum, c) => sum + (parseFloat(c[col]) || 0), 0);
    if(total > 0) totales[col] = { label, total };
  });

  let usados = Object.entries(totales).sort((a,b) => b[1].total - a[1].total);
  if(busqueda) usados = usados.filter(([, {label}]) => label.toLowerCase().includes(busqueda));

  if(usados.length === 0){ showToast('No hay materiales para exportar', 'error'); return; }

  const escapeXls = v => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let html = '<table border="1" style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:10pt;">';
  html += '<thead><tr>';
  ['Material','Total'].forEach(h => {
    html += `<th style="background-color:#0A6A99;color:#FFFFFF;font-weight:bold;padding:5px 14px;border:1px solid #08526E;white-space:nowrap;">${h}</th>`;
  });
  html += '</tr></thead><tbody>';
  usados.forEach(([col, {label, total}]) => {
    html += `<tr>
      <td style="padding:4px 12px;border:1px solid #DDDDDD;font-weight:600;">${escapeXls(label)}</td>
      <td style="padding:4px 12px;border:1px solid #DDDDDD;text-align:right;font-weight:700;">${total % 1 === 0 ? total : total.toFixed(1)}</td>
    </tr>`;
  });
  html += '</tbody></table>';

  const xlsFile = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
  <x:Name>Materiales Cable Color</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
  </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
  <body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsFile], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `cable-color-materiales-consolidado-${new Date().toISOString().slice(0,10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`Excel generado: ${usados.length} materiales de ${casos.length} casos`);
}

function exportarCableTablaMateriales(){
  const busqueda = (document.getElementById('cableMatBuscador')?.value || '').trim().toLowerCase();

  let rows = getCableMaterialesFiltrados()
    .map(c => ({ caso: c, materiales: getCableMaterialesUsados(c) }))
    .filter(r => r.materiales.length > 0);

  if(busqueda){
    rows = rows.filter(r =>
      (r.caso.descripcion||'').toLowerCase().includes(busqueda) ||
      (r.caso.cuadrilla||'').toLowerCase().includes(busqueda) ||
      r.materiales.some(m => m.label.toLowerCase().includes(busqueda))
    );
  }

  if(rows.length === 0){ showToast('No hay casos con materiales para exportar', 'error'); return; }

  const generalHeaders = [
    ['numero','#'],['zona','Zona'],['tipo_falla','Tipo de Falla'],['descripcion','Descripción'],
    ['escalonamiento','Fecha_Escalonamiento'],['anos','Año'],['mes','Mes'],['semana','Semana'],['ot','OT'],
    ['status','Estatus'],['cuadrilla','Cuadrilla'],['resolucion','Fecha_Resolucion'],
    ['tiempo_afectacion','Tiempo_Afectacion'],['latitud','Latitud'],['longitud','Longitud'],
    ['pausa','Pausa'],['tiempo_respuesta','Tiempo_Respuesta'],['causa','Causa'],
    ['sub_categoria','Sub_Categoria'],['observacion','Observacion'],
  ];
  const allHeaders = [...generalHeaders, ...MATERIALES_CATALOGO.map(([label,col]) => [col,label])];

  const dataRows = rows.map(r => {
    const c = r.caso;
    return allHeaders.map(([col,label]) => {
      let val = c[col];
      if(['escalonamiento','resolucion'].includes(col)){
        val = val ? new Date(val).toLocaleString('es-SV') : '';
      }
      return (val === null || val === undefined) ? '' : val;
    });
  });

  const escapeXlsHtml = (v) => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let html = '<table border="1" style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt;">';
  html += '<thead><tr>';
  allHeaders.forEach(([col,label]) => {
    html += `<th style="background-color:#0A6A99;color:#FFFFFF;font-weight:bold;padding:6px 10px;border:1px solid #08526E;white-space:nowrap;">${escapeXlsHtml(label)}</th>`;
  });
  html += '</tr></thead><tbody>';
  dataRows.forEach(row => {
    html += '<tr>';
    row.forEach(val => {
      html += `<td style="padding:5px 10px;border:1px solid #DDDDDD;">${escapeXlsHtml(val)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  const xlsHeader = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8">
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
    <x:Name>Tabla Materiales Cable Color</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head><body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsHeader], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `cable-color-tabla-materiales-${new Date().toISOString().slice(0,10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast(`Excel generado con ${rows.length} caso${rows.length === 1 ? '' : 's'} con materiales`);
}

document.getElementById('btnExportarCableMateriales').addEventListener('click', () => {
  if(cableMatTablaSubtab === 'tabla') exportarCableTablaMateriales();
  else exportarCableResumenMateriales();
});

document.getElementById('btnLimpiarCableMateriales').addEventListener('click', () => {
  ['cableMatAnoFilter','cableMatMesFilter','cableMatSemanaFilter','cableMatClasificacionFilter'].forEach(id => msSetVal(id, []));
  if(document.getElementById('cableMatBuscador')) document.getElementById('cableMatBuscador').value = '';
  updateCableCascadaFiltros('cableMat');
  renderCableMaterialesActivo();
});

document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){
    closeFormModal(); closeViewModal(); closeDeleteModal();
    closeSitioFormModal(); closeSitioViewModal(); closeSitioDeleteModal();
    closeVehiculoFormModal(); closeVehiculoViewModal(); closeVehiculoDeleteModal();
    closeCasoFormModal(); closeCasoViewModal(); closeCasoDeleteModal();
    closeHyveFormModal(); closeHyveViewModal(); closeHyveDeleteModal();
    closeUdpFormModal(); closeUdpViewModal(); closeUdpDeleteModal();
    closeCableFormModal(); closeCableViewModal(); closeCableDeleteModal();
  }
});

/* ============================================================
   INIT
============================================================ */
fetchPeople();

// Carga ligera del conteo de sitios para la tarjeta de Inicio
(async () => {
  try{
    const res = await fetch(`${SITIOS_REST_URL}?select=id`, { headers: sbHeaders });
    if(res.ok){
      const data = await res.json();
      const elStatSitios = document.getElementById('statSitios');
      if(elStatSitios) elStatSitios.textContent = data.length;
    }
  }catch(e){ console.error(e); }
})();

/* ============================================================
   ACTIVIDADES DIARIAS
============================================================ */