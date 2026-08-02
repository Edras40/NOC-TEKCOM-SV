// ============================================================
// 09-estatus-udp.js  —  Bitácora de Estatus UDP
// Parte de la aplicación NOC Tekcom. Se carga en orden desde index.html;
// NO reordenar las etiquetas <script> ni renombrar estos archivos.
// ============================================================

const ESTATUS_UDP_REST_URL = `${SUPABASE_URL}/rest/v1/estatus_udp`;

const ESTATUS_UDP_OPCIONES = ['En Proceso', 'Finalizado', 'Pendiente', 'Cancelado', 'Pausado'];

// En Ruta / En Sitio: lista cerrada en vez de texto libre.
const EUDP_RUTA_SITIO_OPCIONES = ['', 'SI', 'NO'];

const ESTATUS_UDP_COLOR = {
  'En Proceso': { bg:'#FEF3C7', color:'#92400E' },
  'Finalizado': { bg:'#DCFCE7', color:'#166534' },
  'Pendiente':  { bg:'#E0E7FF', color:'#3730A3' },
  'Cancelado':  { bg:'#FEE2E2', color:'#991B1B' },
  'Pausado':    { bg:'#F1F5F9', color:'#475569' },
};

let estatusUdpLista = [];
let estatusUdpCargado = false;
let editandoEstatusUdpId = null;

async function fetchEstatusUdp(){
  const res = await fetch(`${ESTATUS_UDP_REST_URL}?select=*&order=fecha.desc,numero.asc`, { headers: sbHeaders });
  if(!res.ok) throw new Error(await res.text());
  estatusUdpLista = await res.json();
  estatusUdpCargado = true;
}

// SI se muestra en verde; NO en gris, para leer la fila de un vistazo.
function eudpChipSiNo(valor){
  if(!valor) return '<span style="color:var(--text-faint);">—</span>';
  const esSi = String(valor).toUpperCase() === 'SI';
  const c = esSi ? { bg:'#DCFCE7', color:'#166534' } : { bg:'#F1F5F9', color:'#475569' };
  return `<span class="badge" style="background:${c.bg};color:${c.color};font-weight:700;">${escapeHtml(valor)}</span>`;
}

function estatusUdpChip(valor){
  const c = ESTATUS_UDP_COLOR[valor] || { bg:'#F1F5F9', color:'#475569' };
  return `<span class="badge" style="background:${c.bg};color:${c.color};font-weight:700;">${escapeHtml(valor || '—')}</span>`;
}

async function renderEstatusUdp(wrap){
  if(!estatusUdpCargado){
    wrap.innerHTML = '<div class="material-empty">Cargando bitácora...</div>';
    try{
      await fetchEstatusUdp();
      if(!escuelasLoaded) await fetchEscuelas();
    }catch(err){
      wrap.innerHTML = `<div class="material-empty">No se pudo cargar la bitácora: ${escapeHtml(err.message)}</div>`;
      return;
    }
  }

  // Al finalizar, la asignación se convierte en caso de UDP y desaparece de la bitácora.
  const visibles = estatusUdpLista.filter(r => r.estatus !== 'Finalizado');

  const busqueda = (document.getElementById('estatusUdpBuscar')?.value || '').trim().toLowerCase();
  const filas = busqueda
    ? visibles.filter(r => [r.id_escuela, r.descripcion, r.responsable, r.avance, r.estatus]
        .some(v => String(v || '').toLowerCase().includes(busqueda)))
    : visibles;

  wrap.innerHTML = `
    ${plMembreteEstatusHtml()}
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
      ${plSubtabsEstatusHtml()}
      <div style="display:flex; gap:10px;">
        <button type="button" class="btn btn-primary" id="btnNuevoEstatusUdp">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nueva Asignación
        </button>
      </div>
    </div>
    <div class="filter-bar" style="margin-bottom:12px;">
      <div class="filter-bar-item" style="max-width:420px;">
        <span class="filter-bar-label">Buscar</span>
        <input type="text" class="filter-search" id="estatusUdpBuscar" placeholder="ID, escuela, responsable, avance..." value="${escapeHtml(busqueda)}">
      </div>
      <div style="margin-left:auto; font-size:12.5px; color:var(--text-dim); align-self:center;">
        ${filas.length} de ${visibles.length} activo(s)
      </div>
    </div>
    <div class="panel" style="overflow:auto;">
      <table class="tabla-bitacora-udp">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>ID</th>
            <th>Descripción</th>
            <th>Responsable</th>
            <th>En Ruta</th>
            <th>En Sitio</th>
            <th>Inicio Labores</th>
            <th>Fin Labores</th>
            <th>Avance</th>
            <th>Estatus</th>
            <th style="text-align:right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filas.length === 0 ? `
            <tr>
              <td colspan="10" style="text-align:center; padding:34px 12px; color:var(--text-dim);">
                ${visibles.length === 0
                  ? 'Sin registros en la bitácora. Agrega la primera con "Nueva Asignación".'
                  : 'Ningún registro coincide con la búsqueda.'}
              </td>
            </tr>` : filas.map(r => `
              <tr>
                <td class="mono">${escapeHtml(r.fecha ? plFormatearFechaDDMMYYYY(r.fecha) : '—')}</td>
                <td class="mono" style="font-weight:700;">${escapeHtml(r.id_escuela || '—')}</td>
                <td>${escapeHtml(r.descripcion || '—')}</td>
                <td>${escapeHtml(r.responsable || '—')}</td>
                <td>${eudpChipSiNo(r.en_ruta)}</td>
                <td>${eudpChipSiNo(r.en_sitio)}</td>
                <td class="mono">${escapeHtml(plFechaHoraMilitar(r.inicio_labores) || '—')}</td>
                <td class="mono">${escapeHtml(plFechaHoraMilitar(r.fin_labores) || '—')}</td>
                <td>${escapeHtml(r.avance || '—')}</td>
                <td>${estatusUdpChip(r.estatus)}</td>
                <td>
                  <div class="row-actions" style="justify-content:flex-end;">
                    <button class="icon-btn" data-eudp-editar="${r.id}" title="Editar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="icon-btn danger" data-eudp-borrar="${r.id}" title="Eliminar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </td>
              </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;

  plEnlazarSubtabsEstatus(wrap);
  document.getElementById('btnNuevoEstatusUdp')?.addEventListener('click', () => abrirEstatusUdpModal(null));

  const buscador = document.getElementById('estatusUdpBuscar');
  if(buscador){
    buscador.addEventListener('input', () => renderEstatusUdp(wrap));
    if(busqueda){ buscador.focus(); buscador.setSelectionRange(busqueda.length, busqueda.length); }
  }

  wrap.querySelectorAll('[data-eudp-editar]').forEach(b =>
    b.addEventListener('click', () => abrirEstatusUdpModal(Number(b.dataset.eudpEditar))));
  wrap.querySelectorAll('[data-eudp-borrar]').forEach(b =>
    b.addEventListener('click', () => eliminarEstatusUdp(Number(b.dataset.eudpBorrar))));
}

async function eliminarEstatusUdp(id){
  const r = estatusUdpLista.find(x => x.id === id);
  if(!r) return;
  if(!confirm(`¿Eliminar la asignación de ${r.descripcion || r.id_escuela}?`)) return;
  try{
    const res = await fetch(`${ESTATUS_UDP_REST_URL}?id=eq.${id}`, { method:'DELETE', headers: sbHeaders });
    if(!res.ok) throw new Error(await res.text());
    await fetchEstatusUdp();
    renderEstatusUdp(document.getElementById('plListaWrap'));
    showToast('Asignación eliminada');
  }catch(err){
    showToast('No se pudo eliminar: ' + err.message, 'error');
  }
}

// --- Formulario de la bitácora UDP ---
function estatusUdpLlenarCatalogos(){
  document.getElementById('eudp_estatus').innerHTML =
    ESTATUS_UDP_OPCIONES.map(o => `<option>${o}</option>`).join('');
  ['eudp_en_ruta','eudp_en_sitio'].forEach(id => {
    document.getElementById(id).innerHTML =
      EUDP_RUTA_SITIO_OPCIONES.map(o => `<option value="${o}">${o || '—'}</option>`).join('');
  });
}

// Buscador de responsable, sobre el mismo Listado del Personal de los otros módulos.
function eudpSetResponsable(persona){
  const sel = document.getElementById('eudp_resp_selected');
  const search = document.getElementById('eudp_resp_search');
  document.getElementById('eudp_responsable').value = persona ? persona.nombre : '';
  if(persona){
    document.getElementById('eudp_resp_avatar').textContent =
      (persona.nombre || '?').split(' ').map(x => x[0]).slice(0,2).join('').toUpperCase();
    document.getElementById('eudp_resp_nombre').textContent = persona.nombre;
    document.getElementById('eudp_resp_meta').textContent =
      [persona.cuadrilla, persona.puesto].filter(Boolean).join(' · ') || '—';
    sel.style.display = '';
    search.parentElement.parentElement.style.display = 'none';
  } else {
    sel.style.display = 'none';
    search.parentElement.parentElement.style.display = '';
    search.value = '';
  }
}

const eudpRespBuscar = document.getElementById('eudp_resp_search');
const eudpRespResultados = document.getElementById('eudp_resp_results');

eudpRespBuscar?.addEventListener('input', () => {
  const term = eudpRespBuscar.value.trim().toLowerCase();
  if(term.length < 1){ eudpRespResultados.classList.remove('show'); return; }
  const personal = (typeof allPeople !== 'undefined' && Array.isArray(allPeople)) ? allPeople : [];
  const matches = personal.filter(p => String(p.nombre || '').toLowerCase().includes(term)).slice(0, 12);
  eudpRespResultados.innerHTML = matches.length
    ? matches.map(p => `
        <div class="site-result-item" data-eudp-resp="${escapeHtml(p.id)}">
          <div class="site-result-name">${escapeHtml(p.nombre)}</div>
          <div class="site-result-meta">${escapeHtml(p.cuadrilla || '—')} · ${escapeHtml(p.puesto || '—')}</div>
        </div>`).join('')
    : '<div class="site-result-item" style="color:var(--text-dim);">Sin coincidencias</div>';
  eudpRespResultados.classList.add('show');
});

eudpRespResultados?.addEventListener('click', (e) => {
  const item = e.target.closest('[data-eudp-resp]');
  if(!item) return;
  const personal = (typeof allPeople !== 'undefined' && Array.isArray(allPeople)) ? allPeople : [];
  const persona = personal.find(x => String(x.id) === String(item.dataset.eudpResp));
  if(persona) eudpSetResponsable(persona);
  eudpRespResultados.classList.remove('show');
});

document.getElementById('eudp_resp_clear')?.addEventListener('click', () => eudpSetResponsable(null));

// Buscador de escuela: al elegirla se llena la Descripción sola.
// Es la razón de tener el catálogo — no reescribir el nombre en cada asignación.
function eudpSetEscuela(esc){
  const sel = document.getElementById('eudp_escuela_selected');
  const search = document.getElementById('eudp_escuela_search');
  document.getElementById('eudp_id_escuela').value = esc ? esc.id_escuela : '';
  document.getElementById('eudp_descripcion').value = esc ? esc.nombre : '';
  if(esc){
    document.getElementById('eudp_escuela_num').textContent = String(esc.id_escuela).slice(-3);
    document.getElementById('eudp_escuela_nombre').textContent = esc.nombre;
    document.getElementById('eudp_escuela_meta').textContent =
      [esc.id_escuela, esc.distrito, esc.municipio].filter(Boolean).join(' · ') || '—';
    sel.style.display = '';
    search.parentElement.parentElement.style.display = 'none';
  } else {
    sel.style.display = 'none';
    search.parentElement.parentElement.style.display = '';
    search.value = '';
  }
}

const eudpBuscar = document.getElementById('eudp_escuela_search');
const eudpResultados = document.getElementById('eudp_escuela_results');

eudpBuscar?.addEventListener('input', () => {
  const term = eudpBuscar.value.trim().toLowerCase();
  if(term.length < 1){ eudpResultados.classList.remove('show'); return; }
  const matches = allEscuelas.filter(e =>
    String(e.id_escuela).toLowerCase().includes(term) ||
    String(e.nombre || '').toLowerCase().includes(term)
  ).slice(0, 12);

  eudpResultados.innerHTML = matches.length
    ? matches.map(e => `
        <div class="site-result-item" data-eudp-esc="${escapeHtml(e.id_escuela)}">
          <div class="site-result-name">${escapeHtml(e.nombre)}</div>
          <div class="site-result-meta">ID ${escapeHtml(e.id_escuela)}${e.distrito ? ' · ' + escapeHtml(e.distrito) : ''}</div>
        </div>`).join('')
    : '<div class="site-result-item" style="color:var(--text-dim);">Sin coincidencias en el catálogo</div>';
  eudpResultados.classList.add('show');
});

eudpResultados?.addEventListener('click', (e) => {
  const item = e.target.closest('[data-eudp-esc]');
  if(!item) return;
  const esc = allEscuelas.find(x => String(x.id_escuela) === String(item.dataset.eudpEsc));
  if(esc) eudpSetEscuela(esc);
  eudpResultados.classList.remove('show');
});

document.getElementById('eudp_escuela_clear')?.addEventListener('click', () => eudpSetEscuela(null));

function abrirEstatusUdpModal(registroId){
  if(!allEscuelas.length){
    plMostrarErrorCentro('Primero registra escuelas en la pestaña "ID Escuelas UDP".');
    return;
  }
  const r = registroId ? estatusUdpLista.find(x => x.id === registroId) : null;
  editandoEstatusUdpId = r ? r.id : null;

  estatusUdpLlenarCatalogos();
  document.getElementById('estatusUdpModalTitle').textContent = r ? 'Editar Asignación' : 'Nueva Asignación';
  document.getElementById('eudp_registro_id').value = r ? r.id : '';
  document.getElementById('eudp_fecha').value = r?.fecha || plFechaLocalISO(new Date());
  // El correlativo se sugiere como el siguiente de la fecha en curso.
  const siguienteNo = r ? r.numero : (estatusUdpLista.reduce((max, x) => Math.max(max, Number(x.numero) || 0), 0) + 1);
  document.getElementById('eudp_numero').value = siguienteNo ?? '';
  const escSel = r ? allEscuelas.find(e => String(e.id_escuela) === String(r.id_escuela)) : null;
  eudpSetEscuela(escSel);
  // Si el registro apunta a una escuela borrada del catálogo, se conserva lo guardado.
  if(r && !escSel){
    document.getElementById('eudp_id_escuela').value = r.id_escuela || '';
    document.getElementById('eudp_descripcion').value = r.descripcion || '';
  }
  const personalLista = (typeof allPeople !== 'undefined' && Array.isArray(allPeople)) ? allPeople : [];
  eudpSetResponsable(r ? personalLista.find(x => x.nombre === r.responsable) || null : null);
  if(r && r.responsable && !document.getElementById('eudp_responsable').value){
    document.getElementById('eudp_responsable').value = r.responsable;
  }
  document.getElementById('eudp_estatus').value = r?.estatus || 'Pendiente';
  document.getElementById('eudp_en_ruta').value = r?.en_ruta || '';
  document.getElementById('eudp_en_sitio').value = r?.en_sitio || '';
  document.getElementById('eudp_inicio_labores').value = r?.inicio_labores ? isoToDatetimeLocal(r.inicio_labores) : '';
  document.getElementById('eudp_fin_labores').value = r?.fin_labores ? isoToDatetimeLocal(r.fin_labores) : '';
  document.getElementById('eudp_avance').value = r?.avance || '';

  document.getElementById('estatusUdpModalOverlay').classList.add('active');
}

function cerrarEstatusUdpModal(){
  document.getElementById('estatusUdpModalOverlay').classList.remove('active');
  editandoEstatusUdpId = null;
}

async function guardarEstatusUdp(){
  const fecha = document.getElementById('eudp_fecha').value;
  const idEscuela = document.getElementById('eudp_id_escuela').value;
  if(!fecha){ showToast('Indica la fecha', 'error'); return; }
  if(!idEscuela){ showToast('Elige el ID de la escuela', 'error'); return; }

  const numeroTxt = document.getElementById('eudp_numero').value.trim();
  const payload = {
    fecha,
    numero: numeroTxt === '' ? null : parseInt(numeroTxt, 10),
    id_escuela: idEscuela,
    descripcion: document.getElementById('eudp_descripcion').value.trim() || null,
    responsable: document.getElementById('eudp_responsable').value || null,
    en_ruta: document.getElementById('eudp_en_ruta').value || null,
    en_sitio: document.getElementById('eudp_en_sitio').value || null,
    inicio_labores: toIsoLocal('eudp_inicio_labores'),
    fin_labores: toIsoLocal('eudp_fin_labores'),
    avance: document.getElementById('eudp_avance').value.trim() || null,
    estatus: document.getElementById('eudp_estatus').value,
  };

  if(payload.inicio_labores && payload.fin_labores &&
     new Date(payload.fin_labores) < new Date(payload.inicio_labores)){
    plMostrarErrorCentro('El Fin de Labores no puede ser anterior al Inicio de Labores.');
    return;
  }
  if(payload.estatus === 'Finalizado' && (!payload.inicio_labores || !payload.fin_labores)){
    plMostrarErrorCentro('Para finalizar necesitas Inicio y Fin de Labores: de ahí sale el SLA del caso.');
    return;
  }

  const btn = document.getElementById('estatusUdpGuardarBtn');
  btn.disabled = true;
  try{
    const url = editandoEstatusUdpId ? `${ESTATUS_UDP_REST_URL}?id=eq.${editandoEstatusUdpId}` : ESTATUS_UDP_REST_URL;
    const res = await fetch(url, {
      method: editandoEstatusUdpId ? 'PATCH' : 'POST',
      headers: { ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error(await res.text());
    const guardado = (await res.json())[0];

    // Al finalizar, la asignación se convierte en caso de UDP y sale de la bitácora.
    if(payload.estatus === 'Finalizado'){
      await crearCasoUdpDesdeEstatus(guardado || payload);
    }

    cerrarEstatusUdpModal();
    await fetchEstatusUdp();
    renderEstatusUdp(document.getElementById('plListaWrap'));
    showToast(payload.estatus === 'Finalizado'
      ? 'Asignación finalizada y registrada en Casos UDP'
      : (editandoEstatusUdpId ? 'Asignación actualizada' : 'Asignación agregada'));
  }catch(err){
    plMostrarErrorCentro('No se pudo guardar: ' + err.message);
  }finally{
    btn.disabled = false;
  }
}

document.getElementById('estatusUdpModalClose')?.addEventListener('click', cerrarEstatusUdpModal);
document.getElementById('estatusUdpCancelBtn')?.addEventListener('click', cerrarEstatusUdpModal);
document.getElementById('estatusUdpGuardarBtn')?.addEventListener('click', guardarEstatusUdp);
document.getElementById('estatusUdpModalOverlay')?.addEventListener('click', (ev) => {
  if(ev.target === document.getElementById('estatusUdpModalOverlay')) cerrarEstatusUdpModal();
});

// Helper: lee un datetime-local y lo devuelve en ISO, o null si está vacío.
function toIsoLocal(id){
  const v = document.getElementById(id)?.value;
  return v ? new Date(v).toISOString() : null;
}

// Al finalizar una asignación de la bitácora se crea el caso en UDP con los
// campos que ambos comparten. El SLA sale de Fin - Inicio de labores.
async function crearCasoUdpDesdeEstatus(r){
  try{
    const inicio = r.inicio_labores ? new Date(r.inicio_labores) : null;
    const fin = r.fin_labores ? new Date(r.fin_labores) : null;
    const slaMin = (inicio && fin) ? (fin - inicio) / 60000 : null;

    const payload = {
      casos: r.descripcion || null,          // Casos  <- Descripción
      id_externo: r.id_escuela || null,      // ID     <- ID Escuela
      nombre_del_tecnico: r.responsable || null, // Técnico <- Team Líder
      escalonamiento: r.inicio_labores || null,  // Escalonamiento <- Inicio de Labores
      resolucion: r.fin_labores || null,         // Resolución     <- Fin de Labores
      sla: slaMin !== null ? minutesToHHMM(slaMin) : null,
      mes: inicio ? MESES_ES[inicio.getMonth()] : null,
      dia: inicio ? inicio.getDate() : null,
      status: 'En Proceso', // el operador completa el resto y lo cierra
    };

    // Evita duplicar si esa asignación ya generó su caso.
    let existenteId = null;
    if(r.caso_id){
      existenteId = r.caso_id;
    }

    const url = existenteId ? `${UDP_REST_URL}?id=eq.${existenteId}` : UDP_REST_URL;
    const res = await fetch(url, {
      method: existenteId ? 'PATCH' : 'POST',
      headers: { ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error(await res.text());

    const creado = (await res.json())[0];
    if(creado && r.id && !r.caso_id){
      await fetch(`${ESTATUS_UDP_REST_URL}?id=eq.${r.id}`, {
        method:'PATCH', headers: sbHeaders,
        body: JSON.stringify({ caso_id: creado.id })
      });
    }
  }catch(err){
    plMostrarErrorCentro('La asignación se guardó, pero no se pudo crear el caso en UDP: ' + err.message);
  }
}

// Filtro "solo campos pendientes" del formulario de Casos UDP,
// equivalente al de Casos Movistar.
function udpAplicarFiltroVacios(){
  const activo = document.getElementById('udpSoloVacios')?.checked;
  const form = document.getElementById('udpForm');
  if(!form) return;

  let pendientes = 0;
  form.querySelectorAll('.form-field').forEach(campo => {
    const lleno = casoCampoTieneValor(campo);
    if(!lleno) pendientes++;
    campo.style.display = (activo && lleno) ? 'none' : '';
  });
  form.querySelectorAll('.caso-form-section').forEach(seccion => {
    const visibles = Array.from(seccion.querySelectorAll('.form-field'))
      .filter(c => c.style.display !== 'none').length;
    seccion.style.display = (activo && visibles === 0) ? 'none' : '';
  });

  const cont = document.getElementById('udpSoloVaciosContador');
  if(cont){
    cont.textContent = pendientes === 0 ? 'No hay campos pendientes' : `${pendientes} campo(s) pendiente(s)`;
  }
}
document.getElementById('udpSoloVacios')?.addEventListener('change', udpAplicarFiltroVacios);

// ============================================================
// DASHBOARD DE UDP
// La tabla casos_udp no guarda año ni semana: ambos se deducen del
// escalonamiento, que es la fecha en que se atendió la escuela.
// ============================================================
let udpDashInicializado = false;

function udpAno(c){
  return c.escalonamiento ? new Date(c.escalonamiento).getFullYear() : null;
}
function udpSemana(c){
  return c.escalonamiento ? getSemanaISO(new Date(c.escalonamiento)) : null;
}

function initUdpDashboard(){
  if(!udpDashInicializado){
    const base = allUdp.filter(c => c.status === 'Finalizado');
    const anos = [...new Set(base.map(udpAno).filter(Boolean))].sort((a,b) => b-a);
    document.getElementById('udpDashAno').innerHTML =
      '<option value="">Todos</option>' + anos.map(a => `<option>${a}</option>`).join('');

    document.getElementById('udpDashMes').innerHTML =
      '<option value="">Todos</option>' + MESES_ES.map(m => `<option>${m}</option>`).join('');

    const semanas = [...new Set(base.map(udpSemana).filter(Boolean))].sort((a,b) => a-b);
    document.getElementById('udpDashSemana').innerHTML =
      '<option value="">Todas</option>' + semanas.map(w => `<option>${w}</option>`).join('');

    const tecnicos = [...new Set(base.map(c => c.nombre_del_tecnico).filter(Boolean))].sort();
    document.getElementById('udpDashTecnico').innerHTML =
      '<option value="">Todos</option>' + tecnicos.map(t => `<option>${escapeHtml(t)}</option>`).join('');

    ['udpDashAno','udpDashMes','udpDashSemana','udpDashTecnico'].forEach(id => {
      document.getElementById(id).addEventListener('change', renderUdpDashboard);
    });
    udpDashInicializado = true;
  }
  renderUdpDashboard();
}

function udpDashFiltrados(){
  // El Dashboard mide trabajo terminado: los casos abiertos no cuentan.
  const ano = document.getElementById('udpDashAno').value;
  const mes = document.getElementById('udpDashMes').value;
  const semana = document.getElementById('udpDashSemana').value;
  const tecnico = document.getElementById('udpDashTecnico').value;

  return allUdp.filter(c => {
    if(c.status !== 'Finalizado') return false;
    if(ano && String(udpAno(c)) !== ano) return false;
    if(mes && c.mes !== mes) return false;
    if(semana && String(udpSemana(c)) !== semana) return false;
    if(tecnico && c.nombre_del_tecnico !== tecnico) return false;
    return true;
  });
}

function renderUdpDashboard(){
  const datos = udpDashFiltrados();
  const LIMITE = slaLimite('udp');

  // --- KPIs ---
  const conSla = datos.map(c => hhmmToMinutes(c.sla)).filter(m => m !== null && !isNaN(m));
  const promedio = conSla.length ? conSla.reduce((a,b) => a+b, 0) / conSla.length : null;
  const dentro = conSla.filter(m => m <= LIMITE).length;
  const fuera = conSla.length - dentro;
  const pct = (n) => conSla.length ? Math.round(n / conSla.length * 100) : 0;

  document.getElementById('udpDashTotal').textContent = datos.length;
  document.getElementById('udpDashSlaProm').textContent = promedio !== null ? minutesToHHMM(promedio) : '—';
  document.getElementById('udpDashDentro').textContent = conSla.length ? `${dentro} (${pct(dentro)}%)` : '—';
  document.getElementById('udpDashFuera').textContent = conSla.length ? `${fuera} (${pct(fuera)}%)` : '—';

  // --- Por mes ---
  const porMes = MESES_ES.map(m => ({
    etiqueta: m,
    total: datos.filter(c => c.mes === m).length
  })).filter(x => x.total > 0);
  udpDashLinea('udpDashChartMes', porMes, 'Sin datos en este filtro');

  // --- Por semana ---
  const semanas = {};
  datos.forEach(c => {
    const w = udpSemana(c);
    if(w) semanas[w] = (semanas[w] || 0) + 1;
  });
  const porSemana = Object.entries(semanas)
    .map(([w, total]) => ({ etiqueta: `S${w}`, total }))
    .sort((a,b) => Number(a.etiqueta.slice(1)) - Number(b.etiqueta.slice(1)));
  udpDashLinea('udpDashPorSemana', porSemana, 'Sin datos en este filtro');

  // --- Por técnico, con su SLA promedio ---
  const porTec = {};
  datos.forEach(c => {
    const t = c.nombre_del_tecnico || 'Sin asignar';
    if(!porTec[t]) porTec[t] = { total: 0, minutos: [] };
    porTec[t].total++;
    const m = hhmmToMinutes(c.sla);
    if(m !== null && !isNaN(m)) porTec[t].minutos.push(m);
  });

  const filasTec = Object.entries(porTec)
    .map(([nombre, v]) => ({
      nombre,
      total: v.total,
      sla: v.minutos.length ? v.minutos.reduce((a,b) => a+b, 0) / v.minutos.length : null
    }))
    .sort((a,b) => b.total - a.total);

  const wrapTec = document.getElementById('udpDashPorTecnico');
  wrapTec.innerHTML = filasTec.length === 0
    ? '<div class="material-empty">Sin datos en este filtro</div>'
    : `<table>
        <thead>
          <tr>
            <th>Técnico / Team Líder</th>
            <th style="width:120px;">UDP atendidas</th>
            <th style="width:140px;">SLA promedio</th>
          </tr>
        </thead>
        <tbody>
          ${filasTec.map(f => `
            <tr>
              <td>${escapeHtml(f.nombre)}</td>
              <td class="mono" style="font-weight:700;">${f.total}</td>
              <td>${f.sla === null ? '<span style="color:var(--text-faint);">—</span>'
                    : `<span class="mono" style="font-weight:700; color:${f.sla > LIMITE ? '#DC2626' : '#16A34A'};">${minutesToHHMM(f.sla)}</span>`}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
}

// Gráfico de líneas en SVG, con área bajo la curva y el valor sobre cada punto.
// Se usa SVG y no canvas para que escale solo al ancho del panel.
function udpDashLinea(contenedorId, filas, vacioTxt){
  const wrap = document.getElementById(contenedorId);
  if(!wrap) return;
  if(!filas.length){
    wrap.innerHTML = `<div class="material-empty" style="padding:60px 0;text-align:center;">${escapeHtml(vacioTxt)}</div>`;
    return;
  }

  const W = 620, H = 240;
  const mIzq = 38, mDer = 16, mSup = 24, mInf = 34;
  const anchoUtil = W - mIzq - mDer;
  const altoUtil = H - mSup - mInf;

  const max = Math.max(...filas.map(f => f.total));
  const tope = Math.max(1, max);
  const n = filas.length;
  const x = i => n === 1 ? mIzq + anchoUtil / 2 : mIzq + (i / (n - 1)) * anchoUtil;
  const y = v => mSup + altoUtil - (v / tope) * altoUtil;

  const puntos = filas.map((f, i) => `${x(i)},${y(f.total)}`).join(' ');
  const area = `${mIzq},${mSup + altoUtil} ${puntos} ${x(n - 1)},${mSup + altoUtil}`;

  // Cuatro líneas guía horizontales
  const guias = [0, 0.25, 0.5, 0.75, 1].map(p => {
    const val = Math.round(tope * p);
    const yy = y(val);
    return `<line x1="${mIzq}" y1="${yy}" x2="${W - mDer}" y2="${yy}" stroke="var(--border)" stroke-width="1"/>
            <text x="${mIzq - 8}" y="${yy + 4}" text-anchor="end" font-size="10" fill="var(--text-dim)">${val}</text>`;
  }).join('');

  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto; display:block;">
      <defs>
        <linearGradient id="grad-${contenedorId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#1D6FA5" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#1D6FA5" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${guias}
      <polygon points="${area}" fill="url(#grad-${contenedorId})"/>
      <polyline points="${puntos}" fill="none" stroke="#1D6FA5" stroke-width="2.5"
                stroke-linejoin="round" stroke-linecap="round"/>
      ${filas.map((f, i) => `
        <circle cx="${x(i)}" cy="${y(f.total)}" r="4" fill="#fff" stroke="#1D6FA5" stroke-width="2.5"/>
        <text x="${x(i)}" y="${y(f.total) - 11}" text-anchor="middle" font-size="11" font-weight="700"
              fill="var(--text)">${f.total}</text>
        <text x="${x(i)}" y="${H - 12}" text-anchor="middle" font-size="10.5"
              fill="var(--text-dim)">${escapeHtml(f.etiqueta)}</text>`).join('')}
    </svg>`;
}

// ============================================================
// OPERADOR DE TURNO (Inicio)
// Se define una vez por jornada y las plantillas lo toman solo:
// comparten la misma clave de localStorage que ya usaba el detalle.
// ============================================================
const OPERADOR_TURNO_KEY = 'opk_operador_turno_tekcom';

function operadorTurnoActual(){
  try{ return localStorage.getItem(OPERADOR_TURNO_KEY) || ''; }catch(e){ return ''; }
}

function renderInicioOperadorTurno(){
  const sel = document.getElementById('inicioOperadorTurno');
  if(!sel) return;
  const actual = operadorTurnoActual();
  sel.innerHTML = opOpcionesHtml('tekcom', actual);
}

document.getElementById('inicioOperadorTurno')?.addEventListener('change', (e) => {
  try{ localStorage.setItem(OPERADOR_TURNO_KEY, e.target.value); }catch(err){}
  renderInicioOperadorTurno();
  // El selector del detalle de plantilla queda alineado de inmediato.
  const selPl = document.getElementById('plOperadorTurno');
  if(selPl) selPl.innerHTML = opOpcionesHtml('tekcom', e.target.value);
  showToast(e.target.value ? `Operador de turno: ${e.target.value}` : 'Operador de turno sin definir');
});
