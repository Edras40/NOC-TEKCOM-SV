// ============================================================
// 03-hyve.js  —  Casos Hyve
// Parte de la aplicación NOC Tekcom. Se carga en orden desde index.html;
// NO reordenar las etiquetas <script> ni renombrar estos archivos.
// ============================================================

const HYVE_REST_URL = `${SUPABASE_URL}/rest/v1/casos_hyve`;
let allHyve = [];
let currentHyveEditId = null;
let pendingHyveDeleteId = null;
let viewingHyve = null;
let hyveMaterialesActuales = []; // [{label, col, cantidad}]

function initHyveSelects(){
  const anoSel = document.getElementById('h_anos');
  let anoOpts = '<option value="">—</option>';
  for(let y=2020;y<=2035;y++) anoOpts += `<option>${y}</option>`;
  anoSel.innerHTML = anoOpts;
}

async function fetchHyve(){
  initHyveSelects();
  const wrap = document.getElementById('hyveTableWrap');
  wrap.innerHTML = '<div class="loading-row"><div class="spinner"></div>Cargando casos…</div>';
  try{
    const res = await fetch(`${HYVE_REST_URL}?select=*&order=created_at.desc`, { headers: sbHeaders });
    if(!res.ok) throw new Error('Error al cargar casos (' + res.status + ')');
    allHyve = await res.json();
    if(typeof triggerMapaDraw === 'function') triggerMapaDraw();
    populateHyveFiltros();
    renderHyveTable();
    const tabActivo = document.querySelector('[data-subtab-h].active');
    if(tabActivo){
      if(tabActivo.dataset.subtabH === 'dashboard') initHyveDashboard();
      if(tabActivo.dataset.subtabH === 'materiales') initHyveMateriales();
    }
  }catch(err){
    console.error(err);
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div class="empty-title">No se pudo conectar con la base de datos</div>
        <div class="empty-desc">${err.message}. Verifica que la tabla <strong>casos_hyve</strong> exista en Supabase.</div>
      </div>`;
    showToast('Error al conectar con Supabase (casos_hyve)', 'error');
  }
}

function populateHyveFiltros(){
  const anoSel = document.getElementById('hyveAnoFilter');
  const curAno = msRestoreOrCurrent('hyveAnoFilter');
  const anosUnicos = [...new Set(allHyve.map(c=>c.anos).filter(v => v !== null && v !== undefined && v !== ''))].sort((a,b)=>a-b);
  anoSel.innerHTML = '<option value="">Todos los años</option>' +
    anosUnicos.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  msSetVal('hyveAnoFilter', curAno.filter(v => anosUnicos.map(String).includes(v)));

  updateHyveCascadaFiltros('hyve');
}

/* ---- Cascada genérica para HYVE (Año → Mes → Semana/Clasificación) ---- */
function updateHyveCascadaFiltros(prefijo){
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

  // Paso 1: dado el año → actualizar meses disponibles
  const paso1 = allHyve.filter(c => anoVal.length === 0 || anoVal.includes(String(c.anos)));
  setMesOpts(`${prefijo}MesFilter`, paso1.map(c=>c.mes));

  // Paso 2: dado año + mes → actualizar semanas (WK) y clasificaciones disponibles
  const paso2 = paso1.filter(c => mesVal.length === 0 || mesVal.includes(c.mes));
  if(document.getElementById(`${prefijo}SemanaFilter`)){
    setOpts(`${prefijo}SemanaFilter`, 'Todas las semanas', paso2.map(c=>hyveSemana(c)), true);
  }
  if(document.getElementById(`${prefijo}ClasificacionFilter`)){
    setOpts(`${prefijo}ClasificacionFilter`, 'Todas las clasificaciones', paso2.map(c=>c.clasificacion));
  }
}

const HYVE_POR_PAGINA = 20;
let hyvePaginaActual = 1;

function getHyveFiltrados(){
  const searchTerm = document.getElementById('hyveSearch').value.trim().toLowerCase();
  const statusFilter = msVal('hyveStatusFilter');
  const clasificacionFilter = msVal('hyveClasificacionFilter');
  const anoFilter = msVal('hyveAnoFilter');
  const mesFilter = msVal('hyveMesFilter');
  const semanaFilter = msVal('hyveSemanaFilter');

  return allHyve.filter(c => {
    const matchesSearch = !searchTerm || [c.casos,c.wk,c.ot,c.tecnico_encargado,c.clasificacion]
      .some(f => (f||'').toString().toLowerCase().includes(searchTerm));
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(c.status);
    const matchesClasificacion = clasificacionFilter.length === 0 || clasificacionFilter.includes(c.clasificacion);
    const matchesAno = anoFilter.length === 0 || anoFilter.includes(String(c.anos));
    const matchesMes = mesFilter.length === 0 || mesFilter.includes(c.mes);
    const matchesSemana = semanaFilter.length === 0 || semanaFilter.includes(hyveSemana(c));
    return matchesSearch && matchesStatus && matchesClasificacion && matchesAno && matchesMes && matchesSemana;
  });
}

function renderHyveTable(resetPagina = true){
  const wrap = document.getElementById('hyveTableWrap');
  if(resetPagina) hyvePaginaActual = 1;

  let rows = getHyveFiltrados();

  if(rows.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <div class="empty-title">${allHyve.length === 0 ? 'Aún no hay casos registrados' : 'Sin resultados'}</div>
        <div class="empty-desc">${allHyve.length === 0 ? 'Agrega el primer caso usando el botón "Agregar Caso".' : 'Prueba con otro término de búsqueda o filtro.'}</div>
      </div>`;
    return;
  }

  const totalPaginas = Math.max(1, Math.ceil(rows.length / HYVE_POR_PAGINA));
  if(hyvePaginaActual > totalPaginas) hyvePaginaActual = totalPaginas;
  const startIdx = (hyvePaginaActual - 1) * HYVE_POR_PAGINA;
  const pageRows = rows.slice(startIdx, startIdx + HYVE_POR_PAGINA);

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Casos</th>
          <th>Técnico Encargado</th>
          <th>Semana / OT</th>
          <th>Escalonamiento</th>
          <th>Causa</th>
          <th>Status</th>
          <th>SLA</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows.map(c => hyveRowHtml(c)).join('')}
      </tbody>
    </table>
    <div class="pagination-bar">
      <div class="pagination-info">Mostrando ${startIdx + 1}–${Math.min(startIdx + HYVE_POR_PAGINA, rows.length)} de ${rows.length} casos</div>
      <div class="pagination-controls" id="hyvePaginationControls"></div>
    </div>
  `;

  renderHyvePaginationControls(totalPaginas);

  wrap.querySelectorAll('[data-haction]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.haction;
      const caso = allHyve.find(c => String(c.id) === String(id));
      if(action === 'view') openHyveViewModal(caso);
      if(action === 'edit') openHyveFormModal(caso);
      if(action === 'delete') openHyveDeleteModal(caso);
    });
  });
}

function renderHyvePaginationControls(totalPaginas){
  const wrap = document.getElementById('hyvePaginationControls');
  if(!wrap || totalPaginas <= 1) return;

  const pages = [];
  const cur = hyvePaginaActual;
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
      hyvePaginaActual = parseInt(btn.dataset.page, 10);
      renderHyveTable(false);
    });
  });
}

function hyveRowHtml(c){
  const statusClass = statusChipClass(c.status);
  return `
    <tr>
      <td>
        <div class="person-name">${escapeHtml(c.casos || '—')}</div>
        <div class="person-puesto">${escapeHtml(c.clasificacion || '')}</div>
      </td>
      <td>${escapeHtml(c.tecnico_encargado || '—')}</td>
      <td class="mono">${escapeHtml(hyveSemana(c) || '—')} / ${escapeHtml(c.ot || '—')}</td>
      <td class="mono">${escapeHtml(plFechaHoraMilitar(c.escalonamiento) || '—')}</td>
      <td>${escapeHtml(c.causa || '—')}</td>
      <td>${c.status ? `<span class="status-chip ${statusClass}">${escapeHtml(c.status)}</span>` : '<span style="color:var(--text-faint);">—</span>'}</td>
      <td>${slaChipHtml(c.sla, 'hyve', c.clasificacion)}</td>
      <td>
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="icon-btn accent" data-haction="view" data-id="${c.id}" title="Ver">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="icon-btn" data-haction="edit" data-id="${c.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="icon-btn danger" data-haction="delete" data-id="${c.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

document.getElementById('hyveSearch').addEventListener('input', () => renderHyveTable(true));
document.getElementById('hyveStatusFilter').addEventListener('change', () => renderHyveTable(true));
document.getElementById('hyveClasificacionFilter').addEventListener('change', () => { updateHyveCascadaFiltros('hyve'); renderHyveTable(true); });
document.getElementById('hyveAnoFilter').addEventListener('change', () => { updateHyveCascadaFiltros('hyve'); renderHyveTable(true); });
document.getElementById('hyveMesFilter').addEventListener('change', () => { updateHyveCascadaFiltros('hyve'); renderHyveTable(true); });
document.getElementById('hyveSemanaFilter').addEventListener('change', () => renderHyveTable(true));

document.getElementById('btnLimpiarHyveListado').addEventListener('click', () => {
  ['hyveStatusFilter','hyveClasificacionFilter','hyveAnoFilter','hyveMesFilter','hyveSemanaFilter'].forEach(id => msSetVal(id, []));
  document.getElementById('hyveSearch').value = '';
  updateHyveCascadaFiltros('hyve');
  renderHyveTable(true);
});

/* ---- Cálculos automáticos de tiempos (reutiliza hhmmToMinutes/minutesToHHMM ya definidos) ---- */
function recalcHyveTiempos(){
  const escal = document.getElementById('h_escalonamiento').value;
  const resol = document.getElementById('h_resolucion').value;
  const slaTxt = document.getElementById('h_sla').value;

  let lapsoMin = null;
  if(escal && resol){
    const dEscal = new Date(escal);
    const dResol = new Date(resol);
    lapsoMin = (dResol - dEscal) / 60000;
    document.getElementById('h_lapso').value = minutesToHHMM(lapsoMin);
  } else {
    document.getElementById('h_lapso').value = '';
  }

  const slaMin = hhmmToMinutes(slaTxt);
  if(lapsoMin !== null && slaMin !== null){
    document.getElementById('h_intervalo').value = minutesToHHMM(lapsoMin - slaMin);
  } else {
    document.getElementById('h_intervalo').value = '';
  }

  // Semana: se deduce del escalonamiento, ya no se elige a mano.
  document.getElementById('h_wk').value = escal ? getSemanaISO(new Date(escal)) : '';

  // Validación Hyve = Resolución (es el cierre del caso).
  if(resol) document.getElementById('h_validacion_hyve').value = resol;

  // Tiempo de Validación Hyve = Validación Hyve - Solicitud de Validación-Tekcom
  const sVal = document.getElementById('h_s_validacion').value;
  const valHyve = document.getElementById('h_validacion_hyve').value;
  document.getElementById('h_t_validacion').value = (sVal && valHyve)
    ? minutesToHHMM((new Date(valHyve) - new Date(sVal)) / 60000)
    : '';
}
['h_escalonamiento','h_resolucion','h_sla','h_s_validacion','h_validacion_hyve'].forEach(id => {
  document.getElementById(id).addEventListener('input', recalcHyveTiempos);
});

/* ---- Buscador de técnico dentro del formulario de HYVE ---- */
const hTecnicoSearch = document.getElementById('h_tecnico_search');
const hTecnicoResults = document.getElementById('h_tecnico_results');

function setHyveTecnico(persona){
  document.getElementById('h_tecnico_id').value = persona ? persona.id : '';
  if(persona){
    const c = colorFor(persona.cuadrilla || persona.nombre || '');
    document.getElementById('h_tecnico_avatar').textContent = initials(persona.nombre);
    document.getElementById('h_tecnico_avatar').style.background = c;
    document.getElementById('h_tecnico_name').textContent = persona.nombre;
    document.getElementById('h_tecnico_meta').textContent = (persona.cuadrilla || '—') + ' · ' + (persona.puesto || '—');
    document.getElementById('h_tecnico_selected').style.display = 'block';
  } else {
    document.getElementById('h_tecnico_selected').style.display = 'none';
  }
}

hTecnicoSearch.addEventListener('input', () => {
  const term = hTecnicoSearch.value.trim().toLowerCase();
  if(!term){ hTecnicoResults.classList.remove('show'); hTecnicoResults.innerHTML=''; return; }
  const matches = allPeople.filter(p => (p.nombre||'').toLowerCase().includes(term)).slice(0, 20);
  if(matches.length === 0){
    hTecnicoResults.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    hTecnicoResults.innerHTML = matches.map(p => `
      <div class="site-result-item" data-htecnico-id="${escapeHtml(p.id)}">
        <div class="site-result-name">${escapeHtml(p.nombre)}</div>
        <div class="site-result-meta">${escapeHtml(p.cuadrilla || '—')} · ${escapeHtml(p.puesto || '—')}</div>
      </div>
    `).join('');
  }
  hTecnicoResults.classList.add('show');
});
hTecnicoResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-htecnico-id]');
  if(!item) return;
  const persona = allPeople.find(p => String(p.id) === String(item.dataset.htecnicoId));
  if(persona){ setHyveTecnico(persona); }
  hTecnicoSearch.value = '';
  hTecnicoResults.classList.remove('show');
  hTecnicoResults.innerHTML = '';
});
document.addEventListener('click', (e) => {
  if(!e.target.closest('#h_tecnico_search') && !e.target.closest('#h_tecnico_results')){
    hTecnicoResults.classList.remove('show');
  }
});
document.getElementById('h_tecnico_clear').addEventListener('click', () => setHyveTecnico(null));

/* ---- Gestión de materiales dentro del formulario de HYVE ---- */
function renderHyveMaterialList(){
  const wrap = document.getElementById('h_material_list');
  if(hyveMaterialesActuales.length === 0){
    wrap.innerHTML = '<div class="material-empty">Aún no se han agregado materiales a este caso.</div>';
    return;
  }
  wrap.innerHTML = hyveMaterialesActuales.map((m, i) => `
    <div class="material-item">
      <div class="material-item-name">${escapeHtml(m.label)}</div>
      <input type="number" min="0" step="1" value="${m.cantidad}" data-hmat-index="${i}" class="mat-qty-input">
      <button type="button" class="material-item-remove" data-hmat-remove="${i}" title="Quitar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `).join('');

  wrap.querySelectorAll('.mat-qty-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.hmatIndex, 10);
      hyveMaterialesActuales[idx].cantidad = parseFloat(inp.value) || 0;
    });
  });
  wrap.querySelectorAll('[data-hmat-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      hyveMaterialesActuales.splice(parseInt(btn.dataset.hmatRemove, 10), 1);
      renderHyveMaterialList();
    });
  });
}

const hMaterialSearch = document.getElementById('h_material_search');
const hMaterialResults = document.getElementById('h_material_results');

function addHyveMaterial(col){
  if(hyveMaterialesActuales.find(m => m.col === col)){
    showToast('Ese material ya está en la lista', 'error');
    return;
  }
  const entry = HYVE_MATERIALES_CATALOGO.find(([label, c]) => c === col);
  if(!entry) return;
  hyveMaterialesActuales.push({ label: entry[0], col, cantidad: 1 });
  renderHyveMaterialList();
}

hMaterialSearch.addEventListener('input', () => {
  const term = hMaterialSearch.value.trim().toLowerCase();
  if(!term){ hMaterialResults.classList.remove('show'); hMaterialResults.innerHTML=''; return; }
  const yaAgregados = new Set(hyveMaterialesActuales.map(m => m.col));
  const matches = HYVE_MATERIALES_CATALOGO.filter(([label,col]) =>
    !yaAgregados.has(col) && label.toLowerCase().includes(term)
  ).slice(0, 20);
  if(matches.length === 0){
    hMaterialResults.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    hMaterialResults.innerHTML = matches.map(([label,col]) => `
      <div class="site-result-item" data-hmaterial-col="${escapeHtml(col)}">
        <div class="site-result-name">${escapeHtml(label)}</div>
      </div>
    `).join('');
  }
  hMaterialResults.classList.add('show');
});
hMaterialResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-hmaterial-col]');
  if(!item) return;
  addHyveMaterial(item.dataset.hmaterialCol);
  hMaterialSearch.value = '';
  hMaterialResults.classList.remove('show');
  hMaterialResults.innerHTML = '';
  hMaterialSearch.focus();
});
document.addEventListener('click', (e) => {
  if(!e.target.closest('#h_material_search') && !e.target.closest('#h_material_results')){
    hMaterialResults.classList.remove('show');
  }
});

/* ---- Form modal (Agregar / Editar HYVE) ---- */
const hyveFormModalOverlay = document.getElementById('hyveFormModalOverlay');

function openHyveFormModal(caso){
  if(document.getElementById('h_anos').options.length <= 1){
    initHyveSelects();
  }

  // Sugerencias de Clasificación basadas en los casos ya existentes
  const clasifsUnicas = [...new Set(allHyve.map(c => c.clasificacion).filter(Boolean))].sort();
  document.getElementById('h_clasificacion_list').innerHTML =
    clasifsUnicas.map(v => `<option value="${escapeHtml(v)}"></option>`).join('');

  // WK: semana 1-54
  const wkSel = document.getElementById('h_wk');
  let wkOpts = '<option value="">—</option>';
  for(let i=1;i<=54;i++) wkOpts += `<option>${i}</option>`;
  wkSel.innerHTML = wkOpts;

  // Poblar Sub Categoría con las mismas opciones que Movistar
  const hSubCatSel = document.getElementById('h_sub_categoria');
  hSubCatSel.innerHTML = '<option value="">—</option>' +
    SUB_CATEGORIA_OPCIONES.map(s => `<option>${escapeHtml(s)}</option>`).join('');

  currentHyveEditId = caso ? caso.id : null;
  document.getElementById('hyveFormModalTitle').textContent = caso ? 'Editar Caso' : 'Agregar Caso';

  document.getElementById('h_clasificacion').value = caso?.clasificacion || '';
  document.getElementById('h_casos').value = caso?.casos || '';
  document.getElementById('h_wk').value = caso ? (caso.wk ?? '') : getSemanaISO(new Date());
  // Se repuebla el catálogo antes de asignar, por si cambió el listado de operadores.
  opActualizarSelect('h_operador_tekcom', 'tekcom');
  opActualizarSelect('h_operador_hyve', 'hyve');
  setSelectValorTolerante('h_operador_tekcom', caso?.operador_tekcom);
  setSelectValorTolerante('h_operador_hyve', caso?.operador_hyve);
  document.getElementById('h_s_validacion').value = caso?.s_validacion ? isoToDatetimeLocal(caso.s_validacion) : '';
  document.getElementById('h_validacion_hyve').value = caso?.validacion_hyve ? isoToDatetimeLocal(caso.validacion_hyve) : '';
  document.getElementById('h_ot').value = caso?.ot || '';
  document.getElementById('h_status').value = caso?.status || '';
  document.getElementById('h_causa').value = caso ? (caso.causa || '') : 'Corte de Fibra';
  document.getElementById('h_sub_categoria').value = caso?.sub_categoria || '';
  document.getElementById('h_coordenadas').value = formatCoordenadas(caso?.latitud, caso?.longitud);

  if(caso){
    document.getElementById('h_anos').value = caso.anos ?? '';
    document.getElementById('h_mes').value = caso.mes || '';
    document.getElementById('h_escalonamiento').value = isoToDatetimeLocal(caso.escalonamiento);
  } else {
    const now = new Date();
    document.getElementById('h_anos').value = now.getFullYear();
    document.getElementById('h_mes').value = MESES_ES[now.getMonth()];
    document.getElementById('h_escalonamiento').value = isoToDatetimeLocal(now.toISOString());
  }

  document.getElementById('h_resolucion').value = isoToDatetimeLocal(caso?.resolucion);
  document.getElementById('h_sla').value = caso?.sla || '';

  // Técnico
  const personaExistente = caso?.tecnico_encargado
    ? allPeople.find(p => p.nombre === caso.tecnico_encargado)
    : null;
  hTecnicoSearch.value = '';
  if(personaExistente){
    setHyveTecnico(personaExistente);
  } else if(caso?.tecnico_encargado){
    document.getElementById('h_tecnico_id').value = '';
    document.getElementById('h_tecnico_selected').style.display = 'block';
    document.getElementById('h_tecnico_avatar').textContent = initials(caso.tecnico_encargado);
    document.getElementById('h_tecnico_avatar').style.background = colorFor(caso.tecnico_encargado);
    document.getElementById('h_tecnico_name').textContent = caso.tecnico_encargado;
    document.getElementById('h_tecnico_meta').textContent = 'No encontrado en Listado del Personal';
  } else {
    setHyveTecnico(null);
  }

  // Materiales: reconstruir desde columnas con valor > 0
  hyveMaterialesActuales = [];
  if(caso){
    HYVE_MATERIALES_CATALOGO.forEach(([label, col]) => {
      const val = caso[col];
      if(val !== null && val !== undefined && Number(val) > 0){
        hyveMaterialesActuales.push({ label, col, cantidad: Number(val) });
      }
    });
  }
  renderHyveMaterialList();

  recalcHyveTiempos();
  hyveFormModalOverlay.classList.add('active');
}
function closeHyveFormModal(){ hyveFormModalOverlay.classList.remove('active'); currentHyveEditId = null; }

document.getElementById('btnAddHyve').addEventListener('click', () => openHyveFormModal(null));
document.getElementById('hyveFormModalClose').addEventListener('click', closeHyveFormModal);
document.getElementById('hyveFormCancelBtn').addEventListener('click', closeHyveFormModal);
hyveFormModalOverlay.addEventListener('click', (e) => { if(e.target === hyveFormModalOverlay) closeHyveFormModal(); });

document.getElementById('hyveFormSaveBtn').addEventListener('click', async () => {
  const tecnicoId = document.getElementById('h_tecnico_id').value;
  const tecnicoPersona = tecnicoId ? allPeople.find(p => String(p.id) === String(tecnicoId)) : null;
  const nombreTecnico = tecnicoPersona ? tecnicoPersona.nombre : (document.getElementById('h_tecnico_name').textContent !== '—' ? document.getElementById('h_tecnico_name').textContent : null);

  const toNumOrNull = (id) => {
    const v = document.getElementById(id).value.trim();
    return v === '' ? null : parseFloat(v);
  };
  const toIntOrNull = (id) => {
    const v = document.getElementById(id).value.trim();
    return v === '' ? null : parseInt(v, 10);
  };
  const toIsoOrNull = (id) => {
    const v = document.getElementById(id).value;
    return v ? new Date(v).toISOString() : null;
  };
  const toTextOrNull = (id) => {
    const v = document.getElementById(id).value.trim();
    return v === '' ? null : v;
  };

  const payload = {
    clasificacion: toTextOrNull('h_clasificacion'),
    anos: toIntOrNull('h_anos'),
    mes: toTextOrNull('h_mes'),
    casos: toTextOrNull('h_casos'),
    status: toTextOrNull('h_status'),
    wk: toTextOrNull('h_wk'),
    ot: toTextOrNull('h_ot'),
    tecnico_encargado: nombreTecnico,
    escalonamiento: toIsoOrNull('h_escalonamiento'),
    resolucion: toIsoOrNull('h_resolucion'),
    lapso: toTextOrNull('h_lapso'),
    sla: toTextOrNull('h_sla'),
    intervalo: toTextOrNull('h_intervalo'),
    causa: toTextOrNull('h_causa'),
    sub_categoria: toTextOrNull('h_sub_categoria'),
    operador_tekcom: toTextOrNull('h_operador_tekcom'),
    operador_hyve: toTextOrNull('h_operador_hyve'),
    s_validacion: toIsoOrNull('h_s_validacion'),
    validacion_hyve: toIsoOrNull('h_validacion_hyve'),
    t_validacion: toTextOrNull('h_t_validacion'),
    latitud: parseCoordenadasNum(document.getElementById('h_coordenadas').value).lat,
    longitud: parseCoordenadasNum(document.getElementById('h_coordenadas').value).lng,
  };

  const materialesMap = {};
  hyveMaterialesActuales.forEach(m => { materialesMap[m.col] = m.cantidad; });
  HYVE_MATERIALES_CATALOGO.forEach(([label, col]) => {
    payload[col] = materialesMap.hasOwnProperty(col) ? materialesMap[col] : 0;
  });

  const saveBtn = document.getElementById('hyveFormSaveBtn');
  saveBtn.textContent = 'Guardando...';
  saveBtn.disabled = true;

  try{
    let res;
    if(currentHyveEditId){
      res = await fetch(`${HYVE_REST_URL}?id=eq.${currentHyveEditId}`, {
        method:'PATCH',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(HYVE_REST_URL, {
        method:'POST',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    }
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al guardar'); }

    showToast(currentHyveEditId ? 'Caso actualizado' : 'Caso agregado');
    closeHyveFormModal();
    await fetchHyve();
  }catch(err){
    console.error(err);
    showToast('No se pudo guardar: ' + err.message, 'error');
  }finally{
    saveBtn.textContent = 'Guardar';
    saveBtn.disabled = false;
  }
});

/* ---- View modal (Ver HYVE) ---- */
const hyveViewModalOverlay = document.getElementById('hyveViewModalOverlay');

// Tiempo de Validación Hyve: usa lo guardado y, si no existe, lo calcula con la
// Resolución como fecha de validación. Sin solicitud registrada devuelve 00:00.
// Semana del caso: la guardada o, si falta, la deducida del escalonamiento.
function hyveSemana(caso){
  if(caso.wk) return String(caso.wk);
  return caso.escalonamiento ? String(getSemanaISO(new Date(caso.escalonamiento))) : '';
}

function hyveTiempoValidacion(caso){
  if(caso.t_validacion) return caso.t_validacion;
  const fin = caso.validacion_hyve || caso.resolucion;
  if(!caso.s_validacion || !fin) return '00:00';
  const min = (new Date(fin) - new Date(caso.s_validacion)) / 60000;
  return isNaN(min) ? '00:00' : minutesToHHMM(min);
}

function openHyveViewModal(caso){
  viewingHyve = caso;
  const grid = document.getElementById('hyveViewGrid');
  const fieldsMap = [
    ['Clasificación', caso.clasificacion], ['Casos', caso.casos],
    // Respaldo para registros anteriores: si no se guardó, se deduce al mostrarlo.
    ['Semana', hyveSemana(caso)],
    ['OT', caso.ot],
    ['Técnico Encargado', caso.tecnico_encargado], ['Status', caso.status],
    ['Causa', caso.causa], ['Sub Categoría', caso.sub_categoria],
    ['Año', caso.anos], ['Mes', caso.mes],
    ['Escalonamiento', plFechaHoraMilitar(caso.escalonamiento)],
    ['Resolución', plFechaHoraMilitar(caso.resolucion)],
    ['Lapso', caso.lapso], ['SLA', caso.sla], ['Intervalo', caso.intervalo],
    ['Operador NOC-Tekcom', caso.operador_tekcom], ['Operador NOC-Hyve', caso.operador_hyve],
    ['Solicitud de Validación-Tekcom', plFechaHoraMilitar(caso.s_validacion) || 'No aplica'],
    // Validación Hyve es el cierre del caso: si está vacía, se muestra la Resolución.
    ['Validación Hyve', plFechaHoraMilitar(caso.validacion_hyve || caso.resolucion) || 'No aplica'],
    ['Tiempo de Validación Hyve', hyveTiempoValidacion(caso)],
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

  const matWrap = document.getElementById('hyveViewMateriales');
  const materialesUsados = HYVE_MATERIALES_CATALOGO.filter(([label,col]) => caso[col] && Number(caso[col]) > 0);
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

  hyveViewModalOverlay.classList.add('active');
}
function closeHyveViewModal(){ hyveViewModalOverlay.classList.remove('active'); viewingHyve = null; }

document.getElementById('hyveViewModalClose').addEventListener('click', closeHyveViewModal);
document.getElementById('hyveViewCloseBtn').addEventListener('click', closeHyveViewModal);
hyveViewModalOverlay.addEventListener('click', (e) => { if(e.target === hyveViewModalOverlay) closeHyveViewModal(); });
document.getElementById('hyveViewEditBtn').addEventListener('click', () => {
  const c = viewingHyve;
  closeHyveViewModal();
  openHyveFormModal(c);
});

/* ---- Delete modal (Eliminar HYVE) ---- */
const hyveDeleteModalOverlay = document.getElementById('hyveDeleteModalOverlay');

function openHyveDeleteModal(caso){
  pendingHyveDeleteId = caso.id;
  document.getElementById('hyveDeleteName').textContent = caso.casos || 'este caso';
  hyveDeleteModalOverlay.classList.add('active');
}
function closeHyveDeleteModal(){ hyveDeleteModalOverlay.classList.remove('active'); pendingHyveDeleteId = null; }

document.getElementById('hyveDeleteCancelBtn').addEventListener('click', closeHyveDeleteModal);
hyveDeleteModalOverlay.addEventListener('click', (e) => { if(e.target === hyveDeleteModalOverlay) closeHyveDeleteModal(); });

document.getElementById('hyveDeleteConfirmBtn').addEventListener('click', async () => {
  if(!pendingHyveDeleteId) return;
  const btn = document.getElementById('hyveDeleteConfirmBtn');
  btn.textContent = 'Eliminando...';
  btn.disabled = true;
  try{
    const res = await fetch(`${HYVE_REST_URL}?id=eq.${pendingHyveDeleteId}`, {
      method:'DELETE',
      headers: sbHeaders
    });
    if(!res.ok) throw new Error('Error al eliminar');
    showToast('Caso eliminado');
    closeHyveDeleteModal();
    await fetchHyve();
  }catch(err){
    console.error(err);
    showToast('No se pudo eliminar: ' + err.message, 'error');
  }finally{
    btn.textContent = 'Eliminar';
    btn.disabled = false;
  }
});

/* ---- Exportar a Excel (incluye TODAS las columnas, incluso materiales en 0) ---- */
document.getElementById('btnExportarHyve').addEventListener('click', () => {
  const casosAExportar = getHyveFiltrados();
  if(casosAExportar.length === 0){
    showToast('No hay casos que coincidan con los filtros para exportar', 'error');
    return;
  }

  const generalHeaders = [
    ['clasificacion','Clasificación'],['anos','Año'],['mes','Mes'],['casos','Casos'],
    ['status','Estatus'],['wk','Semana'],['ot','OT'],['tecnico_encargado','Técnico Encargado'],
    ['escalonamiento','Escalonamiento'],['resolucion','Resolución'],['lapso','Lapso'],
    ['sla','SLA'],['intervalo','Intervalo'],['causa','Causa'],['sub_categoria','Sub Categoria'],
    ['materiales','Materiales'],['observacion','Observacion'],
    ['latitud','Latitud'],['longitud','Longitud'],
  ];
  const allHeaders = [...generalHeaders, ...HYVE_MATERIALES_CATALOGO.map(([label,col]) => [col,label])];

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
    <x:Name>Casos Hyve</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head><body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsHeader], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `hyve-${new Date().toISOString().slice(0,10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast(`Excel generado con ${casosAExportar.length} caso${casosAExportar.length === 1 ? '' : 's'} filtrado${casosAExportar.length === 1 ? '' : 's'}`);
});


/* ============================================================
   DASHBOARD - HYVE
============================================================ */
let hyveDashMesTab = 'casos';
let hyveDashCausaTab = 'casos';
let hyveDashTecTab = 'casos';

function getHyveDashFiltrados(){
  const clasif = msVal('hyveDashClasificacionFilter');
  const ano = msVal('hyveDashAnoFilter');
  const mes = msVal('hyveDashMesFilter');
  const semana = msVal('hyveDashSemanaFilter');
  const folio = document.getElementById('hyveDashFolioSearch').value.trim().toLowerCase();

  return allHyve.filter(c => {
    if(c.status !== 'Finalizado') return false;
    const mClasif = clasif.length === 0 || clasif.includes(c.clasificacion);
    const mAno = ano.length === 0 || ano.includes(String(c.anos));
    const mMes = mes.length === 0 || mes.includes(c.mes);
    const mSemana = semana.length === 0 || semana.includes(String(c.wk));
    const mFolio = !folio || (c.casos||'').toLowerCase().includes(folio) || (c.wk||'').toLowerCase().includes(folio) || (c.ot||'').toLowerCase().includes(folio);
    return mClasif && mAno && mMes && mSemana && mFolio;
  });
}

function initHyveDashboard(){
  const anoSel = document.getElementById('hyveDashAnoFilter');
  const curAno = msRestoreOrCurrent('hyveDashAnoFilter');
  const anosUnicos = [...new Set(allHyve.map(c=>c.anos).filter(v => v !== null && v !== undefined && v !== ''))].sort((a,b)=>a-b);
  anoSel.innerHTML = '<option value="">Todos</option>' +
    anosUnicos.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  msSetVal('hyveDashAnoFilter', curAno.filter(v => anosUnicos.map(String).includes(v)));

  updateHyveCascadaFiltros('hyveDash');

  renderHyveDashboardMain();

  ['hyveDashClasificacionFilter','hyveDashAnoFilter','hyveDashMesFilter','hyveDashSemanaFilter'].forEach(id => {
    const el = document.getElementById(id);
    if(!el._hyveDashListener){
      el._hyveDashListener = true;
      el.addEventListener('change', () => {
        if(id === 'hyveDashAnoFilter' || id === 'hyveDashMesFilter' || id === 'hyveDashClasificacionFilter'){
          updateHyveCascadaFiltros('hyveDash');
        }
        renderHyveDashboardMain();
      });
    }
  });
  const folioEl = document.getElementById('hyveDashFolioSearch');
  if(!folioEl._hyveDashListener){
    folioEl._hyveDashListener = true;
    folioEl.addEventListener('input', renderHyveDashboardMain);
  }
  const limpiarBtn = document.getElementById('btnHyveDashLimpiarFiltros');
  if(!limpiarBtn._hyveDashListener){
    limpiarBtn._hyveDashListener = true;
    limpiarBtn.addEventListener('click', () => {
      ['hyveDashClasificacionFilter','hyveDashAnoFilter','hyveDashMesFilter','hyveDashSemanaFilter'].forEach(id => msSetVal(id, []));
      document.getElementById('hyveDashFolioSearch').value = '';
      updateHyveCascadaFiltros('hyveDash');
      renderHyveDashboardMain();
    });
  }
  const pdfBtn = document.getElementById('btnHyveDashExportarPDF');
  if(pdfBtn && !pdfBtn._hyveDashListener){
    pdfBtn._hyveDashListener = true;
    pdfBtn.addEventListener('click', () => exportarDashboardPDF('subtabh-dashboard', 'Dashboard - Casos Atendidos HYVE'));
  }
  const pptxBtn = document.getElementById('btnHyveDashExportarPPTX');
  if(pptxBtn && !pptxBtn._hyveDashListener){
    pptxBtn._hyveDashListener = true;
    pptxBtn.addEventListener('click', () => exportarHyvePPTXNativo());
  }
}

function renderHyveGraficoMes(datos){
  const mesWrap = document.getElementById('hyveDashChartMes');
  document.querySelectorAll('.hyve-mes-tab-btn').forEach(btn => {
    const isActive = btn.dataset.hyvemestab === hyveDashMesTab;
    btn.style.background = isActive ? 'var(--accent)' : 'transparent';
    btn.style.color = isActive ? '#fff' : 'var(--text-dim)';
  });

  // Si hay un Mes seleccionado, agrupar por Semana (WK); si no, agrupar por Mes
  const mesActivo = msVal('hyveDashMesFilter').length > 0;
  const agrupador = mesActivo ? 'wk' : 'mes';

  const titulo = document.getElementById('hyveDashChartMesTitulo');
  const tituloTexto = agrupador === 'wk'
    ? (hyveDashMesTab === 'casos' ? 'Casos Por Semana' : 'SLA Prom. Por Semana')
    : (hyveDashMesTab === 'casos' ? 'Casos Por Mes' : 'SLA Prom. Por Mes');
  if(titulo) titulo.textContent = tituloTexto;

  if(hyveDashMesTab === 'casos'){
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
    mesWrap.innerHTML = `<canvas id="hyveCanvasMes" style="width:100%;height:240px;"></canvas>`;
    dibujarLineaMes('hyveCanvasMes', labels, vals, 'num');
  } else {
    const slaSuma = {}; const slaCount = {};
    datos.forEach(c => {
      const key = c[agrupador];
      if(key === null || key === undefined || key === '') return;
      const min = hhmmToMinutesDash(c.sla);
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
    mesWrap.innerHTML = `<canvas id="hyveCanvasMes" style="width:100%;height:240px;"></canvas>`;
    dibujarLineaMes('hyveCanvasMes', labels, vals, 'hhmm');
  }
}

// ---- Validación Hyve (Dashboard de Hyve) ----
// Mide cuánto tarda la validación desde que Tekcom la solicita hasta que Hyve
// la confirma. Solo entran los casos que tienen registrada la solicitud.
function renderHyveDashValidacion(datos){
  const wrap = document.getElementById('hyveDashValidacion');
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
    <button type="button" id="hyveDashValidacionToggle"
      style="width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px;
             padding:10px 12px; border:1px solid var(--border); border-radius:8px;
             background:var(--surface-2); cursor:pointer; font-size:13px; color:var(--text);">
      <span>Casos con validación</span>
      <span style="display:flex; align-items:center; gap:6px; font-weight:700;">
        ${conValidacion.length}
        <svg id="hyveDashValidacionChevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;transition:transform .15s;">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </span>
    </button>
    <div id="hyveDashValidacionLista" style="display:none; margin-top:10px; max-height:230px; overflow-y:auto;">
      ${conValidacion.map(({ caso, min }) => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;
                    padding:7px 2px; border-bottom:1px solid var(--border);">
          <div style="min-width:0;">
            <div style="font-size:12.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(caso.ot || '—')}
            </div>
            <div style="font-size:11px; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(caso.casos || '')}
            </div>
          </div>
          <span style="font-size:12.5px; font-weight:700; flex-shrink:0;
                       color:${min > VALIDACION_MOVISTAR_META_MIN ? '#DC2626' : '#16A34A'};">
            ${minutesToHHMM(min)}
          </span>
        </div>`).join('')}
    </div>
  `;

  const btn = document.getElementById('hyveDashValidacionToggle');
  const lista = document.getElementById('hyveDashValidacionLista');
  const chevron = document.getElementById('hyveDashValidacionChevron');
  btn.addEventListener('click', () => {
    const abierto = lista.style.display !== 'none';
    lista.style.display = abierto ? 'none' : '';
    chevron.style.transform = abierto ? '' : 'rotate(180deg)';
  });
}

function renderHyveRankingCausas(datos){
  setTabStyle(document.querySelectorAll('.hyve-causa-tab-btn'), hyveDashCausaTab, 'data-hyvecausatab');
  const wrap = document.getElementById('hyveDashRankingCausas');
  if(hyveDashCausaTab === 'casos'){
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

function renderHyveGraficoTecnico(datos){
  setTabStyle(document.querySelectorAll('.hyve-tec-tab-btn'), hyveDashTecTab, 'data-hyvetectab');
  const wrap = document.getElementById('hyveDashChartTecnico');
  if(hyveDashTecTab === 'casos'){
    const porTec = {};
    datos.forEach(c => { if(c.tecnico_encargado){ porTec[c.tecnico_encargado]=(porTec[c.tecnico_encargado]||0)+1; } });
    const ordered = Object.entries(porTec).sort((a,b)=>b[1]-a[1]);
    const maxV = Math.max(...ordered.map(([,v])=>v),1);
    wrap.innerHTML = ordered.length ? `<div class="dash-bar-wrap">${ordered.map(([tec,count]) => {
      const pct=Math.round((count/maxV)*100);
      return `<div class="dash-bar-row">
        <div class="dash-bar-label" title="${escapeHtml(tec)}">${escapeHtml(tec.split(' ').slice(0,2).join(' '))}</div>
        <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.max(pct,3)}%;"><span class="dash-bar-val">${count}</span></div></div>
      </div>`;}).join('')}</div>` : '<div class="material-empty">Sin datos</div>';
  } else {
    const slaData = calcSlaPromPorGrupo(datos, 'tecnico_encargado');
    const maxV = Math.max(...slaData.map(([,v])=>v),1);
    wrap.innerHTML = slaData.length ? `<div class="dash-bar-wrap">${slaData.map(([tec,min]) => {
      const pct=Math.round((min/maxV)*100);
      return `<div class="dash-bar-row">
        <div class="dash-bar-label" title="${escapeHtml(tec)}">${escapeHtml(tec.split(' ').slice(0,2).join(' '))}</div>
        <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.max(pct,3)}%;"><span class="dash-bar-val">${minToHHMM(min)}</span></div></div>
      </div>`;}).join('')}</div>` : '<div class="material-empty">Sin datos de SLA</div>';
  }
}

function renderHyveDashboardMain(){
  const datos = getHyveDashFiltrados();

  document.getElementById('hyveDashTotalCasos').textContent = datos.length;

  const SLA_UMBRAL = slaLimite('hyve');
  const slaMinutos = datos.map(c => hhmmToMinutesDash(c.sla)).filter(v => v !== null && v >= 0);
  const slaEl = document.getElementById('hyveDashSlaPromedio');
  const slaCard = document.getElementById('hyveDashSlaCard');
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
    const min = hhmmToMinutesDash(c.sla);
    if(min === null || min < 0) return;
    if(min <= SLA_UMBRAL) dentro++; else fuera++;
  });
  const total = dentro + fuera;
  const pctDentro = total > 0 ? Math.round((dentro/total)*100) : 0;
  const pctFuera  = total > 0 ? Math.round((fuera/total)*100)  : 0;
  document.getElementById('hyveDashDentroSla').textContent = total > 0 ? `${dentro} (${pctDentro}%)` : '—';
  document.getElementById('hyveDashFueraSla').textContent  = total > 0 ? `${fuera} (${pctFuera}%)`  : '—';

  setTimeout(() => {
    renderHyveGraficoMes(datos);
    document.querySelectorAll('.hyve-mes-tab-btn').forEach(btn => {
      btn.onclick = () => { hyveDashMesTab = btn.dataset.hyvemestab; renderHyveGraficoMes(getHyveDashFiltrados()); };
    });
    renderHyveRankingCausas(datos);
    renderHyveDashValidacion(datos);
    document.querySelectorAll('.hyve-causa-tab-btn').forEach(btn => {
      btn.onclick = () => { hyveDashCausaTab = btn.dataset.hyvecausatab; renderHyveRankingCausas(getHyveDashFiltrados()); };
    });
    renderHyveGraficoTecnico(datos);
    document.querySelectorAll('.hyve-tec-tab-btn').forEach(btn => {
      btn.onclick = () => { hyveDashTecTab = btn.dataset.hyvetectab; renderHyveGraficoTecnico(getHyveDashFiltrados()); };
    });
  }, 100);
}

/* ============================================================
   MATERIALES — HYVE (Resumen + Tabla por caso)
============================================================ */
let hyveMaterialesInitialized = false;

function getHyveMaterialesFiltrados(){
  const ano = msVal('hyveMatAnoFilter');
  const mes = msVal('hyveMatMesFilter');
  const semana = msVal('hyveMatSemanaFilter');
  const clasif = msVal('hyveMatClasificacionFilter');

  return allHyve.filter(c => {
    const mAno = ano.length === 0 || ano.includes(String(c.anos));
    const mMes = mes.length === 0 || mes.includes(c.mes);
    const mSemana = semana.length === 0 || semana.includes(String(c.wk));
    const mClasif = clasif.length === 0 || clasif.includes(c.clasificacion);
    return mAno && mMes && mSemana && mClasif;
  });
}

function initHyveMateriales(){
  if(hyveMaterialesInitialized){ renderHyveMaterialesActivo(); return; }
  hyveMaterialesInitialized = true;

  const anoSel = document.getElementById('hyveMatAnoFilter');
  const curAno = msRestoreOrCurrent('hyveMatAnoFilter');
  const anosUnicos = [...new Set(allHyve.map(c=>c.anos).filter(v => v !== null && v !== undefined && v !== ''))].sort((a,b)=>a-b);
  anoSel.innerHTML = '<option value="">Todos</option>' +
    anosUnicos.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  msSetVal('hyveMatAnoFilter', curAno.filter(v => anosUnicos.map(String).includes(v)));

  updateHyveCascadaFiltros('hyveMat');

  ['hyveMatAnoFilter','hyveMatMesFilter','hyveMatSemanaFilter','hyveMatClasificacionFilter'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      if(id !== 'hyveMatSemanaFilter'){
        updateHyveCascadaFiltros('hyveMat');
      }
      renderHyveMaterialesActivo();
    });
  });
  document.getElementById('hyveMatBuscador').addEventListener('input', renderHyveMaterialesActivo);

  document.querySelectorAll('[data-hyvemattab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-hyvemattab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('hyvemattab-resumen').classList.toggle('active', btn.dataset.hyvemattab === 'resumen');
      document.getElementById('hyvemattab-tabla').classList.toggle('active', btn.dataset.hyvemattab === 'tabla');
      hyveMatTablaSubtab = btn.dataset.hyvemattab;
      renderHyveMaterialesActivo();
    });
  });

  renderHyveMaterialesActivo();
}

let hyveMatTablaSubtab = 'resumen';
function renderHyveMaterialesActivo(){
  if(hyveMatTablaSubtab === 'tabla') renderHyveMaterialesTabla();
  else renderHyveMateriales();
}

function renderHyveMateriales(){
  const casos = getHyveMaterialesFiltrados();
  const wrap = document.getElementById('hyveMaterialesResumenWrap');
  const busqueda = (document.getElementById('hyveMatBuscador')?.value || '').trim().toLowerCase();
  document.getElementById('hyveMatCasosContados').textContent = `${casos.length} caso${casos.length !== 1 ? 's' : ''} en el filtro`;

  const totales = {};
  HYVE_MATERIALES_CATALOGO.forEach(([label, col]) => {
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

const HYVE_MAT_TABLA_POR_PAGINA = 20;
let hyveMatTablaPaginaActual = 1;

function getHyveMaterialesUsados(c){
  return HYVE_MATERIALES_CATALOGO
    .map(([label, col]) => ({ label, cantidad: parseFloat(c[col]) || 0 }))
    .filter(m => m.cantidad > 0);
}

function renderHyveMaterialesTabla(resetPagina = true){
  if(resetPagina) hyveMatTablaPaginaActual = 1;

  const wrap = document.getElementById('hyveMaterialesTablaWrap');
  const busqueda = (document.getElementById('hyveMatBuscador')?.value || '').trim().toLowerCase();

  let rows = getHyveMaterialesFiltrados()
    .map(c => ({ caso: c, materiales: getHyveMaterialesUsados(c) }))
    .filter(r => r.materiales.length > 0);

  if(busqueda){
    rows = rows.filter(r =>
      (r.caso.casos||'').toLowerCase().includes(busqueda) ||
      (r.caso.tecnico_encargado||'').toLowerCase().includes(busqueda) ||
      r.materiales.some(m => m.label.toLowerCase().includes(busqueda))
    );
  }

  document.getElementById('hyveMatTablaCasosContados').textContent = `${rows.length} caso${rows.length !== 1 ? 's' : ''} con materiales`;

  if(rows.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
        <div class="empty-title">${busqueda ? 'Sin resultados para "'+escapeHtml(busqueda)+'"' : 'Ningún caso con materiales registrados'}</div>
        <div class="empty-desc">${busqueda ? 'Prueba con otro término de búsqueda.' : 'Los casos filtrados no tienen materiales con cantidad mayor a 0.'}</div>
      </div>`;
    return;
  }

  const totalPaginas = Math.max(1, Math.ceil(rows.length / HYVE_MAT_TABLA_POR_PAGINA));
  if(hyveMatTablaPaginaActual > totalPaginas) hyveMatTablaPaginaActual = totalPaginas;
  const startIdx = (hyveMatTablaPaginaActual - 1) * HYVE_MAT_TABLA_POR_PAGINA;
  const pageRows = rows.slice(startIdx, startIdx + HYVE_MAT_TABLA_POR_PAGINA);

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Casos</th>
          <th>Técnico Encargado</th>
          <th>Clasificación</th>
          <th style="width:38%;">Materiales usados</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows.map(r => hyveMatTablaRowHtml(r.caso, r.materiales)).join('')}
      </tbody>
    </table>
    <div class="pagination-bar">
      <div class="pagination-info">Mostrando ${startIdx + 1}–${Math.min(startIdx + HYVE_MAT_TABLA_POR_PAGINA, rows.length)} de ${rows.length} casos</div>
      <div class="pagination-controls" id="hyveMatTablaPaginationControls"></div>
    </div>
  `;

  renderHyveMatTablaPaginationControls(totalPaginas);

  wrap.querySelectorAll('[data-hmtaction]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const caso = allHyve.find(c => String(c.id) === String(id));
      if(caso) openHyveViewModal(caso);
    });
  });
}

function hyveMatTablaRowHtml(c, materiales){
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
        <div class="person-name">${escapeHtml(c.casos || '—')}</div>
        <div class="person-puesto">${escapeHtml(c.mes || '')}${c.anos ? ' ' + escapeHtml(c.anos) : ''}</div>
      </td>
      <td>${escapeHtml(c.tecnico_encargado || '—')}</td>
      <td>${escapeHtml(c.clasificacion || '—')}</td>
      <td>
        <div style="display:flex; flex-wrap:wrap; gap:5px;">${chipsHtml}${masHtml}</div>
      </td>
      <td>
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="icon-btn accent" data-hmtaction="view" data-id="${c.id}" title="Ver caso completo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderHyveMatTablaPaginationControls(totalPaginas){
  const wrap = document.getElementById('hyveMatTablaPaginationControls');
  if(!wrap || totalPaginas <= 1) return;

  const pages = [];
  const cur = hyveMatTablaPaginaActual;
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
      hyveMatTablaPaginaActual = parseInt(btn.dataset.page, 10);
      renderHyveMaterialesTabla(false);
    });
  });
}

function exportarHyveResumenMateriales(){
  const casos = getHyveMaterialesFiltrados();
  if(casos.length === 0){ showToast('No hay casos con los filtros actuales', 'error'); return; }

  const busqueda = (document.getElementById('hyveMatBuscador')?.value || '').trim().toLowerCase();
  const totales = {};
  HYVE_MATERIALES_CATALOGO.forEach(([label, col]) => {
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
  <x:Name>Materiales HYVE</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
  </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
  <body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsFile], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `hyve-materiales-consolidado-${new Date().toISOString().slice(0,10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`Excel generado: ${usados.length} materiales de ${casos.length} casos`);
}

function exportarHyveTablaMateriales(){
  const busqueda = (document.getElementById('hyveMatBuscador')?.value || '').trim().toLowerCase();

  let rows = getHyveMaterialesFiltrados()
    .map(c => ({ caso: c, materiales: getHyveMaterialesUsados(c) }))
    .filter(r => r.materiales.length > 0);

  if(busqueda){
    rows = rows.filter(r =>
      (r.caso.casos||'').toLowerCase().includes(busqueda) ||
      (r.caso.tecnico_encargado||'').toLowerCase().includes(busqueda) ||
      r.materiales.some(m => m.label.toLowerCase().includes(busqueda))
    );
  }

  if(rows.length === 0){ showToast('No hay casos con materiales para exportar', 'error'); return; }

  const generalHeaders = [
    ['clasificacion','Clasificación'],['anos','Año'],['mes','Mes'],['casos','Casos'],
    ['status','Estatus'],['wk','Semana'],['ot','OT'],['tecnico_encargado','Técnico Encargado'],
    ['escalonamiento','Escalonamiento'],['resolucion','Resolución'],['lapso','Lapso'],
    ['sla','SLA'],['intervalo','Intervalo'],['causa','Causa'],['sub_categoria','Sub Categoria'],
    ['materiales','Materiales'],['observacion','Observacion'],
    ['latitud','Latitud'],['longitud','Longitud'],
  ];
  const allHeaders = [...generalHeaders, ...HYVE_MATERIALES_CATALOGO.map(([label,col]) => [col,label])];

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
    <x:Name>Tabla Materiales HYVE</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head><body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsHeader], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `hyve-tabla-materiales-${new Date().toISOString().slice(0,10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast(`Excel generado con ${rows.length} caso${rows.length === 1 ? '' : 's'} con materiales`);
}

document.getElementById('btnExportarHyveMateriales').addEventListener('click', () => {
  if(hyveMatTablaSubtab === 'tabla') exportarHyveTablaMateriales();
  else exportarHyveResumenMateriales();
});

document.getElementById('btnLimpiarHyveMateriales').addEventListener('click', () => {
  ['hyveMatAnoFilter','hyveMatMesFilter','hyveMatSemanaFilter','hyveMatClasificacionFilter'].forEach(id => msSetVal(id, []));
  if(document.getElementById('hyveMatBuscador')) document.getElementById('hyveMatBuscador').value = '';
  updateHyveCascadaFiltros('hyveMat');
  renderHyveMaterialesActivo();
});

/* ============================================================
   UDP (Casos Atendidos + Materiales, sin Dashboard)
============================================================ */
const UDP_REST_URL = `${SUPABASE_URL}/rest/v1/casos_udp`;