// ============================================================
// 01-core.js  —  Configuración, helpers, navegación, permisos, personal, sitios, vehículos, accesos
// Parte de la aplicación NOC Tekcom. Se carga en orden desde index.html;
// NO reordenar las etiquetas <script> ni renombrar estos archivos.
// ============================================================

console.log('%c[app.js] build 2026-07-19-estatus-v3 cargado correctamente', 'color: #16a34a; font-weight: bold;');

/* ============================================================
   CONFIG SUPABASE
============================================================ */
const SUPABASE_URL = 'https://knrvlsixtonycosjobci.supabase.co';
const LOGO_TEKCOM_BASE64 = 'data:image/png;base64,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';
const SUPABASE_KEY = 'sb_publishable_wsHGxZq_TW5W4Qb8s0hiMQ_P002AX5h';
const REST_URL = `${SUPABASE_URL}/rest/v1/tecnicos`;

// Cabeceras de todas las consultas a Supabase.
// El Authorization arranca con la clave pública (rol `anon`, necesario para el
// propio login) y se REEMPLAZA por el token del usuario al iniciar sesión.
// Sin esto, todas las consultas viajarían como anónimas y las políticas RLS
// que exigen sesión bloquearían el sistema.
const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

// Cambia la identidad con la que se consulta la base.
// token = null -> vuelve al modo anónimo (cierre de sesión).
// ============================================================
// NOTIFICACIONES DEL SISTEMA OPERATIVO
// Aparecen en la esquina de Windows aunque el navegador esté minimizado o
// estés en otro programa. Requieren permiso del usuario una sola vez.
// NOTA: no pueden sonar si la pestaña está silenciada o el volumen en cero;
// eso ningún navegador lo permite.
// ============================================================
let notifPermiso = ('Notification' in window) ? Notification.permission : 'unsupported';

// Cuánto permanece visible el aviso del sistema antes de retirarse solo.
const NOTIF_DURACION_MS = 5000;

// Avisos del sistema en pantalla, para poder retirarlos al volver al sistema.
const notifActivas = new Set();

function notifCerrarTodas(){
  notifActivas.forEach(n => { try{ n.close(); }catch(e){} });
  notifActivas.clear();
}

// Al volver al sistema se retiran los avisos: ya estás viendo el panel,
// la burbuja interna basta y los avisos de Windows sobran.
window.addEventListener('focus', notifCerrarTodas);
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'visible') notifCerrarTodas();
});

function notifSolicitarPermiso(){
  if(!('Notification' in window)) return;
  if(Notification.permission === 'default'){
    Notification.requestPermission().then(p => { notifPermiso = p; });
  } else {
    notifPermiso = Notification.permission;
  }
}

// Muestra un aviso del sistema. Al hacer clic, trae la ventana al frente.
function notificarSistema(titulo, cuerpo, etiqueta){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  // Si el operador está viendo el sistema, la burbuja interna es suficiente:
  // el aviso de Windows solo tiene sentido cuando está en otro programa.
  if(document.hasFocus() && document.visibilityState === 'visible') return;
  try{
    const n = new Notification(titulo, {
      body: cuerpo,
      // La etiqueta evita apilar diez avisos del mismo ticket: se reemplaza.
      tag: etiqueta || 'opk-alerta',
      renotify: true,
      requireInteraction: false,  // se cierra sola
      icon: (typeof LOGO_TEKCOM_BASE64 !== 'undefined') ? LOGO_TEKCOM_BASE64 : undefined
    });
    notifActivas.add(n);
    n.onclick = () => { window.focus(); n.close(); notifActivas.delete(n); };
    n.onclose = () => notifActivas.delete(n);
    // Se retira a los 5 segundos para no acumular avisos en pantalla.
    setTimeout(() => { try{ n.close(); }catch(e){} notifActivas.delete(n); }, NOTIF_DURACION_MS);
  }catch(e){}
}

// El permiso se pide en la primera interacción, junto con el desbloqueo de audio.
['click','keydown'].forEach(ev => {
  document.addEventListener(ev, notifSolicitarPermiso, { once:true, capture:true });
});

// ============================================================
// NARRACIÓN POR VOZ DE LAS ALERTAS
// Usa la síntesis de voz del navegador: no requiere archivos de audio y
// permite leer datos variables (número de ticket, minutos transcurridos).
// Funciona igual con file:// que publicado.
// ============================================================
// La narración es obligatoria: no se expone ningún control para apagarla,
// para que un operador no pueda dejar el turno sin avisos hablados.
const vozHabilitada = true;
let vozEs = null;           // voz elegida
let vozVelocidad = 0.95;    // 0.8 lenta · 0.95 normal · 1.15 rápida

const VOZ_NOMBRE_KEY = 'opk_voz_nombre';
const VOZ_VELOCIDAD_KEY = 'opk_voz_velocidad';

function vozDisponibles(){
  if(!('speechSynthesis' in window)) return [];
  const todas = speechSynthesis.getVoices();
  const español = todas.filter(v => /^es/i.test(v.lang));
  // Si el equipo no tiene ninguna voz en español, se ofrecen todas.
  return español.length ? español : todas;
}

function vozElegirVoz(){
  const voces = vozDisponibles();
  if(!voces.length) return null;
  let guardada = '';
  try{ guardada = localStorage.getItem(VOZ_NOMBRE_KEY) || ''; }catch(e){}
  return voces.find(v => v.name === guardada)
      || voces.find(v => /es-(MX|US|419|SV|CO)/i.test(v.lang))
      || voces[0];
}

if('speechSynthesis' in window){
  try{ vozVelocidad = Number(localStorage.getItem(VOZ_VELOCIDAD_KEY)) || 0.95; }catch(e){}
  // Las voces cargan de forma asíncrona: hay que reaccionar al evento.
  speechSynthesis.onvoiceschanged = () => { vozEs = vozElegirVoz(); vozRenderControles(); };
  vozEs = vozElegirVoz();
}

// Lee un texto en voz alta. Los textos largos se cortan solos.
function narrar(texto){
  if(!vozHabilitada || !texto || !('speechSynthesis' in window)) return;

  const hablar = () => {
    try{
      if(!vozDesbloqueada) vozDesbloquear();
      const u = new SpeechSynthesisUtterance(String(texto));
      u.lang = (vozEs && vozEs.lang) || 'es-ES';
      if(vozEs) u.voice = vozEs;
      u.rate = vozVelocidad;
      u.pitch = 1;
      u.volume = 1;
      u.onerror = (e) => {
        if(e.error === 'not-allowed'){
          vozDesbloqueada = false;
          vozPendiente = String(texto);   // se dirá en cuanto haya un clic
          console.warn('[voz] bloqueada. Haz clic en la página: el aviso pendiente se dirá enseguida.');
        } else {
          console.warn('[voz] error:', e.error);
        }
      };
      // Chrome puede dejar la síntesis en pausa; resume() la reactiva.
      speechSynthesis.resume();
      speechSynthesis.speak(u);
    }catch(e){ console.warn('[voz]', e); }
  };

  try{
    // Chrome tiene un fallo conocido: si se llama cancel() e inmediatamente
    // speak(), la voz no sale. Solo se cancela si de verdad está hablando,
    // y se espera un instante antes de la nueva frase.
    if(speechSynthesis.speaking || speechSynthesis.pending){
      speechSynthesis.cancel();
      setTimeout(hablar, 250);
    } else {
      hablar();
    }
  }catch(e){ console.warn('[voz]', e); }
}

// La síntesis de voz tiene su propio bloqueo de autoplay, independiente del
// de los <audio>. Sin este desbloqueo, cada intento falla con "not-allowed".
// Se pronuncia una frase muda durante el primer gesto del usuario, que es lo
// único que el navegador acepta como autorización.
let vozDesbloqueada = false;
let vozPendiente = null;   // frase que quedó sin decirse por falta de permiso

function vozDesbloquear(){
  if(!('speechSynthesis' in window)) return;
  try{
    const u = new SpeechSynthesisUtterance('.');
    u.volume = 0.01;   // prácticamente inaudible, pero cuenta como reproducción real
    u.onend = () => {
      if(!vozDesbloqueada){
        vozDesbloqueada = true;
        console.log('[voz] habilitada');
      }
      // Si una alarma quiso hablar mientras estaba bloqueada, se dice ahora.
      if(vozPendiente){
        const t = vozPendiente;
        vozPendiente = null;
        narrar(t);
      }
    };
    speechSynthesis.resume();
    speechSynthesis.speak(u);
  }catch(e){}
}

// NO se usa { once:true }: el permiso puede perderse y conviene refrescarlo
// en cada interacción. Es imperceptible y evita quedarse sin voz a mitad del turno.
['click','keydown','touchstart'].forEach(ev => {
  document.addEventListener(ev, () => {
    if(!vozDesbloqueada || vozPendiente) vozDesbloquear();
  }, { capture:true });
});

// Convierte "02:35" en "2 horas con 35 minutos", para que la voz suene natural.
function vozTiempo(hhmm){
  const m = String(hhmm || '').match(/^(\d+):(\d{2})/);
  if(!m) return hhmm || '';
  const h = Number(m[1]), min = Number(m[2]);
  const partes = [];
  if(h > 0) partes.push(h === 1 ? 'una hora' : `${h} horas`);
  if(min > 0) partes.push(min === 1 ? 'un minuto' : `${min} minutos`);
  return partes.length ? partes.join(' con ') : 'menos de un minuto';
}

function sbUsarToken(token){
  sbHeaders.Authorization = `Bearer ${token || SUPABASE_KEY}`;
}

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
  cumplimiento: { title:'Cumplimiento de Visitas', sub:'' },
  plantillas: { title:'Plantillas de Avance', sub:'' }
};

let sitiosLoaded = false;
let casosLoaded = false;
let hyveLoaded = false;
let udpLoaded = false;
let cableLoaded = false;
let actividadesLoaded = false;
let nominaInitialized = false;

// La vista "Inicio" ya viene marcada como activa desde el HTML (nadie hizo
// clic todavía), así que hay que sincronizar la clase en-inicio del body
// aquí mismo al cargar el script; si no, el fondo unificado del Inicio solo
// se aplicaría después de que el usuario cambie de pestaña y regrese.
(function opkSincronizarEnInicioAlCargar(){
  const vistaActivaEl = document.querySelector('.view.active');
  const vistaActiva = vistaActivaEl ? vistaActivaEl.id.replace('view-', '') : 'inicio';
  document.body.classList.toggle('en-inicio', vistaActiva === 'inicio');
})();

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const v = item.dataset.view;
    try{ localStorage.setItem('opk_ultima_vista', v); }catch(e){}
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    document.querySelectorAll('.view').forEach(s => s.classList.remove('active'));
    document.getElementById('view-' + v).classList.add('active');
    // Marca el body para que el Inicio pinte también el área alrededor de la vista.
    document.body.classList.toggle('en-inicio', v === 'inicio');
    if(v === 'inicio' && typeof renderInicioOperadorTurno === 'function') renderInicioOperadorTurno();
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
    if(v === 'plantillas'){
      plCargarLista();
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
      if(!accesoExtrasCargado){
        accesoExtrasCargado = true;
        fetchAccesoExtras().then(renderAccesosTable);
      }
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
    document.getElementById('subtabu-escuelas').classList.remove('active');
    document.getElementById('subtabu-dashboard').classList.remove('active');
    document.getElementById('subtabu-' + tab).classList.add('active');
    document.querySelectorAll('.udp-filterbar').forEach(b => b.style.display = 'none');
    const fb = document.getElementById('udp-filterbar-' + tab);
    if(fb) fb.style.display = 'flex';
    if(tab === 'materiales'){ initUdpMateriales(); }
    if(tab === 'escuelas'){ fetchEscuelas(); }
    if(tab === 'dashboard'){ initUdpDashboard(); }
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
  // El listado muestra el vehículo tomado del módulo de Vehículos: si aún no se
  // ha cargado, se pide una vez y la tabla se vuelve a pintar al terminar.
  if(!vehiculosLoaded && typeof fetchVehiculos === 'function'){
    vehiculosLoaded = true;
    fetchVehiculos().then(() => renderTable()).catch(() => {});
  }

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

// El vehículo de una persona vive en el módulo de Vehículos, no en su ficha.
// Se enlaza por DUI, que es el dato único entre ambas tablas; si falta, por nombre.
// Así, al cambiar la placa o el modelo en Vehículos, el listado se actualiza solo.
function vehiculoDePersona(p){
  if(!p) return null;
  const lista = (typeof allVehiculos !== 'undefined' && Array.isArray(allVehiculos)) ? allVehiculos : [];
  let v = null;
  if(p.dui) v = lista.find(x => x.dui && String(x.dui).trim() === String(p.dui).trim());
  if(!v && p.nombre) v = lista.find(x => (x.nombre_colaborador || '').trim() === String(p.nombre).trim());
  if(v) return { placa: v.placa || '', marca: v.marca || '', modelo: v.modelo || '' };
  // Respaldo para registros anteriores, que guardaban el dato en la propia persona.
  if(p.placa_vehiculo || p.marca || p.modelo){
    return { placa: p.placa_vehiculo || '', marca: p.marca || '', modelo: p.modelo || '' };
  }
  return null;
}

function rowHtml(p){
  const c = colorFor(p.cuadrilla || p.nombre || '');
  const veh = vehiculoDePersona(p);
  const vehiculo = veh ? [veh.marca, veh.modelo].filter(Boolean).join(' ') : '';
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
      <td>${(veh && (veh.placa || vehiculo)) ? `<span class="mono">${escapeHtml(veh.placa)}</span>${vehiculo ? ` <span style="color:var(--text-faint);">· ${escapeHtml(vehiculo)}</span>` : ''}` : '<span style="color:var(--text-faint);">—</span>'}</td>
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

// Versión numérica: las columnas latitud/longitud son `double precision`, así que
// nunca deben recibir texto. Devuelve números finitos o null. Acepta coma o espacios
// como separador; si el valor no se puede interpretar con seguridad, devuelve null
// en vez de mandar basura a la base (error 22P02).
function parseCoordenadasNum(str){
  const txt = String(str || '').trim();
  if(!txt) return { lat:null, lng:null, valido:true, vacio:true };
  let partes = txt.split(',').map(x => x.trim()).filter(Boolean);
  if(partes.length === 1) partes = txt.split(/\s+/).filter(Boolean);
  if(partes.length !== 2) return { lat:null, lng:null, valido:false, vacio:false };
  const lat = Number(partes[0]);
  const lng = Number(partes[1]);
  if(!isFinite(lat) || !isFinite(lng)) return { lat:null, lng:null, valido:false, vacio:false };
  if(lat < -90 || lat > 90 || lng < -180 || lng > 180) return { lat:null, lng:null, valido:false, vacio:false };
  return { lat, lng, valido:true, vacio:false };
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
    ['Placa de vehículo', (vehiculoDePersona(person)?.placa) || null],
    ['Marca', person.marca],
    ['Modelo', person.modelo],
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

// Tarjeta de total + mini gráfico por rentadora, encima de la tabla.
function renderVehiculosResumen(rows){
  const cont = document.getElementById('vehiculosResumen');
  if(!cont) return;

  const porRentadora = {};
  rows.forEach(v => {
    const r = (v.rentadora || '').trim() || 'Sin rentadora';
    porRentadora[r] = (porRentadora[r] || 0) + 1;
  });
  const lista = Object.entries(porRentadora).sort((a,b) => b[1] - a[1]);
  const max = lista.length ? lista[0][1] : 1;

  // Paleta fija para que cada rentadora conserve su color entre renders.
  const COLORES = ['#1D6FA5','#16A34A','#D97706','#7C3AED','#DC2626','#0891B2','#DB2777','#65A30D'];

  cont.innerHTML = `
    <div class="panel" style="padding:20px; display:flex; flex-direction:column; justify-content:center;">
      <div style="font-size:12.5px; color:var(--text-dim);">Vehículos registrados</div>
      <div style="font-size:40px; font-weight:800; line-height:1.1; margin-top:4px;">${rows.length}</div>
      <div style="font-size:12px; color:var(--text-dim); margin-top:6px;">
        ${lista.length} rentadora(s) · ${rows.filter(v => (v.estado_gps || '') === 'Sin Gestion').length} sin gestión GPS
      </div>
    </div>
    <div class="panel" style="padding:20px;">
      <div class="caso-section-title" style="border:none; padding:0; margin:0 0 12px;">Por Rentadora</div>
      ${lista.length === 0
        ? '<div class="material-empty">Sin vehículos en este filtro</div>'
        : lista.map(([nombre, total], i) => `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:7px;">
              <div style="width:150px; flex-shrink:0; font-size:12px; color:var(--text-dim);
                          white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"
                   title="${escapeHtml(nombre)}">${escapeHtml(nombre)}</div>
              <div style="flex:1; background:var(--surface-3); border-radius:6px; height:22px;">
                <div style="width:${Math.max(8, total / max * 100)}%; background:${COLORES[i % COLORES.length]};
                            height:100%; border-radius:6px; display:flex; align-items:center;
                            justify-content:flex-end; padding-right:8px; color:#fff;
                            font-size:11.5px; font-weight:700;">${total}</div>
              </div>
            </div>`).join('')}
    </div>`;
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

  // El resumen refleja el filtro activo, no el total absoluto.
  renderVehiculosResumen(rows);

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
    // La columna Vehículo del Listado de Personal se alimenta de aquí.
    if(typeof renderTable === 'function') renderTable();
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

// Los agregados manuales se guardan en la base: antes vivían solo en memoria
// y se perdían al recargar la página. La tabla solo almacena el id de la persona;
// el nombre, DUI y cuadrilla se resuelven contra el Listado del Personal.
const ACCESOS_EXTRA_REST_URL = `${SUPABASE_URL}/rest/v1/accesos_extra`;
let accesoExtrasCargado = false;

async function fetchAccesoExtras(){
  try{
    const res = await fetch(`${ACCESOS_EXTRA_REST_URL}?select=persona_id`, { headers: sbHeaders });
    if(!res.ok) throw new Error(await res.text());
    const ids = (await res.json()).map(x => String(x.persona_id));
    accesoExtras = allPeople.filter(p => ids.includes(String(p.id)));
  }catch(err){
    console.error('[accesos extra]', err.message);
  }
}

async function agregarAccesoExtra(persona){
  if(accesoExtras.find(p => String(p.id) === String(persona.id))) return;
  accesoExtras.push(persona);
  renderAccesosTable();
  try{
    const res = await fetch(ACCESOS_EXTRA_REST_URL, {
      method:'POST', headers: sbHeaders,
      body: JSON.stringify({ persona_id: persona.id })
    });
    if(!res.ok) throw new Error(await res.text());
  }catch(err){
    showToast('Se agregó en pantalla, pero no se pudo guardar: ' + err.message, 'error');
  }
}

async function quitarAccesoExtra(personaId){
  accesoExtras = accesoExtras.filter(p => String(p.id) !== String(personaId));
  renderAccesosTable();
  try{
    const res = await fetch(`${ACCESOS_EXTRA_REST_URL}?persona_id=eq.${encodeURIComponent(personaId)}`, {
      method:'DELETE', headers: sbHeaders
    });
    if(!res.ok) throw new Error(await res.text());
  }catch(err){
    showToast('No se pudo quitar de la base: ' + err.message, 'error');
  }
}

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
      quitarAccesoExtra(btn.dataset.removeAcceso);
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
    agregarAccesoExtra(persona);
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
// Ajustes de voz. La voz en sí no se puede desactivar.

// Rellena el desplegable de voces. Se llama también cuando el navegador
// termina de cargarlas, porque llegan de forma asíncrona.
function vozRenderControles(){
  const sel = document.getElementById('inicioVozSelect');
  if(!sel) return;
  const voces = vozDisponibles();
  if(!voces.length){
    sel.innerHTML = '<option>Sin voces instaladas</option>';
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  const actual = vozEs ? vozEs.name : '';
  sel.innerHTML = voces.map(v =>
    `<option value="${escapeHtml(v.name)}" ${v.name === actual ? 'selected' : ''}>${escapeHtml(v.name)} (${escapeHtml(v.lang)})</option>`
  ).join('');
}

(function initVozAlertas(){
  vozRenderControles();

  const selVoz = document.getElementById('inicioVozSelect');
  if(selVoz){
    selVoz.addEventListener('change', () => {
      vozEs = vozDisponibles().find(v => v.name === selVoz.value) || vozEs;
      try{ localStorage.setItem(VOZ_NOMBRE_KEY, selVoz.value); }catch(e){}
      narrar('Esta es la voz seleccionada');
    });
  }

  const selVel = document.getElementById('inicioVozVelocidad');
  if(selVel){
    selVel.value = String(vozVelocidad);
    selVel.addEventListener('change', () => {
      vozVelocidad = Number(selVel.value) || 0.95;
      try{ localStorage.setItem(VOZ_VELOCIDAD_KEY, String(vozVelocidad)); }catch(e){}
      narrar('Velocidad ajustada');
    });
  }

  const btn = document.getElementById('inicioVozProbar');
  if(btn){
    btn.addEventListener('click', () => {
      // Se prueba con una frase real, no con un texto genérico.
      narrar('Ticket 2455 sin actualizar desde hace 2 horas con 35 minutos.');
    });
  }
})();
