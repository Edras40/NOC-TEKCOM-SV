// ============================================================
// 04-udp.js  —  UDP y catálogo de escuelas
// Parte de la aplicación NOC Tekcom. Se carga en orden desde index.html;
// NO reordenar las etiquetas <script> ni renombrar estos archivos.
// ============================================================

const ESCUELAS_REST_URL = `${SUPABASE_URL}/rest/v1/escuelas_udp`;
let allUdp = [];
let currentUdpEditId = null;
let pendingUdpDeleteId = null;
let viewingUdp = null;
let udpMaterialesActuales = [];

// UDP no tiene columna "Año" propia; se calcula a partir de Escalonamiento
async function fetchUdp(){
  const wrap = document.getElementById('udpTableWrap');
  wrap.innerHTML = '<div class="loading-row"><div class="spinner"></div>Cargando casos…</div>';
  try{
    // id.desc deja arriba lo último agregado aunque el registro no traiga created_at.
    const res = await fetch(`${UDP_REST_URL}?select=*&order=id.desc`, { headers: sbHeaders });
    if(!res.ok) throw new Error('Error al cargar casos (' + res.status + ')');
    allUdp = await res.json();
    if(typeof triggerMapaDraw === 'function') triggerMapaDraw();
    populateUdpFiltros();
    renderUdpTable();
    const tabActivo = document.querySelector('[data-subtab-u].active');
    if(tabActivo && tabActivo.dataset.subtabU === 'materiales') initUdpMateriales();
  }catch(err){
    console.error(err);
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div class="empty-title">No se pudo conectar con la base de datos</div>
        <div class="empty-desc">${err.message}. Verifica que la tabla <strong>casos_udp</strong> exista en Supabase.</div>
      </div>`;
    showToast('Error al conectar con Supabase (casos_udp)', 'error');
  }
}

function populateUdpFiltros(){
  const causaSel = document.getElementById('udpCausaFilter');
  const curCausa = msRestoreOrCurrent('udpCausaFilter');
  const causasUnicas = [...new Set(allUdp.map(c=>c.causa).filter(Boolean))].sort();
  causaSel.innerHTML = '<option value="">Todas las causas</option>' +
    causasUnicas.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  msSetVal('udpCausaFilter', curCausa.filter(v => causasUnicas.map(String).includes(v)));

  const anoSel = document.getElementById('udpAnoFilter');
  const curAno = msRestoreOrCurrent('udpAnoFilter');
  const anosUnicos = [...new Set(allUdp.map(c=>udpAno(c)).filter(v => v !== null && v !== undefined))].sort((a,b)=>a-b);
  anoSel.innerHTML = '<option value="">Todos los años</option>' +
    anosUnicos.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  msSetVal('udpAnoFilter', curAno.filter(v => anosUnicos.map(String).includes(v)));

  updateUdpCascadaFiltros('udp');
}

/* ---- Cascada genérica para UDP (Año → Mes → Día/Clasificación) ---- */
function updateUdpCascadaFiltros(prefijo){
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

  // Dado el año → actualizar meses disponibles
  const paso1 = allUdp.filter(c => anoVal.length === 0 || anoVal.includes(String(udpAno(c))));
  if(document.getElementById(`${prefijo}MesFilter`)){
    setMesOpts(`${prefijo}MesFilter`, paso1.map(c=>c.mes));
  }

  // Dado año + mes → actualizar días y clasificaciones disponibles
  const paso2 = paso1.filter(c => mesVal.length === 0 || mesVal.includes(c.mes));
  if(document.getElementById(`${prefijo}DiaFilter`)){
    setOpts(`${prefijo}DiaFilter`, 'Todos los días', paso2.map(c=>c.dia), true);
  }
  if(document.getElementById(`${prefijo}ClasificacionFilter`)){
    setOpts(`${prefijo}ClasificacionFilter`, 'Todas las clasificaciones', paso2.map(c=>c.clasificacion));
  }
}

const UDP_POR_PAGINA = 20;
let udpPaginaActual = 1;

function getUdpFiltrados(){
  const searchTerm = document.getElementById('udpSearch').value.trim().toLowerCase();
  const clasifFilter = msVal('udpClasificacionFilter');
  const anoFilter = msVal('udpAnoFilter');
  const mesFilter = msVal('udpMesFilter');
  const diaFilter = msVal('udpDiaFilter');
  const causaFilter = msVal('udpCausaFilter');

  return allUdp.filter(c => {
    const matchesSearch = !searchTerm || [c.casos,c.id_externo,c.nombre_del_tecnico,c.red]
      .some(f => (f||'').toString().toLowerCase().includes(searchTerm));
    const matchesClasif = clasifFilter.length === 0 || clasifFilter.includes(c.clasificacion);
    const matchesAno = anoFilter.length === 0 || anoFilter.includes(String(udpAno(c)));
    const matchesMes = mesFilter.length === 0 || mesFilter.includes(c.mes);
    const matchesDia = diaFilter.length === 0 || diaFilter.includes(String(c.dia));
    const matchesCausa = causaFilter.length === 0 || causaFilter.includes(c.causa);
    return matchesSearch && matchesClasif && matchesAno && matchesMes && matchesDia && matchesCausa;
  });
}

function renderUdpTable(resetPagina = true){
  const wrap = document.getElementById('udpTableWrap');
  if(resetPagina) udpPaginaActual = 1;

  let rows = getUdpFiltrados();

  if(rows.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <div class="empty-title">${allUdp.length === 0 ? 'Aún no hay casos registrados' : 'Sin resultados'}</div>
        <div class="empty-desc">${allUdp.length === 0 ? 'Agrega el primer caso usando el botón "Agregar Caso".' : 'Prueba con otro término de búsqueda o filtro.'}</div>
      </div>`;
    return;
  }

  const totalPaginas = Math.max(1, Math.ceil(rows.length / UDP_POR_PAGINA));
  if(udpPaginaActual > totalPaginas) udpPaginaActual = totalPaginas;
  const startIdx = (udpPaginaActual - 1) * UDP_POR_PAGINA;
  const pageRows = rows.slice(startIdx, startIdx + UDP_POR_PAGINA);

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Casos</th>
          <th>Técnico</th>
          <th>Escalonamiento</th>
          <th>Causa</th>
          <th>Status</th>
          <th>SLA</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows.map(c => udpRowHtml(c)).join('')}
      </tbody>
    </table>
    <div class="pagination-bar">
      <div class="pagination-info">Mostrando ${startIdx + 1}–${Math.min(startIdx + UDP_POR_PAGINA, rows.length)} de ${rows.length} casos</div>
      <div class="pagination-controls" id="udpPaginationControls"></div>
    </div>
  `;

  renderUdpPaginationControls(totalPaginas);

  wrap.querySelectorAll('[data-uaction]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.uaction;
      const caso = allUdp.find(c => String(c.id) === String(id));
      if(action === 'view') openUdpViewModal(caso);
      if(action === 'edit') openUdpFormModal(caso);
      if(action === 'delete') openUdpDeleteModal(caso);
    });
  });
}

function renderUdpPaginationControls(totalPaginas){
  const wrap = document.getElementById('udpPaginationControls');
  if(!wrap || totalPaginas <= 1) return;

  const pages = [];
  const cur = udpPaginaActual;
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
      udpPaginaActual = parseInt(btn.dataset.page, 10);
      renderUdpTable(false);
    });
  });
}

function udpRowHtml(c){
  return `
    <tr>
      <td>
        <div class="person-name">${escapeHtml(c.casos || '—')}</div>
        <div class="person-puesto">${escapeHtml(c.clasificacion || '')}${c.id_externo ? ' · ' + escapeHtml(c.id_externo) : ''}</div>
      </td>
      <td>${escapeHtml(c.nombre_del_tecnico || '—')}</td>
      <td class="mono">${escapeHtml(plFechaHoraMilitar(c.escalonamiento) || '—')}</td>
      <td>${escapeHtml(c.causa || '—')}</td>
      <td>${estatusUdpChip(c.status)}</td>
      <td>${slaChipHtml(c.sla, 'udp', c.clasificacion)}</td>
      <td>
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="icon-btn accent" data-uaction="view" data-id="${c.id}" title="Ver">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="icon-btn" data-uaction="edit" data-id="${c.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="icon-btn danger" data-uaction="delete" data-id="${c.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

document.getElementById('udpSearch').addEventListener('input', () => renderUdpTable(true));
document.getElementById('udpClasificacionFilter').addEventListener('change', () => renderUdpTable(true));
document.getElementById('udpAnoFilter').addEventListener('change', () => { updateUdpCascadaFiltros('udp'); renderUdpTable(true); });
document.getElementById('udpMesFilter').addEventListener('change', () => { updateUdpCascadaFiltros('udp'); renderUdpTable(true); });
document.getElementById('udpDiaFilter').addEventListener('change', () => renderUdpTable(true));
document.getElementById('udpCausaFilter').addEventListener('change', () => renderUdpTable(true));

document.getElementById('btnLimpiarUdpListado').addEventListener('click', () => {
  ['udpClasificacionFilter','udpAnoFilter','udpMesFilter','udpDiaFilter','udpCausaFilter'].forEach(id => msSetVal(id, []));
  document.getElementById('udpSearch').value = '';
  updateUdpCascadaFiltros('udp');
  renderUdpTable(true);
});

/* ---- Buscador de técnico dentro del formulario de UDP ---- */
/* ---- Cálculo automático de UDP: SLA = Resolución - Escalonamiento; Segundo = SLA × 86400 ---- */
function recalcUdpTiempos(){
  const escal = document.getElementById('u_escalonamiento').value;
  const resol = document.getElementById('u_resolucion').value;

  // SLA = Resolución - Escalonamiento
  let slaMin = null;
  if(escal && resol){
    const dEscal = new Date(escal);
    const dResol = new Date(resol);
    slaMin = (dResol - dEscal) / 60000;
    document.getElementById('u_sla').value = minutesToHHMM(slaMin);
  }
  // Si faltan las fechas, se deja el valor de SLA que ya hubiera (por ejemplo, casos antiguos)

  // Segundo = SLA (fracción de día) * 86400
  if(slaMin === null){
    slaMin = hhmmToMinutes(document.getElementById('u_sla').value);
  }
  if(slaMin !== null){
    // El campo `segundo` ya no se muestra ni se guarda: la tabla casos_udp
    // no tiene esa columna. Se mantiene el input oculto por compatibilidad.
    const fraccionDia = slaMin / 1440;
    document.getElementById('u_segundo').value = Math.round(fraccionDia * 86400);
  } else {
    document.getElementById('u_segundo').value = '';
  }
}
['u_escalonamiento','u_resolucion'].forEach(id => {
  document.getElementById(id).addEventListener('input', recalcUdpTiempos);
});

const uTecnicoSearch = document.getElementById('u_tecnico_search');
const uTecnicoResults = document.getElementById('u_tecnico_results');

function setUdpTecnico(persona){
  document.getElementById('u_tecnico_id').value = persona ? persona.id : '';
  if(persona){
    const c = colorFor(persona.cuadrilla || persona.nombre || '');
    document.getElementById('u_tecnico_avatar').textContent = initials(persona.nombre);
    document.getElementById('u_tecnico_avatar').style.background = c;
    document.getElementById('u_tecnico_name').textContent = persona.nombre;
    document.getElementById('u_tecnico_meta').textContent = (persona.cuadrilla || '—') + ' · ' + (persona.puesto || '—');
    document.getElementById('u_tecnico_selected').style.display = 'block';
  } else {
    document.getElementById('u_tecnico_selected').style.display = 'none';
  }
}

uTecnicoSearch.addEventListener('input', () => {
  const term = uTecnicoSearch.value.trim().toLowerCase();
  if(!term){ uTecnicoResults.classList.remove('show'); uTecnicoResults.innerHTML=''; return; }
  const matches = allPeople.filter(p => (p.nombre||'').toLowerCase().includes(term)).slice(0, 20);
  if(matches.length === 0){
    uTecnicoResults.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    uTecnicoResults.innerHTML = matches.map(p => `
      <div class="site-result-item" data-utecnico-id="${escapeHtml(p.id)}">
        <div class="site-result-name">${escapeHtml(p.nombre)}</div>
        <div class="site-result-meta">${escapeHtml(p.cuadrilla || '—')} · ${escapeHtml(p.puesto || '—')}</div>
      </div>
    `).join('');
  }
  uTecnicoResults.classList.add('show');
});
uTecnicoResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-utecnico-id]');
  if(!item) return;
  const persona = allPeople.find(p => String(p.id) === String(item.dataset.utecnicoId));
  if(persona){ setUdpTecnico(persona); }
  uTecnicoSearch.value = '';
  uTecnicoResults.classList.remove('show');
  uTecnicoResults.innerHTML = '';
});
document.addEventListener('click', (e) => {
  if(!e.target.closest('#u_tecnico_search') && !e.target.closest('#u_tecnico_results')){
    uTecnicoResults.classList.remove('show');
  }
});
document.getElementById('u_tecnico_clear').addEventListener('click', () => setUdpTecnico(null));

/* ---- Gestión de materiales dentro del formulario de UDP ---- */
function renderUdpMaterialList(){
  const wrap = document.getElementById('u_material_list');
  if(udpMaterialesActuales.length === 0){
    wrap.innerHTML = '<div class="material-empty">Aún no se han agregado materiales a este caso.</div>';
    return;
  }
  wrap.innerHTML = udpMaterialesActuales.map((m, i) => `
    <div class="material-item">
      <div class="material-item-name">${escapeHtml(m.label)}</div>
      <input type="number" min="0" step="1" value="${m.cantidad}" data-umat-index="${i}" class="mat-qty-input">
      <button type="button" class="material-item-remove" data-umat-remove="${i}" title="Quitar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `).join('');

  wrap.querySelectorAll('.mat-qty-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.umatIndex, 10);
      udpMaterialesActuales[idx].cantidad = parseFloat(inp.value) || 0;
    });
  });
  wrap.querySelectorAll('[data-umat-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      udpMaterialesActuales.splice(parseInt(btn.dataset.umatRemove, 10), 1);
      renderUdpMaterialList();
    });
  });
}

const uMaterialSearch = document.getElementById('u_material_search');
const uMaterialResults = document.getElementById('u_material_results');

function addUdpMaterial(col){
  if(udpMaterialesActuales.find(m => m.col === col)){
    showToast('Ese material ya está en la lista', 'error');
    return;
  }
  const entry = UDP_MATERIALES_CATALOGO.find(([label, c]) => c === col);
  if(!entry) return;
  udpMaterialesActuales.push({ label: entry[0], col, cantidad: 1 });
  renderUdpMaterialList();
}

uMaterialSearch.addEventListener('input', () => {
  const term = uMaterialSearch.value.trim().toLowerCase();
  if(!term){ uMaterialResults.classList.remove('show'); uMaterialResults.innerHTML=''; return; }
  const yaAgregados = new Set(udpMaterialesActuales.map(m => m.col));
  const matches = UDP_MATERIALES_CATALOGO.filter(([label,col]) =>
    !yaAgregados.has(col) && label.toLowerCase().includes(term)
  ).slice(0, 20);
  if(matches.length === 0){
    uMaterialResults.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    uMaterialResults.innerHTML = matches.map(([label,col]) => `
      <div class="site-result-item" data-umaterial-col="${escapeHtml(col)}">
        <div class="site-result-name">${escapeHtml(label)}</div>
      </div>
    `).join('');
  }
  uMaterialResults.classList.add('show');
});
uMaterialResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-umaterial-col]');
  if(!item) return;
  addUdpMaterial(item.dataset.umaterialCol);
  uMaterialSearch.value = '';
  uMaterialResults.classList.remove('show');
  uMaterialResults.innerHTML = '';
  uMaterialSearch.focus();
});
document.addEventListener('click', (e) => {
  if(!e.target.closest('#u_material_search') && !e.target.closest('#u_material_results')){
    uMaterialResults.classList.remove('show');
  }
});

/* ---- Form modal (Agregar / Editar UDP) ---- */
const udpFormModalOverlay = document.getElementById('udpFormModalOverlay');

function openUdpFormModal(caso){
  // Poblar Sub Categoría con las mismas opciones que Movistar
  const subCatSel = document.getElementById('u_sub_categoria');
  subCatSel.innerHTML = '<option value="">—</option>' +
    SUB_CATEGORIA_OPCIONES.map(s => `<option>${escapeHtml(s)}</option>`).join('');

  currentUdpEditId = caso ? caso.id : null;
  document.getElementById('udpFormModalTitle').textContent = caso ? 'Editar Caso' : 'Agregar Caso';

  document.getElementById('u_clasificacion').value = caso?.clasificacion || '';
  document.getElementById('u_red').value = caso?.red || '';
  setSelectValorTolerante('u_status', caso?.status || (caso ? '' : 'En Proceso'));
  document.getElementById('u_casos').value = caso?.casos || '';
  document.getElementById('u_id_externo').value = caso?.id_externo || '';
  document.getElementById('u_causa').value = caso ? (caso.causa || '') : 'Corte de Fibra';
  document.getElementById('u_sub_categoria').value = caso?.sub_categoria || '';
  document.getElementById('u_observacion').value = caso?.observacion || '';
  document.getElementById('u_dia').value = caso?.dia ?? '';

  if(caso){
    document.getElementById('u_mes').value = caso.mes || '';
    document.getElementById('u_escalonamiento').value = isoToDatetimeLocal(caso.escalonamiento);
  } else {
    const now = new Date();
    document.getElementById('u_mes').value = MESES_ES[now.getMonth()];
    document.getElementById('u_dia').value = now.getDate();
    document.getElementById('u_escalonamiento').value = isoToDatetimeLocal(now.toISOString());
  }

  document.getElementById('u_resolucion').value = isoToDatetimeLocal(caso?.resolucion);
  document.getElementById('u_sla').value = caso?.sla || '';
  recalcUdpTiempos();

  // Técnico
  const personaExistente = caso?.nombre_del_tecnico
    ? allPeople.find(p => p.nombre === caso.nombre_del_tecnico)
    : null;
  uTecnicoSearch.value = '';
  if(personaExistente){
    setUdpTecnico(personaExistente);
  } else if(caso?.nombre_del_tecnico){
    document.getElementById('u_tecnico_id').value = '';
    document.getElementById('u_tecnico_selected').style.display = 'block';
    document.getElementById('u_tecnico_avatar').textContent = initials(caso.nombre_del_tecnico);
    document.getElementById('u_tecnico_avatar').style.background = colorFor(caso.nombre_del_tecnico);
    document.getElementById('u_tecnico_name').textContent = caso.nombre_del_tecnico;
    document.getElementById('u_tecnico_meta').textContent = 'No encontrado en Listado del Personal';
  } else {
    setUdpTecnico(null);
  }

  // Materiales: reconstruir desde columnas con valor > 0
  udpMaterialesActuales = [];
  if(caso){
    UDP_MATERIALES_CATALOGO.forEach(([label, col]) => {
      const val = caso[col];
      if(val !== null && val !== undefined && Number(val) > 0){
        udpMaterialesActuales.push({ label, col, cantidad: Number(val) });
      }
    });
  }
  renderUdpMaterialList();

  const chkVaciosUdp = document.getElementById('udpSoloVacios');
  if(chkVaciosUdp) chkVaciosUdp.checked = false;
  udpAplicarFiltroVacios();
  udpFormModalOverlay.classList.add('active');
}
function closeUdpFormModal(){ udpFormModalOverlay.classList.remove('active'); currentUdpEditId = null; }

document.getElementById('btnAddUdp').addEventListener('click', () => openUdpFormModal(null));
document.getElementById('udpFormModalClose').addEventListener('click', closeUdpFormModal);
document.getElementById('udpFormCancelBtn').addEventListener('click', closeUdpFormModal);
udpFormModalOverlay.addEventListener('click', (e) => { if(e.target === udpFormModalOverlay) closeUdpFormModal(); });

document.getElementById('udpFormSaveBtn').addEventListener('click', async () => {
  const tecnicoId = document.getElementById('u_tecnico_id').value;
  const tecnicoPersona = tecnicoId ? allPeople.find(p => String(p.id) === String(tecnicoId)) : null;
  const nombreTecnico = tecnicoPersona ? tecnicoPersona.nombre : (document.getElementById('u_tecnico_name').textContent !== '—' ? document.getElementById('u_tecnico_name').textContent : null);

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
  const toNumOrNull = (id) => {
    const v = document.getElementById(id).value.trim();
    return v === '' ? null : Number(v);
  };

  const payload = {
    status: toTextOrNull('u_status'),
    clasificacion: toTextOrNull('u_clasificacion'),
    red: toTextOrNull('u_red'),
    casos: toTextOrNull('u_casos'),
    id_externo: toTextOrNull('u_id_externo'),
    nombre_del_tecnico: nombreTecnico,
    mes: toTextOrNull('u_mes'),
    dia: toIntOrNull('u_dia'),
    escalonamiento: toIsoOrNull('u_escalonamiento'),
    resolucion: toIsoOrNull('u_resolucion'),
    sla: toTextOrNull('u_sla'),
    causa: toTextOrNull('u_causa'),
    sub_categoria: toTextOrNull('u_sub_categoria'),
    observacion: toTextOrNull('u_observacion'),
  };

  const materialesMap = {};
  udpMaterialesActuales.forEach(m => { materialesMap[m.col] = m.cantidad; });
  UDP_MATERIALES_CATALOGO.forEach(([label, col]) => {
    payload[col] = materialesMap.hasOwnProperty(col) ? materialesMap[col] : 0;
  });

  const saveBtn = document.getElementById('udpFormSaveBtn');
  saveBtn.textContent = 'Guardando...';
  saveBtn.disabled = true;

  try{
    let res;
    if(currentUdpEditId){
      res = await fetch(`${UDP_REST_URL}?id=eq.${currentUdpEditId}`, {
        method:'PATCH',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(UDP_REST_URL, {
        method:'POST',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    }
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al guardar'); }

    showToast(currentUdpEditId ? 'Caso actualizado' : 'Caso agregado');
    closeUdpFormModal();
    await fetchUdp();
  }catch(err){
    console.error(err);
    showToast('No se pudo guardar: ' + err.message, 'error');
  }finally{
    saveBtn.textContent = 'Guardar';
    saveBtn.disabled = false;
  }
});

/* ---- View modal (Ver UDP) ---- */
const udpViewModalOverlay = document.getElementById('udpViewModalOverlay');

function openUdpViewModal(caso){
  viewingUdp = caso;
  const grid = document.getElementById('udpViewGrid');
  const fieldsMap = [
    ['Clasificación', caso.clasificacion], ['Casos', caso.casos], ['ID', caso.id_externo],
    ['Técnico', caso.nombre_del_tecnico], ['Causa', caso.causa], ['Sub Categoría', caso.sub_categoria],
    ['Mes', caso.mes], ['Día', caso.dia],
    ['Escalonamiento', plFechaHoraMilitar(caso.escalonamiento)],
    ['Resolución', plFechaHoraMilitar(caso.resolucion)],
    ['SLA', caso.sla],
    ['Materiales (nota)', caso.materiales], ['Observación', caso.observacion],
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

  const matWrap = document.getElementById('udpViewMateriales');
  const materialesUsados = UDP_MATERIALES_CATALOGO.filter(([label,col]) => caso[col] && Number(caso[col]) > 0);
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

  udpViewModalOverlay.classList.add('active');
}
function closeUdpViewModal(){ udpViewModalOverlay.classList.remove('active'); viewingUdp = null; }

document.getElementById('udpViewModalClose').addEventListener('click', closeUdpViewModal);
document.getElementById('udpViewCloseBtn').addEventListener('click', closeUdpViewModal);
udpViewModalOverlay.addEventListener('click', (e) => { if(e.target === udpViewModalOverlay) closeUdpViewModal(); });
document.getElementById('udpViewEditBtn').addEventListener('click', () => {
  const c = viewingUdp;
  closeUdpViewModal();
  openUdpFormModal(c);
});

/* ---- Delete modal (Eliminar UDP) ---- */
const udpDeleteModalOverlay = document.getElementById('udpDeleteModalOverlay');

function openUdpDeleteModal(caso){
  pendingUdpDeleteId = caso.id;
  document.getElementById('udpDeleteName').textContent = caso.casos || 'este caso';
  udpDeleteModalOverlay.classList.add('active');
}
function closeUdpDeleteModal(){ udpDeleteModalOverlay.classList.remove('active'); pendingUdpDeleteId = null; }

document.getElementById('udpDeleteCancelBtn').addEventListener('click', closeUdpDeleteModal);
udpDeleteModalOverlay.addEventListener('click', (e) => { if(e.target === udpDeleteModalOverlay) closeUdpDeleteModal(); });

document.getElementById('udpDeleteConfirmBtn').addEventListener('click', async () => {
  if(!pendingUdpDeleteId) return;
  const btn = document.getElementById('udpDeleteConfirmBtn');
  btn.textContent = 'Eliminando...';
  btn.disabled = true;
  try{
    const res = await fetch(`${UDP_REST_URL}?id=eq.${pendingUdpDeleteId}`, {
      method:'DELETE',
      headers: sbHeaders
    });
    if(!res.ok) throw new Error('Error al eliminar');
    showToast('Caso eliminado');
    closeUdpDeleteModal();
    await fetchUdp();
  }catch(err){
    console.error(err);
    showToast('No se pudo eliminar: ' + err.message, 'error');
  }finally{
    btn.textContent = 'Eliminar';
    btn.disabled = false;
  }
});

/* ---- Exportar a Excel (incluye TODAS las columnas, incluso materiales en 0) ---- */
document.getElementById('btnExportarUdp').addEventListener('click', () => {
  const casosAExportar = getUdpFiltrados();
  if(casosAExportar.length === 0){
    showToast('No hay casos que coincidan con los filtros para exportar', 'error');
    return;
  }

  const generalHeaders = [
    ['clasificacion','Clasificación'],['red','Red'],['casos','Casos'],['id_externo','ID'],['nombre_del_tecnico','Nombre del Técnico'],
    ['mes','Mes'],['dia','Dia'],['escalonamiento','Escalonamiento'],['resolucion','Resolución'],
    ['sla','SLA'],['causa','Causa'],['sub_categoria','Sub Categoria'],
    ['materiales','Materiales'],['observacion','Observacion'],
  ];
  const allHeaders = [...generalHeaders, ...UDP_MATERIALES_CATALOGO.map(([label,col]) => [col,label])];

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
    <x:Name>UDP</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head><body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsHeader], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `udp-${new Date().toISOString().slice(0,10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast(`Excel generado con ${casosAExportar.length} caso${casosAExportar.length === 1 ? '' : 's'} filtrado${casosAExportar.length === 1 ? '' : 's'}`);
});

/* ============================================================
   MATERIALES — UDP (Resumen + Tabla por caso)
============================================================ */
let udpMaterialesInitialized = false;

function getUdpMaterialesFiltrados(){
  const clasif = msVal('udpMatClasificacionFilter');
  const ano = msVal('udpMatAnoFilter');
  const mes = msVal('udpMatMesFilter');
  const dia = msVal('udpMatDiaFilter');

  return allUdp.filter(c => {
    const mClasif = clasif.length === 0 || clasif.includes(c.clasificacion);
    const mAno = ano.length === 0 || ano.includes(String(udpAno(c)));
    const mMes = mes.length === 0 || mes.includes(c.mes);
    const mDia = dia.length === 0 || dia.includes(String(c.dia));
    return mClasif && mAno && mMes && mDia;
  });
}

function initUdpMateriales(){
  if(udpMaterialesInitialized){ renderUdpMaterialesActivo(); return; }
  udpMaterialesInitialized = true;

  const MESES_ORDEN = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const anoSel = document.getElementById('udpMatAnoFilter');
  const curAno = msRestoreOrCurrent('udpMatAnoFilter');
  const anosUnicos = [...new Set(allUdp.map(c=>udpAno(c)).filter(v => v !== null && v !== undefined))].sort((a,b)=>a-b);
  anoSel.innerHTML = '<option value="">Todos</option>' +
    anosUnicos.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  msSetVal('udpMatAnoFilter', curAno.filter(v => anosUnicos.map(String).includes(v)));

  const mesSel = document.getElementById('udpMatMesFilter');
  const mesesPresentes = [...new Set(allUdp.map(c=>c.mes).filter(Boolean))];
  const mesesOrdenadosMat = MESES_ORDEN.filter(m=>mesesPresentes.includes(m));
  mesSel.innerHTML = '<option value="">Todos</option>' +
    mesesOrdenadosMat.map(m=>`<option>${escapeHtml(m)}</option>`).join('');
  const restoredMes = msRestoreOrCurrent('udpMatMesFilter');
  msSetVal('udpMatMesFilter', restoredMes.filter(v => mesesOrdenadosMat.includes(v)));

  updateUdpCascadaFiltros('udpMat');

  ['udpMatClasificacionFilter','udpMatAnoFilter','udpMatMesFilter','udpMatDiaFilter'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      if(id === 'udpMatAnoFilter' || id === 'udpMatMesFilter'){
        updateUdpCascadaFiltros('udpMat');
      }
      renderUdpMaterialesActivo();
    });
  });
  document.getElementById('udpMatBuscador').addEventListener('input', renderUdpMaterialesActivo);

  document.querySelectorAll('[data-udpmattab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-udpmattab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('udpmattab-resumen').classList.toggle('active', btn.dataset.udpmattab === 'resumen');
      document.getElementById('udpmattab-tabla').classList.toggle('active', btn.dataset.udpmattab === 'tabla');
      udpMatTablaSubtab = btn.dataset.udpmattab;
      renderUdpMaterialesActivo();
    });
  });

  renderUdpMaterialesActivo();
}

let udpMatTablaSubtab = 'resumen';
function renderUdpMaterialesActivo(){
  if(udpMatTablaSubtab === 'tabla') renderUdpMaterialesTabla();
  else renderUdpMateriales();
}

function renderUdpMateriales(){
  const casos = getUdpMaterialesFiltrados();
  const wrap = document.getElementById('udpMaterialesResumenWrap');
  const busqueda = (document.getElementById('udpMatBuscador')?.value || '').trim().toLowerCase();
  document.getElementById('udpMatCasosContados').textContent = `${casos.length} caso${casos.length !== 1 ? 's' : ''} en el filtro`;

  const totales = {};
  UDP_MATERIALES_CATALOGO.forEach(([label, col]) => {
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

const UDP_MAT_TABLA_POR_PAGINA = 20;
let udpMatTablaPaginaActual = 1;

function getUdpMaterialesUsados(c){
  return UDP_MATERIALES_CATALOGO
    .map(([label, col]) => ({ label, cantidad: parseFloat(c[col]) || 0 }))
    .filter(m => m.cantidad > 0);
}

function renderUdpMaterialesTabla(resetPagina = true){
  if(resetPagina) udpMatTablaPaginaActual = 1;

  const wrap = document.getElementById('udpMaterialesTablaWrap');
  const busqueda = (document.getElementById('udpMatBuscador')?.value || '').trim().toLowerCase();

  let rows = getUdpMaterialesFiltrados()
    .map(c => ({ caso: c, materiales: getUdpMaterialesUsados(c) }))
    .filter(r => r.materiales.length > 0);

  if(busqueda){
    rows = rows.filter(r =>
      (r.caso.casos||'').toLowerCase().includes(busqueda) ||
      (r.caso.nombre_del_tecnico||'').toLowerCase().includes(busqueda) ||
      r.materiales.some(m => m.label.toLowerCase().includes(busqueda))
    );
  }

  document.getElementById('udpMatTablaCasosContados').textContent = `${rows.length} caso${rows.length !== 1 ? 's' : ''} con materiales`;

  if(rows.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
        <div class="empty-title">${busqueda ? 'Sin resultados para "'+escapeHtml(busqueda)+'"' : 'Ningún caso con materiales registrados'}</div>
        <div class="empty-desc">${busqueda ? 'Prueba con otro término de búsqueda.' : 'Los casos filtrados no tienen materiales con cantidad mayor a 0.'}</div>
      </div>`;
    return;
  }

  const totalPaginas = Math.max(1, Math.ceil(rows.length / UDP_MAT_TABLA_POR_PAGINA));
  if(udpMatTablaPaginaActual > totalPaginas) udpMatTablaPaginaActual = totalPaginas;
  const startIdx = (udpMatTablaPaginaActual - 1) * UDP_MAT_TABLA_POR_PAGINA;
  const pageRows = rows.slice(startIdx, startIdx + UDP_MAT_TABLA_POR_PAGINA);

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Casos</th>
          <th>Técnico</th>
          <th>Red</th>
          <th style="width:38%;">Materiales usados</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows.map(r => udpMatTablaRowHtml(r.caso, r.materiales)).join('')}
      </tbody>
    </table>
    <div class="pagination-bar">
      <div class="pagination-info">Mostrando ${startIdx + 1}–${Math.min(startIdx + UDP_MAT_TABLA_POR_PAGINA, rows.length)} de ${rows.length} casos</div>
      <div class="pagination-controls" id="udpMatTablaPaginationControls"></div>
    </div>
  `;

  renderUdpMatTablaPaginationControls(totalPaginas);

  wrap.querySelectorAll('[data-umtaction]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const caso = allUdp.find(c => String(c.id) === String(id));
      if(caso) openUdpViewModal(caso);
    });
  });
}

function udpMatTablaRowHtml(c, materiales){
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
        <div class="person-puesto">${escapeHtml(c.mes || '')}${c.dia ? ' ' + escapeHtml(c.dia) : ''}</div>
      </td>
      <td>${escapeHtml(c.nombre_del_tecnico || '—')}</td>
      <td>${escapeHtml(c.red || '—')}</td>
      <td>
        <div style="display:flex; flex-wrap:wrap; gap:5px;">${chipsHtml}${masHtml}</div>
      </td>
      <td>
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="icon-btn accent" data-umtaction="view" data-id="${c.id}" title="Ver caso completo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderUdpMatTablaPaginationControls(totalPaginas){
  const wrap = document.getElementById('udpMatTablaPaginationControls');
  if(!wrap || totalPaginas <= 1) return;

  const pages = [];
  const cur = udpMatTablaPaginaActual;
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
      udpMatTablaPaginaActual = parseInt(btn.dataset.page, 10);
      renderUdpMaterialesTabla(false);
    });
  });
}

function exportarUdpResumenMateriales(){
  const casos = getUdpMaterialesFiltrados();
  if(casos.length === 0){ showToast('No hay casos con los filtros actuales', 'error'); return; }

  const busqueda = (document.getElementById('udpMatBuscador')?.value || '').trim().toLowerCase();
  const totales = {};
  UDP_MATERIALES_CATALOGO.forEach(([label, col]) => {
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
  <x:Name>Materiales UDP</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
  </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
  <body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsFile], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `udp-materiales-consolidado-${new Date().toISOString().slice(0,10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`Excel generado: ${usados.length} materiales de ${casos.length} casos`);
}

function exportarUdpTablaMateriales(){
  const busqueda = (document.getElementById('udpMatBuscador')?.value || '').trim().toLowerCase();

  let rows = getUdpMaterialesFiltrados()
    .map(c => ({ caso: c, materiales: getUdpMaterialesUsados(c) }))
    .filter(r => r.materiales.length > 0);

  if(busqueda){
    rows = rows.filter(r =>
      (r.caso.casos||'').toLowerCase().includes(busqueda) ||
      (r.caso.nombre_del_tecnico||'').toLowerCase().includes(busqueda) ||
      r.materiales.some(m => m.label.toLowerCase().includes(busqueda))
    );
  }

  if(rows.length === 0){ showToast('No hay casos con materiales para exportar', 'error'); return; }

  const generalHeaders = [
    ['clasificacion','Clasificación'],['red','Red'],['casos','Casos'],['id_externo','ID'],['nombre_del_tecnico','Nombre del Técnico'],
    ['mes','Mes'],['dia','Dia'],['escalonamiento','Escalonamiento'],['resolucion','Resolución'],
    ['sla','SLA'],['causa','Causa'],['sub_categoria','Sub Categoria'],
    ['materiales','Materiales'],['observacion','Observacion'],
  ];
  const allHeaders = [...generalHeaders, ...UDP_MATERIALES_CATALOGO.map(([label,col]) => [col,label])];

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
    <x:Name>Tabla Materiales UDP</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head><body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsHeader], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `udp-tabla-materiales-${new Date().toISOString().slice(0,10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast(`Excel generado con ${rows.length} caso${rows.length === 1 ? '' : 's'} con materiales`);
}

document.getElementById('btnExportarUdpMateriales').addEventListener('click', () => {
  if(udpMatTablaSubtab === 'tabla') exportarUdpTablaMateriales();
  else exportarUdpResumenMateriales();
});

document.getElementById('btnLimpiarUdpMateriales').addEventListener('click', () => {
  ['udpMatClasificacionFilter','udpMatAnoFilter','udpMatMesFilter','udpMatDiaFilter'].forEach(id => msSetVal(id, []));
  if(document.getElementById('udpMatBuscador')) document.getElementById('udpMatBuscador').value = '';
  updateUdpCascadaFiltros('udpMat');
  renderUdpMaterialesActivo();
});

/* ============================================================
   CABLE COLOR (mismo patrón completo que HYVE, campos propios)
   Reutiliza MATERIALES_CATALOGO (el mismo catálogo de Movistar)
============================================================ */