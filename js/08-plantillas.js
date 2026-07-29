// ============================================================
// 08-plantillas.js  —  Plantillas, Estatus y SLA
// Parte de la aplicación NOC Tekcom. Se carga en orden desde index.html;
// NO reordenar las etiquetas <script> ni renombrar estos archivos.
// ============================================================

const PLANTILLA_REST_URL = `${SUPABASE_URL}/rest/v1/plantillas_avance`;

// ============================================================
// CATÁLOGO DE OPERADORES (Tekcom / Movistar): se guarda en la
// base de datos para elegir de una lista en vez de escribir el
// nombre a mano cada vez.
// ============================================================
const OPERADORES_REST_URL = `${SUPABASE_URL}/rest/v1/operadores_noc`;
let opCache = [];

// Etiquetas cortas de proyecto, usadas para Operadores/Correos y textos dinámicos
const PL_PROYECTO_CORTO = { casos:'Movistar', hyve:'Hyve', cable:'Cable Color', udp:'UDP' };
// Color de marca para identificar de un vistazo a qué empresa pertenece cada alarma/ticket.
const PL_PROYECTO_COLOR = { casos:'#0284C7', hyve:'#059669', cable:'#7C3AED', udp:'#DC2626' };
function plEtiquetaEmpresaHtml(modulo){
  const nombre = PL_PROYECTO_CORTO[modulo] || 'Movistar';
  const color = PL_PROYECTO_COLOR[modulo] || PL_PROYECTO_COLOR.casos;
  return `<span style="display:inline-block; padding:2px 8px; border-radius:20px; font-size:10px; font-weight:700; letter-spacing:.02em; color:#fff; background:${color}; white-space:nowrap;">${escapeHtml(nombre)}</span>`;
}
function plTipoOperadorDeProyecto(proyecto){
  return proyecto === 'casos' ? 'movistar' : proyecto; // se conserva 'movistar' para no perder datos ya guardados
}
function plEtiquetaOperadorCliente(modulo){
  return `Operador ${PL_PROYECTO_CORTO[modulo] || 'Movistar'}`;
}
function plProyectoActivoEnLista(){
  const tab = document.querySelector('.pl-tab-proyecto.active');
  return (tab && tab.dataset.plTabProyecto !== 'estatus') ? tab.dataset.plTabProyecto : 'casos';
}

async function opFetchOperadores(){
  try{
    const res = await fetch(`${OPERADORES_REST_URL}?select=*&order=nombre.asc`, { headers: sbHeaders });
    if(!res.ok) throw new Error('Error al cargar operadores');
    opCache = await res.json();
  }catch(err){
    console.error(err);
  }
  opActualizarTodosLosSelects();
}

function opOpcionesHtml(tipo, seleccionado){
  const lista = opCache.filter(o => o.tipo === tipo);
  let html = '<option value="">— Selecciona —</option>';
  html += lista.map(o => `<option value="${escapeHtml(o.nombre)}" ${o.nombre===seleccionado?'selected':''}>${escapeHtml(o.nombre)}</option>`).join('');
  // Si el valor actual no está en el catálogo (dato antiguo), se agrega igual para no perderlo
  if(seleccionado && !lista.some(o => o.nombre === seleccionado)){
    html += `<option value="${escapeHtml(seleccionado)}" selected>${escapeHtml(seleccionado)} (no está en el catálogo)</option>`;
  }
  return html;
}

function opActualizarSelect(id, tipo){
  const el = document.getElementById(id);
  if(!el) return;
  const actual = el.value;
  el.innerHTML = opOpcionesHtml(tipo, actual);
}

function opActualizarTodosLosSelects(){
  const moduloPlantilla = document.getElementById('pl_modulo').value || 'casos';
  opActualizarSelect('pl_operador_telco', plTipoOperadorDeProyecto(moduloPlantilla));
  opActualizarSelect('pl_operador_tekcom', 'tekcom');
  opActualizarSelect('cb_operador_tekcom', 'tekcom');
  opActualizarSelect('cb_operador_telco', 'cable');
  if(typeof renderInicioOperadorTurno === 'function') renderInicioOperadorTurno();
  // Casos Hyve: los dos operadores también se eligen del catálogo.
  opActualizarSelect('h_operador_tekcom', 'tekcom');
  opActualizarSelect('h_operador_hyve', 'hyve');
  opActualizarSelect('plOperadorTurno', 'tekcom');
  // Los selects dentro de cada fila de avance (creación) también se refrescan
  document.querySelectorAll('[data-av-campo="operador_tekcom"]').forEach(el => {
    el.innerHTML = opOpcionesHtml('tekcom', el.value);
  });
}

function plCargarOperadorTurno(){
  const sel = document.getElementById('plOperadorTurno');
  if(!sel) return;
  let guardado = '';
  try{ guardado = localStorage.getItem('opk_operador_turno_tekcom') || ''; }catch(e){}
  sel.innerHTML = opOpcionesHtml('tekcom', guardado);
}
(function(){
  const sel = document.getElementById('plOperadorTurno');
  if(sel){
    sel.addEventListener('change', () => {
      try{ localStorage.setItem('opk_operador_turno_tekcom', sel.value); }catch(e){}
    });
  }
})();

function opRenderListas(){
  const proyecto = plProyectoActivoEnLista();
  const tipoProyecto = plTipoOperadorDeProyecto(proyecto);
  const etiquetaProyecto = PL_PROYECTO_CORTO[proyecto] || proyecto;

  const tekcom = opCache.filter(o => o.tipo === 'tekcom');
  const delProyecto = opCache.filter(o => o.tipo === tipoProyecto);

  const renderLista = (lista) => {
    if(lista.length === 0) return `<div class="empty-state" style="padding:10px;"><div class="empty-title">Sin operadores</div></div>`;
    return lista.map(o => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:7px 10px; border:1px solid var(--border); border-radius:8px; margin-bottom:6px; font-size:13px;">
        <span>${escapeHtml(o.nombre)}</span>
        <button type="button" class="icon-btn danger" data-op-eliminar="${o.id}" title="Eliminar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>
        </button>
      </div>
    `).join('');
  };

  document.getElementById('opModalProyectoTitulo').textContent = `— ${etiquetaProyecto}`;
  document.getElementById('opListaProyectoTitulo').textContent = etiquetaProyecto;
  const opcionProyecto = document.getElementById('opNuevoTipoOpcionProyecto');
  opcionProyecto.textContent = etiquetaProyecto;
  opcionProyecto.value = tipoProyecto;

  document.getElementById('opListaTekcom').innerHTML = renderLista(tekcom);
  document.getElementById('opListaMovistar').innerHTML = renderLista(delProyecto);

  document.querySelectorAll('[data-op-eliminar]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if(!confirm('¿Eliminar este operador del catálogo?')) return;
      try{
        await fetch(`${OPERADORES_REST_URL}?id=eq.${btn.dataset.opEliminar}`, { method:'DELETE', headers: sbHeaders });
        await opFetchOperadores();
        opRenderListas();
        showToast('Operador eliminado');
      }catch(err){
        showToast('No se pudo eliminar: ' + err.message, 'error');
      }
    });
  });
}

document.getElementById('btnGestionarOperadores').addEventListener('click', async () => {
  document.getElementById('operadoresModalOverlay').classList.add('active');
  await opFetchOperadores();
  opRenderListas();
});
document.getElementById('operadoresModalClose').addEventListener('click', () => {
  document.getElementById('operadoresModalOverlay').classList.remove('active');
});
document.getElementById('operadoresModalCerrar').addEventListener('click', () => {
  document.getElementById('operadoresModalOverlay').classList.remove('active');
});
document.getElementById('opAgregarBtn').addEventListener('click', async () => {
  const nombre = document.getElementById('opNuevoNombre').value.trim();
  const tipo = document.getElementById('opNuevoTipo').value;
  if(!nombre){
    showToast('Escribe el nombre del operador', 'error');
    return;
  }
  try{
    const res = await fetch(OPERADORES_REST_URL, {
      method:'POST',
      headers:{ ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify({ nombre, tipo })
    });
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al agregar'); }
    document.getElementById('opNuevoNombre').value = '';
    await opFetchOperadores();
    opRenderListas();
    showToast('Operador agregado');
  }catch(err){
    showToast('No se pudo agregar: ' + err.message, 'error');
  }
});

// Cargar el catálogo una vez al iniciar, para que ya esté listo en los selects
opFetchOperadores();

// ============================================================
// CATÁLOGO DE CORREOS DESTINATARIOS: se usan automáticamente al
// compartir el PDF de una bitácora por correo.
// ============================================================
const CORREOS_REST_URL = `${SUPABASE_URL}/rest/v1/correos_notificacion`;
let coCache = [];

async function coFetchCorreos(){
  try{
    const res = await fetch(`${CORREOS_REST_URL}?select=*&order=nombre.asc`, { headers: sbHeaders });
    if(!res.ok) throw new Error('Error al cargar correos');
    coCache = await res.json();
  }catch(err){
    console.error(err);
  }
}
coFetchCorreos();

function coRenderLista(){
  const wrap = document.getElementById('coLista');
  const proyecto = plProyectoActivoEnLista();
  const etiquetaProyecto = PL_PROYECTO_CORTO[proyecto] || proyecto;
  document.getElementById('coModalProyectoTitulo').textContent = `— ${etiquetaProyecto}`;

  const delProyecto = coCache.filter(c => (c.proyecto || 'casos') === proyecto);

  if(delProyecto.length === 0){
    wrap.innerHTML = `<div class="empty-state" style="padding:10px;"><div class="empty-title">Sin correos guardados para ${escapeHtml(etiquetaProyecto)}</div></div>`;
    return;
  }
  wrap.innerHTML = delProyecto.map(c => `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:7px 10px; border:1px solid var(--border); border-radius:8px; margin-bottom:6px; font-size:13px;">
      <span>${c.nombre ? escapeHtml(c.nombre) + ' — ' : ''}${escapeHtml(c.correo)}</span>
      <button type="button" class="icon-btn danger" data-co-eliminar="${c.id}" title="Eliminar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>
      </button>
    </div>
  `).join('');
  wrap.querySelectorAll('[data-co-eliminar]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if(!confirm('¿Eliminar este correo del catálogo?')) return;
      try{
        await fetch(`${CORREOS_REST_URL}?id=eq.${btn.dataset.coEliminar}`, { method:'DELETE', headers: sbHeaders });
        await coFetchCorreos();
        coRenderLista();
        showToast('Correo eliminado');
      }catch(err){
        showToast('No se pudo eliminar: ' + err.message, 'error');
      }
    });
  });
}

document.getElementById('btnGestionarCorreos').addEventListener('click', async () => {
  document.getElementById('correosModalOverlay').classList.add('active');
  await coFetchCorreos();
  coRenderLista();
});
document.getElementById('correosModalClose').addEventListener('click', () => {
  document.getElementById('correosModalOverlay').classList.remove('active');
});
document.getElementById('correosModalCerrar').addEventListener('click', () => {
  document.getElementById('correosModalOverlay').classList.remove('active');
});
document.getElementById('coAgregarBtn').addEventListener('click', async () => {
  const nombre = document.getElementById('coNuevoNombre').value.trim();
  const correo = document.getElementById('coNuevoCorreo').value.trim();
  if(!correo || !correo.includes('@')){
    showToast('Escribe un correo válido', 'error');
    return;
  }
  try{
    const res = await fetch(CORREOS_REST_URL, {
      method:'POST',
      headers:{ ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify({ nombre: nombre || null, correo, proyecto: plProyectoActivoEnLista() })
    });
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al agregar'); }
    document.getElementById('coNuevoNombre').value = '';
    document.getElementById('coNuevoCorreo').value = '';
    await coFetchCorreos();
    coRenderLista();
    showToast('Correo agregado');
  }catch(err){
    showToast('No se pudo agregar: ' + err.message, 'error');
  }
});

let plAvances = [];
let plAvanceContador = 0;

function plFechaLocalISO(fecha){
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function plObtenerOperadorTurno(){
  try{ return localStorage.getItem('opk_operador_turno_tekcom') || ''; }catch(e){ return ''; }
}

function plNuevaFilaAvance(datos){
  plAvanceContador++;
  return {
    _key: plAvanceContador,
    fecha: datos?.fecha || '',
    hora: datos?.hora || '',
    descripcion: datos?.descripcion || '',
    operador_tekcom: datos?.operador_tekcom || plObtenerOperadorTurno(),
    materiales: datos?.materiales || null,
    estado: datos?.estado || 'normal'
  };
}

function plOpcionesEstado(seleccionado){
  const opciones = [
    ['normal', 'Normal'],
    ['pausado', 'Pausado'],
    ['programado', 'Programado'],
    ['despausado', 'Retomado'],
    ['escalado', 'Escalado'],
    ['finalizado', 'Finalizado']
  ];
  return opciones.map(([val, label]) => `<option value="${val}" ${seleccionado===val?'selected':''}>${label}</option>`).join('');
}

function plRenderAvances(){
  const cont = document.getElementById('plAvancesLista');
  if(plAvances.length === 0){
    cont.innerHTML = `<div class="empty-state" style="padding:16px;"><div class="empty-title">Sin avances agregados todavía</div></div>`;
    return;
  }
  // Se muestran del más reciente al primero (igual que la plantilla original)
  const ordenDescendente = [...plAvances].slice().reverse();
  cont.innerHTML = ordenDescendente.map((av, i) => {
    const numero = plAvances.length - i;
    return `
      <div style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid var(--border);">
        <div class="form-grid" style="grid-template-columns:60px 130px 110px 1fr 34px; align-items:end; gap:8px; margin-bottom:8px;">
          <div class="form-field"><label>No.</label><input type="text" value="${numero}" disabled></div>
          <div class="form-field"><label>Fecha</label><input type="date" data-av-key="${av._key}" data-av-campo="fecha" value="${escapeHtml(av.fecha)}"></div>
          <div class="form-field"><label>Hora</label><input type="time" data-av-key="${av._key}" data-av-campo="hora" value="${escapeHtml(av.hora)}"></div>
          <div class="form-field">
            <label>Estado</label>
            <select data-av-key="${av._key}" data-av-campo="estado">${plOpcionesEstado(av.estado)}</select>
          </div>
          <button type="button" class="icon-btn danger" data-av-quitar="${av._key}" title="Quitar" style="height:38px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>
          </button>
        </div>
        <div class="form-grid" style="grid-template-columns:1fr 200px; gap:8px;">
          <div class="form-field"><label>Descripción</label><input type="text" data-av-key="${av._key}" data-av-campo="descripcion" value="${escapeHtml(av.descripcion)}" placeholder="Descripción del avance"></div>
          <div class="form-field"><label>Operador Tekcom</label><select data-av-key="${av._key}" data-av-campo="operador_tekcom">${opOpcionesHtml('tekcom', av.operador_tekcom)}</select></div>
        </div>
      </div>
    `;
  }).join('');

  cont.querySelectorAll('[data-av-key]').forEach(el => {
    const guardar = () => {
      const key = Number(el.dataset.avKey);
      const campo = el.dataset.avCampo;
      const fila = plAvances.find(a => a._key === key);
      if(fila) fila[campo] = el.value;
    };
    el.addEventListener('input', guardar);
    el.addEventListener('change', guardar);
  });
  cont.querySelectorAll('[data-av-quitar]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = Number(btn.dataset.avQuitar);
      plAvances = plAvances.filter(a => a._key !== key);
      plRenderAvances();
    });
  });
}

/* ---- Buscador de Team Líder (del Listado del Personal) dentro de la plantilla ---- */
const plTeamLiderSearch = document.getElementById('pl_teamlider_search');
const plTeamLiderResults = document.getElementById('pl_teamlider_results');

function setPlTeamLider(persona){
  document.getElementById('pl_teamlider_id').value = persona ? persona.id : '';
  if(persona){
    document.getElementById('pl_teamlider_avatar').textContent = initials(persona.nombre);
    document.getElementById('pl_teamlider_avatar').style.background = colorFor(persona.cuadrilla || persona.nombre || '');
    document.getElementById('pl_teamlider_name').textContent = persona.nombre;
    document.getElementById('pl_teamlider_meta').textContent = (persona.cuadrilla || '—') + ' · ' + (persona.puesto || '—');
    document.getElementById('pl_teamlider_selected').style.display = 'block';
  } else {
    document.getElementById('pl_teamlider_selected').style.display = 'none';
  }
}
plTeamLiderSearch.addEventListener('input', () => {
  const term = plTeamLiderSearch.value.trim().toLowerCase();
  if(!term){ plTeamLiderResults.classList.remove('show'); plTeamLiderResults.innerHTML=''; return; }
  const matches = allPeople.filter(p => (p.nombre||'').toLowerCase().includes(term)).slice(0, 20);
  if(matches.length === 0){
    plTeamLiderResults.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    plTeamLiderResults.innerHTML = matches.map(p => `
      <div class="site-result-item" data-plteamlider-id="${escapeHtml(p.id)}">
        <div class="site-result-name">${escapeHtml(p.nombre)}</div>
        <div class="site-result-meta">${escapeHtml(p.cuadrilla || '—')} · ${escapeHtml(p.puesto || '—')}</div>
      </div>
    `).join('');
  }
  plTeamLiderResults.classList.add('show');
});
plTeamLiderResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-plteamlider-id]');
  if(!item) return;
  const persona = allPeople.find(p => String(p.id) === String(item.dataset.plteamliderId));
  if(persona){ setPlTeamLider(persona); }
  plTeamLiderSearch.value = '';
  plTeamLiderResults.classList.remove('show');
  plTeamLiderResults.innerHTML = '';
});
document.addEventListener('click', (e) => {
  if(!e.target.closest('#pl_teamlider_search') && !e.target.closest('#pl_teamlider_results')){
    plTeamLiderResults.classList.remove('show');
  }
});
document.getElementById('pl_teamlider_clear').addEventListener('click', () => setPlTeamLider(null));

function setPlSubCategoria(valor){
  document.getElementById('pl_sub_categoria').value = valor || '';
  if(valor){
    document.getElementById('pl_sub_categoria_nombre').textContent = valor;
    document.getElementById('pl_sub_categoria_selected').style.display = 'block';
  } else {
    document.getElementById('pl_sub_categoria_selected').style.display = 'none';
  }
}
const plSubCategoriaSearchEl = document.getElementById('pl_sub_categoria_search');
const plSubCategoriaResultsEl = document.getElementById('pl_sub_categoria_results');
plSubCategoriaSearchEl.addEventListener('input', () => {
  const term = plSubCategoriaSearchEl.value.trim().toLowerCase();
  if(!term){ plSubCategoriaResultsEl.classList.remove('show'); plSubCategoriaResultsEl.innerHTML=''; return; }
  const matches = SUB_CATEGORIA_OPCIONES.filter(s => s.toLowerCase().includes(term)).slice(0, 20);
  if(matches.length === 0){
    plSubCategoriaResultsEl.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    plSubCategoriaResultsEl.innerHTML = matches.map(s => `
      <div class="site-result-item" data-plsubcategoria="${escapeHtml(s)}">
        <div class="site-result-name">${escapeHtml(s)}</div>
      </div>
    `).join('');
  }
  plSubCategoriaResultsEl.classList.add('show');
});
plSubCategoriaResultsEl.addEventListener('click', (e) => {
  const item = e.target.closest('[data-plsubcategoria]');
  if(!item) return;
  setPlSubCategoria(item.dataset.plsubcategoria);
  plSubCategoriaSearchEl.value = '';
  plSubCategoriaResultsEl.classList.remove('show');
  plSubCategoriaResultsEl.innerHTML = '';
});
document.addEventListener('click', (e) => {
  if(!e.target.closest('#pl_sub_categoria_search') && !e.target.closest('#pl_sub_categoria_results')){
    plSubCategoriaResultsEl.classList.remove('show');
  }
});
document.getElementById('pl_sub_categoria_clear').addEventListener('click', () => setPlSubCategoria(null));


function plLimpiarFormulario(modulo){
  document.getElementById('pl_modulo').value = modulo;
  const nombres = { casos:'Casos Movistar', hyve:'Casos Hyve', cable:'Casos Cable Color', udp:'Casos UDP' };
  document.getElementById('plantillaDestinoLabel').textContent = 'Se creará el caso en: ' + (nombres[modulo] || modulo);
  // La etiqueta del operador del cliente cambia por proyecto: Movistar / Hyve / Cable Color.
  const lblOperador = document.getElementById('plOperadorTelcoLabel');
  if(lblOperador) lblOperador.textContent = plEtiquetaOperadorCliente(modulo);
  ['pl_cliente_sitio','pl_no_ticket','pl_enlace_de','pl_enlace_hacia','pl_ticket_hora','pl_operador_telco','pl_operador_tekcom'].forEach(id => {
    document.getElementById(id).value = '';
  });
  setPlTeamLider(null);
  document.getElementById('pl_tipo_afectacion').value = 'Interurbano';
  document.getElementById('pl_ticket_fecha').value = plFechaLocalISO(new Date());
  plAvances = [plNuevaFilaAvance()];
  plRenderAvances();
}

function plActualizarVisibilidadSegunPermisos(){
  if(typeof opkPuedeEditarSeccion !== 'function' || !opkSesionActual) return;
  const puedeCasos = opkPuedeEditarSeccion('casos', 'listado');
  const puedeHyve = opkPuedeEditarSeccion('hyve', 'listado');
  const puedeCable = opkPuedeEditarSeccion('cable', 'listado');

  const btnInicio = document.getElementById('btnPlantillasInicio');
  if(btnInicio) btnInicio.style.display = (puedeCasos || puedeHyve || puedeCable) ? '' : 'none';

  const permisosPorProyecto = { casos:puedeCasos, hyve:puedeHyve, cable:puedeCable };
  document.querySelectorAll('.pl-tab-proyecto').forEach(tab => {
    const puede = permisosPorProyecto[tab.dataset.plTabProyecto];
    tab.style.display = puede ? '' : 'none';
  });

  // Si la pestaña activa quedó sin permiso, se mueve a la primera visible
  const activa = document.querySelector('.pl-tab-proyecto.active');
  if(activa && activa.style.display === 'none'){
    const primeraVisible = document.querySelector('.pl-tab-proyecto:not([style*="display: none"])');
    if(primeraVisible) primeraVisible.click();
  }

  plActualizarBotonNuevaPlantilla();
}

function plActualizarBotonNuevaPlantilla(){
  if(typeof opkPuedeEditarSeccion !== 'function' || !opkSesionActual) return;
  const btnNueva = document.getElementById('btnNuevaPlantillaLista');
  if(!btnNueva) return;
  const tabActiva = document.querySelector('.pl-tab-proyecto.active');
  const modulo = tabActiva ? tabActiva.dataset.plTabProyecto : 'casos';
  const puedeEditar = opkPuedeEditarSeccion(modulo, 'listado');
  btnNueva.style.display = puedeEditar ? '' : 'none';
}

let plEditandoEncabezadoId = null;

function plAbrirModal(modulo){
  plEditandoEncabezadoId = null;
  document.getElementById('plModalTitulo').textContent = 'Plantilla de Avance';
  document.getElementById('plAvancesSeccion').style.display = '';
  document.getElementById('plGuardarBtn').textContent = 'Guardar y crear caso';
  plLimpiarFormulario(modulo);
  document.getElementById('plantillaModalOverlay').classList.add('active');
}

function plAbrirEditarEncabezado(id){
  const p = plListaCache.find(x => x.id === id);
  if(!p) return;
  plEditandoEncabezadoId = id;

  document.getElementById('pl_modulo').value = p.modulo;
  // Las etiquetas dependientes del proyecto deben reflejar el módulo del caso que se edita,
  // no el de la última plantilla que se creó.
  const nombresProyecto = { casos:'Casos Movistar', hyve:'Casos Hyve', cable:'Casos Cable Color', udp:'Casos UDP' };
  document.getElementById('plantillaDestinoLabel').textContent = 'Caso de: ' + (nombresProyecto[p.modulo] || p.modulo);
  const lblOperadorEdit = document.getElementById('plOperadorTelcoLabel');
  if(lblOperadorEdit) lblOperadorEdit.textContent = plEtiquetaOperadorCliente(p.modulo);
  // El listado de operadores también es por proyecto.
  opActualizarSelect('pl_operador_telco', plTipoOperadorDeProyecto(p.modulo));
  document.getElementById('pl_cliente_sitio').value = p.cliente_sitio || '';
  document.getElementById('pl_no_ticket').value = p.no_ticket || '';
  document.getElementById('pl_enlace_de').value = p.enlace_de || '';
  document.getElementById('pl_enlace_hacia').value = p.enlace_hacia || '';
  document.getElementById('pl_ticket_fecha').value = p.ticket_fecha || '';
  document.getElementById('pl_ticket_hora').value = p.ticket_hora || '';
  document.getElementById('pl_tipo_afectacion').value = p.tipo_afectacion || 'Interurbano';
  document.getElementById('pl_operador_telco').value = p.operador_telco || '';
  document.getElementById('pl_operador_tekcom').value = p.operador_tekcom || '';
  document.getElementById('pl_causa').value = p.causa || '';
  document.getElementById('pl_coordenadas').value = p.coordenadas || '';
  setPlSubCategoria(p.sub_categoria || '');

  const personaTeamLider = p.team_lider ? allPeople.find(per => per.nombre === p.team_lider) : null;
  if(personaTeamLider){
    setPlTeamLider(personaTeamLider);
  } else {
    setPlTeamLider(null);
    if(p.team_lider) document.getElementById('pl_teamlider_name').textContent = p.team_lider;
  }

  document.getElementById('plModalTitulo').textContent = 'Editar Encabezado';
  document.getElementById('plAvancesSeccion').style.display = 'none';
  document.getElementById('plGuardarBtn').textContent = 'Guardar cambios';
  document.getElementById('plantillaModalOverlay').classList.add('active');
}
const plBtnEditarEncabezado = document.getElementById('plEditarEncabezadoBtn');
if(plBtnEditarEncabezado){
  plBtnEditarEncabezado.addEventListener('click', () => {
    const id = Number(document.getElementById('plDetalleId').value);
    plAbrirEditarEncabezado(id);
  });
}

function plCerrarModal(){
  document.getElementById('plantillaModalOverlay').classList.remove('active');
  plEditandoEncabezadoId = null;
}

document.querySelectorAll('[data-modulo-plantilla]').forEach(btn => {
  btn.addEventListener('click', () => plAbrirModal(btn.dataset.moduloPlantilla));
});
document.getElementById('plantillaModalClose').addEventListener('click', plCerrarModal);
document.getElementById('plantillaModalCancel').addEventListener('click', plCerrarModal);
document.getElementById('plBtnAgregarAvance').addEventListener('click', () => {
  plAvances.push(plNuevaFilaAvance());
  plRenderAvances();
});

function plHHMMaISO(fecha, hora){
  if(!fecha) return null;
  const h = plHHMM(hora);
  return new Date(`${fecha}T${h}:00`).toISOString();
}

async function plGuardarEdicionEncabezado(){
  const id = plEditandoEncabezadoId;
  const noTicket = document.getElementById('pl_no_ticket').value.trim();
  if(!noTicket){
    showToast('Escribe el No. de Ticket', 'error');
    return;
  }

  // Las coordenadas terminan en columnas numéricas del caso. Se validan aquí para que
  // el error salga al capturar y no al finalizar la plantilla.
  const coordPl = parseCoordenadasNum(document.getElementById('pl_coordenadas').value);
  if(!coordPl.valido){
    plMostrarErrorCentro('Las coordenadas no tienen un formato válido. Usa "latitud, longitud", por ejemplo: 13.6894, -89.1872');
    return;
  }

  const payload = {
    cliente_sitio: document.getElementById('pl_cliente_sitio').value.trim() || null,
    no_ticket: noTicket,
    enlace_de: document.getElementById('pl_enlace_de').value.trim() || null,
    enlace_hacia: document.getElementById('pl_enlace_hacia').value.trim() || null,
    ticket_fecha: document.getElementById('pl_ticket_fecha').value || null,
    ticket_hora: document.getElementById('pl_ticket_hora').value || null,
    tipo_afectacion: document.getElementById('pl_tipo_afectacion').value || null,
    operador_telco: document.getElementById('pl_operador_telco').value.trim() || null,
    operador_tekcom: document.getElementById('pl_operador_tekcom').value.trim() || null,
    causa: document.getElementById('pl_causa').value || null,
    sub_categoria: document.getElementById('pl_sub_categoria').value || null,
    coordenadas: document.getElementById('pl_coordenadas').value.trim() || null,
    team_lider: document.getElementById('pl_teamlider_name').textContent !== '—' ? document.getElementById('pl_teamlider_name').textContent : null
  };

  const btn = document.getElementById('plGuardarBtn');
  btn.disabled = true;
  const textoOriginal = btn.textContent;
  btn.textContent = 'Guardando...';
  try{
    const res = await fetch(`${PLANTILLA_REST_URL}?id=eq.${id}`, {
      method:'PATCH',
      headers:{ ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify(payload)
    });
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al actualizar el encabezado'); }
    const actualizado = (await res.json())[0];
    const idx = plListaCache.findIndex(x => x.id === id);
    if(idx >= 0) plListaCache[idx] = actualizado;

    plRefrescarVistaListaActual();
    showToast('Encabezado actualizado correctamente');
    plCerrarModal();

    // Si el detalle de este ticket está abierto, refrescar su resumen también
    if(Number(document.getElementById('plDetalleId').value) === id){
      plAbrirDetalle(id);
    }
  }catch(err){
    console.error(err);
    showToast('No se pudo guardar: ' + err.message, 'error');
  }finally{
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}

async function plGuardarYCrearCaso(){
  if(plEditandoEncabezadoId !== null){
    return plGuardarEdicionEncabezado();
  }

  const modulo = document.getElementById('pl_modulo').value;
  const noTicket = document.getElementById('pl_no_ticket').value.trim();
  if(!noTicket){
    showToast('Escribe el No. de Ticket', 'error');
    return;
  }
  for(let i = 0; i < plAvances.length - 1; i++){
    if((plAvances[i].estado === 'pausado' || plAvances[i].estado === 'programado') && plAvances[i + 1].estado !== 'despausado'){
      showToast('Todo avance "Pausado" o "Programado" debe ir seguido de un avance "Retomado" antes del siguiente.', 'error');
      return;
    }
  }

  const ticketFecha = document.getElementById('pl_ticket_fecha').value;
  const ticketHora = document.getElementById('pl_ticket_hora').value;
  const operadorTekcom = document.getElementById('pl_operador_tekcom').value.trim();
  const tipoAfectacion = document.getElementById('pl_tipo_afectacion').value.trim();

  // Texto consolidado de la bitácora, del más reciente al primero
  const avancesOrdenados = [...plAvances].slice().reverse();
  const textoAvances = avancesOrdenados.map((av, i) => {
    const numero = plAvances.length - i;
    const etiquetas = { finalizado:' [FINALIZADO]', escalado:' [ESCALADO]', pausado:' [PAUSADO]', despausado:' [DESPAUSADO]' };
    const etiqueta = etiquetas[av.estado] || '';
    const operadores = [
      av.operador_tekcom ? `Tekcom: ${av.operador_tekcom}` : '',
      av.operador_movistar ? `Movistar: ${av.operador_movistar}` : ''
    ].filter(Boolean).join(', ');
    return `No. ${numero} — ${av.fecha || ''} ${av.hora || ''}${etiqueta}: ${av.descripcion || ''}${operadores ? ' (' + operadores + ')' : ''}`;
  }).join('\n');

  // Estado final del caso, siguiendo la secuencia de avances (respeta pausas y reanudaciones)
  const estadoTag = plEstadoDePlantilla({ avances: plAvances });

  const btn = document.getElementById('plGuardarBtn');
  btn.disabled = true;
  const textoOriginal = btn.textContent;
  btn.textContent = 'Guardando...';

  try{
    // 1) Guardar la plantilla completa (bitácora)
    const payloadPlantilla = {
      modulo,
      cliente_sitio: document.getElementById('pl_cliente_sitio').value.trim() || null,
      enlace_de: document.getElementById('pl_enlace_de').value.trim() || null,
      enlace_hacia: document.getElementById('pl_enlace_hacia').value.trim() || null,
      ticket_fecha: ticketFecha || null,
      ticket_hora: ticketHora || null,
      no_ticket: noTicket,
      tipo_afectacion: tipoAfectacion || null,
      operador_telco: document.getElementById('pl_operador_telco').value.trim() || null,
      operador_tekcom: operadorTekcom || null,
      team_lider: document.getElementById('pl_teamlider_name').textContent !== '—' ? document.getElementById('pl_teamlider_name').textContent : null,
      avances: plAvances.map(({_key, ...resto}) => resto),
      creado_por: (typeof opkSesionActual !== 'undefined' && opkSesionActual) ? (opkSesionActual.nombre || opkSesionActual.usuario) : null
    };

    const resPlantilla = await fetch(PLANTILLA_REST_URL, {
      method:'POST',
      headers:{ ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify(payloadPlantilla)
    });
    if(!resPlantilla.ok){ const t = await resPlantilla.text(); throw new Error(t || 'Error al guardar la plantilla'); }
    const plantillaCreada = (await resPlantilla.json())[0];

    // 2) Crear el caso en el módulo correspondiente
    const escalonamientoIso = plHHMMaISO(ticketFecha, ticketHora);
    const mapEstadoInicial = {
      casos: { finalizado:'Finalizada', pausado:'Pausado', escalado:'En Proceso', abierto:'Pendiente' },
      hyve:  { finalizado:'Finalizado', pausado:'Pausado', escalado:'En Proceso', abierto:'Pendiente' },
      cable: { finalizado:'Finalizada', pausado:'Pausado', escalado:'En Proceso', abierto:'Pendiente' }
    };
    const statusInicial = (mapEstadoInicial[modulo] && mapEstadoInicial[modulo][estadoTag]) || 'Pendiente';
    let payloadCaso = {};
    let restUrl = '';

    if(modulo === 'casos'){
      restUrl = CASOS_REST_URL;
      payloadCaso = {
        casos: noTicket,
        clasificacion: tipoAfectacion || null,
        nombre_del_tecnico: operadorTekcom || null,
        status: statusInicial,
        escalonamiento: escalonamientoIso,
        observacion: textoAvances || null
      };
    } else if(modulo === 'hyve'){
      restUrl = HYVE_REST_URL;
      payloadCaso = {
        casos: noTicket,
        clasificacion: tipoAfectacion || null,
        tecnico_encargado: operadorTekcom || null,
        status: statusInicial,
        escalonamiento: escalonamientoIso
      };
    } else if(modulo === 'cable'){
      restUrl = CABLE_REST_URL;
      payloadCaso = {
        numero: noTicket,
        tipo_falla: tipoAfectacion || null,
        cuadrilla: operadorTekcom || null,
        status: statusInicial,
        escalonamiento: escalonamientoIso,
        observacion: textoAvances || null
      };
    }

    const resCaso = await fetch(restUrl, {
      method:'POST',
      headers:{ ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify(payloadCaso)
    });
    if(!resCaso.ok){ const t = await resCaso.text(); throw new Error(t || 'Error al crear el caso'); }
    const casoCreado = (await resCaso.json())[0];

    // 3) Enlazar la plantilla con el caso recién creado
    if(plantillaCreada && casoCreado){
      await fetch(`${PLANTILLA_REST_URL}?id=eq.${plantillaCreada.id}`, {
        method:'PATCH',
        headers: sbHeaders,
        body: JSON.stringify({ caso_id: casoCreado.id })
      });
    }

    showToast('Caso creado correctamente a partir de la plantilla');
    plCerrarModal();

    // 4) Refrescar el listado del módulo correspondiente
    if(modulo === 'casos' && typeof fetchCasos === 'function') await fetchCasos();
    if(modulo === 'hyve' && typeof fetchHyve === 'function') await fetchHyve();
    if(modulo === 'cable' && typeof fetchCable === 'function') await fetchCable();

  }catch(err){
    console.error(err);
    showToast('No se pudo guardar: ' + err.message, 'error');
  }finally{
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}
document.getElementById('plGuardarBtn').addEventListener('click', plGuardarYCrearCaso);

// Botón "Plantillas" en Inicio: lleva a la lista/seguimiento de plantillas (vista normal, no Estatus)
document.getElementById('btnPlantillasInicio').addEventListener('click', () => {
  const navPlantillas = document.querySelector('.nav-item[data-view="plantillas"]');
  if(navPlantillas) navPlantillas.click();
  const tabActiva = document.querySelector('.pl-tab-proyecto.active');
  if(tabActiva && tabActiva.dataset.plTabProyecto === 'estatus'){
    const primerTab = document.querySelector('.pl-tab-proyecto[data-pl-tab-proyecto="casos"]');
    if(primerTab) primerTab.click();
  }
});
// Botón "Estatus" en Inicio: lleva directo al tablero de Estatus dentro de Plantillas
document.getElementById('btnEstatusInicio').addEventListener('click', () => {
  const navPlantillas = document.querySelector('.nav-item[data-view="plantillas"]');
  if(navPlantillas) navPlantillas.click();
  const tabEstatus = document.getElementById('plTabEstatus');
  if(tabEstatus) tabEstatus.click();
});
// Botón "Estatus" dentro de la lista de Plantillas: mismo destino, acceso rápido sin volver a Inicio
document.getElementById('btnVerEstatusDesdeLista').addEventListener('click', () => {
  const tabEstatus = document.getElementById('plTabEstatus');
  if(tabEstatus) tabEstatus.click();
});
// Botón "Nueva Plantilla" dentro de la lista: usa directamente el proyecto de la pestaña activa
document.getElementById('btnNuevaPlantillaLista').addEventListener('click', () => {
  const tabActiva = document.querySelector('.pl-tab-proyecto.active');
  const modulo = tabActiva ? tabActiva.dataset.plTabProyecto : 'casos';
  plAbrirModal(modulo);
});

// ============================================================
// LISTA DE PLANTILLAS (seguimiento): tabla con filtros + detalle
// con línea de tiempo donde se pueden ir agregando avances nuevos.
// ============================================================
let plListaCache = [];

async function plCargarLista(){
  const wrap = document.getElementById('plListaWrap');
  wrap.innerHTML = `<div class="empty-state"><div class="empty-title">Cargando...</div></div>`;
  try{
    const res = await fetch(`${PLANTILLA_REST_URL}?select=*&order=created_at.desc`, { headers: sbHeaders });
    if(!res.ok) throw new Error('Error al cargar');
    plListaCache = await res.json();
    await plLimpiarPlantillasAntiguas();
    const tabActiva = document.querySelector('.pl-tab-proyecto.active');
    if(tabActiva && tabActiva.dataset.plTabProyecto === 'estatus'){
      plRenderEstatusLista();
    } else {
      plRenderListaFiltrada();
    }
    plActualizarCronometros();
    plActualizarSlaCronometros();
    plActualizarPanelFlotante();
  }catch(err){
    console.error(err);
    wrap.innerHTML = `<div class="empty-state"><div class="empty-title">No se pudo cargar</div></div>`;
  }
}

// Mantiene cada proyecto (Movistar/Hyve/Cable Color) con un máximo de 50 plantillas.
// Al pasar de 50, se eliminan las FINALIZADAS más antiguas (nunca las En Proceso/Pausadas),
// para no acumular demasiada información.
async function plLimpiarPlantillasAntiguas(){
  const LIMITE_POR_PROYECTO = 50;
  for(const proyecto of ['casos', 'hyve', 'cable']){
    const delProyecto = plListaCache.filter(p => p.modulo === proyecto);
    if(delProyecto.length <= LIMITE_POR_PROYECTO) continue;

    const finalizadasOrdenadas = delProyecto
      .filter(p => plEstadoDePlantilla(p) === 'finalizado')
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)); // más viejas primero

    let exceso = delProyecto.length - LIMITE_POR_PROYECTO;
    const aEliminar = finalizadasOrdenadas.slice(0, exceso).map(p => p.id);
    if(aEliminar.length === 0) continue;

    try{
      await fetch(`${PLANTILLA_REST_URL}?id=in.(${aEliminar.join(',')})`, { method:'DELETE', headers: sbHeaders });
      plListaCache = plListaCache.filter(p => !aEliminar.includes(p.id));
    }catch(err){
      console.error('No se pudieron limpiar plantillas antiguas:', err);
    }
  }
}

// ============================================================
// CRONÓMETRO EN VIVO: para cada ticket "Abierto" cuenta el tiempo
// transcurrido desde el último avance. Se pone rojo a los 50 minutos,
// y suena una alerta cada vez que se cumple una hora completa (1h, 2h, 3h...).
// ============================================================
const plHorasAlertadasPorTicket = new Map();
const plCronTimestamps = new Map();

// Sonido único de alarma para todo el sistema.
const PL_SONIDO_ALERTA = "data:audio/mp3;base64,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IFZ0Vh////////5h4cWA42U6NkOjOg5Nj///////8tKWlLSJslgWMWFisO///////ywHFgPM6OzOjsw8//PkZLsqgdkqAG/bUCtbslQA1WlI6M6DjDg4w8P///////ywCGCghWClgFMFBSwCFYKVgv/////5goIWA8zoPLAcYeHFhlM6OisPMODjDw8w8PKw/////ywHmHB/lgPMPDvKzosB5WHFYf///////lgOMPDjDw4sBxYD/MODisO////Kw8sB5hweYcHmHBxh4eWJArOjZGU2RkNkOzD5ArZDDjo2Q6M6DjDw8w8P//8QkCsAKK2cs6LFPyuk1Zq4ciAhYrL//liB7VDIAfEAH1OCsWFTxWKUaRVUaPczU4UaU5LAv2dPg+Zhg7Ov98Quv///+BkAggZBIAHvFCBkFQBEggwg/////8IlgBC4XWBsH/////+ETQMN//gw3hFaBrFuBrFkIrIGsWf8IrAYtCK0IrIRWYMW////4Rvgy8EbwMv4HevBG8B374RvhG8DLwGbNgZs2BmjQMNVC+goqFyCIEQYA0laSFQeUaCEFIgFVONA/4EEsDDCYlKaepMAYyDIWlVMVgCIQQMIAB98BYJjAYEisB3zFQGRWM5wLKwLUbCAWRUKwzvSSlAoG/ek/yb/k0kksmf4GA2YlD+ZMDIYLAsWk////////QLQKMFwWMSkzNGBLMsgxMSiYMfg//PkZIQoogsuUHaa1yXTxkwAzWkQWAyzAGwaF1//gClgBl4MlAZcuF1guv//DDA2DwusF1ww4Ng//+AKWAy7ADLFgZLAyzAAZYKyKxFX/4GAAgNAA1eKsNXhq//6bCbCbCbCBQGWlpCwXLSFguBMqBQGWnLL+mymx///oFlpS0yBZYLFpUCgMvTZLTFpy0/lpE2P////QLLSlpS0pYLFp0Ci06bP///6BRaUCFzLFzYFwKwAmUDLAKWPJKMsxAuQyxY2BZAstOgWgWWm9Av////////0C//4MCwynhoUaTR5A1gGuNfFToYHLJFjorP/zPPPrv1TB4Sp/VOmyBrgLimwmyBVoMXvCIPBgP4AoW4YcNWf///4GX2wDGyBl9shHnAbYL4ML4RW/////hhgbBwNg4Lrwit//+DFoGsWwNYs//+Eb///wO/ehG/Bl7//Bl+B3r//////4MvAd6+Eb4Hfvgd69A71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/+ERGBmIxgYiMQHJZIBuRygwx/////8LIgDiaHnCyD/+ERHhERAwRf////wMnE+EScEScDBEDBGBiIRf4GIhHCIjBgiCIjAxGIgMRCMDEQiCIiBgi////8DTKYBiZgxMAxMhFM4GmEx////wiCQYCIRBAMBF/4Og0sAgVhEQgy5LNjAcRwsFpigHyfKH5eowPDowOGQw6T87zpo4YJAw7DssAcqUOCIwBBAOJ9qrlFYWDIfQZBoXAYwAE8wRKpU5YAAOF0wAGwrBGjfSDgaASe1HB3////mB4yGSJ0GB4yjQ1l6H3jD9f//Q0X/5YDow6GUwOWo3DJAzpGUxkGQxkDorA4rA//4XWg2DgiXAGwgctgB5JQAyz//BsGgClgwwXWhdf/wMeOCI8DHO//PkZLcqCgkqAHab2CYDpkAApuo8wN07COQI5QN27Ax4//+ER4MHAY8eER//8IjwMc7A8jsDdOgPKPA3ToDdDgYPAxw7/gY8cER4RHAwcBjxwMdQN2PgY8eDB/////mHB5WHGHhxWHGHBxhwd///+YeHGHhxnYcZ2dGdhxWdGdspXeGdHZyDIbKdFiRKzsztlM7OysPLAeBi/////02UC/LSIFlp////////0C02PCMYGCgKypspsnGxpjQ0cYphAoFAsIFixImdh///+gWBmMCixWY+BRYDMIESysX8sCwFSzZbItOgWVmAEFisXC6wYaBjALeDA3///4RdwG7neDHcEXcB/x3gf9d4Md//////wMgED////////BiDwisgNZLPCKz//hFZYMWf////hF3Ax3hF3gbud+DHcBu93Ax3Qi7/BheV+DFPSUGADCQPhgGAKDwB6kDAgBOMAEE4wyAbQgAhEEKAEmA0EYVgNmEaEYYYhC5xaEoGLcGIWAGywAhiMApgKAplaAnqNGIwFmGYZhAeormBYtmAgjG/hWmEwCFgJisRywVhhMAiY8GqeMBgtcv1P////+WAFMBRGMizONbz8NNDEKxS////////8wbFIyNIwzFFM00zIxTW//PkZJkvkd8iAHu7bClDulQAzWkQ8z8PwyMFIxSBoxoa///////zGhsrGjUsUxrEOMUitSLA1/////////lgbNSGisb/////////ywNFY2Y3GGpxpYjTjVMrG/TYLSf///+gUWmLSoFFpjMBczEXLToFpsoFf///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P/0Nbh2MRgV9TwYB4WAcrExTw4AY8ExgUBSiPggEguHZjeSSY/lYUBYKQwUXXX34YDit1E6/////lgADB0WDJMsDGoCjAoCkCTZ//////zBUFP8xHKgzbBQx2HcxHQ0x3BQrBQrBX//wMoVCMYDKxwMqVDohcg/S//PkZJkm4dkssGu0XiurrkwAxqpYF8hcfguGC4YOmEWFzgIBf/wiVAykcDjRwMpGAypUDKlQMoUCJX/4RAgwABgQAMAAYECBgQIGBA/8GAAiUBhUIlQMoVAykcDKFAiUA40YDKRgYU/4GUKgwoESoMKQZHCJQIlAiVCJQGFP/hEqBlSgRKwMoUAyhQGFPwYVwiUAypUDjFAZ2CJQDjFQOOUAyncDjlQOPHCJQDKFAMqVBhX//xWQs05GFnlgx0qfldNFdRoIKlin///+isZ8WFRZihajZhApWnMKnKwnmECGFCnp0f5WELAQrCRFYCQ/xFQYBf///wNBoIIyMDQXCA5HIgNBIMGIP/////hETgYmAgGBQIDAJ/////4RIIMIH//CJBBhAwMgECDCADCCDCD/4MIMDIBBCJBCJBhEgf////CKCBiDhFBBFBhFBgaCQQGgkEBoNBhFBBFBgaDQYMQV+gat6Yw0CKYA4AxdAueYB4HRYAPMOkA4rAJVIMABlgCwsBfGDqBYYOo8RqpmEmF+BaVgWiAAmAQAIAAZeEKpSwAQ4hGATYHADzEIAAwsPNDEDCwsBYtOBTKVkqMKLuWRFL6N9PovjVG+lG+yiowHjP7kNmuUxiFwML////////PkZH4reeUmAHubbCfDylgAzWkQ///LAtMWHU6h4zgx1ODHU19UDqC+MtLCwW////////mWlhlrocidmdHRWdlgO////////8sB5nR2VhxWH+YeHlYf///////+YeHGHhxnUibIdGdspnZ2ViIgAGrKmat////7VVSCAAMBIBAAhxGHAbV1Sqnav//////5YLSssN0vzLCwy11MtLTLS0y0sMtLf/////ywWFgtKywsFn+VlvlZb/////////mWFpYLPKyz////ywWeZaWG6uhupYWHUyx0MtLTLL83R0LBaZbfGWOhljqbq6lh0N0LDLCz//02nyLCDVmqljrzOO9qgcGWHysv/Kzix374pHJt++JadNkCLps+WmgZkC4XW4XWiswHADisigP/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";
const plSlaAudioFase1 = new Audio(PL_SONIDO_ALERTA);

const plSlaAudioFase2 = new Audio(PL_SONIDO_ALERTA);

const plAudioAvances = new Audio(PL_SONIDO_ALERTA);

// Reproduce la sirena unos segundos y, al cortarla, ejecuta la narración.
// El archivo dura más de lo necesario, por eso se recorta: así el aviso es
// ágil y la voz nunca queda tapada por el sonido.
const ALARMA_DURACION_MS = 2500;

function plAlarmaConVoz(audio, despues){
  const seguir = () => { try{ despues && despues(); }catch(e){} };
  try{
    audio.currentTime = 0;
    const pr = audio.play();
    if(pr && typeof pr.catch === 'function'){
      pr.catch(() => { plReproducirSonidoAlerta(); setTimeout(seguir, 900); });
    }
    setTimeout(() => {
      try{ audio.pause(); audio.currentTime = 0; }catch(e){}
      seguir();
    }, ALARMA_DURACION_MS);
  }catch(e){
    plReproducirSonidoAlerta();
    setTimeout(seguir, 900);
  }
}

// ------------------------------------------------------------
// DESBLOQUEO DE AUDIO
// Los navegadores bloquean todo sonido hasta que el usuario interactúa con la
// página: sin esto, las alarmas de SLA fallan con
// "play() failed because the user didn't interact with the document first".
// Se reproducen los tres audios en silencio en el primer clic o tecla, lo que
// los deja habilitados para las reproducciones automáticas posteriores.
// ------------------------------------------------------------
let plAudioDesbloqueado = false;

function plDesbloquearAudio(){
  if(plAudioDesbloqueado) return;
  plAudioDesbloqueado = true;

  [plSlaAudioFase1, plSlaAudioFase2, plAudioAvances].forEach(a => {
    const volOriginal = a.volume;
    a.volume = 0;
    const p = a.play();
    if(p && typeof p.then === 'function'){
      p.then(() => {
        a.pause();
        a.currentTime = 0;
        a.volume = volOriginal;
      }).catch(() => { a.volume = volOriginal; });
    } else {
      a.pause();
      a.currentTime = 0;
      a.volume = volOriginal;
    }
  });

  // El AudioContext del pitido de respaldo también necesita reanudarse.
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if(Ctx){
      const ctx = new Ctx();
      if(ctx.state === 'suspended') ctx.resume();
      plAudioCtxGlobal = ctx;
    }
  }catch(e){}

  console.log('[audio] alarmas habilitadas');
}

let plAudioCtxGlobal = null;

['click','keydown','touchstart'].forEach(ev => {
  document.addEventListener(ev, plDesbloquearAudio, { once:true, capture:true });
});

function plReproducirSonidoAlerta(){
  try{
    // Se reutiliza el contexto ya desbloqueado; crear uno nuevo lo deja suspendido.
    const ctx = plAudioCtxGlobal || new (window.AudioContext || window.webkitAudioContext)();
    if(ctx.state === 'suspended') ctx.resume();
    [0, 400].forEach(retardo => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }, retardo);
    });
  }catch(e){ console.error('No se pudo reproducir el sonido de alerta:', e); }
}

function plActualizarCronometros(){
  const ahora = Date.now();
  document.querySelectorAll('.pl-cronometro').forEach(el => {
    const id = el.dataset.plCronId;
    const ts = Number(el.dataset.plCronTs);
    if(!id || !ts) return;

    // Si el momento del último avance cambió (se agregó uno nuevo), reinicia el conteo de alertas
    if(plCronTimestamps.get(id) !== ts){
      plCronTimestamps.set(id, ts);
      plHorasAlertadasPorTicket.set(id, -1);
    }

    const ms = Math.max(0, ahora - ts);
    const totalSeg = Math.floor(ms / 1000);
    const hh = Math.floor(totalSeg / 3600);
    const mm = Math.floor((totalSeg % 3600) / 60);
    const ss = totalSeg % 60;
    el.textContent = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;

    const minutosTotales = ms / 60000;
    el.classList.toggle('pl-cron-rojo', minutosTotales >= 35);

    // A partir de los 35 minutos, suena cada 2 minutos hasta que se actualice el ticket
    if(minutosTotales >= 35){
      const bloqueActual = Math.floor((minutosTotales - 35) / 2);
      const yaAlertadoBloque = plHorasAlertadasPorTicket.has(id) ? plHorasAlertadasPorTicket.get(id) : -1;
      if(bloqueActual > yaAlertadoBloque){
        plHorasAlertadasPorTicket.set(id, bloqueActual);
        const p = plListaCache.find(x => String(x.id) === String(id));
        const minTxt = Math.round(minutosTotales);
        try{ plReproducirSonidoAlerta(); }catch(e){}
      }
    }
  });
}
setInterval(plActualizarCronometros, 1000);

// ============================================================
// SLA: cuenta el tiempo ACTIVO desde que el caso pasó a "En Proceso"
// (Solicitud de Ticket). Se congela mientras la plantilla está
// Pausada/Programada, y al Retomarse sigue contando desde donde iba
// (no se reinicia). Límite: 4 horas.
//   1:00 - 3:00  -> aviso cada 30 min
//   3:30 - 4:00  -> alarma con sonido cada 10 min ("poco tiempo")
//   4:00 en adelante -> en rojo, "vencido", aviso cada 5 min
// ============================================================
// ============================================================
// VALIDACIÓN DE ENCABEZADO AL FINALIZAR
// Una plantilla no puede cerrarse con datos incompletos: al registrar
// el avance "Finalizado" se exige que el encabezado esté lleno y se
// le dice al operador exactamente qué campo falta.
// ============================================================
const PL_CAMPOS_ENCABEZADO_OBLIGATORIOS = [
  { campo:'cliente_sitio',   etiqueta:'Cliente / Sitio' },
  { campo:'no_ticket',       etiqueta:'No. Ticket' },
  { campo:'tipo_afectacion', etiqueta:'Tipo de Afectación' },
  { campo:'enlace_de',       etiqueta:'Enlace en Afectación — De' },
  { campo:'enlace_hacia',    etiqueta:'Enlace en Afectación — Hacia' },
  { campo:'ticket_fecha',    etiqueta:'Solicitud de Ticket — Fecha' },
  { campo:'ticket_hora',     etiqueta:'Solicitud de Ticket — Hora' },
  { campo:'operador_telco',  etiqueta:'Operador Movistar' },
  { campo:'operador_tekcom', etiqueta:'Operador NOC-Tekcom' },
  { campo:'causa',           etiqueta:'Causa' },
  { campo:'sub_categoria',   etiqueta:'Sub Categoría' },
  { campo:'coordenadas',     etiqueta:'Coordenadas' },
  { campo:'team_lider',      etiqueta:'Cuadrilla (Team Líder)' },
];

// Devuelve las etiquetas de los campos del encabezado que están vacíos.
function plCamposEncabezadoFaltantes(p){
  if(!p) return [];
  const faltantes = PL_CAMPOS_ENCABEZADO_OBLIGATORIOS
    .filter(({ campo }) => {
      const v = p[campo];
      if(v === null || v === undefined) return true;
      const txt = String(v).trim();
      // "Pendiente Asignar Personal" es el placeholder del team líder: cuenta como vacío.
      return txt === '' || txt === '—' || txt === 'Pendiente Asignar Personal';
    })
    .map(({ etiqueta }) => etiqueta);

  // Las coordenadas pueden estar llenas pero con un formato que la base rechaza
  // (latitud/longitud son numéricas). Se avisa aquí y no al momento de insertar.
  const coord = parseCoordenadasNum(p.coordenadas);
  if(!coord.valido){
    const i = faltantes.indexOf('Coordenadas');
    const aviso = `Coordenadas — formato inválido ("${p.coordenadas}"). Debe ser "latitud, longitud", por ejemplo 13.6894, -89.1872`;
    if(i >= 0) faltantes[i] = aviso; else faltantes.push(aviso);
  }
  return faltantes;
}

// Formato militar (24h): dd/mm/aaaa HH:MM. Se usa en las vistas de detalle porque
// toLocaleString devuelve a.m./p.m. según el idioma del equipo.
function plFechaHoraMilitar(valor){
  if(!valor) return null;
  const d = new Date(valor);
  if(isNaN(d.getTime())) return null;
  const p2 = n => String(n).padStart(2, '0');
  return `${p2(d.getDate())}/${p2(d.getMonth()+1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

// Tiempos de Aceptación: valor aleatorio entre 1 y 5 minutos (formato HH:MM).
// Se genera automáticamente para que no quede vacío ni repetido en todos los casos.
const ACEPTACION_MIN_MINUTOS = 1;
const ACEPTACION_MAX_MINUTOS = 5;

function tiempoAceptacionAleatorio(){
  const rango = ACEPTACION_MAX_MINUTOS - ACEPTACION_MIN_MINUTOS + 1;
  const minutos = ACEPTACION_MIN_MINUTOS + Math.floor(Math.random() * rango);
  return `00:${String(minutos).padStart(2, '0')}`;
}

// Hasta 12 minutos se considera dentro de meta (verde); más de 12, fuera (rojo).
const VALIDACION_MOVISTAR_META_MIN = 12;

function plTiempoValidacionColoreado(caso){
  const txt = plTiempoValidacionMovistar(caso);
  if(!txt) return null;
  const min = hhmmToMinutes(txt);
  if(min === null) return { texto: txt };
  return { texto: txt, color: min > VALIDACION_MOVISTAR_META_MIN ? '#DC2626' : '#16A34A' };
}

// Tiempo de Validación Movistar = Fecha Validación Movistar - Solicitud | Validación-Movistar.
// Si el caso no lo tiene guardado (registros anteriores), se calcula al mostrarlo usando
// la Resolución como fecha de validación.
function plTiempoValidacionMovistar(caso){
  if(caso.t_validacion) return caso.t_validacion;
  const fin = caso.up_enlace || caso.resolucion;
  if(!caso.s_validacion || !fin) return null;
  const diffMin = (new Date(fin) - new Date(caso.s_validacion)) / 60000;
  if(isNaN(diffMin)) return null;
  return minutesToHHMM(diffMin);
}

function plCalcularSlaActivo(p){
  const avances = p.avances || [];
  // El SLA se ancla al PRIMER avance de la bitácora, que es el momento real en que el caso
  // entró a "En Proceso". Para un caso creado directo en proceso ese avance ya trae la
  // fecha/hora de escalonamiento, así que el comportamiento no cambia. Para un caso que
  // estuvo en Pendiente, el avance trae la hora de la promoción y el reloj arranca ahí.
  let inicio = null;
  if(avances.length > 0){
    const primero = avances[0];
    inicio = new Date(`${primero.fecha}T${plHHMM(primero.hora)}:00`);
  }
  if((!inicio || isNaN(inicio.getTime())) && p.ticket_fecha){
    // Respaldo para registros viejos sin avances válidos.
    inicio = new Date(`${p.ticket_fecha}T${plHHMM(p.ticket_hora)}:00`);
  }
  if(!inicio || isNaN(inicio.getTime())) return null;
  let acumuladoMs = 0;
  let cursor = inicio.getTime();
  let pausadoDesde = null;
  let avancePausa = null; // el avance que provocó la pausa vigente

  for(const av of avances){
    const t = new Date(`${av.fecha}T${plHHMM(av.hora)}:00`).getTime();
    if(isNaN(t)) continue;
    if((av.estado === 'pausado' || av.estado === 'programado') && pausadoDesde === null){
      acumuladoMs += Math.max(0, t - cursor);
      pausadoDesde = t;
      avancePausa = av;
    } else if(av.estado === 'despausado' && pausadoDesde !== null){
      // Si la pausa fue por un caso PROGRAMADO, el SLA no se reanuda cuando la cuadrilla
      // retoma (suele salir antes para llegar a tiempo), sino a la hora agendada.
      let reanuda = t;
      if(avancePausa && avancePausa.estado === 'programado' && avancePausa.programado_fecha && avancePausa.programado_hora){
        const progTs = new Date(`${avancePausa.programado_fecha}T${plHHMM(avancePausa.programado_hora)}:00`).getTime();
        if(!isNaN(progTs)) reanuda = progTs;
      }
      cursor = reanuda;
      pausadoDesde = null;
      avancePausa = null;
    }
  }

  const pausadoAhora = pausadoDesde !== null;
  const ultimoAvance = avances[avances.length - 1];
  const estaFinalizado = ultimoAvance && ultimoAvance.estado === 'finalizado';

  if(estaFinalizado){
    // Congelado: se detiene en el momento exacto en que se finalizó, no en "ahora".
    const finTs = new Date(`${ultimoAvance.fecha}T${plHHMM(ultimoAvance.hora)}:00`).getTime();
    if(!isNaN(finTs)) acumuladoMs += Math.max(0, finTs - cursor);
  } else if(!pausadoAhora){
    acumuladoMs += Math.max(0, Date.now() - cursor);
  }
  // `baseMs` es el tiempo ya consolidado y `desdeMs` el instante desde el que sigue corriendo.
  // Se exponen para que el cronómetro en vivo pueda respetar un ancla en el FUTURO (caso
  // programado cuya cita todavía no llega): ahí debe quedarse en 00:00:00, no arrancar.
  return {
    ms: acumuladoMs,
    pausadoAhora,
    finalizado: !!estaFinalizado,
    baseMs: (estaFinalizado || pausadoAhora) ? acumuladoMs : acumuladoMs - Math.max(0, Date.now() - cursor),
    desdeMs: cursor
  };
}

// Calcula un número de "bloque" de alerta creciente según los minutos activos,
// para no repetir el mismo aviso dos veces dentro del mismo tramo.
// `limite` es el SLA del proyecto (240 min en Movistar, 300 en Hyve y Cable).
// Los avisos se aceleran en la última media hora antes de vencer.
function plBloqueAlertaSla(minutos, limite){
  const lim = limite || 240;
  const aviso = lim - 30; // media hora antes del vencimiento
  if(minutos < 60) return -1;
  if(minutos < aviso) return Math.floor((minutos - 60) / 30); // cada 30 min
  if(minutos < lim) return 5 + Math.floor((minutos - aviso) / 10); // cada 10 min en la recta final
  return 8 + Math.floor((minutos - lim) / 5); // cada 5 min después de vencido
}

const plSlaAlertadoPorTicket = new Map();

function plActualizarSlaCronometros(){
  document.querySelectorAll('.pl-sla-cronometro').forEach(el => {
    const id = el.dataset.plSlaId;
    if(!id) return;

    const baseMs = Number(el.dataset.plSlaBaseMs);
    const desdeMs = Number(el.dataset.plSlaDesdeMs);
    const congelado = el.dataset.plSlaCongelado === '1';
    if(isNaN(baseMs) || isNaN(desdeMs)) return;

    // Si `desdeMs` está en el futuro (caso programado que aún no llega a su hora),
    // Math.max deja el transcurrido en 0 y el SLA no avanza.
    const ms = congelado
      ? Number(el.dataset.plSlaMsCongelado || 0)
      : Math.max(0, baseMs + Math.max(0, Date.now() - desdeMs));
    const totalSeg = Math.floor(ms / 1000);
    const hh = Math.floor(totalSeg / 3600);
    const mm = Math.floor((totalSeg % 3600) / 60);
    const ss = totalSeg % 60;
    el.textContent = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;

    const minutos = ms / 60000;
    // El límite depende del proyecto: Movistar 4:00, Hyve y Cable Color 5:00.
    const pSla = plListaCache.find(x => String(x.id) === String(id));
    const sinSla = categoriaSinSla(pSla && pSla.tipo_afectacion);
    const limiteSla = slaLimite(pSla && pSla.modulo);
    // Sin SLA no hay vencimiento: el contador nunca se pone en rojo.
    el.classList.toggle('pl-cron-rojo', !sinSla && minutos >= limiteSla);

    if(congelado) return; // pausado o finalizado: no se avisa

    // Las alertas sonoras/burbuja sí necesitan datos completos del caso (folio, etc.)
    const p = pSla;
    if(!p) return;

    const limiteTxt = `${String(Math.floor(limiteSla / 60)).padStart(2,'0')}:${String(limiteSla % 60).padStart(2,'0')}`;
    // Degradación y Preventivo: un recordatorio por hora, sin vencimiento.
    const bloqueActual = sinSla
      ? Math.floor(minutos / 60) - 1
      : plBloqueAlertaSla(minutos, limiteSla);
    if(bloqueActual < 0) return;
    const yaAlertado = plSlaAlertadoPorTicket.has(id) ? plSlaAlertadoPorTicket.get(id) : -1;
    if(bloqueActual > yaAlertado){
      plSlaAlertadoPorTicket.set(id, bloqueActual);
      const totalSegAlerta = Math.floor(ms / 1000);
      const hhAlerta = String(Math.floor(totalSegAlerta / 3600)).padStart(2,'0');
      const mmAlerta = String(Math.floor((totalSegAlerta % 3600) / 60)).padStart(2,'0');
      const ssAlerta = String(totalSegAlerta % 60).padStart(2,'0');
      const minTxt = `${hhAlerta}:${mmAlerta}:${ssAlerta}`;
      let titulo, cuerpo, fase = 'noCritica';
      if(sinSla){
        titulo = '🔔 Recordatorio de avance';
        cuerpo = `${p.cliente_sitio || p.no_ticket || 'Caso'} (${p.tipo_afectacion}) lleva ${minTxt} activo. Esta categoría no tiene SLA, pero requiere avance.`;
        fase = 'recordatorio';
      } else if(minutos >= limiteSla){
        titulo = '🔴 SLA VENCIDO';
        cuerpo = `${p.cliente_sitio || p.no_ticket || 'Caso'} superó el límite de ${limiteTxt} horas (lleva ${minTxt} activo).`;
        fase = 'vencido';
      } else if(minutos >= limiteSla - 30){
        titulo = '⏰ Poco tiempo para vencer el SLA';
        cuerpo = `${p.cliente_sitio || p.no_ticket || 'Caso'} lleva ${minTxt} activo, quedan pocos minutos para el límite de ${limiteTxt}.`;
        fase = 'pocoTiempo';
      } else {
        titulo = '⚠ SLA en curso';
        cuerpo = `${p.cliente_sitio || p.no_ticket || 'Caso'} lleva ${minTxt} activo (límite 4:00:00).`;
      }
      // Se nombra el caso, no el número de ticket: es lo que el operador reconoce.
      const ticketVoz = p.cliente_sitio || p.no_ticket || 'sin nombre';
      const tiempoVoz = vozTiempo(minTxt);
      let frase;
      if(fase === 'vencido'){
        frase = `Atención. Caso ${ticketVoz} superó el tiempo de respuesta. Lleva ${tiempoVoz}.`;
      } else if(fase === 'pocoTiempo'){
        frase = `Caso ${ticketVoz} está por vencer. Lleva ${tiempoVoz}.`;
      } else if(fase === 'recordatorio'){
        frase = `Recordatorio. Caso ${ticketVoz} lleva ${tiempoVoz} y requiere avance.`;
      } else {
        frase = `Caso ${ticketVoz} lleva ${tiempoVoz} activo.`;
      }
      // Primero la sirena; al terminar, la narración.
      plAlarmaConVoz(plSlaAudioFase1, () => narrar(frase));
      // Aviso del sistema: se ve aunque estés en otro programa.
      notificarSistema(titulo, cuerpo, 'sla-' + id);

      plMostrarBurbujaNotificacion(titulo, cuerpo, id, { borde:'#86EFAC', bordeIzq:'#16A34A', texto:'#15803D' }, p.modulo);
    }
  });
}
setInterval(plActualizarSlaCronometros, 1000);

// ============================================================
// BURBUJA DE NOTIFICACIÓN FLOTANTE Y MOVIBLE (arrastrable con el mouse)
// Reemplaza la notificación nativa del navegador para que siempre
// se vea igual y se pueda mover a cualquier parte de la pantalla.
// ============================================================
function plMostrarBurbujaNotificacion(titulo, cuerpo, ticketId, color, modulo){
  const c = color || { borde:'#FCA5A5', bordeIzq:'#DC2626', texto:'#B91C1C' };
  let contenedor = document.getElementById('plBurbujasNotificacion');
  if(!contenedor){
    contenedor = document.createElement('div');
    contenedor.id = 'plBurbujasNotificacion';
    contenedor.style.cssText = 'position:fixed; top:20px; right:20px; z-index:99999; display:flex; flex-direction:column; gap:10px;';
    document.body.appendChild(contenedor);
  }

  const burbuja = document.createElement('div');
  burbuja.className = 'pl-burbuja-notificacion';
  burbuja.style.cssText = `
    position:relative; width:300px; background:#FFFFFF; border:1px solid ${c.borde};
    border-left:5px solid ${c.bordeIzq}; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,.18);
    padding:12px 14px; cursor:grab; user-select:none; font-family:inherit;
  `;
  burbuja.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
      <div style="font-weight:700; font-size:13px; color:${c.texto};">${escapeHtml(titulo)}</div>
      <button type="button" style="border:none; background:none; cursor:pointer; color:var(--text-dim); font-size:14px; line-height:1; padding:0;">✕</button>
    </div>
    ${modulo ? `<div style="margin-top:6px;">${plEtiquetaEmpresaHtml(modulo)}</div>` : ''}
    <div style="font-size:12.5px; color:var(--text-dim); margin-top:4px;">${escapeHtml(cuerpo)}</div>
  `;

  // Botón cerrar
  burbuja.querySelector('button').addEventListener('click', (e) => {
    e.stopPropagation();
    burbuja.remove();
  });

  // Clic en la burbuja (fuera del botón cerrar) lleva al ticket
  burbuja.addEventListener('click', () => {
    const navPlantillas = document.querySelector('.nav-item[data-view="plantillas"]');
    if(navPlantillas) navPlantillas.click();
    burbuja.remove();
  });

  // Arrastrar libremente por toda la pantalla
  let arrastrando = false, offsetX = 0, offsetY = 0;
  burbuja.addEventListener('mousedown', (e) => {
    if(e.target.tagName === 'BUTTON') return;
    arrastrando = true;
    burbuja.style.cursor = 'grabbing';
    const rect = burbuja.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    // Al empezar a arrastrar, se saca del flujo del contenedor y se posiciona libre
    burbuja.style.position = 'fixed';
    burbuja.style.left = rect.left + 'px';
    burbuja.style.top = rect.top + 'px';
    burbuja.style.right = 'auto';
    burbuja.style.margin = '0';
    document.body.appendChild(burbuja);
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if(!arrastrando) return;
    burbuja.style.left = (e.clientX - offsetX) + 'px';
    burbuja.style.top = (e.clientY - offsetY) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if(arrastrando){
      arrastrando = false;
      burbuja.style.cursor = 'grab';
    }
  });

  contenedor.appendChild(burbuja);
  // Se quita sola después de 45 segundos si nadie la mueve/cierra
  setTimeout(() => { if(burbuja.isConnected) burbuja.remove(); }, 45000);
}

// ============================================================
// PANEL FLOTANTE: se queda fijo en pantalla (visible en cualquier
// pestaña de la app) mientras haya tickets "Abierto" sin actualizar
// hace más de 1 hora, y desaparece solo cuando se resuelven.
// ============================================================
// El panel flotante de "Tickets sin actualizar" se puede arrastrar libremente
// por toda la pantalla, tomándolo desde su encabezado rojo.
(function plHabilitarArrastrePanelFlotante(){
  const panel = document.getElementById('plPanelFlotanteAlertas');
  const header = document.getElementById('plPanelFlotanteHeader');
  if(!panel || !header) return;
  let arrastrando = false, offsetX = 0, offsetY = 0;
  header.addEventListener('mousedown', (e) => {
    arrastrando = true;
    header.style.cursor = 'grabbing';
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if(!arrastrando) return;
    panel.style.left = (e.clientX - offsetX) + 'px';
    panel.style.top = (e.clientY - offsetY) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if(arrastrando){
      arrastrando = false;
      header.style.cursor = 'grab';
    }
  });
})();

// Aviso de tickets sin actualizar.
// El panel se refresca cada 5 segundos, así que no se puede avisar en cada pasada.
// Se guarda el último "bloque" anunciado por ticket: a partir de los 35 minutos
// el bloque avanza cada 2 minutos, y ahí vuelve a sonar la alarma con la voz.
const AVISO_AVANCES_DESDE_MIN = 35;
const AVISO_AVANCES_CADA_MIN = 2;
const plTicketsAvisados = new Map();   // id -> último bloque anunciado

function plBloqueAvisoAvances(minutos){
  if(minutos === null || minutos < AVISO_AVANCES_DESDE_MIN) return -1;
  return Math.floor((minutos - AVISO_AVANCES_DESDE_MIN) / AVISO_AVANCES_CADA_MIN);
}

function plActualizarPanelFlotante(){
  const panel = document.getElementById('plPanelFlotanteAlertas');
  const lista = document.getElementById('plPanelFlotanteLista');
  const contador = document.getElementById('plPanelFlotanteContador');
  if(!panel || !Array.isArray(plListaCache)) return;

  const pendientes = plListaCache.filter(p => plEstaDesatendido(p));

  if(pendientes.length === 0){
    panel.style.display = 'none';
    plTicketsAvisados.clear(); // al quedar limpio, un ticket que reincida vuelve a sonar
    return;
  }

  // Se avisa de un ticket cuando entra al panel y luego cada 2 minutos
  // mientras siga sin actualizarse.
  const porAvisar = pendientes.filter(p => {
    const bloque = plBloqueAvisoAvances(plMinutosSinActualizar(p));
    if(bloque < 0) return false;
    return plTicketsAvisados.get(String(p.id)) !== bloque;
  });

  if(porAvisar.length){
    porAvisar.forEach(p => {
      plTicketsAvisados.set(String(p.id), plBloqueAvisoAvances(plMinutosSinActualizar(p)));
    });
    // Aviso del sistema, visible fuera del navegador.
    if(porAvisar.length === 1){
      const pn = porAvisar[0];
      const minN = plMinutosSinActualizar(pn);
      notificarSistema(
        '⚠ Caso sin actualizar',
        `${pn.cliente_sitio || pn.no_ticket || 'Caso'}\n${minN !== null ? minutesToHHMM(minN) + ' sin actualizar' : ''}`,
        'avance-' + pn.id
      );
    } else {
      notificarSistema('⚠ Casos sin actualizar',
        `${porAvisar.length} casos requieren avance.`, 'avance-varios');
    }

    // Sirena y, al terminar, el anuncio de los tickets sin avance.
    plAlarmaConVoz(plAudioAvances, () => {
      if(porAvisar.length === 1){
        const p0 = porAvisar[0];
        const min = plMinutosSinActualizar(p0);
        const horas = min !== null ? vozTiempo(minutesToHHMM(min)) : '';
        narrar(`Caso ${p0.cliente_sitio || p0.no_ticket || 'sin nombre'} sin actualizar${horas ? ' desde hace ' + horas : ''}.`);
      } else {
        narrar(`Atención. Hay ${porAvisar.length} casos sin actualizar.`);
      }
    });
  }
  // Los que ya se resolvieron salen del registro
  const vigentes = new Set(pendientes.map(p => String(p.id)));
  [...plTicketsAvisados.keys()].forEach(id => { if(!vigentes.has(id)) plTicketsAvisados.delete(id); });

  panel.style.display = 'block';
  contador.textContent = pendientes.length;
  lista.innerHTML = pendientes.map(p => {
    const minutos = plMinutosSinActualizar(p) || 0;
    const tiempoTxt = minutos < 60 ? `${Math.round(minutos)} min` : `${(minutos / 60).toFixed(1)} hora(s)`;
    return `
      <button type="button" class="pl-panel-flotante-item" data-pl-panel-ticket="${p.id}" style="display:block; width:100%; text-align:left; padding:10px 14px; border:none; border-bottom:1px solid var(--border); background:none; cursor:pointer;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
          <div style="font-weight:600; font-size:12.5px;">${escapeHtml(p.no_ticket || '—')}</div>
          ${plEtiquetaEmpresaHtml(p.modulo)}
        </div>
        <div style="font-size:11.5px; color:var(--text-dim);">${escapeHtml(p.cliente_sitio || '')}</div>
        <div style="font-size:11px; color:#DC2626; font-weight:600; margin-top:2px;">⏱ ${tiempoTxt} sin actualizar</div>
      </button>
    `;
  }).join('');

  lista.querySelectorAll('[data-pl-panel-ticket]').forEach(btn => {
    btn.addEventListener('click', () => {
      const navPlantillas = document.querySelector('.nav-item[data-view="plantillas"]');
      if(navPlantillas) navPlantillas.click();
      setTimeout(() => plAbrirDetalle(Number(btn.dataset.plPanelTicket)), 200);
    });
  });
}
setInterval(plActualizarPanelFlotante, 5000);

setInterval(() => { plCargarLista(); }, 60000);

// Pide permiso de notificaciones del navegador la primera vez que se abre Plantillas
document.querySelector('.nav-item[data-view="plantillas"]').addEventListener('click', () => {
  if(typeof Notification !== 'undefined' && Notification.permission === 'default'){
    Notification.requestPermission();
  }
});

function plEstadoDePlantilla(plantilla){
  const avances = plantilla.avances || [];
  let estado = 'abierto';
  for(const av of avances){
    if(av.estado === 'finalizado'){ estado = 'finalizado'; break; }
    if(av.estado === 'escalado') estado = 'escalado';
    else if(av.estado === 'pausado' || av.estado === 'programado') estado = 'pausado';
    else if(av.estado === 'despausado' || av.estado === 'normal') estado = 'abierto';
  }
  return estado;
}
function plEtiquetaProyecto(modulo){
  return { casos:'Casos Movistar', hyve:'Casos Hyve', cable:'Casos Cable Color' }[modulo] || modulo;
}

// ============================================================
// TABLERO DE ESTATUS (Control de Fallas Pendientes NOC)
// Cada Tipo de Afectación se ubica automáticamente en una
// sección (CLIENTES / INTERURBANOS / MEJORA) y se le asigna una
// categoría corta para la tabla. Ajusta este mapa si cambia el
// criterio de agrupación.
// ============================================================
const PL_SECCION_POR_AFECTACION = {
  'UM FO':        { seccion:'CLIENTES',     categoria:'FO' },
  'UM CU':        { seccion:'CLIENTES',     categoria:'CU' },
  'CPE':          { seccion:'CLIENTES',     categoria:'CPE' },
  'Datos':        { seccion:'CLIENTES',     categoria:'DATOS' },
  'FTTH':         { seccion:'CLIENTES',     categoria:'FTTH' },
  'Interurbano':  { seccion:'INTERURBANOS', categoria:'CFO' },
  'Degradación':  { seccion:'INTERURBANOS', categoria:'DEG' },
  'Preventivo':   { seccion:'MEJORA',       categoria:'MP' },
  'Energía':      { seccion:'MEJORA',       categoria:'ENE' },
};
const PL_SECCIONES_ORDEN = ['CLIENTES', 'INTERURBANOS', 'MEJORA'];

function plSeccionYCategoria(tipoAfectacion){
  return PL_SECCION_POR_AFECTACION[tipoAfectacion] || { seccion:'CLIENTES', categoria: tipoAfectacion || '—' };
}

const PL_ESTATUS_OPCIONES = {
  en_proceso:       { label:'En Proceso',         bg:'#FEF3C7', color:'#92400E' },
  pendiente_tlf:    { label:'Pendiente Movistar',  bg:'#BDD7EE', color:'#1F4E78' },
  programado:       { label:'Programado',         bg:'#70AD47', color:'#FFFFFF' },
  pendiente_tekcom: { label:'Pendiente Tek Com',   bg:'#C00000', color:'#FFFFFF' },
  pausado:          { label:'Pausado',            bg:'#FEF3C7', color:'#B45309' },
};

// Estatus del tablero en los que el caso NO está siendo trabajado: el SLA se congela
// y tampoco debe generar alarma de "sin actualizar".
const PL_ESTATUS_EN_ESPERA = ['pendiente_tlf', 'pendiente_tekcom', 'programado'];

// Estatus "real" del caso: si la plantilla ya existe y está pausada/programada en su
// bitácora, eso manda sobre lo que se guardó manualmente en estatus_valor.
function plEstatusEfectivo(p){
  const avances = p.avances || [];
  if(avances.length > 0 && plEstadoDePlantilla(p) === 'pausado'){
    const ultimo = avances[avances.length - 1];
    return ultimo.estado === 'programado' ? 'programado' : 'pausado';
  }
  return p.estatus_valor || 'pendiente_tlf';
}

function plNombreCortoProyecto(modulo){
  return { casos:'Movistar', hyve:'Hyve', cable:'Cable Color' }[modulo] || 'Movistar';
}

function plChipEstatusValor(valor, modulo){
  const info = PL_ESTATUS_OPCIONES[valor];
  if(!info) return '<span class="badge">—</span>';
  const label = (valor === 'pendiente_tlf') ? `Pendiente ${plNombreCortoProyecto(modulo)}` : info.label;
  return `<span class="badge" style="background:${info.bg};color:${info.color};font-weight:700;">${escapeHtml(label)}</span>`;
}

const TEKCOM_LOGO_DATAURI = "data:image/png;base64,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";
const PDF_FOOTER_DATAURI = "data:image/png;base64,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";

function plMembreteEstatusHtml(){
  return `
    <div style="display:flex; align-items:stretch; border:1px solid var(--border); border-radius:10px; overflow:hidden; margin-bottom:16px; background:#fff;">
      <div style="display:flex; align-items:center; padding:10px 22px; border-right:1px solid var(--border);">
        <img src="${TEKCOM_LOGO_DATAURI}" alt="Tek Com" style="height:38px; width:auto; display:block;">
      </div>
      <div style="flex:1; display:flex; align-items:center; justify-content:center; padding:14px 20px;">
        <div style="font-weight:800; font-size:18px; color:var(--text); text-align:center;">CONTROL DE FALLAS PENDIENTES NOC</div>
      </div>
      <div style="border-left:1px solid var(--border); padding:10px 20px; font-size:12px; line-height:1.7; white-space:nowrap;">
        <div><strong>Código:</strong> NOC-FO-014</div>
        <div><strong>Versión:</strong> 1.1</div>
        <div><strong>Fecha de versión:</strong> 18/07/2023</div>
      </div>
    </div>
  `;
}

function plCuadrillaDePlantilla(p){
  if(!p || !p.team_lider) return '';
  const persona = allPeople.find(per => per.nombre === p.team_lider);
  return (persona && persona.cuadrilla) || '';
}
function plChipEstado(estadoCalc){
  if(estadoCalc === 'finalizado') return '<span class="badge" style="background:#DCFCE7;color:#16A34A;">● Finalizado</span>';
  if(estadoCalc === 'escalado') return '<span class="badge" style="background:#FEE2E2;color:#DC2626;">● Escalado</span>';
  if(estadoCalc === 'pausado') return '<span class="badge" style="background:#FEF3C7;color:#B45309;">● Pausado</span>';
  return '<span class="badge" style="background:#FEF3C7;color:#92400E;">● En Proceso</span>';
}

function plMomentoUltimoAvance(p){
  const avances = p.avances || [];
  let fecha, hora;
  if(avances.length > 0){
    const ultimo = avances[avances.length - 1];
    fecha = ultimo.fecha; hora = ultimo.hora;
  } else {
    fecha = p.ticket_fecha; hora = p.ticket_hora;
  }
  if(!fecha) return null;
  const momento = new Date(`${fecha}T${plHHMM(hora)}:00`);
  if(isNaN(momento.getTime())) return null;
  return momento;
}

function plMinutosSinActualizar(p){
  const momento = plMomentoUltimoAvance(p);
  if(!momento) return null;
  return (Date.now() - momento.getTime()) / 60000;
}

function plEstaDesatendido(p){
  if(plEstadoDePlantilla(p) !== 'abierto') return false;
  // Un caso que está en Pendiente Movistar / Pendiente Tek Com / Programado está en espera
  // a propósito: no se le exige actualización ni debe salir en el panel flotante.
  if(p.estatus_activo && PL_ESTATUS_EN_ESPERA.includes(p.estatus_valor)) return false;
  const minutos = plMinutosSinActualizar(p);
  return minutos !== null && minutos >= 35;
}

function plRenderListaFiltrada(){
  const proyecto = document.getElementById('plFiltroProyecto').value;
  const estado = document.getElementById('plFiltroEstado').value;
  const busq = document.getElementById('plFiltroBuscar').value.trim().toLowerCase();

  const filtradas = plListaCache.filter(p => {
    // Un caso creado desde Estatus como "Pendiente Movistar/Tek Com/Programado" (sin avances aún)
    // no es una plantilla real todavía. Pero si ya quedó "En Proceso", sí cuenta como plantilla
    // real desde ya, aunque todavía no tenga ningún avance registrado.
    const esBorradorSinPlantilla = (p.avances || []).length === 0 && p.estatus_activo && p.estatus_valor !== 'en_proceso';
    if(esBorradorSinPlantilla) return false;
    if(proyecto && p.modulo !== proyecto) return false;
    if(estado && plEstadoDePlantilla(p) !== estado) return false;
    if(busq){
      const campo = `${p.no_ticket||''} ${p.cliente_sitio||''} ${p.operador_tekcom||''} ${p.operador_telco||''} ${p.team_lider||''}`.toLowerCase();
      if(!campo.includes(busq)) return false;
    }
    return true;
  });

  // En Proceso/Escalado primero, luego Pausado/Programado, y Finalizado al final;
  // dentro de cada grupo, el más reciente primero.
  const prioridadEstado = { abierto:0, escalado:0, pausado:1, finalizado:2 };
  filtradas.sort((a, b) => {
    const pa = prioridadEstado[plEstadoDePlantilla(a)] ?? 1;
    const pb = prioridadEstado[plEstadoDePlantilla(b)] ?? 1;
    if(pa !== pb) return pa - pb;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const wrap = document.getElementById('plListaWrap');
  if(filtradas.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        <div class="empty-title">Sin plantillas registradas</div>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Ticket</th>
          <th>Proyecto</th>
          <th>Cliente / Sitio</th>
          <th>Último avance</th>
          <th>Estado</th>
          <th>Técnico</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${filtradas.map(p => {
          const estadoCalc = plEstadoDePlantilla(p);
          const avances = p.avances || [];
          const ultimo = avances[avances.length - 1];
          const descLarga = (ultimo && ultimo.descripcion) ? ultimo.descripcion : '';
          const ultimoTxt = descLarga ? escapeHtml(descLarga.slice(0,60)) + (descLarga.length > 60 ? '...' : '') : '—';
          const tecnicoTxt = p.team_lider ? escapeHtml(p.team_lider) : '—';
          const desatendido = plEstaDesatendido(p);
          const alertaHtml = desatendido
            ? `<span class="badge" style="background:#FEE2E2; color:#DC2626; margin-left:6px;" title="Sin actualizar hace más de 1 hora">⚠ Sin actualizar</span>`
            : '';
          const tienePlantillaReal = (p.avances || []).length > 0;
          const momentoUltimo = tienePlantillaReal ? plMomentoUltimoAvance(p) : null;
          const cronometroHtml = (estadoCalc === 'abierto' && momentoUltimo)
            ? `<div style="margin-top:4px;"><span class="pl-cronometro" data-pl-cron-id="${p.id}" data-pl-cron-ts="${momentoUltimo.getTime()}">--:--:--</span></div>`
            : '';
          const slaInfo = tienePlantillaReal ? plCalcularSlaActivo(p) : null;
          const slaCongelado = !!(slaInfo && (estadoCalc === 'finalizado' || slaInfo.pausadoAhora));
          const slaHtml = (slaInfo && (!slaInfo.pausadoAhora || estadoCalc === 'finalizado'))
            ? `<div style="margin-top:2px; font-size:11px; color:var(--text-dim);">SLA: <span class="pl-sla-cronometro" data-pl-sla-id="${p.id}" data-pl-sla-base-ms="${slaInfo.baseMs}" data-pl-sla-desde-ms="${slaInfo.desdeMs}" data-pl-sla-congelado="${slaCongelado ? '1' : '0'}" data-pl-sla-ms-congelado="${slaInfo.ms}">--:--:--</span></div>`
            : '';
          return `
            <tr>
              <td style="font-weight:600;">${escapeHtml(p.no_ticket || '—')}</td>
              <td>${escapeHtml(plEtiquetaProyecto(p.modulo))}</td>
              <td>${escapeHtml(p.cliente_sitio || '—')}</td>
              <td style="max-width:260px; font-size:12.5px; color:var(--text-dim); white-space:normal; overflow-wrap:break-word;">${ultimoTxt}</td>
              <td>${(estadoCalc === 'pausado' && ultimo && ultimo.estado === 'programado') ? '<span class="badge" style="background:#DCFCE7;color:#166534;">● Programado</span>' : plChipEstado(estadoCalc)}${alertaHtml}${cronometroHtml}${slaHtml}</td>
              <td style="font-size:12.5px;">${tecnicoTxt}</td>
              <td style="text-align:right;">
                <button class="btn btn-ghost" data-ver-plantilla="${p.id}" style="padding:6px 12px; font-size:12.5px;">Ver / Continuar</button>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  wrap.querySelectorAll('[data-ver-plantilla]').forEach(btn => {
    btn.addEventListener('click', () => plAbrirDetalle(Number(btn.dataset.verPlantilla)));
  });
}

document.getElementById('plFiltroProyecto').addEventListener('change', plRenderListaFiltrada);

function plActualizarTopbarSegunTab(esEstatus){
  const topbarTitle = document.getElementById('topbarTitle');
  if(topbarTitle) topbarTitle.style.display = esEstatus ? 'none' : '';
}

document.querySelectorAll('.pl-tab-proyecto').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.pl-tab-proyecto').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const esEstatus = tab.dataset.plTabProyecto === 'estatus';
    const barraSuperior = document.getElementById('plBarraSuperior');
    const filtrosBar = document.getElementById('plFiltrosBar');
    if(barraSuperior) barraSuperior.style.display = esEstatus ? 'none' : '';
    if(filtrosBar) filtrosBar.style.display = esEstatus ? 'none' : '';
    plActualizarTopbarSegunTab(esEstatus);

    if(esEstatus){
      plRenderEstatusLista();
    } else {
      document.getElementById('plFiltroProyecto').value = tab.dataset.plTabProyecto;
      plRenderListaFiltrada();
      plActualizarBotonNuevaPlantilla();
    }
  });
});
document.getElementById('plFiltroEstado').addEventListener('change', plRenderListaFiltrada);
document.getElementById('plFiltroBuscar').addEventListener('input', plRenderListaFiltrada);

function plEtiquetaEstadoAvance(estado){
  const mapa = {
    normal:     { texto:'Normal',      bg:'#E5E7EB', color:'#374151' },
    pausado:    { texto:'Pausado',     bg:'#FEF3C7', color:'#B45309' },
    programado: { texto:'Programado',  bg:'#DCFCE7', color:'#166534' },
    despausado: { texto:'Retomado',  bg:'#E0F2FE', color:'#0369A1' },
    escalado:   { texto:'Escalado',    bg:'#FEE2E2', color:'#DC2626' },
    finalizado: { texto:'Finalizado',  bg:'#DCFCE7', color:'#16A34A' }
  };
  const e = mapa[estado] || mapa.normal;
  return `<span class="badge" style="background:${e.bg};color:${e.color};">${e.texto}</span>`;
}

function plFormatearDuracion(minutosTotales){
  if(minutosTotales < 60) return `${Math.round(minutosTotales)} min`;
  return `${(minutosTotales / 60).toFixed(1)} hr`;
}

function plTiempoTranscurrido(fecha, hora){
  if(!fecha) return '';
  const inicio = new Date(`${fecha}T${plHHMM(hora)}:00`);
  if(isNaN(inicio.getTime())) return '';
  const minutos = (Date.now() - inicio.getTime()) / 60000;
  if(minutos < 0) return '';
  return `<span class="badge" style="background:var(--surface-2); color:var(--text-dim);">${plFormatearDuracion(minutos)}</span>`;
}

function plDuracionPausaHtml(avances, indiceOriginal){
  if(indiceOriginal <= 0) return '';
  const actual = avances[indiceOriginal];
  const anterior = avances[indiceOriginal - 1];
  if(!actual || !anterior) return '';
  if(actual.estado !== 'despausado' || (anterior.estado !== 'pausado' && anterior.estado !== 'programado')) return '';
  const inicio = new Date(`${anterior.fecha}T${plHHMM(anterior.hora)}:00`);
  const fin = new Date(`${actual.fecha}T${plHHMM(actual.hora)}:00`);
  if(isNaN(inicio.getTime()) || isNaN(fin.getTime())) return '';
  const minutos = (fin.getTime() - inicio.getTime()) / 60000;
  if(minutos < 0) return '';
  const texto = anterior.estado === 'programado' ? 'Estuvo programado' : 'Estuvo pausado';
  return `<span class="badge" style="background:#FEF3C7; color:#B45309;">${texto} ${plFormatearDuracion(minutos)}</span>`;
}

function plMaterialesResumenHtml(materiales){
  if(!materiales) return '';
  const usados = Object.entries(materiales).filter(([, cant]) => Number(cant) > 0);
  if(usados.length === 0) return '';
  const catalogoMap = Object.fromEntries(MATERIALES_CATALOGO);
  const nombresPorCol = Object.fromEntries(MATERIALES_CATALOGO.map(([label, col]) => [col, label]));
  const texto = usados.map(([col, cant]) => `${escapeHtml(nombresPorCol[col] || col)}: ${cant}`).join(', ');
  return `<div style="font-size:11.5px; color:var(--text-faint); margin-top:2px;">📦 Materiales: ${texto}</div>`;
}

// ============================================================
// PREFIJOS ALEATORIOS PARA LA DESCRIPCIÓN DE AVANCES
// Se precarga uno al azar en el campo de descripción para dar
// variedad a la redacción de la bitácora. El operador puede
// borrarlo o cambiarlo libremente antes de guardar.
// ============================================================
const PL_PREFIJOS_AVANCE = [
  'Personal técnico informa:',
  'Técnico de campo indica:',
  'Personal técnico menciona:',
  'Personal técnico reporta:',
  'Técnico en sitio comunica:',
  'Cuadrilla en sitio informa:',
  'Personal técnico notifica:',
  'Técnico de campo reporta:',
  'Personal en sitio indica:',
  'Cuadrilla asignada menciona:',
  'Técnico responsable informa:',
  'Personal técnico confirma:',
];

function plPrefijoAvanceAleatorio(){
  const i = Math.floor(Math.random() * PL_PREFIJOS_AVANCE.length);
  return PL_PREFIJOS_AVANCE[i] + ' ';
}

function plPrecargarPrefijoAvance(){
  const campo = document.getElementById('plNuevoAvanceDescripcion');
  if(!campo) return;
  campo.value = plPrefijoAvanceAleatorio();
}

// ============================================================
// MARCA DE VALIDACIÓN
// Una plantilla puede señalar explícitamente qué fecha/hora se tomará como
// "Solicitud | Validación-Movistar" en el caso. Se muestra destacada en el
// detalle para que no haya duda de cuál momento se está usando.
// ============================================================
// Devuelve la banda de una marca concreta (Movistar o Hyve).
function plBannerUnaValidacion(fecha, hora, etiquetaCampo, esHyve){
  if(!fecha){
    return `<div style="margin-top:8px; padding:9px 12px; border-radius:8px; background:#F1F5F9; color:#64748B; font-size:12.5px;">
      ⚑ Sin marca para <strong>${etiquetaCampo}</strong> <em>(opcional)</em>.
    </div>`;
  }
  // Sin color: el código de color vive en las banderitas de la línea de tiempo.
  return `<div style="margin-top:8px; padding:9px 12px; border-radius:8px; background:var(--surface-2); border:1px solid var(--border); color:var(--text); font-size:13px; font-weight:600;">
    ⚑ ${escapeHtml(etiquetaCampo)}: ${escapeHtml(plFormatearFechaDDMMYYYY(fecha))} a las ${escapeHtml(plHHMM(hora))} horas
  </div>`;
}

function plBannerValidacion(p){
  if(p && (p.modulo === 'hyve' || p.modulo === 'cable')){
    return plBannerUnaValidacion(p.validacion_fecha, p.validacion_hora, 'Se solicitó validar');
  }
  let html = plBannerUnaValidacion(p && p.validacion_fecha, p && p.validacion_hora, 'Solicitud | Validación-Movistar');
  // Solo las plantillas de Movistar manejan además la validación Hyve.
  if(p && p.modulo === 'casos'){
    html += plBannerUnaValidacion(p.validacion_hyve_fecha, p.validacion_hyve_hora, 'Solicitud de Validación Hyve', true);
    // La marca de fin solo se muestra si ya se pidió la validación.
    if(p.validacion_hyve_fecha){
      html += plBannerUnaValidacion(p.validacion_hyve_fin_fecha, p.validacion_hyve_fin_hora, 'Fecha de Validación Hyve', true);
      html += plBannerTiempoHyve(p);
    }
  }
  if(p && p.modulo === 'casos') html += plBannerAccesoSitio(p);
  return html;
}

// Estado de acceso al sitio: siempre visible, porque el caso siempre lleva SI o NO.
function plBannerAccesoSitio(p){
  const tiene = !!(p && p.acceso_sitio_fecha);
  const detalle = tiene
    ? `: ${escapeHtml(plFormatearFechaDDMMYYYY(p.acceso_sitio_fecha))} a las ${escapeHtml(plHHMM(p.acceso_sitio_hora))} horas`
    : '';
  return `<div style="margin-top:8px; padding:9px 12px; border-radius:8px; background:var(--surface-2); border:1px solid var(--border); color:var(--text); font-size:12.5px; font-weight:${tiene ? '600' : '400'};">
    ⌂ Acceso a sitio: <strong>${tiene ? 'SI' : 'NO'}</strong>${detalle}
  </div>`;
}

// Muestra la resta ya calculada, para verla sin esperar al cierre del caso.
function plBannerTiempoHyve(p){
  if(!p.validacion_hyve_fecha || !p.validacion_hyve_fin_fecha) return '';
  const ini = new Date(`${p.validacion_hyve_fecha}T${plHHMM(p.validacion_hyve_hora)}:00`);
  const fin = new Date(`${p.validacion_hyve_fin_fecha}T${plHHMM(p.validacion_hyve_fin_hora)}:00`);
  if(isNaN(ini.getTime()) || isNaN(fin.getTime())) return '';
  const txt = minutesToHHMM((fin - ini) / 60000);
  // Sin color: es un resultado calculado, no una marca. El azul se reserva
  // para Movistar y el verde para Hyve.
  return `<div style="margin-top:8px; padding:9px 12px; border-radius:8px; background:var(--surface-2); border:1px solid var(--border); color:var(--text); font-size:13px; font-weight:700;">
    ⏱ Tiempo de Validación Hyve: ${escapeHtml(txt)}
  </div>`;
}


// Marca (o desmarca) el avance indicado como la fecha/hora de validación.
// Solo puede haber uno marcado: seleccionar otro reemplaza al anterior.
function plAlternarValidacionAvance(indice, destino){
  plValidacionDestino = destino || 'movistar';
  const cfg = PL_VALIDACION_CAMPOS[plValidacionDestino];
  const id = Number(document.getElementById('plDetalleId').value);
  const p = plListaCache.find(x => x.id === id);
  if(!p || !cfg) return;
  if(plEsSoloLectura(p)){
    showToast('Este caso está en solo lectura. Cambia el Estatus a "En Proceso" para marcar la validación.', 'error');
    return;
  }
  const av = (p.avances || [])[indice];
  if(!av) return;

  const yaMarcado = p[cfg.fecha] === av.fecha && plHHMM(p[cfg.hora]) === plHHMM(av.hora);
  if(yaMarcado){
    plGuardarValidacion(null, null);
    return;
  }
  // El fin de validación Hyve no puede ser anterior a la solicitud.
  if(plValidacionDestino === 'hyve_fin' && p.validacion_hyve_fecha){
    const ini = new Date(`${p.validacion_hyve_fecha}T${plHHMM(p.validacion_hyve_hora)}:00`).getTime();
    const fin = new Date(`${av.fecha}T${plHHMM(av.hora)}:00`).getTime();
    if(!isNaN(ini) && !isNaN(fin) && fin < ini){
      plMostrarErrorCentro('Este avance es anterior al momento en que se solicitó la validación a Hyve. Elige un avance posterior.');
      return;
    }
  }
  plGuardarValidacion(av.fecha, plHHMM(av.hora));
}

// 'movistar' | 'hyve' — a qué par de columnas escribe el modal abierto.
let plValidacionDestino = 'movistar';

const PL_VALIDACION_CAMPOS = {
  movistar:       { fecha:'validacion_fecha',          hora:'validacion_hora',          etiqueta:'Solicitud | Validación-Movistar' },
  // Hyve lleva DOS marcas independientes: cuándo se le pidió la validación y
  // cuándo la terminó. El tiempo de Hyve es la resta entre ambas.
  hyve_solicitud: { fecha:'validacion_hyve_fecha',     hora:'validacion_hyve_hora',     etiqueta:'Solicitud de Validación Hyve' },
  hyve_fin:       { fecha:'validacion_hyve_fin_fecha', hora:'validacion_hyve_fin_hora', etiqueta:'Fecha de Validación Hyve' },
  // No es una validación: marca el avance en que se obtuvo acceso al sitio.
  // Al caso solo le llega SI/NO; la fecha se guarda para saber qué avance resaltar.
  acceso_sitio:   { fecha:'acceso_sitio_fecha',        hora:'acceso_sitio_hora',        etiqueta:'Acceso a sitio' },
};

function plAbrirValidacionModal(destino){
  plValidacionDestino = destino || 'movistar';
  const cfg = PL_VALIDACION_CAMPOS[plValidacionDestino];
  const id = Number(document.getElementById('plDetalleId').value);
  const p = plListaCache.find(x => x.id === id);
  if(!p) return;
  if(plEsSoloLectura(p)){
    showToast('Este caso está en solo lectura. Cambia el Estatus a "En Proceso" para marcar la validación.', 'error');
    return;
  }
  const ahora = new Date();
  document.getElementById('plValidacionModalTitulo').textContent = `Marcar ${cfg.etiqueta}`;
  document.getElementById('plValidacionModalCampo').textContent = cfg.etiqueta;
  document.getElementById('plValidacionFecha').value = p[cfg.fecha] || plFechaLocalISO(ahora);
  document.getElementById('plValidacionHora').value = p[cfg.hora] ? plHHMM(p[cfg.hora]) : ahora.toTimeString().slice(0,5);
  document.getElementById('plValidacionQuitarBtn').style.display = p[cfg.fecha] ? '' : 'none';
  document.getElementById('plValidacionModalOverlay').classList.add('active');
}

async function plGuardarValidacion(fecha, hora){
  const id = Number(document.getElementById('plDetalleId').value);
  const p = plListaCache.find(x => x.id === id);
  if(!p) return;
  try{
    const cfg = PL_VALIDACION_CAMPOS[plValidacionDestino] || PL_VALIDACION_CAMPOS.movistar;
    const cuerpo = {};
    cuerpo[cfg.fecha] = fecha || null;
    cuerpo[cfg.hora] = hora || null;
    const res = await fetch(`${PLANTILLA_REST_URL}?id=eq.${id}`, {
      method:'PATCH',
      headers:{ ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify(cuerpo)
    });
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al guardar la validación'); }
    const actualizado = (await res.json())[0];
    const i = plListaCache.findIndex(x => x.id === id);
    if(i >= 0) plListaCache[i] = actualizado;
    document.getElementById('plValidacionModalOverlay').classList.remove('active');
    plAbrirDetalle(id);
    showToast(fecha ? 'Fecha de validación marcada' : 'Marca de validación eliminada');
  }catch(err){
    showToast('No se pudo guardar la validación: ' + err.message, 'error');
  }
}

// Botones de marca de un avance: validación Movistar, solicitud a Hyve y fin de
// validación Hyve. Los de Hyve solo aplican a plantillas de Movistar, y el de fin
// aparece únicamente cuando ya se marcó la solicitud.
function plBotonesValidacionAvance(p, av, indice, soloLectura){
  if(!p) return '';
  const coincide = (f, h) => !!(f && f === av.fecha && plHHMM(h) === plHHMM(av.hora));
  const bandera = '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line>';
  const cheque = '<polyline points="20 6 9 17 4 12"></polyline>';
  const casita = '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>';

  // Movistar = azul, Hyve = verde. El color se aplica también sin marcar,
  // para poder distinguir los botones de un vistazo.
  const AZUL  = { base:'#2563EB', fondo:'#DBEAFE', borde:'#93C5FD', texto:'#1E40AF' };
  const VERDE = { base:'#16A34A', fondo:'#DCFCE7', borde:'#86EFAC', texto:'#166534' };
  const ROJO  = { base:'#DC2626', fondo:'#FEE2E2', borde:'#FCA5A5', texto:'#991B1B' };

  const boton = (destino, marcado, titulo, c, icono) => `
    <button type="button" class="icon-btn" data-validacion-avance="${indice}" data-validacion-destino="${destino}"
      title="${titulo}"
      style="color:${marcado ? c.texto : c.base};${marcado ? `background:${c.fondo};border-color:${c.borde};` : ''}${soloLectura ? 'opacity:.4;cursor:not-allowed;' : ''}">
      <svg viewBox="0 0 24 24" fill="${marcado ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;">${icono}</svg>
    </button>`;

  // Hyve y Cable Color solo marcan el momento en que se solicitó la validación:
  // no manejan acceso a sitio ni la doble validación de Movistar.
  if(p.modulo === 'hyve' || p.modulo === 'cable'){
    return boton('movistar', coincide(p.validacion_fecha, p.validacion_hora),
      'Momento en que se solicitó validar', AZUL, bandera);
  }

  // La casita va primero: marca en qué avance se obtuvo acceso al sitio.
  let html = boton('acceso_sitio', coincide(p.acceso_sitio_fecha, p.acceso_sitio_hora),
    'Acceso a sitio: en este avance se obtuvo el acceso (el caso quedará en SI)', ROJO, casita);

  html += boton('movistar', coincide(p.validacion_fecha, p.validacion_hora),
    'Validación Movistar: usar la fecha y hora de este avance', AZUL, bandera);

  if(p.modulo === 'casos'){
    html += boton('hyve_solicitud', coincide(p.validacion_hyve_fecha, p.validacion_hyve_hora),
      'Solicitud a Hyve: se pidió la validación en este avance', VERDE, bandera);
    if(p.validacion_hyve_fecha){
      html += boton('hyve_fin', coincide(p.validacion_hyve_fin_fecha, p.validacion_hyve_fin_hora),
        'Hyve terminó de validar en este avance', VERDE, cheque);
    }
  }
  return html;
}

// ============================================================
// FILTRO "SOLO CAMPOS PENDIENTES" DEL FORMULARIO DE CASOS
// Oculta los campos que ya tienen dato para no tener que recorrer
// todo el formulario buscando lo que falta.
// ============================================================
function casoCampoTieneValor(campo){
  const controles = campo.querySelectorAll('input, select, textarea');
  if(!controles.length) return true; // sin control propio: no se oculta
  for(const c of controles){
    if(c.type === 'checkbox' || c.type === 'radio') return true; // siempre tienen estado
    if(String(c.value || '').trim() !== '') return true;
  }
  return false;
}

function casoAplicarFiltroVacios(){
  const activo = document.getElementById('casoSoloVacios')?.checked;
  const form = document.getElementById('casoForm');
  if(!form) return;

  let pendientes = 0;
  form.querySelectorAll('.form-field').forEach(campo => {
    const lleno = casoCampoTieneValor(campo);
    if(!lleno) pendientes++;
    campo.style.display = (activo && lleno) ? 'none' : '';
  });

  // Una sección cuyos campos quedaron todos ocultos se esconde también.
  form.querySelectorAll('.caso-form-section').forEach(seccion => {
    const visibles = Array.from(seccion.querySelectorAll('.form-field'))
      .filter(c => c.style.display !== 'none').length;
    seccion.style.display = (activo && visibles === 0) ? 'none' : '';
  });

  const cont = document.getElementById('casoSoloVaciosContador');
  if(cont){
    cont.textContent = pendientes === 0
      ? 'No hay campos pendientes'
      : `${pendientes} campo(s) pendiente(s)`;
  }
}

document.getElementById('casoSoloVacios')?.addEventListener('change', casoAplicarFiltroVacios);

// Asigna un valor a un <select> aunque no exista entre sus opciones.
// Los datos que vienen de plantillas pueden traer valores fuera del catálogo
// (por ejemplo "Interurbano" cuando la lista dice "Interurbanos"); sin esto el
// campo se veía vacío al editar y el dato se perdía al guardar.
function setSelectValorTolerante(id, valor){
  const sel = document.getElementById(id);
  if(!sel) return;
  // Quitar la opción externa del caso anterior, para que no se acumulen.
  Array.from(sel.options)
    .filter(o => o.dataset.valorExterno === '1')
    .forEach(o => o.remove());
  const v = valor || '';
  if(v && !Array.from(sel.options).some(o => o.value === v)){
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = `${v} (valor actual)`;
    opt.dataset.valorExterno = '1';
    sel.appendChild(opt);
  }
  sel.value = v;
}

// Mantiene el texto del interruptor de "Acceso a sitio" en SI / NO.
function plActualizarTextoAccesoSitio(){
  const chk = document.getElementById('c_acceso_sitio');
  const txt = document.getElementById('c_acceso_sitio_texto');
  if(!chk || !txt) return;
  txt.textContent = chk.checked ? 'SI' : 'NO';
  txt.style.color = chk.checked ? '#16A34A' : '#DC2626';
}
document.getElementById('c_acceso_sitio').addEventListener('change', plActualizarTextoAccesoSitio);

function plRenderTimeline(avances){
  const cont = document.getElementById('plDetalleTimeline');
  if(!avances || avances.length === 0){
    cont.innerHTML = `<div class="empty-state" style="padding:14px;"><div class="empty-title">Sin avances todavía</div></div>`;
    return;
  }
  // Plantilla actual, para saber qué avance está marcado como validación.
  const idActualTl = Number(document.getElementById('plDetalleId').value);
  const pActualTl = idActualTl ? plListaCache.find(x => x.id === idActualTl) : null;
  const soloLecturaTl = plEsSoloLectura(pActualTl);

  const ordenDesc = [...avances].reverse();
  cont.innerHTML = ordenDesc.map((av, i) => {
    const numero = avances.length - i;
    const esMasReciente = i === 0;
    const indiceOriginal = avances.length - 1 - i;
    const creadoPor = av.operador_tekcom ? `Creado por: ${escapeHtml(av.operador_tekcom)}` : '';
    return `
      <div style="display:flex; gap:12px; padding:10px 0; border-bottom:1px solid var(--border);">
        <div style="min-width:32px; height:32px; border-radius:50%; background:var(--surface-2); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; color:var(--text-dim);">${numero}</div>
        <div style="flex:1;">
          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:12px; color:var(--text-dim); margin-bottom:3px;">
            <span>${escapeHtml(av.fecha||'')} ${escapeHtml(av.hora||'')}</span>
            ${plEtiquetaEstadoAvance(av.estado)}
            ${plDuracionPausaHtml(avances, indiceOriginal)}
            ${esMasReciente ? plTiempoTranscurrido(av.fecha, av.hora) : ''}
          </div>
          <div style="font-size:13.5px; margin-bottom:2px;">${escapeHtml(av.descripcion||'')}</div>
          ${creadoPor ? `<div style="font-size:11.5px; color:var(--text-faint);">${creadoPor}</div>` : ''}
          ${plMaterialesResumenHtml(av.materiales)}
        </div>
        <div style="display:flex; gap:4px; align-items:flex-start;">
          ${plBotonesValidacionAvance(pActualTl, av, indiceOriginal, soloLecturaTl)}
          <button type="button" class="icon-btn" data-editar-avance="${indiceOriginal}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"></path></svg>
          </button>
          <button type="button" class="icon-btn danger" data-eliminar-avance="${indiceOriginal}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  cont.querySelectorAll('[data-validacion-avance]').forEach(btn => {
    btn.addEventListener('click', () => plAlternarValidacionAvance(
      Number(btn.dataset.validacionAvance), btn.dataset.validacionDestino
    ));
  });
  cont.querySelectorAll('[data-editar-avance]').forEach(btn => {
    btn.addEventListener('click', () => plEditarAvance(Number(btn.dataset.editarAvance)));
  });
  cont.querySelectorAll('[data-eliminar-avance]').forEach(btn => {
    btn.addEventListener('click', () => plEliminarAvance(Number(btn.dataset.eliminarAvance)));
  });
}

function plAbrirDetalle(id){
  const p = plListaCache.find(x => x.id === id);
  if(!p) return;
  document.getElementById('plDetalleId').value = p.id;
  // La validación Hyve solo aplica a los casos de Movistar.
  const esMovistar = p.modulo === 'casos';
  const btnHyve = document.getElementById('plMarcarValidacionHyveBtn');
  if(btnHyve) btnHyve.style.display = esMovistar ? '' : 'none';
  // El botón de fin solo aparece una vez que se marcó la solicitud a Hyve.
  const btnHyveFin = document.getElementById('plMarcarValidacionHyveFinBtn');
  if(btnHyveFin) btnHyveFin.style.display = (esMovistar && p.validacion_hyve_fecha) ? '' : 'none';
  document.getElementById('plDetalleResumen').innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px;">
      <div><strong>Ticket:</strong> ${escapeHtml(p.no_ticket||'—')}</div>
      <div><strong>Proyecto:</strong> ${escapeHtml(plEtiquetaProyecto(p.modulo))}</div>
      <div><strong>Cliente/Sitio:</strong> ${escapeHtml(p.cliente_sitio||'—')}</div>
      <div><strong>${plEtiquetaOperadorCliente(p.modulo)}:</strong> ${escapeHtml(p.operador_telco||'—')}</div>
      <div><strong>Operador Tekcom:</strong> ${escapeHtml(p.operador_tekcom||'—')}</div>
      <div><strong>Team Líder:</strong> ${escapeHtml(p.team_lider||'—')}</div>
      <div><strong>Tipo de Afectación:</strong> ${escapeHtml(p.tipo_afectacion||'—')}</div>
    </div>
    ${plBannerValidacion(p)}
  `;
  plRenderTimeline(p.avances || []);
  plEditandoIndiceActual = null;
  document.getElementById('plDetalleGuardarAvanceBtn').textContent = 'Agregar avance';
  document.getElementById('plCancelarEdicionAvanceBtn').style.display = 'none';
  const ahora = new Date();
  document.getElementById('plNuevoAvanceFecha').value = plFechaLocalISO(ahora);
  document.getElementById('plNuevoAvanceHora').value = ahora.toTimeString().slice(0,5);
  plPrecargarPrefijoAvance();
  document.getElementById('plNuevoAvanceProgFecha').value = '';
  document.getElementById('plNuevoAvanceProgHora').value = '';
  plCargarOperadorTurno();
  plCargarMateriales();
  document.getElementById('pl_material_search').value = '';
  document.getElementById('plNuevoAvanceEstado').value = 'normal';

  plActualizarEstadoFormularioAvance();

  const btnQuitarEstatus = document.getElementById('plQuitarEstatusBtn');
  if(btnQuitarEstatus) btnQuitarEstatus.style.display = p.estatus_activo ? '' : 'none';

  plRenderImagenes(p.imagenes || []);

  document.getElementById('plDetalleModalOverlay').classList.add('active');
}

// ============================================================
// IMÁGENES DEL TICKET (una sola galería por plantilla, guardada
// en Supabase Storage, bucket "plantillas-imagenes")
// ============================================================
const PL_IMAGENES_BUCKET = 'plantillas-imagenes';
const PL_IMAGENES_STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/${PL_IMAGENES_BUCKET}`;
const PL_IMAGENES_PUBLIC_URL = `${SUPABASE_URL}/storage/v1/object/public/${PL_IMAGENES_BUCKET}`;

function plRenderImagenes(imagenes){
  const grid = document.getElementById('plImagenesGrid');
  // En solo lectura las imágenes se ven pero no se agregan ni se borran.
  const idActual = Number(document.getElementById('plDetalleId').value);
  const pActual = idActual ? plListaCache.find(x => x.id === idActual) : null;
  const soloLectura = plEsSoloLectura(pActual);
  const btnAgregar = document.getElementById('plImagenesAgregarBtn');
  if(btnAgregar) btnAgregar.style.display = soloLectura ? 'none' : '';
  if(!imagenes || imagenes.length === 0){
    grid.innerHTML = '<div style="font-size:12.5px; color:var(--text-dim);">Sin imágenes todavía.</div>';
    return;
  }
  grid.innerHTML = imagenes.map((url, idx) => `
    <div class="pl-imagen-thumb" style="position:relative; width:90px; height:90px;">
      <img src="${escapeHtml(url)}" data-pl-imagen-ver="${idx}" style="width:100%; height:100%; object-fit:cover; border-radius:8px; border:1px solid var(--border); cursor:pointer;">
      <button type="button" data-pl-imagen-borrar="${idx}" title="Eliminar" style="${soloLectura ? 'display:none;' : ''} position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; background:#DC2626; color:#fff; border:2px solid #fff; cursor:pointer; font-size:11px; line-height:1; display:flex; align-items:center; justify-content:center; padding:0;">✕</button>
    </div>
  `).join('');

  grid.querySelectorAll('[data-pl-imagen-ver]').forEach(img => {
    img.addEventListener('click', () => plVerImagenCompleta(imagenes[Number(img.dataset.plImagenVer)]));
  });
  grid.querySelectorAll('[data-pl-imagen-borrar]').forEach(btn => {
    btn.addEventListener('click', () => plEliminarImagen(Number(btn.dataset.plImagenBorrar)));
  });
}

function plVerImagenCompleta(url){
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed; inset:0; z-index:100000; background:rgba(0,0,0,.85); display:flex; align-items:center; justify-content:center; cursor:zoom-out;';
  overlay.innerHTML = `<img src="${escapeHtml(url)}" style="max-width:92%; max-height:92%; border-radius:6px; box-shadow:0 10px 40px rgba(0,0,0,.5);">`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

async function plSubirImagen(file){
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const nombreArchivo = `${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`;
  const res = await fetch(`${PL_IMAGENES_STORAGE_URL}/${nombreArchivo}`, {
    method:'POST',
    headers:{ 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': file.type || 'application/octet-stream' },
    body: file
  });
  if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al subir la imagen'); }
  return `${PL_IMAGENES_PUBLIC_URL}/${nombreArchivo}`;
}

document.getElementById('plImagenesAgregarBtn').addEventListener('click', () => {
  const id = Number(document.getElementById('plDetalleId').value);
  const p = id ? plListaCache.find(x => x.id === id) : null;
  if(plEsSoloLectura(p)){
    showToast('Este caso está en solo lectura. Cambia el Estatus a "En Proceso" para poder agregar imágenes.', 'error');
    return;
  }
  document.getElementById('plImagenesInput').click();
});

document.getElementById('plImagenesInput').addEventListener('change', async (e) => {
  const archivos = Array.from(e.target.files || []);
  if(archivos.length === 0) return;
  const id = Number(document.getElementById('plDetalleId').value);
  const p = plListaCache.find(x => x.id === id);
  if(!p){ e.target.value = ''; return; }
  if(plEsSoloLectura(p)){ e.target.value = ''; showToast('Este caso está en solo lectura.', 'error'); return; }

  const btn = document.getElementById('plImagenesAgregarBtn');
  const textoOriginal = btn.innerHTML;
  btn.textContent = 'Subiendo...';
  btn.disabled = true;
  try{
    const urls = [];
    for(const archivo of archivos){
      const url = await plSubirImagen(archivo);
      urls.push(url);
    }
    const imagenesActuales = p.imagenes || [];
    const imagenesNuevas = [...imagenesActuales, ...urls];
    const res = await fetch(`${PLANTILLA_REST_URL}?id=eq.${id}`, {
      method:'PATCH',
      headers:{ ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify({ imagenes: imagenesNuevas })
    });
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al guardar la imagen'); }
    const actualizado = (await res.json())[0];
    const idx = plListaCache.findIndex(x => x.id === id);
    if(idx >= 0) plListaCache[idx] = actualizado;
    plRenderImagenes(actualizado.imagenes || []);
    showToast(urls.length > 1 ? 'Imágenes agregadas' : 'Imagen agregada');
  }catch(err){
    showToast('No se pudo subir la imagen: ' + err.message, 'error');
  }finally{
    btn.innerHTML = textoOriginal;
    btn.disabled = false;
    e.target.value = '';
  }
});

async function plEliminarImagen(idx){
  const id = Number(document.getElementById('plDetalleId').value);
  const p = plListaCache.find(x => x.id === id);
  if(!p) return;
  if(plEsSoloLectura(p)){
    showToast('Este caso está en solo lectura. Cambia el Estatus a "En Proceso" para poder eliminar imágenes.', 'error');
    return;
  }
  const imagenesActuales = p.imagenes || [];
  const imagenesNuevas = imagenesActuales.filter((_, i) => i !== idx);
  try{
    const res = await fetch(`${PLANTILLA_REST_URL}?id=eq.${id}`, {
      method:'PATCH',
      headers:{ ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify({ imagenes: imagenesNuevas })
    });
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al eliminar la imagen'); }
    const actualizado = (await res.json())[0];
    const idxCache = plListaCache.findIndex(x => x.id === id);
    if(idxCache >= 0) plListaCache[idxCache] = actualizado;
    plRenderImagenes(actualizado.imagenes || []);
    showToast('Imagen eliminada');
  }catch(err){
    showToast('No se pudo eliminar la imagen: ' + err.message, 'error');
  }
}

// Un caso cuyo estatus en el tablero NO es "En Proceso" (Pendiente Movistar,
// Pendiente Tek Com o Programado) se abre en modo lectura: no se pueden agregar
// ni editar avances hasta que se regrese a "En Proceso" desde el Estatus.
function plEsSoloLectura(p){
  return !!(p && p.estatus_activo && PL_ESTATUS_EN_ESPERA.includes(p.estatus_valor));
}

function plActualizarEstadoFormularioAvance(){
  const id = Number(document.getElementById('plDetalleId').value);
  const p = plListaCache.find(x => x.id === id);
  const avances = (p && p.avances) || [];
  const ultimoAvance = avances[avances.length - 1];
  const estaPausado = ultimoAvance && (ultimoAvance.estado === 'pausado' || ultimoAvance.estado === 'programado');
  const estaFinalizado = ultimoAvance && ultimoAvance.estado === 'finalizado';
  const selectEstado = document.getElementById('plNuevoAvanceEstado');
  const avisoPausado = document.getElementById('plAvisoPausado');
  const avisoFinalizado = document.getElementById('plAvisoFinalizado');
  const camposNuevoAvance = document.getElementById('plCamposNuevoAvance');
  const btnGuardar = document.getElementById('plDetalleGuardarAvanceBtn');

  if(estaFinalizado && plEditandoIndiceActual === null){
    if(avisoFinalizado) avisoFinalizado.style.display = '';
    if(avisoPausado) avisoPausado.style.display = 'none';
    if(camposNuevoAvance) camposNuevoAvance.style.display = 'none';
    if(btnGuardar) btnGuardar.style.display = 'none';
    return;
  }

  if(plEsSoloLectura(p) && plEditandoIndiceActual === null){
    const etiqueta = (PL_ESTATUS_OPCIONES[p.estatus_valor] && PL_ESTATUS_OPCIONES[p.estatus_valor].label) || p.estatus_valor;
    if(avisoFinalizado) avisoFinalizado.style.display = 'none';
    if(camposNuevoAvance) camposNuevoAvance.style.display = 'none';
    if(btnGuardar) btnGuardar.style.display = 'none';
    if(avisoPausado){
      avisoPausado.style.display = '';
      avisoPausado.innerHTML = `🔒 Este caso está en <strong>${etiqueta}</strong>, por lo que se muestra en <strong>solo lectura</strong>. Cambia el Estatus a "En Proceso" para poder registrar avances.`;
    }
    return;
  }

  if(camposNuevoAvance) camposNuevoAvance.style.display = '';
  if(btnGuardar) btnGuardar.style.display = '';
  if(avisoFinalizado) avisoFinalizado.style.display = 'none';

  if(estaPausado && plEditandoIndiceActual === null){
    selectEstado.value = 'despausado';
    Array.from(selectEstado.options).forEach(opt => { opt.disabled = opt.value !== 'despausado'; });
    if(avisoPausado){
      avisoPausado.style.display = '';
      const esProgramado = ultimoAvance.estado === 'programado';
      avisoPausado.innerHTML = esProgramado
        ? '⏸ Este caso está <strong>programado</strong>. Debes registrar el avance de "Retomado" antes de poder agregar cualquier otro tipo de avance.'
        : '⏸ Este caso está <strong>pausado</strong>. Debes registrar el avance de "Retomado" antes de poder agregar cualquier otro tipo de avance.';
    }
  } else {
    Array.from(selectEstado.options).forEach(opt => { opt.disabled = false; });
    if(avisoPausado) avisoPausado.style.display = 'none';
  }
  plActualizarVisibilidadMateriales();
}

document.getElementById('plMarcarValidacionBtn').addEventListener('click', () => plAbrirValidacionModal('movistar'));
document.getElementById('plMarcarValidacionHyveBtn').addEventListener('click', () => plAbrirValidacionModal('hyve_solicitud'));
document.getElementById('plMarcarValidacionHyveFinBtn').addEventListener('click', () => plAbrirValidacionModal('hyve_fin'));
document.getElementById('plValidacionModalClose').addEventListener('click', () => {
  document.getElementById('plValidacionModalOverlay').classList.remove('active');
});
document.getElementById('plValidacionCancelBtn').addEventListener('click', () => {
  document.getElementById('plValidacionModalOverlay').classList.remove('active');
});
document.getElementById('plValidacionQuitarBtn').addEventListener('click', () => plGuardarValidacion(null, null));
document.getElementById('plValidacionGuardarBtn').addEventListener('click', () => {
  const fecha = document.getElementById('plValidacionFecha').value;
  const hora = document.getElementById('plValidacionHora').value;
  if(!fecha || !hora){
    showToast('Indica la fecha y la hora de validación', 'error');
    return;
  }
  if(plValidacionDestino === 'hyve_fin'){
    const id = Number(document.getElementById('plDetalleId').value);
    const p = plListaCache.find(x => x.id === id);
    if(p && p.validacion_hyve_fecha){
      const ini = new Date(`${p.validacion_hyve_fecha}T${plHHMM(p.validacion_hyve_hora)}:00`).getTime();
      const fin = new Date(`${fecha}T${hora}:00`).getTime();
      if(!isNaN(ini) && !isNaN(fin) && fin < ini){
        plMostrarErrorCentro('La hora en que Hyve terminó de validar no puede ser anterior a la hora en que se le solicitó la validación.');
        return;
      }
    }
  }
  plGuardarValidacion(fecha, hora);
});

document.getElementById('plDetalleModalClose').addEventListener('click', () => {
  document.getElementById('plDetalleModalOverlay').classList.remove('active');
});
document.getElementById('plDetalleModalCancel').addEventListener('click', () => {
  document.getElementById('plDetalleModalOverlay').classList.remove('active');
});

async function plActualizarEstadoCasoVinculado(modulo, casoId, estado, materiales){
  const mapUrl = { casos: CASOS_REST_URL, hyve: HYVE_REST_URL, cable: CABLE_REST_URL, udp: UDP_REST_URL };
  const restUrl = mapUrl[modulo];
  if(!restUrl) return;
  // Al finalizar la plantilla el caso NO se cierra: queda en "En Proceso" para que
  // el operador lo revise, complete lo que falte y lo pase a Finalizado a mano.
  const mapEstado = {
    casos: { finalizado:'En Proceso', escalado:'En Proceso', pausado:'Pausado', programado:'Pausado', despausado:'En Proceso' },
    hyve:  { finalizado:'En Proceso', escalado:'En Proceso', pausado:'Pausado', programado:'Pausado', despausado:'En Proceso' },
    cable: { finalizado:'En Proceso', escalado:'En Proceso', pausado:'Pausado', programado:'Pausado', despausado:'En Proceso' },
    udp:   { finalizado:'En Proceso', escalado:'En Proceso', pausado:'Pausado', programado:'Pausado', despausado:'En Proceso' }
  };
  const nuevoStatus = mapEstado[modulo] && mapEstado[modulo][estado];
  if(!nuevoStatus) return;
  const payload = { status: nuevoStatus };
  // Los materiales solo aplican en Movistar y Cable Color (comparten el mismo catálogo de columnas)
  if(estado === 'finalizado' && materiales && (modulo === 'casos' || modulo === 'cable')){
    Object.assign(payload, materiales);
  }
  try{
    await fetch(`${restUrl}?id=eq.${casoId}`, {
      method:'PATCH',
      headers: sbHeaders,
      body: JSON.stringify(payload)
    });
    if(modulo === 'casos' && typeof fetchCasos === 'function') fetchCasos();
    if(modulo === 'hyve' && typeof fetchHyve === 'function') fetchHyve();
    if(modulo === 'cable' && typeof fetchCable === 'function') fetchCable();
  }catch(e){ console.error(e); }
}

// Suma la duración total de todas las pausas/programados de la bitácora (cada tramo
// Pausado/Programado → Retomado), para llenar el campo "Intervalo" en Casos Movistar.
function plCalcularIntervaloPausas(avances){
  if(!avances || avances.length < 2) return null;
  let totalMinutos = 0;
  for(let i = 0; i < avances.length - 1; i++){
    const actual = avances[i];
    const siguiente = avances[i + 1];
    if((actual.estado === 'pausado' || actual.estado === 'programado') && siguiente.estado === 'despausado'){
      const inicio = new Date(`${actual.fecha}T${plHHMM(actual.hora)}:00`);
      const fin = new Date(`${siguiente.fecha}T${plHHMM(siguiente.hora)}:00`);
      if(!isNaN(inicio.getTime()) && !isNaN(fin.getTime())){
        const mins = (fin.getTime() - inicio.getTime()) / 60000;
        if(mins > 0) totalMinutos += mins;
      }
    }
  }
  return totalMinutos > 0 ? plFormatearDuracion(totalMinutos) : null;
}

function plCalcularIntervaloPausasMinutos(avances){
  if(!avances || avances.length < 2) return 0;
  let totalMinutos = 0;
  for(let i = 0; i < avances.length - 1; i++){
    const actual = avances[i];
    const siguiente = avances[i + 1];
    if((actual.estado === 'pausado' || actual.estado === 'programado') && siguiente.estado === 'despausado'){
      const inicio = new Date(`${actual.fecha}T${plHHMM(actual.hora)}:00`);
      const fin = new Date(`${siguiente.fecha}T${plHHMM(siguiente.hora)}:00`);
      if(!isNaN(inicio.getTime()) && !isNaN(fin.getTime())){
        const mins = (fin.getTime() - inicio.getTime()) / 60000;
        if(mins > 0) totalMinutos += mins;
      }
    }
  }
  return totalMinutos;
}

// Resumen corto (máx. 3 líneas) de la plantilla para el campo Observación de Casos Movistar.
function plResumenPlantillaParaObservacion(p, ultimoAvance){
  const linea1 = `${p.tipo_afectacion || 'Caso'}: ${p.cliente_sitio || ''}`.trim();
  const linea2 = `Técnico: ${p.team_lider || 'Pendiente Asignar Personal'}${p.operador_telco ? ` | ${plEtiquetaOperadorCliente(p.modulo)}: ` + p.operador_telco : ''}`;
  const linea3 = ultimoAvance && ultimoAvance.descripcion ? `Resolución: ${ultimoAvance.descripcion}` : '';
  return [linea1, linea2, linea3].filter(Boolean).join('\n');
}

// Cuando una plantilla de Movistar se creó directo desde Estatus (sin venir de un caso ya
// existente en Casos Movistar) y se finaliza, se crea automáticamente el caso allá con lo
// que ya se sabe de la plantilla.
// Normaliza cualquier hora a "HH:MM", venga como "04:06" (de un <input type=time>) o
// como "04:06:00" (cuando Supabase devuelve una columna tipo "time" con segundos).
// Sin esto, concatenar ":00" a una hora que ya trae segundos rompe el Date (Invalid Date).
function plHHMM(hora){
  return (hora || '00:00').slice(0, 5);
}

// Construye una fecha/hora en ISO de forma segura; si falta la fecha o es inválida,
// regresa null en vez de tronar con "Invalid time value".
function plFechaHoraAIso(fecha, hora){
  if(!fecha) return null;
  const d = new Date(`${fecha}T${plHHMM(hora)}:00`);
  if(isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function plCrearCasoMovistarDesdePlantilla(p, materiales){
  try{
    const avances = p.avances || [];
    const ultimoAvance = avances[avances.length - 1];

    const fechaEscalonamiento = p.ticket_fecha ? new Date(`${p.ticket_fecha}T${plHHMM(p.ticket_hora)}:00`) : null;
    const escalonamientoIso = plFechaHoraAIso(p.ticket_fecha, p.ticket_hora);
    const resolucionIso = ultimoAvance ? plFechaHoraAIso(ultimoAvance.fecha, ultimoAvance.hora) : null;
    // Marca de validación de la plantilla (opcional). Si no se marcó, queda en null
    // y el operador la llena a mano en el caso.
    const sValidacionIso = (p.validacion_fecha && p.validacion_hora)
      ? plHHMMaISO(p.validacion_fecha, p.validacion_hora)
      : null;
    const sValidacionHyveIso = (p.validacion_hyve_fecha && p.validacion_hyve_hora)
      ? plHHMMaISO(p.validacion_hyve_fecha, p.validacion_hyve_hora)
      : null;
    const finValidacionHyveIso = (p.validacion_hyve_fin_fecha && p.validacion_hyve_fin_hora)
      ? plHHMMaISO(p.validacion_hyve_fin_fecha, p.validacion_hyve_fin_hora)
      : null;

    // Lapso: tiempo total desde que se escaló hasta que se terminó, SIN restar pausas.
    let lapsoMinutos = null;
    if(escalonamientoIso && resolucionIso){
      lapsoMinutos = (new Date(resolucionIso).getTime() - new Date(escalonamientoIso).getTime()) / 60000;
      if(lapsoMinutos < 0) lapsoMinutos = null;
    }
    // Intervalo: suma de todas las pausas (Pausado/Programado -> Retomado) de la plantilla.
    const intervaloMinutos = plCalcularIntervaloPausasMinutos(avances);
    // SLA: Lapso - Intervalo.
    const slaMinutos = (lapsoMinutos !== null) ? Math.max(0, lapsoMinutos - intervaloMinutos) : null;

    // Semana / Año / Mes / Día: se extraen automáticamente de la fecha de la plantilla (escalonamiento).
    const semana = fechaEscalonamiento ? getSemanaISO(fechaEscalonamiento) : null;
    const anos = fechaEscalonamiento ? fechaEscalonamiento.getFullYear() : null;
    const mes = fechaEscalonamiento ? MESES_ES[fechaEscalonamiento.getMonth()] : null;
    const dia = fechaEscalonamiento ? fechaEscalonamiento.getDate() : null;

    const payload = {
      clasificacion: p.tipo_afectacion || null,
      // Red tiene su propio catálogo (Interurbano FO, CU UM, FO UM, Datos, Nodos, MP)
      // y no se deduce del Tipo de Afectación: lo elige el operador en el caso.
      red: null,
      casos: p.cliente_sitio || null,
      folio: p.no_ticket || null,
      nombre_del_tecnico: (p.team_lider && p.team_lider !== 'Pendiente Asignar Personal') ? p.team_lider : null,
      status: 'En Proceso',
      zona: p.estatus_zona || null,
      semana, anos, mes, dia,
      escalonamiento: escalonamientoIso,
      resolucion: resolucionIso,
      lapso: minutesToHHMM(lapsoMinutos),
      sla: minutesToHHMM(slaMinutos),
      intervalo: minutesToHHMM(intervaloMinutos),
      causa: p.causa || null,
      sub_categoria: p.sub_categoria || null,
      tiempos_de_aceptacion: tiempoAceptacionAleatorio(),
      latitud: parseCoordenadasNum(p.coordenadas).lat,
      longitud: parseCoordenadasNum(p.coordenadas).lng,
      // Solo SI/NO: la fecha de la marca se queda en la plantilla.
      acceso_a_sitio: p.acceso_sitio_fecha ? 'SI' : 'NO',
      s_validacion: sValidacionIso,
      s_validacion_hyve: sValidacionHyveIso,
      up_enlace_hyve: finValidacionHyveIso,
      // Sin las dos marcas de Hyve el tiempo es 00:00: el caso no pasó por Hyve.
      t_validacion2: (sValidacionHyveIso && finValidacionHyveIso)
        ? minutesToHHMM((new Date(finValidacionHyveIso) - new Date(sValidacionHyveIso)) / 60000)
        : '00:00',
      // "Fecha Validación Movistar" es el cierre del caso: siempre coincide con Resolución.
      up_enlace: resolucionIso,
      // "Tiempo de Validación Movistar" = Fecha Validación Movistar - Solicitud | Validación-Movistar
      t_validacion: (sValidacionIso && resolucionIso)
        ? minutesToHHMM((new Date(resolucionIso) - new Date(sValidacionIso)) / 60000)
        : null,
      observacion: plResumenPlantillaParaObservacion(p, ultimoAvance),
      departamento: null,
      municipio: null,
      distrito: null,
      operador_tekcom: p.operador_tekcom || null,
      operador_movistar: p.operador_telco || null,
    };
    MATERIALES_CATALOGO.forEach(([label, col]) => {
      payload[col] = (materiales && materiales[col]) ? materiales[col] : 0;
    });
    console.log('[DEBUG crearCaso] payload a enviar:', payload);

    // Seguridad extra: nunca duplicar folio. Si ya existe un caso con este folio
    // (por ejemplo, la plantilla se finalizó, se reabrió, y se finaliza de nuevo),
    // se actualiza ese caso en vez de crear uno nuevo.
    // Si la plantilla ya tiene un caso vinculado, se actualiza ese directamente.
    let casoExistenteId = p.caso_id || null;
    if(!casoExistenteId && payload.folio){
      try{
        const resBuscar = await fetch(`${CASOS_REST_URL}?folio=eq.${encodeURIComponent(payload.folio)}&select=id&limit=1`, { headers: sbHeaders });
        if(resBuscar.ok){
          const encontrados = await resBuscar.json();
          if(encontrados.length > 0) casoExistenteId = encontrados[0].id;
        }
      }catch(e){ console.error('[DEBUG crearCaso] error buscando folio existente:', e); }
    }

    let res;
    if(casoExistenteId){
      console.log('[DEBUG crearCaso] ya existe un caso con este folio, se actualiza en vez de duplicar. id=', casoExistenteId);
      res = await fetch(`${CASOS_REST_URL}?id=eq.${casoExistenteId}`, {
        method:'PATCH',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(CASOS_REST_URL, {
        method:'POST',
        headers:{ ...sbHeaders, 'Prefer':'return=representation' },
        body: JSON.stringify(payload)
      });
    }
    console.log('[DEBUG crearCaso] respuesta HTTP status:', res.status, res.statusText);
    if(!res.ok){
      const t = await res.text();
      console.error('[DEBUG crearCaso] cuerpo del error de Supabase:', t);
      throw new Error(t || 'Error al crear el caso en Casos Movistar');
    }

    if(!casoExistenteId){
      // Recién creado: guarda el id del caso en la plantilla para que la próxima
      // vez que se finalice (si se reabre), se actualice este mismo caso en vez
      // de crear otro duplicado.
      try{
        const creado = await res.json();
        const nuevoCasoId = creado && creado[0] && creado[0].id;
        if(nuevoCasoId){
          await fetch(`${PLANTILLA_REST_URL}?id=eq.${p.id}`, {
            method:'PATCH',
            headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
            body: JSON.stringify({ caso_id: nuevoCasoId })
          });
        }
      }catch(e){ console.error('[DEBUG crearCaso] no se pudo vincular caso_id a la plantilla:', e); }
    }

    console.log('[DEBUG crearCaso] caso ' + (casoExistenteId ? 'actualizado' : 'creado') + ' exitosamente');
    if(typeof fetchCasos === 'function') fetchCasos();
    showToast(casoExistenteId ? 'Caso existente actualizado en Casos Movistar' : 'Caso creado automáticamente en Casos Movistar');
  }catch(e){
    console.error('[DEBUG crearCaso] EXCEPCIÓN:', e);
    showToast('No se pudo crear el caso en Casos Movistar: ' + e.message, 'error');
  }
}

// Calcula los tiempos (escalonamiento, lapso, intervalo, sla) y los campos automáticos
// de fecha (semana/año/mes/día) compartidos por los 3 proyectos.
function plCalcularTiemposYFechaAuto(p){
  const avances = p.avances || [];
  const ultimoAvance = avances[avances.length - 1];
  const fechaEscalonamiento = p.ticket_fecha ? new Date(`${p.ticket_fecha}T${plHHMM(p.ticket_hora)}:00`) : null;
  const escalonamientoIso = plFechaHoraAIso(p.ticket_fecha, p.ticket_hora);
  const resolucionIso = ultimoAvance ? plFechaHoraAIso(ultimoAvance.fecha, ultimoAvance.hora) : null;

  let lapsoMinutos = null;
  if(escalonamientoIso && resolucionIso){
    lapsoMinutos = (new Date(resolucionIso).getTime() - new Date(escalonamientoIso).getTime()) / 60000;
    if(lapsoMinutos < 0) lapsoMinutos = null;
  }
  const intervaloMinutos = plCalcularIntervaloPausasMinutos(avances);
  const slaMinutos = (lapsoMinutos !== null) ? Math.max(0, lapsoMinutos - intervaloMinutos) : null;

  return {
    ultimoAvance,
    escalonamientoIso,
    resolucionIso,
    lapsoMinutos,
    intervaloMinutos,
    slaMinutos,
    semana: fechaEscalonamiento ? getSemanaISO(fechaEscalonamiento) : null,
    anos: fechaEscalonamiento ? fechaEscalonamiento.getFullYear() : null,
    mes: fechaEscalonamiento ? MESES_ES[fechaEscalonamiento.getMonth()] : null,
    dia: fechaEscalonamiento ? fechaEscalonamiento.getDate() : null,
  };
}

async function plCrearCasoHyveDesdePlantilla(p, materiales){
  try{
    const t = plCalcularTiemposYFechaAuto(p);
    const coords = parseCoordenadasNum(p.coordenadas);
    const sValidacionHyveIso = (p.validacion_fecha && p.validacion_hora)
      ? plHHMMaISO(p.validacion_fecha, p.validacion_hora)
      : null;

    const payload = {
      clasificacion: p.tipo_afectacion || null,
      anos: t.anos,
      mes: t.mes,
      casos: p.cliente_sitio || null,
      status: 'En Proceso',
      // Semana ISO deducida del escalonamiento, igual que en Movistar.
      // Se envía como texto porque la columna `wk` es text (igual que en el formulario).
      wk: t.escalonamientoIso ? String(getSemanaISO(new Date(t.escalonamientoIso))) : null,
      ot: p.no_ticket || null,
      tecnico_encargado: (p.team_lider && p.team_lider !== 'Pendiente Asignar Personal') ? p.team_lider : null,
      escalonamiento: t.escalonamientoIso,
      resolucion: t.resolucionIso,
      lapso: minutesToHHMM(t.lapsoMinutos),
      sla: minutesToHHMM(t.slaMinutos),
      intervalo: minutesToHHMM(t.intervaloMinutos),
      causa: p.causa || null,
      sub_categoria: p.sub_categoria || null,
      operador_tekcom: p.operador_tekcom || null,
      operador_hyve: p.operador_telco || null,
      // Resumen de lo realizado, igual que en Movistar.
      observacion: plResumenPlantillaParaObservacion(p, (p.avances || [])[(p.avances || []).length - 1]),
      // La marca de la plantilla indica cuándo se solicitó validar.
      s_validacion: sValidacionHyveIso,
      // Validación Hyve es el cierre del caso: coincide con la Resolución.
      validacion_hyve: t.resolucionIso,
      t_validacion: (sValidacionHyveIso && t.resolucionIso)
        ? minutesToHHMM((new Date(t.resolucionIso) - new Date(sValidacionHyveIso)) / 60000)
        : '00:00',
      latitud: coords.lat,
      longitud: coords.lng,
    };
    HYVE_MATERIALES_CATALOGO.forEach(([label, col]) => {
      payload[col] = (materiales && materiales[col]) ? materiales[col] : 0;
    });
    console.log('[DEBUG crearCasoHyve] payload a enviar:', payload);

    // Si la plantilla ya tiene un caso vinculado, se actualiza ese directamente.
    let casoExistenteId = p.caso_id || null;
    if(!casoExistenteId && payload.ot){
      try{
        const resBuscar = await fetch(`${HYVE_REST_URL}?ot=eq.${encodeURIComponent(payload.ot)}&select=id&limit=1`, { headers: sbHeaders });
        if(resBuscar.ok){
          const encontrados = await resBuscar.json();
          if(encontrados.length > 0) casoExistenteId = encontrados[0].id;
        }
      }catch(e){ console.error('[DEBUG crearCasoHyve] error buscando OT existente:', e); }
    }

    let res;
    if(casoExistenteId){
      res = await fetch(`${HYVE_REST_URL}?id=eq.${casoExistenteId}`, {
        method:'PATCH', headers:{ ...sbHeaders, 'Prefer':'return=minimal' }, body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(HYVE_REST_URL, {
        method:'POST', headers:{ ...sbHeaders, 'Prefer':'return=representation' }, body: JSON.stringify(payload)
      });
    }
    if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'Error al crear el caso en Hyve'); }

    if(!casoExistenteId){
      try{
        const creado = await res.json();
        const nuevoCasoId = creado && creado[0] && creado[0].id;
        if(nuevoCasoId){
          await fetch(`${PLANTILLA_REST_URL}?id=eq.${p.id}`, {
            method:'PATCH', headers:{ ...sbHeaders, 'Prefer':'return=minimal' }, body: JSON.stringify({ caso_id: nuevoCasoId })
          });
        }
      }catch(e){ console.error('[DEBUG crearCasoHyve] no se pudo vincular caso_id:', e); }
    }
    if(typeof fetchHyve === 'function') fetchHyve();
    showToast(casoExistenteId ? 'Caso existente actualizado en Hyve' : 'Caso creado automáticamente en Hyve');
  }catch(e){
    console.error('[DEBUG crearCasoHyve] EXCEPCIÓN:', e);
    showToast('No se pudo crear el caso en Hyve: ' + e.message, 'error');
  }
}

async function plCrearCasoCableDesdePlantilla(p, materiales){
  try{
    const t = plCalcularTiemposYFechaAuto(p);
    const coords = parseCoordenadasNum(p.coordenadas);
    const resumen = plResumenPlantillaParaObservacion(p, t.ultimoAvance);
    const sValidacionCableIso = (p.validacion_fecha && p.validacion_hora)
      ? plHHMMaISO(p.validacion_fecha, p.validacion_hora)
      : null;

    const payload = {
      numero: p.no_ticket || null,
      zona: p.estatus_zona || null,
      tipo_falla: p.tipo_afectacion || null,
      // La OT es el número de ticket de la plantilla.
      ot: p.no_ticket || null,
      operador_tekcom: p.operador_tekcom || null,
      operador_telco: p.operador_telco || null,
      s_validacion: sValidacionCableIso,
      // La validación por parte de Hyve coincide con el cierre del caso.
      validacion_hyve: t.resolucionIso,
      t_validacion: (sValidacionCableIso && t.resolucionIso)
        ? minutesToHHMM((new Date(t.resolucionIso) - new Date(sValidacionCableIso)) / 60000)
        : '00:00',
      // La Descripción es el nombre del caso; el detalle completo va en Observación.
      descripcion: p.cliente_sitio || null,
      cuadrilla: (p.team_lider && p.team_lider !== 'Pendiente Asignar Personal') ? p.team_lider : null,
      status: 'En Proceso',
      causa: p.causa || null,
      sub_categoria: p.sub_categoria || null,
      latitud: coords.lat,
      longitud: coords.lng,
      observacion: resumen,
      anos: t.anos,
      mes: t.mes,
      semana: t.semana,
      escalonamiento: t.escalonamientoIso,
      resolucion: t.resolucionIso,
      tiempo_afectacion: minutesToHHMM(t.lapsoMinutos),
      pausa: minutesToHHMM(t.intervaloMinutos),
      tiempo_respuesta: minutesToHHMM(t.slaMinutos),
    };
    MATERIALES_CATALOGO.forEach(([label, col]) => {
      payload[col] = (materiales && materiales[col]) ? materiales[col] : 0;
    });
    console.log('[DEBUG crearCasoCable] payload a enviar:', payload);

    // Si la plantilla ya tiene un caso vinculado, se actualiza ese directamente.
    let casoExistenteId = p.caso_id || null;
    if(!casoExistenteId && payload.numero){
      try{
        const resBuscar = await fetch(`${CABLE_REST_URL}?numero=eq.${encodeURIComponent(payload.numero)}&select=id&limit=1`, { headers: sbHeaders });
        if(resBuscar.ok){
          const encontrados = await resBuscar.json();
          if(encontrados.length > 0) casoExistenteId = encontrados[0].id;
        }
      }catch(e){ console.error('[DEBUG crearCasoCable] error buscando numero existente:', e); }
    }

    let res;
    if(casoExistenteId){
      res = await fetch(`${CABLE_REST_URL}?id=eq.${casoExistenteId}`, {
        method:'PATCH', headers:{ ...sbHeaders, 'Prefer':'return=minimal' }, body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(CABLE_REST_URL, {
        method:'POST', headers:{ ...sbHeaders, 'Prefer':'return=representation' }, body: JSON.stringify(payload)
      });
    }
    if(!res.ok){ const txt = await res.text(); throw new Error(txt || 'Error al crear el caso en Cable Color'); }

    if(!casoExistenteId){
      try{
        const creado = await res.json();
        const nuevoCasoId = creado && creado[0] && creado[0].id;
        if(nuevoCasoId){
          await fetch(`${PLANTILLA_REST_URL}?id=eq.${p.id}`, {
            method:'PATCH', headers:{ ...sbHeaders, 'Prefer':'return=minimal' }, body: JSON.stringify({ caso_id: nuevoCasoId })
          });
        }
      }catch(e){ console.error('[DEBUG crearCasoCable] no se pudo vincular caso_id:', e); }
    }
    if(typeof fetchCable === 'function') fetchCable();
    showToast(casoExistenteId ? 'Caso existente actualizado en Cable Color' : 'Caso creado automáticamente en Cable Color');
  }catch(e){
    console.error('[DEBUG crearCasoCable] EXCEPCIÓN:', e);
    showToast('No se pudo crear el caso en Cable Color: ' + e.message, 'error');
  }
}

let plEditandoIndiceActual = null;

let plMaterialesActuales = [];

// Catálogo de materiales del proyecto de la plantilla abierta.
// Hyve tiene columnas propias (cierre_48h) distintas de las de Movistar
// (cierre_de_48); usar el catálogo equivocado hacía que se perdieran al
// crear el caso, porque la columna no existía en la tabla destino.
function plCatalogoMateriales(){
  const id = Number(document.getElementById('plDetalleId')?.value || 0);
  const p = id ? plListaCache.find(x => x.id === id) : null;
  const modulo = (p && p.modulo) || document.getElementById('pl_modulo')?.value || 'casos';
  if(modulo === 'hyve') return HYVE_MATERIALES_CATALOGO;
  if(modulo === 'udp') return UDP_MATERIALES_CATALOGO;
  return MATERIALES_CATALOGO;
}

function plCargarMateriales(materialesGuardados){
  plMaterialesActuales = [];
  const datos = materialesGuardados || {};
  plCatalogoMateriales().forEach(([label, col]) => {
    if(datos[col] > 0){
      plMaterialesActuales.push({ label, col, cantidad: datos[col] });
    }
  });
  plRenderMaterialList();
}

function plRenderMaterialList(){
  const wrap = document.getElementById('pl_material_list');
  if(plMaterialesActuales.length === 0){
    wrap.innerHTML = '<div class="material-empty">Aún no se han agregado materiales a este caso.</div>';
    return;
  }
  wrap.innerHTML = plMaterialesActuales.map((m, i) => `
    <div class="material-item">
      <div class="material-item-name">${escapeHtml(m.label)}</div>
      <input type="number" min="0" step="1" value="${m.cantidad}" data-pl-mat-index="${i}" class="mat-qty-input">
      <button type="button" class="material-item-remove" data-pl-mat-remove="${i}" title="Quitar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `).join('');

  wrap.querySelectorAll('.mat-qty-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = parseInt(inp.dataset.plMatIndex, 10);
      plMaterialesActuales[idx].cantidad = parseFloat(inp.value) || 0;
    });
  });
  wrap.querySelectorAll('[data-pl-mat-remove]').forEach(btn => {
    btn.addEventListener('click', () => {
      plMaterialesActuales.splice(parseInt(btn.dataset.plMatRemove, 10), 1);
      plRenderMaterialList();
    });
  });
}

function plAgregarMaterial(col){
  if(plMaterialesActuales.find(m => m.col === col)){
    showToast('Ese material ya está en la lista', 'error');
    return;
  }
  const entry = plCatalogoMateriales().find(([label, c]) => c === col);
  if(!entry) return;
  plMaterialesActuales.push({ label: entry[0], col, cantidad: 1 });
  plRenderMaterialList();
}

const plMaterialSearch = document.getElementById('pl_material_search');
const plMaterialResults = document.getElementById('pl_material_results');

plMaterialSearch.addEventListener('input', () => {
  const term = plMaterialSearch.value.trim().toLowerCase();
  if(!term){ plMaterialResults.classList.remove('show'); plMaterialResults.innerHTML=''; return; }

  const yaAgregados = new Set(plMaterialesActuales.map(m => m.col));
  const matches = plCatalogoMateriales().filter(([label, col]) =>
    !yaAgregados.has(col) && label.toLowerCase().includes(term)
  ).slice(0, 20);

  if(matches.length === 0){
    plMaterialResults.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    plMaterialResults.innerHTML = matches.map(([label, col]) => `
      <div class="site-result-item" data-pl-material-col="${escapeHtml(col)}">
        <div class="site-result-name">${escapeHtml(label)}</div>
      </div>
    `).join('');
  }
  plMaterialResults.classList.add('show');
});
plMaterialResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-pl-material-col]');
  if(!item) return;
  plAgregarMaterial(item.dataset.plMaterialCol);
  plMaterialSearch.value = '';
  plMaterialResults.classList.remove('show');
  plMaterialResults.innerHTML = '';
  plMaterialSearch.focus();
});
document.addEventListener('click', (e) => {
  if(!e.target.closest('#pl_material_search') && !e.target.closest('#pl_material_results')){
    plMaterialResults.classList.remove('show');
  }
});

function plLeerMaterialesForm(){
  const materiales = {};
  plMaterialesActuales.forEach(m => {
    if(m.cantidad > 0) materiales[m.col] = m.cantidad;
  });
  return materiales;
}
function plActualizarVisibilidadMateriales(){
  const wrap = document.getElementById('plMaterialesFinalizarWrap');
  const estado = document.getElementById('plNuevoAvanceEstado').value;
  wrap.style.display = estado === 'finalizado' ? '' : 'none';
  // Los campos de "Programado para" solo aplican al estado Programado.
  const esProg = estado === 'programado';
  const wrapF = document.getElementById('plNuevoAvanceProgFechaWrap');
  const wrapH = document.getElementById('plNuevoAvanceProgHoraWrap');
  if(wrapF) wrapF.style.display = esProg ? '' : 'none';
  if(wrapH) wrapH.style.display = esProg ? '' : 'none';
}
document.getElementById('plNuevoAvanceEstado').addEventListener('change', plActualizarVisibilidadMateriales);

function plEditarAvance(index){
  const id = Number(document.getElementById('plDetalleId').value);
  const p = plListaCache.find(x => x.id === id);
  if(!p) return;
  const av = (p.avances || [])[index];
  if(!av) return;
  if(plEsSoloLectura(p)){
    showToast('Este caso está en solo lectura. Cambia el Estatus a "En Proceso" para poder editar avances.', 'error');
    return;
  }
  plEditandoIndiceActual = index;
  document.getElementById('plNuevoAvanceFecha').value = av.fecha || '';
  document.getElementById('plNuevoAvanceHora').value = av.hora || '';
  document.getElementById('plNuevoAvanceDescripcion').value = av.descripcion || '';
  document.getElementById('plNuevoAvanceEstado').value = av.estado || 'normal';
  document.getElementById('plNuevoAvanceProgFecha').value = av.programado_fecha || '';
  document.getElementById('plNuevoAvanceProgHora').value = av.programado_hora || '';
  document.getElementById('plOperadorTurno').value = av.operador_tekcom || '';
  plCargarMateriales(av.materiales);
  document.getElementById('pl_material_search').value = '';
  // Al editar, siempre se muestra el formulario aunque el caso esté pausado/finalizado
  document.getElementById('plAvisoPausado').style.display = 'none';
  document.getElementById('plAvisoFinalizado').style.display = 'none';
  document.getElementById('plCamposNuevoAvance').style.display = '';
  Array.from(document.getElementById('plNuevoAvanceEstado').options).forEach(opt => { opt.disabled = false; });
  plActualizarVisibilidadMateriales();
  document.getElementById('plDetalleGuardarAvanceBtn').style.display = '';
  document.getElementById('plDetalleGuardarAvanceBtn').textContent = 'Guardar cambios';
  document.getElementById('plCancelarEdicionAvanceBtn').style.display = '';
  document.getElementById('plNuevoAvanceDescripcion').scrollIntoView({ behavior:'smooth', block:'center' });
}

function plCancelarEdicionAvance(){
  plEditandoIndiceActual = null;
  plPrecargarPrefijoAvance();
  document.getElementById('plNuevoAvanceEstado').value = 'normal';
  plCargarMateriales();
  document.getElementById('pl_material_search').value = '';
  plActualizarVisibilidadMateriales();
  document.getElementById('plDetalleGuardarAvanceBtn').textContent = 'Agregar avance';
  document.getElementById('plCancelarEdicionAvanceBtn').style.display = 'none';
  const ahora = new Date();
  document.getElementById('plNuevoAvanceFecha').value = plFechaLocalISO(ahora);
  document.getElementById('plNuevoAvanceHora').value = ahora.toTimeString().slice(0,5);
  plActualizarEstadoFormularioAvance();
}
document.getElementById('plCancelarEdicionAvanceBtn').addEventListener('click', plCancelarEdicionAvance);

function plRefrescarVistaListaActual(){
  const tabActiva = document.querySelector('.pl-tab-proyecto.active');
  if(tabActiva && tabActiva.dataset.plTabProyecto === 'estatus'){
    plRenderEstatusLista();
  } else {
    plRenderListaFiltrada();
  }
}

async function plEliminarAvance(index){
  if(!confirm('¿Eliminar este avance? Esta acción no se puede deshacer.')) return;
  const id = Number(document.getElementById('plDetalleId').value);
  const p = plListaCache.find(x => x.id === id);
  if(!p) return;
  const avancesActualizados = (p.avances || []).filter((_, i) => i !== index);
  try{
    const payloadPatch = { avances: avancesActualizados };
    if(p.estatus_activo){
      const nuevoUltimo = avancesActualizados[avancesActualizados.length - 1];
      if(nuevoUltimo) payloadPatch.estatus_actualizacion = nuevoUltimo.descripcion;
    }
    const res = await fetch(`${PLANTILLA_REST_URL}?id=eq.${id}`, {
      method:'PATCH',
      headers:{ ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify(payloadPatch)
    });
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al eliminar'); }
    const actualizado = (await res.json())[0];
    const idx = plListaCache.findIndex(x => x.id === id);
    if(idx >= 0) plListaCache[idx] = actualizado;
    plRenderTimeline(actualizado.avances || []);
    plRefrescarVistaListaActual();
    if(plEditandoIndiceActual === index) plCancelarEdicionAvance();
    plActualizarEstadoFormularioAvance();
    showToast('Avance eliminado');
  }catch(err){
    showToast('No se pudo eliminar: ' + err.message, 'error');
  }
}

// Muestra un aviso centrado (no en la esquina) para errores importantes del formulario de avance,
// como la validación de fecha/hora fuera de orden.
// `esHtml = true` permite pasar contenido ya formateado (por ejemplo una lista de
// campos faltantes). Por defecto sigue escapando, para no romper llamadas existentes.
function plMostrarErrorCentro(msg, esHtml){
  let overlay = document.getElementById('plErrorCentroOverlay');
  if(overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.id = 'plErrorCentroOverlay';
  overlay.style.cssText = 'position:fixed; inset:0; z-index:100000; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.35);';
  overlay.innerHTML = `
    <div style="background:#FFFFFF; border-radius:12px; box-shadow:0 20px 50px rgba(0,0,0,.3); max-width:${esHtml ? '460px' : '380px'}; width:90%; padding:22px 24px; text-align:center; max-height:85vh; overflow-y:auto;">
      <div style="font-size:32px; margin-bottom:6px;">⛔</div>
      <div style="font-size:14px; color:#111827; font-weight:600; line-height:1.4; margin-bottom:16px;">${esHtml ? msg : escapeHtml(msg)}</div>
      <button type="button" id="plErrorCentroOk" class="btn btn-primary" style="width:100%;">Entendido</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const cerrar = () => overlay.remove();
  overlay.querySelector('#plErrorCentroOk').addEventListener('click', cerrar);
  overlay.addEventListener('click', (e) => { if(e.target === overlay) cerrar(); });
}

document.getElementById('plDetalleGuardarAvanceBtn').addEventListener('click', async () => {
  const id = Number(document.getElementById('plDetalleId').value);
  const p = plListaCache.find(x => x.id === id);
  if(!p) return;
  const descripcion = document.getElementById('plNuevoAvanceDescripcion').value.trim();
  const fecha = document.getElementById('plNuevoAvanceFecha').value;
  const hora = document.getElementById('plNuevoAvanceHora').value;
  const estado = document.getElementById('plNuevoAvanceEstado').value;
  const operadorTekcom = document.getElementById('plOperadorTurno').value;
  const estabaEditando = plEditandoIndiceActual !== null;

  if(!descripcion){
    showToast('Escribe una descripción para el avance', 'error');
    return;
  }
  if((estado === 'pausado' || estado === 'programado' || estado === 'despausado') && (!fecha || !hora)){
    showToast('Para Pausado/Programado/Retomado, la fecha y la hora son obligatorias', 'error');
    return;
  }

  const avancesPrevios = p.avances || [];
  if(!estabaEditando){
    const ultimoAvance = avancesPrevios[avancesPrevios.length - 1];
    if(ultimoAvance && (ultimoAvance.estado === 'pausado' || ultimoAvance.estado === 'programado') && estado !== 'despausado'){
      showToast('Este caso está pausado/programado. Primero debes agregar un avance de tipo "Retomado" antes de continuar.', 'error');
      return;
    }
  }

  // La fecha/hora del avance nuevo (o editado) no puede quedar antes del avance anterior
  // ni después del siguiente -- deben ir en orden cronológico.
  if(fecha && hora){
    const nuevoTs = new Date(`${fecha}T${hora}:00`).getTime();
    if(!isNaN(nuevoTs)){
      const indiceReferencia = estabaEditando ? plEditandoIndiceActual : avancesPrevios.length;
      const anterior = avancesPrevios[indiceReferencia - 1];
      const siguiente = estabaEditando ? avancesPrevios[indiceReferencia + 1] : null;

      if(anterior && anterior.fecha){
        const anteriorTs = new Date(`${anterior.fecha}T${plHHMM(anterior.hora)}:00`).getTime();
        if(!isNaN(anteriorTs) && nuevoTs < anteriorTs){
          plMostrarErrorCentro(`La fecha/hora no puede ser anterior al avance previo (${anterior.fecha} ${anterior.hora || ''}). Usa hora militar (24h).`);
          return;
        }
      }
      if(siguiente && siguiente.fecha){
        const siguienteTs = new Date(`${siguiente.fecha}T${plHHMM(siguiente.hora)}:00`).getTime();
        if(!isNaN(siguienteTs) && nuevoTs > siguienteTs){
          plMostrarErrorCentro(`La fecha/hora no puede ser posterior al siguiente avance (${siguiente.fecha} ${siguiente.hora || ''}).`);
          return;
        }
      }
    }
  }

  let materiales = null;
  if(estado === 'finalizado'){
    // El encabezado debe estar completo antes de poder cerrar la plantilla.
    const faltantes = plCamposEncabezadoFaltantes(p);
    if(faltantes.length > 0){
      plMostrarErrorCentro(
        `<div style="text-align:left;">` +
        `<strong>No se puede finalizar: el encabezado está incompleto.</strong>` +
        `<div style="margin-top:8px;">Faltan ${faltantes.length} campo(s):</div>` +
        `<ul style="margin:6px 0 8px 18px; padding:0;">` +
        faltantes.map(f => `<li>${escapeHtml(f)}</li>`).join('') +
        `</ul>` +
        `<div style="font-size:12px; opacity:.85;">Ciérrale a esta ventana, entra a <strong>Editar</strong> la plantilla, complétalos y vuelve a finalizar. La hora va en formato militar (24h).</div>` +
        `</div>`,
        true
      );
      return;
    }
    materiales = plLeerMaterialesForm();
    if(Object.keys(materiales).length === 0){
      showToast('Debes indicar al menos un material utilizado para poder finalizar', 'error');
      return;
    }
  }

  // Para un avance Programado es obligatorio indicar para cuándo quedó agendado:
  // ese instante es el que reanuda el SLA, no el momento en que sale la cuadrilla.
  let progFecha = null, progHora = null;
  if(estado === 'programado'){
    progFecha = document.getElementById('plNuevoAvanceProgFecha').value;
    progHora = document.getElementById('plNuevoAvanceProgHora').value;
    if(!progFecha || !progHora){
      plMostrarErrorCentro('Para un avance Programado debes indicar la fecha y la hora para la que quedó programado. El SLA se reanuda en ese momento.');
      return;
    }
    const progTs = new Date(`${progFecha}T${progHora}:00`).getTime();
    const baseTs = (fecha && hora) ? new Date(`${fecha}T${hora}:00`).getTime() : NaN;
    if(!isNaN(progTs) && !isNaN(baseTs) && progTs < baseTs){
      plMostrarErrorCentro('La fecha/hora programada no puede ser anterior a la del propio avance.');
      return;
    }
  }

  const avanceData = { fecha, hora, descripcion, operador_tekcom: operadorTekcom, materiales, estado, programado_fecha: progFecha, programado_hora: progHora };

  const avancesActualizados = estabaEditando
    ? avancesPrevios.map((a, i) => i === plEditandoIndiceActual ? avanceData : a)
    : [...avancesPrevios, avanceData];

  const btn = document.getElementById('plDetalleGuardarAvanceBtn');
  btn.disabled = true;
  const textoOriginal = btn.textContent;
  btn.textContent = 'Guardando...';
  try{
    const payloadPatch = { avances: avancesActualizados };
    // Un caso finalizado ya no debe seguir apareciendo como pendiente en el tablero de Estatus
    if(estado === 'finalizado') payloadPatch.estatus_activo = false;
    // Si el caso está activo en Estatus, su columna "Actualización" se mantiene sincronizada
    // con el último avance que se registre desde la bitácora (sin necesidad de editarlo aparte).
    if(p.estatus_activo && estado !== 'finalizado') payloadPatch.estatus_actualizacion = descripcion;

    const res = await fetch(`${PLANTILLA_REST_URL}?id=eq.${id}`, {
      method:'PATCH',
      headers:{ ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify(payloadPatch)
    });
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al guardar el avance'); }
    const actualizado = (await res.json())[0];
    const idx = plListaCache.findIndex(x => x.id === id);
    if(idx >= 0) plListaCache[idx] = actualizado;

    const btnQuitarEstatusRef = document.getElementById('plQuitarEstatusBtn');
    if(btnQuitarEstatusRef) btnQuitarEstatusRef.style.display = actualizado.estatus_activo ? '' : 'none';

    const estadosQueActualizanCaso = ['escalado', 'pausado', 'programado', 'despausado'];
    const modulosConCaso = ['casos', 'hyve', 'cable', 'udp'];
    console.log('[DEBUG finalizar] estado=', estado, 'p.modulo=', p.modulo, 'p.caso_id=', p.caso_id);

    if(estado === 'finalizado' && modulosConCaso.includes(p.modulo)){
      // Al finalizar se vuelca TODA la información al caso (semana, validación,
      // observación, causa, materiales...), exista ya o no. Antes, si la plantilla
      // tenía caso_id se actualizaba únicamente el estatus y el resto se perdía.
      console.log('[DEBUG finalizar] volcando datos completos al caso en', p.modulo);
      if(p.modulo === 'casos') await plCrearCasoMovistarDesdePlantilla(actualizado, materiales);
      else if(p.modulo === 'hyve') await plCrearCasoHyveDesdePlantilla(actualizado, materiales);
      else if(p.modulo === 'cable') await plCrearCasoCableDesdePlantilla(actualizado, materiales);
      else await plCrearCasoUdpDesdePlantilla(actualizado, materiales);
    } else if(estadosQueActualizanCaso.includes(estado) && p.caso_id && p.modulo){
      // Pausas y reanudaciones: basta con sincronizar el estatus.
      console.log('[DEBUG finalizar] actualizando estatus del caso vinculado');
      await plActualizarEstadoCasoVinculado(p.modulo, p.caso_id, estado, materiales);
    } else {
      console.log('[DEBUG finalizar] no se cumplió ninguna condición, no se crea ni actualiza nada');
    }

    plRenderTimeline(actualizado.avances || []);
    plRefrescarVistaListaActual();
    plCancelarEdicionAvance();
    plActualizarEstadoFormularioAvance();
    showToast(estabaEditando ? 'Avance actualizado correctamente' : 'Avance agregado correctamente');
  }catch(err){
    showToast('No se pudo guardar: ' + err.message, 'error');
  }finally{
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
});

/* ============================================================
   TABLERO DE ESTATUS: abrir/guardar/quitar desde la bitácora
   ============================================================ */
/* ============================================================
   TABLERO DE ESTATUS: abrir/crear/guardar/quitar
   ============================================================ */
function plEstatusFechaHoraInputValue(p){
  if(!p || !p.estatus_fecha_escalonamiento) return '';
  const hora = p.estatus_hora_escalonamiento ? p.estatus_hora_escalonamiento.slice(0,5) : '00:00';
  return `${p.estatus_fecha_escalonamiento}T${hora}`;
}
function plEstatusSepararFechaHora(valorInput){
  if(!valorInput) return { fecha:'', hora:'' };
  const [fecha, hora] = valorInput.split('T');
  return { fecha: fecha || '', hora: plHHMM(hora) };
}
function plEstatusFechaHoraTexto(p){
  if(!p.estatus_fecha_escalonamiento) return '—';
  const hora = p.estatus_hora_escalonamiento ? ' ' + p.estatus_hora_escalonamiento.slice(0,5) : '';
  return p.estatus_fecha_escalonamiento + hora;
}

// ============================================================
// CATÁLOGO DE DEPARTAMENTOS Y MUNICIPIOS DE EL SALVADOR
// (para el formulario de Estatus → Departamento/Municipio)
// ============================================================
// ============================================================
// DIVISIÓN POLÍTICO-ADMINISTRATIVA DE EL SALVADOR
// Vigente desde el 1 de mayo de 2024 (Ley Especial para la Reestructuración
// Municipal): 14 departamentos -> 44 municipios -> 262 distritos.
// Los antiguos 262 municipios pasaron a ser distritos.
// ============================================================
const SV_DIVISION = {
  "Ahuachapán": {
    "Ahuachapán Norte": ["Atiquizaya", "El Refugio", "San Lorenzo", "Turín"],
    "Ahuachapán Centro": ["Ahuachapán", "Apaneca", "Concepción de Ataco", "Tacuba"],
    "Ahuachapán Sur": ["Guaymango", "Jujutla", "San Francisco Menéndez", "San Pedro Puxtla"],
  },
  "San Salvador": {
    "San Salvador Norte": ["Aguilares", "El Paisnal", "Guazapa"],
    "San Salvador Oeste": ["Apopa", "Nejapa"],
    "San Salvador Este": ["Ilopango", "San Martín", "Soyapango", "Tonacatepeque"],
    "San Salvador Centro": ["Ayutuxtepeque", "Ciudad Delgado", "Cuscatancingo", "Mejicanos", "San Salvador"],
    "San Salvador Sur": ["Panchimalco", "Rosario de Mora", "San Marcos", "Santiago Texacuangos", "Santo Tomás"],
  },
  "La Libertad": {
    "La Libertad Norte": ["Quezaltepeque", "San Matías", "San Pablo Tacachico"],
    "La Libertad Centro": ["Ciudad Arce", "San Juan Opico"],
    "La Libertad Oeste": ["Colón", "Jayaque", "Sacacoyo", "Talnique", "Tepecoyo"],
    "La Libertad Este": ["Antiguo Cuscatlán", "Huizúcar", "Nuevo Cuscatlán", "San José Villanueva", "Zaragoza"],
    "La Libertad Costa": ["Chiltiupán", "Jicalapa", "La Libertad", "Tamanique", "Teotepeque"],
    "La Libertad Sur": ["Comasagua", "Santa Tecla"],
  },
  "Chalatenango": {
    "Chalatenango Norte": ["Citalá", "La Palma", "San Ignacio"],
    "Chalatenango Centro": ["Agua Caliente", "Dulce Nombre de María", "El Paraíso", "La Reina", "Nueva Concepción", "San Fernando", "San Francisco Morazán", "San Rafael", "Santa Rita", "Tejutla"],
    "Chalatenango Sur": ["Arcatao", "Azacualpa", "Chalatenango", "Comalapa", "Concepción Quezaltepeque", "El Carrizal", "La Laguna", "Las Vueltas", "Nombre de Jesús", "Nueva Trinidad", "Ojos de Agua", "Potonico", "San Antonio de La Cruz", "San Antonio Los Ranchos", "San Francisco Lempa", "San Isidro Labrador", "San José Cancasque", "San José Las Flores", "San Luis del Carmen", "San Miguel de Mercedes"],
  },
  "Cuscatlán": {
    "Cuscatlán Norte": ["Oratorio de Concepción", "San Bartolomé Perulapía", "San José Guayabal", "San Pedro Perulapán", "Suchitoto"],
    "Cuscatlán Sur": ["Candelaria", "Cojutepeque", "El Carmen", "El Rosario", "Monte San Juan", "San Cristóbal", "San Rafael Cedros", "San Ramón", "Santa Cruz Analquito", "Santa Cruz Michapa", "Tenancingo"],
  },
  "Cabañas": {
    "Cabañas Este": ["Dolores", "Guacotecti", "San Isidro", "Sensuntepeque", "Victoria"],
    "Cabañas Oeste": ["Cinquera", "Ilobasco", "Jutiapa", "Tejutepeque"],
  },
  "La Paz": {
    "La Paz Oeste": ["Cuyultitán", "Olocuilta", "San Francisco Chinameca", "San Juan Talpa", "San Luis Talpa", "San Pedro Masahuat", "Tapalhuaca"],
    "La Paz Centro": ["El Rosario", "Jerusalén", "Mercedes La Ceiba", "Paraíso de Osorio", "San Antonio Masahuat", "San Emigdio", "San Juan Tepezontes", "San Luis La Herradura", "San Miguel Tepezontes", "San Pedro Nonualco", "Santa María Ostuma", "Santiago Nonualco"],
    "La Paz Este": ["San Juan Nonualco", "San Rafael Obrajuelo", "Zacatecoluca"],
  },
  "La Unión": {
    "La Unión Norte": ["Anamorós", "Bolívar", "Concepción de Oriente", "El Sauce", "Lislique", "Nueva Esparta", "Pasaquina", "Polorós", "San José La Fuente", "Santa Rosa de Lima"],
    "La Unión Sur": ["Conchagua", "El Carmen", "Intipucá", "La Unión", "Meanguera del Golfo", "San Alejo", "Yayantique", "Yucuaiquín"],
  },
  "Usulután": {
    "Usulután Norte": ["Alegría", "Berlín", "El Triunfo", "Estanzuelas", "Jucuapa", "Mercedes Umaña", "Nueva Granada", "San Buenaventura", "Santiago de María"],
    "Usulután Este": ["California", "Concepción Batres", "Ereguayquín", "Jucuarán", "Ozatlán", "San Dionisio", "Santa Elena", "Santa María", "Tecapán", "Usulután"],
    "Usulután Oeste": ["Jiquilisco", "Puerto El Triunfo", "San Agustín", "San Francisco Javier"],
  },
  "Sonsonate": {
    "Sonsonate Norte": ["Juayúa", "Nahuizalco", "Salcoatitán", "Santa Catarina Masahuat"],
    "Sonsonate Centro": ["Nahulingo", "San Antonio del Monte", "Sonsonate", "Sonzacate", "Santo Domingo de Guzmán"],
    "Sonsonate Este": ["Armenia", "Caluco", "Cuisnahuat", "Izalco", "San Julián", "Santa Isabel Ishuatán"],
    "Sonsonate Oeste": ["Acajutla"],
  },
  "Santa Ana": {
    "Santa Ana Norte": ["Masahuat", "Metapán", "Santa Rosa Guachipilín", "Texistepeque"],
    "Santa Ana Centro": ["Santa Ana"],
    "Santa Ana Este": ["Coatepeque", "El Congo"],
    "Santa Ana Oeste": ["Candelaria de la Frontera", "Chalchuapa", "El Porvenir", "San Antonio Pajonal", "San Sebastián Salitrillo", "Santiago de La Frontera"],
  },
  "San Vicente": {
    "San Vicente Norte": ["Apastepeque", "San Esteban Catarina", "San Ildefonso", "San Lorenzo", "San Sebastián", "Santa Clara", "Santo Domingo"],
    "San Vicente Sur": ["Guadalupe", "San Cayetano Istepeque", "San Vicente", "Tecoluca", "Tepetitán", "Verapaz"],
  },
  "San Miguel": {
    "San Miguel Norte": ["Carolina", "Chapeltique", "Ciudad Barrios", "Nuevo Edén de San Juan", "San Antonio del Mosco", "San Gerardo", "San Luis de La Reina", "Sesori"],
    "San Miguel Centro": ["Chirilagua", "Comacarán", "Moncagua", "Quelepa", "San Miguel", "Uluazapa"],
    "San Miguel Oeste": ["Chinameca", "El Tránsito", "Lolotique", "Nueva Guadalupe", "San Jorge", "San Rafael Oriente"],
  },
  "Morazán": {
    "Morazán Norte": ["Arambala", "Cacaopera", "Corinto", "El Rosario", "Joateca", "Jocoaitique", "Meanguera", "Perquín", "San Fernando", "San Isidro", "Torola"],
    "Morazán Sur": ["Chilanga", "Delicias de Concepción", "El Divisadero", "Gualococti", "Guatajiagua", "Jocoro", "Lolotiquillo", "Osicala", "San Carlos", "San Francisco Gotera", "San Simón", "Sensembra", "Sociedad", "Yamabal", "Yoloaiquín"],
  },
};


(function plInicializarSelectDepartamentos(){
  const sel = document.getElementById('c_departamento');
  if(!sel) return;
  Object.keys(SV_DIVISION).forEach(depto => {
    sel.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(depto)}">${escapeHtml(depto)}</option>`);
  });
})();

// Registros anteriores a la reforma guardaban el distrito en el campo `municipio`.
// Dado un departamento y ese valor, devuelve a qué municipio nuevo pertenece.
function plMunicipioDeDistrito(departamento, distrito){
  const muns = SV_DIVISION[departamento];
  if(!muns || !distrito) return null;
  for(const [mun, distritos] of Object.entries(muns)){
    if(distritos.includes(distrito)) return mun;
  }
  return null;
}

function plActualizarMunicipiosCaso(municipioSeleccionado, distritoSeleccionado){
  const departamento = document.getElementById('c_departamento').value;
  const selMunicipio = document.getElementById('c_municipio');
  const municipios = Object.keys(SV_DIVISION[departamento] || {});
  if(municipios.length === 0){
    selMunicipio.innerHTML = '<option value="">— Elige Departamento —</option>';
    plActualizarDistritosCaso();
    return;
  }
  selMunicipio.innerHTML = '<option value="">— Selecciona —</option>' +
    municipios.map(m => `<option value="${escapeHtml(m)}" ${m === municipioSeleccionado ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('');
  plActualizarDistritosCaso(distritoSeleccionado);
}

function plActualizarDistritosCaso(distritoSeleccionado){
  const departamento = document.getElementById('c_departamento').value;
  const municipio = document.getElementById('c_municipio').value;
  const selDistrito = document.getElementById('c_distrito');
  if(!selDistrito) return;
  const distritos = ((SV_DIVISION[departamento] || {})[municipio]) || [];
  if(distritos.length === 0){
    selDistrito.innerHTML = '<option value="">— Elige Municipio —</option>';
    return;
  }
  selDistrito.innerHTML = '<option value="">— Selecciona —</option>' +
    distritos.map(d => `<option value="${escapeHtml(d)}" ${d === distritoSeleccionado ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('');
}

document.getElementById('c_departamento').addEventListener('change', () => plActualizarMunicipiosCaso());
document.getElementById('c_municipio').addEventListener('change', () => plActualizarDistritosCaso());

document.getElementById('plMarcarEstatusBtn').addEventListener('click', () => {
  const id = Number(document.getElementById('plDetalleId').value);
  const p = plListaCache.find(x => x.id === id);
  if(!p) return;
  plAbrirEstatusModal(p);
});

// Botón "+ Nuevo Estatus" dentro del tablero: crea el caso directamente en Estatus,
// sin partir de una bitácora existente.
function plAbrirEstatusModalNuevo(){
  plAbrirEstatusModal(null);
}

function setPlEstatusTeamLider(persona){
  document.getElementById('plEstatusTeamLider').value = persona ? persona.nombre : '';
  if(persona){
    document.getElementById('plEstatusTeamLiderAvatar').textContent = initials(persona.nombre);
    document.getElementById('plEstatusTeamLiderAvatar').style.background = colorFor(persona.cuadrilla || persona.nombre || '');
    document.getElementById('plEstatusTeamLiderName').textContent = persona.nombre;
    document.getElementById('plEstatusTeamLiderMeta').textContent = (persona.cuadrilla || '—') + ' · ' + (persona.puesto || '—');
    document.getElementById('plEstatusTeamLiderSelected').style.display = 'block';
  } else {
    document.getElementById('plEstatusTeamLiderSelected').style.display = 'none';
  }
}
function setPlEstatusTeamLiderNombreLibre(nombre){
  // Cuando el nombre guardado no coincide con nadie del Listado del Personal (dato antiguo o escrito a mano)
  document.getElementById('plEstatusTeamLider').value = nombre || '';
  if(nombre){
    document.getElementById('plEstatusTeamLiderAvatar').textContent = initials(nombre);
    document.getElementById('plEstatusTeamLiderAvatar').style.background = colorFor(nombre);
    document.getElementById('plEstatusTeamLiderName').textContent = nombre;
    document.getElementById('plEstatusTeamLiderMeta').textContent = '—';
    document.getElementById('plEstatusTeamLiderSelected').style.display = 'block';
  } else {
    document.getElementById('plEstatusTeamLiderSelected').style.display = 'none';
  }
}
const plEstatusTeamLiderSearchEl = document.getElementById('plEstatusTeamLiderSearch');
const plEstatusTeamLiderResultsEl = document.getElementById('plEstatusTeamLiderResults');
plEstatusTeamLiderSearchEl.addEventListener('input', () => {
  const term = plEstatusTeamLiderSearchEl.value.trim().toLowerCase();
  if(!term){ plEstatusTeamLiderResultsEl.classList.remove('show'); plEstatusTeamLiderResultsEl.innerHTML=''; return; }
  const matches = allPeople.filter(p => (p.nombre||'').toLowerCase().includes(term)).slice(0, 20);
  if(matches.length === 0){
    plEstatusTeamLiderResultsEl.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    plEstatusTeamLiderResultsEl.innerHTML = matches.map(p => `
      <div class="site-result-item" data-plestatusteamlider-id="${escapeHtml(p.id)}">
        <div class="site-result-name">${escapeHtml(p.nombre)}</div>
        <div class="site-result-meta">${escapeHtml(p.cuadrilla || '—')} · ${escapeHtml(p.puesto || '—')}</div>
      </div>
    `).join('');
  }
  plEstatusTeamLiderResultsEl.classList.add('show');
});
plEstatusTeamLiderResultsEl.addEventListener('click', (e) => {
  const item = e.target.closest('[data-plestatusteamlider-id]');
  if(!item) return;
  const persona = allPeople.find(p => String(p.id) === String(item.dataset.plestatusteamliderId));
  if(persona){ setPlEstatusTeamLider(persona); }
  plEstatusTeamLiderSearchEl.value = '';
  plEstatusTeamLiderResultsEl.classList.remove('show');
  plEstatusTeamLiderResultsEl.innerHTML = '';
});
document.addEventListener('click', (e) => {
  if(!e.target.closest('#plEstatusTeamLiderSearch') && !e.target.closest('#plEstatusTeamLiderResults')){
    plEstatusTeamLiderResultsEl.classList.remove('show');
  }
});
document.getElementById('plEstatusTeamLiderClear').addEventListener('click', () => setPlEstatusTeamLider(null));

function plActualizarCampoActualizacionSegunEstatus(esCambioManual){
  const valor = document.getElementById('plEstatusValor').value;
  // Bloque "Programado para": solo visible cuando el estatus es Programado.
  const wrapProg = document.getElementById('plEstatusProgramadoWrap');
  if(wrapProg) wrapProg.style.display = (valor === 'programado') ? '' : 'none';
  const inputEl = document.getElementById('plEstatusActualizacion');
  const listaEl = document.getElementById('plEstatusActualizacionLista');
  const campoEl = document.getElementById('plEstatusActualizacionCampo');
  const avisoEl = document.getElementById('plEstatusAvisoAgregarDesdePlantilla');
  const id = Number(document.getElementById('plEstatusPlantillaId').value);
  const p = id ? plListaCache.find(x => x.id === id) : null;

  const tieneAvancesReales = p && (p.avances || []).length > 0;
  const estaPausadoOProgramado = tieneAvancesReales && plEstadoDePlantilla(p) === 'pausado';
  // Ya está en proceso con bitácora activa (no es borrador ni viene de pausa/programado):
  // no hace falta escribir nada aquí, el avance se agrega directo en la Plantilla.
  const yaEnProcesoActivo = valor === 'en_proceso' && tieneAvancesReales && !estaPausadoOProgramado;

  if(yaEnProcesoActivo){
    campoEl.style.display = 'none';
    avisoEl.style.display = '';
    return;
  }
  campoEl.style.display = '';
  avisoEl.style.display = 'none';

  if(valor === 'pendiente_tlf'){
    // Pendiente Movistar: se elige de una lista fija de motivos, no se escribe libre
    inputEl.style.display = 'none';
    listaEl.style.display = '';
    if(!listaEl.value) listaEl.value = listaEl.options[0].value;
  } else {
    inputEl.style.display = '';
    listaEl.style.display = 'none';
    if(valor === 'en_proceso' && estaPausadoOProgramado){
      // Reanudando desde Pausado: se trae el último avance como base.
      // Si venía de Programado no se copia nada: ese texto ya está en la bitácora
      // y arrastrarlo aquí lo duplicaba.
      const ultimo = p.avances[p.avances.length - 1];
      inputEl.value = (ultimo.estado === 'programado') ? '' : (ultimo.descripcion || '');
    } else if(esCambioManual){
      // Si el usuario cambia manualmente a Programado/Pendiente Tek Com/En Proceso (caso nuevo),
      // se limpia el texto para que no quede el motivo de "Pendiente Movistar" como avance de la plantilla.
      inputEl.value = '';
    }
    // Pendiente Tek Com y Programado: se escribe manualmente, no se toca el valor actual
  }
}
document.getElementById('plEstatusValor').addEventListener('change', () => plActualizarCampoActualizacionSegunEstatus(true));

function plAbrirEstatusModal(p){
  const esExistente = !!p;
  document.getElementById('plEstatusModalTitulo').textContent = esExistente ? 'Estatus del caso' : 'Nuevo Estatus';
  document.getElementById('plEstatusPlantillaId').value = esExistente ? p.id : '';

  const camposPropios = ['plEstatusClienteSitio','plEstatusNoTicket','plEstatusTipoAfectacion'];
  camposPropios.forEach(campoId => {
    document.getElementById(campoId).disabled = false;
  });
  document.getElementById('plEstatusTeamLiderSearch').style.display = '';
  document.getElementById('plEstatusTeamLiderClear').style.display = '';

  document.getElementById('plEstatusClienteSitio').value = esExistente ? (p.cliente_sitio || '') : '';
  document.getElementById('plEstatusNoTicket').value = esExistente ? (p.no_ticket || '') : '';
  document.getElementById('plEstatusTipoAfectacion').value = esExistente ? (p.tipo_afectacion || 'Interurbano') : 'Interurbano';

  if(esExistente && p.team_lider){
    const persona = allPeople.find(per => per.nombre === p.team_lider);
    if(persona) setPlEstatusTeamLider(persona);
    else setPlEstatusTeamLiderNombreLibre(p.team_lider);
  } else {
    setPlEstatusTeamLider(null);
  }

  document.getElementById('plEstatusZona').value = esExistente ? (p.estatus_zona || '') : '';
  document.getElementById('plEstatusFechaEscalonamiento').value = esExistente ? (p.estatus_fecha_escalonamiento || '') : plFechaLocalISO(new Date());
  document.getElementById('plEstatusHoraEscalonamiento').value = esExistente ? (p.estatus_hora_escalonamiento ? p.estatus_hora_escalonamiento.slice(0,5) : '') : '';
  document.getElementById('plEstatusValor').value = esExistente ? (p.estatus_valor || 'en_proceso') : 'en_proceso';
  // La fecha/hora programada vive en el último avance de la bitácora (no hay columna nueva en BD).
  const ultimoAvProg = (esExistente && (p.avances || []).length) ? p.avances[p.avances.length - 1] : null;
  const traeProg = ultimoAvProg && ultimoAvProg.estado === 'programado';
  document.getElementById('plEstatusProgFecha').value = traeProg ? (ultimoAvProg.programado_fecha || '') : '';
  document.getElementById('plEstatusProgHora').value = traeProg ? plHHMM(ultimoAvProg.programado_hora || '') : '';
  document.getElementById('plEstatusActualizacion').value = esExistente ? (p.estatus_actualizacion || '') : '';

  const moduloActivo = esExistente ? p.modulo : plFiltroEstatusProyecto;
  document.getElementById('plEstatusOpcionPendienteMovistar').textContent = `Pendiente ${plNombreCortoProyecto(moduloActivo)}`;

  // Una vez que el caso ya tiene bitácora real (avances), no tiene sentido regresarlo a
  // "Pendiente Movistar" o "Pendiente Tek Com" (esos son solo para antes de crear la plantilla).
  const yaEsPlantillaReal = esExistente && (p.avances || []).length > 0;
  document.getElementById('plEstatusOpcionPendienteMovistar').disabled = yaEsPlantillaReal;
  document.getElementById('plEstatusOpcionPendienteTekcom').disabled = yaEsPlantillaReal;

  const estaPausado = esExistente && (p.avances || []).length > 0 && plEstadoDePlantilla(p) === 'pausado';
  document.getElementById('plEstatusAvisoPausado').style.display = estaPausado ? '' : 'none';

  document.getElementById('plEstatusActualizacionLista').value = '';
  plActualizarCampoActualizacionSegunEstatus();

  document.getElementById('plEstatusModalOverlay').classList.add('active');
}


function plCerrarEstatusModal(){
  document.getElementById('plEstatusModalOverlay').classList.remove('active');
}
document.getElementById('plEstatusModalClose').addEventListener('click', plCerrarEstatusModal);
document.getElementById('plEstatusModalCancel').addEventListener('click', plCerrarEstatusModal);

function plFormatearFechaDDMMYYYY(fechaISO){
  if(!fechaISO) return '';
  const [y, m, d] = fechaISO.split('-');
  return `${d}/${m}/${y}`;
}

// Texto automático del primer avance cuando un caso de Estatus pasa a "En Proceso":
// "Personal técnico de Movistar escala el caso [Cliente/Sitio] el día [fecha] a las
// [hora], se coordina con el personal técnico [Team Líder]"
// Texto automático del avance "Programado". Siempre se genera con la fecha/hora
// agendada; si el operador escribió algo en Actualización, se agrega al final.
// `textoBase` se usa cuando el avance programado es además el PRIMERO de la bitácora:
// ahí el texto arranca con la frase de escalado y la programación va como cierre.
function plTextoAvanceProgramado(progFecha, progHora, actualizacion, textoBase){
  const fechaTexto = plFormatearFechaDDMMYYYY(progFecha);
  const cola = `está programado para el día ${fechaTexto} a las ${progHora || ''} horas`;
  let texto = textoBase
    ? `${textoBase}, ${cola}`
    : `Caso programado para el día ${fechaTexto} a las ${progHora || ''} horas`;
  const extra = (actualizacion || '').trim();
  if(extra) texto += `. ${extra}`;
  return texto;
}

function plTextoPrimerAvanceEscalado(clienteSitio, fecha, hora, teamLider, modulo){
  const fechaTexto = plFormatearFechaDDMMYYYY(fecha);
  const nombreTecnico = (teamLider && teamLider !== 'Pendiente Asignar Personal') ? teamLider : 'personal técnico';
  const nombreProyecto = plNombreCortoProyecto(modulo);
  return `Personal técnico de ${nombreProyecto} escala el caso ${clienteSitio || ''} el día ${fechaTexto} a las ${hora || ''}, se coordina con el personal técnico ${nombreTecnico}`;
}

document.getElementById('plEstatusGuardarBtn').addEventListener('click', async () => {
  const idValue = document.getElementById('plEstatusPlantillaId').value;
  const esNuevo = !idValue;
  const id = Number(idValue);

  const clienteSitio = document.getElementById('plEstatusClienteSitio').value.trim();
  const noTicket = document.getElementById('plEstatusNoTicket').value.trim();
  const tipoAfectacion = document.getElementById('plEstatusTipoAfectacion').value;
  const teamLider = document.getElementById('plEstatusTeamLider').value.trim();
  const zona = document.getElementById('plEstatusZona').value;
  const fechaEscalonamiento = document.getElementById('plEstatusFechaEscalonamiento').value;
  const horaEscalonamiento = document.getElementById('plEstatusHoraEscalonamiento').value;
  const valor = document.getElementById('plEstatusValor').value;
  const pExistente = id ? plListaCache.find(x => x.id === id) : null;
  const tieneAvancesReales = pExistente && (pExistente.avances || []).length > 0;
  const estaPausadoOProgramado = tieneAvancesReales && plEstadoDePlantilla(pExistente) === 'pausado';
  const yaEnProcesoActivo = valor === 'en_proceso' && tieneAvancesReales && !estaPausadoOProgramado;
  const actualizacion = yaEnProcesoActivo ? '' : (valor === 'pendiente_tlf'
    ? document.getElementById('plEstatusActualizacionLista').value
    : document.getElementById('plEstatusActualizacion').value
  ).trim();

  if(esNuevo && !clienteSitio){
    showToast('Escribe el Cliente/Sitio', 'error');
    return;
  }
  if(esNuevo && !noTicket){
    showToast('Escribe el No. de Ticket', 'error');
    return;
  }
  if(!zona){
    showToast('Selecciona la zona', 'error');
    return;
  }
  if(!fechaEscalonamiento){
    showToast('Escribe la fecha de escalonamiento', 'error');
    return;
  }
  // Si el estatus es Programado, la fecha/hora agendada es obligatoria: ahí se reanuda el SLA.
  const progFechaEst = document.getElementById('plEstatusProgFecha').value;
  const progHoraEst = document.getElementById('plEstatusProgHora').value;
  if(valor === 'programado' && (!progFechaEst || !progHoraEst)){
    showToast('Para el estatus Programado debes indicar la fecha y hora para la que quedó programado', 'error');
    return;
  }

  const btn = document.getElementById('plEstatusGuardarBtn');
  btn.disabled = true;
  try{
    const ahora = new Date();
    const horaActual = ahora.toTimeString().slice(0,5);
    const fechaActual = plFechaLocalISO(ahora);

    if(esNuevo){
      // Estatus creado directo, sin plantilla previa.
      // "En Proceso" crea de una vez la bitácora con un primer avance;
      // cualquier otro estatus (Pendiente Movistar/Tek Com/Programado) NO crea nada más,
      // el caso solo queda visible en el tablero de Estatus.
      let avances = [];
      if(valor === 'en_proceso'){
        avances = [{ fecha: fechaEscalonamiento, hora: horaEscalonamiento, descripcion: plTextoPrimerAvanceEscalado(clienteSitio, fechaEscalonamiento, horaEscalonamiento, teamLider || 'Pendiente Asignar Personal', plFiltroEstatusProyecto), operador_tekcom: null, materiales: null, estado: 'escalado' }];
      } else if(valor === 'programado'){
        // Programado necesita dejar constancia de la cita: es el único lugar donde se
        // persiste la hora agendada, y de ella depende cuándo arranca el SLA.
        // El avance nace en estado 'programado', así que el SLA queda congelado en 00:00:00
        // hasta que se registre el "Retomado" al pasar a En Proceso.
        const baseEscalado = plTextoPrimerAvanceEscalado(clienteSitio, fechaEscalonamiento, horaEscalonamiento, teamLider || 'Pendiente Asignar Personal', plFiltroEstatusProyecto);
        avances = [{ fecha: fechaActual, hora: horaActual, descripcion: plTextoAvanceProgramado(progFechaEst, progHoraEst, actualizacion, baseEscalado), operador_tekcom: null, materiales: null, estado: 'programado', programado_fecha: progFechaEst, programado_hora: progHoraEst }];
      }

      const tabActiva = document.querySelector('.pl-tab-proyecto.active');
      const modulo = plFiltroEstatusProyecto || (tabActiva ? tabActiva.dataset.plTabProyecto : 'casos');

      const res = await fetch(PLANTILLA_REST_URL, {
        method:'POST',
        headers:{ ...sbHeaders, 'Prefer':'return=representation' },
        body: JSON.stringify({
          modulo,
          cliente_sitio: clienteSitio,
          no_ticket: noTicket,
          tipo_afectacion: tipoAfectacion,
          team_lider: teamLider || 'Pendiente Asignar Personal',
          ticket_fecha: fechaEscalonamiento,
          ticket_hora: horaEscalonamiento || null,
          avances,
          estatus_activo: true,
          estatus_zona: zona,
          estatus_fecha_escalonamiento: fechaEscalonamiento,
          estatus_hora_escalonamiento: horaEscalonamiento || null,
          estatus_valor: valor,
          estatus_actualizacion: actualizacion,
        })
      });
      if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al crear el estatus'); }
      const creado = (await res.json())[0];
      plListaCache.unshift(creado);
      showToast(valor === 'en_proceso' ? 'Caso creado y plantilla generada' : 'Caso agregado al tablero de Estatus');
    } else {
      const p = plListaCache.find(x => x.id === id);
      if(!p){ btn.disabled = false; return; }

      const avancesActuales = p.avances || [];
      const esDraftSinAvances = avancesActuales.length === 0;
      const estabaPausado = avancesActuales.length > 0 && plEstadoDePlantilla(p) === 'pausado';

      const estadoActualPlantilla = plEstadoDePlantilla(p);

      let avancesNuevos = avancesActuales;
      if(valor === 'en_proceso' && esDraftSinAvances){
        // Se promueve de "pendiente" (sin plantilla real) a "en proceso": se crea el primer avance
        // automático de escalado. El SLA arranca en ESTE momento, no en el escalonamiento original,
        // porque mientras el caso estuvo en Pendiente el reloj no debía correr.
        avancesNuevos = [{ fecha: fechaActual, hora: horaActual, descripcion: plTextoPrimerAvanceEscalado(p.cliente_sitio, fechaActual, horaActual, teamLider || p.team_lider || 'Pendiente Asignar Personal', p.modulo), operador_tekcom: null, materiales: null, estado: 'escalado' }];
      } else if(valor === 'programado' && esDraftSinAvances){
        // Borrador sin bitácora que se agenda: se crea el avance 'programado' para
        // persistir la cita. El SLA queda en 00:00:00 hasta el "Retomado".
        const baseEscaladoDraft = plTextoPrimerAvanceEscalado(p.cliente_sitio, fechaEscalonamiento, horaEscalonamiento, teamLider || p.team_lider || 'Pendiente Asignar Personal', p.modulo);
        avancesNuevos = [{ fecha: fechaActual, hora: horaActual, descripcion: plTextoAvanceProgramado(progFechaEst, progHoraEst, actualizacion, baseEscaladoDraft), operador_tekcom: null, materiales: null, estado: 'programado', programado_fecha: progFechaEst, programado_hora: progHoraEst }];
      } else if(valor === 'programado' && estadoActualPlantilla === 'pausado' && avancesActuales.length && avancesActuales[avancesActuales.length - 1].estado === 'programado'){
        // Ya estaba programado y solo se corrigió la fecha/hora de la cita: se actualiza
        // el avance existente en vez de encadenar otro.
        avancesNuevos = avancesActuales.map((av, i) =>
          i === avancesActuales.length - 1
            ? { ...av, programado_fecha: progFechaEst, programado_hora: progHoraEst, descripcion: plTextoAvanceProgramado(progFechaEst, progHoraEst, actualizacion, i === 0 ? plTextoPrimerAvanceEscalado(p.cliente_sitio, fechaEscalonamiento, horaEscalonamiento, teamLider || p.team_lider || 'Pendiente Asignar Personal', p.modulo) : null) }
            : av
        );
      } else if(PL_ESTATUS_EN_ESPERA.includes(valor) && !esDraftSinAvances && estadoActualPlantilla !== 'pausado' && estadoActualPlantilla !== 'finalizado'){
        // El caso venía corriendo y se manda a Pendiente Movistar / Pendiente Tek Com / Programado:
        // se congela el SLA con un avance de pausa. Al volver a "En Proceso" continúa desde aquí.
        const etiquetaPausa = (PL_ESTATUS_OPCIONES[valor] && PL_ESTATUS_OPCIONES[valor].label) || valor;
        const esProgramado = valor === 'programado';
        avancesNuevos = [...avancesActuales, {
          fecha: fechaActual,
          hora: horaActual,
          descripcion: esProgramado
            ? plTextoAvanceProgramado(progFechaEst, progHoraEst, actualizacion)
            : (actualizacion || `SLA en espera: ${etiquetaPausa}`),
          operador_tekcom: null,
          materiales: null,
          estado: esProgramado ? 'programado' : 'pausado',
          programado_fecha: esProgramado ? progFechaEst : null,
          programado_hora: esProgramado ? progHoraEst : null
        }];
      } else if(valor === 'en_proceso' && estabaPausado){
        const ultimoAv = avancesActuales[avancesActuales.length - 1];
        if(ultimoAv && ultimoAv.estado === 'programado'){
          // Venía de PROGRAMADO: no se genera avance automático. El operador registra el
          // "Retomado" a mano desde la Plantilla, con su propia redacción. Sin esto se
          // duplicaba el texto del avance de programación.
          avancesNuevos = avancesActuales;
        } else {
          // Pausa normal (Pendiente Movistar / Tek Com): se reanuda automáticamente.
          avancesNuevos = [...avancesActuales, { fecha: fechaActual, hora: horaActual, descripcion: actualizacion || 'SLA reanudado', operador_tekcom: null, materiales: null, estado: 'despausado' }];
        }
      }

      const res = await fetch(`${PLANTILLA_REST_URL}?id=eq.${id}`, {
        method:'PATCH',
        headers:{ ...sbHeaders, 'Prefer':'return=representation' },
        body: JSON.stringify({
          cliente_sitio: clienteSitio || p.cliente_sitio,
          no_ticket: noTicket || p.no_ticket,
          tipo_afectacion: tipoAfectacion,
          team_lider: teamLider || 'Pendiente Asignar Personal',
          ticket_fecha: p.ticket_fecha || fechaEscalonamiento,
          ticket_hora: p.ticket_hora || (horaEscalonamiento || null),
          estatus_activo: true,
          estatus_zona: zona,
          estatus_fecha_escalonamiento: fechaEscalonamiento,
          estatus_hora_escalonamiento: horaEscalonamiento || null,
          estatus_valor: valor,
          estatus_actualizacion: yaEnProcesoActivo ? p.estatus_actualizacion : actualizacion,
          avances: avancesNuevos,
        })
      });
      if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al guardar el estatus'); }
      const actualizado = (await res.json())[0];
      const idx = plListaCache.findIndex(x => x.id === id);
      if(idx >= 0) plListaCache[idx] = actualizado;

      const btnQuitarEstatus = document.getElementById('plQuitarEstatusBtn');
      if(btnQuitarEstatus) btnQuitarEstatus.style.display = '';

      // Si la bitácora está abierta en pantalla, se refresca su línea de tiempo
      if(Number(document.getElementById('plDetalleId').value) === id){
        plRenderTimeline(actualizado.avances || []);
        plActualizarEstadoFormularioAvance();
      }
      showToast('Estatus actualizado');
    }

    plCerrarEstatusModal();
    const tabActiva = document.querySelector('.pl-tab-proyecto.active');
    if(tabActiva && tabActiva.dataset.plTabProyecto === 'estatus') plRenderEstatusLista();
  }catch(err){
    showToast('No se pudo guardar: ' + err.message, 'error');
  }finally{
    btn.disabled = false;
  }
});

document.getElementById('plQuitarEstatusBtn').addEventListener('click', async () => {
  const id = Number(document.getElementById('plDetalleId').value);
  if(!id) return;
  if(!confirm('¿Quitar este caso del tablero de Estatus?')) return;
  try{
    const res = await fetch(`${PLANTILLA_REST_URL}?id=eq.${id}`, {
      method:'PATCH',
      headers:{ ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify({ estatus_activo: false })
    });
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al quitar de Estatus'); }
    const actualizado = (await res.json())[0];
    const idx = plListaCache.findIndex(x => x.id === id);
    if(idx >= 0) plListaCache[idx] = actualizado;
    document.getElementById('plQuitarEstatusBtn').style.display = 'none';
    showToast('Caso quitado del tablero de Estatus');
  }catch(err){
    showToast('No se pudo quitar: ' + err.message, 'error');
  }
});

/* ============================================================
   TABLERO DE ESTATUS: render agrupado (CLIENTES / INTERURBANOS / MEJORA)
   ============================================================ */
function plCasosEnEstatus(){
  const busq = (plFiltroEstatusBusqueda || '').trim().toLowerCase();
  return plListaCache.filter(p => {
    if(!p.estatus_activo || p.modulo !== plFiltroEstatusProyecto) return false;
    if(plFiltroEstatusValor && plEstatusEfectivo(p) !== plFiltroEstatusValor) return false;
    if(busq){
      const { categoria } = plSeccionYCategoria(p.tipo_afectacion);
      const campo = `${p.no_ticket||''} ${p.cliente_sitio||''} ${p.team_lider||''} ${p.estatus_zona||''} ${categoria||''} ${p.estatus_actualizacion||''}`.toLowerCase();
      if(!campo.includes(busq)) return false;
    }
    return true;
  });
}
let plFiltroEstatusProyecto = 'casos'; // 'casos' | 'hyve' | 'cable'
let plFiltroEstatusValor = ''; // '' (todos) | 'en_proceso' | 'pendiente_tlf' | 'pendiente_tekcom' | 'programado' | 'pausado'
let plFiltroEstatusBusqueda = '';

function plFiltrosBuscarEstatusHtml(){
  const opciones = [
    { valor:'', label:'Todos' },
    { valor:'en_proceso', label:'En Proceso' },
    { valor:'pendiente_tlf', label:`Pendiente ${plNombreCortoProyecto(plFiltroEstatusProyecto)}` },
    { valor:'pendiente_tekcom', label:'Pendiente Tek Com' },
    { valor:'programado', label:'Programado' },
    { valor:'pausado', label:'Pausado' },
  ];
  return `
    <div style="display:flex; gap:14px; align-items:flex-end; flex-wrap:wrap; margin-bottom:14px;">
      <div class="form-field" style="min-width:200px;">
        <label>Estatus</label>
        <select id="plFiltroEstatusValorSel">
          ${opciones.map(o => `<option value="${o.valor}" ${plFiltroEstatusValor === o.valor ? 'selected' : ''}>${o.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-field" style="flex:1; min-width:240px;">
        <label>Buscar</label>
        <input type="text" id="plBuscarEstatusInput" placeholder="TK, cliente, team líder, zona, categoría..." value="${escapeHtml(plFiltroEstatusBusqueda)}">
      </div>
    </div>
  `;
}

function plEnlazarFiltrosBuscarEstatus(wrap){
  const sel = document.getElementById('plFiltroEstatusValorSel');
  const buscar = document.getElementById('plBuscarEstatusInput');
  if(sel) sel.addEventListener('change', () => {
    plFiltroEstatusValor = sel.value;
    plRenderEstatusLista();
  });
  if(buscar){
    buscar.addEventListener('input', () => {
      plFiltroEstatusBusqueda = buscar.value;
      plRenderEstatusLista();
    });
    // Mantiene el foco y la posición del cursor al volver a renderizar mientras se escribe
    buscar.focus();
    const posCursor = buscar.value.length;
    buscar.setSelectionRange(posCursor, posCursor);
  }
}

function plSubtabsEstatusHtml(){
  const opciones = [
    { valor:'casos', label:'Movistar' },
    { valor:'hyve', label:'Hyve' },
    { valor:'cable', label:'Cable Color' },
    { valor:'udp', label:'UDP' },
  ];
  return `
    <div style="display:flex; gap:8px; margin-bottom:14px;">
      ${opciones.map(o => `
        <button type="button" class="btn btn-ghost pl-subtab-estatus ${plFiltroEstatusProyecto === o.valor ? 'active' : ''}" data-pl-estatus-proyecto="${o.valor}" style="${plFiltroEstatusProyecto === o.valor ? 'background:var(--accent-soft, #DBEAFE); border-color:var(--accent, #2563EB);' : ''}">${o.label}</button>
      `).join('')}
    </div>
  `;
}

function plEnlazarSubtabsEstatus(wrap){
  wrap.querySelectorAll('[data-pl-estatus-proyecto]').forEach(btn => {
    btn.addEventListener('click', () => {
      plFiltroEstatusProyecto = btn.dataset.plEstatusProyecto;
      plRenderEstatusLista();
    });
  });
}

function plRenderEstatusLista(){
  const wrap = document.getElementById('plListaWrap');

  // UDP no usa plantillas: lleva una bitácora diaria de asignaciones por escuela.
  if(plFiltroEstatusProyecto === 'udp'){
    renderEstatusUdp(wrap);
    return;
  }

  const casos = plCasosEnEstatus();

  if(casos.length === 0){
    wrap.innerHTML = `
      ${plMembreteEstatusHtml()}
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0;">
        ${plSubtabsEstatusHtml()}
        <div style="display:flex; gap:10px;">
          <button type="button" class="btn btn-ghost" id="btnVerPlantillasDesdeEstatus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            Plantillas
          </button>
          <button type="button" class="btn btn-primary" id="btnNuevoEstatus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Nuevo Estatus
          </button>
        </div>
      </div>
      ${plFiltrosBuscarEstatusHtml()}
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div class="empty-title">No hay casos pendientes en Estatus</div>
        <div class="empty-desc">Agrega un caso directo con "Nuevo Estatus", o márcalo desde su bitácora cuando no se pueda atender de inmediato.</div>
      </div>`;
    const btnVolver = document.getElementById('btnVerPlantillasDesdeEstatus');
    if(btnVolver) btnVolver.addEventListener('click', () => {
      const primerTab = document.querySelector('.pl-tab-proyecto[data-pl-tab-proyecto="casos"]');
      if(primerTab) primerTab.click();
    });
    const btnNuevo = document.getElementById('btnNuevoEstatus');
    if(btnNuevo) btnNuevo.addEventListener('click', plAbrirEstatusModalNuevo);
    plEnlazarSubtabsEstatus(wrap);
    plEnlazarFiltrosBuscarEstatus(wrap);
    return;
  }

  const porSeccion = {};
  PL_SECCIONES_ORDEN.forEach(s => porSeccion[s] = []);
  casos.forEach(p => {
    const { seccion, categoria } = plSeccionYCategoria(p.tipo_afectacion);
    if(!porSeccion[seccion]) porSeccion[seccion] = [];
    porSeccion[seccion].push({ p, categoria });
  });

  let html = `
    ${plMembreteEstatusHtml()}
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      ${plSubtabsEstatusHtml()}
      <div style="display:flex; gap:10px;">
        <button type="button" class="btn btn-ghost" id="btnVerPlantillasDesdeEstatus">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          Plantillas
        </button>
        <button type="button" class="btn btn-ghost" id="btnExportarEstatus">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Exportar Excel
        </button>
        <button type="button" class="btn btn-primary" id="btnNuevoEstatus">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:15px;height:15px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nuevo Estatus
        </button>
      </div>
    </div>
    ${plFiltrosBuscarEstatusHtml()}
    <table>
      <thead>
        <tr>
          <th>Nombre del Caso</th>
          <th>Fecha-Escalonamiento</th>
          <th>TK</th>
          <th>Categoría</th>
          <th>Zona</th>
          <th>Cuadrilla</th>
          <th>Estatus</th>
          <th>Actualización</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
  `;

  PL_SECCIONES_ORDEN.forEach(seccion => {
    const filas = porSeccion[seccion] || [];
    if(filas.length === 0) return;
    html += `<tr><td colspan="9" style="background:#1F4E78; color:#FFFFFF; font-weight:800; letter-spacing:.03em;">${escapeHtml(seccion)}</td></tr>`;
    filas.forEach(({ p, categoria }) => {
      const tienePlantillaReal = (p.avances || []).length > 0;
      const momentoUltimo = tienePlantillaReal ? plMomentoUltimoAvance(p) : null;
      const cronometroHtml = (plEstadoDePlantilla(p) === 'abierto' && momentoUltimo)
        ? `<div style="margin-top:4px;"><span class="pl-cronometro" data-pl-cron-id="${p.id}" data-pl-cron-ts="${momentoUltimo.getTime()}">--:--:--</span></div>`
        : '';
      const estadoPlantillaEstatus = plEstadoDePlantilla(p);
      const slaInfoEstatus = tienePlantillaReal ? plCalcularSlaActivo(p) : null;
      const slaCongeladoEstatus = !!(slaInfoEstatus && (estadoPlantillaEstatus === 'finalizado' || slaInfoEstatus.pausadoAhora));
      const slaHtmlEstatus = (slaInfoEstatus && (!slaInfoEstatus.pausadoAhora || estadoPlantillaEstatus === 'finalizado'))
        ? `<div style="margin-top:2px; font-size:11px; color:var(--text-dim);">SLA: <span class="pl-sla-cronometro" data-pl-sla-id="${p.id}" data-pl-sla-base-ms="${slaInfoEstatus.baseMs}" data-pl-sla-desde-ms="${slaInfoEstatus.desdeMs}" data-pl-sla-congelado="${slaCongeladoEstatus ? '1' : '0'}" data-pl-sla-ms-congelado="${slaInfoEstatus.ms}">--:--:--</span></div>`
        : '';
      html += `
        <tr>
          <td style="font-weight:600;">${escapeHtml(p.cliente_sitio || '—')}</td>
          <td class="mono">${escapeHtml(plEstatusFechaHoraTexto(p))}</td>
          <td class="mono">${escapeHtml(p.no_ticket || '—')}</td>
          <td>${escapeHtml(categoria)}</td>
          <td>${escapeHtml(p.estatus_zona || '—')}</td>
          <td>${escapeHtml(p.team_lider || 'Pendiente Asignar Personal')}</td>
          <td>${plChipEstatusValor(plEstatusEfectivo(p), p.modulo)}${cronometroHtml}${slaHtmlEstatus}</td>
          <td style="max-width:260px; font-size:12.5px; color:var(--text-dim); white-space:normal; overflow-wrap:break-word;">${escapeHtml(p.estatus_actualizacion || '—')}</td>
          <td style="text-align:right;">
            <button class="btn btn-ghost" data-editar-estatus="${p.id}" style="padding:6px 12px; font-size:12.5px;">Editar</button>
            <button class="btn btn-ghost" data-ver-plantilla-estatus="${p.id}" style="padding:6px 12px; font-size:12.5px;">Ver caso</button>
          </td>
        </tr>
      `;
    });
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;

  wrap.querySelectorAll('[data-ver-plantilla-estatus]').forEach(btn => {
    btn.addEventListener('click', () => plAbrirDetalle(Number(btn.dataset.verPlantillaEstatus)));
  });
  wrap.querySelectorAll('[data-editar-estatus]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = plListaCache.find(x => x.id === Number(btn.dataset.editarEstatus));
      if(p) plAbrirEstatusModal(p);
    });
  });

  const btnExportar = document.getElementById('btnExportarEstatus');
  if(btnExportar) btnExportar.addEventListener('click', plExportarEstatusExcel);

  const btnVolver = document.getElementById('btnVerPlantillasDesdeEstatus');
  if(btnVolver) btnVolver.addEventListener('click', () => {
    const primerTab = document.querySelector('.pl-tab-proyecto[data-pl-tab-proyecto="casos"]');
    if(primerTab) primerTab.click();
  });
  const btnNuevo = document.getElementById('btnNuevoEstatus');
  if(btnNuevo) btnNuevo.addEventListener('click', plAbrirEstatusModalNuevo);
  plEnlazarSubtabsEstatus(wrap);
  plEnlazarFiltrosBuscarEstatus(wrap);
  plActualizarCronometros();
  plActualizarSlaCronometros();
}

function plExportarEstatusExcel(){
  const casos = plCasosEnEstatus();
  if(casos.length === 0){
    showToast('No hay casos pendientes en Estatus para exportar', 'error');
    return;
  }
  const porSeccion = {};
  PL_SECCIONES_ORDEN.forEach(s => porSeccion[s] = []);
  casos.forEach(p => {
    const { seccion, categoria } = plSeccionYCategoria(p.tipo_afectacion);
    if(!porSeccion[seccion]) porSeccion[seccion] = [];
    porSeccion[seccion].push({ p, categoria });
  });

  const escapeXlsHtml = (v) => String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let html = '<table border="1" style="border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:11pt;">';
  html += '<thead><tr>';
  ['Nombre del Caso','Fecha-Escalonamiento','TK','Categoría','Zona','Cuadrilla','Estatus','Actualización'].forEach(label => {
    html += `<th style="background-color:#0A6A99;color:#FFFFFF;font-weight:bold;padding:6px 10px;border:1px solid #08526E;white-space:nowrap;">${escapeXlsHtml(label)}</th>`;
  });
  html += '</tr></thead><tbody>';

  PL_SECCIONES_ORDEN.forEach(seccion => {
    const filas = porSeccion[seccion] || [];
    if(filas.length === 0) return;
    html += `<tr><td colspan="8" style="background-color:#1F4E78;color:#FFFFFF;font-weight:bold;padding:6px 10px;">${escapeXlsHtml(seccion)}</td></tr>`;
    filas.forEach(({ p, categoria }) => {
      const est = PL_ESTATUS_OPCIONES[plEstatusEfectivo(p)] || { label:p.estatus_valor || '', bg:'#FFFFFF', color:'#000000' };
      html += '<tr>';
      html += `<td style="padding:5px 10px;border:1px solid #DDDDDD;">${escapeXlsHtml(p.cliente_sitio || '')}</td>`;
      html += `<td style="padding:5px 10px;border:1px solid #DDDDDD;">${escapeXlsHtml(plEstatusFechaHoraTexto(p))}</td>`;
      html += `<td style="padding:5px 10px;border:1px solid #DDDDDD;">${escapeXlsHtml(p.no_ticket || '')}</td>`;
      html += `<td style="padding:5px 10px;border:1px solid #DDDDDD;">${escapeXlsHtml(categoria)}</td>`;
      html += `<td style="padding:5px 10px;border:1px solid #DDDDDD;">${escapeXlsHtml(p.estatus_zona || '')}</td>`;
      html += `<td style="padding:5px 10px;border:1px solid #DDDDDD;">${escapeXlsHtml(p.team_lider || 'Pendiente Asignar Personal')}</td>`;
      html += `<td style="padding:5px 10px;border:1px solid ${est.bg};background-color:${est.bg};color:${est.color};font-weight:bold;">${escapeXlsHtml(est.label)}</td>`;
      html += `<td style="padding:5px 10px;border:1px solid #DDDDDD;">${escapeXlsHtml(p.estatus_actualizacion || '')}</td>`;
      html += '</tr>';
    });
  });
  html += '</tbody></table>';

  const xlsHeader = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8">
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
    <x:Name>Control de Fallas Pendientes NOC</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    </head><body>${html}</body></html>`;

  const blob = new Blob(['\ufeff' + xlsHeader], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  const etiquetaArchivo = { casos:'movistar', hyve:'hyve', cable:'cable-color' }[plFiltroEstatusProyecto] || plFiltroEstatusProyecto;
  link.download = `control-fallas-pendientes-noc-${etiquetaArchivo}-${new Date().toISOString().slice(0,10)}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('Excel de Estatus descargado');
}

// Convierte la URL de una imagen (Supabase Storage) a base64 para poder insertarla en el PDF
function plImagenUrlABase64(url){
  return new Promise((resolve, reject) => {
    fetch(url).then(r => {
      if(!r.ok) throw new Error('No se pudo descargar la imagen');
      return r.blob();
    }).then(blob => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve({
          dataUrl: reader.result,
          width: img.naturalWidth || 800,
          height: img.naturalHeight || 600,
          tipo: blob.type && blob.type.includes('png') ? 'PNG' : 'JPEG'
        });
        img.onerror = () => reject(new Error('Imagen inválida'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
      reader.readAsDataURL(blob);
    }).catch(reject);
  });
}

document.getElementById('plDescargarPdfBtn').addEventListener('click', async () => {
  const id = Number(document.getElementById('plDetalleId').value);
  const p = plListaCache.find(x => x.id === id);
  if(!p) return;

  const etiquetaProyectoCorta = p.modulo === 'casos' ? 'Movistar' : plEtiquetaProyecto(p.modulo);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation:'portrait', unit:'pt', format:'a4' });
  const margen = 40;
  const anchoUtil = 515;
  let y = margen;

  // Encabezado tipo formulario (igual a la plantilla original en papel)
  const encabezadoAlto = 60;
  const colLogoAncho = 90;
  const colTablaAncho = 160;
  const colTituloAncho = anchoUtil - colLogoAncho - colTablaAncho;

  pdf.setDrawColor(0);
  pdf.setLineWidth(1);
  pdf.rect(margen, y, anchoUtil, encabezadoAlto);
  pdf.line(margen + colLogoAncho, y, margen + colLogoAncho, y + encabezadoAlto);
  pdf.line(margen + colLogoAncho + colTituloAncho, y, margen + colLogoAncho + colTituloAncho, y + encabezadoAlto);

  try{
    const logoAnchoPdf = colLogoAncho - 20;
    const logoAltoPdf = logoAnchoPdf * (42/123);
    pdf.addImage(LOGO_TEKCOM_BASE64, 'PNG', margen + 10, y + (encabezadoAlto - logoAltoPdf)/2, logoAnchoPdf, logoAltoPdf);
  }catch(e){ console.error('No se pudo agregar el logo al PDF:', e); }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('PLANTILLA DE AVANCE', margen + colLogoAncho + colTituloAncho/2, y + encabezadoAlto/2 + 5, { align:'center' });

  const filaAlto = encabezadoAlto / 3;
  const tablaX = margen + colLogoAncho + colTituloAncho;
  const etiquetaAncho = colTablaAncho * 0.55;

  pdf.setLineWidth(0.5);
  pdf.line(tablaX, y + filaAlto, tablaX + colTablaAncho, y + filaAlto);
  pdf.line(tablaX, y + filaAlto*2, tablaX + colTablaAncho, y + filaAlto*2);
  pdf.line(tablaX + etiquetaAncho, y, tablaX + etiquetaAncho, y + encabezadoAlto);

  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Código', tablaX + etiquetaAncho/2, y + filaAlto/2 + 3, { align:'center' });
  pdf.text('Versión', tablaX + etiquetaAncho/2, y + filaAlto*1.5 + 3, { align:'center' });
  pdf.text('Fecha de Versión', tablaX + etiquetaAncho/2, y + filaAlto*2.5 + 3, { align:'center' });

  pdf.setFont('helvetica', 'normal');
  const centroValor = tablaX + etiquetaAncho + (colTablaAncho - etiquetaAncho)/2;
  pdf.text('NOC-FO-001', centroValor, y + filaAlto/2 + 3, { align:'center' });
  pdf.text('2.1', centroValor, y + filaAlto*1.5 + 3, { align:'center' });
  pdf.text('17/7/2023', centroValor, y + filaAlto*2.5 + 3, { align:'center' });

  y += encabezadoAlto + 22;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  [
    `Ticket: ${p.no_ticket || '—'}`,
    `Proyecto: ${etiquetaProyectoCorta}`,
    `Cliente / Sitio: ${p.cliente_sitio || '—'}`,
    `${plEtiquetaOperadorCliente(p.modulo)}: ${p.operador_telco || '—'}`,
    `Operador Tekcom: ${p.operador_tekcom || '—'}`,
    `Team Líder: ${p.team_lider || '—'}`,
    `Tipo de Afectación: ${p.tipo_afectacion || '—'}`
  ].forEach(linea => { pdf.text(linea, margen, y); y += 14; });
  y += 8;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Línea de tiempo', margen, y);
  y += 10;
  pdf.setDrawColor(200);
  pdf.line(margen, y, margen + anchoUtil, y);
  y += 16;

  const etiquetas = { normal:'Normal', pausado:'Pausado', despausado:'Retomado', escalado:'Escalado', finalizado:'Finalizado' };
  const catalogoMap = Object.fromEntries(MATERIALES_CATALOGO.map(([label, col]) => [col, label]));
  const materialesTotales = {};

  (p.avances || []).forEach((av, idx) => {
    if(y > 760){ pdf.addPage(); y = margen; }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.text(`${idx + 1}. ${av.fecha || ''} ${av.hora || ''} — ${etiquetas[av.estado] || av.estado}`, margen, y);
    y += 13;

    pdf.setFont('helvetica', 'normal');
    const lineas = pdf.splitTextToSize(av.descripcion || '', anchoUtil);
    lineas.forEach(linea => {
      if(y > 780){ pdf.addPage(); y = margen; }
      pdf.text(linea, margen, y);
      y += 12;
    });

    if(av.operador_tekcom){
      if(y > 780){ pdf.addPage(); y = margen; }
      pdf.setFontSize(8.5);
      pdf.setTextColor(120);
      pdf.text(`Creado por: ${av.operador_tekcom}`, margen, y);
      pdf.setTextColor(0);
      pdf.setFontSize(9.5);
      y += 12;
    }

    if(av.materiales){
      Object.entries(av.materiales).forEach(([col, cant]) => {
        if(Number(cant) > 0){
          materialesTotales[col] = (materialesTotales[col] || 0) + Number(cant);
        }
      });
    }
    y += 8;
  });

  const materialesUsados = Object.entries(materialesTotales);
  if(materialesUsados.length > 0){
    if(y > 740){ pdf.addPage(); y = margen; }
    y += 8;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Materiales utilizados', margen, y);
    y += 10;
    pdf.setDrawColor(200);
    pdf.line(margen, y, margen + anchoUtil, y);
    y += 16;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    materialesUsados.forEach(([col, cant]) => {
      if(y > 780){ pdf.addPage(); y = margen; }
      pdf.text(`• ${catalogoMap[col] || col}: ${cant}`, margen, y);
      y += 13;
    });
  }

  // Tiempo de Afectación: Pausado (suma de pausas) y SLA (tiempo activo, sin pausas)
  const pausadoMinutosPdf = plCalcularIntervaloPausasMinutos(p.avances || []);
  const slaInfoPdf = plCalcularSlaActivo(p);
  if(y > 730){ pdf.addPage(); y = margen; }
  y += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Tiempo de Afectación', margen, y);
  y += 10;
  pdf.setDrawColor(200);
  pdf.line(margen, y, margen + anchoUtil, y);
  y += 16;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.text(`Pausado: ${minutesToHHMM(pausadoMinutosPdf) || '00:00'}`, margen, y);
  y += 13;
  pdf.text(`SLA: ${slaInfoPdf ? (minutesToHHMM(slaInfoPdf.ms / 60000) || '00:00') : '—'}`, margen, y);
  y += 13;

  // Evidencia del caso: las fotos del ticket, 2 por página
  if(p.imagenes && p.imagenes.length > 0){
    pdf.addPage();
    y = margen;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Evidencia del caso', margen, y);
    y += 10;
    pdf.setDrawColor(200);
    pdf.line(margen, y, margen + anchoUtil, y);
    y += 16;

    const maxAltoImg = 360; // dos imágenes de este alto, más el espacio de encabezado, caben en una página carta

    for(let i = 0; i < p.imagenes.length; i++){
      const urlImagen = p.imagenes[i];
      try{
        const { dataUrl, width, height, tipo } = await plImagenUrlABase64(urlImagen);
        const maxAncho = anchoUtil;
        let anchoImg = maxAncho;
        let altoImg = (height / width) * anchoImg;
        if(altoImg > maxAltoImg){
          altoImg = maxAltoImg;
          anchoImg = (width / height) * altoImg;
        }
        // Cada 2 imágenes, página nueva (excepto antes de la primera)
        if(i > 0 && i % 2 === 0){
          pdf.addPage();
          y = margen;
        }
        const xImg = margen + (anchoUtil - anchoImg) / 2; // centrada horizontalmente
        pdf.addImage(dataUrl, tipo, xImg, y, anchoImg, altoImg);
        y += altoImg + 24;
      }catch(e){
        console.error('No se pudo agregar una imagen al PDF:', e);
      }
    }
  }

  const sanear = (txt) => (txt || '').replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const nombreArchivo = `${sanear(p.cliente_sitio) || 'Cliente'}_${sanear(p.no_ticket) || 'ticket'}.pdf`;
  // Pie de página con los datos de contacto de Tekcom, en todas las páginas
  const totalPaginas = pdf.internal.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const footerAncho = pageWidth;
  const footerAlto = footerAncho * (59 / 1395);
  for(let pagina = 1; pagina <= totalPaginas; pagina++){
    pdf.setPage(pagina);
    pdf.addImage(PDF_FOOTER_DATAURI, 'PNG', 0, pageHeight - footerAlto, footerAncho, footerAlto);
  }

  pdf.save(nombreArchivo);

  // Abrir el correo con el asunto y el cuerpo ya escritos (el PDF hay que
  // arrastrarlo a mano: los navegadores no permiten adjuntar archivos
  // automáticamente a un correo por seguridad)
  const asunto = `${p.cliente_sitio || 'Cliente'} — ${p.no_ticket || 'Ticket'}`;
  const cuerpo = [
    `Se comparte seguimiento del siguiente ticket:`,
    '',
    `Ticket: ${p.no_ticket || '—'}`,
    `Proyecto: ${etiquetaProyectoCorta}`,
    `Cliente / Sitio: ${p.cliente_sitio || '—'}`,
    `${plEtiquetaOperadorCliente(p.modulo)}: ${p.operador_telco || '—'}`,
    `Operador Tekcom: ${p.operador_tekcom || '—'}`,
    `Team Líder: ${p.team_lider || '—'}`,
    `Tipo de Afectación: ${p.tipo_afectacion || '—'}`
  ].join('\n');

  showToast('PDF descargado. Abriendo tu correo — recuerda adjuntar el archivo.');
  setTimeout(() => {
    const destinatarios = coCache.filter(c => (c.proyecto || 'casos') === p.modulo).map(c => c.correo).filter(Boolean).join(',');
    window.location.href = `mailto:${destinatarios}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  }, 500);
});

// ============================================================
// BLOQUEO DE EDITAR/ELIMINAR POR FILA EN CADA TABLA (no solo el
// botón de "Agregar"). "Ver" = solo lectura de verdad: no puede
// editar ni eliminar registros existentes.
// ============================================================
const OPK_RESTRICCIONES_EDICION = [
  { tabId:'personal',     subId:'listado',   contenedorId:'subtabp-listado',    attr:'data-action' },
  { tabId:'personal',     subId:'vehiculos', contenedorId:'subtabp-vehiculos',  attr:'data-vaction' },
  { tabId:'personal',     subId:'accesos',   contenedorId:'subtabp-accesos',    attr:'data-remove-acceso', soloEliminar:true },
  { tabId:'sitios',       subId:'listado',   contenedorId:'subtab-listado',     attr:'data-saction' },
  { tabId:'casos',        subId:'listado',   contenedorId:'subtabc-listado',    attr:'data-caction' },
  { tabId:'hyve',         subId:'listado',   contenedorId:'subtabh-listado',    attr:'data-haction' },
  { tabId:'udp',          subId:'listado',   contenedorId:'subtabu-listado',    attr:'data-uaction' },
  { tabId:'cable',        subId:'listado',   contenedorId:'subtabcb-listado',   attr:'data-cbaction' },
  { tabId:'actividades',  subId:null,        contenedorId:'view-actividades',   attr:'data-aaction' },
  { tabId:'cumplimiento', subId:null,        contenedorId:'view-cumplimiento',  attr:'data-caction' }
];

function opkPuedeEditarSeccion(tabId, subId){
  if(!opkSesionActual) return false;
  const accesoTotal = opkSesionActual.rol === 'admin' || opkSesionActual.rol === 'editor_total';
  if(accesoTotal) return true;
  const permisoTab = (opkSesionActual.permisos && opkSesionActual.permisos[tabId]) || {};
  if(subId){
    const permisoSub = (permisoTab.subtabs && permisoTab.subtabs[subId]) || {};
    return !!permisoSub.editar;
  }
  return !!permisoTab.editar;
}

function opkAplicarRestriccionEnContenedor(cfg){
  const cont = document.getElementById(cfg.contenedorId);
  if(!cont) return;
  const puedeEditar = opkPuedeEditarSeccion(cfg.tabId, cfg.subId);
  cont.querySelectorAll(`[${cfg.attr}]`).forEach(btn => {
    const valor = btn.getAttribute(cfg.attr);
    const esAccionRestringida = cfg.soloEliminar ? true : (valor === 'edit' || valor === 'delete');
    if(esAccionRestringida){
      btn.style.display = puedeEditar ? '' : 'none';
    }
  });
}

function opkAplicarTodasRestriccionesEdicion(){
  OPK_RESTRICCIONES_EDICION.forEach(opkAplicarRestriccionEnContenedor);
}

let opkObservadoresEdicionListos = false;
function opkObservarRestriccionesEdicion(){
  opkAplicarTodasRestriccionesEdicion();
  if(opkObservadoresEdicionListos) return;
  opkObservadoresEdicionListos = true;
  OPK_RESTRICCIONES_EDICION.forEach(cfg => {
    const cont = document.getElementById(cfg.contenedorId);
    if(!cont) return;
    const observer = new MutationObserver(() => opkAplicarRestriccionEnContenedor(cfg));
    observer.observe(cont, { childList:true, subtree:true });
  });
}

const AUTH_URL = `${SUPABASE_URL}/auth/v1`;

async function opkAuthLogin(usuario, password){
  const res = await fetch(`${AUTH_URL}/token?grant_type=password`, {
    method:'POST',
    headers:{ 'apikey': SUPABASE_KEY, 'Content-Type':'application/json' },
    body: JSON.stringify({ email: opkUsuarioAEmail(usuario), password })
  });
  if(!res.ok) throw new Error('Usuario o contraseña incorrectos.');
  return await res.json();
}
async function opkAuthRefresh(refreshToken){
  const res = await fetch(`${AUTH_URL}/token?grant_type=refresh_token`, {
    method:'POST',
    headers:{ 'apikey': SUPABASE_KEY, 'Content-Type':'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if(!res.ok) throw new Error('Sesión expirada');
  return await res.json();
}
async function opkAuthLogout(accessToken){
  await fetch(`${AUTH_URL}/logout`, {
    method:'POST',
    headers:{ 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${accessToken}` }
  });
}
function opkGuardarTokens(authData, usuario){
  // A partir de aquí las consultas viajan como el usuario, no como anónimo.
  sbUsarToken(authData.access_token);
  try{
    localStorage.setItem(OPK_SESION_KEY, JSON.stringify({
      access_token: authData.access_token,
      refresh_token: authData.refresh_token,
      usuario: usuario
    }));
  }catch(e){}
}
async function opkFetchPerfilPorUsuario(usuario, accessToken){
  const res = await fetch(`${USUARIOS_TABLA_URL}?usuario=eq.${encodeURIComponent(usuario)}&select=id,nombre,usuario,rol,permisos`, {
    headers:{ 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${accessToken}` }
  });
  if(!res.ok) throw new Error('No se pudo cargar tu perfil de permisos');
  const data = await res.json();
  return data[0] || null;
}

function opkIniciarSesion(usuario){
  opkSesionActual = usuario;
  document.body.classList.remove('opk-mostrar-login');
  document.body.classList.add('opk-sesion-activa');
  opkOcultarCarga();
  opkAplicarPermisosUI(usuario);
  plActualizarVisibilidadSegunPermisos();
  opkMostrarSesionEnSidebar(usuario);
  opkRestaurarUltimaVista();
  opkColapsarMenuInicial();
  opkObservarRestriccionesEdicion();
  if(typeof plCargarLista === 'function') plCargarLista();
}

document.getElementById('loginBtn').addEventListener('click', async () => {
  const usuarioInput = document.getElementById('loginUsuario').value.trim();
  const passwordInput = document.getElementById('loginPassword').value;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  errorEl.textContent = '';

  if(!usuarioInput || !passwordInput){
    errorEl.textContent = 'Ingresa tu usuario y contraseña.';
    return;
  }

  btn.disabled = true;
  const textoOriginal = btn.textContent;
  btn.textContent = 'Verificando...';
  try{
    const authData = await opkAuthLogin(usuarioInput, passwordInput);
    let perfil = await opkFetchPerfilPorUsuario(usuarioInput, authData.access_token);
    if(!perfil){
      errorEl.textContent = 'Tu cuenta existe pero no tiene un perfil de permisos asignado. Pide al administrador que lo cree en "Gestionar Usuarios y Accesos".';
      return;
    }
    perfil = await opkAsegurarUsuarioPrincipal(perfil, authData.access_token);
    opkGuardarTokens(authData, usuarioInput);
    opkIniciarSesion({ ...perfil, access_token: authData.access_token });
  }catch(err){
    console.error(err);
    errorEl.textContent = err.message || 'Usuario o contraseña incorrectos.';
  }finally{
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
});

document.getElementById('loginPassToggle').addEventListener('click', () => {
  const input = document.getElementById('loginPassword');
  const btn = document.getElementById('loginPassToggle');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.classList.toggle('showing', !showing);
});

document.getElementById('loginPassword').addEventListener('keydown', (e) => {
  if(e.key === 'Enter') document.getElementById('loginBtn').click();
});
document.getElementById('loginUsuario').addEventListener('keydown', (e) => {
  if(e.key === 'Enter') document.getElementById('loginPassword').focus();
});

// Restaurar sesión si ya había una activa, renovando el token con Supabase Auth
// (evita el flasheo del login mostrando una pantalla de carga mientras se verifica)
(async function opkRestaurarSesion(){
  let guardado = null;
  try{
    const raw = localStorage.getItem(OPK_SESION_KEY);
    guardado = raw ? JSON.parse(raw) : null;
  }catch(e){}

  if(!guardado || !guardado.refresh_token){
    opkMostrarLogin();
    return;
  }

  // Los refresh_token de Supabase son de un solo uso: al recargar varias veces
  // muy seguido, una recarga puede intentar usar un token que otra recarga ya
  // "gastó" un instante antes. En vez de cerrar sesión de inmediato ante ese
  // error, esperamos un momento y releemos localStorage (que ya tendría el
  // token nuevo guardado por esa otra recarga) e intentamos una vez más.
  async function intentarConToken(tokenAUsar, reintentando){
    try{
      const authData = await opkAuthRefresh(tokenAUsar);
      const usuarioActual = guardado.usuario || (authData.user && authData.user.email ? authData.user.email.split('@')[0] : null);
      if(!usuarioActual){ opkMostrarLogin(); return; }
      let perfil = await opkFetchPerfilPorUsuario(usuarioActual, authData.access_token);
      if(!perfil){ opkMostrarLogin(); return; }
      perfil = await opkAsegurarUsuarioPrincipal(perfil, authData.access_token);
      opkGuardarTokens(authData, usuarioActual);
      opkIniciarSesion({ ...perfil, access_token: authData.access_token });
    }catch(err){
      if(!reintentando){
        // Puede que otra recarga muy reciente ya haya rotado el token.
        // Esperamos un poco y releemos localStorage antes de rendirnos.
        await new Promise(r => setTimeout(r, 500));
        let guardadoFresco = null;
        try{
          const raw2 = localStorage.getItem(OPK_SESION_KEY);
          guardadoFresco = raw2 ? JSON.parse(raw2) : null;
        }catch(e){}
        const tokenFresco = guardadoFresco && guardadoFresco.refresh_token;
        if(tokenFresco && tokenFresco !== tokenAUsar){
          await intentarConToken(tokenFresco, true);
          return;
        }
      }
      console.error('No se pudo restaurar la sesión:', err);
      try{ localStorage.removeItem(OPK_SESION_KEY); }catch(e){}
      opkMostrarLogin();
    }
  }

  await intentarConToken(guardado.refresh_token, false);
})();

// Si la página se restaura desde el caché de atrás/adelante del navegador (bfcache),
// se fuerza a cerrar sesión y mostrar el login: así "atrás" saca de la sesión y
// "adelante" no puede volver a mostrar el panel ya autenticado.
window.addEventListener('pageshow', (event) => {
  if(event.persisted){
    try{ localStorage.removeItem(OPK_SESION_KEY); }catch(e){}
    opkSesionActual = null;
    opkMostrarLogin();
  }
});

// ============================================================
// ID ESCUELAS UDP
// Catálogo propio de UDP: cada escuela se registra una sola vez con su ID
// (único) y su nombre, para no tener que reescribirlos en cada caso.
// ============================================================
let allEscuelas = [];
let escuelasLoaded = false;
let editandoEscuelaId = null;

async function fetchEscuelas(force){
  if(escuelasLoaded && !force) return;
  const wrap = document.getElementById('escuelasTablaWrap');
  if(wrap) wrap.innerHTML = '<div class="material-empty">Cargando...</div>';
  try{
    const res = await fetch(`${ESCUELAS_REST_URL}?select=*&order=nombre.asc`, { headers: sbHeaders });
    if(!res.ok) throw new Error(await res.text());
    allEscuelas = await res.json();
    escuelasLoaded = true;
    renderEscuelasTabla();
  }catch(err){
    if(wrap) wrap.innerHTML = `<div class="material-empty">No se pudieron cargar las escuelas: ${escapeHtml(err.message)}</div>`;
  }
}

function escuelasFiltradas(){
  const q = (document.getElementById('escuelaSearch')?.value || '').trim().toLowerCase();
  if(!q) return allEscuelas;
  return allEscuelas.filter(e =>
    [e.id_escuela, e.nombre, e.municipio, e.distrito, e.departamento]
      .some(v => String(v || '').toLowerCase().includes(q))
  );
}

function renderEscuelasTabla(){
  const wrap = document.getElementById('escuelasTablaWrap');
  if(!wrap) return;
  const filas = escuelasFiltradas();

  const cont = document.getElementById('escuelaContador');
  if(cont){
    cont.textContent = filas.length === allEscuelas.length
      ? `${allEscuelas.length} escuela(s)`
      : `${filas.length} de ${allEscuelas.length}`;
  }

  if(!filas.length){
    wrap.innerHTML = allEscuelas.length
      ? '<div class="material-empty">Ninguna escuela coincide con la búsqueda</div>'
      : '<div class="material-empty">Aún no hay escuelas registradas. Usa "+ Agregar Escuela".</div>';
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Nombre</th>
          <th>Departamento</th>
          <th>Municipio</th>
          <th>Distrito</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${filas.map(e => `
          <tr>
            <td class="mono" style="font-weight:700;">${escapeHtml(e.id_escuela || '—')}</td>
            <td>${escapeHtml(e.nombre || '—')}</td>
            <td>${escapeHtml(e.departamento || '—')}</td>
            <td>${escapeHtml(e.municipio || '—')}</td>
            <td>${escapeHtml(e.distrito || '—')}</td>
            <td>
              <div class="row-actions" style="justify-content:flex-end;">
                <button class="icon-btn" data-escuela-editar="${e.id}" title="Editar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="icon-btn danger" data-escuela-borrar="${e.id}" title="Eliminar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  wrap.querySelectorAll('[data-escuela-editar]').forEach(btn => {
    btn.addEventListener('click', () => abrirEscuelaModal(Number(btn.dataset.escuelaEditar)));
  });
  wrap.querySelectorAll('[data-escuela-borrar]').forEach(btn => {
    btn.addEventListener('click', () => eliminarEscuela(Number(btn.dataset.escuelaBorrar)));
  });
}

// Cascada Departamento -> Municipio -> Distrito, la misma de Casos Movistar.
(function initEscuelaDepartamentos(){
  const sel = document.getElementById('esc_departamento');
  if(!sel) return;
  Object.keys(SV_DIVISION).forEach(dep => {
    sel.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(dep)}">${escapeHtml(dep)}</option>`);
  });
})();

function escActualizarMunicipios(municipioSel, distritoSel){
  const dep = document.getElementById('esc_departamento').value;
  const sel = document.getElementById('esc_municipio');
  const municipios = Object.keys(SV_DIVISION[dep] || {});
  sel.innerHTML = municipios.length
    ? '<option value="">— Selecciona —</option>' + municipios.map(m =>
        `<option value="${escapeHtml(m)}" ${m === municipioSel ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('')
    : '<option value="">— Elige Departamento —</option>';
  escActualizarDistritos(distritoSel);
}

function escActualizarDistritos(distritoSel){
  const dep = document.getElementById('esc_departamento').value;
  const mun = document.getElementById('esc_municipio').value;
  const sel = document.getElementById('esc_distrito');
  const distritos = ((SV_DIVISION[dep] || {})[mun]) || [];
  sel.innerHTML = distritos.length
    ? '<option value="">— Selecciona —</option>' + distritos.map(d =>
        `<option value="${escapeHtml(d)}" ${d === distritoSel ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('')
    : '<option value="">— Elige Municipio —</option>';
}

document.getElementById('esc_departamento')?.addEventListener('change', () => escActualizarMunicipios());
document.getElementById('esc_municipio')?.addEventListener('change', () => escActualizarDistritos());

function abrirEscuelaModal(registroId){
  const e = registroId ? allEscuelas.find(x => x.id === registroId) : null;
  editandoEscuelaId = e ? e.id : null;

  document.getElementById('escuelaModalTitle').textContent = e ? 'Editar Escuela' : 'Agregar Escuela';
  document.getElementById('esc_registro_id').value = e ? e.id : '';
  document.getElementById('esc_id').value = e?.id_escuela || '';
  document.getElementById('esc_nombre').value = e?.nombre || '';
  document.getElementById('esc_departamento').value = e?.departamento || '';
  escActualizarMunicipios(e?.municipio || '', e?.distrito || '');

  document.getElementById('escuelaModalOverlay').classList.add('active');
}

function cerrarEscuelaModal(){
  document.getElementById('escuelaModalOverlay').classList.remove('active');
  editandoEscuelaId = null;
}

async function guardarEscuela(){
  const idEscuela = document.getElementById('esc_id').value.trim();
  const nombre = document.getElementById('esc_nombre').value.trim();

  if(!idEscuela){ showToast('Escribe el ID de la escuela', 'error'); return; }
  if(!nombre){ showToast('Escribe el nombre de la escuela', 'error'); return; }

  // El ID es único: se valida contra el catálogo ya cargado antes de enviar,
  // para dar un mensaje claro en vez del error crudo de la base.
  const repetido = allEscuelas.find(x =>
    String(x.id_escuela).toLowerCase() === idEscuela.toLowerCase() && x.id !== editandoEscuelaId
  );
  if(repetido){
    plMostrarErrorCentro(`El ID ${idEscuela} ya está registrado para "${repetido.nombre}". Los ID no pueden repetirse.`);
    return;
  }

  const payload = {
    id_escuela: idEscuela,
    nombre,
    departamento: document.getElementById('esc_departamento').value || null,
    municipio: document.getElementById('esc_municipio').value || null,
    distrito: document.getElementById('esc_distrito').value || null,
  };

  const btn = document.getElementById('escuelaGuardarBtn');
  btn.disabled = true;
  try{
    const url = editandoEscuelaId ? `${ESCUELAS_REST_URL}?id=eq.${editandoEscuelaId}` : ESCUELAS_REST_URL;
    const res = await fetch(url, {
      method: editandoEscuelaId ? 'PATCH' : 'POST',
      headers: { ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify(payload)
    });
    if(!res.ok){
      const t = await res.text();
      // 23505 es la violación de unicidad de Postgres.
      if(t.includes('23505')) throw new Error(`El ID ${idEscuela} ya existe en la base.`);
      throw new Error(t);
    }
    cerrarEscuelaModal();
    await fetchEscuelas(true);
    showToast(editandoEscuelaId ? 'Escuela actualizada' : 'Escuela agregada');
  }catch(err){
    plMostrarErrorCentro('No se pudo guardar: ' + err.message);
  }finally{
    btn.disabled = false;
  }
}

async function eliminarEscuela(registroId){
  const e = allEscuelas.find(x => x.id === registroId);
  if(!e) return;
  if(!confirm(`¿Eliminar la escuela ${e.id_escuela} — ${e.nombre}?`)) return;
  try{
    const res = await fetch(`${ESCUELAS_REST_URL}?id=eq.${registroId}`, { method:'DELETE', headers: sbHeaders });
    if(!res.ok) throw new Error(await res.text());
    await fetchEscuelas(true);
    showToast('Escuela eliminada');
  }catch(err){
    showToast('No se pudo eliminar: ' + err.message, 'error');
  }
}

document.getElementById('btnAddEscuela')?.addEventListener('click', () => abrirEscuelaModal(null));
document.getElementById('escuelaModalClose')?.addEventListener('click', cerrarEscuelaModal);
document.getElementById('escuelaCancelBtn')?.addEventListener('click', cerrarEscuelaModal);
document.getElementById('escuelaGuardarBtn')?.addEventListener('click', guardarEscuela);
document.getElementById('escuelaModalOverlay')?.addEventListener('click', (ev) => {
  if(ev.target === document.getElementById('escuelaModalOverlay')) cerrarEscuelaModal();
});
document.getElementById('escuelaSearch')?.addEventListener('input', renderEscuelasTabla);

// ============================================================
// CREACIÓN DE CASO UDP DESDE PLANTILLA
// Mismo patrón que los otros tres proyectos: al finalizar la plantilla se
// vuelca toda la información al caso. Si ya existe uno vinculado se actualiza.
// ============================================================
async function plCrearCasoUdpDesdePlantilla(p, materiales){
  try{
    const t = plCalcularTiemposYFechaAuto(p);
    const ultimoAvance = (p.avances || [])[(p.avances || []).length - 1];

    const payload = {
      clasificacion: p.tipo_afectacion || null,
      red: null, // catálogo propio: lo elige el operador en el caso
      casos: p.cliente_sitio || null,
      id_externo: p.no_ticket || null,
      nombre_del_tecnico: (p.team_lider && p.team_lider !== 'Pendiente Asignar Personal') ? p.team_lider : null,
      mes: t.mes,
      dia: t.dia,
      escalonamiento: t.escalonamientoIso,
      resolucion: t.resolucionIso,
      sla: minutesToHHMM(t.slaMinutos),
      causa: p.causa || null,
      sub_categoria: p.sub_categoria || null,
      observacion: plResumenPlantillaParaObservacion(p, ultimoAvance),
      status: 'En Proceso',
    };

    UDP_MATERIALES_CATALOGO.forEach(([label, col]) => {
      payload[col] = (materiales && materiales[col]) ? materiales[col] : 0;
    });

    // Si la plantilla ya tiene un caso vinculado, se actualiza ese directamente.
    let casoExistenteId = p.caso_id || null;
    if(!casoExistenteId && payload.id_externo){
      try{
        const resBuscar = await fetch(`${UDP_REST_URL}?id_externo=eq.${encodeURIComponent(payload.id_externo)}&select=id&limit=1`, { headers: sbHeaders });
        if(resBuscar.ok){
          const encontrados = await resBuscar.json();
          if(encontrados.length > 0) casoExistenteId = encontrados[0].id;
        }
      }catch(_){}
    }

    const url = casoExistenteId ? `${UDP_REST_URL}?id=eq.${casoExistenteId}` : UDP_REST_URL;
    const res = await fetch(url, {
      method: casoExistenteId ? 'PATCH' : 'POST',
      headers: { ...sbHeaders, 'Prefer':'return=representation' },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error(await res.text());

    const creado = (await res.json())[0];
    if(creado && !p.caso_id){
      await fetch(`${PLANTILLA_REST_URL}?id=eq.${p.id}`, {
        method:'PATCH', headers: sbHeaders,
        body: JSON.stringify({ caso_id: creado.id })
      });
    }
    showToast(casoExistenteId ? 'Caso UDP actualizado' : 'Caso creado en UDP');
  }catch(err){
    showToast('No se pudo crear el caso en UDP: ' + err.message, 'error');
  }
}

// ============================================================
// BITÁCORA DE ESTATUS UDP
// A diferencia de los otros proyectos, UDP no trabaja con plantillas: lleva un
// registro diario de asignaciones. Cada fila es una asignación (una misma
// escuela puede repetirse con distinto responsable el mismo día).
// ============================================================