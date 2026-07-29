// ============================================================
// 06-actividades.js  —  Actividades Diarias
// Parte de la aplicación NOC Tekcom. Se carga en orden desde index.html;
// NO reordenar las etiquetas <script> ni renombrar estos archivos.
// ============================================================

const ACTIVIDADES_REST_URL = `${SUPABASE_URL}/rest/v1/actividades_diarias`;
let allActividades = [];
let currentActividadEditId = null;
let pendingActividadDeleteId = null;

async function fetchActividades(){
  const wrap = document.getElementById('actividadesTableWrap');
  wrap.innerHTML = '<div class="loading-row"><div class="spinner"></div>Cargando actividades…</div>';
  try{
    const res = await fetch(`${ACTIVIDADES_REST_URL}?select=*&order=fecha.desc`, { headers: sbHeaders });
    if(!res.ok) throw new Error('Error al cargar actividades (' + res.status + ')');
    allActividades = await res.json();
    populateActividadFiltros();
    populateActividadDashFiltros();
    renderActividadesTable();
  }catch(err){
    console.error(err);
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div class="empty-title">No se pudo conectar con la base de datos</div>
        <div class="empty-desc">${err.message}. Verifica que la tabla <strong>actividades_diarias</strong> exista en Supabase.</div>
      </div>`;
    showToast('Error al conectar con Supabase (actividades_diarias)', 'error');
  }
}

function populateActividadFiltros(){
  const proyectos = [...new Set(allActividades.map(a => a.proyecto).filter(Boolean))].sort();
  const anos = [...new Set(allActividades.map(a => a.anio).filter(Boolean))].sort((a,b) => b-a);
  const meses = [...new Set(allActividades.map(a => a.mes).filter(Boolean))];

  const selProyecto = document.getElementById('actProyectoFilter');
  const valProyecto = selProyecto.value;
  selProyecto.innerHTML = '<option value="">Todos los proyectos</option>' +
    proyectos.map(p => `<option ${p===valProyecto?'selected':''}>${escapeHtml(p)}</option>`).join('');

  const selAno = document.getElementById('actAnoFilter');
  const valAno = selAno.value;
  selAno.innerHTML = '<option value="">Todos los años</option>' +
    anos.map(a => `<option ${String(a)===valAno?'selected':''}>${a}</option>`).join('');

  const selMes = document.getElementById('actMesFilter');
  const valMes = selMes.value;
  selMes.innerHTML = '<option value="">Todos los meses</option>' +
    MESES_ES.filter(m => meses.includes(m)).map(m => `<option ${m===valMes?'selected':''}>${m}</option>`).join('');

  // El día se acota a lo que exista con el año y mes ya seleccionados,
  // para no ofrecer días que devolverían una tabla vacía.
  const selDia = document.getElementById('actDiaFilter');
  const valDia = selDia.value;
  const dias = [...new Set(allActividades
    .filter(a => (!valAno || String(a.anio) === valAno) && (!valMes || a.mes === valMes))
    .map(a => a.dia).filter(d => d !== null && d !== undefined && d !== ''))]
    .sort((a,b) => Number(a) - Number(b));
  selDia.innerHTML = '<option value="">Todos los días</option>' +
    dias.map(d => `<option ${String(d)===valDia?'selected':''}>${d}</option>`).join('');
}

// Cada proyecto tiene su color para distinguirlo de un vistazo en la tabla
// y en las alarmas de actividades sin cerrar.
const COLOR_PROYECTO_ACTIVIDAD = {
  'Movistar':    { bg:'#DBEAFE', color:'#1E40AF' },
  'HYVE':        { bg:'#DCFCE7', color:'#166534' },
  'Cable Color': { bg:'#FEE2E2', color:'#991B1B' },
  'UDP':         { bg:'#EDE9FE', color:'#5B21B6' },
  'IBW':         { bg:'#FEF3C7', color:'#92400E' },
};

function colorProyectoActividad(proyecto){
  return COLOR_PROYECTO_ACTIVIDAD[proyecto] || { bg:'#F1F5F9', color:'#475569' };
}

function chipProyectoActividad(proyecto){
  if(!proyecto) return '<span style="color:var(--text-faint);">—</span>';
  const c = colorProyectoActividad(proyecto);
  return `<span class="badge" style="background:${c.bg};color:${c.color};font-weight:700;">${escapeHtml(proyecto)}</span>`;
}

const ACTIVIDADES_POR_PAGINA = 20;
let actividadPaginaActual = 1;

function getActividadesFiltradas(){
  const searchTerm = document.getElementById('actSearch').value.trim().toLowerCase();
  const proyecto = document.getElementById('actProyectoFilter').value;
  const ano = document.getElementById('actAnoFilter').value;
  const mes = document.getElementById('actMesFilter').value;
  const dia = document.getElementById('actDiaFilter').value;

  return allActividades.filter(a => {
    const matchesSearch = !searchTerm || [a.proyecto, a.actividad, a.folio, a.lider_cuadrilla, a.observacion]
      .some(f => (f||'').toLowerCase().includes(searchTerm));
    const matchesProyecto = !proyecto || a.proyecto === proyecto;
    const matchesAno = !ano || String(a.anio) === ano;
    const matchesMes = !mes || a.mes === mes;
    const matchesDia = !dia || String(a.dia) === dia;
    return matchesSearch && matchesProyecto && matchesAno && matchesMes && matchesDia;
  });
}

function renderActividadesTable(resetPagina = true){
  const wrap = document.getElementById('actividadesTableWrap');

  if(resetPagina) actividadPaginaActual = 1;

  const rows = getActividadesFiltradas();

  if(rows.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        <div class="empty-title">${allActividades.length === 0 ? 'Aún no hay actividades registradas' : 'Sin resultados'}</div>
        <div class="empty-desc">${allActividades.length === 0 ? 'Agrega la primera actividad usando el botón "Agregar Actividad".' : 'Prueba con otro término de búsqueda o filtro.'}</div>
      </div>`;
    return;
  }

  const totalPaginas = Math.max(1, Math.ceil(rows.length / ACTIVIDADES_POR_PAGINA));
  if(actividadPaginaActual > totalPaginas) actividadPaginaActual = totalPaginas;
  const startIdx = (actividadPaginaActual - 1) * ACTIVIDADES_POR_PAGINA;
  const pageRows = rows.slice(startIdx, startIdx + ACTIVIDADES_POR_PAGINA);

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Proyecto</th>
          <th>Actividad</th>
          <th>Mantenimiento</th>
          <th>Estatus</th>
          <th>Líder de Cuadrilla</th>
          <th>Total</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows.map(a => actividadRowHtml(a)).join('')}
      </tbody>
    </table>
    <div class="pagination-bar">
      <div class="pagination-info">Mostrando ${startIdx + 1}–${Math.min(startIdx + ACTIVIDADES_POR_PAGINA, rows.length)} de ${rows.length} actividades</div>
      <div class="pagination-controls" id="actividadPaginationControls"></div>
    </div>
  `;

  renderActividadPaginationControls(totalPaginas);

  wrap.querySelectorAll('[data-aaction]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.aaction;
      const actividad = allActividades.find(a => String(a.id) === String(id));
      if(action === 'view') openActividadViewModal(actividad);
      if(action === 'edit') openActividadFormModal(actividad);
      if(action === 'delete') openActividadDeleteModal(actividad);
    });
  });
}

function renderActividadPaginationControls(totalPaginas){
  const wrap = document.getElementById('actividadPaginationControls');
  if(!wrap || totalPaginas <= 1) return;

  const pages = [];
  const cur = actividadPaginaActual;
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
      actividadPaginaActual = parseInt(btn.dataset.page, 10);
      renderActividadesTable(false);
    });
  });
}

function actividadRowHtml(a){
  return `
    <tr>
      <td class="mono">${a.fecha ? new Date(a.fecha + 'T00:00:00').toLocaleDateString('es-SV') : '—'}</td>
      <td>${chipProyectoActividad(a.proyecto)}</td>
      <td>${escapeHtml(a.actividad || '—')}</td>
      <td>${escapeHtml(a.mantenimiento || '—')}</td>
      <td>${a.estatus ? `<span class="status-chip ${statusChipClass(a.estatus)}">${escapeHtml(a.estatus)}</span>` : '<span style="color:var(--text-faint);">—</span>'}</td>
      <td>${escapeHtml(a.lider_cuadrilla || '—')}</td>
      <td class="mono">${escapeHtml(a.total || '—')}</td>
      <td>
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="icon-btn accent" data-aaction="view" data-id="${a.id}" title="Ver">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="icon-btn" data-aaction="edit" data-id="${a.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="icon-btn danger" data-aaction="delete" data-id="${a.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

document.getElementById('actSearch').addEventListener('input', renderActividadesTable);
document.getElementById('actProyectoFilter').addEventListener('change', renderActividadesTable);
document.getElementById('actAnoFilter').addEventListener('change', () => { populateActividadFiltros(); renderActividadesTable(); });
document.getElementById('actMesFilter').addEventListener('change', () => { populateActividadFiltros(); renderActividadesTable(); });
document.getElementById('actDiaFilter').addEventListener('change', renderActividadesTable);

/* ---- Sub-tabs dentro de Actividades Diarias: Listado / Dashboard ---- */
document.querySelectorAll('[data-subtab-a]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.subtabA;
    document.querySelectorAll('[data-subtab-a]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('subtaba-listado').classList.remove('active');
    document.getElementById('subtaba-dashboard').classList.remove('active');
    document.getElementById('subtaba-' + tab).classList.add('active');
    if(tab === 'dashboard'){
      renderActividadesDashboard();
    }
  });
});

/* ---- Dashboard: Atención Por Mes (drill-down Mes -> Semana -> Día) ---- */
let dashActMesTab = 'atencion';

function renderGraficoActividadMes(datos){
  const wrap = document.getElementById('dashActChartMes');
  if(!wrap) return;
  setTabStyle(document.querySelectorAll('.actmes-tab-btn'), dashActMesTab, 'data-actmestab');

  const mesActivo = !!document.getElementById('dashActMesFilter').value;
  const semanaActivo = !!document.getElementById('dashActSemanaFilter').value;

  let agrupador, tituloBase;
  if(semanaActivo){
    agrupador = 'dia';
    tituloBase = 'Por Día';
  } else if(mesActivo){
    agrupador = 'semana';
    tituloBase = 'Por Semana';
  } else {
    agrupador = 'mes';
    tituloBase = 'Por Mes';
  }

  const titulo = document.getElementById('dashActChartMesTitulo');
  if(titulo) titulo.textContent = (dashActMesTab === 'atencion' ? 'Atención ' : 'Horas Trabajadas ') + tituloBase;

  if(dashActMesTab === 'atencion'){
    const porGrupo = {};
    datos.forEach(a => {
      const key = a[agrupador];
      if(key !== null && key !== undefined && key !== '') porGrupo[key] = (porGrupo[key]||0)+1;
    });

    let labels;
    if(agrupador === 'mes'){
      labels = MESES_ORDEN_DASH.filter(m => porGrupo[m]);
    } else {
      labels = Object.keys(porGrupo).sort((a,b)=>Number(a)-Number(b)).map(String);
    }
    const vals = labels.map(l => porGrupo[l]);

    if(!labels.length){
      wrap.innerHTML = '<div class="material-empty" style="padding:60px 0;text-align:center;">Sin datos</div>';
      return;
    }
    wrap.innerHTML = `<canvas id="canvasActMes" style="width:100%;height:240px;"></canvas>`;
    dibujarLineaMes('canvasActMes', labels, vals, 'num');
  } else {
    // Horas trabajadas: SUMA del campo total por mes/semana/día
    const sumaMin = {};
    datos.forEach(a => {
      const key = a[agrupador];
      if(key === null || key === undefined || key === '') return;
      const min = hhmmToMinutesDash(a.total);
      if(min !== null && min >= 0){
        sumaMin[key] = (sumaMin[key]||0) + min;
      }
    });

    let labels;
    if(agrupador === 'mes'){
      labels = MESES_ORDEN_DASH.filter(m => sumaMin[m] !== undefined);
    } else {
      labels = Object.keys(sumaMin).sort((a,b)=>Number(a)-Number(b)).map(String);
    }
    const vals = labels.map(l => sumaMin[l]);

    if(!labels.length){
      wrap.innerHTML = '<div class="material-empty" style="padding:60px 0;text-align:center;">Sin datos de horas</div>';
      return;
    }
    wrap.innerHTML = `<canvas id="canvasActMes" style="width:100%;height:240px;"></canvas>`;
    dibujarLineaMes('canvasActMes', labels, vals, 'hhmm');
  }
}

document.querySelectorAll('.actmes-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    dashActMesTab = btn.dataset.actmestab;
    renderGraficoActividadMes(getActividadesDashFiltradas());
  });
});

/* ---- Dashboard: Actividades por Líder de Cuadrilla (conteo u horas trabajadas sumadas) ---- */
let dashActLiderTab = 'actividades';

function populateActividadDashFiltros(){
  const proyectos = [...new Set(allActividades.map(a => a.proyecto).filter(Boolean))].sort();
  const anos = [...new Set(allActividades.map(a => a.anio).filter(Boolean))].sort((a,b) => b-a);
  const meses = [...new Set(allActividades.map(a => a.mes).filter(Boolean))];
  const semanas = [...new Set(allActividades.map(a => a.semana).filter(Boolean))].sort((a,b) => a-b);
  const dias = [...new Set(allActividades.map(a => a.dia).filter(Boolean))].sort((a,b) => a-b);

  const selProyecto = document.getElementById('dashActProyectoFilter');
  const valProyecto = selProyecto.value;
  selProyecto.innerHTML = '<option value="">Todos los proyectos</option>' +
    proyectos.map(p => `<option ${p===valProyecto?'selected':''}>${escapeHtml(p)}</option>`).join('');

  const selAno = document.getElementById('dashActAnoFilter');
  const valAno = selAno.value;
  selAno.innerHTML = '<option value="">Todos los años</option>' +
    anos.map(a => `<option ${String(a)===valAno?'selected':''}>${a}</option>`).join('');

  const selMes = document.getElementById('dashActMesFilter');
  const valMes = selMes.value;
  selMes.innerHTML = '<option value="">Todos los meses</option>' +
    MESES_ES.filter(m => meses.includes(m)).map(m => `<option ${m===valMes?'selected':''}>${m}</option>`).join('');

  const selSemana = document.getElementById('dashActSemanaFilter');
  const valSemana = selSemana.value;
  selSemana.innerHTML = '<option value="">Todas las semanas</option>' +
    semanas.map(s => `<option ${String(s)===valSemana?'selected':''}>${s}</option>`).join('');

  const selDia = document.getElementById('dashActDiaFilter');
  const valDia = selDia.value;
  selDia.innerHTML = '<option value="">Todos los días</option>' +
    dias.map(d => `<option ${String(d)===valDia?'selected':''}>${d}</option>`).join('');
}

function getActividadesDashFiltradas(){
  const proyecto = document.getElementById('dashActProyectoFilter').value;
  const ano = document.getElementById('dashActAnoFilter').value;
  const mes = document.getElementById('dashActMesFilter').value;
  const semana = document.getElementById('dashActSemanaFilter').value;
  const dia = document.getElementById('dashActDiaFilter').value;

  return allActividades.filter(a => {
    const matchesProyecto = !proyecto || a.proyecto === proyecto;
    const matchesAno = !ano || String(a.anio) === ano;
    const matchesMes = !mes || a.mes === mes;
    const matchesSemana = !semana || String(a.semana) === semana;
    const matchesDia = !dia || String(a.dia) === dia;
    return matchesProyecto && matchesAno && matchesMes && matchesSemana && matchesDia;
  });
}

['dashActProyectoFilter','dashActAnoFilter','dashActMesFilter','dashActSemanaFilter','dashActDiaFilter'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => {
    const datos = getActividadesDashFiltradas();
    renderGraficoActividadMes(datos);
    renderBarrasActividadLider(datos);
  });
});

function renderActividadesDashboard(){
  const datos = getActividadesDashFiltradas();
  renderGraficoActividadMes(datos);
  renderBarrasActividadLider(datos);
}

document.getElementById('btnDashActLimpiarFiltros').addEventListener('click', () => {
  ['dashActProyectoFilter','dashActAnoFilter','dashActMesFilter','dashActSemanaFilter','dashActDiaFilter'].forEach(id => {
    document.getElementById(id).value = '';
  });
  renderActividadesDashboard();
});

document.getElementById('btnDashActExportarPDF').addEventListener('click', () => {
  exportarDashboardPDF('actDashboardCharts', 'Dashboard - Actividades Diarias');
});
document.getElementById('btnDashActExportarPPTX').addEventListener('click', () => {
  exportarActividadesPPTXNativo();
});

document.querySelectorAll('.actlider-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    dashActLiderTab = btn.dataset.actlidertab;
    renderBarrasActividadLider(getActividadesDashFiltradas());
  });
});

function renderBarrasActividadLider(datos){
  setTabStyle(document.querySelectorAll('.actlider-tab-btn'), dashActLiderTab, 'data-actlidertab');
  const wrap = document.getElementById('dashActChartLider');
  if(!wrap) return;

  if(dashActLiderTab === 'actividades'){
    const porLider = {};
    datos.forEach(a => { if(a.lider_cuadrilla){ porLider[a.lider_cuadrilla] = (porLider[a.lider_cuadrilla]||0)+1; } });
    const ordered = Object.entries(porLider).sort((a,b)=>b[1]-a[1]);
    if(!ordered.length){ wrap.innerHTML = '<div class="material-empty">Sin datos</div>'; return; }
    const maxV = Math.max(...ordered.map(([,v])=>v), 1);
    wrap.innerHTML = `<div class="dash-bar-wrap">${ordered.map(([lider,count]) => {
      const pct = Math.round((count/maxV)*100);
      return `<div class="dash-bar-row">
        <div class="dash-bar-label" title="${escapeHtml(lider)}">${escapeHtml(lider)}</div>
        <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.max(pct,3)}%;"><span class="dash-bar-val">${count}</span></div></div>
      </div>`;
    }).join('')}</div>`;
  } else {
    // Horas trabajadas: SUMA del campo total (HH:MM o HH:MM:SS) por líder de cuadrilla
    const sumaMin = {};
    datos.forEach(a => {
      if(!a.lider_cuadrilla) return;
      const min = hhmmToMinutesDash(a.total);
      if(min !== null && min >= 0){
        sumaMin[a.lider_cuadrilla] = (sumaMin[a.lider_cuadrilla]||0) + min;
      }
    });
    const ordered = Object.entries(sumaMin).sort((a,b)=>b[1]-a[1]);
    if(!ordered.length){ wrap.innerHTML = '<div class="material-empty">Sin datos de horas</div>'; return; }
    const maxV = Math.max(...ordered.map(([,v])=>v), 1);
    wrap.innerHTML = `<div class="dash-bar-wrap">${ordered.map(([lider,min]) => {
      const pct = Math.round((min/maxV)*100);
      return `<div class="dash-bar-row">
        <div class="dash-bar-label" title="${escapeHtml(lider)}">${escapeHtml(lider)}</div>
        <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.max(pct,3)}%;"><span class="dash-bar-val">${minToHHMM(min)}</span></div></div>
      </div>`;
    }).join('')}</div>`;
  }
}

/* ---- Buscador de Líder de Cuadrilla (personal) ---- */
const actTecnicoSearch = document.getElementById('act_tecnico_search');
const actTecnicoResults = document.getElementById('act_tecnico_results');

function setActividadTecnico(persona){
  document.getElementById('act_tecnico_id').value = persona ? persona.id : '';
  if(persona){
    document.getElementById('act_tecnico_avatar').textContent = initials(persona.nombre);
    document.getElementById('act_tecnico_avatar').style.background = colorFor(persona.cuadrilla || persona.nombre || '');
    document.getElementById('act_tecnico_name').textContent = persona.nombre;
    document.getElementById('act_tecnico_meta').textContent = (persona.cuadrilla || '—') + ' · ' + (persona.puesto || '—');
    document.getElementById('act_tecnico_selected').style.display = 'block';
  } else {
    document.getElementById('act_tecnico_selected').style.display = 'none';
  }
}
actTecnicoSearch.addEventListener('input', () => {
  const term = actTecnicoSearch.value.trim().toLowerCase();
  if(!term){ actTecnicoResults.classList.remove('show'); actTecnicoResults.innerHTML=''; return; }
  const matches = allPeople.filter(p => (p.nombre||'').toLowerCase().includes(term)).slice(0, 20);
  actTecnicoResults.innerHTML = matches.length === 0
    ? '<div class="site-result-empty">Sin resultados</div>'
    : matches.map(p => `
        <div class="site-result-item" data-atecnico-id="${escapeHtml(p.id)}">
          <div class="site-result-name">${escapeHtml(p.nombre)}</div>
          <div class="site-result-meta">${escapeHtml(p.cuadrilla || '—')} · ${escapeHtml(p.puesto || '—')}</div>
        </div>
      `).join('');
  actTecnicoResults.classList.add('show');
});
actTecnicoResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-atecnico-id]');
  if(!item) return;
  const persona = allPeople.find(p => String(p.id) === String(item.dataset.atecnicoId));
  if(persona){ setActividadTecnico(persona); }
  actTecnicoSearch.value = '';
  actTecnicoResults.classList.remove('show');
  actTecnicoResults.innerHTML = '';
});
document.addEventListener('click', (e) => {
  if(!e.target.closest('#act_tecnico_search') && !e.target.closest('#act_tecnico_results')){
    actTecnicoResults.classList.remove('show');
  }
});
document.getElementById('act_tecnico_clear').addEventListener('click', () => setActividadTecnico(null));

/* ---- Auto-cálculo de Mes / Año / Semana / Día a partir de la Fecha ---- */
document.getElementById('act_fecha').addEventListener('change', () => {
  const val = document.getElementById('act_fecha').value;
  if(!val) return;
  const d = new Date(val + 'T00:00:00');
  document.getElementById('act_mes').value = MESES_ES[d.getMonth()];
  document.getElementById('act_anio').value = d.getFullYear();
  document.getElementById('act_semana').value = getSemanaISO(d);
  document.getElementById('act_dia').value = d.getDate();
});

/* ---- Auto-cálculo del Total a partir de Inicio/Hora e Inicio/Final ---- */
function recalcActividadTotal(){
  const hIni = document.getElementById('act_inicio_hora').value;
  const hFin = document.getElementById('act_inicio_final').value;
  if(!hIni || !hFin){ document.getElementById('act_total').value = ''; return; }
  const d1 = new Date(hIni);
  const d2 = new Date(hFin);
  if(isNaN(d1.getTime()) || isNaN(d2.getTime())){ document.getElementById('act_total').value = ''; return; }
  let mins = Math.round((d2 - d1) / 60000);
  if(mins < 0) mins = 0; // Hora Final antes que Hora Inicio: no debería pasar, pero se evita un total negativo
  document.getElementById('act_total').value = minutesToHHMM(mins);
}
document.getElementById('act_inicio_hora').addEventListener('change', recalcActividadTotal);
document.getElementById('act_inicio_final').addEventListener('change', recalcActividadTotal);

/* ---- Modal Agregar / Editar Actividad ---- */
const actividadFormModalOverlay = document.getElementById('actividadFormModalOverlay');

function openActividadFormModal(actividad){
  if(document.getElementById('act_anio').options.length === 0){
    const anioSel = document.getElementById('act_anio');
    let opts = '<option value="">—</option>';
    for(let y = 2024; y <= 2037; y++){ opts += `<option>${y}</option>`; }
    anioSel.innerHTML = opts;
    document.getElementById('act_mes').innerHTML = '<option value="">—</option>' + MESES_ES.map(m => `<option>${m}</option>`).join('');

    const semanaSel = document.getElementById('act_semana');
    let optsSemana = '<option value="">—</option>';
    for(let s = 1; s <= 54; s++){ optsSemana += `<option>${s}</option>`; }
    semanaSel.innerHTML = optsSemana;

    const diaSel = document.getElementById('act_dia');
    let optsDia = '<option value="">—</option>';
    for(let d = 1; d <= 31; d++){ optsDia += `<option>${d}</option>`; }
    diaSel.innerHTML = optsDia;
  }

  currentActividadEditId = actividad ? actividad.id : null;
  document.getElementById('actividadFormModalTitle').textContent = actividad ? 'Editar Actividad' : 'Agregar Actividad';

  if(actividad){
    document.getElementById('act_fecha').value = actividad.fecha || '';
    document.getElementById('act_proyecto').value = actividad.proyecto || '';
    document.getElementById('act_mes').value = actividad.mes || '';
    document.getElementById('act_anio').value = actividad.anio ?? '';
    document.getElementById('act_semana').value = actividad.semana ?? '';
    document.getElementById('act_dia').value = actividad.dia ?? '';
    document.getElementById('act_mantenimiento').value = actividad.mantenimiento || '';
  } else {
    // Actividad nueva: valores por defecto según la fecha y hora del sistema (PC)
    const now = new Date();
    const pad = n => String(n).padStart(2,'0');
    document.getElementById('act_fecha').value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    document.getElementById('act_proyecto').value = 'Movistar';
    document.getElementById('act_mes').value = MESES_ES[now.getMonth()];
    document.getElementById('act_anio').value = now.getFullYear();
    document.getElementById('act_semana').value = getSemanaISO(now);
    document.getElementById('act_dia').value = now.getDate();
    document.getElementById('act_mantenimiento').value = 'Correctivo';
  }

  document.getElementById('act_actividad').value = actividad?.actividad || '';
  document.getElementById('act_folio').value = actividad?.folio || '';
  document.getElementById('act_estatus').value = actividad?.estatus || (actividad ? '' : 'En Proceso');
  document.getElementById('act_inicio_hora').value = isoToDatetimeLocal(actividad?.inicio_hora);
  document.getElementById('act_inicio_final').value = isoToDatetimeLocal(actividad?.inicio_final);
  document.getElementById('act_total').value = actividad?.total || '';
  document.getElementById('act_observacion').value = actividad?.observacion || '';

  actTecnicoSearch.value = '';
  const personaExistente = actividad?.lider_cuadrilla
    ? allPeople.find(p => p.nombre === actividad.lider_cuadrilla)
    : null;
  if(personaExistente){
    setActividadTecnico(personaExistente);
  } else if(actividad?.lider_cuadrilla){
    document.getElementById('act_tecnico_id').value = '';
    document.getElementById('act_tecnico_selected').style.display = 'block';
    document.getElementById('act_tecnico_avatar').textContent = initials(actividad.lider_cuadrilla);
    document.getElementById('act_tecnico_avatar').style.background = colorFor(actividad.lider_cuadrilla);
    document.getElementById('act_tecnico_name').textContent = actividad.lider_cuadrilla;
    document.getElementById('act_tecnico_meta').textContent = 'No encontrado en Listado del Personal';
  } else {
    setActividadTecnico(null);
  }

  actividadFormModalOverlay.classList.add('active');
}

document.getElementById('btnAddActividad').addEventListener('click', () => openActividadFormModal(null));
document.getElementById('actividadFormModalClose').addEventListener('click', () => actividadFormModalOverlay.classList.remove('active'));
document.getElementById('actividadFormCancelBtn').addEventListener('click', () => actividadFormModalOverlay.classList.remove('active'));

document.getElementById('actividadFormSaveBtn').addEventListener('click', async () => {
  const toTextOrNull = (id) => {
    const v = document.getElementById(id).value.trim();
    return v === '' ? null : v;
  };
  const toIntOrNull = (id) => {
    const v = document.getElementById(id).value;
    return v === '' ? null : parseInt(v, 10);
  };
  const toIsoOrNull = (id) => {
    const v = document.getElementById(id).value;
    return v ? new Date(v).toISOString() : null;
  };

  const aTecnicoId = document.getElementById('act_tecnico_id').value;
  const aTecnicoPersona = aTecnicoId ? allPeople.find(p => String(p.id) === String(aTecnicoId)) : null;
  const aNombreLider = aTecnicoPersona ? aTecnicoPersona.nombre : (document.getElementById('act_tecnico_name').textContent !== '—' ? document.getElementById('act_tecnico_name').textContent : null);

  const payload = {
    fecha: toTextOrNull('act_fecha'),
    proyecto: toTextOrNull('act_proyecto'),
    mes: toTextOrNull('act_mes'),
    anio: toIntOrNull('act_anio'),
    semana: toIntOrNull('act_semana'),
    dia: toIntOrNull('act_dia'),
    actividad: toTextOrNull('act_actividad'),
    mantenimiento: toTextOrNull('act_mantenimiento'),
    lider_cuadrilla: aNombreLider,
    folio: toTextOrNull('act_folio'),
    estatus: toTextOrNull('act_estatus'),
    inicio_hora: toIsoOrNull('act_inicio_hora'),
    inicio_final: toIsoOrNull('act_inicio_final'),
    total: toTextOrNull('act_total'),
    observacion: toTextOrNull('act_observacion'),
  };

  const saveBtn = document.getElementById('actividadFormSaveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando…';

  try{
    let res;
    if(currentActividadEditId){
      res = await fetch(`${ACTIVIDADES_REST_URL}?id=eq.${currentActividadEditId}`, {
        method: 'PATCH',
        headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(ACTIVIDADES_REST_URL, {
        method: 'POST',
        headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(payload)
      });
    }
    if(!res.ok) throw new Error('Error al guardar (' + res.status + ')');
    actividadFormModalOverlay.classList.remove('active');
    showToast(currentActividadEditId ? 'Actividad actualizada' : 'Actividad agregada');
    await fetchActividades();
  }catch(err){
    console.error(err);
    showToast('Error al guardar la actividad', 'error');
  }finally{
    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar';
  }
});

/* ---- Modal Ver Actividad ---- */
const actividadViewModalOverlay = document.getElementById('actividadViewModalOverlay');
function openActividadViewModal(a){
  const campos = [
    ['Fecha', a.fecha ? new Date(a.fecha + 'T00:00:00').toLocaleDateString('es-SV') : '—'],
    ['Proyecto', a.proyecto], ['Mes', a.mes], ['Año', a.anio], ['Semana', a.semana], ['Día', a.dia],
    ['Actividad', a.actividad], ['Mantenimiento', a.mantenimiento], ['Estatus', a.estatus], ['Líder de Cuadrilla', a.lider_cuadrilla],
    ['Folio', a.folio],
    ['Hora Inicio', a.inicio_hora ? new Date(a.inicio_hora).toLocaleString('es-SV') : null],
    ['Hora Final', a.inicio_final ? new Date(a.inicio_final).toLocaleString('es-SV') : null],
    ['Total', a.total],
    ['Observación', a.observacion],
  ];
  document.getElementById('actividadViewGrid').innerHTML = campos.map(([label,val]) => `
    <div>
      <div class="view-field-label">${label}</div>
      <div class="view-field-value">${(val === null || val === undefined || val === '') ? '<span style="color:var(--text-faint);">—</span>' : escapeHtml(String(val))}</div>
    </div>
  `).join('');
  actividadViewModalOverlay.classList.add('active');
}
document.getElementById('actividadViewModalClose').addEventListener('click', () => actividadViewModalOverlay.classList.remove('active'));

/* ---- Modal Eliminar Actividad ---- */
const actividadDeleteModalOverlay = document.getElementById('actividadDeleteModalOverlay');
function openActividadDeleteModal(a){
  pendingActividadDeleteId = a.id;
  actividadDeleteModalOverlay.classList.add('active');
}
document.getElementById('actividadDeleteModalClose').addEventListener('click', () => actividadDeleteModalOverlay.classList.remove('active'));
document.getElementById('actividadDeleteCancelBtn').addEventListener('click', () => actividadDeleteModalOverlay.classList.remove('active'));
document.getElementById('actividadDeleteConfirmBtn').addEventListener('click', async () => {
  if(!pendingActividadDeleteId) return;
  try{
    const res = await fetch(`${ACTIVIDADES_REST_URL}?id=eq.${pendingActividadDeleteId}`, {
      method: 'DELETE',
      headers: sbHeaders
    });
    if(!res.ok) throw new Error('Error al eliminar (' + res.status + ')');
    actividadDeleteModalOverlay.classList.remove('active');
    showToast('Actividad eliminada');
    await fetchActividades();
  }catch(err){
    console.error(err);
    showToast('Error al eliminar la actividad', 'error');
  }
});

/* ---- Exportar Actividades a Excel ---- */
document.getElementById('btnExportarActividades').addEventListener('click', () => {
  const aExportar = getActividadesFiltradas();
  if(aExportar.length === 0){
    showToast('No hay actividades que coincidan con los filtros para exportar', 'error');
    return;
  }

  const headers = [
    ['fecha','Fecha'],['proyecto','Proyecto'],['mes','Mes'],['anio','Año'],['semana','Semana'],['dia','Dia'],
    ['actividad','Actividad'],['mantenimiento','Mantenimiento'],['estatus','Estatus'],['lider_cuadrilla','Lider de Cuadrilla'],
    ['folio','Folio'],['inicio_hora','Hora Inicio'],['inicio_final','Hora Final'],['total','Total'],
    ['observacion','Observacion'],
  ];

  const rows = aExportar.map(a => headers.map(([col]) => {
    let val = a[col];
    if(['inicio_hora','inicio_final'].includes(col)){
      val = val ? new Date(val).toLocaleString('es-SV') : '';
    }
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
    <x:Name>Actividades Diarias</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head><body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsHeader], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `actividades-diarias-${new Date().toISOString().slice(0,10)}.xls`;
  link.click();
  URL.revokeObjectURL(link.href);

  showToast(`Excel generado con ${aExportar.length} actividad${aExportar.length === 1 ? '' : 'es'} filtrada${aExportar.length === 1 ? '' : 's'}`);
});

/* ==================================================================
   CUMPLIMIENTO DE VISITAS
   ================================================================== */