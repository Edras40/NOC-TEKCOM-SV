// ============================================================
// 02-casos.js  —  Casos Movistar
// Parte de la aplicación NOC Tekcom. Se carga en orden desde index.html;
// NO reordenar las etiquetas <script> ni renombrar estos archivos.
// ============================================================

const CASOS_REST_URL = `${SUPABASE_URL}/rest/v1/casos_atendidos`;
let allCasos = [];
let currentCasoEditId = null;
let pendingCasoDeleteId = null;
let viewingCaso = null;
let casoMaterialesActuales = []; // [{label, col, cantidad}]

function initCasoSelects(){
  // Sub Categoría
  const subCatSel = document.getElementById('c_sub_categoria');
  subCatSel.innerHTML = '<option value="">—</option>' +
    SUB_CATEGORIA_OPCIONES.map(s => `<option>${escapeHtml(s)}</option>`).join('');

  // Semana 1-54
  const semanaSel = document.getElementById('c_semana');
  let semanaOpts = '<option value="">—</option>';
  for(let i=1;i<=54;i++) semanaOpts += `<option>${i}</option>`;
  semanaSel.innerHTML = semanaOpts;

  // Año 2020-2035
  const anoSel = document.getElementById('c_anos');
  let anoOpts = '<option value="">—</option>';
  for(let y=2020;y<=2035;y++) anoOpts += `<option>${y}</option>`;
  anoSel.innerHTML = anoOpts;

  // Día 1-31
  const diaSel = document.getElementById('c_dia');
  let diaOpts = '<option value="">—</option>';
  for(let d=1;d<=31;d++) diaOpts += `<option>${d}</option>`;
  diaSel.innerHTML = diaOpts;
}

async function fetchCasos(){
  initCasoSelects();
  const wrap = document.getElementById('casosTableWrap');
  wrap.innerHTML = '<div class="loading-row"><div class="spinner"></div>Cargando casos…</div>';
  try{
    const res = await fetch(`${CASOS_REST_URL}?select=*&order=created_at.desc`, { headers: sbHeaders });
    if(!res.ok) throw new Error('Error al cargar casos (' + res.status + ')');
    allCasos = await res.json();
    if(typeof triggerMapaDraw === 'function') triggerMapaDraw();
    populateCasoFiltros();
    renderCasosTable();
    // Re-renderizar si Dashboard o Materiales están activos
    const tabActivo = document.querySelector('[data-subtab-c].active');
    if(tabActivo){
      if(tabActivo.dataset.subtabC === 'dashboard') initDashboard();
      if(tabActivo.dataset.subtabC === 'materiales') initMateriales();
    }
  }catch(err){
    console.error(err);
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div class="empty-title">No se pudo conectar con la base de datos</div>
        <div class="empty-desc">${err.message}</div>
      </div>`;
    showToast('Error al conectar con Supabase', 'error');
  }
}

function populateCasoFiltros(){
  const fillSelect = (id, defaultLabel, values, sortNumeric=false) => {
    const sel = document.getElementById(id);
    const current = msRestoreOrCurrent(id);
    let unique = [...new Set(values.filter(v => v !== null && v !== undefined && v !== ''))];
    unique.sort(sortNumeric ? (a,b) => a - b : undefined);
    sel.innerHTML = `<option value="">${defaultLabel}</option>` +
      unique.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    // Conserva la selección anterior solo si sigue siendo una opción válida
    msSetVal(id, current.filter(v => unique.map(String).includes(v)));
  };

  fillSelect('casoZonaFilter', 'Todas las cuadrillas', allCasos.map(c=>c.zona));
  fillSelect('casoRedFilter', 'Todas las redes', allCasos.map(c=>c.red));
  fillSelect('casoClasificacionFilter', 'Todas las clasificaciones', allCasos.map(c=>c.clasificacion));
  fillSelect('casoAnoFilter', 'Todos los años', allCasos.map(c=>c.anos), true);

  // Mes: ordenado cronológicamente, no alfabéticamente
  const mesesOrden = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesSel = document.getElementById('casoMesFilter');
  const curMes = msRestoreOrCurrent('casoMesFilter');
  const mesesPresentes = [...new Set(allCasos.map(c=>c.mes).filter(Boolean))];
  const mesesOrdenados = mesesOrden.filter(m => mesesPresentes.includes(m));
  mesSel.innerHTML = '<option value="">Todos los meses</option>' +
    mesesOrdenados.map(m => `<option>${escapeHtml(m)}</option>`).join('');
  msSetVal('casoMesFilter', curMes.filter(v => mesesOrdenados.includes(v)));

  updateCascadaFiltros('caso');
}

// Semana y Día solo muestran las opciones que realmente existen
// dentro del Año/Mes/Zona/Clasificación/Status ya seleccionados
function updateCasoSemanaDiaFiltros(){
  const anoFilter = msVal('casoAnoFilter');
  const mesFilter = msVal('casoMesFilter');
  const zonaFilter = msVal('casoZonaFilter');
  const clasificacionFilter = msVal('casoClasificacionFilter');
  const statusFilter = msVal('casoStatusFilter');

  const casosFiltrados = allCasos.filter(c => {
    const matchesAno = anoFilter.length === 0 || anoFilter.includes(String(c.anos));
    const matchesMes = mesFilter.length === 0 || mesFilter.includes(c.mes);
    const matchesZona = zonaFilter.length === 0 || zonaFilter.includes(c.zona);
    const matchesClasificacion = clasificacionFilter.length === 0 || clasificacionFilter.includes(c.clasificacion);
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(c.status);
    return matchesAno && matchesMes && matchesZona && matchesClasificacion && matchesStatus;
  });

  const fillDependiente = (id, defaultLabel, values) => {
    const sel = document.getElementById(id);
    const current = msRestoreOrCurrent(id);
    let unique = [...new Set(values.filter(v => v !== null && v !== undefined && v !== ''))];
    unique.sort((a,b) => a - b);
    sel.innerHTML = `<option value="">${defaultLabel}</option>` +
      unique.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    msSetVal(id, current.filter(v => unique.map(String).includes(v)));
  };

  fillDependiente('casoSemanaFilter', 'Todas las semanas', casosFiltrados.map(c=>c.semana));
  fillDependiente('casoDiaFilter', 'Todos los días', casosFiltrados.map(c=>c.dia));
}

/* ---- Función genérica de cascada para cualquier conjunto de filtros ---- */
function updateCascadaFiltros(prefijo, extraFiltros = {}){
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
  const semanaVal = getVal(`${prefijo}SemanaFilter`);

  // Paso 1: dado el año → actualizar meses disponibles
  const paso1 = allCasos.filter(c => {
    const mAno = anoVal.length === 0 || anoVal.includes(String(c.anos));
    const mExtra = Object.entries(extraFiltros).every(([campo, val]) => !val || c[campo] === val);
    return mAno && mExtra;
  });
  setMesOpts(`${prefijo}MesFilter`, paso1.map(c=>c.mes));

  // Paso 2: dado año + mes → actualizar semanas y clasificaciones disponibles
  const paso2 = paso1.filter(c => mesVal.length === 0 || mesVal.includes(c.mes));
  setOpts(`${prefijo}SemanaFilter`, 'Todas las semanas', paso2.map(c=>c.semana), true);
  if(document.getElementById(`${prefijo}ClasificacionFilter`)){
    setOpts(`${prefijo}ClasificacionFilter`, 'Todas las clasificaciones', paso2.map(c=>c.clasificacion));
  }

  // Paso 3: dado año + mes + semana → actualizar días
  const paso3 = paso2.filter(c => semanaVal.length === 0 || semanaVal.includes(String(c.semana)));
  setOpts(`${prefijo}DiaFilter`, 'Todos los días', paso3.map(c=>c.dia), true);
}

function statusChipClass(status){
  switch(status){
    case 'Finalizada': return 'status-finalizada';
    case 'Finalizado': return 'status-finalizada';
    case 'En Proceso': return 'status-en-proceso';
    case 'Cancelado': return 'status-cancelado';
    case 'Pendiente': return 'status-pendiente';
    case 'Pausado': return 'status-pausado';
    default: return '';
  }
}

const CASOS_POR_PAGINA = 20;
let casoPaginaActual = 1;
let dashMesTab = 'casos';
let dashZonaTab = 'casos';
let dashTecRankTab = 'casos';
let dashTecLiderTab = 'casos';
let dashCausaTab = 'casos';

function getCasosFiltrados(){
  const searchTerm = document.getElementById('casoSearch').value.trim().toLowerCase();
  const statusFilter = msVal('casoStatusFilter');
  const zonaFilter = msVal('casoZonaFilter');
  const redFilter = msVal('casoRedFilter');
  const clasificacionFilter = msVal('casoClasificacionFilter');
  const anoFilter = msVal('casoAnoFilter');
  const mesFilter = msVal('casoMesFilter');
  const semanaFilter = msVal('casoSemanaFilter');
  const diaFilter = msVal('casoDiaFilter');

  return allCasos.filter(c => {
    const matchesSearch = !searchTerm || [c.folio,c.casos,c.nombre_del_tecnico,c.clasificacion]
      .some(f => (f||'').toString().toLowerCase().includes(searchTerm));
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(c.status);
    const matchesZona = zonaFilter.length === 0 || zonaFilter.includes(c.zona);
    const matchesRed = redFilter.length === 0 || redFilter.includes(c.red);
    const matchesClasificacion = clasificacionFilter.length === 0 || clasificacionFilter.includes(c.clasificacion);
    const matchesAno = anoFilter.length === 0 || anoFilter.includes(String(c.anos));
    const matchesMes = mesFilter.length === 0 || mesFilter.includes(c.mes);
    const matchesSemana = semanaFilter.length === 0 || semanaFilter.includes(String(c.semana));
    const matchesDia = diaFilter.length === 0 || diaFilter.includes(String(c.dia));
    return matchesSearch && matchesStatus && matchesZona && matchesRed && matchesClasificacion && matchesAno && matchesMes && matchesSemana && matchesDia;
  });
}

function renderCasosTable(resetPagina = true){
  const wrap = document.getElementById('casosTableWrap');

  if(resetPagina) casoPaginaActual = 1;

  let rows = getCasosFiltrados();

  if(rows.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        <div class="empty-title">${allCasos.length === 0 ? 'Aún no hay casos registrados' : 'Sin resultados'}</div>
        <div class="empty-desc">${allCasos.length === 0 ? 'Agrega el primer caso usando el botón "Agregar Caso".' : 'Prueba con otro término de búsqueda o filtro.'}</div>
      </div>`;
    return;
  }

  const totalPaginas = Math.max(1, Math.ceil(rows.length / CASOS_POR_PAGINA));
  if(casoPaginaActual > totalPaginas) casoPaginaActual = totalPaginas;
  const startIdx = (casoPaginaActual - 1) * CASOS_POR_PAGINA;
  const pageRows = rows.slice(startIdx, startIdx + CASOS_POR_PAGINA);

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Folio / Caso</th>
          <th>Técnico</th>
          <th>Cuadrilla</th>
          <th>Escalonamiento</th>
          <th>Causa</th>
          <th>Status</th>
          <th>SLA</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows.map(c => casoRowHtml(c)).join('')}
      </tbody>
    </table>
    <div class="pagination-bar">
      <div class="pagination-info">Mostrando ${startIdx + 1}–${Math.min(startIdx + CASOS_POR_PAGINA, rows.length)} de ${rows.length} casos</div>
      <div class="pagination-controls" id="casoPaginationControls"></div>
    </div>
  `;

  renderCasoPaginationControls(totalPaginas);

  wrap.querySelectorAll('[data-caction]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.caction;
      const caso = allCasos.find(c => String(c.id) === String(id));
      if(action === 'view') openCasoViewModal(caso);
      if(action === 'edit') openCasoFormModal(caso);
      if(action === 'delete') openCasoDeleteModal(caso);
    });
  });
}

function renderCasoPaginationControls(totalPaginas){
  const wrap = document.getElementById('casoPaginationControls');
  if(!wrap || totalPaginas <= 1) return;

  const pages = [];
  const cur = casoPaginaActual;
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
      casoPaginaActual = parseInt(btn.dataset.page, 10);
      renderCasosTable(false);
    });
  });
}

// Categorías que no tienen límite de SLA. El tiempo se sigue midiendo y
// guardando en la base, pero nunca se marca como vencido: en su lugar el aviso
// de avance se repite cada hora para que el caso no quede olvidado.
const CATEGORIAS_SIN_SLA = ['Degradación', 'Degradaciones', 'Preventivo'];

function categoriaSinSla(tipoAfectacion){
  return CATEGORIAS_SIN_SLA.includes((tipoAfectacion || '').trim());
}

// Límite de SLA por proyecto: Movistar 4 horas, Hyve y Cable Color 5 horas.
const SLA_LIMITE_MIN = { casos: 240, hyve: 300, cable: 300, udp: 300 };
function slaLimite(modulo){
  return SLA_LIMITE_MIN[modulo] || 240;
}

function slaChipHtml(sla, modulo, tipoAfectacion){
  if(!sla) return '<span style="color:var(--text-faint);">—</span>';
  // Degradación y Preventivo no vencen: se muestra el tiempo en neutro.
  if(categoriaSinSla(tipoAfectacion)){
    return `<span class="mono" style="background:var(--surface-3);color:var(--text-dim);padding:3px 10px;border-radius:20px;font-weight:700;font-size:12.5px;" title="Sin límite de SLA">${escapeHtml(sla)}</span>`;
  }
  // Convertir HH:MM a minutos totales
  const m = String(sla).match(/^(-?)(\d+):(\d{1,2})/);
  if(!m) return `<span class="mono">${escapeHtml(sla)}</span>`;
  const sign = m[1] === '-' ? -1 : 1;
  const totalMin = sign * (parseInt(m[2],10)*60 + parseInt(m[3],10));
  const dentroSLA = totalMin >= 0 && totalMin <= slaLimite(modulo);
  const color = dentroSLA ? '#16A34A' : '#DC2626';
  const bg = dentroSLA ? '#DCFCE7' : '#FEE2E2';
  return `<span class="mono" style="background:${bg};color:${color};padding:3px 10px;border-radius:20px;font-weight:700;font-size:12.5px;">${escapeHtml(sla)}</span>`;
}

function casoRowHtml(c){
  const statusClass = statusChipClass(c.status);
  return `
    <tr>
      <td>
        <div class="person-name">${escapeHtml(c.folio || c.casos || '—')}</div>
        <div class="person-puesto">${escapeHtml(c.clasificacion || '')}</div>
      </td>
      <td>${escapeHtml(c.nombre_del_tecnico || '—')}</td>
      <td>${escapeHtml(c.zona || '—')}</td>
      <td class="mono">${escapeHtml(plFechaHoraMilitar(c.escalonamiento) || '—')}</td>
      <td>${escapeHtml(c.causa || '—')}</td>
      <td>${c.status ? `<span class="status-chip ${statusClass}">${escapeHtml(c.status)}</span>` : '<span style="color:var(--text-faint);">—</span>'}</td>
      <td>${slaChipHtml(c.sla, 'casos', c.clasificacion)}</td>
      <td>
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="icon-btn accent" data-caction="view" data-id="${c.id}" title="Ver">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="icon-btn" data-caction="edit" data-id="${c.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="icon-btn danger" data-caction="delete" data-id="${c.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

document.getElementById('casoSearch').addEventListener('input', () => renderCasosTable(true));
document.getElementById('casoStatusFilter').addEventListener('change', () => { updateCascadaFiltros('caso'); renderCasosTable(true); });
document.getElementById('casoZonaFilter').addEventListener('change', () => { updateCascadaFiltros('caso'); renderCasosTable(true); });
document.getElementById('casoRedFilter').addEventListener('change', () => renderCasosTable(true));
document.getElementById('casoClasificacionFilter').addEventListener('change', () => { updateCascadaFiltros('caso'); renderCasosTable(true); });
document.getElementById('casoAnoFilter').addEventListener('change', () => { updateCascadaFiltros('caso'); renderCasosTable(true); });
document.getElementById('casoMesFilter').addEventListener('change', () => { updateCascadaFiltros('caso'); renderCasosTable(true); });
document.getElementById('casoSemanaFilter').addEventListener('change', () => renderCasosTable(true));
document.getElementById('casoDiaFilter').addEventListener('change', () => renderCasosTable(true));

/* ---- Cálculos automáticos: Lapso, Intervalo, Segundo, MMA ---- */
function hhmmToMinutes(hhmm){
  if(!hhmm) return null;
  const m = hhmm.trim().match(/^(-?\d+):(\d{1,2})$/);
  if(!m) return null;
  const sign = m[1].startsWith('-') ? -1 : 1;
  const h = Math.abs(parseInt(m[1], 10));
  const min = parseInt(m[2], 10);
  return sign * (h * 60 + min);
}
function minutesToHHMM(totalMinutes){
  if(totalMinutes === null || isNaN(totalMinutes)) return '';
  const sign = totalMinutes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(totalMinutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function recalcCasoTiempos(){
  const escal = document.getElementById('c_escalonamiento').value;
  const resol = document.getElementById('c_resolucion').value;
  const slaTxt = document.getElementById('c_sla').value;
  const aceptacionTxt = document.getElementById('c_tiempos_aceptacion').value;

  // Lapso = Resolución - Escalonamiento
  let lapsoMin = null;
  if(escal && resol){
    const dEscal = new Date(escal);
    const dResol = new Date(resol);
    lapsoMin = (dResol - dEscal) / 60000;
    document.getElementById('c_lapso').value = minutesToHHMM(lapsoMin);
  } else {
    document.getElementById('c_lapso').value = '';
  }

  // Intervalo = Lapso - SLA
  const slaMin = hhmmToMinutes(slaTxt);
  if(lapsoMin !== null && slaMin !== null){
    document.getElementById('c_intervalo').value = minutesToHHMM(lapsoMin - slaMin);
  } else {
    document.getElementById('c_intervalo').value = '';
  }

  // Segundo = SLA (fracción de día) * 86400
  if(slaMin !== null){
    const fraccionDia = slaMin / 1440;
    document.getElementById('c_segundo').value = Math.round(fraccionDia * 86400);
  } else {
    document.getElementById('c_segundo').value = '';
  }

  // MMA = Tiempos de Aceptación (fracción de día) * 1440
  const aceptacionMin = hhmmToMinutes(aceptacionTxt);
  if(aceptacionMin !== null){
    const fraccionDia = aceptacionMin / 1440;
    document.getElementById('c_mma').value = Math.round(fraccionDia * 1440 * 100) / 100;
  } else {
    document.getElementById('c_mma').value = '';
  }

  // Fecha Validación Movistar = Resolución (es el cierre del caso).
  // Se mantiene sincronizada automáticamente al cambiar la Resolución.
  const resolucionVal = document.getElementById('c_resolucion').value;
  if(resolucionVal) document.getElementById('c_up_enlace').value = resolucionVal;

  // Tiempo de Validación Movistar = Fecha Validación Movistar - Solicitud | Validación-Movistar
  const sVal = document.getElementById('c_s_validacion').value;
  const upEnlace = document.getElementById('c_up_enlace').value;
  if(sVal && upEnlace){
    const diffMin = (new Date(upEnlace) - new Date(sVal)) / 60000;
    document.getElementById('c_t_validacion').value = minutesToHHMM(diffMin);
  } else {
    document.getElementById('c_t_validacion').value = 'No aplica';
  }

  // Tiempo de Validación Hyve = Fecha de Validación Hyve - Solicitud de Validación Hyve
  const sValHyve = document.getElementById('c_s_validacion_hyve').value;
  const upEnlaceHyve = document.getElementById('c_up_enlace_hyve').value;
  if(sValHyve && upEnlaceHyve){
    const diffMin2 = (new Date(upEnlaceHyve) - new Date(sValHyve)) / 60000;
    document.getElementById('c_t_validacion2').value = minutesToHHMM(diffMin2);
  } else {
    // Sin validación Hyve el tiempo es 00:00, no "No aplica": el caso simplemente
    // no pasó por Hyve y así el dato queda numérico para reportes.
    document.getElementById('c_t_validacion2').value = '00:00';
  }
}

['c_escalonamiento','c_resolucion','c_sla','c_tiempos_aceptacion','c_s_validacion','c_up_enlace','c_s_validacion_hyve','c_up_enlace_hyve'].forEach(id => {
  document.getElementById(id).addEventListener('input', recalcCasoTiempos);
});

/* ---- Buscador de técnico dentro del formulario de caso ---- */
const cTecnicoSearch = document.getElementById('c_tecnico_search');
const cTecnicoResults = document.getElementById('c_tecnico_results');

function setCasoTecnico(persona){
  document.getElementById('c_tecnico_id').value = persona ? persona.id : '';
  if(persona){
    const c = colorFor(persona.cuadrilla || persona.nombre || '');
    document.getElementById('c_tecnico_avatar').textContent = initials(persona.nombre);
    document.getElementById('c_tecnico_avatar').style.background = c;
    document.getElementById('c_tecnico_name').textContent = persona.nombre;
    document.getElementById('c_tecnico_meta').textContent = (persona.cuadrilla || '—') + ' · ' + (persona.puesto || '—');
    document.getElementById('c_tecnico_selected').style.display = 'block';
    if(!document.getElementById('c_zona').value){
      document.getElementById('c_zona').value = persona.cuadrilla || '';
    }
  } else {
    document.getElementById('c_tecnico_selected').style.display = 'none';
  }
}

cTecnicoSearch.addEventListener('input', () => {
  const term = cTecnicoSearch.value.trim().toLowerCase();
  if(!term){ cTecnicoResults.classList.remove('show'); cTecnicoResults.innerHTML=''; return; }
  const matches = allPeople.filter(p => (p.nombre||'').toLowerCase().includes(term)).slice(0, 20);
  if(matches.length === 0){
    cTecnicoResults.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    cTecnicoResults.innerHTML = matches.map(p => `
      <div class="site-result-item" data-ctecnico-id="${escapeHtml(p.id)}">
        <div class="site-result-name">${escapeHtml(p.nombre)}</div>
        <div class="site-result-meta">${escapeHtml(p.cuadrilla || '—')} · ${escapeHtml(p.puesto || '—')}</div>
      </div>
    `).join('');
  }
  cTecnicoResults.classList.add('show');
});
cTecnicoResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-ctecnico-id]');
  if(!item) return;
  const persona = allPeople.find(p => String(p.id) === String(item.dataset.ctecnicoId));
  if(persona){ setCasoTecnico(persona); }
  cTecnicoSearch.value = '';
  cTecnicoResults.classList.remove('show');
  cTecnicoResults.innerHTML = '';
});
document.addEventListener('click', (e) => {
  if(!e.target.closest('#c_tecnico_search') && !e.target.closest('#c_tecnico_results')){
    cTecnicoResults.classList.remove('show');
  }
});
document.getElementById('c_tecnico_clear').addEventListener('click', () => setCasoTecnico(null));

/* ---- Gestión de materiales dentro del formulario de caso ---- */
function renderCasoMaterialList(){
  const wrap = document.getElementById('c_material_list');
  if(casoMaterialesActuales.length === 0){
    wrap.innerHTML = '<div class="material-empty">Aún no se han agregado materiales a este caso.</div>';
    return;
  }
  wrap.innerHTML = casoMaterialesActuales.map((m, i) => `
    <div class="material-item">
      <div class="material-item-name">${escapeHtml(m.label)}</div>
      <input type="number" min="0" step="1" value="${m.cantidad}" data-mat-index="${i}" class="mat-qty-input">
      <button type="button" class="material-item-remove" data-mat-remove="${i}" title="Quitar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `).join('');

  wrap.querySelectorAll('.mat-qty-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.matIndex, 10);
      casoMaterialesActuales[idx].cantidad = parseFloat(inp.value) || 0;
    });
  });
  wrap.querySelectorAll('[data-mat-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      casoMaterialesActuales.splice(parseInt(btn.dataset.matRemove, 10), 1);
      renderCasoMaterialList();
    });
  });
}

const cMaterialSearch = document.getElementById('c_material_search');
const cMaterialResults = document.getElementById('c_material_results');

function addCasoMaterial(col){
  if(casoMaterialesActuales.find(m => m.col === col)){
    showToast('Ese material ya está en la lista', 'error');
    return;
  }
  const entry = MATERIALES_CATALOGO.find(([label, c]) => c === col);
  if(!entry) return;
  casoMaterialesActuales.push({ label: entry[0], col, cantidad: 1 });
  renderCasoMaterialList();
}

cMaterialSearch.addEventListener('input', () => {
  const term = cMaterialSearch.value.trim().toLowerCase();
  if(!term){ cMaterialResults.classList.remove('show'); cMaterialResults.innerHTML=''; return; }

  const yaAgregados = new Set(casoMaterialesActuales.map(m => m.col));
  const matches = MATERIALES_CATALOGO.filter(([label,col]) =>
    !yaAgregados.has(col) && label.toLowerCase().includes(term)
  ).slice(0, 20);

  if(matches.length === 0){
    cMaterialResults.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    cMaterialResults.innerHTML = matches.map(([label,col]) => `
      <div class="site-result-item" data-material-col="${escapeHtml(col)}">
        <div class="site-result-name">${escapeHtml(label)}</div>
      </div>
    `).join('');
  }
  cMaterialResults.classList.add('show');
});

cMaterialResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-material-col]');
  if(!item) return;
  addCasoMaterial(item.dataset.materialCol);
  cMaterialSearch.value = '';
  cMaterialResults.classList.remove('show');
  cMaterialResults.innerHTML = '';
  cMaterialSearch.focus();
});

document.addEventListener('click', (e) => {
  if(!e.target.closest('#c_material_search') && !e.target.closest('#c_material_results')){
    cMaterialResults.classList.remove('show');
  }
});

/* ---- Form modal (Agregar / Editar Caso) ---- */
const casoFormModalOverlay = document.getElementById('casoFormModalOverlay');

function isoToDatetimeLocal(iso){
  if(!iso) return '';
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getSemanaISO(date){
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function openCasoFormModal(caso){
  // Salvaguarda: asegura que los <select> (Semana, Año, Mes, Día, Sub Categoría, Materiales) ya tengan sus opciones
  if(document.getElementById('c_semana').options.length <= 1){
    initCasoSelects();
  }

  currentCasoEditId = caso ? caso.id : null;
  document.getElementById('casoFormModalTitle').textContent = caso ? 'Editar Caso' : 'Agregar Caso';

  setSelectValorTolerante('c_clasificacion', caso?.clasificacion);
  setSelectValorTolerante('c_red', caso?.red);
  document.getElementById('c_casos').value = caso?.casos || '';
  document.getElementById('c_folio').value = caso?.folio || '';
  setSelectValorTolerante('c_status', caso?.status);
  setSelectValorTolerante('c_zona', caso?.zona);
  document.getElementById('c_departamento').value = caso?.departamento || '';
  {
    // Compatibilidad: si `municipio` guarda un nombre que hoy es distrito
    // (registro anterior a la reforma de 2024), se reubica en el nivel correcto.
    const dep = caso?.departamento || '';
    let mun = caso?.municipio || '';
    let dist = caso?.distrito || '';
    if(mun && !((SV_DIVISION[dep] || {})[mun])){
      const munReal = plMunicipioDeDistrito(dep, mun);
      if(munReal){ dist = dist || mun; mun = munReal; }
    }
    plActualizarMunicipiosCaso(mun, dist);
  }
  setSelectValorTolerante('c_causa', caso?.causa);
  document.getElementById('c_sub_categoria').value = caso?.sub_categoria || '';
  // Acceso a sitio es un interruptor: marcado = SI, sin marcar = NO. Nunca queda vacío.
  document.getElementById('c_acceso_sitio').checked = (caso?.acceso_a_sitio === 'SI');
  plActualizarTextoAccesoSitio();
  document.getElementById('c_coordenadas').value = formatCoordenadas(caso?.latitud, caso?.longitud);
  document.getElementById('c_observacion').value = caso?.observacion || '';

  if(caso){
    document.getElementById('c_semana').value = caso.semana ?? '';
    document.getElementById('c_anos').value = caso.anos ?? '';
    document.getElementById('c_mes').value = caso.mes || '';
    document.getElementById('c_dia').value = caso.dia ?? '';
    document.getElementById('c_escalonamiento').value = isoToDatetimeLocal(caso.escalonamiento);
  } else {
    // Caso nuevo: autocompleta con la fecha y hora actuales del sistema
    const now = new Date();
    document.getElementById('c_semana').value = getSemanaISO(now);
    document.getElementById('c_anos').value = now.getFullYear();
    document.getElementById('c_mes').value = MESES_ES[now.getMonth()];
    document.getElementById('c_dia').value = now.getDate();
    document.getElementById('c_escalonamiento').value = isoToDatetimeLocal(now.toISOString());
  }

  document.getElementById('c_resolucion').value = isoToDatetimeLocal(caso?.resolucion);
  document.getElementById('c_sla').value = caso?.sla || '';
  // En un caso nuevo se precarga un valor aleatorio; al editar se respeta el guardado.
  document.getElementById('c_tiempos_aceptacion').value = caso?.tiempos_de_aceptacion || (caso ? '' : tiempoAceptacionAleatorio());

  if(caso){
    document.getElementById('c_s_validacion').value = isoToDatetimeLocal(caso.s_validacion);
    document.getElementById('c_up_enlace').value = isoToDatetimeLocal(caso.up_enlace);
    document.getElementById('c_s_validacion_hyve').value = isoToDatetimeLocal(caso.s_validacion_hyve);
    document.getElementById('c_up_enlace_hyve').value = isoToDatetimeLocal(caso.up_enlace_hyve);
  } else {
    // Caso nuevo: autocompleta con la fecha y hora actuales del sistema
    const nowStr = isoToDatetimeLocal(new Date().toISOString());
    document.getElementById('c_s_validacion').value = nowStr;
    document.getElementById('c_up_enlace').value = nowStr;
    document.getElementById('c_s_validacion_hyve').value = nowStr;
    document.getElementById('c_up_enlace_hyve').value = nowStr;
  }

  // Técnico
  const personaExistente = caso?.nombre_del_tecnico
    ? allPeople.find(p => p.nombre === caso.nombre_del_tecnico)
    : null;
  cTecnicoSearch.value = '';
  if(personaExistente){
    setCasoTecnico(personaExistente);
  } else if(caso?.nombre_del_tecnico){
    document.getElementById('c_tecnico_id').value = '';
    document.getElementById('c_tecnico_selected').style.display = 'block';
    document.getElementById('c_tecnico_avatar').textContent = initials(caso.nombre_del_tecnico);
    document.getElementById('c_tecnico_avatar').style.background = colorFor(caso.nombre_del_tecnico);
    document.getElementById('c_tecnico_name').textContent = caso.nombre_del_tecnico;
    document.getElementById('c_tecnico_meta').textContent = 'No encontrado en Listado del Personal';
  } else {
    setCasoTecnico(null);
  }

  // Materiales: reconstruir desde columnas con valor > 0
  casoMaterialesActuales = [];
  if(caso){
    MATERIALES_CATALOGO.forEach(([label, col]) => {
      const val = caso[col];
      if(val !== null && val !== undefined && Number(val) > 0){
        casoMaterialesActuales.push({ label, col, cantidad: Number(val) });
      }
    });
  }
  renderCasoMaterialList();

  recalcCasoTiempos();
  // El filtro arranca apagado en cada apertura, pero el contador ya informa
  // cuántos campos quedan pendientes.
  const chkVacios = document.getElementById('casoSoloVacios');
  if(chkVacios) chkVacios.checked = false;
  casoAplicarFiltroVacios();
  casoFormModalOverlay.classList.add('active');
}
function closeCasoFormModal(){ casoFormModalOverlay.classList.remove('active'); currentCasoEditId = null; }

document.getElementById('btnAddCaso').addEventListener('click', () => openCasoFormModal(null));
document.getElementById('casoFormModalClose').addEventListener('click', closeCasoFormModal);
document.getElementById('casoFormCancelBtn').addEventListener('click', closeCasoFormModal);
casoFormModalOverlay.addEventListener('click', (e) => { if(e.target === casoFormModalOverlay) closeCasoFormModal(); });

document.getElementById('casoFormSaveBtn').addEventListener('click', async () => {
  const tecnicoId = document.getElementById('c_tecnico_id').value;
  const tecnicoPersona = tecnicoId ? allPeople.find(p => String(p.id) === String(tecnicoId)) : null;
  const nombreTecnico = tecnicoPersona ? tecnicoPersona.nombre : (document.getElementById('c_tecnico_name').textContent !== '—' ? document.getElementById('c_tecnico_name').textContent : null);

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

  const _coordCM = parseCoordenadas(document.getElementById('c_coordenadas').value);

  const payload = {
    clasificacion: toTextOrNull('c_clasificacion'),
    red: toTextOrNull('c_red'),
    casos: toTextOrNull('c_casos'),
    folio: toTextOrNull('c_folio'),
    nombre_del_tecnico: nombreTecnico,
    status: toTextOrNull('c_status'),
    zona: toTextOrNull('c_zona'),
    departamento: toTextOrNull('c_departamento'),
    municipio: toTextOrNull('c_municipio'),
    distrito: toTextOrNull('c_distrito'),
    semana: toIntOrNull('c_semana'),
    anos: toIntOrNull('c_anos'),
    mes: toTextOrNull('c_mes'),
    dia: toIntOrNull('c_dia'),
    escalonamiento: toIsoOrNull('c_escalonamiento'),
    resolucion: toIsoOrNull('c_resolucion'),
    lapso: toTextOrNull('c_lapso'),
    sla: toTextOrNull('c_sla'),
    intervalo: toTextOrNull('c_intervalo'),
    segundo: toNumOrNull('c_segundo'),
    causa: toTextOrNull('c_causa'),
    sub_categoria: toTextOrNull('c_sub_categoria'),
    tiempos_de_aceptacion: toTextOrNull('c_tiempos_aceptacion'),
    mma: toNumOrNull('c_mma'),
    latitud: parseCoordenadasNum(document.getElementById('c_coordenadas').value).lat,
    longitud: parseCoordenadasNum(document.getElementById('c_coordenadas').value).lng,
    acceso_a_sitio: document.getElementById('c_acceso_sitio').checked ? 'SI' : 'NO',
    s_validacion: toIsoOrNull('c_s_validacion'),
    up_enlace: toIsoOrNull('c_up_enlace'),
    t_validacion: toTextOrNull('c_t_validacion'),
    s_validacion_hyve: toIsoOrNull('c_s_validacion_hyve'),
    up_enlace_hyve: toIsoOrNull('c_up_enlace_hyve'),
    t_validacion2: toTextOrNull('c_t_validacion2'),
    observacion: toTextOrNull('c_observacion'),
  };

  // Todas las columnas de materiales: las seleccionadas llevan su cantidad, el resto 0
  const materialesMap = {};
  casoMaterialesActuales.forEach(m => { materialesMap[m.col] = m.cantidad; });
  MATERIALES_CATALOGO.forEach(([label, col]) => {
    payload[col] = materialesMap.hasOwnProperty(col) ? materialesMap[col] : 0;
  });

  const saveBtn = document.getElementById('casoFormSaveBtn');
  saveBtn.textContent = 'Guardando...';
  saveBtn.disabled = true;

  try{
    let res;
    if(currentCasoEditId){
      res = await fetch(`${CASOS_REST_URL}?id=eq.${currentCasoEditId}`, {
        method:'PATCH',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(CASOS_REST_URL, {
        method:'POST',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    }
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al guardar'); }

    showToast(currentCasoEditId ? 'Caso actualizado' : 'Caso agregado');
    closeCasoFormModal();
    await fetchCasos();
  }catch(err){
    console.error(err);
    showToast('No se pudo guardar: ' + err.message, 'error');
  }finally{
    saveBtn.textContent = 'Guardar';
    saveBtn.disabled = false;
  }
});

/* ---- View modal (Ver Caso) ---- */
const casoViewModalOverlay = document.getElementById('casoViewModalOverlay');

function openCasoViewModal(caso){
  viewingCaso = caso;
  const grid = document.getElementById('casoViewGrid');
  const fieldsMap = [
    ['Clasificación', caso.clasificacion], ['Red', caso.red], ['Casos', caso.casos], ['Folio', caso.folio],
    ['Técnico', caso.nombre_del_tecnico], ['Status', caso.status], ['Zona', caso.zona],
    ['Causa', caso.causa], ['Sub Categoría', caso.sub_categoria], ['Acceso a sitio', caso.acceso_a_sitio],
    ['Semana', caso.semana], ['Año', caso.anos], ['Mes', caso.mes], ['Día', caso.dia],
    ['Escalonamiento', plFechaHoraMilitar(caso.escalonamiento)],
    ['Resolución', plFechaHoraMilitar(caso.resolucion)],
    ['Lapso', caso.lapso], ['SLA', caso.sla], ['Intervalo', caso.intervalo],
    ['Tiempos de Aceptación', caso.tiempos_de_aceptacion],
    ['Operador Movistar', caso.operador_movistar], ['Operador NOC-Tekcom', caso.operador_tekcom],
    ['Coordenadas', formatCoordenadas(caso.latitud, caso.longitud)],
    ['Solicitud | Validación-Movistar', plFechaHoraMilitar(caso.s_validacion)],
    // Fecha Validación Movistar es, por definición, el cierre del caso. Si el registro es
    // anterior a esta regla y tiene up_enlace vacío, se muestra la Resolución igual.
    ['Fecha Validación Movistar', plFechaHoraMilitar(caso.up_enlace || caso.resolucion)],
    ['Tiempo de Validación Movistar', plTiempoValidacionColoreado(caso)],
    // Si el caso no pasó por Hyve, se muestra "No aplica" en vez de un guion suelto.
    ['Solicitud de Validación Hyve', plFechaHoraMilitar(caso.s_validacion_hyve) || 'No aplica'],
    ['Fecha de Validación Hyve', plFechaHoraMilitar(caso.up_enlace_hyve) || 'No aplica'],
    ['Tiempo de Validación Hyve', caso.t_validacion2 || '00:00'],
    ['Observación', caso.observacion],
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

  const matWrap = document.getElementById('casoViewMateriales');
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

  casoViewModalOverlay.classList.add('active');
}
function closeCasoViewModal(){ casoViewModalOverlay.classList.remove('active'); viewingCaso = null; }

document.getElementById('casoViewModalClose').addEventListener('click', closeCasoViewModal);
document.getElementById('casoViewCloseBtn').addEventListener('click', closeCasoViewModal);
casoViewModalOverlay.addEventListener('click', (e) => { if(e.target === casoViewModalOverlay) closeCasoViewModal(); });
document.getElementById('casoViewEditBtn').addEventListener('click', () => {
  const c = viewingCaso;
  closeCasoViewModal();
  openCasoFormModal(c);
});

/* ---- Delete modal (Eliminar Caso) ---- */
const casoDeleteModalOverlay = document.getElementById('casoDeleteModalOverlay');

function openCasoDeleteModal(caso){
  pendingCasoDeleteId = caso.id;
  document.getElementById('casoDeleteName').textContent = caso.folio || caso.casos || 'este caso';
  casoDeleteModalOverlay.classList.add('active');
}
function closeCasoDeleteModal(){ casoDeleteModalOverlay.classList.remove('active'); pendingCasoDeleteId = null; }

document.getElementById('casoDeleteCancelBtn').addEventListener('click', closeCasoDeleteModal);
casoDeleteModalOverlay.addEventListener('click', (e) => { if(e.target === casoDeleteModalOverlay) closeCasoDeleteModal(); });

document.getElementById('casoDeleteConfirmBtn').addEventListener('click', async () => {
  if(!pendingCasoDeleteId) return;
  const btn = document.getElementById('casoDeleteConfirmBtn');
  btn.textContent = 'Eliminando...';
  btn.disabled = true;
  try{
    const res = await fetch(`${CASOS_REST_URL}?id=eq.${pendingCasoDeleteId}`, {
      method:'DELETE',
      headers: sbHeaders
    });
    if(!res.ok) throw new Error('Error al eliminar');
    showToast('Caso eliminado');
    closeCasoDeleteModal();
    await fetchCasos();
  }catch(err){
    console.error(err);
    showToast('No se pudo eliminar: ' + err.message, 'error');
  }finally{
    btn.textContent = 'Eliminar';
    btn.disabled = false;
  }
});

/* ---- Exportar a Excel (incluye TODAS las columnas, incluso materiales en 0) ---- */
document.getElementById('btnExportarCasos').addEventListener('click', () => {
  const casosAExportar = getCasosFiltrados();

  if(casosAExportar.length === 0){
    showToast('No hay casos que coincidan con los filtros para exportar', 'error');
    return;
  }

  const generalHeaders = [
    ['clasificacion','Clasificación'],['red','Red'],['casos','Casos'],['folio','Folio'],
    ['nombre_del_tecnico','Nombre del Técnico'],['status','Status'],['zona','Zona'],
    ['semana','Semana'],['anos','Años'],['mes','Mes'],['dia','Dia'],
    ['escalonamiento','Escalonamiento'],['resolucion','Resolución'],['lapso','Lapso'],
    ['sla','SLA'],['intervalo','Intervalo'],['segundo','Segundo'],
    ['causa','Causa'],['sub_categoria','Sub Categoria'],
    ['tiempos_de_aceptacion','Tiempos de Aceptación'],['mma','MMA'],
    ['latitud','Latitud'],['longitud','Longitud'],['acceso_a_sitio','Acceso a sitio'],
    ['s_validacion','Solicitud | Validación-Movistar'],['up_enlace','Fecha Validación Movistar'],['t_validacion','Tiempo de Validación Movistar'],
    ['s_validacion_hyve','Solicitud de Validación Hyve'],['up_enlace_hyve','Fecha de Validación Hyve'],['t_validacion2','Tiempo de Validación Hyve'],
    ['observacion','Observacion'],
  ];

  const allHeaders = [...generalHeaders, ...MATERIALES_CATALOGO.map(([label,col]) => [col,label])];

  const rows = casosAExportar.map(c => {
    return allHeaders.map(([col,label]) => {
      let val = c[col];
      if(['escalonamiento','resolucion','s_validacion','up_enlace','s_validacion_hyve','up_enlace_hyve'].includes(col)){
        val = val ? new Date(val).toLocaleString('es-SV') : '';
      }
      return (val === null || val === undefined) ? '' : val;
    });
  });

  // Construye una tabla HTML con estilos inline (encabezado azul, texto blanco).
  // Excel y LibreOffice abren esto directamente como hoja de cálculo respetando los colores.
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
    <x:Name>Casos Atendidos</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head><body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsHeader], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `casos-atendidos-movistar-${new Date().toISOString().slice(0,10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast(`Excel generado con ${casosAExportar.length} caso${casosAExportar.length === 1 ? '' : 's'} filtrado${casosAExportar.length === 1 ? '' : 's'}`);
});


/* ============================================================
   DASHBOARD - Casos Atendidos
============================================================ */
const MESES_ORDEN_DASH = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function getDashFiltrados(){
  const clasif = msVal('dashClasificacionFilter');
  const ano = msVal('dashAnoFilter');
  const mes = msVal('dashMesFilter');
  const semana = msVal('dashSemanaFilter');
  const dia = msVal('dashDiaFilter');
  const folio = document.getElementById('dashFolioSearch').value.trim().toLowerCase();

  return allCasos.filter(c => {
    if(c.status !== 'Finalizada') return false;  // Solo casos finalizados
    const mClasif = clasif.length === 0 || clasif.includes(c.clasificacion);
    const mAno = ano.length === 0 || ano.includes(String(c.anos));
    const mMes = mes.length === 0 || mes.includes(c.mes);
    const mSemana = semana.length === 0 || semana.includes(String(c.semana));
    const mDia = dia.length === 0 || dia.includes(String(c.dia));
    const mFolio = !folio || (c.folio||'').toLowerCase().includes(folio) || (c.casos||'').toLowerCase().includes(folio);
    return mClasif && mAno && mMes && mSemana && mDia && mFolio;
  });
}

function hhmmToMinutesDash(hhmm){
  if(!hhmm) return null;
  const m = String(hhmm).match(/^(-?)(\d+):(\d{1,2})/);
  if(!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (parseInt(m[2],10)*60 + parseInt(m[3],10));
}

function initDashboard(){
  // Poblar filtros del dashboard con valores únicos de allCasos
  const fillDash = (id, values, defaultLabel, sortNum=false) => {
    const sel = document.getElementById(id);
    const cur = msRestoreOrCurrent(id);
    let unique = [...new Set(values.filter(v => v !== null && v !== undefined && v !== ''))];
    unique.sort(sortNum ? (a,b)=>a-b : undefined);
    sel.innerHTML = `<option value="">${defaultLabel}</option>` +
      unique.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    msSetVal(id, cur.filter(v => unique.map(String).includes(v)));
  };
  fillDash('dashClasificacionFilter', allCasos.map(c=>c.clasificacion), 'Todas');
  fillDash('dashAnoFilter', allCasos.map(c=>c.anos), 'Todos', true);
  const mesesPresentes = [...new Set(allCasos.map(c=>c.mes).filter(Boolean))];
  const mesSel = document.getElementById('dashMesFilter');
  const curMes = msRestoreOrCurrent('dashMesFilter');
  const mOrdenados = MESES_ORDEN_DASH.filter(m=>mesesPresentes.includes(m));
  mesSel.innerHTML = '<option value="">Todos</option>' + mOrdenados.map(m=>`<option>${escapeHtml(m)}</option>`).join('');
  msSetVal('dashMesFilter', curMes.filter(v => mOrdenados.includes(v)));
  fillDash('dashSemanaFilter', allCasos.map(c=>c.semana), 'Todas', true);
  fillDash('dashDiaFilter', allCasos.map(c=>c.dia), 'Todos', true);

  renderDashboard();

  // Listeners de filtros del dashboard con cascada Año→Mes→Semana→Día
  ['dashClasificacionFilter','dashAnoFilter','dashMesFilter','dashSemanaFilter','dashDiaFilter'].forEach(id => {
    const el = document.getElementById(id);
    if(!el._dashListener){
      el._dashListener = true;
      el.addEventListener('change', () => {
        updateCascadaFiltros('dash');
        renderDashboard();
      });
    }
  });
  const folioEl = document.getElementById('dashFolioSearch');
  if(!folioEl._dashListener){
    folioEl._dashListener = true;
    folioEl.addEventListener('input', renderDashboard);
  }
  const limpiarBtn = document.getElementById('btnDashLimpiarFiltros');
  if(!limpiarBtn._dashListener){
    limpiarBtn._dashListener = true;
    limpiarBtn.addEventListener('click', () => {
      ['dashClasificacionFilter','dashAnoFilter','dashMesFilter','dashSemanaFilter','dashDiaFilter'].forEach(id => {
        msSetVal(id, []);
      });
      document.getElementById('dashFolioSearch').value = '';
      updateCascadaFiltros('dash');
      renderDashboard();
    });
  }
  const pdfBtn = document.getElementById('btnDashExportarPDF');
  if(pdfBtn && !pdfBtn._dashListener){
    pdfBtn._dashListener = true;
    pdfBtn.addEventListener('click', () => exportarDashboardPDF('subtabc-dashboard', 'Dashboard - Casos Atendidos Movistar'));
  }
  const pptxBtn = document.getElementById('btnDashExportarPPTX');
  if(pptxBtn && !pptxBtn._dashListener){
    pptxBtn._dashListener = true;
    pptxBtn.addEventListener('click', () => exportarCasosPPTXNativo());
  }
}

// Botón Limpiar de Casos Atendidos
document.getElementById('btnLimpiarListado').addEventListener('click', () => {
  ['casoStatusFilter','casoZonaFilter','casoRedFilter','casoClasificacionFilter','casoAnoFilter','casoMesFilter','casoSemanaFilter','casoDiaFilter'].forEach(id => {
    msSetVal(id, []);
  });
  document.getElementById('casoSearch').value = '';
  updateCascadaFiltros('caso');
  renderCasosTable(true);
});

// Botón Limpiar de Materiales
document.getElementById('btnLimpiarMateriales').addEventListener('click', () => {
  ['matAnoFilter','matMesFilter','matSemanaFilter','matDiaFilter','matZonaFilter','matClasificacionFilter'].forEach(id => {
    msSetVal(id, []);
  });
  if(document.getElementById('matBuscador')) document.getElementById('matBuscador').value = '';
  updateCascadaFiltros('mat');
  renderMaterialesActivo();
});

function dibujarLineaMes(canvasId, labels, vals, labelFormat){
  requestAnimationFrame(() => {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth; const H = 240;
    canvas.width = W*dpr; canvas.height = H*dpr;
    canvas.style.width = W+'px'; canvas.style.height = H+'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const isLight = document.body.classList.contains('light');
    const textColor = isLight ? '#666D85' : '#8A8FA3';
    const gridColor = isLight ? '#E2E5F0' : '#262C3B';
    const accentColor = '#0A6A99';

    const maxV = Math.max(...vals, 1);
    const pad = { top:28, right:16, bottom:36, left:48 };
    const W2 = W - pad.left - pad.right;
    const H2 = H - pad.top - pad.bottom;
    const stepX = labels.length > 1 ? W2/(labels.length-1) : W2/2;

    // Cuadrícula
    ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
    [0,0.25,0.5,0.75,1].forEach(f => {
      const y = pad.top + H2*(1-f);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left+W2, y); ctx.stroke();
      const v = maxV*f;
      const lbl = labelFormat === 'hhmm'
        ? `${String(Math.floor(v/60)).padStart(2,'0')}:${String(Math.round(v%60)).padStart(2,'0')}`
        : Math.round(v).toString();
      ctx.fillStyle = textColor; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(lbl, pad.left-6, y+4);
    });

    if(labels.length < 2){
      ctx.fillStyle = textColor; ctx.font = '13px Inter,sans-serif'; ctx.textAlign='center';
      ctx.fillText('Solo un punto de datos', W/2, H/2);
      return;
    }

    // Área rellena
    ctx.beginPath();
    labels.forEach((lbl,i) => {
      const x = pad.left + i*stepX;
      const y = pad.top + H2*(1 - vals[i]/maxV);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    const lastX = pad.left + (labels.length-1)*stepX;
    ctx.lineTo(lastX, pad.top+H2); ctx.lineTo(pad.left, pad.top+H2); ctx.closePath();
    const grad = ctx.createLinearGradient(0,pad.top,0,pad.top+H2);
    grad.addColorStop(0,'rgba(10,106,153,0.25)'); grad.addColorStop(1,'rgba(10,106,153,0.02)');
    ctx.fillStyle = grad; ctx.fill();

    // Línea
    ctx.beginPath(); ctx.strokeStyle = accentColor; ctx.lineWidth = 2.5; ctx.lineJoin='round';
    labels.forEach((lbl,i) => {
      const x = pad.left + i*stepX;
      const y = pad.top + H2*(1 - vals[i]/maxV);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.stroke();

    // Puntos + etiquetas
    labels.forEach((lbl,i) => {
      const x = pad.left + i*stepX;
      const y = pad.top + H2*(1 - vals[i]/maxV);
      ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = accentColor; ctx.lineWidth = 2; ctx.stroke();
      // Valor encima
      const valLbl = labelFormat === 'hhmm'
        ? `${String(Math.floor(vals[i]/60)).padStart(2,'0')}:${String(Math.round(vals[i]%60)).padStart(2,'0')}`
        : vals[i].toString();
      ctx.fillStyle = isLight ? '#1B1F2D' : '#E7E9F2';
      ctx.font = 'bold 10px Inter,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(valLbl, x, y-10);
      // Label mes abajo
      ctx.fillStyle = textColor; ctx.font = '10px Inter,sans-serif';
      ctx.fillText(lbl.slice(0,3), x, pad.top+H2+18);
    });
  });
}

function renderGraficoMes(datos){
  const mesWrap = document.getElementById('dashChartMes');

  // Actualizar estilo de pestañas
  document.querySelectorAll('.mes-tab-btn').forEach(btn => {
    const isActive = btn.dataset.mestab === dashMesTab;
    btn.style.background = isActive ? 'var(--accent)' : 'transparent';
    btn.style.color = isActive ? '#fff' : 'var(--text-dim)';
  });

  // Determinar agrupador según filtros activos:
  // Si hay semana seleccionada → agrupar por Día
  // Si hay mes seleccionado → agrupar por Semana
  // Si solo hay año o nada → agrupar por Mes
  const mesActivo = msVal('dashMesFilter').length > 0;
  const semanaActiva = msVal('dashSemanaFilter').length > 0;

  let agrupador, tituloGrafico;
  if(semanaActiva){
    agrupador = 'dia';
    tituloGrafico = dashMesTab === 'casos' ? 'Casos Por Día' : 'SLA Prom. Por Día';
  } else if(mesActivo){
    agrupador = 'semana';
    tituloGrafico = dashMesTab === 'casos' ? 'Casos Por Semana' : 'SLA Prom. Por Semana';
  } else {
    agrupador = 'mes';
    tituloGrafico = dashMesTab === 'casos' ? 'Casos Por Mes' : 'SLA Prom. Por Mes';
  }

  const titulo = document.getElementById('dashChartMesTitulo');
  if(titulo) titulo.textContent = tituloGrafico;

  if(dashMesTab === 'casos'){
    const porGrupo = {};
    datos.forEach(c => {
      const key = c[agrupador];
      if(key !== null && key !== undefined && key !== '') porGrupo[key] = (porGrupo[key]||0)+1;
    });

    let labels, vals;
    if(agrupador === 'mes'){
      labels = MESES_ORDEN_DASH.filter(m => porGrupo[m]);
      vals = labels.map(m => porGrupo[m]);
    } else {
      // Semanas o días: ordenar numéricamente
      labels = Object.keys(porGrupo).sort((a,b) => Number(a)-Number(b)).map(String);
      vals = labels.map(l => porGrupo[l]);
    }

    if(!labels.length){
      mesWrap.innerHTML = '<div class="material-empty" style="padding:60px 0;text-align:center;">Sin datos</div>';
      return;
    }
    mesWrap.innerHTML = `<canvas id="canvasMes" style="width:100%;height:240px;"></canvas>`;
    dibujarLineaMes('canvasMes', labels, vals, 'num');

  } else {
    // SLA promedio por agrupador
    const slaSuma = {};
    const slaCount = {};
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
    mesWrap.innerHTML = `<canvas id="canvasMes" style="width:100%;height:240px;"></canvas>`;
    dibujarLineaMes('canvasMes', labels, vals, 'hhmm');
  }
}

function renderDashboard(){
  const datos = getDashFiltrados();

  // ---- Tarjetas KPI ----
  document.getElementById('dashTotalCasos').textContent = datos.length;

  // SLA Promedio usando columna sla
  const SLA_UMBRAL = slaLimite('casos');
  const slaMinutos = datos.map(c => hhmmToMinutesDash(c.sla)).filter(v => v !== null && v >= 0);
  const slaEl = document.getElementById('dashSlaPromedio');
  const slaCard = document.getElementById('dashSlaCard');
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

  // Dentro / Fuera del SLA usando columna sla
  let dentro = 0, fuera = 0;
  datos.forEach(c => {
    const min = hhmmToMinutesDash(c.sla);
    if(min === null || min < 0) return;
    if(min <= SLA_UMBRAL) dentro++; else fuera++;
  });
  const total = dentro + fuera;
  const pctDentro = total > 0 ? Math.round((dentro/total)*100) : 0;
  const pctFuera  = total > 0 ? Math.round((fuera/total)*100)  : 0;
  document.getElementById('dashDentroSla').textContent = total > 0 ? `${dentro} (${pctDentro}%)` : '—';
  document.getElementById('dashFueraSla').textContent  = total > 0 ? `${fuera} (${pctFuera}%)`  : '—';

  // Gráficos — con timeout para que el DOM esté visible y los canvas tengan dimensiones
  setTimeout(() => {
    renderGraficoMes(datos);
    document.querySelectorAll('.mes-tab-btn').forEach(btn => {
      btn.onclick = () => { dashMesTab = btn.dataset.mestab; renderGraficoMes(getDashFiltrados()); };
    });
    renderGraficoZona(datos);
    renderValidacionHyve(datos);
    document.querySelectorAll('.zona-tab-btn').forEach(btn => {
      btn.onclick = () => { dashZonaTab = btn.dataset.zonatab; renderGraficoZona(getDashFiltrados()); };
    });
    renderRankingTecnicos(datos);
    document.querySelectorAll('.tecrank-tab-btn').forEach(btn => {
      btn.onclick = () => { dashTecRankTab = btn.dataset.tecranktab; renderRankingTecnicos(getDashFiltrados()); };
    });
    renderBarrasTecnico(datos);
    document.querySelectorAll('.teclider-tab-btn').forEach(btn => {
      btn.onclick = () => { dashTecLiderTab = btn.dataset.teclidertab; renderBarrasTecnico(getDashFiltrados()); };
    });
    renderRankingCausas(datos);
    document.querySelectorAll('.causa-tab-btn').forEach(btn => {
      btn.onclick = () => { dashCausaTab = btn.dataset.causatab; renderRankingCausas(getDashFiltrados()); };
    });
  }, 100);
}

// ---- Helper: calcular SLA promedio por agrupador ----
function calcSlaPromPorGrupo(datos, campo){
  const suma = {}; const count = {};
  datos.forEach(c => {
    const key = c[campo]; if(!key) return;
    const min = hhmmToMinutesDash(c.sla);
    if(min !== null && min >= 0){
      suma[key] = (suma[key]||0) + min;
      count[key] = (count[key]||0) + 1;
    }
  });
  return Object.keys(suma).map(k => [k, Math.round(suma[k]/count[k])]).sort((a,b)=>b[1]-a[1]);
}

function minToHHMM(min){ const h=Math.floor(min/60); const m=min%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }

function setTabStyle(btns, activeKey, dataAttr){
  btns.forEach(btn => {
    const isActive = btn.getAttribute(dataAttr) === activeKey;
    btn.classList.toggle('active', isActive);
  });
}

// ---- Validación Hyve ----
// Solo entran los casos en que Hyve participó, es decir, aquellos con las dos
// marcas de validación puestas en la plantilla. El resto se ignora para que el
// promedio refleje el desempeño real de Hyve y no se diluya con casos ajenos.
function renderValidacionHyve(datos){
  const wrap = document.getElementById('dashValidacionHyve');
  if(!wrap) return;

  const conHyve = datos
    .map(c => {
      if(!c.s_validacion_hyve || !c.up_enlace_hyve) return null;
      const min = (new Date(c.up_enlace_hyve) - new Date(c.s_validacion_hyve)) / 60000;
      if(isNaN(min) || min < 0) return null;
      return { caso: c, min };
    })
    .filter(Boolean)
    .sort((a, b) => b.min - a.min); // del más lento al más rápido

  if(!conHyve.length){
    wrap.innerHTML = '<div class="material-empty">Ningún caso con validación de Hyve en este filtro</div>';
    return;
  }

  const promedio = conHyve.reduce((a, x) => a + x.min, 0) / conHyve.length;

  wrap.innerHTML = `
    <div style="text-align:center; padding:18px 0 20px;">
      <div style="font-size:34px; font-weight:800; line-height:1;">${minutesToHHMM(promedio)}</div>
      <div style="font-size:12px; color:var(--text-dim); margin-top:4px;">Tiempo promedio de respuesta</div>
    </div>
    <button type="button" id="dashHyveToggle"
      style="width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px;
             padding:10px 12px; border:1px solid var(--border); border-radius:8px;
             background:var(--surface-2); cursor:pointer; font-size:13px; color:var(--text);">
      <span>Casos con Hyve</span>
      <span style="display:flex; align-items:center; gap:6px; font-weight:700;">
        ${conHyve.length}
        <svg id="dashHyveChevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;transition:transform .15s;">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </span>
    </button>
    <div id="dashHyveLista" style="display:none; margin-top:10px; max-height:230px; overflow-y:auto;">
      ${conHyve.map(({ caso, min }) => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;
                    padding:7px 2px; border-bottom:1px solid var(--border);">
          <div style="min-width:0;">
            <div style="font-size:12.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escapeHtml(caso.folio || '—')}
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

  const btn = document.getElementById('dashHyveToggle');
  const lista = document.getElementById('dashHyveLista');
  const chevron = document.getElementById('dashHyveChevron');
  btn.addEventListener('click', () => {
    const abierto = lista.style.display !== 'none';
    lista.style.display = abierto ? 'none' : '';
    chevron.style.transform = abierto ? '' : 'rotate(180deg)';
  });
}

// ---- Zona ----
function renderGraficoZona(datos){
  setTabStyle(document.querySelectorAll('.zona-tab-btn'), dashZonaTab, 'data-zonatab');
  const ZONA_COLORS = ['#0A6A99','#3DDC97','#E8A23D','#EF5B6E','#4FB8E8','#C266E8'];
  const zonaWrap = document.getElementById('dashRankingZona');

  if(dashZonaTab === 'casos'){
    const porZona = {};
    datos.forEach(c => { if(c.zona){ porZona[c.zona] = (porZona[c.zona]||0)+1; } });
    const zonasOrdenadas = Object.entries(porZona).sort((a,b)=>b[1]-a[1]);
    const totalZona = zonasOrdenadas.reduce((s,[,v])=>s+v,0);
    if(!zonasOrdenadas.length){ zonaWrap.innerHTML='<div class="material-empty">Sin datos</div>'; return; }
    zonaWrap.innerHTML = `
      <canvas id="canvasZona" style="width:100%;height:180px;"></canvas>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px;">
        ${zonasOrdenadas.map(([zona,count],i) => `
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${ZONA_COLORS[i%ZONA_COLORS.length]};flex-shrink:0;"></div>
            <span style="font-size:12.5px;font-weight:600;flex:1;">${escapeHtml(zona)}</span>
            <span style="font-size:12px;color:var(--text-dim);">${count} <span style="opacity:0.7;">(${Math.round(count/totalZona*100)}%)</span></span>
          </div>`).join('')}
      </div>`;
    requestAnimationFrame(() => {
      const canvas = document.getElementById('canvasZona'); if(!canvas) return;
      const dpr=window.devicePixelRatio||1; const W=canvas.offsetWidth; const H=180;
      canvas.width=W*dpr; canvas.height=H*dpr; canvas.style.width=W+'px'; canvas.style.height=H+'px';
      const ctx=canvas.getContext('2d'); ctx.scale(dpr,dpr);
      const cx=W/2; const cy=H/2; const r=Math.min(cx,cy)-16; const inner=r*0.55;
      let angle=-Math.PI/2;
      zonasOrdenadas.forEach(([,count],i) => {
        const slice=(count/totalZona)*Math.PI*2;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,angle,angle+slice); ctx.closePath();
        ctx.fillStyle=ZONA_COLORS[i%ZONA_COLORS.length]; ctx.fill();
        ctx.strokeStyle=document.body.classList.contains('light')?'#fff':'#141822'; ctx.lineWidth=2; ctx.stroke();
        angle+=slice;
      });
      ctx.beginPath(); ctx.arc(cx,cy,inner,0,Math.PI*2);
      ctx.fillStyle=document.body.classList.contains('light')?'#fff':'#141822'; ctx.fill();
      const isLight=document.body.classList.contains('light');
      ctx.fillStyle=isLight?'#1B1F2D':'#E7E9F2'; ctx.font=`bold ${Math.round(r*0.28)}px Space Grotesk,sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(totalZona,cx,cy-8); ctx.font='11px Inter,sans-serif'; ctx.fillStyle=isLight?'#666D85':'#8A8FA3'; ctx.fillText('Total',cx,cy+12);
    });
  } else {
    const slaData = calcSlaPromPorGrupo(datos, 'zona');
    if(!slaData.length){ zonaWrap.innerHTML='<div class="material-empty">Sin datos de SLA</div>'; return; }
    zonaWrap.innerHTML = slaData.map(([zona,min],i) => `
      <div class="dash-rank-item">
        <div class="dash-rank-name">${escapeHtml(zona)}</div>
        <div class="dash-rank-meta">SLA Prom: ${minToHHMM(min)}</div>
      </div>`).join('');
  }
}

// ---- Top 3 Técnicos ----
function renderRankingTecnicos(datos){
  setTabStyle(document.querySelectorAll('.tecrank-tab-btn'), dashTecRankTab, 'data-tecranktab');
  const wrap = document.getElementById('dashRankingTecnicos');
  if(dashTecRankTab === 'casos'){
    const porTec = {};
    datos.forEach(c => { if(c.nombre_del_tecnico){ porTec[c.nombre_del_tecnico]=(porTec[c.nombre_del_tecnico]||0)+1; } });
    const top = Object.entries(porTec).sort((a,b)=>b[1]-a[1]).slice(0,3);
    wrap.innerHTML = top.length ? top.map(([tec,count]) => `
      <div class="dash-rank-item"><div class="dash-rank-name">${escapeHtml(tec)}</div><div class="dash-rank-meta">Casos: ${count}</div></div>`).join('')
      : '<div class="material-empty">Sin datos</div>';
  } else {
    const slaData = calcSlaPromPorGrupo(datos, 'nombre_del_tecnico').slice(0,3);
    wrap.innerHTML = slaData.length ? slaData.map(([tec,min]) => `
      <div class="dash-rank-item"><div class="dash-rank-name">${escapeHtml(tec)}</div><div class="dash-rank-meta">SLA Prom: ${minToHHMM(min)}</div></div>`).join('')
      : '<div class="material-empty">Sin datos de SLA</div>';
  }
}

// ---- Barras Team Líder ----
function renderBarrasTecnico(datos){
  setTabStyle(document.querySelectorAll('.teclider-tab-btn'), dashTecLiderTab, 'data-teclidertab');
  const wrap = document.getElementById('dashChartTecnico');
  if(dashTecLiderTab === 'casos'){
    const porTec = {};
    datos.forEach(c => { if(c.nombre_del_tecnico){ porTec[c.nombre_del_tecnico]=(porTec[c.nombre_del_tecnico]||0)+1; } });
    const ordered = Object.entries(porTec).sort((a,b)=>b[1]-a[1]);
    const maxV = Math.max(...ordered.map(([,v])=>v),1);
    wrap.innerHTML = ordered.length ? `<div class="dash-bar-wrap">${ordered.map(([tec,count]) => {
      const pct=Math.round((count/maxV)*100);
      return `<div class="dash-bar-row">
        <div class="dash-bar-label" title="${escapeHtml(tec)}">${escapeHtml(tec.split(' ').slice(0,2).join(' '))}</div>
        <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.max(pct,3)}%;"><span class="dash-bar-val">${count}</span></div></div>
      </div>`;}).join('')}</div>` : '<div class="material-empty">Sin datos</div>';
  } else {
    const slaData = calcSlaPromPorGrupo(datos, 'nombre_del_tecnico');
    const maxV = Math.max(...slaData.map(([,v])=>v),1);
    wrap.innerHTML = slaData.length ? `<div class="dash-bar-wrap">${slaData.map(([tec,min]) => {
      const pct=Math.round((min/maxV)*100);
      return `<div class="dash-bar-row">
        <div class="dash-bar-label" title="${escapeHtml(tec)}">${escapeHtml(tec.split(' ').slice(0,2).join(' '))}</div>
        <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.max(pct,3)}%;"><span class="dash-bar-val">${minToHHMM(min)}</span></div></div>
      </div>`;}).join('')}</div>` : '<div class="material-empty">Sin datos de SLA</div>';
  }
}

// ---- Top 3 Causas ----
function renderRankingCausas(datos){
  setTabStyle(document.querySelectorAll('.causa-tab-btn'), dashCausaTab, 'data-causatab');
  const wrap = document.getElementById('dashRankingCausas');
  if(dashCausaTab === 'casos'){
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

/* ============================================================
   MATERIALES — Resumen consolidado
============================================================ */
let materialesInitialized = false;

function getMaterialesFiltrados(){
  const ano = msVal('matAnoFilter');
  const mes = msVal('matMesFilter');
  const semana = msVal('matSemanaFilter');
  const dia = msVal('matDiaFilter');
  const zona = msVal('matZonaFilter');
  const clasif = msVal('matClasificacionFilter');

  return allCasos.filter(c => {
    const mAno = ano.length === 0 || ano.includes(String(c.anos));
    const mMes = mes.length === 0 || mes.includes(c.mes);
    const mSemana = semana.length === 0 || semana.includes(String(c.semana));
    const mDia = dia.length === 0 || dia.includes(String(c.dia));
    const mZona = zona.length === 0 || zona.includes(c.zona);
    const mClasif = clasif.length === 0 || clasif.includes(c.clasificacion);
    return mAno && mMes && mSemana && mDia && mZona && mClasif;
  });
}

function initMateriales(){
  if(materialesInitialized) { renderMaterialesActivo(); return; }
  materialesInitialized = true;

  const MESES_ORDEN = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const fillMat = (id, defaultLabel, values, sortNum=false) => {
    const sel = document.getElementById(id);
    let unique = [...new Set(values.filter(v => v !== null && v !== undefined && v !== ''))];
    unique.sort(sortNum ? (a,b)=>a-b : undefined);
    sel.innerHTML = `<option value="">${defaultLabel}</option>` +
      unique.map(v=>`<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    const restored = msRestoreOrCurrent(id);
    msSetVal(id, restored.filter(v => unique.map(String).includes(v)));
  };

  fillMat('matAnoFilter', 'Todos', allCasos.map(c=>c.anos), true);
  fillMat('matSemanaFilter', 'Todas', allCasos.map(c=>c.semana), true);
  fillMat('matDiaFilter', 'Todos', allCasos.map(c=>c.dia), true);
  fillMat('matZonaFilter', 'Todas', allCasos.map(c=>c.zona));
  fillMat('matClasificacionFilter', 'Todas', allCasos.map(c=>c.clasificacion));

  // Mes ordenado cronológicamente
  const mesSel = document.getElementById('matMesFilter');
  const mesesPresentes = [...new Set(allCasos.map(c=>c.mes).filter(Boolean))];
  const mesesOrdenadosMat = MESES_ORDEN.filter(m=>mesesPresentes.includes(m));
  mesSel.innerHTML = '<option value="">Todos</option>' +
    mesesOrdenadosMat.map(m=>`<option>${escapeHtml(m)}</option>`).join('');
  const restoredMes = msRestoreOrCurrent('matMesFilter');
  msSetVal('matMesFilter', restoredMes.filter(v => mesesOrdenadosMat.includes(v)));

  // Listeners con cascada Año→Mes→Semana→Día
  ['matAnoFilter','matMesFilter','matSemanaFilter','matDiaFilter'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      updateCascadaFiltros('mat');
      renderMaterialesActivo();
    });
  });
  ['matZonaFilter','matClasificacionFilter'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderMaterialesActivo);
  });
  document.getElementById('matBuscador').addEventListener('input', renderMaterialesActivo);

  // Sub-pestañas Resumen / Tabla de materiales
  document.querySelectorAll('[data-mattab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-mattab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('mattab-resumen').classList.toggle('active', btn.dataset.mattab === 'resumen');
      document.getElementById('mattab-tabla').classList.toggle('active', btn.dataset.mattab === 'tabla');
      matTablaSubtab = btn.dataset.mattab;
      renderMaterialesActivo();
    });
  });

  renderMaterialesActivo();
}

let matTablaSubtab = 'resumen';
function renderMaterialesActivo(){
  if(matTablaSubtab === 'tabla') renderMaterialesTabla();
  else renderMateriales();
}

function renderMateriales(){
  const casos = getMaterialesFiltrados();
  const wrap = document.getElementById('materialesResumenWrap');
  const busqueda = (document.getElementById('matBuscador')?.value || '').trim().toLowerCase();
  document.getElementById('matCasosContados').textContent = `${casos.length} caso${casos.length !== 1 ? 's' : ''} en el filtro`;

  // Sumar totales por material
  const totales = {};
  MATERIALES_CATALOGO.forEach(([label, col]) => {
    const total = casos.reduce((sum, c) => sum + (parseFloat(c[col]) || 0), 0);
    if(total > 0) totales[col] = { label, total };
  });

  let usados = Object.entries(totales).sort((a,b) => b[1].total - a[1].total);

  // Aplicar buscador
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

/* ============================================================
   MATERIALES — Tabla por caso (solo casos con al menos 1 material > 0)
============================================================ */
const MAT_TABLA_POR_PAGINA = 20;
let matTablaPaginaActual = 1;

function getCasoMaterialesUsados(c){
  return MATERIALES_CATALOGO
    .map(([label, col]) => ({ label, cantidad: parseFloat(c[col]) || 0 }))
    .filter(m => m.cantidad > 0);
}

function renderMaterialesTabla(resetPagina = true){
  if(resetPagina) matTablaPaginaActual = 1;

  const wrap = document.getElementById('materialesTablaWrap');
  const busqueda = (document.getElementById('matBuscador')?.value || '').trim().toLowerCase();

  // Solo casos que usaron al menos un material; los que no usaron ninguno no aparecen
  let rows = getMaterialesFiltrados()
    .map(c => ({ caso: c, materiales: getCasoMaterialesUsados(c) }))
    .filter(r => r.materiales.length > 0);

  if(busqueda){
    rows = rows.filter(r =>
      (r.caso.folio||'').toLowerCase().includes(busqueda) ||
      (r.caso.casos||'').toLowerCase().includes(busqueda) ||
      (r.caso.nombre_del_tecnico||'').toLowerCase().includes(busqueda) ||
      r.materiales.some(m => m.label.toLowerCase().includes(busqueda))
    );
  }

  document.getElementById('matTablaCasosContados').textContent = `${rows.length} caso${rows.length !== 1 ? 's' : ''} con materiales`;

  if(rows.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
        <div class="empty-title">${busqueda ? 'Sin resultados para "'+escapeHtml(busqueda)+'"' : 'Ningún caso con materiales registrados'}</div>
        <div class="empty-desc">${busqueda ? 'Prueba con otro término de búsqueda.' : 'Los casos filtrados no tienen materiales con cantidad mayor a 0.'}</div>
      </div>`;
    return;
  }

  const totalPaginas = Math.max(1, Math.ceil(rows.length / MAT_TABLA_POR_PAGINA));
  if(matTablaPaginaActual > totalPaginas) matTablaPaginaActual = totalPaginas;
  const startIdx = (matTablaPaginaActual - 1) * MAT_TABLA_POR_PAGINA;
  const pageRows = rows.slice(startIdx, startIdx + MAT_TABLA_POR_PAGINA);

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Folio / Caso</th>
          <th>Técnico</th>
          <th>Zona</th>
          <th>Clasificación</th>
          <th style="width:34%;">Materiales usados</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows.map(r => matTablaRowHtml(r.caso, r.materiales)).join('')}
      </tbody>
    </table>
    <div class="pagination-bar">
      <div class="pagination-info">Mostrando ${startIdx + 1}–${Math.min(startIdx + MAT_TABLA_POR_PAGINA, rows.length)} de ${rows.length} casos</div>
      <div class="pagination-controls" id="matTablaPaginationControls"></div>
    </div>
  `;

  renderMatTablaPaginationControls(totalPaginas);

  wrap.querySelectorAll('[data-mtaction]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const caso = allCasos.find(c => String(c.id) === String(id));
      if(caso) openCasoViewModal(caso);
    });
  });
}

function matTablaRowHtml(c, materiales){
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
        <div class="person-name">${escapeHtml(c.folio || c.casos || '—')}</div>
        <div class="person-puesto">${escapeHtml(c.mes || '')}${c.anos ? ' ' + escapeHtml(c.anos) : ''}</div>
      </td>
      <td>${escapeHtml(c.nombre_del_tecnico || '—')}</td>
      <td>${escapeHtml(c.zona || '—')}</td>
      <td>${escapeHtml(c.clasificacion || '—')}</td>
      <td>
        <div style="display:flex; flex-wrap:wrap; gap:5px;">${chipsHtml}${masHtml}</div>
      </td>
      <td>
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="icon-btn accent" data-mtaction="view" data-id="${c.id}" title="Ver caso completo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderMatTablaPaginationControls(totalPaginas){
  const wrap = document.getElementById('matTablaPaginationControls');
  if(!wrap || totalPaginas <= 1) return;

  const pages = [];
  const cur = matTablaPaginaActual;
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
      matTablaPaginaActual = parseInt(btn.dataset.page, 10);
      renderMaterialesTabla(false);
    });
  });
}

function exportarResumenMateriales(){
  const casos = getMaterialesFiltrados();
  if(casos.length === 0){ showToast('No hay casos con los filtros actuales', 'error'); return; }

  // Calcular consolidado igual a lo que se ve en pantalla
  const busqueda = (document.getElementById('matBuscador')?.value || '').trim().toLowerCase();
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
  <x:Name>Materiales</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
  </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
  <body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsFile], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `materiales-consolidado-${new Date().toISOString().slice(0,10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast(`Excel generado: ${usados.length} materiales de ${casos.length} casos`);
}

// Exporta la Tabla de materiales con la misma información completa que Casos Atendidos
// (todas las columnas del caso + todos los materiales), pero solo de los casos que
// usaron al menos un material.
function exportarTablaMateriales(){
  const busqueda = (document.getElementById('matBuscador')?.value || '').trim().toLowerCase();

  let rows = getMaterialesFiltrados()
    .map(c => ({ caso: c, materiales: getCasoMaterialesUsados(c) }))
    .filter(r => r.materiales.length > 0);

  if(busqueda){
    rows = rows.filter(r =>
      (r.caso.folio||'').toLowerCase().includes(busqueda) ||
      (r.caso.casos||'').toLowerCase().includes(busqueda) ||
      (r.caso.nombre_del_tecnico||'').toLowerCase().includes(busqueda) ||
      r.materiales.some(m => m.label.toLowerCase().includes(busqueda))
    );
  }

  if(rows.length === 0){ showToast('No hay casos con materiales para exportar', 'error'); return; }

  const generalHeaders = [
    ['clasificacion','Clasificación'],['red','Red'],['casos','Casos'],['folio','Folio'],
    ['nombre_del_tecnico','Nombre del Técnico'],['status','Status'],['zona','Zona'],
    ['semana','Semana'],['anos','Años'],['mes','Mes'],['dia','Dia'],
    ['escalonamiento','Escalonamiento'],['resolucion','Resolución'],['lapso','Lapso'],
    ['sla','SLA'],['intervalo','Intervalo'],['segundo','Segundo'],
    ['causa','Causa'],['sub_categoria','Sub Categoria'],
    ['tiempos_de_aceptacion','Tiempos de Aceptación'],['mma','MMA'],
    ['latitud','Latitud'],['longitud','Longitud'],['acceso_a_sitio','Acceso a sitio'],
    ['s_validacion','Solicitud | Validación-Movistar'],['up_enlace','Fecha Validación Movistar'],['t_validacion','Tiempo de Validación Movistar'],
    ['s_validacion_hyve','Solicitud de Validación Hyve'],['up_enlace_hyve','Fecha de Validación Hyve'],['t_validacion2','Tiempo de Validación Hyve'],
    ['observacion','Observacion'],
  ];
  const allHeaders = [...generalHeaders, ...MATERIALES_CATALOGO.map(([label,col]) => [col,label])];

  const dataRows = rows.map(r => {
    const c = r.caso;
    return allHeaders.map(([col,label]) => {
      let val = c[col];
      if(['escalonamiento','resolucion','s_validacion','up_enlace','s_validacion_hyve','up_enlace_hyve'].includes(col)){
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
    <x:Name>Tabla de Materiales</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head><body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsHeader], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `tabla-materiales-${new Date().toISOString().slice(0,10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast(`Excel generado con ${rows.length} caso${rows.length === 1 ? '' : 's'} con materiales`);
}

document.getElementById('btnExportarMateriales').addEventListener('click', () => {
  if(matTablaSubtab === 'tabla') exportarTablaMateriales();
  else exportarResumenMateriales();
});

/* ============================================================
   HYVE (mismo patrón que Casos Movistar, tabla propia casos_hyve)
============================================================ */