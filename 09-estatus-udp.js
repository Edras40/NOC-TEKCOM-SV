// ============================================================
// 07-cumplimiento.js  —  Cumplimiento de visitas
// Parte de la aplicación NOC Tekcom. Se carga en orden desde index.html;
// NO reordenar las etiquetas <script> ni renombrar estos archivos.
// ============================================================

const CUMPLIMIENTO_REST_URL = `${SUPABASE_URL}/rest/v1/cumplimiento_visitas`;
let allCumplimiento = [];
let cumplimientoLoaded = false;
let currentCumplimientoEditId = null;
let pendingCumplimientoDeleteId = null;
const CUMPLIMIENTO_POR_PAGINA = 20;
let cumplimientoPaginaActual = 1;

async function fetchCumplimiento(){
  try{
    const res = await fetch(`${CUMPLIMIENTO_REST_URL}?select=*&order=fecha.desc`, { headers: sbHeaders });
    if(!res.ok) throw new Error('Error al cargar datos (' + res.status + ')');
    allCumplimiento = await res.json();
    populateCumplimientoFiltros();
    actualizarCascadaCumplimiento('cump');
    renderCumplimientoTable();
  }catch(err){
    console.error(err);
    document.getElementById('cumplimientoTableWrap').innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div class="empty-title">No se pudo conectar con la base de datos</div>
        <div class="empty-desc">${err.message}</div>
      </div>`;
    showToast('Error al conectar con Supabase', 'error');
  }
}

/* ---- Cascada de filtros: Año → Mes → Semana → Día (solo muestra lo que realmente existe) ---- */
function actualizarCascadaCumplimiento(prefijo){
  const proyectoSel = document.getElementById(`${prefijo}ProyectoFilter`);
  const anoSel = document.getElementById(`${prefijo}AnoFilter`);
  const mesSel = document.getElementById(`${prefijo}MesFilter`);
  const semanaSel = document.getElementById(`${prefijo}SemanaFilter`);
  const diaSel = document.getElementById(`${prefijo}DiaFilter`);
  const zonaSel = document.getElementById(`${prefijo}ZonaFilter`);
  const cumplSel = document.getElementById(`${prefijo}CumplimientoFilter`);

  const proyectoVal = proyectoSel ? proyectoSel.value : '';
  const zonaVal = zonaSel ? zonaSel.value : '';
  const cumplVal = cumplSel ? cumplSel.value : '';
  const anoVal = anoSel ? anoSel.value : '';
  const mesVal = mesSel ? mesSel.value : '';
  const semanaVal = semanaSel ? semanaSel.value : '';

  const setOpts = (sel, defaultLabel, values, { sortNum = false, esMes = false } = {}) => {
    if(!sel) return;
    const curVal = sel.value;
    let unique = [...new Set(values.filter(v => v !== null && v !== undefined && v !== ''))];
    if(esMes){
      unique = MESES_ES.filter(m => unique.includes(m));
    } else {
      unique.sort(sortNum ? (a,b) => a-b : (a,b) => String(a).localeCompare(String(b)));
    }
    sel.innerHTML = `<option value="">${defaultLabel}</option>` + unique.map(v => `<option>${escapeHtml(String(v))}</option>`).join('');
    if(unique.map(String).includes(curVal)) sel.value = curVal;
  };

  const base = allCumplimiento.filter(c =>
    (!proyectoVal || c.proyecto === proyectoVal) &&
    (!zonaVal || c.zona === zonaVal) &&
    (!cumplVal || c.cumplimiento === cumplVal)
  );

  // Paso 1: Año → opciones de Mes
  const paso1 = base.filter(c => !anoVal || String(c.anio) === anoVal);
  setOpts(mesSel, 'Todos los meses', paso1.map(c => c.mes), { esMes: true });

  // Paso 2: Año + Mes → opciones de Semana
  const paso2 = paso1.filter(c => !mesVal || c.mes === mesVal);
  setOpts(semanaSel, 'Todas las semanas', paso2.map(c => c.semana), { sortNum: true });

  // Paso 3: Año + Mes + Semana → opciones de Día
  const paso3 = paso2.filter(c => !semanaVal || String(c.semana) === semanaVal);
  setOpts(diaSel, 'Todos los días', paso3.map(c => c.dia), { sortNum: true });
}

function populateCumplimientoFiltros(){
  const proyectos = [...new Set(allCumplimiento.map(c => c.proyecto).filter(Boolean))].sort();
  const anos = [...new Set(allCumplimiento.map(c => c.anio).filter(Boolean))].sort((a,b) => b-a);
  const meses = [...new Set(allCumplimiento.map(c => c.mes).filter(Boolean))];

  const selProyecto = document.getElementById('cumpProyectoFilter');
  const valProyecto = selProyecto.value;
  selProyecto.innerHTML = '<option value="">Todos los proyectos</option>' +
    proyectos.map(p => `<option ${p===valProyecto?'selected':''}>${escapeHtml(p)}</option>`).join('');

  const selAno = document.getElementById('cumpAnoFilter');
  const valAno = selAno.value;
  selAno.innerHTML = '<option value="">Todos los años</option>' +
    anos.map(a => `<option ${String(a)===valAno?'selected':''}>${a}</option>`).join('');

  const selMes = document.getElementById('cumpMesFilter');
  const valMes = selMes.value;
  selMes.innerHTML = '<option value="">Todos los meses</option>' +
    MESES_ES.filter(m => meses.includes(m)).map(m => `<option ${m===valMes?'selected':''}>${m}</option>`).join('');
}

function getCumplimientoFiltrados(){
  const q = document.getElementById('cumpSearch').value.trim().toLowerCase();
  const proyecto = document.getElementById('cumpProyectoFilter').value;
  const ano = document.getElementById('cumpAnoFilter').value;
  const mes = document.getElementById('cumpMesFilter').value;
  const semana = document.getElementById('cumpSemanaFilter').value;
  const dia = document.getElementById('cumpDiaFilter').value;
  const cumplimiento = document.getElementById('cumpCumplimientoFilter').value;

  return allCumplimiento.filter(c => {
    const matchesQ = !q ||
      (c.asignacion||'').toLowerCase().includes(q) ||
      (c.proyecto||'').toLowerCase().includes(q) ||
      (c.team_lider||'').toLowerCase().includes(q) ||
      (c.zona||'').toLowerCase().includes(q);
    const matchesProyecto = !proyecto || c.proyecto === proyecto;
    const matchesAno = !ano || String(c.anio) === ano;
    const matchesMes = !mes || c.mes === mes;
    const matchesSemana = !semana || String(c.semana) === semana;
    const matchesDia = !dia || String(c.dia) === dia;
    const matchesCumplimiento = !cumplimiento || c.cumplimiento === cumplimiento;
    return matchesQ && matchesProyecto && matchesAno && matchesMes && matchesSemana && matchesDia && matchesCumplimiento;
  });
}

function cumplimientoChipClass(valor){
  if(valor === 'Si') return 'status-finalizada';
  if(valor === 'No') return 'status-cancelado';
  return '';
}

function cumplimientoRowHtml(c){
  return `
    <tr>
      <td>${c.fecha ? new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-SV') : '—'}</td>
      <td>${escapeHtml(c.proyecto || '—')}</td>
      <td>${escapeHtml(c.asignacion || '—')}</td>
      <td>${escapeHtml(c.team_lider || '—')}</td>
      <td>${escapeHtml(c.zona || '—')}</td>
      <td>${c.cumplimiento ? `<span class="status-chip ${cumplimientoChipClass(c.cumplimiento)}">${escapeHtml(c.cumplimiento)}</span>` : '<span style="color:var(--text-faint);">—</span>'}</td>
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
    </tr>`;
}

function renderCumplimientoTable(resetPagina = true){
  const wrap = document.getElementById('cumplimientoTableWrap');
  if(resetPagina) cumplimientoPaginaActual = 1;

  const rows = getCumplimientoFiltrados();

  if(rows.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
        <div class="empty-title">${allCumplimiento.length === 0 ? 'Aún no hay registros de cumplimiento' : 'Sin resultados'}</div>
        <div class="empty-desc">${allCumplimiento.length === 0 ? 'Agrega el primer registro usando el botón "Agregar Registro".' : 'Prueba con otro término de búsqueda o filtro.'}</div>
      </div>`;
    return;
  }

  const totalPaginas = Math.max(1, Math.ceil(rows.length / CUMPLIMIENTO_POR_PAGINA));
  if(cumplimientoPaginaActual > totalPaginas) cumplimientoPaginaActual = totalPaginas;
  const startIdx = (cumplimientoPaginaActual - 1) * CUMPLIMIENTO_POR_PAGINA;
  const pageRows = rows.slice(startIdx, startIdx + CUMPLIMIENTO_POR_PAGINA);

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Proyecto</th>
          <th>Asignación</th>
          <th>Team Líder</th>
          <th>Zona</th>
          <th>Cumplimiento</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows.map(c => cumplimientoRowHtml(c)).join('')}
      </tbody>
    </table>
    <div class="pagination-bar">
      <div class="pagination-info">Mostrando ${startIdx + 1}–${Math.min(startIdx + CUMPLIMIENTO_POR_PAGINA, rows.length)} de ${rows.length} registros</div>
      <div class="pagination-controls" id="cumplimientoPaginationControls"></div>
    </div>
  `;

  renderCumplimientoPaginationControls(totalPaginas);

  wrap.querySelectorAll('[data-caction]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.caction;
      const registro = allCumplimiento.find(c => String(c.id) === String(id));
      if(action === 'view') openCumplimientoViewModal(registro);
      if(action === 'edit') openCumplimientoFormModal(registro);
      if(action === 'delete') openCumplimientoDeleteModal(registro);
    });
  });
}

function renderCumplimientoPaginationControls(totalPaginas){
  const wrap = document.getElementById('cumplimientoPaginationControls');
  if(!wrap || totalPaginas <= 1) return;

  const pages = [];
  const cur = cumplimientoPaginaActual;
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
      cumplimientoPaginaActual = parseInt(btn.dataset.page, 10);
      renderCumplimientoTable(false);
    });
  });
}

document.getElementById('cumpSearch').addEventListener('input', renderCumplimientoTable);
document.getElementById('cumpProyectoFilter').addEventListener('change', () => { actualizarCascadaCumplimiento('cump'); renderCumplimientoTable(); });
document.getElementById('cumpAnoFilter').addEventListener('change', () => { actualizarCascadaCumplimiento('cump'); renderCumplimientoTable(); });
document.getElementById('cumpMesFilter').addEventListener('change', () => { actualizarCascadaCumplimiento('cump'); renderCumplimientoTable(); });
document.getElementById('cumpSemanaFilter').addEventListener('change', () => { actualizarCascadaCumplimiento('cump'); renderCumplimientoTable(); });
document.getElementById('cumpDiaFilter').addEventListener('change', renderCumplimientoTable);
document.getElementById('cumpCumplimientoFilter').addEventListener('change', () => { actualizarCascadaCumplimiento('cump'); renderCumplimientoTable(); });

/* ---- Auto-cálculo de Mes / Año / Semana / Día a partir de la Fecha ---- */
document.getElementById('cumpFecha').addEventListener('change', () => {
  const val = document.getElementById('cumpFecha').value;
  if(!val) return;
  const d = new Date(val + 'T00:00:00');
  document.getElementById('cumpMes').value = MESES_ES[d.getMonth()];
  document.getElementById('cumpAnio').value = d.getFullYear();
  document.getElementById('cumpSemana').value = getSemanaISO(d);
  document.getElementById('cumpDia').value = d.getDate();
});

/* ---- Modal Agregar / Editar Cumplimiento ---- */
const cumplimientoFormModalOverlay = document.getElementById('cumplimientoFormModalOverlay');

const cumpTecnicoSearch = document.getElementById('cump_tecnico_search');
const cumpTecnicoResults = document.getElementById('cump_tecnico_results');

function setCumpTecnico(persona){
  document.getElementById('cump_tecnico_id').value = persona ? persona.id : '';
  if(persona){
    document.getElementById('cump_tecnico_avatar').textContent = initials(persona.nombre);
    document.getElementById('cump_tecnico_avatar').style.background = colorFor(persona.cuadrilla || persona.nombre || '');
    document.getElementById('cump_tecnico_name').textContent = persona.nombre;
    document.getElementById('cump_tecnico_meta').textContent = (persona.cuadrilla || '—') + ' · ' + (persona.puesto || '—');
    document.getElementById('cump_tecnico_selected').style.display = 'block';
  } else {
    document.getElementById('cump_tecnico_selected').style.display = 'none';
  }
}
cumpTecnicoSearch.addEventListener('input', () => {
  const term = cumpTecnicoSearch.value.trim().toLowerCase();
  if(!term){ cumpTecnicoResults.classList.remove('show'); cumpTecnicoResults.innerHTML=''; return; }
  const matches = allPeople.filter(p => (p.nombre||'').toLowerCase().includes(term)).slice(0, 20);
  cumpTecnicoResults.innerHTML = matches.length === 0
    ? '<div class="site-result-empty">Sin resultados</div>'
    : matches.map(p => `
        <div class="site-result-item" data-cumptecnico-id="${escapeHtml(p.id)}">
          <div class="site-result-name">${escapeHtml(p.nombre)}</div>
          <div class="site-result-meta">${escapeHtml(p.cuadrilla || '—')} · ${escapeHtml(p.puesto || '—')}</div>
        </div>
      `).join('');
  cumpTecnicoResults.classList.add('show');
});
cumpTecnicoResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-cumptecnico-id]');
  if(!item) return;
  const persona = allPeople.find(p => String(p.id) === String(item.dataset.cumptecnicoId));
  if(persona){ setCumpTecnico(persona); }
  cumpTecnicoSearch.value = '';
  cumpTecnicoResults.classList.remove('show');
  cumpTecnicoResults.innerHTML = '';
});
document.addEventListener('click', (e) => {
  if(!e.target.closest('#cump_tecnico_search') && !e.target.closest('#cump_tecnico_results')){
    cumpTecnicoResults.classList.remove('show');
  }
});
document.getElementById('cump_tecnico_clear').addEventListener('click', () => setCumpTecnico(null));

function openCumplimientoFormModal(registro){
  if(document.getElementById('cumpAnio').options.length === 0){
    const anioSel = document.getElementById('cumpAnio');
    let opts = '<option value="">—</option>';
    for(let y = 2024; y <= 2037; y++){ opts += `<option>${y}</option>`; }
    anioSel.innerHTML = opts;
    document.getElementById('cumpMes').innerHTML = '<option value="">—</option>' + MESES_ES.map(m => `<option>${m}</option>`).join('');

    const semanaSel = document.getElementById('cumpSemana');
    let optsSemana = '<option value="">—</option>';
    for(let s = 1; s <= 54; s++){ optsSemana += `<option>${s}</option>`; }
    semanaSel.innerHTML = optsSemana;

    const diaSel = document.getElementById('cumpDia');
    let optsDia = '<option value="">—</option>';
    for(let d = 1; d <= 31; d++){ optsDia += `<option>${d}</option>`; }
    diaSel.innerHTML = optsDia;
  }

  currentCumplimientoEditId = registro ? registro.id : null;
  document.getElementById('cumplimientoFormModalTitle').textContent = registro ? 'Editar Registro' : 'Agregar Registro';

  if(registro){
    document.getElementById('cumpFecha').value = registro.fecha || '';
    document.getElementById('cumpProyecto').value = registro.proyecto || 'Movistar';
    document.getElementById('cumpMes').value = registro.mes || '';
    document.getElementById('cumpAnio').value = registro.anio ?? '';
    document.getElementById('cumpSemana').value = registro.semana ?? '';
    document.getElementById('cumpDia').value = registro.dia ?? '';
  } else {
    // Registro nuevo: la Fecha siempre toma automáticamente la fecha actual del sistema (PC)
    const now = new Date();
    const pad = n => String(n).padStart(2,'0');
    document.getElementById('cumpFecha').value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    document.getElementById('cumpProyecto').value = 'Movistar';
    document.getElementById('cumpMes').value = MESES_ES[now.getMonth()];
    document.getElementById('cumpAnio').value = now.getFullYear();
    document.getElementById('cumpSemana').value = getSemanaISO(now);
    document.getElementById('cumpDia').value = now.getDate();
  }

  cumpTecnicoSearch.value = '';
  if(registro && registro.team_lider){
    const personaLider = allPeople.find(p => p.nombre === registro.team_lider);
    if(personaLider){
      setCumpTecnico(personaLider);
    } else {
      // Nombre guardado pero no encontrado en el Listado del Personal actual: mostrarlo igual
      document.getElementById('cump_tecnico_id').value = '';
      document.getElementById('cump_tecnico_avatar').textContent = initials(registro.team_lider);
      document.getElementById('cump_tecnico_avatar').style.background = colorFor(registro.team_lider);
      document.getElementById('cump_tecnico_name').textContent = registro.team_lider;
      document.getElementById('cump_tecnico_meta').textContent = '—';
      document.getElementById('cump_tecnico_selected').style.display = 'block';
    }
  } else {
    setCumpTecnico(null);
  }

  document.getElementById('cumpAsignacion').value = registro?.asignacion || '';
  document.getElementById('cumpZona').value = registro?.zona || 'Central';
  document.getElementById('cumpCumplimiento').value = registro?.cumplimiento || '';
  document.getElementById('cumpMotivo').value = registro?.motivo_incumplimiento || '';
  // Descripción: por defecto sale "Programado para el día ..." con la fecha del formulario; el usuario puede editarlo o borrarlo
  if(registro){
    document.getElementById('cumpDescripcion').value = registro.descripcion || '';
  } else {
    const fechaTxt = new Date(document.getElementById('cumpFecha').value + 'T00:00:00').toLocaleDateString('es-SV', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    document.getElementById('cumpDescripcion').value = `Programado para el día ${fechaTxt}`;
  }

  cumplimientoFormModalOverlay.classList.add('active');
}

document.getElementById('btnAddCumplimiento').addEventListener('click', () => openCumplimientoFormModal(null));
document.getElementById('cumplimientoFormModalClose').addEventListener('click', () => cumplimientoFormModalOverlay.classList.remove('active'));
document.getElementById('cumplimientoFormModalCancel').addEventListener('click', () => cumplimientoFormModalOverlay.classList.remove('active'));

document.getElementById('cumplimientoFormModalSave').addEventListener('click', async () => {
  const toTextOrNull = (id) => {
    const v = document.getElementById(id).value.trim();
    return v === '' ? null : v;
  };
  const toIntOrNull = (id) => {
    const v = document.getElementById(id).value;
    return v === '' ? null : parseInt(v, 10);
  };

  const cumpTecnicoId = document.getElementById('cump_tecnico_id').value;
  const cumpTecnicoPersona = cumpTecnicoId ? allPeople.find(p => String(p.id) === String(cumpTecnicoId)) : null;
  const cumpNombreLider = cumpTecnicoPersona ? cumpTecnicoPersona.nombre : (document.getElementById('cump_tecnico_name').textContent !== '—' ? document.getElementById('cump_tecnico_name').textContent : null);

  const payload = {
    fecha: toTextOrNull('cumpFecha'),
    proyecto: toTextOrNull('cumpProyecto'),
    mes: toTextOrNull('cumpMes'),
    anio: toIntOrNull('cumpAnio'),
    semana: toIntOrNull('cumpSemana'),
    dia: toIntOrNull('cumpDia'),
    asignacion: toTextOrNull('cumpAsignacion'),
    team_lider: cumpNombreLider,
    zona: toTextOrNull('cumpZona'),
    cumplimiento: toTextOrNull('cumpCumplimiento'),
    motivo_incumplimiento: toTextOrNull('cumpMotivo'),
    descripcion: toTextOrNull('cumpDescripcion')
  };

  if(!payload.fecha){
    showToast('La fecha es obligatoria', 'error');
    return;
  }

  try{
    let res;
    if(currentCumplimientoEditId){
      res = await fetch(`${CUMPLIMIENTO_REST_URL}?id=eq.${currentCumplimientoEditId}`, {
        method: 'PATCH',
        headers: { ...sbHeaders, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(CUMPLIMIENTO_REST_URL, {
        method: 'POST',
        headers: { ...sbHeaders, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(payload)
      });
    }
    if(!res.ok) throw new Error('Error al guardar (' + res.status + ')');

    cumplimientoFormModalOverlay.classList.remove('active');
    showToast(currentCumplimientoEditId ? 'Registro actualizado correctamente' : 'Registro agregado correctamente');
    await fetchCumplimiento();
  }catch(err){
    console.error(err);
    showToast('Error al guardar el registro', 'error');
  }
});

/* ---- Modal Ver Cumplimiento ---- */
const cumplimientoViewModalOverlay = document.getElementById('cumplimientoViewModalOverlay');
function openCumplimientoViewModal(c){
  const campos = [
    ['Fecha', c.fecha ? new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-SV') : null],
    ['Proyecto', c.proyecto], ['Año', c.anio], ['Mes', c.mes], ['Semana', c.semana], ['Día', c.dia],
    ['Asignación', c.asignacion], ['Team Líder', c.team_lider], ['Zona', c.zona],
    ['Cumplimiento', c.cumplimiento], ['Motivo de Incumplimiento', c.motivo_incumplimiento],
    ['Descripción', c.descripcion]
  ];
  document.getElementById('cumplimientoViewModalBody').innerHTML = campos.map(([label, val]) => `
    <div style="display:flex; justify-content:space-between; gap:16px; padding:8px 0; border-bottom:1px solid var(--border);">
      <div style="color:var(--text-dim); font-weight:600; min-width:160px;">${label}</div>
      <div style="text-align:right; word-break:break-word;">${val !== null && val !== undefined && val !== '' ? escapeHtml(String(val)) : '—'}</div>
    </div>
  `).join('');
  cumplimientoViewModalOverlay.classList.add('active');
}
document.getElementById('cumplimientoViewModalClose').addEventListener('click', () => cumplimientoViewModalOverlay.classList.remove('active'));

/* ---- Modal Eliminar Cumplimiento ---- */
const cumplimientoDeleteModalOverlay = document.getElementById('cumplimientoDeleteModalOverlay');
function openCumplimientoDeleteModal(c){
  pendingCumplimientoDeleteId = c.id;
  cumplimientoDeleteModalOverlay.classList.add('active');
}
document.getElementById('cumplimientoDeleteModalClose').addEventListener('click', () => cumplimientoDeleteModalOverlay.classList.remove('active'));
document.getElementById('cumplimientoDeleteModalCancel').addEventListener('click', () => cumplimientoDeleteModalOverlay.classList.remove('active'));
document.getElementById('cumplimientoDeleteModalConfirm').addEventListener('click', async () => {
  try{
    const res = await fetch(`${CUMPLIMIENTO_REST_URL}?id=eq.${pendingCumplimientoDeleteId}`, {
      method: 'DELETE',
      headers: sbHeaders
    });
    if(!res.ok) throw new Error('Error al eliminar (' + res.status + ')');
    cumplimientoDeleteModalOverlay.classList.remove('active');
    showToast('Registro eliminado correctamente');
    await fetchCumplimiento();
  }catch(err){
    console.error(err);
    showToast('Error al eliminar el registro', 'error');
  }
});

/* ---- Exportar a Excel ---- */
document.getElementById('btnExportarCumplimiento').addEventListener('click', () => {
  const aExportar = getCumplimientoFiltrados();
  if(aExportar.length === 0){
    showToast('No hay registros que coincidan con los filtros para exportar', 'error');
    return;
  }

  const headers = [
    ['fecha','Fecha'],['anio','Año'],['mes','Mes'],['semana','Semana'],['dia','Dias'],
    ['asignacion','Asignacion'],['proyecto','Proyecto'],['team_lider','Team Lider'],['zona','Zona'],
    ['cumplimiento','Cumplimiento'],['motivo_incumplimiento','Motivo de Incumplimiento'],['descripcion','Descripcion']
  ];

  const rows = aExportar.map(c => headers.map(([col]) => {
    const val = c[col];
    return (val === null || val === undefined) ? '' : val;
  }));

  const escapeXlsHtml = (v) => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let html = '<table border="1" style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt;">';
  html += '<thead><tr>';
  headers.forEach(([col,label]) => {
    html += `<th style="background-color:#0A6A99;color:#FFFFFF;font-weight:bold;padding:6px 10px;border:1px solid #08526E;white-space:nowrap;">${escapeXlsHtml(label)}</th>`;
  });
  html += '</tr></thead><tbody>';
  rows.forEach(row => {
    html += '<tr>';
    row.forEach(val => { html += `<td style="padding:5px 10px;border:1px solid #DDDDDD;">${escapeXlsHtml(val)}</td>`; });
    html += '</tr>';
  });
  html += '</tbody></table>';

  const xlsHeader = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8">
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
    <x:Name>Cumplimiento de Visitas</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head><body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsHeader], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `cumplimiento-visitas-${new Date().toISOString().slice(0,10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast(`Excel generado con ${aExportar.length} registro${aExportar.length === 1 ? '' : 's'} filtrado${aExportar.length === 1 ? '' : 's'}`);
});

/* ---- Sub-tabs dentro de Cumplimiento de Visitas: Listado / Dashboard ---- */
document.querySelectorAll('[data-subtab-cu]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.subtabCu;
    document.querySelectorAll('[data-subtab-cu]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('subtabcu-listado').classList.remove('active');
    document.getElementById('subtabcu-dashboard').classList.remove('active');
    document.getElementById('subtabcu-' + tab).classList.add('active');
    if(tab === 'dashboard'){
      populateCumpDashFiltros();
      actualizarCascadaCumplimiento('dashCump');
      renderCumplimientoDashboard();
    }
  });
});

/* ---- Dashboard: filtros y gráfico de porcentaje Cumplimiento (verde) / Incumplimiento (rojo) ---- */
function populateCumpDashFiltros(){
  const proyectos = [...new Set(allCumplimiento.map(c => c.proyecto).filter(Boolean))].sort();
  const anos = [...new Set(allCumplimiento.map(c => c.anio).filter(Boolean))].sort((a,b) => b-a);
  const meses = [...new Set(allCumplimiento.map(c => c.mes).filter(Boolean))];
  const semanas = [...new Set(allCumplimiento.map(c => c.semana).filter(Boolean))].sort((a,b) => a-b);

  const selProyecto = document.getElementById('dashCumpProyectoFilter');
  const valProyecto = selProyecto.value;
  selProyecto.innerHTML = '<option value="">Todos los proyectos</option>' +
    proyectos.map(p => `<option ${p===valProyecto?'selected':''}>${escapeHtml(p)}</option>`).join('');

  const selAno = document.getElementById('dashCumpAnoFilter');
  const valAno = selAno.value;
  selAno.innerHTML = '<option value="">Todos los años</option>' +
    anos.map(a => `<option ${String(a)===valAno?'selected':''}>${a}</option>`).join('');

  const selMes = document.getElementById('dashCumpMesFilter');
  const valMes = selMes.value;
  selMes.innerHTML = '<option value="">Todos los meses</option>' +
    MESES_ES.filter(m => meses.includes(m)).map(m => `<option ${m===valMes?'selected':''}>${m}</option>`).join('');

  const selSemana = document.getElementById('dashCumpSemanaFilter');
  const valSemana = selSemana.value;
  selSemana.innerHTML = '<option value="">Todas las semanas</option>' +
    semanas.map(s => `<option ${String(s)===valSemana?'selected':''}>${s}</option>`).join('');
}

function getCumplimientoDashFiltrados(){
  const proyecto = document.getElementById('dashCumpProyectoFilter').value;
  const ano = document.getElementById('dashCumpAnoFilter').value;
  const mes = document.getElementById('dashCumpMesFilter').value;
  const semana = document.getElementById('dashCumpSemanaFilter').value;
  const dia = document.getElementById('dashCumpDiaFilter').value;
  const zona = document.getElementById('dashCumpZonaFilter').value;

  return allCumplimiento.filter(c => {
    const matchesProyecto = !proyecto || c.proyecto === proyecto;
    const matchesAno = !ano || String(c.anio) === ano;
    const matchesMes = !mes || c.mes === mes;
    const matchesSemana = !semana || String(c.semana) === semana;
    const matchesDia = !dia || String(c.dia) === dia;
    const matchesZona = !zona || c.zona === zona;
    return matchesProyecto && matchesAno && matchesMes && matchesSemana && matchesDia && matchesZona;
  });
}

function renderCumplimientoDashboard(){
  const datos = getCumplimientoDashFiltrados();
  const wrap = document.getElementById('dashCumplimientoBar');

  const siCount = datos.filter(c => c.cumplimiento === 'Si').length;
  const noCount = datos.filter(c => c.cumplimiento === 'No').length;
  const total = siCount + noCount;

  if(total === 0){
    wrap.innerHTML = '<div class="material-empty">Sin datos para los filtros seleccionados</div>';
  } else {
    const pctSi = Math.round((siCount / total) * 100);
    const pctNo = 100 - pctSi;

    wrap.innerHTML = `
      <div style="display:flex; height:56px; border-radius:10px; overflow:hidden; box-shadow:inset 0 0 0 1px var(--border);">
        ${pctSi > 0 ? `<div style="width:${pctSi}%; background:#16A34A; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:15px; transition:width .3s;">${pctSi}%</div>` : ''}
        ${pctNo > 0 ? `<div style="width:${pctNo}%; background:#DC2626; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:15px; transition:width .3s;">${pctNo}%</div>` : ''}
      </div>
      <div style="display:flex; gap:28px; margin-top:16px; font-size:13px; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:8px;"><span style="width:11px; height:11px; border-radius:3px; background:#16A34A; display:inline-block;"></span> Cumplimiento: ${siCount} de ${total} (${pctSi}%)</div>
        <div style="display:flex; align-items:center; gap:8px;"><span style="width:11px; height:11px; border-radius:3px; background:#DC2626; display:inline-block;"></span> Incumplimiento: ${noCount} de ${total} (${pctNo}%)</div>
      </div>
    `;
  }

  renderCumplimientoPorTeamLider(datos);
}

function renderCumplimientoPorTeamLider(datos){
  const wrap = document.getElementById('dashCumplimientoTeamLider');

  const porLider = {};
  datos.forEach(c => {
    if(!c.team_lider) return;
    if(c.cumplimiento !== 'Si' && c.cumplimiento !== 'No') return;
    if(!porLider[c.team_lider]) porLider[c.team_lider] = { si: 0, no: 0 };
    if(c.cumplimiento === 'Si') porLider[c.team_lider].si++;
    else porLider[c.team_lider].no++;
  });

  const entries = Object.entries(porLider).map(([lider, v]) => {
    const total = v.si + v.no;
    const pctSi = Math.round((v.si / total) * 100);
    return { lider, total, si: v.si, no: v.no, pctSi, pctNo: 100 - pctSi };
  }).sort((a, b) => b.pctSi - a.pctSi || b.total - a.total);

  if(!entries.length){
    wrap.innerHTML = '<div class="material-empty">Sin datos para los filtros seleccionados</div>';
    return;
  }

  wrap.innerHTML = `<div class="dash-bar-wrap">${entries.map(e => `
    <div class="dash-bar-row">
      <div class="dash-bar-label" style="width:170px; min-width:170px; max-width:170px; flex:0 0 170px;" title="${escapeHtml(e.lider)}">${escapeHtml(e.lider)}</div>
      <div class="dash-bar-track" style="display:flex;">
        ${e.pctSi > 0 ? `<div style="width:${e.pctSi}%; background:#16A34A; display:flex; align-items:center; justify-content:center; color:#fff; font-size:10.5px; font-weight:700;">${e.pctSi > 8 ? e.pctSi + '%' : ''}</div>` : ''}
        ${e.pctNo > 0 ? `<div style="width:${e.pctNo}%; background:#DC2626; display:flex; align-items:center; justify-content:center; color:#fff; font-size:10.5px; font-weight:700;">${e.pctNo > 8 ? e.pctNo + '%' : ''}</div>` : ''}
      </div>
      <div style="font-size:11px; color:var(--text-dim); min-width:80px; text-align:right; white-space:nowrap;">${e.si}/${e.total} visitas</div>
    </div>
  `).join('')}</div>`;
}

['dashCumpProyectoFilter','dashCumpAnoFilter','dashCumpMesFilter','dashCumpSemanaFilter','dashCumpDiaFilter','dashCumpZonaFilter'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => {
    actualizarCascadaCumplimiento('dashCump');
    renderCumplimientoDashboard();
  });
});

document.getElementById('btnDashCumpLimpiarFiltros').addEventListener('click', () => {
  ['dashCumpProyectoFilter','dashCumpAnoFilter','dashCumpMesFilter','dashCumpSemanaFilter','dashCumpDiaFilter','dashCumpZonaFilter'].forEach(id => {
    document.getElementById(id).value = '';
  });
  actualizarCascadaCumplimiento('dashCump');
  renderCumplimientoDashboard();
});

document.getElementById('btnDashCumpExportarPDF').addEventListener('click', () => {
  exportarDashboardPDF('cumpDashboardCharts', 'Dashboard - Cumplimiento de Visitas');
});

document.getElementById('btnDashCumpExportarPPTX').addEventListener('click', async () => {
  showToast('Generando PowerPoint…');
  try{
    const datos = getCumplimientoDashFiltrados();
    const siCount = datos.filter(c => c.cumplimiento === 'Si').length;
    const noCount = datos.filter(c => c.cumplimiento === 'No').length;

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name:'TEKCOM_16x9', width:13.33, height:7.5 });
    pptx.layout = 'TEKCOM_16x9';
    pptxAddTitleSlide(pptx, 'Dashboard - Cumplimiento de Visitas');

    if(siCount + noCount === 0){
      pptxAddEmptySlide(pptx, 'Cumplimiento de Visitas');
    } else {
      pptxAddPieChartSlide(pptx, 'Cumplimiento de Visitas', ['Cumplimiento','Incumplimiento'], [siCount, noCount]);
    }

    const porLider = {};
    datos.forEach(c => {
      if(!c.team_lider) return;
      if(c.cumplimiento !== 'Si' && c.cumplimiento !== 'No') return;
      if(!porLider[c.team_lider]) porLider[c.team_lider] = { si: 0, no: 0 };
      if(c.cumplimiento === 'Si') porLider[c.team_lider].si++;
      else porLider[c.team_lider].no++;
    });
    const entriesLider = Object.entries(porLider).map(([lider, v]) => {
      const total = v.si + v.no;
      return [lider, Math.round((v.si / total) * 100)];
    }).sort((a,b) => b[1] - a[1]);

    pptxAddBarChartSlide(pptx, 'Cumplimiento por Team Líder (%)', entriesLider.map(([l])=>l), entriesLider.map(([,v])=>v), { horizontal:true, color:'16A34A' });

    await pptx.writeFile({ fileName:'Dashboard_Cumplimiento_de_Visitas.pptx' });
    showToast('PowerPoint generado correctamente');
  }catch(err){
    console.error(err);
    showToast('Error al generar el PowerPoint', 'error');
  }
});

/* ==================================================================
   EXPORTACIÓN DE DASHBOARDS A PDF Y POWERPOINT (uso general)
   Aplica a: Casos Movistar, HYVE, Cable Color y Actividades Diarias
   ================================================================== */

async function capturarDashboardCanvas(containerId){
  const el = document.getElementById(containerId);
  if(!el) throw new Error('No se encontró el contenedor del dashboard: ' + containerId);
  const isLight = document.body.classList.contains('light');
  return await html2canvas(el, {
    backgroundColor: isLight ? '#F2F3F8' : '#0B0E14',
    scale: 2,
    useCORS: true
  });
}

async function exportarDashboardPDF(containerId, titulo, subtitulo){
  showToast('Generando PDF…');
  try{
    const canvas = await capturarDashboardCanvas(containerId);
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const fecha = new Date().toLocaleDateString('es-SV', { year:'numeric', month:'long', day:'numeric' });

    // ---- Portada profesional ----
    pdf.setFillColor(11,14,20);
    pdf.rect(0, 0, pageW, pageH, 'F');
    pdf.setFillColor(10,106,153);
    pdf.rect(0, pageH/2 - 70, pageW, 4, 'F');
    pdf.setTextColor(255,255,255);
    pdf.setFont('helvetica','bold');
    pdf.setFontSize(30);
    pdf.text(titulo, pageW/2, pageH/2 - 20, { align:'center' });
    pdf.setFont('helvetica','normal');
    pdf.setFontSize(13);
    pdf.setTextColor(200,210,220);
    pdf.text(subtitulo || 'Operación Tekcom - El Salvador', pageW/2, pageH/2 + 8, { align:'center' });
    pdf.setFontSize(10);
    pdf.setTextColor(140,150,165);
    pdf.text(`Generado el ${fecha}`, pageW/2, pageH/2 + 30, { align:'center' });

    // ---- Página con el contenido del dashboard ----
    pdf.addPage();
    pdf.setFillColor(245,246,250);
    pdf.rect(0, 0, pageW, pageH, 'F');
    pdf.setFillColor(10,106,153);
    pdf.rect(0, 0, pageW, 46, 'F');
    pdf.setTextColor(255,255,255);
    pdf.setFont('helvetica','bold');
    pdf.setFontSize(14);
    pdf.text(titulo, 24, 29);

    const margin = 24;
    const topOffset = 46 + 20;
    const availW = pageW - margin*2;
    const availH = pageH - topOffset - 34;
    const imgProps = pdf.getImageProperties(imgData);
    let w = availW; let h = (imgProps.height*w)/imgProps.width;
    if(h > availH){ h = availH; w = (imgProps.width*h)/imgProps.height; }
    const x = (pageW - w)/2;
    const y = topOffset;
    pdf.addImage(imgData, 'PNG', x, y, w, h);

    pdf.setFontSize(8.5);
    pdf.setTextColor(120,128,145);
    pdf.setFont('helvetica','normal');
    pdf.text(`Generado el ${new Date().toLocaleString('es-SV')} · Operación Tekcom - El Salvador`, margin, pageH - 14);

    pdf.save(`${titulo.replace(/\s+/g,'_')}.pdf`);
    showToast('PDF generado correctamente');
  }catch(err){
    console.error(err);
    showToast('Error al generar el PDF', 'error');
  }
}

async function exportarDashboardPPTX(containerId, titulo, subtitulo){
  showToast('Generando PowerPoint…');
  try{
    const canvas = await capturarDashboardCanvas(containerId);
    const imgData = canvas.toDataURL('image/png');
    const imgDims = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.onerror = reject;
      img.src = imgData;
    });

    const pptx = new PptxGenJS();
    pptx.defineLayout({ name:'TEKCOM_16x9', width:13.33, height:7.5 });
    pptx.layout = 'TEKCOM_16x9';
    const fecha = new Date().toLocaleDateString('es-SV', { year:'numeric', month:'long', day:'numeric' });

    // ---- Slide de portada ----
    const portada = pptx.addSlide();
    portada.background = { color:'0B0E14' };
    portada.addShape('rect', { x:0, y:3.55, w:13.33, h:0.04, fill:{ color:'0A6A99' } });
    portada.addText(titulo, { x:0.5, y:2.9, w:12.33, h:1, fontSize:32, bold:true, color:'FFFFFF', align:'center', fontFace:'Arial' });
    portada.addText(subtitulo || 'Operación Tekcom - El Salvador', { x:0.5, y:3.85, w:12.33, h:0.5, fontSize:15, color:'C8D2DC', align:'center', fontFace:'Arial' });
    portada.addText(`Generado el ${fecha}`, { x:0.5, y:4.3, w:12.33, h:0.4, fontSize:11, color:'8C96A5', align:'center', fontFace:'Arial' });

    // ---- Slide con el contenido del dashboard ----
    const slide = pptx.addSlide();
    slide.background = { color:'F2F3F8' };
    slide.addShape('rect', { x:0, y:0, w:13.33, h:0.65, fill:{ color:'0A6A99' } });
    slide.addText(titulo, { x:0.3, y:0.1, w:12.7, h:0.45, fontSize:16, bold:true, color:'FFFFFF', fontFace:'Arial' });

    const maxW = 12.53; const maxH = 6.2;
    let w = maxW; let h = (imgDims.h*w)/imgDims.w;
    if(h > maxH){ h = maxH; w = (imgDims.w*h)/imgDims.h; }
    const x = (13.33 - w)/2;
    const y = 0.85 + (maxH - h)/2;
    slide.addImage({ data:imgData, x, y, w, h });
    slide.addText(`Generado el ${new Date().toLocaleString('es-SV')} · Operación Tekcom - El Salvador`, { x:0.3, y:7.18, w:12.7, h:0.25, fontSize:8, color:'8A8FA3', fontFace:'Arial' });

    await pptx.writeFile({ fileName:`${titulo.replace(/\s+/g,'_')}.pptx` });
    showToast('PowerPoint generado correctamente');
  }catch(err){
    console.error(err);
    showToast('Error al generar el PowerPoint', 'error');
  }
}

/* ==================================================================
   POWERPOINT CON GRÁFICOS NATIVOS (editables, no imágenes)
   ================================================================== */

function pptxAddTitleSlide(pptx, titulo, subtitulo){
  const fecha = new Date().toLocaleDateString('es-SV', { year:'numeric', month:'long', day:'numeric' });
  const slide = pptx.addSlide();
  slide.background = { color:'0B0E14' };
  slide.addShape('rect', { x:0, y:3.55, w:13.33, h:0.04, fill:{ color:'0A6A99' } });
  slide.addText(titulo, { x:0.5, y:2.9, w:12.33, h:1, fontSize:32, bold:true, color:'FFFFFF', align:'center', fontFace:'Arial' });
  slide.addText(subtitulo || 'Operación Tekcom - El Salvador', { x:0.5, y:3.85, w:12.33, h:0.5, fontSize:15, color:'C8D2DC', align:'center', fontFace:'Arial' });
  slide.addText(`Generado el ${fecha}`, { x:0.5, y:4.3, w:12.33, h:0.4, fontSize:11, color:'8C96A5', align:'center', fontFace:'Arial' });
  return slide;
}

function pptxSlideHeader(slide, titulo){
  slide.background = { color:'F2F3F8' };
  slide.addShape('rect', { x:0, y:0, w:13.33, h:0.55, fill:{ color:'0A6A99' } });
  slide.addText(titulo, { x:0.3, y:0.08, w:12.7, h:0.4, fontSize:15, bold:true, color:'FFFFFF', fontFace:'Arial' });
}

function pptxAddKpiSlide(pptx, titulo, kpis){
  const slide = pptx.addSlide();
  pptxSlideHeader(slide, titulo);
  const n = kpis.length;
  const gap = 0.3; const totalGap = gap*(n+1);
  const cardW = (13.33 - totalGap) / n;
  kpis.forEach((k,i) => {
    const x = gap + i*(cardW+gap);
    slide.addShape('roundRect', { x, y:1.3, w:cardW, h:1.7, fill:{ color:'FFFFFF' }, line:{ color:'E2E5F0', width:1 }, rectRadius:0.06 });
    slide.addText(k.label, { x:x+0.15, y:1.45, w:cardW-0.3, h:0.4, fontSize:10.5, bold:true, color:'666D85', fontFace:'Arial' });
    slide.addText(String(k.value), { x:x+0.15, y:1.85, w:cardW-0.3, h:0.9, fontSize:26, bold:true, color:k.color||'1B1F2D', fontFace:'Arial' });
  });
  return slide;
}

// Convierte minutos a fracción de día para que Excel/PowerPoint lo formatee como HH:MM real
function minutosAFraccionDia(min){ return min / 1440; }

function pptxAddEmptySlide(pptx, titulo, mensaje){
  const slide = pptx.addSlide();
  pptxSlideHeader(slide, titulo);
  slide.addText(mensaje || 'Sin datos para los filtros seleccionados', { x:0.5, y:3.3, w:12.3, h:0.6, fontSize:16, align:'center', color:'8A8FA3', fontFace:'Arial' });
  return slide;
}

function pptxAddBarChartSlide(pptx, titulo, labels, vals, opts={}){
  if(!labels.length){ return pptxAddEmptySlide(pptx, titulo); }
  const slide = pptx.addSlide();
  pptxSlideHeader(slide, titulo);
  const values = opts.hhmm ? vals.map(minutosAFraccionDia) : vals;
  const dataChart = [{ name: opts.seriesName || titulo, labels, values }];
  const numFmt = opts.hhmm ? '[h]:mm' : '#,##0';
  slide.addChart(pptx.ChartType.bar, dataChart, {
    x:0.5, y:0.85, w:12.33, h:6.35,
    barDir: opts.horizontal ? 'bar' : 'col',
    chartColors: [opts.color || '0A6A99'],
    showValue: true,
    dataLabelColor: '1B1F2D',
    dataLabelFontSize: 10,
    dataLabelFormatCode: numFmt,
    catAxisLabelColor: '666D85',
    catAxisLabelFontSize: 9,
    valAxisLabelColor: '666D85',
    valAxisLabelFormatCode: numFmt,
    showLegend: false,
    valAxisMinVal: 0
  });
  return slide;
}

function pptxAddLineChartSlide(pptx, titulo, labels, vals, opts={}){
  if(!labels.length){ return pptxAddEmptySlide(pptx, titulo); }
  const slide = pptx.addSlide();
  pptxSlideHeader(slide, titulo);
  const values = opts.hhmm ? vals.map(minutosAFraccionDia) : vals;
  const dataChart = [{ name: opts.seriesName || titulo, labels, values }];
  const numFmt = opts.hhmm ? '[h]:mm' : '#,##0';
  slide.addChart(pptx.ChartType.line, dataChart, {
    x:0.5, y:0.85, w:12.33, h:6.35,
    lineDataSymbol: 'circle',
    lineSize: 2.5,
    chartColors: [opts.color || '0A6A99'],
    showValue: true,
    dataLabelColor: '1B1F2D',
    dataLabelFontSize: 9,
    dataLabelFormatCode: numFmt,
    dataLabelPosition: 't',
    catAxisLabelColor: '666D85',
    valAxisLabelColor: '666D85',
    valAxisLabelFormatCode: numFmt,
    showLegend: false,
    valAxisMinVal: 0
  });
  return slide;
}

function pptxAddPieChartSlide(pptx, titulo, labels, vals){
  if(!labels.length){ return pptxAddEmptySlide(pptx, titulo); }
  const slide = pptx.addSlide();
  pptxSlideHeader(slide, titulo);
  const dataChart = [{ name: titulo, labels, values: vals }];
  slide.addChart(pptx.ChartType.pie, dataChart, {
    x:2.9, y:0.9, w:7.5, h:6.2,
    showLegend: true, legendPos: 'r', legendColor: '1B1F2D', legendFontSize: 11,
    showPercent: true, dataLabelColor: 'FFFFFF', dataLabelFontSize: 11,
    chartColors: ['0A6A99','3DDC97','E8A23D','EF5B6E','4FB8E8','C266E8','1382BD','9499AC']
  });
  return slide;
}

/* ---- Casos Movistar: colectores de datos para el PPTX nativo ---- */
function collectCasosMes(datos){
  const mesActivo = msVal('dashMesFilter').length > 0;
  const semanaActiva = msVal('dashSemanaFilter').length > 0;
  let agrupador, tituloBase;
  if(semanaActiva){ agrupador='dia'; tituloBase='Por Día'; }
  else if(mesActivo){ agrupador='semana'; tituloBase='Por Semana'; }
  else { agrupador='mes'; tituloBase='Por Mes'; }

  if(dashMesTab === 'casos'){
    const porGrupo = {};
    datos.forEach(c => { const key=c[agrupador]; if(key!==null&&key!==undefined&&key!=='') porGrupo[key]=(porGrupo[key]||0)+1; });
    const labels = agrupador==='mes' ? MESES_ORDEN_DASH.filter(m=>porGrupo[m]) : Object.keys(porGrupo).sort((a,b)=>Number(a)-Number(b)).map(String);
    return { titulo:'Casos '+tituloBase, labels, vals:labels.map(l=>porGrupo[l]), hhmm:false };
  } else {
    const slaSuma={}, slaCount={};
    datos.forEach(c => {
      const key=c[agrupador]; if(key===null||key===undefined||key==='') return;
      const min=hhmmToMinutesDash(c.sla);
      if(min!==null&&min>=0){ slaSuma[key]=(slaSuma[key]||0)+min; slaCount[key]=(slaCount[key]||0)+1; }
    });
    const labels = agrupador==='mes' ? MESES_ORDEN_DASH.filter(m=>slaCount[m]) : Object.keys(slaCount).sort((a,b)=>Number(a)-Number(b)).map(String);
    return { titulo:'SLA Prom. '+tituloBase, labels, vals:labels.map(l=>Math.round(slaSuma[l]/slaCount[l])), hhmm:true };
  }
}
function collectCasosZona(datos){
  if(dashZonaTab === 'casos'){
    const porZona={};
    datos.forEach(c => { if(c.zona) porZona[c.zona]=(porZona[c.zona]||0)+1; });
    const ordered = Object.entries(porZona).sort((a,b)=>b[1]-a[1]);
    return { tipo:'pie', titulo:'Casos por Zona', labels:ordered.map(([z])=>z), vals:ordered.map(([,v])=>v), hhmm:false };
  } else {
    const slaData = calcSlaPromPorGrupo(datos,'zona');
    return { tipo:'bar', titulo:'SLA Prom. por Zona', labels:slaData.map(([z])=>z), vals:slaData.map(([,v])=>v), hhmm:true };
  }
}
function collectCasosTecnicosTop3(datos){
  if(dashTecRankTab === 'casos'){
    const porTec={};
    datos.forEach(c => { if(c.nombre_del_tecnico) porTec[c.nombre_del_tecnico]=(porTec[c.nombre_del_tecnico]||0)+1; });
    const top = Object.entries(porTec).sort((a,b)=>b[1]-a[1]).slice(0,3);
    return { titulo:'Top 3 Técnicos (Casos)', labels:top.map(([t])=>t), vals:top.map(([,v])=>v), hhmm:false };
  } else {
    const slaData = calcSlaPromPorGrupo(datos,'nombre_del_tecnico').slice(0,3);
    return { titulo:'Top 3 Técnicos (SLA Prom.)', labels:slaData.map(([t])=>t), vals:slaData.map(([,v])=>v), hhmm:true };
  }
}
function collectCasosTeamLider(datos){
  if(dashTecLiderTab === 'casos'){
    const porTec={};
    datos.forEach(c => { if(c.nombre_del_tecnico) porTec[c.nombre_del_tecnico]=(porTec[c.nombre_del_tecnico]||0)+1; });
    const ordered = Object.entries(porTec).sort((a,b)=>b[1]-a[1]);
    return { titulo:'Casos Por Team Líder', labels:ordered.map(([t])=>t), vals:ordered.map(([,v])=>v), hhmm:false };
  } else {
    const slaData = calcSlaPromPorGrupo(datos,'nombre_del_tecnico');
    return { titulo:'SLA Prom. Por Team Líder', labels:slaData.map(([t])=>t), vals:slaData.map(([,v])=>v), hhmm:true };
  }
}
function collectCasosCausasTop3(datos){
  if(dashCausaTab === 'casos'){
    const porCausa={};
    datos.forEach(c => { if(c.causa) porCausa[c.causa]=(porCausa[c.causa]||0)+1; });
    const top = Object.entries(porCausa).sort((a,b)=>b[1]-a[1]).slice(0,3);
    return { titulo:'Top 3 Causas (Casos)', labels:top.map(([c])=>c), vals:top.map(([,v])=>v), hhmm:false };
  } else {
    const slaData = calcSlaPromPorGrupo(datos,'causa').slice(0,3);
    return { titulo:'Top 3 Causas (SLA Prom.)', labels:slaData.map(([c])=>c), vals:slaData.map(([,v])=>v), hhmm:true };
  }
}

async function exportarCasosPPTXNativo(){
  showToast('Generando PowerPoint…');
  try{
    const datos = getDashFiltrados();
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name:'TEKCOM_16x9', width:13.33, height:7.5 });
    pptx.layout = 'TEKCOM_16x9';
    pptxAddTitleSlide(pptx, 'Dashboard - Casos Atendidos Movistar');

    pptxAddKpiSlide(pptx, 'Resumen General', [
      { label:'Casos Finalizados', value: document.getElementById('dashTotalCasos').textContent },
      { label:'SLA Promedio', value: document.getElementById('dashSlaPromedio').textContent },
      { label:'Dentro del SLA', value: document.getElementById('dashDentroSla').textContent, color:'16A34A' },
      { label:'Fuera del SLA', value: document.getElementById('dashFueraSla').textContent, color:'DC2626' }
    ]);

    const dMes = collectCasosMes(datos);
    pptxAddLineChartSlide(pptx, dMes.titulo, dMes.labels, dMes.vals, { hhmm:dMes.hhmm, color:'0A6A99' });

    const dZona = collectCasosZona(datos);
    if(dZona.tipo === 'pie'){ pptxAddPieChartSlide(pptx, dZona.titulo, dZona.labels, dZona.vals); }
    else { pptxAddBarChartSlide(pptx, dZona.titulo, dZona.labels, dZona.vals, { hhmm:true, horizontal:true, color:'E8A23D' }); }

    const dTec3 = collectCasosTecnicosTop3(datos);
    pptxAddBarChartSlide(pptx, dTec3.titulo, dTec3.labels, dTec3.vals, { hhmm:dTec3.hhmm, horizontal:true, color:'0A6A99' });

    const dTeamLider = collectCasosTeamLider(datos);
    pptxAddBarChartSlide(pptx, dTeamLider.titulo, dTeamLider.labels, dTeamLider.vals, { hhmm:dTeamLider.hhmm, horizontal:true, color:'3DDC97' });

    const dCausas = collectCasosCausasTop3(datos);
    pptxAddBarChartSlide(pptx, dCausas.titulo, dCausas.labels, dCausas.vals, { hhmm:dCausas.hhmm, horizontal:true, color:'EF5B6E' });

    await pptx.writeFile({ fileName:'Dashboard_Casos_Atendidos_Movistar.pptx' });
    showToast('PowerPoint generado correctamente');
  }catch(err){
    console.error(err);
    showToast('Error al generar el PowerPoint', 'error');
  }
}

/* ---- HYVE: colectores de datos para el PPTX nativo ---- */
function collectHyveMes(datos){
  const mesActivo = msVal('hyveDashMesFilter').length > 0;
  const agrupador = mesActivo ? 'wk' : 'mes';
  const tituloBase = agrupador === 'wk' ? 'Por Semana' : 'Por Mes';

  if(hyveDashMesTab === 'casos'){
    const porGrupo = {};
    datos.forEach(c => { const key=c[agrupador]; if(key!==null&&key!==undefined&&key!=='') porGrupo[key]=(porGrupo[key]||0)+1; });
    const labels = agrupador==='mes' ? MESES_ORDEN_DASH.filter(m=>porGrupo[m]) : Object.keys(porGrupo).sort((a,b)=>Number(a)-Number(b)).map(String);
    return { titulo:'Casos '+tituloBase, labels, vals:labels.map(l=>porGrupo[l]), hhmm:false };
  } else {
    const slaSuma={}, slaCount={};
    datos.forEach(c => {
      const key=c[agrupador]; if(key===null||key===undefined||key==='') return;
      const min=hhmmToMinutesDash(c.sla);
      if(min!==null&&min>=0){ slaSuma[key]=(slaSuma[key]||0)+min; slaCount[key]=(slaCount[key]||0)+1; }
    });
    const labels = agrupador==='mes' ? MESES_ORDEN_DASH.filter(m=>slaCount[m]) : Object.keys(slaCount).sort((a,b)=>Number(a)-Number(b)).map(String);
    return { titulo:'SLA Prom. '+tituloBase, labels, vals:labels.map(l=>Math.round(slaSuma[l]/slaCount[l])), hhmm:true };
  }
}
function collectHyveCausasTop3(datos){
  if(hyveDashCausaTab === 'casos'){
    const porCausa={};
    datos.forEach(c => { if(c.causa) porCausa[c.causa]=(porCausa[c.causa]||0)+1; });
    const top = Object.entries(porCausa).sort((a,b)=>b[1]-a[1]).slice(0,3);
    return { titulo:'Top 3 Causas (Casos)', labels:top.map(([c])=>c), vals:top.map(([,v])=>v), hhmm:false };
  } else {
    const slaData = calcSlaPromPorGrupo(datos,'causa').slice(0,3);
    return { titulo:'Top 3 Causas (SLA Prom.)', labels:slaData.map(([c])=>c), vals:slaData.map(([,v])=>v), hhmm:true };
  }
}
function collectHyveTecnico(datos){
  if(hyveDashTecTab === 'casos'){
    const porTec={};
    datos.forEach(c => { if(c.tecnico_encargado) porTec[c.tecnico_encargado]=(porTec[c.tecnico_encargado]||0)+1; });
    const ordered = Object.entries(porTec).sort((a,b)=>b[1]-a[1]);
    return { titulo:'Casos Por Técnico Encargado', labels:ordered.map(([t])=>t), vals:ordered.map(([,v])=>v), hhmm:false };
  } else {
    const slaData = calcSlaPromPorGrupo(datos,'tecnico_encargado');
    return { titulo:'SLA Prom. Por Técnico Encargado', labels:slaData.map(([t])=>t), vals:slaData.map(([,v])=>v), hhmm:true };
  }
}

async function exportarHyvePPTXNativo(){
  showToast('Generando PowerPoint…');
  try{
    const datos = getHyveDashFiltrados();
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name:'TEKCOM_16x9', width:13.33, height:7.5 });
    pptx.layout = 'TEKCOM_16x9';
    pptxAddTitleSlide(pptx, 'Dashboard - Casos Atendidos HYVE');

    pptxAddKpiSlide(pptx, 'Resumen General', [
      { label:'Casos Finalizados', value: document.getElementById('hyveDashTotalCasos').textContent },
      { label:'SLA Promedio', value: document.getElementById('hyveDashSlaPromedio').textContent },
      { label:'Dentro del SLA', value: document.getElementById('hyveDashDentroSla').textContent, color:'16A34A' },
      { label:'Fuera del SLA', value: document.getElementById('hyveDashFueraSla').textContent, color:'DC2626' }
    ]);

    const dMes = collectHyveMes(datos);
    pptxAddLineChartSlide(pptx, dMes.titulo, dMes.labels, dMes.vals, { hhmm:dMes.hhmm, color:'0A6A99' });

    const dCausas = collectHyveCausasTop3(datos);
    pptxAddBarChartSlide(pptx, dCausas.titulo, dCausas.labels, dCausas.vals, { hhmm:dCausas.hhmm, horizontal:true, color:'EF5B6E' });

    const dTec = collectHyveTecnico(datos);
    pptxAddBarChartSlide(pptx, dTec.titulo, dTec.labels, dTec.vals, { hhmm:dTec.hhmm, horizontal:true, color:'3DDC97' });

    await pptx.writeFile({ fileName:'Dashboard_Casos_Atendidos_HYVE.pptx' });
    showToast('PowerPoint generado correctamente');
  }catch(err){
    console.error(err);
    showToast('Error al generar el PowerPoint', 'error');
  }
}

/* ---- Cable Color: colectores de datos para el PPTX nativo ---- */
function collectCableMes(datos){
  const mesActivo = msVal('cableDashMesFilter').length > 0;
  const agrupador = mesActivo ? 'semana' : 'mes';
  const tituloBase = agrupador === 'semana' ? 'Por Semana' : 'Por Mes';

  if(cableDashMesTab === 'casos'){
    const porGrupo = {};
    datos.forEach(c => { const key=c[agrupador]; if(key!==null&&key!==undefined&&key!=='') porGrupo[key]=(porGrupo[key]||0)+1; });
    const labels = agrupador==='mes' ? MESES_ORDEN_DASH.filter(m=>porGrupo[m]) : Object.keys(porGrupo).sort((a,b)=>Number(a)-Number(b)).map(String);
    return { titulo:'Casos '+tituloBase, labels, vals:labels.map(l=>porGrupo[l]), hhmm:false };
  } else {
    const slaSuma={}, slaCount={};
    datos.forEach(c => {
      const key=c[agrupador]; if(key===null||key===undefined||key==='') return;
      const min=hhmmToMinutesDash(c.tiempo_respuesta);
      if(min!==null&&min>=0){ slaSuma[key]=(slaSuma[key]||0)+min; slaCount[key]=(slaCount[key]||0)+1; }
    });
    const labels = agrupador==='mes' ? MESES_ORDEN_DASH.filter(m=>slaCount[m]) : Object.keys(slaCount).sort((a,b)=>Number(a)-Number(b)).map(String);
    return { titulo:'SLA Prom. '+tituloBase, labels, vals:labels.map(l=>Math.round(slaSuma[l]/slaCount[l])), hhmm:true };
  }
}
function collectCableCausasTop3(datos){
  if(cableDashCausaTab === 'casos'){
    const porCausa={};
    datos.forEach(c => { if(c.causa) porCausa[c.causa]=(porCausa[c.causa]||0)+1; });
    const top = Object.entries(porCausa).sort((a,b)=>b[1]-a[1]).slice(0,3);
    return { titulo:'Top 3 Causas (Casos)', labels:top.map(([c])=>c), vals:top.map(([,v])=>v), hhmm:false };
  } else {
    const slaData = calcSlaPromPorGrupo(datos,'causa').slice(0,3);
    return { titulo:'Top 3 Causas (SLA Prom.)', labels:slaData.map(([c])=>c), vals:slaData.map(([,v])=>v), hhmm:true };
  }
}
function collectCableTecnico(datos){
  if(cableDashTecTab === 'casos'){
    const porTec={};
    datos.forEach(c => { if(c.cuadrilla) porTec[c.cuadrilla]=(porTec[c.cuadrilla]||0)+1; });
    const ordered = Object.entries(porTec).sort((a,b)=>b[1]-a[1]);
    return { titulo:'Casos Por Cuadrilla', labels:ordered.map(([t])=>t), vals:ordered.map(([,v])=>v), hhmm:false };
  } else {
    const slaData = calcSlaPromPorGrupo(datos,'cuadrilla');
    return { titulo:'SLA Prom. Por Cuadrilla', labels:slaData.map(([t])=>t), vals:slaData.map(([,v])=>v), hhmm:true };
  }
}

async function exportarCablePPTXNativo(){
  showToast('Generando PowerPoint…');
  try{
    const datos = getCableDashFiltrados();
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name:'TEKCOM_16x9', width:13.33, height:7.5 });
    pptx.layout = 'TEKCOM_16x9';
    pptxAddTitleSlide(pptx, 'Dashboard - Casos Atendidos Cable Color');

    pptxAddKpiSlide(pptx, 'Resumen General', [
      { label:'Casos Finalizados', value: document.getElementById('cableDashTotalCasos').textContent },
      { label:'SLA Promedio', value: document.getElementById('cableDashSlaPromedio').textContent },
      { label:'Dentro del SLA', value: document.getElementById('cableDashDentroSla').textContent, color:'16A34A' },
      { label:'Fuera del SLA', value: document.getElementById('cableDashFueraSla').textContent, color:'DC2626' }
    ]);

    const dMes = collectCableMes(datos);
    pptxAddLineChartSlide(pptx, dMes.titulo, dMes.labels, dMes.vals, { hhmm:dMes.hhmm, color:'0A6A99' });

    const dCausas = collectCableCausasTop3(datos);
    pptxAddBarChartSlide(pptx, dCausas.titulo, dCausas.labels, dCausas.vals, { hhmm:dCausas.hhmm, horizontal:true, color:'EF5B6E' });

    const dTec = collectCableTecnico(datos);
    pptxAddBarChartSlide(pptx, dTec.titulo, dTec.labels, dTec.vals, { hhmm:dTec.hhmm, horizontal:true, color:'3DDC97' });

    await pptx.writeFile({ fileName:'Dashboard_Casos_Atendidos_Cable_Color.pptx' });
    showToast('PowerPoint generado correctamente');
  }catch(err){
    console.error(err);
    showToast('Error al generar el PowerPoint', 'error');
  }
}

/* ---- Actividades Diarias: colectores de datos para el PPTX nativo ---- */
function collectActividadMes(datos){
  const mesActivo = !!document.getElementById('dashActMesFilter').value;
  const semanaActivo = !!document.getElementById('dashActSemanaFilter').value;
  let agrupador, tituloBase;
  if(semanaActivo){ agrupador='dia'; tituloBase='Por Día'; }
  else if(mesActivo){ agrupador='semana'; tituloBase='Por Semana'; }
  else { agrupador='mes'; tituloBase='Por Mes'; }

  if(dashActMesTab === 'atencion'){
    const porGrupo = {};
    datos.forEach(a => { const key=a[agrupador]; if(key!==null&&key!==undefined&&key!=='') porGrupo[key]=(porGrupo[key]||0)+1; });
    const labels = agrupador==='mes' ? MESES_ORDEN_DASH.filter(m=>porGrupo[m]) : Object.keys(porGrupo).sort((a,b)=>Number(a)-Number(b)).map(String);
    return { titulo:'Atención '+tituloBase, labels, vals:labels.map(l=>porGrupo[l]), hhmm:false };
  } else {
    const sumaMin = {};
    datos.forEach(a => {
      const key=a[agrupador]; if(key===null||key===undefined||key==='') return;
      const min = hhmmToMinutesDash(a.total);
      if(min!==null&&min>=0) sumaMin[key]=(sumaMin[key]||0)+min;
    });
    const labels = agrupador==='mes' ? MESES_ORDEN_DASH.filter(m=>sumaMin[m]!==undefined) : Object.keys(sumaMin).sort((a,b)=>Number(a)-Number(b)).map(String);
    return { titulo:'Horas Trabajadas '+tituloBase, labels, vals:labels.map(l=>sumaMin[l]), hhmm:true };
  }
}
function collectActividadLider(datos){
  if(dashActLiderTab === 'actividades'){
    const porLider = {};
    datos.forEach(a => { if(a.lider_cuadrilla) porLider[a.lider_cuadrilla]=(porLider[a.lider_cuadrilla]||0)+1; });
    const ordered = Object.entries(porLider).sort((a,b)=>b[1]-a[1]);
    return { titulo:'Actividades por Líder de Cuadrilla', labels:ordered.map(([l])=>l), vals:ordered.map(([,v])=>v), hhmm:false };
  } else {
    const sumaMin = {};
    datos.forEach(a => {
      if(!a.lider_cuadrilla) return;
      const min = hhmmToMinutesDash(a.total);
      if(min!==null&&min>=0) sumaMin[a.lider_cuadrilla]=(sumaMin[a.lider_cuadrilla]||0)+min;
    });
    const ordered = Object.entries(sumaMin).sort((a,b)=>b[1]-a[1]);
    return { titulo:'Horas Trabajadas por Líder de Cuadrilla', labels:ordered.map(([l])=>l), vals:ordered.map(([,v])=>v), hhmm:true };
  }
}

async function exportarActividadesPPTXNativo(){
  showToast('Generando PowerPoint…');
  try{
    const datos = getActividadesDashFiltradas();
    const pptx = new PptxGenJS();
    pptx.defineLayout({ name:'TEKCOM_16x9', width:13.33, height:7.5 });
    pptx.layout = 'TEKCOM_16x9';
    pptxAddTitleSlide(pptx, 'Dashboard - Actividades Diarias');

    const dMes = collectActividadMes(datos);
    pptxAddLineChartSlide(pptx, dMes.titulo, dMes.labels, dMes.vals, { hhmm:dMes.hhmm, color:'0A6A99' });

    const dLider = collectActividadLider(datos);
    pptxAddBarChartSlide(pptx, dLider.titulo, dLider.labels, dLider.vals, { hhmm:dLider.hhmm, horizontal:true, color:'3DDC97' });

    await pptx.writeFile({ fileName:'Dashboard_Actividades_Diarias.pptx' });
    showToast('PowerPoint generado correctamente');
  }catch(err){
    console.error(err);
    showToast('Error al generar el PowerPoint', 'error');
  }
}



/* ==== continuación (segundo bloque de script original) ==== */

/* ============================================================
   GESTIÓN DE USUARIOS Y ACCESOS POR PESTAÑA
============================================================ */
const OPK_PESTANAS = [
  { id:'personal',     label:'Listado del Personal', subtabs:[
      { id:'listado',    label:'Listado' },
      { id:'vehiculos',  label:'Vehículos' },
      { id:'accesos',    label:'Accesos' }
    ] },
  { id:'sitios',       label:'Sitios Movistar', subtabs:[
      { id:'listado', label:'Sitios' },
      { id:'nomina',  label:'Nómina' }
    ] },
  { id:'casos',        label:'Casos Movistar', subtabs:[
      { id:'listado',    label:'Casos Atendidos' },
      { id:'dashboard',  label:'Dashboard' },
      { id:'materiales', label:'Materiales' }
    ] },
  { id:'hyve',         label:'Casos Hyve', subtabs:[
      { id:'listado',    label:'Casos Atendidos' },
      { id:'dashboard',  label:'Dashboard' },
      { id:'materiales', label:'Materiales' }
    ] },
  { id:'udp',          label:'UDP', subtabs:[
      { id:'listado',    label:'Casos Atendidos' },
      { id:'dashboard',  label:'Dashboard' },
      { id:'materiales', label:'Materiales' },
      { id:'escuelas',   label:'ID Escuelas UDP' }
    ] },
  { id:'cable',        label:'Casos Cable Color', subtabs:[
      { id:'listado',    label:'Casos Atendidos' },
      { id:'dashboard',  label:'Dashboard' },
      { id:'materiales', label:'Materiales' }
    ] },
  { id:'plantillas',   label:'Plantillas de Avance', subtabs:[
      { id:'listado', label:'Plantillas' },
      { id:'estatus', label:'Estatus (tablero de pendientes)' }
    ] },
  { id:'actividades',  label:'Actividades Diarias', subtabs:[] },
  { id:'cumplimiento', label:'Cumplimiento de visitas', subtabs:[] }
];

// A partir de esta fase, el login es 100% real con Supabase Auth (las
// contraseñas ya no las manejamos nosotros ni siquiera hasheadas: las
// maneja Supabase). La tabla app_usuarios ahora solo guarda el perfil
// (nombre, usuario, rol, permisos) y sus políticas exigen una sesión
// autenticada real (auth.uid()) para poder leerla o modificarla.
const USUARIOS_TABLA_URL = `${SUPABASE_URL}/rest/v1/app_usuarios`;
const OPK_EMAIL_DOMINIO = 'panel-opk.local';

function opkUsuarioAEmail(usuario){
  const limpio = (usuario || '').trim().toLowerCase();
  if(limpio.includes('@')) return limpio; // ya es un correo (real o no), se usa tal cual
  return `${limpio}@${OPK_EMAIL_DOMINIO}`;
}

// Headers para hablar con la tabla app_usuarios: SIEMPRE con el token de
// la sesión autenticada actual (no con la clave anónima), porque las
// políticas de esa tabla ya no aceptan al anónimo.
function opkHeadersAuth(){
  const token = (opkSesionActual && opkSesionActual.access_token) ? opkSesionActual.access_token : null;
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${token || SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };
}

async function opkFetchUsuarios(){
  const res = await fetch(`${USUARIOS_TABLA_URL}?select=id,nombre,usuario,rol,permisos&order=nombre.asc`, { headers: opkHeadersAuth() });
  if(!res.ok) throw new Error('Error al cargar usuarios (' + res.status + ')');
  return await res.json();
}
async function opkCrearUsuarioDB(payload){
  const res = await fetch(USUARIOS_TABLA_URL, {
    method:'POST',
    headers:{ ...opkHeadersAuth(), 'Prefer':'return=representation' },
    body: JSON.stringify({
      nombre: payload.nombre,
      usuario: payload.usuario,
      rol: payload.rol,
      permisos: payload.permisos
    })
  });
  if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al crear el perfil de usuario'); }
  const data = await res.json();
  return data[0];
}
async function opkActualizarUsuarioDB(id, payload){
  const res = await fetch(`${USUARIOS_TABLA_URL}?id=eq.${id}`, {
    method:'PATCH',
    headers:{ ...opkHeadersAuth(), 'Prefer':'return=representation' },
    body: JSON.stringify({
      nombre: payload.nombre,
      usuario: payload.usuario,
      rol: payload.rol,
      permisos: payload.permisos
    })
  });
  if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al actualizar el perfil de usuario'); }
  const data = await res.json();
  return data[0];
}
async function opkEliminarUsuarioDB(id){
  const res = await fetch(`${USUARIOS_TABLA_URL}?id=eq.${id}`, { method:'DELETE', headers: opkHeadersAuth() });
  if(!res.ok) throw new Error('Error al eliminar el perfil de usuario');
}

function opkPermisosCompletos(){
  const p = {};
  OPK_PESTANAS.forEach(t => {
    const subtabs = {};
    (t.subtabs || []).forEach(s => { subtabs[s.id] = { ver:true, editar:true }; });
    p[t.id] = { ver:true, editar:true, subtabs };
  });
  return p;
}

// Cache en memoria de los usuarios cargados desde Supabase (se refresca cada vez que se abre el modal)
let opkUsuariosCache = [];

// Se asegura de que el perfil "Yosdras" quede como Administrador con acceso
// total. Ya NO crea la cuenta de acceso (eso se hace en Supabase Auth,
// manualmente, por el dueño del proyecto); solo corrige rol/permisos del
// PERFIL, y se ejecuta con la sesión ya autenticada de la propia Yosdras.
async function opkAsegurarUsuarioPrincipal(perfil, accessTokenTemporal){
  if(!perfil || (perfil.usuario || '').toLowerCase() !== 'yosdras') return perfil;
  if(perfil.rol === 'admin' && perfil.permisos && Object.keys(perfil.permisos).length > 0) return perfil;
  try{
    const tokenPrevio = opkSesionActual;
    opkSesionActual = { access_token: accessTokenTemporal };
    const actualizado = await opkActualizarUsuarioDB(perfil.id, {
      nombre: perfil.nombre,
      usuario: perfil.usuario,
      rol:'admin',
      permisos: opkPermisosCompletos()
    });
    opkSesionActual = tokenPrevio;
    return actualizado || perfil;
  }catch(err){
    console.error('No se pudo corregir el rol de Yosdras a administrador:', err);
    return perfil;
  }
}

function opkRenderPermisosBody(permisos){
  permisos = permisos || {};
  const body = document.getElementById('usrPermisosBody');
  let html = '';
  OPK_PESTANAS.forEach(t => {
    const p = permisos[t.id] || { ver:false, editar:false, subtabs:{} };
    html += `
      <tr style="background:var(--surface-2);">
        <td style="font-weight:700;">${escapeHtml(t.label)}</td>
        <td style="text-align:center;"><input type="checkbox" data-perm-ver="${t.id}" ${p.ver ? 'checked' : ''}></td>
        <td style="text-align:center;"><input type="checkbox" data-perm-editar="${t.id}" ${p.editar ? 'checked' : ''}></td>
      </tr>
    `;
    (t.subtabs || []).forEach(s => {
      const sp = (p.subtabs && p.subtabs[s.id]) || { ver:false, editar:false };
      const key = t.id + '.' + s.id;
      html += `
        <tr>
          <td style="padding-left:30px; color:var(--text-dim); font-size:13px;">↳ ${escapeHtml(s.label)}</td>
          <td style="text-align:center;"><input type="checkbox" data-perm-ver="${key}" ${sp.ver ? 'checked' : ''}></td>
          <td style="text-align:center;"><input type="checkbox" data-perm-editar="${key}" ${sp.editar ? 'checked' : ''}></td>
        </tr>
      `;
    });
  });
  body.innerHTML = html;

  // Si se marca "Editar", se marca automáticamente "Ver" (en la misma fila)
  body.querySelectorAll('[data-perm-editar]').forEach(cb => {
    cb.addEventListener('change', () => {
      if(cb.checked){
        const verCb = body.querySelector(`[data-perm-ver="${cb.dataset.permEditar}"]`);
        if(verCb) verCb.checked = true;
      }
    });
  });

  // Si se desmarca "Ver" en la pestaña principal, se desmarcan todas sus subpestañas
  body.querySelectorAll('[data-perm-ver]').forEach(cb => {
    const key = cb.dataset.permVer;
    if(!key.includes('.')){
      cb.addEventListener('change', () => {
        if(!cb.checked){
          body.querySelectorAll(`[data-perm-ver^="${key}."]`).forEach(sub => sub.checked = false);
          body.querySelectorAll(`[data-perm-editar^="${key}."]`).forEach(sub => sub.checked = false);
          const editarCb = body.querySelector(`[data-perm-editar="${key}"]`);
          if(editarCb) editarCb.checked = false;
        }
      });
    }
  });

  // Si se marca "Ver" en alguna subpestaña, se marca automáticamente "Ver" de la pestaña principal
  body.querySelectorAll('[data-perm-ver]').forEach(cb => {
    const key = cb.dataset.permVer;
    if(key.includes('.')){
      cb.addEventListener('change', () => {
        if(cb.checked){
          const principal = key.split('.')[0];
          const verPrincipal = body.querySelector(`[data-perm-ver="${principal}"]`);
          if(verPrincipal) verPrincipal.checked = true;
        }
      });
    }
  });
}

function opkLeerPermisosForm(){
  const permisos = {};
  OPK_PESTANAS.forEach(t => {
    const ver = document.querySelector(`[data-perm-ver="${t.id}"]`);
    const editar = document.querySelector(`[data-perm-editar="${t.id}"]`);
    const subtabs = {};
    (t.subtabs || []).forEach(s => {
      const key = t.id + '.' + s.id;
      const sver = document.querySelector(`[data-perm-ver="${key}"]`);
      const seditar = document.querySelector(`[data-perm-editar="${key}"]`);
      subtabs[s.id] = { ver: sver ? sver.checked : false, editar: seditar ? seditar.checked : false };
    });
    permisos[t.id] = { ver: ver ? ver.checked : false, editar: editar ? editar.checked : false, subtabs };
  });
  return permisos;
}

function opkActualizarVisibilidadPermisos(){
  const rol = document.getElementById('usrRol').value;
  document.getElementById('usrPermisosWrap').style.display = (rol === 'admin' || rol === 'editor_total') ? 'none' : '';
}

async function opkRenderUsuariosList(){
  const wrap = document.getElementById('usuariosListWrap');
  wrap.innerHTML = `<div class="empty-state"><div class="empty-title">Cargando usuarios…</div></div>`;
  try{
    opkUsuariosCache = await opkFetchUsuarios();
  }catch(err){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div class="empty-title">No se pudo conectar con la base de datos</div>
        <div class="empty-desc">${escapeHtml(err.message)}</div>
      </div>`;
    return;
  }
  const usuarios = opkUsuariosCache;
  if(usuarios.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
        <div class="empty-title">Sin usuarios registrados</div>
      </div>`;
    return;
  }
  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Usuario</th>
          <th>Rol</th>
          <th>Accesos</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${usuarios.map(u => {
          const resumen = (u.rol === 'admin' || u.rol === 'editor_total')
            ? 'Acceso total'
            : (OPK_PESTANAS.filter(t => u.permisos && u.permisos[t.id] && u.permisos[t.id].ver)
                .map(t => t.label + (u.permisos[t.id].editar ? ' (editar)' : ' (ver)'))
                .join(', ') || 'Sin accesos asignados');
          const rolLabel = u.rol === 'admin' ? 'Administrador' : (u.rol === 'editor_total' ? 'Acceso total' : 'Personalizado');
          return `
            <tr>
              <td style="font-weight:600;">${escapeHtml(u.nombre || '—')}</td>
              <td class="mono">${escapeHtml(u.usuario || '—')}</td>
              <td>${rolLabel}</td>
              <td style="max-width:300px; font-size:12.5px; color:var(--text-dim);">${escapeHtml(resumen)}</td>
              <td style="text-align:right; white-space:nowrap;">
                <button class="icon-btn" data-edit-usuario="${escapeHtml(u.id)}" title="Editar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"></path></svg>
                </button>
                ${(u.usuario || '').toLowerCase() === 'yosdras' ? '' : `
                <button class="icon-btn danger" data-delete-usuario="${escapeHtml(u.id)}" title="Eliminar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
                </button>`}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  wrap.querySelectorAll('[data-edit-usuario]').forEach(btn => {
    btn.addEventListener('click', () => opkCargarUsuarioEnFormulario(btn.dataset.editUsuario));
  });
  wrap.querySelectorAll('[data-delete-usuario]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if(!confirm('¿Seguro que deseas eliminar este usuario?')) return;
      try{
        await opkEliminarUsuarioDB(btn.dataset.deleteUsuario);
        showToast('Usuario eliminado');
        await opkRenderUsuariosList();
      }catch(err){
        showToast('No se pudo eliminar: ' + err.message, 'error');
      }
    });
  });
}

function opkLimpiarFormularioUsuario(){
  document.getElementById('usrEditId').value = '';
  document.getElementById('usrNombre').value = '';
  document.getElementById('usrUsuario').value = '';
  document.getElementById('usrRol').value = 'personalizado';
  document.getElementById('usuarioFormTitle').textContent = 'Crear nuevo usuario';
  document.getElementById('usrFormCancelEdit').style.display = 'none';
  document.getElementById('usrGuardarBtn').textContent = 'Guardar Usuario';
  opkRenderPermisosBody({});
  opkActualizarVisibilidadPermisos();
}

function opkCargarUsuarioEnFormulario(id){
  const u = opkUsuariosCache.find(x => String(x.id) === String(id));
  if(!u) return;
  document.getElementById('usrEditId').value = u.id;
  document.getElementById('usrNombre').value = u.nombre || '';
  document.getElementById('usrUsuario').value = u.usuario || '';
  document.getElementById('usrRol').value = u.rol || 'personalizado';
  document.getElementById('usuarioFormTitle').textContent = 'Editando: ' + (u.nombre || u.usuario);
  document.getElementById('usrFormCancelEdit').style.display = '';
  document.getElementById('usrGuardarBtn').textContent = 'Guardar Cambios';
  opkRenderPermisosBody(u.permisos || {});
  opkActualizarVisibilidadPermisos();
  document.getElementById('usrNombre').scrollIntoView({ behavior:'smooth', block:'center' });
}

async function opkAbrirModalUsuarios(){
  document.getElementById('usuariosModalOverlay').classList.add('active');
  opkLimpiarFormularioUsuario();
  await opkRenderUsuariosList();
}
function opkCerrarModalUsuarios(){
  document.getElementById('usuariosModalOverlay').classList.remove('active');
}

document.getElementById('btnGestionUsuarios').addEventListener('click', opkAbrirModalUsuarios);
document.getElementById('usuariosModalClose').addEventListener('click', opkCerrarModalUsuarios);
document.getElementById('usuariosModalCancel').addEventListener('click', opkCerrarModalUsuarios);
document.getElementById('usrFormCancelEdit').addEventListener('click', opkLimpiarFormularioUsuario);
document.getElementById('usrRol').addEventListener('change', opkActualizarVisibilidadPermisos);

document.getElementById('usrGuardarBtn').addEventListener('click', async () => {
  const nombre = document.getElementById('usrNombre').value.trim();
  const usuario = document.getElementById('usrUsuario').value.trim();
  const rol = document.getElementById('usrRol').value;
  const editId = document.getElementById('usrEditId').value;
  const btnGuardar = document.getElementById('usrGuardarBtn');

  if(!nombre || !usuario){
    showToast('Completa el nombre y el usuario', 'error');
    return;
  }

  const existente = opkUsuariosCache.find(u => (u.usuario || '').toLowerCase() === usuario.toLowerCase() && String(u.id) !== String(editId));
  if(existente){
    showToast('Ya existe un usuario con ese nombre de usuario', 'error');
    return;
  }

  const permisos = (rol === 'admin' || rol === 'editor_total') ? opkPermisosCompletos() : opkLeerPermisosForm();

  btnGuardar.disabled = true;
  const textoOriginal = btnGuardar.textContent;
  btnGuardar.textContent = 'Guardando...';

  try{
    if(editId){
      await opkActualizarUsuarioDB(editId, { nombre, usuario, rol, permisos });
      showToast('Usuario actualizado correctamente');
    } else {
      await opkCrearUsuarioDB({ nombre, usuario, rol, permisos });
      showToast('Perfil creado. Recuerda que la cuenta de acceso (usuario@panel-opk.local) debe existir en Supabase Authentication.');
    }
    await opkRenderUsuariosList();
    opkLimpiarFormularioUsuario();

    // Si el usuario editado es el que tiene la sesión activa, refrescar sus permisos ya aplicados
    if(opkSesionActual && String(editId) === String(opkSesionActual.id)){
      const actualizado = opkUsuariosCache.find(u => String(u.id) === String(editId));
      if(actualizado){
        opkSesionActual = { ...actualizado, access_token: opkSesionActual.access_token };
        opkAplicarPermisosUI(opkSesionActual);
        plActualizarVisibilidadSegunPermisos();
        opkAplicarTodasRestriccionesEdicion();
      }
    }
  }catch(err){
    showToast('No se pudo guardar: ' + err.message, 'error');
  }finally{
    btnGuardar.disabled = false;
    btnGuardar.textContent = textoOriginal;
  }
});

/* ============================================================
   LOGIN Y SESIÓN
============================================================ */
const OPK_SESION_KEY = 'opk_sesion_auth_tokens';

// Mapeo de pestaña principal -> atributo de subpestaña usado en el HTML
const OPK_SUBTAB_ATTR = {
  personal: 'data-subtab-p',
  sitios:   'data-subtab',
  casos:    'data-subtab-c',
  hyve:     'data-subtab-h',
  udp:      'data-subtab-u',
  cable:    'data-subtab-cb'
};

// Mapeo de pestaña (y subpestaña, cuando aplica) -> botón de "Agregar / Editar" que se oculta sin permiso de edición
const OPK_EDIT_BUTTONS = {
  'personal.listado':   'btnAddPerson',
  'personal.vehiculos': 'btnAddVehiculo',
  'personal.accesos':   'btnAddAcceso',
  'sitios.listado':     'btnAddSitio',
  'casos.listado':      ['btnAddCaso', 'btnPlantillaCasos'],
  'hyve.listado':       ['btnAddHyve', 'btnPlantillaHyve'],
  'udp.listado':        'btnAddUdp',
  'udp.escuelas':       'btnAddEscuela',
  'cable.listado':      ['btnAddCable', 'btnPlantillaCable'],
  'actividades':        'btnAddActividad',
  'cumplimiento':       'btnAddCumplimiento'
};
function opkAplicarVisibilidadBotones(idOArreglo, visible){
  const ids = Array.isArray(idOArreglo) ? idOArreglo : [idOArreglo];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.style.display = visible ? '' : 'none';
  });
}

let opkSesionActual = null;

// Pestañas cuyo acceso al panel es SOLO desde las tarjetas de Inicio: su ítem del
// menú lateral se queda oculto siempre (así estaba diseñado originalmente) y los
// permisos únicamente controlan si aparece o no la tarjeta en Inicio.
const OPK_TABS_SOLO_INICIO = ['personal', 'sitios', 'actividades', 'cumplimiento'];

function opkAplicarPermisosUI(usuario){
  const esAdmin = usuario.rol === 'admin';
  const accesoTotal = esAdmin || usuario.rol === 'editor_total';

  // Botón de gestión de usuarios: solo visible para administradores
  const btnGestion = document.getElementById('btnGestionUsuarios');
  if(btnGestion) btnGestion.style.display = esAdmin ? '' : 'none';

  let vistaActivaPermitida = true;

  OPK_PESTANAS.forEach(tab => {
    const permisoTab = (usuario.permisos && usuario.permisos[tab.id]) || { ver:false, editar:false, subtabs:{} };
    const puedeVer = accesoTotal || !!permisoTab.ver;
    const puedeEditar = accesoTotal || !!permisoTab.editar;

    const navItem = document.querySelector(`.nav-item[data-view="${tab.id}"]`);
    if(navItem){
      // El menú lateral solo se toca para las pestañas que ya eran visibles ahí
      if(!OPK_TABS_SOLO_INICIO.includes(tab.id)){
        navItem.style.display = puedeVer ? '' : 'none';
      }
      if(navItem.classList.contains('active') && !puedeVer){
        vistaActivaPermitida = false;
      }
    }

    const homeCard = document.querySelector(`.home-nav-card[data-goto="${tab.id}"]`);
    if(homeCard) homeCard.style.display = puedeVer ? '' : 'none';

    // Plantillas y Estatus no son subpestañas: se alternan con botones sueltos
    // y tienen accesos directos en el Inicio. Se ocultan uno por uno.
    if(tab.id === 'plantillas'){
      const permEstatus = (permisoTab.subtabs && permisoTab.subtabs.estatus) || { ver:false };
      const verEstatus = accesoTotal || !!permEstatus.ver;
      ['btnPlantillasInicio', 'btnVerPlantillasDesdeEstatus'].forEach(id => {
        const b = document.getElementById(id);
        if(b) b.style.display = puedeVer ? '' : 'none';
      });
      ['btnEstatusInicio', 'btnVerEstatusDesdeLista', 'plTabEstatus'].forEach(id => {
        const b = document.getElementById(id);
        if(b) b.style.display = verEstatus ? '' : 'none';
      });
    }

    if(tab.subtabs && tab.subtabs.length){
      const attr = OPK_SUBTAB_ATTR[tab.id];
      tab.subtabs.forEach(sub => {
        const permisoSub = (permisoTab.subtabs && permisoTab.subtabs[sub.id]) || { ver:false, editar:false };
        const subPuedeVer = accesoTotal || !!permisoSub.ver;
        const subPuedeEditar = accesoTotal || !!permisoSub.editar;
        if(attr){
          // Algunos módulos (UDP) tienen sus subpestañas en una cabecera fija
          // FUERA de #view-*, así que se busca primero dentro y luego global.
          const btnSub = document.querySelector(`#view-${tab.id} [${attr}="${sub.id}"]`)
                      || document.querySelector(`[${attr}="${sub.id}"]`);
          if(btnSub) btnSub.style.display = subPuedeVer ? '' : 'none';
        }
        const editBtnId = OPK_EDIT_BUTTONS[tab.id + '.' + sub.id];
        if(editBtnId){
          opkAplicarVisibilidadBotones(editBtnId, subPuedeEditar);
        }
      });
    } else {
      const editBtnId = OPK_EDIT_BUTTONS[tab.id];
      if(editBtnId){
        opkAplicarVisibilidadBotones(editBtnId, puedeEditar);
      }
    }
  });

  // Si la vista activa ya no está permitida, regresar a Inicio
  if(!vistaActivaPermitida){
    const inicioNav = document.querySelector('.nav-item[data-view="inicio"]');
    if(inicioNav) inicioNav.click();
  }
}

// Limpia los filtros y la última vista/pestaña guardados en este navegador,
// para que el siguiente operador que inicie sesión en el mismo equipo
// empiece con la pantalla limpia (sin los filtros del operador anterior).
// No se toca el tema (claro/oscuro) ni la voz elegida: son preferencias
// del equipo, no datos de sesión.
function opkLimpiarEstadoDeSesion(){
  try{
    const claves = Object.keys(localStorage).filter(k =>
      k.startsWith('opk_filtro_') ||
      k.startsWith('opk_subtab_') ||
      k === 'opk_ultima_vista'
    );
    claves.forEach(k => localStorage.removeItem(k));
  }catch(e){}
}

function opkMostrarSesionEnSidebar(usuario){
  const sbBottom = document.querySelector('.sb-bottom');
  if(!sbBottom || document.getElementById('opkSesionRow')) return;
  const row = document.createElement('div');
  row.id = 'opkSesionRow';
  row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:9px 12px; border-radius:9px; color:var(--text-dim); font-size:13px; font-weight:500; margin-top:4px;';
  row.innerHTML = `
    <span class="nav-label" style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(usuario.nombre || usuario.usuario)}</span>
    <button type="button" id="opkBtnCerrarSesion" style="color:var(--danger); font-weight:600; font-size:12.5px; white-space:nowrap;">Salir</button>
  `;
  sbBottom.appendChild(row);
  document.getElementById('opkBtnCerrarSesion').addEventListener('click', async () => {
    const token = opkSesionActual && opkSesionActual.access_token;
    try{ localStorage.removeItem(OPK_SESION_KEY); }catch(e){}
    opkLimpiarEstadoDeSesion();
    if(token){ try{ await opkAuthLogout(token); }catch(e){} }
    location.reload();
  });
}

// Mapa de subpestañas por vista, para restaurar también la subpestaña activa
const OPK_SUBTAB_RESTORE = {
  personal: { attr:'data-subtab-p', key:'opk_subtab_personal' },
  sitios:   { attr:'data-subtab',   key:'opk_subtab_sitios' },
  casos:    { attr:'data-subtab-c', key:'opk_subtab_casos' },
  hyve:     { attr:'data-subtab-h', key:'opk_subtab_hyve' },
  udp:      { attr:'data-subtab-u', key:'opk_subtab_udp' },
  cable:    { attr:'data-subtab-cb',key:'opk_subtab_cable' }
};

function opkRestaurarUltimaVista(){
  let vista = null;
  try{ vista = localStorage.getItem('opk_ultima_vista'); }catch(e){}
  if(!vista || vista === 'inicio') return;

  const navItem = document.querySelector(`.nav-item[data-view="${vista}"]`);
  if(!navItem) return;

  // Solo restaurar si el usuario todavía tiene permiso para ver esa pestaña
  // (la tarjeta de Inicio se oculta/muestra según permiso para las 8 pestañas)
  const homeCard = document.querySelector(`.home-nav-card[data-goto="${vista}"]`);
  if(homeCard && homeCard.style.display === 'none') return;

  navItem.click();

  const cfg = OPK_SUBTAB_RESTORE[vista];
  if(cfg){
    let sub = null;
    try{ sub = localStorage.getItem(cfg.key); }catch(e){}
    if(sub){
      const subBtn = document.querySelector(`#view-${vista} [${cfg.attr}="${sub}"]`);
      if(subBtn) setTimeout(() => subBtn.click(), 50);
    }
  }
}

function opkOcultarCarga(){
  const loading = document.getElementById('opkLoadingOverlay');
  if(loading) loading.style.display = 'none';
}
function opkMostrarLogin(){
  // Sin sesión activa, las consultas vuelven a viajar como anónimas.
  if(typeof sbUsarToken === 'function') sbUsarToken(null);
  opkOcultarCarga();
  document.body.classList.remove('opk-sesion-activa');
  document.body.classList.add('opk-mostrar-login');
  const pass = document.getElementById('loginPassword');
  if(pass) pass.value = '';
}

function opkColapsarMenuInicial(){
  const sidebarEl = document.getElementById('sidebar');
  if(!sidebarEl) return;
  sidebarEl.classList.add('collapsed');
  const stickyH = document.querySelector('.casos-sticky-header');
  if(stickyH) stickyH.style.left = 'var(--sidebar-w-collapsed)';
  const stickyHyve = document.querySelector('.hyve-sticky-header');
  if(stickyHyve) stickyHyve.style.left = 'var(--sidebar-w-collapsed)';
  const stickyUdp = document.querySelector('.udp-sticky-header');
  if(stickyUdp) stickyUdp.style.left = 'var(--sidebar-w-collapsed)';
  const stickyCable = document.querySelector('.cable-sticky-header');
  if(stickyCable) stickyCable.style.left = 'var(--sidebar-w-collapsed)';
}

// ============================================================
// PLANTILLA DE AVANCE: bitácora dentro del sistema que, al terminar,
// crea automáticamente el caso en Casos Movistar / Hyve / Cable Color.
// ============================================================