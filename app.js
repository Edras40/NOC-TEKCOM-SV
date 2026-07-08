/* ============================================================
   CONFIG SUPABASE
============================================================ */
const SUPABASE_URL = 'https://rrmbrrtymzvzkbeghgep.supabase.co';
const SUPABASE_KEY = 'sb_publishable_g3wJOWDBcIruveywkcH48A_r5Nd1wSd';
const REST_URL = `${SUPABASE_URL}/rest/v1/tecnicos`;

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

/* ============================================================
   MULTI-SELECT DE FILTROS
   Convierte <select multiple id="X"> en un dropdown con checkboxes.
   El <select> original se mantiene oculto y sincronizado: sigue
   funcionando con document.getElementById(id).addEventListener('change', ...)
============================================================ */
const MS = { wraps:{}, firstFillDone:new Set() };
const MS_STORAGE_PREFIX = 'opk_filtro_';

function msStorageGet(id){
  try{
    const raw = localStorage.getItem(MS_STORAGE_PREFIX + id);
    return raw ? JSON.parse(raw) : [];
  }catch(e){ return []; }
}
function msStorageSet(id, values){
  try{ localStorage.setItem(MS_STORAGE_PREFIX + id, JSON.stringify(values)); }catch(e){}
}

// Usada por las funciones que repueblan opciones (fillSelect/fillDash/fillMat, etc).
// La primera vez que se llena un filtro en la sesión, recupera lo guardado en
// localStorage; después de eso respeta la selección actual en pantalla.
function msRestoreOrCurrent(id){
  if(!MS.firstFillDone.has(id)){
    MS.firstFillDone.add(id);
    const stored = msStorageGet(id);
    if(stored.length) return stored;
  }
  return msVal(id);
}

function msEnhance(id, opts={}){
  const sel = document.getElementById(id);
  if(!sel || MS.wraps[id]) return;
  sel.setAttribute('multiple','multiple');
  sel.classList.add('ms-native');
  // Antes de activar "multiple", el navegador ya había marcado la primera opción
  // (value="") como seleccionada por defecto. Eso haría creer al filtro que el
  // usuario eligió "" y ocultaría todos los datos. Se limpia esa selección.
  Array.from(sel.options).forEach(o => { o.selected = false; });

  const blue = !!opts.blue;
  const searchable = !!opts.searchable;

  const wrap = document.createElement('div');
  wrap.className = 'ms-wrap';
  wrap.innerHTML = `
    <div class="ms-trigger ${blue ? 'ms-trigger-blue' : ''}" tabindex="0">
      <span class="ms-trigger-label"></span>
      <div style="display:flex; align-items:center; gap:6px;">
        <span class="ms-badge" style="display:none;"></span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
    </div>
    <div class="ms-panel">
      ${searchable ? '<div class="ms-panel-search"><input type="text" placeholder="Buscar..."></div>' : ''}
      <div class="ms-panel-actions">
        <span class="ms-panel-actionbtn" data-ms-act="all">Todos</span>
        <span class="ms-panel-actionbtn" data-ms-act="none">Limpiar</span>
      </div>
      <div class="ms-panel-list"></div>
    </div>
  `;
  sel.insertAdjacentElement('afterend', wrap);

  MS.wraps[id] = { sel, wrap, defaultLabel: opts.defaultLabel || 'Todos' };

  // Si este filtro tiene opciones fijas en el HTML (no se repuebla luego con
  // datos del servidor), restaurar aquí mismo lo guardado en localStorage.
  if(!opts.dynamic){
    MS.firstFillDone.add(id);
    const stored = msStorageGet(id);
    if(stored.length){
      const validValues = new Set(Array.from(sel.options).map(o=>o.value));
      const restored = stored.filter(v => validValues.has(v));
      Array.from(sel.options).forEach(o => { o.selected = restored.includes(o.value); });
    }
  }

  const trigger = wrap.querySelector('.ms-trigger');
  trigger.addEventListener('click', () => {
    const willOpen = !wrap.classList.contains('open');
    document.querySelectorAll('.ms-wrap.open').forEach(w => { if(w!==wrap) w.classList.remove('open'); });
    wrap.classList.toggle('open', willOpen);
    if(willOpen){
      const search = wrap.querySelector('.ms-panel-search input');
      if(search){ search.value=''; msFilterOptionsUI(wrap); }
    }
  });

  wrap.querySelector('[data-ms-act="all"]').addEventListener('click', (e) => {
    e.stopPropagation();
    Array.from(sel.options).forEach(o => o.selected = false);
    msRefresh(id);
    sel.dispatchEvent(new Event('change', {bubbles:true}));
  });
  wrap.querySelector('[data-ms-act="none"]').addEventListener('click', (e) => {
    e.stopPropagation();
    Array.from(sel.options).forEach(o => o.selected = false);
    msRefresh(id);
    sel.dispatchEvent(new Event('change', {bubbles:true}));
  });

  const searchInput = wrap.querySelector('.ms-panel-search input');
  if(searchInput){
    searchInput.addEventListener('click', e => e.stopPropagation());
    searchInput.addEventListener('input', () => msFilterOptionsUI(wrap));
  }

  msRefresh(id);
}

function msFilterOptionsUI(wrap){
  const search = wrap.querySelector('.ms-panel-search input');
  const term = search ? search.value.trim().toLowerCase() : '';
  wrap.querySelectorAll('.ms-option').forEach(row => {
    const label = row.dataset.label || '';
    row.style.display = !term || label.includes(term) ? '' : 'none';
  });
}

function msRefresh(id){
  const entry = MS.wraps[id];
  if(!entry) return;
  const { sel, wrap, defaultLabel } = entry;
  const list = wrap.querySelector('.ms-panel-list');
  const options = Array.from(sel.options).filter(o => o.value !== '');
  const selected = options.filter(o => o.selected);

  msStorageSet(id, selected.map(o => o.value));

  if(options.length === 0){
    list.innerHTML = `<div class="ms-panel-empty">Sin opciones</div>`;
  }else{
    list.innerHTML = options.map(o => `
      <label class="ms-option" data-value="${escapeHtml(o.value)}" data-label="${escapeHtml(o.textContent.toLowerCase())}">
        <input type="checkbox" ${o.selected ? 'checked' : ''}>
        <span class="ms-option-label">${o.innerHTML}</span>
      </label>`).join('');
  }

  list.querySelectorAll('.ms-option').forEach(row => {
    row.addEventListener('click', (e) => {
      e.preventDefault();
      const cb = row.querySelector('input');
      cb.checked = !cb.checked;
      const val = row.dataset.value;
      const opt = Array.from(sel.options).find(o => o.value === val);
      if(opt) opt.selected = cb.checked;
      msRefresh(id);
      sel.dispatchEvent(new Event('change', {bubbles:true}));
    });
  });

  const trigger = wrap.querySelector('.ms-trigger');
  const labelEl = trigger.querySelector('.ms-trigger-label');
  const badgeEl = trigger.querySelector('.ms-badge');
  if(selected.length === 0){
    labelEl.textContent = defaultLabel;
    badgeEl.style.display = 'none';
  }else if(selected.length === 1){
    labelEl.textContent = selected[0].textContent;
    badgeEl.style.display = 'none';
  }else{
    labelEl.textContent = selected.map(o=>o.textContent).join(', ');
    badgeEl.textContent = selected.length;
    badgeEl.style.display = '';
  }
}

// Devuelve los valores seleccionados (array vacío = "todos")
function msVal(id){
  const sel = document.getElementById(id);
  if(!sel) return [];
  return Array.from(sel.selectedOptions).map(o => o.value);
}

// Establece la selección; conserva solo los valores que sigan siendo válidos
function msSetVal(id, values){
  const entry = MS.wraps[id];
  const sel = document.getElementById(id);
  if(!sel) return;
  const set = new Set((values||[]).map(String));
  Array.from(sel.options).forEach(o => { o.selected = set.has(o.value); });
  if(entry) msRefresh(id);
}


document.addEventListener('click', (e) => {
  const path = e.composedPath ? e.composedPath() : [];
  document.querySelectorAll('.ms-wrap.open').forEach(w => {
    if(!path.includes(w)) w.classList.remove('open');
  });
});

// Activa el modo "selección múltiple" en todos los filtros del sistema
[
  ['cuadrillaFilter', {defaultLabel:'Todas las cuadrillas', searchable:true}],
  ['puestoFilter', {defaultLabel:'Todos los puestos'}],
  ['estadoGpsFilter', {defaultLabel:'Todos los estados GPS'}],
  ['accesoZonaFilter', {defaultLabel:'Todas las zonas'}],
  ['regionFilter', {defaultLabel:'Todas las regiones', searchable:true, dynamic:true}],
  ['propietarioFilter', {defaultLabel:'Todos los propietarios', searchable:true, dynamic:true}],
  ['casoStatusFilter', {blue:true, defaultLabel:'Todos'}],
  ['casoZonaFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['casoRedFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['casoClasificacionFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['casoAnoFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['casoMesFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['casoSemanaFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['casoDiaFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['dashClasificacionFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['dashAnoFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['dashMesFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['dashSemanaFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['dashDiaFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['matAnoFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['matMesFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['matSemanaFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['matDiaFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['matZonaFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['matClasificacionFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['hyveStatusFilter', {blue:true, defaultLabel:'Todos'}],
  ['hyveClasificacionFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['hyveAnoFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['hyveMesFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['hyveSemanaFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['hyveDashClasificacionFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['hyveDashAnoFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['hyveDashMesFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['hyveDashSemanaFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['hyveMatAnoFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['hyveMatMesFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['hyveMatSemanaFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['hyveMatClasificacionFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['udpClasificacionFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['udpAnoFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['udpMesFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['udpDiaFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['udpCausaFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['udpMatClasificacionFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['udpMatAnoFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['udpMatMesFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['udpMatDiaFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['cableStatusFilter', {blue:true, defaultLabel:'Todos'}],
  ['cableZonaFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['cableClasificacionFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['cableAnoFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['cableMesFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['cableSemanaFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['cableDashClasificacionFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['cableDashAnoFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['cableDashMesFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['cableDashSemanaFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['cableMatAnoFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['cableMatMesFilter', {blue:true, defaultLabel:'Todos', dynamic:true}],
  ['cableMatSemanaFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
  ['cableMatClasificacionFilter', {blue:true, defaultLabel:'Todas', dynamic:true}],
].forEach(([id, o]) => msEnhance(id, o));



/* ============================================================
   CATÁLOGO DE CASOS ATENDIDOS — materiales y subcategorías
============================================================ */
const MATERIALES_CATALOGO = [
  ['Termo contraíbles','termo_contraibles'],['Conectores Uy','conectores_uy'],
  ['Cierre de 48','cierre_de_48'],['Cierre giganet','cierre_giganet'],['Cierre de 24','cierre_de_24'],
  ['Cierre de 12','cierre_de_12'],['Cierre de 96','cierre_de_96'],['Cierre de 6','cierre_de_6'],
  ['FO 48H','fo_48h'],['FO 24H','fo_24h'],['FO 6H','fo_6h'],['FO 12H','fo_12h'],
  ['Cable neopreno','cable_neopreno'],['Cable UTP','cable_utp'],
  ['Conectores RJ11','conectores_rj11'],['Conectores RJ 45','conectores_rj_45'],
  ['Preformados','preformados'],['Preformados punta 24','preformados_punta_24'],
  ['Preformados punta 48','preformados_punta_48'],['Preformados punta 12','preformados_punta_12'],
  ['Preformada Punto Verde','preformada_punto_verde'],['Preformado punto Rosado','preformado_punto_rosado'],
  ['Preformada Punto Rojo','preformada_punto_rojo'],['Preformada Punto Amarillo','preformada_punto_amarillo'],
  ['Preformada Punto Azul','preformada_punto_azul'],['Preformada Punto Blanco','preformada_punto_blanco'],
  ['Preformada Punto Morado','preformada_punto_morado'],['Performado Punto Café','performado_punto_cafe'],
  ['Performado punto Negro','performado_punto_negro'],['Preformado para extran','preformado_para_extran'],
  ['Preformada Punto Naranja','preformada_punto_naranja'],
  ['Fusiones','fusiones'],['Mediciones Potencia','mediciones_potencia'],['Mediciones OTDR','mediciones_otdr'],
  ['Mufas Intervenidas','mufas_intervenidas'],['Pigtail','pigtail'],['Acoplador','acoplador'],
  ['Acomodo de reserva','acomodo_de_reserva'],['Metros tensados','metros_tensados'],
  ['Patchcord','patchcord'],['Tenzores','tenzores'],['Recorrido Reserva (Metros)','recorrido_reserva_metros'],
  ['Corasa','corasa'],['Cincho plástico 7','cincho_platico_7'],
  ['Cinchos plástico de 4"','cinchos_plastico_de_4'],['Cinchos plástico de 14"','cinchos_plastico_de_14'],
  ['Cinta aislante','cinta_aislante'],['Escalados a estructura H','escalados_a_estructura_h'],
  ['Abrazadera 9-11','abrazadera_9_11'],['Abrazadera 3-5','abrazadera_3_5'],['Abrazadera 5-7','abrazadera_5_7'],
  ['Abrazadera 7/9','abrazadera_7_9'],['Abrazadera 7-14','abrazadera_7_14'],
  ['Brindaje de FO','brindaje_de_fo'],['Conectores Módulo C.T','conectores_modulo_c_t'],
  ['Poste Metálico (8 metros)','poste_metalico_8_metros'],['Poste Metálico','poste_metalico'],
];

const HYVE_MATERIALES_CATALOGO = [
  ['Cierre 48H','cierre_48h'],['Cierre 24H','cierre_24h'],['Cierre 12H','cierre_12h'],
  ['Cierre 6H','cierre_6h'],['Cierre 96H','cierre_96h'],
  ['FO 1H','fo_1h'],['FO 48H','fo_48h'],['FO 24H','fo_24h'],['FO 6H','fo_6h'],['FO 12H','fo_12h'],
  ['Termocontraibles','termocontraibles'],['Cinta Velcro CM','cinta_velcro_cm'],
  ['Preformada 96','preformada_96'],['Preformada Punto Verde','preformada_punto_verde'],
  ['Preformada Punto Azul','preformada_punto_azul'],['Preformada Punto Café','preformada_punto_cafe'],
  ['Preformada Punto Rojo','preformada_punto_rojo'],['Preformada Punto Amarillo','preformada_punto_amarillo'],
  ['Preformada Punto Morada','preformada_punto_morada'],['Preformada Punto Naranja','preformada_punto_naranja'],
  ['Caja Liu','caja_liu'],['Fusiones','fusiones'],
  ['Mediciones Potencia','mediciones_potencia'],['Mediciones OTDR','mediciones_otdr'],
  ['Cierres Intervenidos','cierres_intervenidos'],['Patchcord','patchcord'],
  ['Tramos Tensados','tramos_tensados'],['Tensores','tensores'],['Router','router'],
  ['Sinchos plásticos','sinchos_plasticos'],['Grapas','grapas'],
  ['Acomodo de reserva','acomodo_de_reserva'],['Recorrido Reserva (Metros)','recorrido_reserva_metros'],
  ['Abrazadera 7-9','abrazadera_7_9'],['Abrazadera 9-11','abrazadera_9_11'],['Abrazadera 11-13','abrazadera_11_13'],
  ['POSTES','postes'],
];

const UDP_MATERIALES_CATALOGO = [
  ['Fusiones','fusiones'],['Cierre de 48','cierre_de_48'],['Conectores UY','conectores_uy'],
  ['Cierre de 24','cierre_de_24'],['Cierre de 12','cierre_de_12'],['Cierre Giganet','cierre_giganet'],
  ['Cierre de 6','cierre_de_6'],['Cierre de 96','cierre_de_96'],['Cierre Tipo Domo','cierre_tipo_domo'],
  ['FO 48H','fo_48h'],['FO 24H','fo_24h'],['FO 6H','fo_6h'],['FO 4H','fo_4h'],['FO 13H','fo_13h'],['FO 12H','fo_12h'],
  ['Cable UTP','cable_utp'],['Conectores RJ45','conectores_rj45'],['Termocontraibles','termocontraibles'],
  ['Preformada de 6','preformada_de_6'],['Preformada de 12','preformada_de_12'],['Preformada de 24','preformada_de_24'],
  ['Preformada de 48','preformada_de_48'],['Preformado Punto Celeste','preformado_punto_celeste'],
  ['Preformada Punto Azul','preformada_punto_azul'],['Preformada Punto Verde','preformada_punto_verde'],
  ['Preformada Punto Rojo','preformada_punto_rojo'],['Preformada Punto Amarillo','preformada_punto_amarillo'],
  ['Preformado Gris','preformado_gris'],['Preformado Café','preformado_cafe'],['Preformada Blanca','preformada_blanca'],
  ['Preformada Punto Negro','preformada_punto_negro'],['Preformada Punto Morado','preformada_punto_morado'],
  ['Preformada Punto Naranja','preformada_punto_naranja'],['Mediciones Potencia','mediciones_potencia'],
  ['Mediciones OTDR','mediciones_otdr'],['Mufas Intervenidas','mufas_intervenidas'],['Pigtail','pigtail'],
  ['Acoplador','acoplador'],['Acomodo de Reserva','acomodo_de_reserva'],['Metros Tensados','metros_tensados'],
  ['Cinchos Plásticos','cinchos_plasticos'],['Patchcord','patchcord'],['Tenzores','tenzores'],
  ['Recorrido Reserva (Metros)','recorrido_reserva_metros'],['Corasa','corasa'],['Cinta Anulada','cinta_anulada'],
  ['Cinta Aislante','cinta_aislante'],['Abrazadera 9-11','abrazadera_9_11'],['Abrazadera 3-5','abrazadera_3_5'],
  ['Abrazadera 5-7','abrazadera_5_7'],['Abrazadera 7-9','abrazadera_7_9'],['Evilla','evilla'],
  ['Cinta Vandi','cinta_vandi'],['SFP','sfp'],['Chapas','chapas'],['Conectores Módulo C.T','conectores_modulo_ct'],
  ['Poste Metálico (8 metros)','poste_metalico_8_metros'],['Fleje','fleje'],['Pernos de 6"','pernos_de_6'],
  ['Argolla','argolla'],['Bandeja','bandeja'],['Firewall','firewall'],['Caja Liu','caja_liu'],
];

const SUB_CATEGORIA_OPCIONES = [
  'Mordedura de Ardilla','Mordedura de Raton','Mordedura de Hormiga','Mordedura de Gusano',
  'Hilo quebrado en cierre','Hilo quebrado en cierre de botella','Por camion','Por Maquinaria',
  'Accidente Vial','Por Podas','Por Tenanza','Por Posteria','Caida de Arbol','Derrumbe',
  'Disparo de arma de Fuego','Fo atenuada','Cambio de conector','Por Energia','Reinicio de equipos',
  'FO Quemada','Machetazo','Falla AC','Falla de Energia en el local del cliente',
  'Daño en la FO de cliente','Problemas de red Interna','Problemas de equipo','Equipos Desconectados',
  'Intermintencia','Hilo cortado en empalme','Par Dañado En empalme','Validacion de Tono',
  'Optimizacion','Patch cord dañado','Por Terceros','Por Vandalismo','Cambio de puerto','Hurto',
  'Hilo atenuado en cierre','Instalacion de FO','Daño interno en FO','Modulo de CT dañado',
  'Configuración Caja Liu','Cable UTP cortado','Preventivo Mediciones','Hilo en punta',
  'Fusiones en nodo','Tubos dañados en cierre sin visita','Reubicacion de poste',
  'Limpieza de ventiladora','Remodelacion',
];

/* ============================================================
   STATE
============================================================ */
let allPeople = [];
let currentEditId = null;
let pendingDeleteId = null;

/* ============================================================
   SIDEBAR / NAV / THEME
============================================================ */
const sidebar = document.getElementById('sidebar');
document.getElementById('sbToggle').addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  const isCollapsed = sidebar.classList.contains('collapsed');
  const stickyH = document.querySelector('.casos-sticky-header');
  if(stickyH){
    stickyH.style.left = isCollapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w)';
  }
});

document.getElementById('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  document.querySelector('#themeToggle .nav-label').textContent = isLight ? 'Modo oscuro' : 'Modo claro';
  localStorage_setSafe('opk-theme', isLight ? 'light' : 'dark');
});
// in-memory fallback since artifacts/iframes may block localStorage — guard it
function localStorage_setSafe(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
function localStorage_getSafe(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }

// Restaurar el tema guardado (si lo hay) al cargar la página
(function applySavedTheme(){
  const saved = localStorage_getSafe('opk-theme');
  if(saved === 'light'){
    document.body.classList.add('light');
    document.querySelector('#themeToggle .nav-label').textContent = 'Modo oscuro';
  }
})();

const views = {
  inicio: { title:'Operacion Tekcom- El Salvador', sub:'' },
  personal: { title:'Listado del Personal', sub:'' },
  sitios: { title:'Sitios Movistar', sub:'' },
  casos: { title:'', sub:'' },
  hyve: { title:'', sub:'' },
  udp: { title:'', sub:'' },
  cable: { title:'', sub:'' },
  actividades: { title:'Actividades Diarias', sub:'' },
  cumplimiento: { title:'Cumplimiento de Visitas', sub:'' }
};

let sitiosLoaded = false;
let casosLoaded = false;
let hyveLoaded = false;
let udpLoaded = false;
let cableLoaded = false;
let actividadesLoaded = false;
let nominaInitialized = false;

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const v = item.dataset.view;
    try{ localStorage.setItem('opk_ultima_vista', v); }catch(e){}
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.view').forEach(s => s.classList.remove('active'));
    document.getElementById('view-' + v).classList.add('active');
    document.getElementById('topbarTitle').textContent = views[v].title;
    document.getElementById('topbarSub').textContent = views[v].sub;
    document.getElementById('topbarSub').style.display = views[v].sub ? '' : 'none';
    document.querySelector('.topbar').style.display = views[v].title ? '' : 'none';
    // Mostrar sticky header solo en Casos Movistar / HYVE / UDP / Cable Color
    const stickyH = document.querySelector('.casos-sticky-header');
    if(stickyH) stickyH.style.display = v === 'casos' ? 'block' : 'none';
    const stickyHyve = document.querySelector('.hyve-sticky-header');
    if(stickyHyve) stickyHyve.style.display = v === 'hyve' ? 'block' : 'none';
    const stickyUdp = document.querySelector('.udp-sticky-header');
    if(stickyUdp) stickyUdp.style.display = v === 'udp' ? 'block' : 'none';
    const stickyCable = document.querySelector('.cable-sticky-header');
    if(stickyCable) stickyCable.style.display = v === 'cable' ? 'block' : 'none';
    renderTopbarActions(v);
    if(v === 'casos') setTimeout(ajustarPaddingCasos, 200);
    if(v === 'hyve') setTimeout(ajustarPaddingHyve, 200);
    if(v === 'udp') setTimeout(ajustarPaddingUdp, 200);
    if(v === 'cable') setTimeout(ajustarPaddingCable, 200);
    if(v === 'sitios' && !sitiosLoaded){
      sitiosLoaded = true;
      fetchSitios();
    }
    if(v === 'casos' && !casosLoaded){
      casosLoaded = true;
      fetchCasos();
    }
    if(v === 'hyve' && !hyveLoaded){
      hyveLoaded = true;
      fetchHyve();
    }
    if(v === 'udp' && !udpLoaded){
      udpLoaded = true;
      fetchUdp();
    }
    if(v === 'cable' && !cableLoaded){
      cableLoaded = true;
      fetchCable();
    }
    if(v === 'actividades' && !actividadesLoaded){
      actividadesLoaded = true;
      fetchActividades();
    }
    if(v === 'cumplimiento' && !cumplimientoLoaded){
      cumplimientoLoaded = true;
      fetchCumplimiento();
    }
  });
});

/* ---- Sub-tabs dentro de Sitios Movistar: Sitios / Nómina ---- */
document.querySelectorAll('[data-subtab]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.subtab;
    try{ localStorage.setItem('opk_subtab_sitios', tab); }catch(e){}
    document.querySelectorAll('[data-subtab]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('subtab-listado').classList.remove('active');
    document.getElementById('subtab-nomina').classList.remove('active');
    document.getElementById('subtab-' + tab).classList.add('active');
    if(tab === 'nomina' && !nominaInitialized){
      nominaInitialized = true;
      initNomina();
    }
  });
});

/* ---- Sub-tabs dentro de Listado del Personal: Listado / Vehículos / Accesos ---- */
let vehiculosLoaded = false;
document.querySelectorAll('[data-subtab-p]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.subtabP;
    try{ localStorage.setItem('opk_subtab_personal', tab); }catch(e){}
    document.querySelectorAll('[data-subtab-p]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('subtabp-listado').classList.remove('active');
    document.getElementById('subtabp-vehiculos').classList.remove('active');
    document.getElementById('subtabp-accesos').classList.remove('active');
    document.getElementById('subtabp-' + tab).classList.add('active');
    if(tab === 'vehiculos' && !vehiculosLoaded){
      vehiculosLoaded = true;
      fetchVehiculos();
    }
    if(tab === 'accesos'){
      renderAccesosTable();
    }
  });
});

/* ---- Sub-tabs dentro de Casos Atendidos: Listado / Dashboard ---- */
function ajustarPaddingCasos(){
  const header = document.querySelector('.casos-sticky-header');
  const topbar = document.querySelector('.topbar');
  if(!header) return;
  const topbarH = (topbar && topbar.style.display !== 'none') ? topbar.offsetHeight : 0;
  header.style.top = topbarH + 'px';
  const headerH = header.offsetHeight;
  document.querySelectorAll('#view-casos .subtab-pane').forEach(pane => {
    pane.style.paddingTop = headerH + 'px';
  });
}

document.querySelectorAll('[data-subtab-c]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.subtabC;
    try{ localStorage.setItem('opk_subtab_casos', tab); }catch(e){}
    document.querySelectorAll('[data-subtab-c]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('subtabc-listado').classList.remove('active');
    document.getElementById('subtabc-dashboard').classList.remove('active');
    document.getElementById('subtabc-materiales').classList.remove('active');
    document.getElementById('subtabc-' + tab).classList.add('active');
    // Mostrar solo la barra de filtros de la pestaña activa
    document.querySelectorAll('.casos-filterbar').forEach(b => b.style.display = 'none');
    const fb = document.getElementById('filterbar-' + tab);
    if(fb) fb.style.display = 'flex';
    if(tab === 'dashboard'){ initDashboard(); }
    if(tab === 'materiales'){ initMateriales(); }
    setTimeout(ajustarPaddingCasos, 200);
  });
});

// También ajustar al entrar a la vista de casos
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    if(item.dataset.view === 'casos'){
      setTimeout(ajustarPaddingCasos, 200);
    }
  });
});

window.addEventListener('resize', ajustarPaddingCasos);

/* ---- Sub-tabs dentro de HYVE: Listado / Dashboard / Materiales (mismo patrón que Casos) ---- */
function ajustarPaddingHyve(){
  const header = document.querySelector('.hyve-sticky-header');
  const topbar = document.querySelector('.topbar');
  if(!header) return;
  const topbarH = (topbar && topbar.style.display !== 'none') ? topbar.offsetHeight : 0;
  header.style.top = topbarH + 'px';
  const headerH = header.offsetHeight;
  document.querySelectorAll('#view-hyve .subtab-pane').forEach(pane => {
    pane.style.paddingTop = headerH + 'px';
  });
}

document.querySelectorAll('[data-subtab-h]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.subtabH;
    try{ localStorage.setItem('opk_subtab_hyve', tab); }catch(e){}
    document.querySelectorAll('[data-subtab-h]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('subtabh-listado').classList.remove('active');
    document.getElementById('subtabh-dashboard').classList.remove('active');
    document.getElementById('subtabh-materiales').classList.remove('active');
    document.getElementById('subtabh-' + tab).classList.add('active');
    // Mostrar solo la barra de filtros de la pestaña activa
    document.querySelectorAll('.hyve-filterbar').forEach(b => b.style.display = 'none');
    const fb = document.getElementById('hyve-filterbar-' + tab);
    if(fb) fb.style.display = 'flex';
    if(tab === 'dashboard'){ initHyveDashboard(); }
    if(tab === 'materiales'){ initHyveMateriales(); }
    setTimeout(ajustarPaddingHyve, 200);
  });
});

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    if(item.dataset.view === 'hyve'){
      setTimeout(ajustarPaddingHyve, 200);
    }
  });
});

window.addEventListener('resize', ajustarPaddingHyve);

/* ---- Sub-tabs dentro de UDP: Listado / Materiales ---- */
function ajustarPaddingUdp(){
  const header = document.querySelector('.udp-sticky-header');
  const topbar = document.querySelector('.topbar');
  if(!header) return;
  const topbarH = (topbar && topbar.style.display !== 'none') ? topbar.offsetHeight : 0;
  header.style.top = topbarH + 'px';
  const headerH = header.offsetHeight;
  document.querySelectorAll('#view-udp .subtab-pane').forEach(pane => {
    pane.style.paddingTop = headerH + 'px';
  });
}

document.querySelectorAll('[data-subtab-u]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.subtabU;
    try{ localStorage.setItem('opk_subtab_udp', tab); }catch(e){}
    document.querySelectorAll('[data-subtab-u]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('subtabu-listado').classList.remove('active');
    document.getElementById('subtabu-materiales').classList.remove('active');
    document.getElementById('subtabu-' + tab).classList.add('active');
    document.querySelectorAll('.udp-filterbar').forEach(b => b.style.display = 'none');
    const fb = document.getElementById('udp-filterbar-' + tab);
    if(fb) fb.style.display = 'flex';
    if(tab === 'materiales'){ initUdpMateriales(); }
    setTimeout(ajustarPaddingUdp, 200);
  });
});

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    if(item.dataset.view === 'udp'){
      setTimeout(ajustarPaddingUdp, 200);
    }
  });
});

window.addEventListener('resize', ajustarPaddingUdp);

/* ---- Sub-tabs dentro de Cable Color: Listado / Dashboard / Materiales ---- */
function ajustarPaddingCable(){
  const header = document.querySelector('.cable-sticky-header');
  const topbar = document.querySelector('.topbar');
  if(!header) return;
  const topbarH = (topbar && topbar.style.display !== 'none') ? topbar.offsetHeight : 0;
  header.style.top = topbarH + 'px';
  const headerH = header.offsetHeight;
  document.querySelectorAll('#view-cable .subtab-pane').forEach(pane => {
    pane.style.paddingTop = headerH + 'px';
  });
}

document.querySelectorAll('[data-subtab-cb]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.subtabCb;
    try{ localStorage.setItem('opk_subtab_cable', tab); }catch(e){}
    document.querySelectorAll('[data-subtab-cb]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('subtabcb-listado').classList.remove('active');
    document.getElementById('subtabcb-dashboard').classList.remove('active');
    document.getElementById('subtabcb-materiales').classList.remove('active');
    document.getElementById('subtabcb-' + tab).classList.add('active');
    document.querySelectorAll('.cable-filterbar').forEach(b => b.style.display = 'none');
    const fb = document.getElementById('cable-filterbar-' + tab);
    if(fb) fb.style.display = 'flex';
    if(tab === 'dashboard'){ initCableDashboard(); }
    if(tab === 'materiales'){ initCableMateriales(); }
    setTimeout(ajustarPaddingCable, 200);
  });
});

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    if(item.dataset.view === 'cable'){
      setTimeout(ajustarPaddingCable, 200);
    }
  });
});

window.addEventListener('resize', ajustarPaddingCable);

function renderTopbarActions(view){
  const wrap = document.getElementById('topbarActions');
  wrap.innerHTML = '';
}

/* ============================================================
   TOAST
============================================================ */
function showToast(msg, type='success'){
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type === 'success'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
  el.innerHTML = icon + `<span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity .25s'; setTimeout(()=>el.remove(), 250); }, 3200);
}

/* ============================================================
   AVATAR / CHIP COLOR HELPERS
============================================================ */
const PALETTE = ['#0A6A99','#1382BD','#3DDC97','#E8A23D','#5C8FB0','#C266E8','#E86A8A','#4FB8A8'];
function colorFor(str){
  let hash = 0;
  for (let i=0;i<str.length;i++){ hash = str.charCodeAt(i) + ((hash<<5)-hash); }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
function initials(name){
  if(!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0]||'') + (parts[1]?.[0]||'')).toUpperCase();
}

/* ============================================================
   FETCH DATA
============================================================ */
async function fetchPeople(){
  try{
    const res = await fetch(`${REST_URL}?select=*&order=cuadrilla.asc,puesto.asc`, { headers: sbHeaders });
    if(!res.ok) throw new Error('Error al cargar datos (' + res.status + ')');
    allPeople = await res.json();
    if(typeof triggerMapaDraw === 'function') triggerMapaDraw();
    renderStats();
    renderTable();
  }catch(err){
    console.error(err);
    document.getElementById('tableWrap').innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <div class="empty-title">No se pudo conectar con la base de datos</div>
        <div class="empty-desc">${err.message}</div>
      </div>`;
    showToast('Error al conectar con Supabase', 'error');
  }
}

function renderStats(){
  // Las tarjetas de estadísticas de Inicio fueron reemplazadas por botones de navegación.
  // Se deja esta función sin efecto para no romper fetchPeople() si en el futuro se reintroducen.
  const elTotal = document.getElementById('statTotal');
  if(!elTotal) return;
  elTotal.textContent = allPeople.length;
  const placas = new Set(allPeople.filter(p=>p.placa_vehiculo).map(p=>p.placa_vehiculo));
  document.getElementById('statVehiculos').textContent = placas.size;
  const cuadrillas = new Set(allPeople.map(p=>p.cuadrilla).filter(Boolean));
  document.getElementById('statCuadrillas').textContent = cuadrillas.size;
}

/* ---- Botones de navegación en Inicio: llevan a la misma pestaña del menú lateral ---- */
document.querySelectorAll('.home-nav-card').forEach(card => {
  card.addEventListener('click', () => {
    const target = document.querySelector(`.nav-item[data-view="${card.dataset.goto}"]`);
    if(target) target.click();
  });
});

/* ---- Animación del mapa de El Salvador: se dibuja línea por línea en Inicio ---- */
function animarMapaInicio(){
  const maskPaths = document.querySelectorAll('#mapaBgSvg .map-mask-path');
  const glowPaths = document.querySelectorAll('#mapaBgSvg .map-glow-path');
  if(!maskPaths.length) return;
  let acumulado = 0;
  maskPaths.forEach((path, idx) => {
    const len = path.getTotalLength();
    const duracion = Math.min(Math.max(len / 350, 0.8), 5.5); // segundos, proporcional al largo del trazo
    const delay = acumulado;
    path.style.transition = 'none';
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;

    const glow = glowPaths[idx];
    if(glow){
      const cometa = Math.min(len * 0.12, 90); // longitud del "cometa" verde
      glow.classList.remove('breathing');
      glow.style.transition = 'none';
      glow.style.strokeDasharray = `${cometa} ${Math.max(len - cometa, 1)}`;
      glow.style.strokeDashoffset = len;
      glow.style.opacity = '1';
    }

    // Forzar reflow para que el navegador aplique el estado inicial antes de animar
    path.getBoundingClientRect();
    path.style.transition = `stroke-dashoffset ${duracion}s ease ${delay}s`;
    requestAnimationFrame(() => {
      path.style.strokeDashoffset = '0';
    });

    if(glow){
      glow.style.transition = `stroke-dashoffset ${duracion}s linear ${delay}s`;
      requestAnimationFrame(() => {
        glow.style.strokeDashoffset = '0';
      });
      // Al terminar de recorrer el tramo, se apaga (ya no queda "respirando" en bucle)
      setTimeout(() => {
        glow.classList.remove('breathing');
        glow.style.transition = 'opacity 0.6s ease';
        glow.style.opacity = '0';
      }, (delay + duracion) * 1000);
    }

    acumulado += duracion * 0.85;
  });
}

/* ---- Efecto de "fibra óptica": una sola luz que recorre el contorno
   exterior del país (solo decorativo) ---- */
let fibraOpticaDibujada = false;
function dibujarFibraOptica(){
  if(fibraOpticaDibujada) return;
  const grupo = document.getElementById('mapaFibraOptica');
  if(!grupo) return;
  const contorno = document.querySelector('#mapaBgSvg .map-line');
  if(!contorno) return;
  const linea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  linea.setAttribute('d', contorno.getAttribute('d'));
  linea.setAttribute('class', 'fiber-line');
  grupo.appendChild(linea);
  fibraOpticaDibujada = true;
}

// Dibujar al cargar la página (Inicio es la vista activa por defecto)
window.addEventListener('load', () => setTimeout(triggerMapaDraw, 150));
// Volver a dibujar cada vez que se navega de regreso a Inicio
document.querySelector('.nav-item[data-view="inicio"]').addEventListener('click', () => {
  setTimeout(triggerMapaDraw, 50);
});

/* ---- Disparo automático de la animación: cada vez que se actualizan datos,
   y si no hay actualizaciones, cada 30 segundos como respaldo ---- */
let mapaAutoTimer = null;
function programarMapaAutoRefresco(){
  if(mapaAutoTimer) clearTimeout(mapaAutoTimer);
  mapaAutoTimer = setTimeout(() => {
    animarMapaInicio();
    programarMapaAutoRefresco();
  }, 30000);
}
function triggerMapaDraw(){
  animarMapaInicio();
  animarDeptosSecuencial();
  actualizarCapasMapa();
  dibujarFibraOptica();
  programarMapaAutoRefresco(); // reinicia el conteo de 30s desde la última actualización real
}
programarMapaAutoRefresco();

/* ---- Animación de los 14 departamentos: se revelan uno por uno en secuencia ---- */
function animarDeptosSecuencial(){
  const deptos = document.querySelectorAll('#mapaBgSvg .depto-shape');
  if(!deptos.length) return;
  deptos.forEach(d => {
    d.classList.remove('mostrado');
    d.style.transitionDelay = '0s';
  });
  // Forzar reflow antes de reprogramar el reinicio de la animación
  void document.getElementById('mapaBgSvg').offsetWidth;
  deptos.forEach((d, i) => {
    d.style.transitionDelay = `${(i * 0.18).toFixed(2)}s`;
    requestAnimationFrame(() => d.classList.add('mostrado'));
  });
}

/* ---- Ubicación aproximada (lat/lon -> coordenadas del SVG del mapa) ----
   Calibrado con los límites geográficos aproximados de El Salvador.
   Es una conversión lineal simple, no una proyección exacta. */
function latLonToMapXY(lat, lon){
  const LON_OESTE = -90.13, LON_ESTE = -87.69;
  const LAT_NORTE = 14.45, LAT_SUR = 13.15;
  const x = (lon - LON_OESTE) / (LON_ESTE - LON_OESTE) * 900;
  const y = (LAT_NORTE - lat) / (LAT_NORTE - LAT_SUR) * 496;
  return { x, y };
}

/* ---- Centroides aproximados por zona (para las etiquetas flotantes) ---- */
const ZONA_CENTROIDES = {
  'occidente': { x: 190, y: 240, label: 'Occidente' },
  'central':   { x: 470, y: 215, label: 'Central' },
  'oriente':   { x: 740, y: 250, label: 'Oriente' },
};
function zonaKeyFromTexto(zona){
  if(!zona) return null;
  const z = zona.toLowerCase();
  if(z.startsWith('occ')) return 'occidente';
  if(z.startsWith('ori')) return 'oriente';
  if(z.startsWith('cent')) return 'central';
  return null;
}

/* ---- Puntos pulsantes de casos activos + etiquetas de conteo por zona ---- */
function actualizarCapasMapa(){
  const gMarkers = document.getElementById('mapaCasosMarkers');
  const gLabels = document.getElementById('mapaZonaLabels');
  if(!gMarkers || !gLabels) return;

  const NS = 'http://www.w3.org/2000/svg';
  gMarkers.innerHTML = '';
  gLabels.innerHTML = '';

  const noFinalizado = (s) => {
    const v = (s || '').toLowerCase();
    return v && v !== 'finalizada' && v !== 'finalizado' && v !== 'cancelado';
  };

  const fuentes = [
    ...(typeof allCasos !== 'undefined' ? allCasos : []),
    ...(typeof allHyve !== 'undefined' ? allHyve : []),
    ...(typeof allCable !== 'undefined' ? allCable : []),
  ];

  const activos = fuentes.filter(c => noFinalizado(c.status || c.estatus));

  // Puntos pulsantes en coordenadas reales de casos activos
  activos.forEach(c => {
    const lat = parseFloat(c.latitud);
    const lon = parseFloat(c.longitud);
    if(!isFinite(lat) || !isFinite(lon)) return;
    const { x, y } = latLonToMapXY(lat, lon);
    if(x < 0 || x > 900 || y < 0 || y > 496) return;

    const ping = document.createElementNS(NS, 'circle');
    ping.setAttribute('cx', x); ping.setAttribute('cy', y); ping.setAttribute('r', 3);
    ping.setAttribute('class', 'mapa-case-ping');
    gMarkers.appendChild(ping);

    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', 3);
    dot.setAttribute('class', 'mapa-case-dot');
    gMarkers.appendChild(dot);
  });

  // Conteo de casos activos agrupado por zona (Occidente / Central / Oriente)
  const conteoPorZona = {};
  fuentes.forEach(c => {
    if(!noFinalizado(c.status || c.estatus)) return;
    const key = zonaKeyFromTexto(c.zona);
    if(!key) return;
    conteoPorZona[key] = (conteoPorZona[key] || 0) + 1;
  });

  Object.keys(ZONA_CENTROIDES).forEach(key => {
    const total = conteoPorZona[key] || 0;
    if(total <= 0) return;
    const { x, y, label } = ZONA_CENTROIDES[key];
    const texto = `${label}: ${total} activo${total === 1 ? '' : 's'}`;
    const anchoAprox = 13 + texto.length * 5.6;

    const bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('x', x - anchoAprox/2); bg.setAttribute('y', y - 11);
    bg.setAttribute('width', anchoAprox); bg.setAttribute('height', 20);
    bg.setAttribute('rx', 5);
    bg.setAttribute('class', 'mapa-zona-label-bg');
    gLabels.appendChild(bg);

    const txt = document.createElementNS(NS, 'text');
    txt.setAttribute('x', x); txt.setAttribute('y', y + 4);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('class', 'mapa-zona-label');
    txt.textContent = texto;
    gLabels.appendChild(txt);
  });
}



/* ============================================================
   RENDER TABLE
============================================================ */
function renderTable(){
  const wrap = document.getElementById('tableWrap');
  const searchTerm = document.getElementById('tableSearch').value.trim().toLowerCase();
  const cuadrillaFilter = msVal('cuadrillaFilter');
  const puestoFilter = msVal('puestoFilter');

  let rows = allPeople.filter(p => {
    const matchesSearch = !searchTerm || [p.nombre,p.dui,p.correo,p.puesto,p.cuadrilla]
      .some(f => (f||'').toLowerCase().includes(searchTerm));
    const matchesCuadrilla = cuadrillaFilter.length === 0 || cuadrillaFilter.includes(p.cuadrilla);
    const matchesPuesto = puestoFilter.length === 0 || puestoFilter.includes(p.puesto);
    return matchesSearch && matchesCuadrilla && matchesPuesto;
  });

  if(rows.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
        <div class="empty-title">${allPeople.length === 0 ? 'Aún no hay personal registrado' : 'Sin resultados'}</div>
        <div class="empty-desc">${allPeople.length === 0 ? 'Agrega a la primera persona usando el botón "Agregar Persona".' : 'Prueba con otro término de búsqueda o filtro.'}</div>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Cuadrilla</th>
          <th>DUI</th>
          <th>Teléfono</th>
          <th>Vehículo</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(p => rowHtml(p)).join('')}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const person = allPeople.find(p => String(p.id) === String(id));
      if(action === 'view') openViewModal(person);
      if(action === 'edit') openFormModal(person);
      if(action === 'delete') openDeleteModal(person);
    });
  });
}

function rowHtml(p){
  const c = colorFor(p.cuadrilla || p.nombre || '');
  const vehiculo = [p.marca, p.modelo].filter(Boolean).join(' ');
  return `
    <tr>
      <td>
        <div class="person-cell">
          <div class="avatar" style="background:${c};">${initials(p.nombre)}</div>
          <div>
            <div class="person-name">${escapeHtml(p.nombre || '—')}</div>
            <div class="person-puesto">${escapeHtml(p.puesto || '')}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="chip" style="background:${hexToSoft(c)}; color:${c};">
          <span class="chip-dot" style="background:${c};"></span>${escapeHtml(p.cuadrilla || '—')}
        </span>
      </td>
      <td class="mono">${escapeHtml(p.dui || '—')}</td>
      <td class="mono">${escapeHtml(p.telefono || '—')}</td>
      <td>${vehiculo ? `<span class="mono">${escapeHtml(p.placa_vehiculo||'')}</span> <span style="color:var(--text-faint);">· ${escapeHtml(vehiculo)}</span>` : '<span style="color:var(--text-faint);">—</span>'}</td>
      <td>
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="icon-btn accent" data-action="view" data-id="${p.id}" title="Ver">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="icon-btn" data-action="edit" data-id="${p.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="icon-btn danger" data-action="delete" data-id="${p.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function hexToSoft(hex){
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},0.14)`;
}
function escapeHtml(str){
  if(str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

/* ---- Coordenadas: combina/separa Latitud y Longitud en un solo campo ---- */
function formatCoordenadas(lat, lng){
  const hasLat = lat !== null && lat !== undefined && String(lat).trim() !== '';
  const hasLng = lng !== null && lng !== undefined && String(lng).trim() !== '';
  if(hasLat && hasLng) return `${lat}, ${lng}`;
  if(hasLat) return `${lat}`;
  if(hasLng) return `${lng}`;
  return '';
}
function parseCoordenadas(str){
  const parts = String(str || '').split(',').map(s => s.trim()).filter(Boolean);
  return { lat: parts[0] || '', lng: parts[1] || '' };
}

document.getElementById('tableSearch').addEventListener('input', renderTable);
document.getElementById('cuadrillaFilter').addEventListener('change', renderTable);
document.getElementById('puestoFilter').addEventListener('change', renderTable);

/* ============================================================
   FORM MODAL (Agregar / Editar)
============================================================ */
const formModalOverlay = document.getElementById('formModalOverlay');
const fields = ['nombre','cuadrilla','puesto','dui','telefono','correo','fecha','placa','marca','modelo'];

function toggleVehiculoFields(){
  const puesto = document.getElementById('f_puesto').value;
  const isLider = puesto === 'Líder de Cuadrilla';
  document.querySelectorAll('.vehiculo-field').forEach(el => el.classList.toggle('show', isLider));
  document.getElementById('vehiculoNote').style.display = isLider ? 'flex' : 'none';
}
document.getElementById('f_puesto').addEventListener('change', toggleVehiculoFields);

function openFormModal(person){
  currentEditId = person ? person.id : null;
  document.getElementById('formModalTitle').textContent = person ? 'Editar Persona' : 'Agregar Persona';
  document.getElementById('f_id').value = person ? person.id : '';
  document.getElementById('f_nombre').value = person?.nombre || '';
  document.getElementById('f_cuadrilla').value = person?.cuadrilla || '';
  document.getElementById('f_puesto').value = person?.puesto || '';
  document.getElementById('f_dui').value = person?.dui || '';
  document.getElementById('f_telefono').value = person?.telefono || '';
  document.getElementById('f_correo').value = person?.correo || '';
  document.getElementById('f_fecha').value = person?.fecha_nacimiento || '';
  document.getElementById('f_placa').value = person?.placa_vehiculo || '';
  document.getElementById('f_marca').value = person?.marca || '';
  document.getElementById('f_modelo').value = person?.modelo || '';
  toggleVehiculoFields();
  formModalOverlay.classList.add('active');
}
function closeFormModal(){ formModalOverlay.classList.remove('active'); currentEditId = null; }

document.getElementById('btnAddPerson').addEventListener('click', () => openFormModal(null));
document.getElementById('formModalClose').addEventListener('click', closeFormModal);
document.getElementById('formCancelBtn').addEventListener('click', closeFormModal);
formModalOverlay.addEventListener('click', (e) => { if(e.target === formModalOverlay) closeFormModal(); });

document.getElementById('formSaveBtn').addEventListener('click', async () => {
  const nombre = document.getElementById('f_nombre').value.trim();
  const cuadrilla = document.getElementById('f_cuadrilla').value.trim();
  if(!nombre || !cuadrilla){
    showToast('Nombre y cuadrilla son obligatorios', 'error');
    return;
  }

  const puesto = document.getElementById('f_puesto').value.trim() || null;
  const esLider = puesto === 'Líder de Cuadrilla';

  const payload = {
    nombre,
    cuadrilla,
    puesto,
    dui: document.getElementById('f_dui').value.trim() || null,
    telefono: document.getElementById('f_telefono').value.trim() || null,
    correo: document.getElementById('f_correo').value.trim() || null,
    fecha_nacimiento: document.getElementById('f_fecha').value.trim() || null,
    // El vehículo solo se guarda si la persona es Líder de Cuadrilla
    placa_vehiculo: esLider ? (document.getElementById('f_placa').value.trim() || null) : null,
    marca: esLider ? (document.getElementById('f_marca').value.trim() || null) : null,
    modelo: esLider ? (document.getElementById('f_modelo').value.trim() || null) : null
  };

  const saveBtn = document.getElementById('formSaveBtn');
  saveBtn.textContent = 'Guardando...';
  saveBtn.disabled = true;

  try{
    let res;
    if(currentEditId){
      res = await fetch(`${REST_URL}?id=eq.${currentEditId}`, {
        method:'PATCH',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(REST_URL, {
        method:'POST',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    }
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al guardar'); }

    showToast(currentEditId ? 'Persona actualizada' : 'Persona agregada');
    closeFormModal();
    await fetchPeople();
  }catch(err){
    console.error(err);
    showToast('No se pudo guardar: ' + err.message, 'error');
  }finally{
    saveBtn.textContent = 'Guardar';
    saveBtn.disabled = false;
  }
});

/* ============================================================
   VIEW MODAL (Ver)
============================================================ */
const viewModalOverlay = document.getElementById('viewModalOverlay');
let viewingPerson = null;

function openViewModal(person){
  viewingPerson = person;
  const grid = document.getElementById('viewGrid');
  const fieldsMap = [
    ['Nombre completo', person.nombre],
    ['Cuadrilla', person.cuadrilla],
    ['Puesto', person.puesto],
    ['DUI', person.dui],
    ['Teléfono', person.telefono],
    ['Correo', person.correo],
    ['Fecha de nacimiento', person.fecha_nacimiento],
    ['Placa de vehículo', person.placa_vehiculo],
    ['Marca', person.marca],
    ['Modelo', person.modelo],
  ];
  grid.innerHTML = fieldsMap.map(([label,val]) => `
    <div>
      <div class="view-field-label">${label}</div>
      <div class="view-field-value">${escapeHtml(val) || '<span style="color:var(--text-faint);">—</span>'}</div>
    </div>
  `).join('');
  viewModalOverlay.classList.add('active');
}
function closeViewModal(){ viewModalOverlay.classList.remove('active'); viewingPerson = null; }

document.getElementById('viewModalClose').addEventListener('click', closeViewModal);
document.getElementById('viewCloseBtn').addEventListener('click', closeViewModal);
viewModalOverlay.addEventListener('click', (e) => { if(e.target === viewModalOverlay) closeViewModal(); });
document.getElementById('viewEditBtn').addEventListener('click', () => {
  const p = viewingPerson;
  closeViewModal();
  openFormModal(p);
});

/* ============================================================
   DELETE MODAL
============================================================ */
const deleteModalOverlay = document.getElementById('deleteModalOverlay');

function openDeleteModal(person){
  pendingDeleteId = person.id;
  document.getElementById('deleteName').textContent = person.nombre || 'esta persona';
  deleteModalOverlay.classList.add('active');
}
function closeDeleteModal(){ deleteModalOverlay.classList.remove('active'); pendingDeleteId = null; }

document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
deleteModalOverlay.addEventListener('click', (e) => { if(e.target === deleteModalOverlay) closeDeleteModal(); });

document.getElementById('deleteConfirmBtn').addEventListener('click', async () => {
  if(!pendingDeleteId) return;
  const btn = document.getElementById('deleteConfirmBtn');
  btn.textContent = 'Eliminando...';
  btn.disabled = true;
  try{
    const res = await fetch(`${REST_URL}?id=eq.${pendingDeleteId}`, {
      method:'DELETE',
      headers: sbHeaders
    });
    if(!res.ok) throw new Error('Error al eliminar');
    showToast('Persona eliminada');
    closeDeleteModal();
    await fetchPeople();
  }catch(err){
    console.error(err);
    showToast('No se pudo eliminar: ' + err.message, 'error');
  }finally{
    btn.textContent = 'Eliminar';
    btn.disabled = false;
  }
});

/* ============================================================
   SITIOS MOVISTAR
============================================================ */
const SITIOS_REST_URL = `${SUPABASE_URL}/rest/v1/sitios`;
let allSitios = [];
let currentSitioEditId = null;
let pendingSitioDeleteId = null;
let viewingSitio = null;

async function fetchSitios(){
  const wrap = document.getElementById('sitiosTableWrap');
  wrap.innerHTML = '<div class="loading-row"><div class="spinner"></div>Cargando sitios…</div>';
  try{
    const res = await fetch(`${SITIOS_REST_URL}?select=*&order=nombre_sitio.asc`, { headers: sbHeaders });
    if(!res.ok) throw new Error('Error al cargar sitios (' + res.status + ')');
    allSitios = await res.json();
    if(typeof triggerMapaDraw === 'function') triggerMapaDraw();
    populateSitioFilters();
    renderSitiosTable();
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

function populateSitioFilters(){
  const regionSel = document.getElementById('regionFilter');
  const propSel = document.getElementById('propietarioFilter');
  const curRegion = msRestoreOrCurrent('regionFilter');
  const curProp = msRestoreOrCurrent('propietarioFilter');

  const regiones = [...new Set(allSitios.map(s=>s.region).filter(Boolean))].sort();
  const propietarios = [...new Set(allSitios.map(s=>s.propietario).filter(Boolean))].sort();

  regionSel.innerHTML = '<option value="">Todas las regiones</option>' +
    regiones.map(r => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join('');
  propSel.innerHTML = '<option value="">Todos los propietarios</option>' +
    propietarios.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');

  msSetVal('regionFilter', curRegion.filter(v => regiones.includes(v)));
  msSetVal('propietarioFilter', curProp.filter(v => propietarios.includes(v)));
}

function renderSitiosTable(){
  const wrap = document.getElementById('sitiosTableWrap');
  const searchTerm = document.getElementById('sitioSearch').value.trim().toLowerCase();
  const regionFilter = msVal('regionFilter');
  const propietarioFilter = msVal('propietarioFilter');

  let rows = allSitios.filter(s => {
    const matchesSearch = !searchTerm || [s.id,s.nombre_sitio,s.direccion,s.municipio,s.propietario]
      .some(f => (f||'').toString().toLowerCase().includes(searchTerm));
    const matchesRegion = regionFilter.length === 0 || regionFilter.includes(s.region);
    const matchesProp = propietarioFilter.length === 0 || propietarioFilter.includes(s.propietario);
    return matchesSearch && matchesRegion && matchesProp;
  });

  if(rows.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        <div class="empty-title">${allSitios.length === 0 ? 'Aún no hay sitios registrados' : 'Sin resultados'}</div>
        <div class="empty-desc">${allSitios.length === 0 ? 'Agrega el primer sitio usando el botón "Agregar Sitio".' : 'Prueba con otro término de búsqueda o filtro.'}</div>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Sitio</th>
          <th>Región</th>
          <th>Propietario</th>
          <th>Municipio</th>
          <th>Coordenadas</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(s => sitioRowHtml(s)).join('')}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll('[data-saction]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.saction;
      const sitio = allSitios.find(s => String(s.id) === String(id));
      if(action === 'view') openSitioViewModal(sitio);
      if(action === 'edit') openSitioFormModal(sitio);
      if(action === 'delete') openSitioDeleteModal(sitio);
    });
  });
}

function sitioRowHtml(s){
  const c = colorFor(s.region || s.nombre_sitio || '');
  const coords = (s.latitude && s.longitude) ? `${s.latitude}, ${s.longitude}` : '—';
  return `
    <tr>
      <td>
        <div class="person-cell">
          <div class="avatar" style="background:${c};">${initials(s.nombre_sitio || '?')}</div>
          <div>
            <div class="person-name">${escapeHtml(s.nombre_sitio || '—')}</div>
            <div class="person-puesto mono">ID ${escapeHtml(s.id)}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="chip" style="background:${hexToSoft(c)}; color:${c};">
          <span class="chip-dot" style="background:${c};"></span>${escapeHtml(s.region || '—')}
        </span>
      </td>
      <td>${escapeHtml(s.propietario || '—')}</td>
      <td>${escapeHtml(s.municipio || '—')}</td>
      <td class="mono">${escapeHtml(coords)}</td>
      <td>
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="icon-btn accent" data-saction="view" data-id="${s.id}" title="Ver">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="icon-btn" data-saction="edit" data-id="${s.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="icon-btn danger" data-saction="delete" data-id="${s.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

document.getElementById('sitioSearch').addEventListener('input', renderSitiosTable);
document.getElementById('regionFilter').addEventListener('change', renderSitiosTable);
document.getElementById('propietarioFilter').addEventListener('change', renderSitiosTable);

/* ---- Form modal (Agregar / Editar Sitio) ---- */
const sitioFormModalOverlay = document.getElementById('sitioFormModalOverlay');

function openSitioFormModal(sitio){
  currentSitioEditId = sitio ? sitio.id : null;
  document.getElementById('sitioFormModalTitle').textContent = sitio ? 'Editar Sitio' : 'Agregar Sitio';
  document.getElementById('s_id').value = sitio?.id || '';
  document.getElementById('s_id').disabled = !!sitio; // el ID no se cambia al editar
  document.getElementById('s_huawei_index').value = sitio?.huawei_site_index || '';
  document.getElementById('s_nombre').value = sitio?.nombre_sitio || '';
  document.getElementById('s_coordenadas').value = formatCoordenadas(sitio?.latitude, sitio?.longitude);
  document.getElementById('s_inbuilding').value = sitio?.in_building || '';
  document.getElementById('s_support').value = sitio?.support_type || '';
  document.getElementById('s_nombre_prop').value = sitio?.nombre_propietario || '';
  document.getElementById('s_propietario').value = sitio?.propietario || '';
  document.getElementById('s_direccion').value = sitio?.direccion || '';
  document.getElementById('s_municipio').value = sitio?.municipio || '';
  document.getElementById('s_departamento').value = sitio?.departamento || '';
  document.getElementById('s_region').value = sitio?.region || '';
  sitioFormModalOverlay.classList.add('active');
}
function closeSitioFormModal(){ sitioFormModalOverlay.classList.remove('active'); currentSitioEditId = null; }

document.getElementById('btnAddSitio').addEventListener('click', () => openSitioFormModal(null));
document.getElementById('sitioFormModalClose').addEventListener('click', closeSitioFormModal);
document.getElementById('sitioFormCancelBtn').addEventListener('click', closeSitioFormModal);
sitioFormModalOverlay.addEventListener('click', (e) => { if(e.target === sitioFormModalOverlay) closeSitioFormModal(); });

document.getElementById('sitioFormSaveBtn').addEventListener('click', async () => {
  const id = document.getElementById('s_id').value.trim();
  const nombre = document.getElementById('s_nombre').value.trim();
  if(!id || !nombre){
    showToast('ID y Nombre del Sitio son obligatorios', 'error');
    return;
  }

  const { lat: latVal, lng: lngVal } = parseCoordenadas(document.getElementById('s_coordenadas').value);

  const payload = {
    huawei_site_index: document.getElementById('s_huawei_index').value.trim() || null,
    nombre_sitio: nombre,
    latitude: latVal ? parseFloat(latVal) : null,
    longitude: lngVal ? parseFloat(lngVal) : null,
    in_building: document.getElementById('s_inbuilding').value || null,
    support_type: document.getElementById('s_support').value.trim() || null,
    nombre_propietario: document.getElementById('s_nombre_prop').value.trim() || null,
    propietario: document.getElementById('s_propietario').value.trim() || null,
    direccion: document.getElementById('s_direccion').value.trim() || null,
    municipio: document.getElementById('s_municipio').value.trim() || null,
    departamento: document.getElementById('s_departamento').value.trim() || null,
    region: document.getElementById('s_region').value.trim() || null
  };
  if(!currentSitioEditId){ payload.id = id; }

  const saveBtn = document.getElementById('sitioFormSaveBtn');
  saveBtn.textContent = 'Guardando...';
  saveBtn.disabled = true;

  try{
    let res;
    if(currentSitioEditId){
      res = await fetch(`${SITIOS_REST_URL}?id=eq.${encodeURIComponent(currentSitioEditId)}`, {
        method:'PATCH',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(SITIOS_REST_URL, {
        method:'POST',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    }
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al guardar'); }

    showToast(currentSitioEditId ? 'Sitio actualizado' : 'Sitio agregado');
    closeSitioFormModal();
    await fetchSitios();
  }catch(err){
    console.error(err);
    showToast('No se pudo guardar: ' + err.message, 'error');
  }finally{
    saveBtn.textContent = 'Guardar';
    saveBtn.disabled = false;
  }
});

/* ---- View modal (Ver Sitio) ---- */
const sitioViewModalOverlay = document.getElementById('sitioViewModalOverlay');

function openSitioViewModal(sitio){
  viewingSitio = sitio;
  const grid = document.getElementById('sitioViewGrid');
  const fieldsMap = [
    ['ID', sitio.id],
    ['Huawei Site Index', sitio.huawei_site_index],
    ['Nombre del Sitio', sitio.nombre_sitio],
    ['Coordenadas', formatCoordenadas(sitio.latitude, sitio.longitude)],
    ['In-Building', sitio.in_building],
    ['Support Type', sitio.support_type],
    ['Nombre para Propietario', sitio.nombre_propietario],
    ['Propietario', sitio.propietario],
    ['Dirección', sitio.direccion],
    ['Municipio', sitio.municipio],
    ['Departamento', sitio.departamento],
    ['Región', sitio.region],
  ];
  grid.innerHTML = fieldsMap.map(([label,val]) => `
    <div>
      <div class="view-field-label">${label}</div>
      <div class="view-field-value">${escapeHtml(val) || '<span style="color:var(--text-faint);">—</span>'}</div>
    </div>
  `).join('');
  sitioViewModalOverlay.classList.add('active');
}
function closeSitioViewModal(){ sitioViewModalOverlay.classList.remove('active'); viewingSitio = null; }

document.getElementById('sitioViewModalClose').addEventListener('click', closeSitioViewModal);
document.getElementById('sitioViewCloseBtn').addEventListener('click', closeSitioViewModal);
sitioViewModalOverlay.addEventListener('click', (e) => { if(e.target === sitioViewModalOverlay) closeSitioViewModal(); });
document.getElementById('sitioViewEditBtn').addEventListener('click', () => {
  const s = viewingSitio;
  closeSitioViewModal();
  openSitioFormModal(s);
});

/* ---- Delete modal (Eliminar Sitio) ---- */
const sitioDeleteModalOverlay = document.getElementById('sitioDeleteModalOverlay');

function openSitioDeleteModal(sitio){
  pendingSitioDeleteId = sitio.id;
  document.getElementById('sitioDeleteName').textContent = sitio.nombre_sitio || 'este sitio';
  sitioDeleteModalOverlay.classList.add('active');
}
function closeSitioDeleteModal(){ sitioDeleteModalOverlay.classList.remove('active'); pendingSitioDeleteId = null; }

document.getElementById('sitioDeleteCancelBtn').addEventListener('click', closeSitioDeleteModal);
sitioDeleteModalOverlay.addEventListener('click', (e) => { if(e.target === sitioDeleteModalOverlay) closeSitioDeleteModal(); });

document.getElementById('sitioDeleteConfirmBtn').addEventListener('click', async () => {
  if(!pendingSitioDeleteId) return;
  const btn = document.getElementById('sitioDeleteConfirmBtn');
  btn.textContent = 'Eliminando...';
  btn.disabled = true;
  try{
    const res = await fetch(`${SITIOS_REST_URL}?id=eq.${encodeURIComponent(pendingSitioDeleteId)}`, {
      method:'DELETE',
      headers: sbHeaders
    });
    if(!res.ok) throw new Error('Error al eliminar');
    showToast('Sitio eliminado');
    closeSitioDeleteModal();
    await fetchSitios();
  }catch(err){
    console.error(err);
    showToast('No se pudo eliminar: ' + err.message, 'error');
  }finally{
    btn.textContent = 'Eliminar';
    btn.disabled = false;
  }
});

/* ============================================================
   NÓMINA — Generar solicitud de acceso a sitio
============================================================ */
const CUADRILLAS_LIST = [
  'Occidente','Oriente 1','Oriente 2','Central 1 FO','Central 2 FO','Central 3 FO',
  'Central 4 FO','Central 5 FO','Central 6 FO','Central 1 CU','Central 2 CU','CPE','Supervisor'
];

let nominaSelectedSites = [];   // sitios elegidos para la solicitud
let nominaRoster = [];          // técnicos de la cuadrilla elegida
let nominaExtraPersonal = [];   // personal extra agregado manualmente (de otras cuadrillas)

async function initNomina(){
  // Llenar selector de cuadrillas
  const sel = document.getElementById('nominaCuadrillaSelect');
  sel.innerHTML = '<option value="">Selecciona una cuadrilla</option>' +
    CUADRILLAS_LIST.map(c => `<option>${escapeHtml(c)}</option>`).join('');

  // Asegurar que tengamos sitios y técnicos cargados en memoria
  if(!sitiosLoaded){
    sitiosLoaded = true;
    await fetchSitios();
  }
  if(allPeople.length === 0){
    await fetchPeople();
  }
}

/* ---- Paso 1: búsqueda y selección de sitios ---- */
const nominaSiteSearch = document.getElementById('nominaSiteSearch');
const nominaSiteResults = document.getElementById('nominaSiteResults');

nominaSiteSearch.addEventListener('input', () => {
  const term = nominaSiteSearch.value.trim().toLowerCase();
  if(!term){ nominaSiteResults.classList.remove('show'); nominaSiteResults.innerHTML=''; return; }

  const matches = allSitios.filter(s =>
    (s.id||'').toString().toLowerCase().includes(term) ||
    (s.nombre_sitio||'').toLowerCase().includes(term)
  ).slice(0, 30);

  if(matches.length === 0){
    nominaSiteResults.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    nominaSiteResults.innerHTML = matches.map(s => `
      <div class="site-result-item" data-id="${escapeHtml(s.id)}">
        <div class="site-result-name">${escapeHtml(s.nombre_sitio || '—')}</div>
        <div class="site-result-meta">ID ${escapeHtml(s.id)} · ${escapeHtml(s.propietario || '—')}</div>
      </div>
    `).join('');
  }
  nominaSiteResults.classList.add('show');
});

nominaSiteResults.addEventListener('click', (e) => {
  const item = e.target.closest('.site-result-item');
  if(!item || !item.dataset.id) return;
  const sitio = allSitios.find(s => String(s.id) === String(item.dataset.id));
  if(sitio && !nominaSelectedSites.find(s => String(s.id) === String(sitio.id))){
    nominaSelectedSites.push(sitio);
    renderNominaSelectedSites();
  }
  nominaSiteSearch.value = '';
  nominaSiteResults.classList.remove('show');
  nominaSiteResults.innerHTML = '';
});

document.addEventListener('click', (e) => {
  if(!e.target.closest('.site-search-row')){
    nominaSiteResults.classList.remove('show');
  }
});

function renderNominaSelectedSites(){
  const wrap = document.getElementById('nominaSelectedSites');
  if(nominaSelectedSites.length === 0){
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = nominaSelectedSites.map((s, i) => `
    <div class="selected-site-chip">
      <div class="selected-site-num">${i+1}</div>
      <div class="selected-site-info">
        <div class="selected-site-name">${escapeHtml(s.nombre_sitio || '—')}</div>
        <div class="selected-site-meta">ID ${escapeHtml(s.id)} · ${escapeHtml(s.propietario || '—')} · ${escapeHtml(s.nombre_propietario || '—')}</div>
      </div>
      <button class="remove-site-btn" data-remove-id="${escapeHtml(s.id)}" title="Quitar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `).join('');

  wrap.querySelectorAll('[data-remove-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      nominaSelectedSites = nominaSelectedSites.filter(s => String(s.id) !== String(btn.dataset.removeId));
      renderNominaSelectedSites();
    });
  });
}

/* ---- Paso 2: cuadrilla y roster de personal ---- */
document.getElementById('nominaCuadrillaSelect').addEventListener('change', (e) => {
  const cuadrilla = e.target.value;
  const wrap = document.getElementById('nominaTecnicoRoster');
  if(!cuadrilla){
    nominaRoster = [];
    wrap.innerHTML = '';
    return;
  }
  nominaRoster = allPeople.filter(p => p.cuadrilla === cuadrilla);
  // Evita duplicados: si alguien del personal extra ahora coincide con el nuevo roster, se quita de "extra"
  const rosterIds = new Set(nominaRoster.map(p => p.id));
  nominaExtraPersonal = nominaExtraPersonal.filter(p => !rosterIds.has(p.id));
  renderNominaExtraRoster();

  if(nominaRoster.length === 0){
    wrap.innerHTML = `
      <div class="empty-state" style="padding:36px 16px;">
        <div class="empty-title">Sin personal registrado</div>
        <div class="empty-desc">No hay técnicos cargados en la cuadrilla "${escapeHtml(cuadrilla)}" todavía.</div>
      </div>`;
    return;
  }

  wrap.innerHTML = nominaRoster.map(p => {
    const c = colorFor(p.cuadrilla || p.nombre || '');
    const vehiculo = p.puesto === 'Líder de Cuadrilla' && (p.placa_vehiculo || p.marca)
      ? ` · ${escapeHtml(p.placa_vehiculo||'')} ${escapeHtml(p.marca||'')} ${escapeHtml(p.modelo||'')}`.trim()
      : '';
    return `
      <div class="tecnico-card">
        <div class="avatar" style="background:${c};">${initials(p.nombre)}</div>
        <div class="tecnico-card-info">
          <div class="tecnico-card-name">${escapeHtml(p.nombre)}</div>
          <div class="tecnico-card-meta">${escapeHtml(p.puesto || '—')} · DUI ${escapeHtml(p.dui || '—')}${vehiculo}</div>
        </div>
      </div>
    `;
  }).join('');
});

/* ---- Personal extra: buscar y agregar técnicos de otras cuadrillas ---- */
const nominaExtraSearch = document.getElementById('nominaExtraSearch');
const nominaExtraResults = document.getElementById('nominaExtraResults');

nominaExtraSearch.addEventListener('input', () => {
  const term = nominaExtraSearch.value.trim().toLowerCase();
  if(!term){ nominaExtraResults.classList.remove('show'); nominaExtraResults.innerHTML=''; return; }

  const rosterIds = new Set(nominaRoster.map(p => p.id));
  const extraIds = new Set(nominaExtraPersonal.map(p => p.id));

  const matches = allPeople.filter(p =>
    !rosterIds.has(p.id) && !extraIds.has(p.id) &&
    ((p.nombre||'').toLowerCase().includes(term) || (p.dui||'').toLowerCase().includes(term))
  ).slice(0, 20);

  if(matches.length === 0){
    nominaExtraResults.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    nominaExtraResults.innerHTML = matches.map(p => `
      <div class="site-result-item" data-extra-id="${escapeHtml(p.id)}">
        <div class="site-result-name">${escapeHtml(p.nombre)}</div>
        <div class="site-result-meta">${escapeHtml(p.cuadrilla || '—')} · ${escapeHtml(p.puesto || '—')} · DUI ${escapeHtml(p.dui || '—')}</div>
      </div>
    `).join('');
  }
  nominaExtraResults.classList.add('show');
});

nominaExtraResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-extra-id]');
  if(!item) return;
  const persona = allPeople.find(p => String(p.id) === String(item.dataset.extraId));
  if(persona && !nominaExtraPersonal.find(p => String(p.id) === String(persona.id))){
    nominaExtraPersonal.push(persona);
    renderNominaExtraRoster();
  }
  nominaExtraSearch.value = '';
  nominaExtraResults.classList.remove('show');
  nominaExtraResults.innerHTML = '';
});

document.addEventListener('click', (e) => {
  if(!e.target.closest('.extra-personal-block')){
    nominaExtraResults.classList.remove('show');
  }
});

function renderNominaExtraRoster(){
  const wrap = document.getElementById('nominaExtraRoster');
  if(nominaExtraPersonal.length === 0){
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = nominaExtraPersonal.map(p => {
    const c = colorFor(p.cuadrilla || p.nombre || '');
    return `
      <div class="tecnico-card extra">
        <div class="avatar" style="background:${c};">${initials(p.nombre)}</div>
        <div class="tecnico-card-info">
          <div class="tecnico-card-name">${escapeHtml(p.nombre)}</div>
          <div class="tecnico-card-meta">${escapeHtml(p.cuadrilla || '—')} · ${escapeHtml(p.puesto || '—')} · DUI ${escapeHtml(p.dui || '—')}</div>
        </div>
        <button class="tecnico-card-remove" data-remove-extra="${escapeHtml(p.id)}" title="Quitar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    `;
  }).join('');

  wrap.querySelectorAll('[data-remove-extra]').forEach(btn => {
    btn.addEventListener('click', () => {
      nominaExtraPersonal = nominaExtraPersonal.filter(p => String(p.id) !== String(btn.dataset.removeExtra));
      renderNominaExtraRoster();
    });
  });
}

/* ---- Paso 3: generar y copiar la solicitud ---- */
document.getElementById('btnGenerarSolicitud').addEventListener('click', () => {
  if(nominaSelectedSites.length === 0){
    showToast('Agrega al menos un sitio antes de generar la solicitud', 'error');
    return;
  }
  if(nominaRoster.length === 0){
    showToast('Selecciona una cuadrilla con personal antes de generar la solicitud', 'error');
    return;
  }

  const linea = '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬';
  let texto = 'Se solicita su apoyo con el siguiente acceso:\n' + linea + '\n';

  nominaSelectedSites.forEach((s, i) => {
    if(i > 0) texto += '\n';
    texto += 'ID: ' + (s.id || '') + '\n';
    texto += 'Nombre Sitio: ' + (s.nombre_sitio || '') + '\n';
    texto += 'Propietario: ' + (s.propietario || '') + '\n';
    texto += 'Nombre Propietario: ' + (s.nombre_propietario || '') + '\n';
  });

  texto += linea + '\n';

  let vehiculoInfo = null;
  nominaRoster.forEach(p => {
    texto += 'Nombre del Personal: ' + (p.nombre || '') + '\n';
    texto += 'DUI: ' + (p.dui || '') + '\n';
    texto += 'Teléfono: ' + (p.telefono || '') + '\n';
    texto += 'Correo: ' + (p.correo || '') + '\n';
    texto += 'Fecha de Nacimiento: ' + (p.fecha_nacimiento || '') + '\n';
    texto += '\n';
    if(p.puesto === 'Líder de Cuadrilla'){
      vehiculoInfo = { placa: p.placa_vehiculo || '', marca: p.marca || '', modelo: p.modelo || '' };
    }
  });

  // Personal extra (de otras cuadrillas)
  nominaExtraPersonal.forEach(p => {
    texto += 'Nombre del Personal: ' + (p.nombre || '') + '\n';
    texto += 'DUI: ' + (p.dui || '') + '\n';
    texto += 'Teléfono: ' + (p.telefono || '') + '\n';
    texto += 'Correo: ' + (p.correo || '') + '\n';
    texto += 'Fecha de Nacimiento: ' + (p.fecha_nacimiento || '') + '\n';
    texto += '\n';
    if(!vehiculoInfo && p.puesto === 'Líder de Cuadrilla'){
      vehiculoInfo = { placa: p.placa_vehiculo || '', marca: p.marca || '', modelo: p.modelo || '' };
    }
  });

  texto += linea + '\n';
  texto += 'Placa _ Vehículo: ' + (vehiculoInfo?.placa || '') + '\n';
  texto += 'Marca: ' + (vehiculoInfo?.marca || '') + '\n';
  texto += 'Modelo: ' + (vehiculoInfo?.modelo || '') + '\n';

  texto += linea + '\n';
  texto += 'Incluir Correo\nNoc@tekcomca.com';

  document.getElementById('nominaPreviewContent').textContent = texto;
  document.getElementById('nominaPreviewWrap').style.display = 'block';
  document.getElementById('nominaPreviewWrap').scrollIntoView({ behavior:'smooth', block:'start' });
});

document.getElementById('btnCopiarSolicitud').addEventListener('click', () => {
  const texto = document.getElementById('nominaPreviewContent').textContent;
  const btn = document.getElementById('btnCopiarSolicitud');
  const restoreLabel = () => {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar al portapapeles`;
  };
  const markCopied = () => {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copiado`;
    showToast('Solicitud copiada al portapapeles');
    setTimeout(restoreLabel, 2200);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texto).then(markCopied).catch(() => fallbackCopyNomina(texto, markCopied));
  } else {
    fallbackCopyNomina(texto, markCopied);
  }
});

function fallbackCopyNomina(texto, onSuccess){
  const ta = document.createElement('textarea');
  ta.value = texto;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try{ document.execCommand('copy'); onSuccess(); }
  catch(e){ showToast('No se pudo copiar automáticamente', 'error'); }
  document.body.removeChild(ta);
}

/* ============================================================
   VEHÍCULOS
============================================================ */
const VEHICULOS_REST_URL = `${SUPABASE_URL}/rest/v1/vehiculos`;
let allVehiculos = [];
let currentVehiculoEditId = null;
let pendingVehiculoDeleteId = null;
let viewingVehiculo = null;

async function fetchVehiculos(){
  const wrap = document.getElementById('vehiculosTableWrap');
  wrap.innerHTML = '<div class="loading-row"><div class="spinner"></div>Cargando vehículos…</div>';
  try{
    const res = await fetch(`${VEHICULOS_REST_URL}?select=*&order=placa.asc`, { headers: sbHeaders });
    if(!res.ok) throw new Error('Error al cargar vehículos (' + res.status + ')');
    allVehiculos = await res.json();
    if(typeof triggerMapaDraw === 'function') triggerMapaDraw();
    renderVehiculosTable();
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

function gpsChipClass(estado){
  switch(estado){
    case 'Encendido': return 'gps-encendido';
    case 'Apagado': return 'gps-apagado';
    case 'Actividad': return 'gps-actividad';
    case 'Sin Gestion': return 'gps-sin-gestion';
    default: return '';
  }
}

function renderVehiculosTable(){
  const wrap = document.getElementById('vehiculosTableWrap');
  const searchTerm = document.getElementById('vehiculoSearch').value.trim().toLowerCase();
  const estadoFilter = msVal('estadoGpsFilter');

  let rows = allVehiculos.filter(v => {
    const matchesSearch = !searchTerm || [v.placa,v.nombre_colaborador,v.marca,v.modelo,v.dui]
      .some(f => (f||'').toLowerCase().includes(searchTerm));
    const matchesEstado = estadoFilter.length === 0 || estadoFilter.includes(v.estado_gps);
    return matchesSearch && matchesEstado;
  });

  if(rows.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
        <div class="empty-title">${allVehiculos.length === 0 ? 'Aún no hay vehículos registrados' : 'Sin resultados'}</div>
        <div class="empty-desc">${allVehiculos.length === 0 ? 'Agrega el primer vehículo usando el botón "Agregar Vehículo".' : 'Prueba con otro término de búsqueda o filtro.'}</div>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Placa</th>
          <th>Colaborador</th>
          <th>Marca / Modelo</th>
          <th>Estado GPS</th>
          <th>Observaciones</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(v => vehiculoRowHtml(v)).join('')}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll('[data-vaction]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.vaction;
      const vehiculo = allVehiculos.find(v => String(v.id) === String(id));
      if(action === 'view') openVehiculoViewModal(vehiculo);
      if(action === 'edit') openVehiculoFormModal(vehiculo);
      if(action === 'delete') openVehiculoDeleteModal(vehiculo);
    });
  });
}

function vehiculoRowHtml(v){
  const gpsClass = gpsChipClass(v.estado_gps);
  return `
    <tr>
      <td class="mono" style="font-weight:600;">${escapeHtml(v.placa || '—')}</td>
      <td>
        <div class="person-name">${escapeHtml(v.nombre_colaborador || '—')}</div>
        <div class="person-puesto">${escapeHtml(v.puesto || '')}</div>
      </td>
      <td>${escapeHtml([v.marca, v.modelo].filter(Boolean).join(' ')) || '—'}</td>
      <td>
        ${v.estado_gps ? `<span class="chip ${gpsClass}"><span class="gps-dot"></span>${escapeHtml(v.estado_gps)}</span>` : '<span style="color:var(--text-faint);">—</span>'}
      </td>
      <td>${escapeHtml(v.observaciones || '—')}</td>
      <td>
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="icon-btn accent" data-vaction="view" data-id="${v.id}" title="Ver">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="icon-btn" data-vaction="edit" data-id="${v.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="icon-btn danger" data-vaction="delete" data-id="${v.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

document.getElementById('vehiculoSearch').addEventListener('input', renderVehiculosTable);
document.getElementById('estadoGpsFilter').addEventListener('change', renderVehiculosTable);

/* ---- Capturar tabla de Vehículos como imagen (para compartir por WhatsApp) ---- */
document.getElementById('btnCapturarVehiculos').addEventListener('click', async () => {
  const btn = document.getElementById('btnCapturarVehiculos');
  const originalLabel = btn.innerHTML;
  btn.innerHTML = '<div class="spinner" style="width:15px;height:15px;border-width:2px;margin:0;"></div> Generando...';
  btn.disabled = true;

  try{
    const sourceTable = document.querySelector('#vehiculosTableWrap table');
    if(!sourceTable){
      showToast('No hay datos en la tabla para capturar', 'error');
      return;
    }

    const isLight = document.body.classList.contains('light');
    const bg = isLight ? '#FFFFFF' : '#141822';
    const textColor = isLight ? '#1B1F2D' : '#E7E9F2';
    const borderColor = isLight ? '#E2E5F0' : '#262C3B';

    // Contenedor temporal fuera de pantalla: ancho automático según contenido, como una hoja de Excel
    const captureWrap = document.createElement('div');
    captureWrap.style.position = 'fixed';
    captureWrap.style.left = '-99999px';
    captureWrap.style.top = '0';
    captureWrap.style.background = bg;
    captureWrap.style.padding = '24px';
    captureWrap.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
    captureWrap.style.color = textColor;
    captureWrap.style.width = 'max-content';

    const title = document.createElement('div');
    title.textContent = 'Listado de Vehículos — OPK';
    title.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
    title.style.fontWeight = '700';
    title.style.fontSize = '16px';
    title.style.marginBottom = '4px';
    captureWrap.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.textContent = new Date().toLocaleString('es-SV', { dateStyle:'medium', timeStyle:'short' });
    subtitle.style.fontSize = '12px';
    subtitle.style.color = isLight ? '#666D85' : '#8A8FA3';
    subtitle.style.marginBottom = '14px';
    captureWrap.appendChild(subtitle);

    const clonedTable = sourceTable.cloneNode(true);
    clonedTable.style.borderCollapse = 'collapse';
    clonedTable.style.width = 'max-content';

    // Quita la columna de Acciones (botones no sirven en una imagen estática)
    const actionColIndex = [...clonedTable.querySelectorAll('thead th')].findIndex(th => th.textContent.trim() === 'Acciones');
    if(actionColIndex !== -1){
      clonedTable.querySelectorAll('tr').forEach(tr => {
        const cell = tr.children[actionColIndex];
        if(cell) cell.remove();
      });
    }

    // Estilo de celdas: ancho automático según el contenido más largo (como autoajustar columna en Excel)
    clonedTable.querySelectorAll('th, td').forEach(cell => {
      cell.style.whiteSpace = 'nowrap';
      cell.style.padding = '5px 14px';
      cell.style.border = `1px solid ${borderColor}`;
      cell.style.fontSize = '13px';
      cell.style.color = textColor;
      cell.style.textAlign = 'left';
    });
    clonedTable.querySelectorAll('thead th').forEach(th => {
      th.style.background = isLight ? '#F7F8FC' : '#1B202C';
      th.style.fontWeight = '700';
      th.style.fontSize = '11px';
      th.style.textTransform = 'uppercase';
      th.style.letterSpacing = '0.05em';
    });
    clonedTable.querySelectorAll('tbody tr').forEach((tr, i) => {
      tr.style.background = i % 2 === 0 ? bg : (isLight ? '#FAFAFD' : '#171C28');
    });

    // Compacta el bloque "Nombre + Cuadrilla/Puesto" que ocupa dos líneas dentro de la celda
    clonedTable.querySelectorAll('.person-name').forEach(el => {
      el.style.fontSize = '13px';
      el.style.lineHeight = '1.2';
      el.style.fontWeight = '600';
    });
    clonedTable.querySelectorAll('.person-puesto').forEach(el => {
      el.style.fontSize = '10.5px';
      el.style.lineHeight = '1.2';
      el.style.marginTop = '0';
      el.style.color = isLight ? '#9499AC' : '#565D72';
    });

    captureWrap.appendChild(clonedTable);
    document.body.appendChild(captureWrap);

    const canvas = await html2canvas(captureWrap, {
      backgroundColor: bg,
      scale: 2
    });

    document.body.removeChild(captureWrap);

    const link = document.createElement('a');
    link.download = `vehiculos-opk-${new Date().toISOString().slice(0,10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    showToast('Imagen de la tabla generada y descargada');
  }catch(err){
    console.error(err);
    showToast('No se pudo generar la captura: ' + err.message, 'error');
  }finally{
    btn.innerHTML = originalLabel;
    btn.disabled = false;
  }
});


/* ---- Form modal (Agregar / Editar Vehículo) ---- */
const vehiculoFormModalOverlay = document.getElementById('vehiculoFormModalOverlay');

function setVehiculoColaborador(persona){
  document.getElementById('v_colaborador').value = persona ? persona.id : '';
  if(persona){
    const c = colorFor(persona.cuadrilla || persona.nombre || '');
    document.getElementById('v_colaborador_avatar').textContent = initials(persona.nombre);
    document.getElementById('v_colaborador_avatar').style.background = c;
    document.getElementById('v_colaborador_name').textContent = persona.nombre;
    document.getElementById('v_colaborador_meta').textContent = (persona.cuadrilla || '—') + ' · ' + (persona.puesto || '—');
    document.getElementById('v_colaborador_selected').style.display = 'block';
    document.getElementById('v_puesto').value = persona.cuadrilla || '';
    document.getElementById('v_telefono').value = persona.telefono || '';
    document.getElementById('v_dui').value = persona.dui || '';
  } else {
    document.getElementById('v_colaborador_selected').style.display = 'none';
    document.getElementById('v_puesto').value = '';
    document.getElementById('v_telefono').value = '';
    document.getElementById('v_dui').value = '';
  }
}

function openVehiculoFormModal(vehiculo){
  currentVehiculoEditId = vehiculo ? vehiculo.id : null;
  document.getElementById('vehiculoFormModalTitle').textContent = vehiculo ? 'Editar Vehículo' : 'Agregar Vehículo';
  document.getElementById('v_placa').value = vehiculo?.placa || '';
  document.getElementById('v_gps').value = vehiculo?.gps || '';
  document.getElementById('v_estado_gps').value = vehiculo?.estado_gps || '';
  document.getElementById('v_colaborador_search').value = '';

  // Intenta encontrar a la persona original por nombre guardado (compatibilidad con vehículos ya existentes)
  const personaExistente = vehiculo?.nombre_colaborador
    ? allPeople.find(p => p.nombre === vehiculo.nombre_colaborador)
    : null;

  if(personaExistente){
    setVehiculoColaborador(personaExistente);
  } else if(vehiculo?.nombre_colaborador){
    // Vehículo con un nombre guardado que ya no coincide con nadie en Listado: lo mostramos como texto fijo
    document.getElementById('v_colaborador').value = '';
    document.getElementById('v_colaborador_selected').style.display = 'block';
    document.getElementById('v_colaborador_avatar').textContent = initials(vehiculo.nombre_colaborador);
    document.getElementById('v_colaborador_avatar').style.background = colorFor(vehiculo.nombre_colaborador);
    document.getElementById('v_colaborador_name').textContent = vehiculo.nombre_colaborador;
    document.getElementById('v_colaborador_meta').textContent = 'No encontrado en Listado del Personal';
    document.getElementById('v_puesto').value = vehiculo.puesto || '';
    document.getElementById('v_telefono').value = vehiculo.telefono || '';
    document.getElementById('v_dui').value = vehiculo.dui || '';
  } else {
    setVehiculoColaborador(null);
  }

  document.getElementById('v_marca').value = vehiculo?.marca || '';
  document.getElementById('v_modelo').value = vehiculo?.modelo || '';
  document.getElementById('v_tipo').value = vehiculo?.tipo || '';
  document.getElementById('v_rentadora').value = vehiculo?.rentadora || '';
  document.getElementById('v_observaciones').value = vehiculo?.observaciones || '';
  vehiculoFormModalOverlay.classList.add('active');
}
function closeVehiculoFormModal(){ vehiculoFormModalOverlay.classList.remove('active'); currentVehiculoEditId = null; }

document.getElementById('btnAddVehiculo').addEventListener('click', () => openVehiculoFormModal(null));
document.getElementById('vehiculoFormModalClose').addEventListener('click', closeVehiculoFormModal);
document.getElementById('vehiculoFormCancelBtn').addEventListener('click', closeVehiculoFormModal);
vehiculoFormModalOverlay.addEventListener('click', (e) => { if(e.target === vehiculoFormModalOverlay) closeVehiculoFormModal(); });

/* ---- Buscador de colaborador dentro del formulario de vehículo ---- */
const vColaboradorSearch = document.getElementById('v_colaborador_search');
const vColaboradorResults = document.getElementById('v_colaborador_results');

vColaboradorSearch.addEventListener('input', () => {
  const term = vColaboradorSearch.value.trim().toLowerCase();
  if(!term){ vColaboradorResults.classList.remove('show'); vColaboradorResults.innerHTML=''; return; }

  const matches = allPeople.filter(p => (p.nombre||'').toLowerCase().includes(term)).slice(0, 20);

  if(matches.length === 0){
    vColaboradorResults.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    vColaboradorResults.innerHTML = matches.map(p => `
      <div class="site-result-item" data-colab-id="${escapeHtml(p.id)}">
        <div class="site-result-name">${escapeHtml(p.nombre)}</div>
        <div class="site-result-meta">${escapeHtml(p.cuadrilla || '—')} · ${escapeHtml(p.puesto || '—')}</div>
      </div>
    `).join('');
  }
  vColaboradorResults.classList.add('show');
});

vColaboradorResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-colab-id]');
  if(!item) return;
  const persona = allPeople.find(p => String(p.id) === String(item.dataset.colabId));
  if(persona){ setVehiculoColaborador(persona); }
  vColaboradorSearch.value = '';
  vColaboradorResults.classList.remove('show');
  vColaboradorResults.innerHTML = '';
});

document.addEventListener('click', (e) => {
  if(!e.target.closest('#vehiculoFormModalOverlay .site-search-row')){
    vColaboradorResults.classList.remove('show');
  }
});

document.getElementById('v_colaborador_clear').addEventListener('click', () => {
  setVehiculoColaborador(null);
});

document.getElementById('vehiculoFormSaveBtn').addEventListener('click', async () => {
  const placa = document.getElementById('v_placa').value.trim();
  if(!placa){
    showToast('La placa es obligatoria', 'error');
    return;
  }

  const colaboradorId = document.getElementById('v_colaborador').value;
  const colaboradorPersona = colaboradorId ? allPeople.find(p => String(p.id) === String(colaboradorId)) : null;
  const nombreColaborador = colaboradorPersona ? colaboradorPersona.nombre : (document.getElementById('v_colaborador_name').textContent !== '—' ? document.getElementById('v_colaborador_name').textContent : null);

  const payload = {
    placa,
    gps: document.getElementById('v_gps').value.trim() || null,
    estado_gps: document.getElementById('v_estado_gps').value || null,
    nombre_colaborador: nombreColaborador,
    puesto: document.getElementById('v_puesto').value.trim() || null,
    telefono: document.getElementById('v_telefono').value.trim() || null,
    dui: document.getElementById('v_dui').value.trim() || null,
    marca: document.getElementById('v_marca').value.trim() || null,
    modelo: document.getElementById('v_modelo').value.trim() || null,
    tipo: document.getElementById('v_tipo').value.trim() || null,
    rentadora: document.getElementById('v_rentadora').value.trim() || null,
    observaciones: document.getElementById('v_observaciones').value.trim() || null
  };

  const saveBtn = document.getElementById('vehiculoFormSaveBtn');
  saveBtn.textContent = 'Guardando...';
  saveBtn.disabled = true;

  try{
    let res;
    if(currentVehiculoEditId){
      res = await fetch(`${VEHICULOS_REST_URL}?id=eq.${currentVehiculoEditId}`, {
        method:'PATCH',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    } else {
      res = await fetch(VEHICULOS_REST_URL, {
        method:'POST',
        headers:{ ...sbHeaders, 'Prefer':'return=minimal' },
        body: JSON.stringify(payload)
      });
    }
    if(!res.ok){ const t = await res.text(); throw new Error(t || 'Error al guardar'); }

    showToast(currentVehiculoEditId ? 'Vehículo actualizado' : 'Vehículo agregado');
    closeVehiculoFormModal();
    await fetchVehiculos();
  }catch(err){
    console.error(err);
    showToast('No se pudo guardar: ' + err.message, 'error');
  }finally{
    saveBtn.textContent = 'Guardar';
    saveBtn.disabled = false;
  }
});

/* ---- View modal (Ver Vehículo) ---- */
const vehiculoViewModalOverlay = document.getElementById('vehiculoViewModalOverlay');

function openVehiculoViewModal(vehiculo){
  viewingVehiculo = vehiculo;
  const grid = document.getElementById('vehiculoViewGrid');
  const fieldsMap = [
    ['Placa', vehiculo.placa],
    ['GPS', vehiculo.gps],
    ['Estado GPS', vehiculo.estado_gps],
    ['Nombre del Colaborador', vehiculo.nombre_colaborador],
    ['Cuadrilla', vehiculo.puesto],
    ['Teléfono', vehiculo.telefono],
    ['DUI', vehiculo.dui],
    ['Marca', vehiculo.marca],
    ['Modelo', vehiculo.modelo],
    ['Tipo', vehiculo.tipo],
    ['Rentadora', vehiculo.rentadora],
    ['Observaciones', vehiculo.observaciones],
  ];
  grid.innerHTML = fieldsMap.map(([label,val]) => `
    <div>
      <div class="view-field-label">${label}</div>
      <div class="view-field-value">${escapeHtml(val) || '<span style="color:var(--text-faint);">—</span>'}</div>
    </div>
  `).join('');
  vehiculoViewModalOverlay.classList.add('active');
}
function closeVehiculoViewModal(){ vehiculoViewModalOverlay.classList.remove('active'); viewingVehiculo = null; }

document.getElementById('vehiculoViewModalClose').addEventListener('click', closeVehiculoViewModal);
document.getElementById('vehiculoViewCloseBtn').addEventListener('click', closeVehiculoViewModal);
vehiculoViewModalOverlay.addEventListener('click', (e) => { if(e.target === vehiculoViewModalOverlay) closeVehiculoViewModal(); });
document.getElementById('vehiculoViewEditBtn').addEventListener('click', () => {
  const v = viewingVehiculo;
  closeVehiculoViewModal();
  openVehiculoFormModal(v);
});

/* ---- Delete modal (Eliminar Vehículo) ---- */
const vehiculoDeleteModalOverlay = document.getElementById('vehiculoDeleteModalOverlay');

function openVehiculoDeleteModal(vehiculo){
  pendingVehiculoDeleteId = vehiculo.id;
  document.getElementById('vehiculoDeleteName').textContent = vehiculo.placa || 'este vehículo';
  vehiculoDeleteModalOverlay.classList.add('active');
}
function closeVehiculoDeleteModal(){ vehiculoDeleteModalOverlay.classList.remove('active'); pendingVehiculoDeleteId = null; }

document.getElementById('vehiculoDeleteCancelBtn').addEventListener('click', closeVehiculoDeleteModal);
vehiculoDeleteModalOverlay.addEventListener('click', (e) => { if(e.target === vehiculoDeleteModalOverlay) closeVehiculoDeleteModal(); });

document.getElementById('vehiculoDeleteConfirmBtn').addEventListener('click', async () => {
  if(!pendingVehiculoDeleteId) return;
  const btn = document.getElementById('vehiculoDeleteConfirmBtn');
  btn.textContent = 'Eliminando...';
  btn.disabled = true;
  try{
    const res = await fetch(`${VEHICULOS_REST_URL}?id=eq.${pendingVehiculoDeleteId}`, {
      method:'DELETE',
      headers: sbHeaders
    });
    if(!res.ok) throw new Error('Error al eliminar');
    showToast('Vehículo eliminado');
    closeVehiculoDeleteModal();
    await fetchVehiculos();
  }catch(err){
    console.error(err);
    showToast('No se pudo eliminar: ' + err.message, 'error');
  }finally{
    btn.textContent = 'Eliminar';
    btn.disabled = false;
  }
});

/* ============================================================
   ACCESOS — listado rápido de Nombre + DUI por zona
============================================================ */
const ZONA_CUADRILLAS = {
  'Fibra': ['Central 1 FO','Central 2 FO','Central 3 FO','Central 4 FO','Central 5 FO','Central 6 FO'],
  'CU': ['Central 1 CU','Central 2 CU'],
  'Oriente': ['Oriente 1','Oriente 2'],
  'Occidente': ['Occidente']
};

let accesoExtras = []; // personal agregado manualmente (cualquier cuadrilla, incluye Supervisor/CPE)

function getAccesosRows(){
  const searchTerm = document.getElementById('accesoSearch').value.trim().toLowerCase();
  const zonaFilter = msVal('accesoZonaFilter');

  const zonaRows = allPeople.filter(p => {
    const matchesZona = zonaFilter.length === 0 || zonaFilter.some(z => (ZONA_CUADRILLAS[z] || []).includes(p.cuadrilla));
    return matchesZona;
  });

  // Combina zona + extras agregados manualmente, sin duplicar por id
  const combinedMap = new Map();
  zonaRows.forEach(p => combinedMap.set(p.id, p));
  accesoExtras.forEach(p => combinedMap.set(p.id, p));

  let rows = [...combinedMap.values()].filter(p =>
    !searchTerm || [p.nombre, p.dui].some(f => (f||'').toLowerCase().includes(searchTerm))
  );

  rows.sort((a,b) => (a.nombre||'').localeCompare(b.nombre||''));
  return rows;
}

function renderAccesosTable(){
  const wrap = document.getElementById('accesosTableWrap');
  const rows = getAccesosRows();
  const extraIds = new Set(accesoExtras.map(p => p.id));

  if(rows.length === 0){
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
        <div class="empty-title">Sin resultados</div>
        <div class="empty-desc">Prueba con otro término de búsqueda o cambia la zona.</div>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Nombre del Personal</th>
          <th>DUI</th>
          <th>Cuadrilla</th>
          <th style="text-align:right;">Acciones</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(p => `
          <tr>
            <td style="font-weight:600;">${escapeHtml(p.nombre || '—')}</td>
            <td class="mono">${escapeHtml(p.dui || '—')}</td>
            <td>${escapeHtml(p.cuadrilla || '—')}</td>
            <td style="text-align:right;">
              ${extraIds.has(p.id) ? `
                <button class="icon-btn danger" data-remove-acceso="${escapeHtml(p.id)}" title="Quitar de Accesos">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              ` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  wrap.querySelectorAll('[data-remove-acceso]').forEach(btn => {
    btn.addEventListener('click', () => {
      accesoExtras = accesoExtras.filter(p => String(p.id) !== String(btn.dataset.removeAcceso));
      renderAccesosTable();
    });
  });
}

document.getElementById('accesoSearch').addEventListener('input', renderAccesosTable);
document.getElementById('accesoZonaFilter').addEventListener('change', renderAccesosTable);

/* ---- Agregar personal manualmente a Accesos (cualquier cuadrilla) ---- */
const accesoAddSearchRow = document.getElementById('accesoAddSearchRow');
const accesoAddSearch = document.getElementById('accesoAddSearch');
const accesoAddResults = document.getElementById('accesoAddResults');

document.getElementById('btnAddAcceso').addEventListener('click', () => {
  const isHidden = accesoAddSearchRow.style.display === 'none';
  accesoAddSearchRow.style.display = isHidden ? 'block' : 'none';
  if(isHidden){ accesoAddSearch.focus(); }
});

accesoAddSearch.addEventListener('input', () => {
  const term = accesoAddSearch.value.trim().toLowerCase();
  if(!term){ accesoAddResults.classList.remove('show'); accesoAddResults.innerHTML=''; return; }

  const matches = allPeople.filter(p =>
    (p.nombre||'').toLowerCase().includes(term) || (p.dui||'').toLowerCase().includes(term)
  ).slice(0, 20);

  if(matches.length === 0){
    accesoAddResults.innerHTML = '<div class="site-result-empty">Sin resultados</div>';
  } else {
    accesoAddResults.innerHTML = matches.map(p => `
      <div class="site-result-item" data-acceso-id="${escapeHtml(p.id)}">
        <div class="site-result-name">${escapeHtml(p.nombre)}</div>
        <div class="site-result-meta">${escapeHtml(p.cuadrilla || '—')} · DUI ${escapeHtml(p.dui || '—')}</div>
      </div>
    `).join('');
  }
  accesoAddResults.classList.add('show');
});

accesoAddResults.addEventListener('click', (e) => {
  const item = e.target.closest('[data-acceso-id]');
  if(!item) return;
  const persona = allPeople.find(p => String(p.id) === String(item.dataset.accesoId));
  if(persona && !accesoExtras.find(p => String(p.id) === String(persona.id))){
    accesoExtras.push(persona);
    renderAccesosTable();
    showToast(persona.nombre + ' agregado a Accesos');
  }
  accesoAddSearch.value = '';
  accesoAddResults.classList.remove('show');
  accesoAddResults.innerHTML = '';
});

document.addEventListener('click', (e) => {
  if(!e.target.closest('#accesoAddSearchRow')){
    accesoAddResults.classList.remove('show');
  }
});

document.getElementById('btnCopiarAccesos').addEventListener('click', () => {
  const rows = getAccesosRows();

  if(rows.length === 0){
    showToast('No hay datos para copiar', 'error');
    return;
  }

  const texto = rows.map(p => `${p.nombre || ''}\t${p.dui || ''}`).join('\n');
  const btn = document.getElementById('btnCopiarAccesos');
  const restore = () => { btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar listado`; };
  const onCopied = () => {
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copiado`;
    showToast('Listado copiado al portapapeles');
    setTimeout(restore, 2200);
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texto).then(onCopied).catch(() => fallbackCopyNomina(texto, onCopied));
  } else {
    fallbackCopyNomina(texto, onCopied);
  }
});

/* ============================================================
   CASOS ATENDIDOS - MOVISTAR
============================================================ */
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

  fillSelect('casoZonaFilter', 'Todas las zonas', allCasos.map(c=>c.zona));
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
          <th>Zona</th>
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

function slaChipHtml(sla){
  if(!sla) return '<span style="color:var(--text-faint);">—</span>';
  // Convertir HH:MM a minutos totales
  const m = String(sla).match(/^(-?)(\d+):(\d{1,2})/);
  if(!m) return `<span class="mono">${escapeHtml(sla)}</span>`;
  const sign = m[1] === '-' ? -1 : 1;
  const totalMin = sign * (parseInt(m[2],10)*60 + parseInt(m[3],10));
  // Verde: 0 a 240 min (00:00 a 04:00), Rojo: más de 240 min
  const dentroSLA = totalMin >= 0 && totalMin <= 240;
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
      <td>${escapeHtml(c.causa || '—')}</td>
      <td>${c.status ? `<span class="status-chip ${statusClass}">${escapeHtml(c.status)}</span>` : '<span style="color:var(--text-faint);">—</span>'}</td>
      <td>${slaChipHtml(c.sla)}</td>
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

  // T | Validación = UP | Enlace - S | Validación
  const sVal = document.getElementById('c_s_validacion').value;
  const upEnlace = document.getElementById('c_up_enlace').value;
  if(sVal && upEnlace){
    const diffMin = (new Date(upEnlace) - new Date(sVal)) / 60000;
    document.getElementById('c_t_validacion').value = minutesToHHMM(diffMin);
  } else {
    document.getElementById('c_t_validacion').value = 'No aplica';
  }

  // T | Validación 2 = UP | Enlace Hyve - S | Validación Hyve
  const sValHyve = document.getElementById('c_s_validacion_hyve').value;
  const upEnlaceHyve = document.getElementById('c_up_enlace_hyve').value;
  if(sValHyve && upEnlaceHyve){
    const diffMin2 = (new Date(upEnlaceHyve) - new Date(sValHyve)) / 60000;
    document.getElementById('c_t_validacion2').value = minutesToHHMM(diffMin2);
  } else {
    document.getElementById('c_t_validacion2').value = 'No aplica';
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

  document.getElementById('c_clasificacion').value = caso?.clasificacion || '';
  document.getElementById('c_red').value = caso?.red || '';
  document.getElementById('c_casos').value = caso?.casos || '';
  document.getElementById('c_folio').value = caso?.folio || '';
  document.getElementById('c_status').value = caso?.status || '';
  document.getElementById('c_zona').value = caso?.zona || '';
  document.getElementById('c_causa').value = caso?.causa || '';
  document.getElementById('c_sub_categoria').value = caso?.sub_categoria || '';
  document.getElementById('c_acceso_sitio').value = caso?.acceso_a_sitio || '';
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
  document.getElementById('c_tiempos_aceptacion').value = caso?.tiempos_de_aceptacion || '';

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
    latitud: _coordCM.lat ? parseFloat(_coordCM.lat) : null,
    longitud: _coordCM.lng ? parseFloat(_coordCM.lng) : null,
    acceso_a_sitio: toTextOrNull('c_acceso_sitio'),
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
    ['Escalonamiento', caso.escalonamiento ? new Date(caso.escalonamiento).toLocaleString('es-SV') : null],
    ['Resolución', caso.resolucion ? new Date(caso.resolucion).toLocaleString('es-SV') : null],
    ['Lapso', caso.lapso], ['SLA', caso.sla], ['Intervalo', caso.intervalo], ['Segundo', caso.segundo],
    ['Tiempos de Aceptación', caso.tiempos_de_aceptacion], ['MMA', caso.mma],
    ['Coordenadas', formatCoordenadas(caso.latitud, caso.longitud)],
    ['S | Validación', caso.s_validacion ? new Date(caso.s_validacion).toLocaleString('es-SV') : null],
    ['UP | Enlace', caso.up_enlace ? new Date(caso.up_enlace).toLocaleString('es-SV') : null],
    ['T | Validación', caso.t_validacion],
    ['S | Validación Hyve', caso.s_validacion_hyve ? new Date(caso.s_validacion_hyve).toLocaleString('es-SV') : null],
    ['UP | Enlace Hyve', caso.up_enlace_hyve ? new Date(caso.up_enlace_hyve).toLocaleString('es-SV') : null],
    ['T | Validación 2', caso.t_validacion2],
    ['Observación', caso.observacion],
  ];
  grid.innerHTML = fieldsMap.map(([label,val]) => `
    <div>
      <div class="view-field-label">${label}</div>
      <div class="view-field-value">${escapeHtml(val) || '<span style="color:var(--text-faint);">—</span>'}</div>
    </div>
  `).join('');

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
    ['s_validacion','S | Validación'],['up_enlace','UP | Enlace'],['t_validacion','T | Validación'],
    ['s_validacion_hyve','S | Validación Hyve'],['up_enlace_hyve','UP | Enlace Hyve'],['t_validacion2','T | Validacion2'],
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
  const SLA_UMBRAL = 240;
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
    ['s_validacion','S | Validación'],['up_enlace','UP | Enlace'],['t_validacion','T | Validación'],
    ['s_validacion_hyve','S | Validación Hyve'],['up_enlace_hyve','UP | Enlace Hyve'],['t_validacion2','T | Validacion2'],
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
    setOpts(`${prefijo}SemanaFilter`, 'Todas las semanas', paso2.map(c=>c.wk), true);
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
    const matchesSemana = semanaFilter.length === 0 || semanaFilter.includes(String(c.wk));
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
          <th>WK / OT</th>
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
      <td class="mono">${escapeHtml(c.wk || '—')} / ${escapeHtml(c.ot || '—')}</td>
      <td>${escapeHtml(c.causa || '—')}</td>
      <td>${c.status ? `<span class="status-chip ${statusClass}">${escapeHtml(c.status)}</span>` : '<span style="color:var(--text-faint);">—</span>'}</td>
      <td>${slaChipHtml(c.sla)}</td>
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
}
['h_escalonamiento','h_resolucion','h_sla'].forEach(id => {
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
    latitud: parseCoordenadas(document.getElementById('h_coordenadas').value).lat || null,
    longitud: parseCoordenadas(document.getElementById('h_coordenadas').value).lng || null,
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

function openHyveViewModal(caso){
  viewingHyve = caso;
  const grid = document.getElementById('hyveViewGrid');
  const fieldsMap = [
    ['Clasificación', caso.clasificacion], ['Casos', caso.casos], ['WK', caso.wk], ['OT', caso.ot],
    ['Técnico Encargado', caso.tecnico_encargado], ['Status', caso.status],
    ['Causa', caso.causa], ['Sub Categoría', caso.sub_categoria],
    ['Año', caso.anos], ['Mes', caso.mes],
    ['Escalonamiento', caso.escalonamiento ? new Date(caso.escalonamiento).toLocaleString('es-SV') : null],
    ['Resolución', caso.resolucion ? new Date(caso.resolucion).toLocaleString('es-SV') : null],
    ['Lapso', caso.lapso], ['SLA', caso.sla], ['Intervalo', caso.intervalo],
    ['Materiales (nota)', caso.materiales], ['Observación', caso.observacion],
    ['Coordenadas', formatCoordenadas(caso.latitud, caso.longitud)],
  ];
  grid.innerHTML = fieldsMap.map(([label,val]) => `
    <div>
      <div class="view-field-label">${label}</div>
      <div class="view-field-value">${escapeHtml(val) || '<span style="color:var(--text-faint);">—</span>'}</div>
    </div>
  `).join('');

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
    ['status','Estatus'],['wk','WK'],['ot','OT'],['tecnico_encargado','Técnico Encargado'],
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

  const SLA_UMBRAL = 240;
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
    ['status','Estatus'],['wk','WK'],['ot','OT'],['tecnico_encargado','Técnico Encargado'],
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
let allUdp = [];
let currentUdpEditId = null;
let pendingUdpDeleteId = null;
let viewingUdp = null;
let udpMaterialesActuales = [];

// UDP no tiene columna "Año" propia; se calcula a partir de Escalonamiento
function udpAno(c){
  return c.escalonamiento ? new Date(c.escalonamiento).getFullYear() : null;
}

async function fetchUdp(){
  const wrap = document.getElementById('udpTableWrap');
  wrap.innerHTML = '<div class="loading-row"><div class="spinner"></div>Cargando casos…</div>';
  try{
    const res = await fetch(`${UDP_REST_URL}?select=*&order=created_at.desc`, { headers: sbHeaders });
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
          <th>Red</th>
          <th>Causa</th>
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
      <td>${escapeHtml(c.red || '—')}</td>
      <td>${escapeHtml(c.causa || '—')}</td>
      <td>${slaChipHtml(c.sla)}</td>
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

  const payload = {
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
    ['Clasificación', caso.clasificacion], ['Red', caso.red], ['Casos', caso.casos], ['ID', caso.id_externo],
    ['Técnico', caso.nombre_del_tecnico], ['Causa', caso.causa], ['Sub Categoría', caso.sub_categoria],
    ['Mes', caso.mes], ['Día', caso.dia],
    ['Escalonamiento', caso.escalonamiento ? new Date(caso.escalonamiento).toLocaleString('es-SV') : null],
    ['Resolución', caso.resolucion ? new Date(caso.resolucion).toLocaleString('es-SV') : null],
    ['SLA', caso.sla],
    ['Materiales (nota)', caso.materiales], ['Observación', caso.observacion],
  ];
  grid.innerHTML = fieldsMap.map(([label,val]) => `
    <div>
      <div class="view-field-label">${label}</div>
      <div class="view-field-value">${escapeHtml(val) || '<span style="color:var(--text-faint);">—</span>'}</div>
    </div>
  `).join('');

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
          <th>Cuadrilla</th>
          <th>Zona</th>
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
      <td>${escapeHtml(c.causa || '—')}</td>
      <td>${c.status ? `<span class="status-chip ${statusClass}">${escapeHtml(c.status)}</span>` : '<span style="color:var(--text-faint);">—</span>'}</td>
      <td>${slaChipHtml(c.tiempo_respuesta)}</td>
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
}
['cb_escalonamiento','cb_resolucion','cb_pausa'].forEach(id => {
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
  document.getElementById('cb_zona').value = caso?.zona || '';
  document.getElementById('cb_tipo_falla').value = caso?.tipo_falla || '';
  document.getElementById('cb_ot').value = caso?.ot || '';
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
    cuadrilla: cbNombreTecnico,
    status: toTextOrNull('cb_status'),
    causa: toTextOrNull('cb_causa'),
    sub_categoria: toTextOrNull('cb_sub_categoria'),
    latitud: parseCoordenadas(document.getElementById('cb_coordenadas').value).lat || null,
    longitud: parseCoordenadas(document.getElementById('cb_coordenadas').value).lng || null,
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

function openCableViewModal(caso){
  viewingCable = caso;
  const grid = document.getElementById('cableViewGrid');
  const fieldsMap = [
    ['#', caso.numero], ['Zona', caso.zona], ['Tipo de Falla', caso.tipo_falla], ['OT', caso.ot],
    ['Descripción', caso.descripcion], ['Cuadrilla', caso.cuadrilla], ['Status', caso.status],
    ['Causa', caso.causa], ['Sub Categoría', caso.sub_categoria],
    ['Año', caso.anos], ['Mes', caso.mes], ['Semana', caso.semana],
    ['Escalonamiento', caso.escalonamiento ? new Date(caso.escalonamiento).toLocaleString('es-SV') : null],
    ['Resolución', caso.resolucion ? new Date(caso.resolucion).toLocaleString('es-SV') : null],
    ['Tiempo de Afectación', caso.tiempo_afectacion], ['Pausa', caso.pausa], ['Tiempo de Respuesta', caso.tiempo_respuesta],
    ['Observación', caso.observacion],
    ['Coordenadas', formatCoordenadas(caso.latitud, caso.longitud)],
  ];
  grid.innerHTML = fieldsMap.map(([label,val]) => `
    <div>
      <div class="view-field-label">${label}</div>
      <div class="view-field-value">${escapeHtml(val) || '<span style="color:var(--text-faint);">—</span>'}</div>
    </div>
  `).join('');

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

  const SLA_UMBRAL = 240;
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
          <th>Cuadrilla</th>
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
}

const ACTIVIDADES_POR_PAGINA = 20;
let actividadPaginaActual = 1;

function getActividadesFiltradas(){
  const searchTerm = document.getElementById('actSearch').value.trim().toLowerCase();
  const proyecto = document.getElementById('actProyectoFilter').value;
  const ano = document.getElementById('actAnoFilter').value;
  const mes = document.getElementById('actMesFilter').value;

  return allActividades.filter(a => {
    const matchesSearch = !searchTerm || [a.proyecto, a.actividad, a.folio, a.lider_cuadrilla, a.observacion]
      .some(f => (f||'').toLowerCase().includes(searchTerm));
    const matchesProyecto = !proyecto || a.proyecto === proyecto;
    const matchesAno = !ano || String(a.anio) === ano;
    const matchesMes = !mes || a.mes === mes;
    return matchesSearch && matchesProyecto && matchesAno && matchesMes;
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
      <td>${escapeHtml(a.proyecto || '—')}</td>
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
document.getElementById('actAnoFilter').addEventListener('change', renderActividadesTable);
document.getElementById('actMesFilter').addEventListener('change', renderActividadesTable);

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
      { id:'materiales', label:'Materiales' }
    ] },
  { id:'cable',        label:'Casos Cable Color', subtabs:[
      { id:'listado',    label:'Casos Atendidos' },
      { id:'dashboard',  label:'Dashboard' },
      { id:'materiales', label:'Materiales' }
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
  'casos.listado':      'btnAddCaso',
  'hyve.listado':       'btnAddHyve',
  'udp.listado':        'btnAddUdp',
  'cable.listado':      'btnAddCable',
  'actividades':        'btnAddActividad',
  'cumplimiento':       'btnAddCumplimiento'
};

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

    if(tab.subtabs && tab.subtabs.length){
      const attr = OPK_SUBTAB_ATTR[tab.id];
      tab.subtabs.forEach(sub => {
        const permisoSub = (permisoTab.subtabs && permisoTab.subtabs[sub.id]) || { ver:false, editar:false };
        const subPuedeVer = accesoTotal || !!permisoSub.ver;
        const subPuedeEditar = accesoTotal || !!permisoSub.editar;
        if(attr){
          const btnSub = document.querySelector(`#view-${tab.id} [${attr}="${sub.id}"]`);
          if(btnSub) btnSub.style.display = subPuedeVer ? '' : 'none';
        }
        const editBtnId = OPK_EDIT_BUTTONS[tab.id + '.' + sub.id];
        if(editBtnId){
          const editBtn = document.getElementById(editBtnId);
          if(editBtn) editBtn.style.display = subPuedeEditar ? '' : 'none';
        }
      });
    } else {
      const editBtnId = OPK_EDIT_BUTTONS[tab.id];
      if(editBtnId){
        const editBtn = document.getElementById(editBtnId);
        if(editBtn) editBtn.style.display = puedeEditar ? '' : 'none';
      }
    }
  });

  // Si la vista activa ya no está permitida, regresar a Inicio
  if(!vistaActivaPermitida){
    const inicioNav = document.querySelector('.nav-item[data-view="inicio"]');
    if(inicioNav) inicioNav.click();
  }
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
  opkMostrarSesionEnSidebar(usuario);
  opkRestaurarUltimaVista();
  opkColapsarMenuInicial();
  opkObservarRestriccionesEdicion();
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

  try{
    const authData = await opkAuthRefresh(guardado.refresh_token);
    const usuarioActual = guardado.usuario || (authData.user && authData.user.email ? authData.user.email.split('@')[0] : null);
    if(!usuarioActual){ opkMostrarLogin(); return; }
    let perfil = await opkFetchPerfilPorUsuario(usuarioActual, authData.access_token);
    if(!perfil){ opkMostrarLogin(); return; }
    perfil = await opkAsegurarUsuarioPrincipal(perfil, authData.access_token);
    opkGuardarTokens(authData, usuarioActual);
    opkIniciarSesion({ ...perfil, access_token: authData.access_token });
  }catch(err){
    console.error('No se pudo restaurar la sesión:', err);
    try{ localStorage.removeItem(OPK_SESION_KEY); }catch(e){}
    opkMostrarLogin();
  }
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
