// ============================================================
//  DEEJAY ACADEMY — script.js con Firebase Firestore + Auth
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc,
  addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCSrMuYRkMAZrp5v0AafK45xqFwdkBquqY",
  authDomain:        "deejya-academy-base-alumnos.firebaseapp.com",
  projectId:         "deejya-academy-base-alumnos",
  storageBucket:     "deejya-academy-base-alumnos.firebasestorage.app",
  messagingSenderId: "1092925669565",
  appId:             "1:1092925669565:web:8f30089783c52947d777d4"
};

const fbApp = initializeApp(firebaseConfig);
const db    = getFirestore(fbApp);
const auth  = getAuth(fbApp);
var rolActual = null;

async function fbAdd(col, data) { const r = await addDoc(collection(db, col), {...data, _ts: serverTimestamp()}); return r.id; }
async function fbUpd(col, id, data) { await updateDoc(doc(db, col, id), {...data, _ts: serverTimestamp()}); }
async function fbSet(col, id, data) { await setDoc(doc(db, col, id), {...data, _ts: serverTimestamp()}, {merge:true}); }
async function fbDel(col, id) { await deleteDoc(doc(db, col, id)); }

var DB = { alumnos:[], pagos:[], cuotas:[], asistencias:[], cursos:[], horario_grupos:[], aulas_vinculados:[] };

function listenCol(col, key, cb) {
  const q = query(collection(db, col), orderBy("_ts", "desc"));
  onSnapshot(q, snap => {
    DB[key] = snap.docs.map(d => ({id: d.id, ...d.data()}));
    if (cb) cb();
  }, err => console.warn("Firestore ["+col+"]:", err));
}

function mostrarLogin(error) {
  var ov = document.getElementById('_login');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = '_login';
    ov.style.cssText = 'position:fixed;inset:0;background:#1a1a2e;display:flex;align-items:center;justify-content:center;z-index:99999';
    ov.innerHTML = '<div style="background:#fff;border-radius:16px;padding:36px 32px;width:320px;text-align:center">'
      + '<div style="font-size:22px;font-weight:800;color:#1a1a2e;margin-bottom:4px">&#11041; DEEJAY ACADEMY</div>'
      + '<div style="font-size:12px;color:#888;margin-bottom:24px">Sistema de gestion</div>'
      + '<input id="_lemail" type="email" placeholder="Correo electronico" style="width:100%;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;outline:none;margin-bottom:10px">'
      + '<input id="_lpwd" type="password" placeholder="Contrasena" style="width:100%;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:14px;outline:none;margin-bottom:12px">'
      + '<div id="_lerr" style="color:#b91c1c;font-size:12px;min-height:18px;margin-bottom:8px"></div>'
      + '<button onclick="doLogin()" style="width:100%;padding:11px;background:#e8c547;color:#1a1a2e;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Entrar</button>'
      + '</div>';
    document.body.appendChild(ov);
    document.getElementById('_lpwd').addEventListener('keydown', function(e){ if(e.key==='Enter') window.doLogin(); });
  }
  if (error) document.getElementById('_lerr').textContent = error;
  document.getElementById('_lemail').focus();
}

window.doLogin = async function() {
  var email = document.getElementById('_lemail').value.trim();
  var pwd = document.getElementById('_lpwd').value;
  if (!email || !pwd) { document.getElementById('_lerr').textContent = 'Ingresa email y contrasena.'; return; }
  try {
    await signInWithEmailAndPassword(auth, email, pwd);
  } catch(e) {
    document.getElementById('_lerr').textContent = 'Email o contrasena incorrectos.';
    document.getElementById('_lpwd').value = '';
  }
};

window.doLogout = async function() { await signOut(auth); };

async function obtenerRol(email) {
  try { var s = await getDoc(doc(db, 'roles', email)); return s.exists() ? s.data().rol : 'asistente'; }
  catch(e) { return 'asistente'; }
}

function aplicarRol(rol) {
  rolActual = rol;
  ['pagos','reporte','exportar'].forEach(function(id) {
    var el = document.querySelector('.ni[onclick*="\''+id+'\'"]');
    if (el) el.style.display = rol === 'admin' ? '' : 'none';
  });
  var sMes = document.getElementById('s-mes');
  var sPen = document.getElementById('s-pen');
  if (sMes) sMes.closest('.sc').style.display = rol === 'admin' ? '' : 'none';
  if (sPen) sPen.closest('.sc').style.display = rol === 'admin' ? '' : 'none';
  if (!document.getElementById('_logout_btn')) {
    var btn = document.createElement('button');
    btn.id = '_logout_btn'; btn.className = 'btn bo bsm';
    btn.textContent = 'Cerrar sesion'; btn.onclick = window.doLogout;
    document.getElementById('topbar-acts').appendChild(btn);
  }
}

function initApp() {
  listenCol("cursos", "cursos", function() {
    if (DB.cursos.length === 0) {
      fbSet("cursos","djpro",{nombre:"Mezclas DJ Pro",niveles:["Essential","Pro","DJ Master Pro"],desc:"Modulo de mezcla DJ profesional",inicio:"",fin:""});
      fbSet("cursos","prod", {nombre:"Produccion Musical",niveles:["Nivel 1","Nivel 2","Nivel 3","Nivel 4"],desc:"Produccion con Ableton Live",inicio:"",fin:""});
    }
    renderDash();
  });
  listenCol("alumnos",        "alumnos",        function(){ renderDash(); if(document.getElementById('page-alumnos').classList.contains('active')) renderAlumnos(); });
  listenCol("pagos",          "pagos",          function(){ renderDash(); if(document.getElementById('page-pagos').classList.contains('active')) renderPagos(); if(eAid) renderHistP(eAid); });
  listenCol("cuotas",         "cuotas",         function(){ renderDash(); updBadge(); if(eAid) renderCuotas(); });
  listenCol("asistencias",    "asistencias",    function(){ if(document.getElementById('page-asistencia').classList.contains('active')) renderAsistencia(); });
  listenCol("horario_grupos", "horario_grupos", function(){ if(document.getElementById('page-horarios_aulas').classList.contains('active')) window.renderHorariosPage(); });
}

window.addEventListener("DOMContentLoaded", function() {
  onAuthStateChanged(auth, async function(user) {
    if (user) {
      var ov = document.getElementById('_login'); if (ov) ov.remove();
      var rol = await obtenerRol(user.email);
      aplicarRol(rol);
      initApp();
    } else {
      var btn = document.getElementById('_logout_btn'); if (btn) btn.remove();
      mostrarLogin();
    }
  });
});

var eAid=null, ePid=null, eCid=null, foto=null;
var hMes=new Date().getMonth(), hCursoTab=null;
window.hMes=hMes; window.hCursoTab=hCursoTab;
var FRANJAS_H=["9-11 AM","11-1 PM","2-4 PM","4-6 PM","6-8 PM"];
var MESES_N=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
var HCOLORS=["#3b3210","#0f2d1a","#2d0f1f","#0a1f2d","#1a0f30","#2d1a08"];
var _selAlId=null, _selPagId=null;

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,5)}
function openM(id){document.getElementById(id).classList.add('show')}
function closeM(id){document.getElementById(id).classList.remove('show')}
window.closeM=closeM;

function gCN(mid,niv){var c=DB.cursos.find(function(x){return x.id===mid});if(!c)return'-';return niv?c.nombre+' - '+niv:c.nombre}
function gA(id){return DB.alumnos.find(function(x){return x.id===id})}
function gAN(id){var a=gA(id);return a?a.nombre:'-'}
function gAC(id){var a=gA(id);return a?gCN(a.moduloId,a.nivel):'-'}
function bdg(e){var m={Pagado:'bg',Pendiente:'by',Vencido:'br',Presente:'bg',Ausente:'br',Tardanza:'by'};return'<span class="bdg '+(m[e]||'bgr')+'">'+e+'</span>'}
function dR(f){if(!f)return null;return Math.ceil((new Date(f)-new Date())/864e5)}
function avEl(a,sz){sz=sz||30;if(a.foto)return'<img src="'+a.foto+'" style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;object-fit:cover">';var i=(a.nombre||'?').split(' ').slice(0,2).map(function(w){return w[0]}).join('').toUpperCase();return'<div class="avp" style="width:'+sz+'px;height:'+sz+'px;font-size:'+Math.floor(sz*.38)+'px">'+i+'</div>'}
function fmtF(d){if(!d)return'';var p=d.split('-');return p[2]+'/'+p[1]}
function updBadge(){var n=DB.cuotas.length;var b=document.getElementById('badge-al');if(b){if(n>0){b.textContent=n;b.style.display='inline'}else b.style.display='none'}}

function confirmDel(msg,cb){
  var ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999';
  ov.innerHTML='<div style="background:#fff;border-radius:12px;padding:24px;max-width:320px;width:90%;text-align:center">'
    +'<div style="font-size:14px;font-weight:500;margin-bottom:20px">'+msg+'</div>'
    +'<div style="display:flex;gap:10px;justify-content:center">'
    +'<button id="_cdn" style="padding:8px 20px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer;font-size:13px">Cancelar</button>'
    +'<button id="_cds" style="padding:8px 20px;border-radius:8px;border:none;background:#e8c547;color:#1a1a2e;cursor:pointer;font-size:13px;font-weight:600">Confirmar</button>'
    +'</div></div>';
  document.body.appendChild(ov);
  document.getElementById('_cdn').onclick=function(){ov.remove()};
  document.getElementById('_cds').onclick=function(){ov.remove();cb()};
}

function popCur(sid){var s=document.getElementById(sid);if(!s)return;var v=s.value;s.innerHTML='<option value="">Seleccionar...</option>';DB.cursos.forEach(function(c){s.innerHTML+='<option value="'+c.id+'">'+c.nombre+'</option>'});s.value=v}
function popAl(sid){var s=document.getElementById(sid);if(!s)return;var v=s.value;s.innerHTML='<option value="">Seleccionar alumno...</option>';DB.alumnos.forEach(function(a){s.innerHTML+='<option value="'+a.id+'">'+a.nombre+'</option>'});s.value=v}

window.updNiv=function(sel){
  var c=DB.cursos.find(function(x){return x.id===document.getElementById('f-mod').value});
  var s=document.getElementById('f-niv');
  s.innerHTML='<option value="">Seleccionar...</option>';
  if(c)(c.niveles||[]).forEach(function(n){s.innerHTML+='<option value="'+n+'">'+n+'</option>'});
  if(sel)s.value=sel;
}

window.prevFoto=function(ev){
  var f=ev.target.files[0];if(!f)return;
  var r=new FileReader();
  r.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var c=document.createElement('canvas'),w=img.width,h=img.height,mx=150;
      if(w>h){if(w>mx){h=h*mx/w;w=mx}}else{if(h>mx){w=w*mx/h;h=mx}}
      c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
      foto=c.toDataURL('image/jpeg',.7);
      var pi=document.getElementById('ph-img');pi.src=foto;pi.style.display='block';
      document.getElementById('ph-icon').style.display='none';
    };img.src=e.target.result;
  };r.readAsDataURL(f);
}

window.showPage=function(id,el){
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active')});
  document.querySelectorAll('.ni').forEach(function(n){n.classList.remove('active')});
  document.getElementById('page-'+id).classList.add('active');
  if(el)el.classList.add('active');
  var T={dashboard:'Dashboard',alertas:'Alertas',alumnos:'Alumnos',cursos:'Cursos',asistencia:'Asistencia',pagos:'Pagos',reporte:'Reportes',horarios_aulas:'Horarios por Cursos',exportar:'Exportar Base'};
  document.getElementById('page-title').textContent=T[id]||id;
  var ac=document.getElementById('topbar-acts');
  var logoutBtn=document.getElementById('_logout_btn');
  ac.innerHTML='';
  if(id==='alumnos')ac.innerHTML='<button class="btn bp bsm" onclick="openMAl()">+ Nuevo alumno</button>';
  if(id==='pagos')ac.innerHTML='<button class="btn bp bsm" onclick="openMPag()">+ Registrar pago</button>';
  if(id==='cursos')ac.innerHTML='<button class="btn bp bsm" onclick="openMCur()">+ Nuevo curso</button>';
  if(logoutBtn){ac.appendChild(logoutBtn)}
  else if(rolActual){
    var btn=document.createElement('button');btn.id='_logout_btn';btn.className='btn bo bsm';
    btn.textContent='Cerrar sesion';btn.onclick=window.doLogout;ac.appendChild(btn);
  }
  var fns={dashboard:renderDash,alertas:renderAlertas,alumnos:renderAlumnos,cursos:renderCursos,pagos:renderPagos,reporte:renderReporte,asistencia:renderAsistencia,horarios_aulas:window.initHorariosPage,exportar:function(){}};
  if(fns[id])fns[id]();
}

function renderDash(){
  var now=new Date(),m=now.getMonth(),y=now.getFullYear();
  var totM=DB.pagos.filter(function(p){if(!p.fecha||p.estado!=='Pagado')return false;var d=new Date(p.fecha);return d.getMonth()===m&&d.getFullYear()===y}).reduce(function(s,p){return s+p.monto},0);
  document.getElementById('s-act').textContent=DB.alumnos.length;
  document.getElementById('s-mes').textContent='$'+totM.toLocaleString('es-CO');
  document.getElementById('s-pen').textContent=DB.cuotas.length;
  document.getElementById('s-cur').textContent=DB.cursos.length;
  var meses=[];for(var i=5;i>=0;i--){var d=new Date(y,m-i,1);meses.push({lbl:d.toLocaleString('es-CO',{month:'short'}),m:d.getMonth(),y:d.getFullYear()})}
  var tots=meses.map(function(x){return DB.pagos.filter(function(p){if(!p.fecha||p.estado!=='Pagado')return false;var d=new Date(p.fecha);return d.getMonth()===x.m&&d.getFullYear()===x.y}).reduce(function(s,p){return s+p.monto},0)});
  var mx=Math.max.apply(null,tots.concat([1]));
  document.getElementById('chart').innerHTML=tots.every(function(t){return t===0})?'<div style="color:#aaa;font-size:13px;text-align:center;padding:20px">Sin abonos</div>':'<div class="cbw">'+meses.map(function(x,i){return'<div class="cbc"><div class="cbv">'+(tots[i]?'$'+Math.round(tots[i]/1000)+'k':'')+'</div><div class="cb" style="height:'+Math.max(4,Math.round(tots[i]/mx*90))+'px"></div><div class="cbl">'+x.lbl+'</div></div>'}).join('')+'</div>';
  var als=calcAlerts();
  document.getElementById('dash-al').innerHTML=!als.length?'<div style="color:#15803d;font-size:13px;text-align:center;padding:20px">Todos al dia!</div>':als.map(function(a){return'<div class="ai" style="background:#fee2e2;border-radius:6px;margin:4px 8px;padding:8px 10px"><span>!</span><span style="font-size:12px;color:#b91c1c;font-weight:600">'+a.t+'</span></div>'}).join('');
  document.getElementById('dash-rec').innerHTML=DB.alumnos.slice(0,4).map(function(a){return'<tr><td><div style="display:flex;align-items:center;gap:8px">'+avEl(a)+'<span>'+a.nombre+'</span></div></td><td>'+gCN(a.moduloId,a.nivel)+'</td><td>'+(a.ingreso||'-')+'</td><td>'+(a.fin||'-')+'</td></tr>'}).join('')||'<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px">Sin alumnos</td></tr>';
  updBadge();
  if(rolActual) aplicarRol(rolActual);
}

function calcAlerts(){
  var al=[];
  DB.cuotas.forEach(function(c){
    var a=gA(c.alumnoId);
    if(a){
      var dias=c.vencimiento?dR(c.vencimiento):null;
      var extra=dias!==null?(dias<=0?' - VENCIDA':dias<=7?' - vence en '+dias+' dias':''):'';
      al.push({t:a.nombre+' - $'+parseFloat(c.monto||0).toLocaleString('es-CO')+' ('+(c.descripcion||'Cuota')+')'+extra});
    }
  });
  return al;
}

function renderAlertas(){
  var als=calcAlerts();
  var el=document.getElementById('alertas-lista');
  if(!als.length){el.innerHTML='<div style="color:#15803d;font-size:14px;text-align:center;padding:30px">Todos al dia!</div>';return}
  el.innerHTML='<div style="padding:12px 14px;font-weight:600;font-size:13px;border-bottom:1px solid #f0f0f0">'+als.length+' alerta(s) pendientes</div>'+als.map(function(a){return'<div class="ai"><span style="color:#b91c1c;font-weight:500">'+a.t+'</span></div>'}).join('');
  updBadge();
}

window.openMAl=function(id){
  id=id||null;eAid=id;foto=null;
  document.getElementById('ph-img').style.display='none';document.getElementById('ph-icon').style.display='';
  document.getElementById('m-al-tit').textContent=id?'Editar alumno':'Nuevo alumno';
  popCur('f-mod');
  ['f-nom','f-ced','f-tel','f-ema','f-edad','f-ing','f-ini','f-fin','f-dir','f-ref','f-not'].forEach(function(k){var e=document.getElementById(k);if(e)e.value=''});
  document.getElementById('f-rh').value='';document.getElementById('f-niv').innerHTML='<option value="">Seleccionar...</option>';
  ['p2-per','p2-mon','p2-not'].forEach(function(k){document.getElementById(k).value=''});
  document.getElementById('p2-for').value='Efectivo';document.getElementById('p2-fec').value=new Date().toISOString().split('T')[0];
  document.getElementById('p2-hist').innerHTML='';document.getElementById('cuotas-lista').innerHTML='<div style="color:#aaa;font-size:12px;padding:6px">Sin cuotas pendientes.</div>';
  var now=new Date(),nm=now.toLocaleString('es-CO',{month:'long'});
  document.getElementById('p2-per').value=nm.charAt(0).toUpperCase()+nm.slice(1)+' '+now.getFullYear();
  if(id){
    var a=DB.alumnos.find(function(x){return x.id===id});
    if(a){
      var map={nom:'nombre',ced:'cedula',tel:'telefono',ema:'email',edad:'edad',rh:'rh',ing:'ingreso',ini:'inicio',fin:'fin',dir:'direccion',ref:'referencia',not:'notas'};
      Object.keys(map).forEach(function(k){var e=document.getElementById('f-'+k);if(e&&a[map[k]]!=null)e.value=a[map[k]]});
      document.getElementById('f-mod').value=a.moduloId||'';window.updNiv(a.nivel);
      if(a.foto){foto=a.foto;var img=document.getElementById('ph-img');img.src=foto;img.style.display='block';document.getElementById('ph-icon').style.display='none'}
      renderHistP(id);renderCuotas();
    }
  } else document.getElementById('f-ing').value=new Date().toISOString().split('T')[0];
  openM('m-alumno');
}

window.saveAlumno=async function(){
  var nom=document.getElementById('f-nom').value.trim(),tel=document.getElementById('f-tel').value.trim(),ced=document.getElementById('f-ced').value.trim();
  if(!nom||!tel||!ced){alert('Nombre, Cedula y Telefono son obligatorios.');return}
  var data={nombre:nom,cedula:ced,telefono:tel,email:document.getElementById('f-ema').value.trim(),edad:document.getElementById('f-edad').value,rh:document.getElementById('f-rh').value,ingreso:document.getElementById('f-ing').value,inicio:document.getElementById('f-ini').value,fin:document.getElementById('f-fin').value,moduloId:document.getElementById('f-mod').value,nivel:document.getElementById('f-niv').value,direccion:document.getElementById('f-dir').value.trim(),referencia:document.getElementById('f-ref').value.trim(),notas:document.getElementById('f-not').value.trim(),foto:foto||null};
  if(eAid){ await fbUpd('alumnos',eAid,data); }
  else { data.creado=new Date().toISOString().split('T')[0]; eAid=await fbAdd('alumnos',data); }
  var mon=parseFloat(document.getElementById('p2-mon').value);
  if(mon&&eAid){ await fbAdd('pagos',{alumnoId:eAid,periodo:document.getElementById('p2-per').value.trim(),forma:document.getElementById('p2-for').value,monto:mon,estado:'Pagado',fecha:document.getElementById('p2-fec').value,notas:document.getElementById('p2-not').value.trim(),creado:new Date().toISOString().split('T')[0]}); }
  closeM('m-alumno');
}

function renderAlumnos(){
  var q=(document.getElementById('q-al').value||'').toLowerCase(),fc=document.getElementById('f-cur').value;
  var sel=document.getElementById('f-cur'),pv=sel.value;sel.innerHTML='<option value="">Todos los cursos</option>';DB.cursos.forEach(function(c){sel.innerHTML+='<option value="'+c.id+'">'+c.nombre+'</option>'});sel.value=pv;
  var list=DB.alumnos.filter(function(a){if(q&&!a.nombre.toLowerCase().includes(q)&&!(a.cedula||'').includes(q))return false;if(fc&&a.moduloId!==fc)return false;return true});
  var tb=document.getElementById('t-al');
  if(!list.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:#aaa;padding:24px">Sin registros</td></tr>';return}
  tb.innerHTML=list.map(function(a){return'<tr style="cursor:pointer" onclick="selAlumno(\''+a.id+'\',\''+a.nombre.replace(/'/g,'')+'\')">'+'<td>'+avEl(a)+'</td>'+'<td><div style="font-weight:500">'+a.nombre+'</div><div style="font-size:11px;color:#888">CC: '+(a.cedula||'-')+'</div></td>'+'<td>'+(a.telefono||'-')+'</td>'+'<td>'+gCN(a.moduloId,a.nivel)+'</td>'+'<td style="font-size:12px">'+(a.inicio||'-')+'</td>'+'<td style="font-size:12px">'+(a.fin?'<span class="bdg '+(dR(a.fin)<=14?'br':'bgr')+'">'+a.fin+'</span>':'-')+'</td>'+'<td><span style="font-size:11px;color:#aaa">Acciones</span></td></tr>'}).join('');
}

window.selAlumno=function(aid,nom){_selAlId=aid;document.getElementById('al-panel-info').textContent=nom;document.getElementById('al-panel').style.display='block'}
window.closeAlPanel=function(){_selAlId=null;document.getElementById('al-panel').style.display='none'}
window.doAlVer=function(){var id=_selAlId;closeAlPanel();if(id)verAl(id)}
window.doAlEdit=function(){var id=_selAlId;closeAlPanel();if(id)openMAl(id)}
window.doAlDel=function(){
  if(!_selAlId)return;var aid=_selAlId;closeAlPanel();
  confirmDel('Eliminar este alumno y todos sus datos?',async function(){
    await fbDel('alumnos',aid);
    for(var p of DB.pagos.filter(function(x){return x.alumnoId===aid})) await fbDel('pagos',p.id);
    for(var c of DB.cuotas.filter(function(x){return x.alumnoId===aid})) await fbDel('cuotas',c.id);
  });
}

function verAl(id){
  var a=DB.alumnos.find(function(x){return x.id===id});if(!a)return;
  var pagos=DB.pagos.filter(function(p){return p.alumnoId===id}),cuotas=DB.cuotas.filter(function(c){return c.alumnoId===id});
  var tot=pagos.reduce(function(s,p){return s+p.monto},0),pen=cuotas.reduce(function(s,c){return s+(parseFloat(c.monto)||0)},0);
  document.getElementById('m-ver-body').innerHTML='<div style="display:flex;align-items:center;gap:16px;margin-bottom:18px">'+avEl(a,64)+'<div><div style="font-size:17px;font-weight:600">'+a.nombre+'</div><div style="font-size:13px;color:#888">'+gCN(a.moduloId,a.nivel)+'</div></div></div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:16px"><div><span style="color:#888">Cedula:</span> '+(a.cedula||'-')+'</div><div><span style="color:#888">Tel:</span> '+(a.telefono||'-')+'</div><div><span style="color:#888">Edad:</span> '+(a.edad?a.edad+' anos':'-')+'</div><div><span style="color:#888">RH:</span> '+(a.rh||'-')+'</div><div><span style="color:#888">Ingreso:</span> '+(a.ingreso||'-')+'</div><div><span style="color:#888">Email:</span> '+(a.email||'-')+'</div><div><span style="color:#888">Inicio:</span> '+(a.inicio||'-')+'</div><div><span style="color:#888">Fin:</span> '+(a.fin||'-')+'</div><div style="grid-column:1/-1"><span style="color:#888">Ref:</span> '+(a.referencia||'-')+'</div><div style="grid-column:1/-1"><span style="color:#888">Direccion:</span> '+(a.direccion||'-')+'</div>'+(a.notas?'<div style="grid-column:1/-1"><span style="color:#888">Notas:</span> '+a.notas+'</div>':'')+'</div>'
  +'<div style="display:flex;gap:10px;margin-bottom:10px"><div style="flex:1;background:#f0fdf4;border-radius:8px;padding:8px;text-align:center"><div style="font-size:10px;color:#15803d;font-weight:600">PAGADO</div><div style="font-size:16px;font-weight:700;color:#15803d">$'+tot.toLocaleString('es-CO')+'</div></div><div style="flex:1;background:#fee2e2;border-radius:8px;padding:8px;text-align:center"><div style="font-size:10px;color:#b91c1c;font-weight:600">PENDIENTE</div><div style="font-size:16px;font-weight:700;color:#b91c1c">$'+pen.toLocaleString('es-CO')+'</div></div></div>'
  +(pagos.length?'<div style="max-height:140px;overflow-y:auto;border:.5px solid #f0f0f0;border-radius:8px">'+pagos.map(function(p){return'<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-bottom:.5px solid #f5f5f5;font-size:12px"><div style="flex:1">'+(p.periodo||'-')+'</div><div style="font-weight:600">$'+(p.monto||0).toLocaleString('es-CO')+'</div>'+bdg(p.estado)+'<div style="color:#aaa">'+(p.fecha||'-')+'</div></div>'}).join('')+'</div>':'');
  openM('m-ver');
}

window.regPagAl=async function(){
  if(!eAid){alert('Guarda el alumno primero.');return}
  var mon=parseFloat(document.getElementById('p2-mon').value);if(!mon){alert('Ingresa el monto.');return}
  await fbAdd('pagos',{alumnoId:eAid,periodo:document.getElementById('p2-per').value.trim(),forma:document.getElementById('p2-for').value,monto:mon,estado:'Pagado',fecha:document.getElementById('p2-fec').value,notas:document.getElementById('p2-not').value.trim(),creado:new Date().toISOString().split('T')[0]});
  document.getElementById('p2-mon').value='';renderHistP(eAid);
}

function renderHistP(aid){
  var el=document.getElementById('p2-hist');if(!el)return;
  var pagos=DB.pagos.filter(function(p){return p.alumnoId===aid}),tot=pagos.reduce(function(s,p){return s+p.monto},0);
  var cuotas=DB.cuotas.filter(function(c){return c.alumnoId===aid}),pen=cuotas.reduce(function(s,c){return s+(parseFloat(c.monto)||0)},0);
  if(!pagos.length&&!cuotas.length){el.innerHTML='';return}
  el.innerHTML='<div style="display:flex;gap:10px;margin-bottom:10px"><div style="flex:1;background:#f0fdf4;border-radius:8px;padding:7px;text-align:center"><div style="font-size:10px;color:#15803d;font-weight:600">PAGADO</div><div style="font-size:14px;font-weight:700;color:#15803d">$'+tot.toLocaleString('es-CO')+'</div></div><div style="flex:1;background:#fee2e2;border-radius:8px;padding:7px;text-align:center"><div style="font-size:10px;color:#b91c1c;font-weight:600">PENDIENTE</div><div style="font-size:14px;font-weight:700;color:#b91c1c">$'+pen.toLocaleString('es-CO')+'</div></div></div>'
  +'<div style="max-height:180px;overflow-y:auto;border:.5px solid #f0f0f0;border-radius:8px">'+pagos.map(function(p){return'<div style="display:flex;align-items:center;gap:6px;padding:7px 10px;border-bottom:.5px solid #f5f5f5;font-size:12px"><div style="flex:1;font-weight:500">'+(p.periodo||'-')+'</div><div style="font-weight:600">$'+(p.monto||0).toLocaleString('es-CO')+'</div>'+bdg(p.estado)+'<button class="btn bd bsm" style="padding:3px 7px" onclick="delPagoHist(\''+p.id+'\')">X</button></div>'}).join('')+'</div>';
}

window.delPagoHist=function(id){confirmDel('Eliminar este abono?',async function(){await fbDel('pagos',id);if(eAid)renderHistP(eAid);})}
window.delPagoM=function(){if(!ePid)return;var pid=ePid;confirmDel('Eliminar este pago?',async function(){await fbDel('pagos',pid);closeM('m-pago');})}

var _nuevaCuota=null;

window.addCuota=function(){
  if(!eAid){alert('Guarda el alumno primero.');return}
  _nuevaCuota={descripcion:'',monto:'',vencimiento:'',forma:'Efectivo'};
  renderCuotas();
}

window.generarCuota=async function(){
  var desc=document.getElementById('_nc_desc').value.trim();
  var mon=parseFloat(document.getElementById('_nc_mon').value);
  var fec=document.getElementById('_nc_fec').value;
  var forma=document.getElementById('_nc_for').value;
  if(!desc){alert('Ingresa el concepto.');return}
  if(!mon){alert('Ingresa el monto.');return}
  if(!fec){alert('Ingresa la fecha de vencimiento.');return}
  await fbAdd('cuotas',{alumnoId:eAid,descripcion:desc,monto:mon,vencimiento:fec,forma:forma,creado:new Date().toISOString().split('T')[0]});
  _nuevaCuota=null;
  renderCuotas();
  renderHistP(eAid);
}

function renderCuotas(){
  var el=document.getElementById('cuotas-lista');if(!el)return;
  var cuotas=eAid?DB.cuotas.filter(function(c){return c.alumnoId===eAid}):[];
  var html='';
  if(_nuevaCuota){
    html+='<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:8px;padding:10px;margin-bottom:8px">';
    html+='<div style="font-size:11px;font-weight:600;color:#15803d;margin-bottom:8px">Nueva cuota pendiente</div>';
    html+='<div style="display:grid;grid-template-columns:1fr 100px;gap:6px;margin-bottom:6px">';
    html+='<input id="_nc_desc" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px" placeholder="Concepto / Descripcion">';
    html+='<input id="_nc_mon" type="number" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px" placeholder="Monto">';
    html+='</div>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">';
    html+='<div><div style="font-size:10px;color:#888;margin-bottom:2px">Fecha vencimiento</div>';
    html+='<input id="_nc_fec" type="date" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px;width:100%"></div>';
    html+='<div><div style="font-size:10px;color:#888;margin-bottom:2px">Forma de cobro</div>';
    html+='<select id="_nc_for" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px;width:100%">';
    html+='<option value="Efectivo">Efectivo</option><option value="Llave">Llave</option><option value="Tarjeta">Tarjeta</option>';
    html+='</select></div></div>';
    html+='<div style="display:flex;gap:6px;justify-content:flex-end">';
    html+='<button class="btn bo bsm" onclick="_nuevaCuota=null;renderCuotas()">Cancelar</button>';
    html+='<button class="btn bp bsm" onclick="generarCuota()">Generar alerta</button>';
    html+='</div></div>';
  }
  if(!cuotas.length&&!_nuevaCuota){
    html+='<div style="color:#aaa;font-size:12px;padding:6px">Sin cuotas pendientes.</div>';
  }
  cuotas.forEach(function(c){
    var dias=c.vencimiento?dR(c.vencimiento):null;
    var colV=dias===null?'#888':dias<=0?'#b91c1c':dias<=7?'#a16207':'#15803d';
    var txtV=dias===null?'Sin fecha':dias<=0?'VENCIDA hace '+Math.abs(dias)+' dia(s)':'Vence en '+dias+' dia(s)';
    html+='<div style="background:#fffdf0;border:1px solid #fde68a;border-radius:8px;padding:10px;margin-bottom:8px">';
   html+='<div style="display:grid;grid-template-columns:1fr 100px;gap:6px;margin-bottom:6px">';
   html+='<input id="_ec_desc_'+c.id+'" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px" placeholder="Concepto" value="'+(c.descripcion||'').replace(/"/g,'&quot;')+'">';
   html+='<input id="_ec_mon_'+c.id+'" type="number" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px" placeholder="Monto" value="'+(c.monto||'')+'">';
   html+='</div>';
html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">';
html+='<div><div style="font-size:10px;color:#888;margin-bottom:2px">Fecha vencimiento</div>';
html+='<input id="_ec_fec_'+c.id+'" type="date" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px;width:100%" value="'+(c.vencimiento||'')+'"></div>';
html+='<div><div style="font-size:10px;color:#888;margin-bottom:2px">Forma de cobro</div>';
html+='<select id="_ec_for_'+c.id+'" style="font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;border-radius:6px;width:100%">';
html+='<option value="Efectivo" '+(c.forma==='Efectivo'?'selected':'')+'>Efectivo</option>';
html+='<option value="Llave" '+(c.forma==='Llave'?'selected':'')+'>Llave</option>';
html+='<option value="Tarjeta" '+(c.forma==='Tarjeta'?'selected':'')+'>Tarjeta</option>';
html+='</select></div></div>';
html+='<div style="display:flex;align-items:center;justify-content:space-between">';
html+='<span style="font-size:11px;font-weight:600;color:'+colV+'">'+txtV+'</span>';
html+='<div style="display:flex;gap:6px">';
html+='<button class="btn bp bsm" onclick="guardarCuotaEdit(\''+c.id+'\',document.getElementById(\'_ec_desc_'+c.id+'\').value,document.getElementById(\'_ec_mon_'+c.id+'\').value,document.getElementById(\'_ec_fec_'+c.id+'\').value,document.getElementById(\'_ec_for_'+c.id+'\').value)">Guardar</button>';
html+='<button class="btn bs bsm" data-cid="'+c.id+'" onclick="cobrarCuota(this.dataset.cid)">Cobrar</button>';
html+='<button class="btn bd bsm" data-cid="'+c.id+'" onclick="delCuota(this.dataset.cid)">Eliminar</button>';
html+='</div></div></div>';
  });
  el.innerHTML=html;
}

window.updCuota=async function(id,f,v){await fbUpd('cuotas',id,{[f]:v})}
window.guardarCuotaEdit = async function(id, desc, mon, fec, forma) {
  desc = (desc||'').trim();
  mon  = parseFloat(mon);
  if (!desc) { alert('Ingresa el concepto.'); return; }
  if (!mon)  { alert('Ingresa el monto.'); return; }
  await fbUpd('cuotas', id, { descripcion: desc, monto: mon, vencimiento: fec, forma: forma });
  // Actualizar DB local manualmente
  var idx = DB.cuotas.findIndex(function(c){ return c.id === id; });
  if (idx >= 0) {
    DB.cuotas[idx].descripcion = desc;
    DB.cuotas[idx].monto = mon;
    DB.cuotas[idx].vencimiento = fec;
    DB.cuotas[idx].forma = forma;
  }
  renderCuotas();
  renderHistP(eAid);
}

window.delCuota=function(id){
  confirmDel('Eliminar esta cuota pendiente?',async function(){
    await fbDel('cuotas',id);
    if(eAid)renderHistP(eAid);
  });
}

window.cobrarCuota=function(id){
  var c=DB.cuotas.find(function(x){return x.id===id});
  if(!c)return;
  if(!parseFloat(c.monto)){alert('Ingresa el monto antes de cobrar.');return}
  var desc=c.descripcion||'Cuota';
  var m=parseFloat(c.monto).toLocaleString('es-CO');
  confirmDel('Confirmar cobro de $'+m+' por: '+desc,async function(){
    var hoy=new Date().toISOString().split('T')[0];
    await fbAdd('pagos',{alumnoId:c.alumnoId,periodo:desc,forma:c.forma||'Efectivo',monto:parseFloat(c.monto),estado:'Pagado',fecha:hoy,creado:hoy});
    await fbDel('cuotas',id);
    if(c.alumnoId)renderHistP(c.alumnoId);
  });
}

var ctab='lista';
window.swCT=function(tab,el){ctab=tab;document.querySelectorAll('#page-cursos .tab').forEach(function(t){t.classList.remove('active')});el.classList.add('active');document.getElementById('ct-lista').style.display=tab==='lista'?'block':'none';document.getElementById('ct-gantt').style.display=tab==='gantt'?'block':'none';if(tab==='gantt')renderGantt();else renderCursos()}

window.openMCur=function(id){
  id=id||null;eCid=id;
  document.getElementById('mc-tit').textContent=id?'Editar curso':'Nuevo curso';
  ['mc-nom','mc-niv','mc-des','mc-ini','mc-fin'].forEach(function(k){document.getElementById(k).value=''});
  if(id){var c=DB.cursos.find(function(x){return x.id===id});if(c){document.getElementById('mc-nom').value=c.nombre||'';document.getElementById('mc-niv').value=(c.niveles||[]).join(', ');document.getElementById('mc-des').value=c.desc||'';document.getElementById('mc-ini').value=c.inicio||'';document.getElementById('mc-fin').value=c.fin||''}}
  document.getElementById('mc-btn').onclick=id?function(){updCurso(id)}:saveCurso;
  openM('m-curso');
}

window.saveCurso=async function(){
  var nom=document.getElementById('mc-nom').value.trim();if(!nom){alert('Nombre requerido.');return}
  var niv=document.getElementById('mc-niv').value.trim();
  await fbAdd('cursos',{nombre:nom,niveles:niv?niv.split(',').map(function(n){return n.trim()}).filter(Boolean):[],desc:document.getElementById('mc-des').value.trim(),inicio:document.getElementById('mc-ini').value,fin:document.getElementById('mc-fin').value});
  closeM('m-curso');
}

async function updCurso(id){
  var nom=document.getElementById('mc-nom').value.trim();if(!nom){alert('Nombre requerido.');return}
  var niv=document.getElementById('mc-niv').value.trim();
  await fbUpd('cursos',id,{nombre:nom,niveles:niv?niv.split(',').map(function(n){return n.trim()}).filter(Boolean):[],desc:document.getElementById('mc-des').value.trim(),inicio:document.getElementById('mc-ini').value,fin:document.getElementById('mc-fin').value});
  closeM('m-curso');
}

window.delCurso=function(id){confirmDel('Eliminar este curso?',async function(){await fbDel('cursos',id)})}

function renderCursos(){var el=document.getElementById('cursos-lista');if(!el)return;if(!DB.cursos.length){el.innerHTML='<p style="color:#aaa;padding:20px">Sin cursos.</p>';return}el.innerHTML=DB.cursos.map(function(c){var cnt=DB.alumnos.filter(function(a){return a.moduloId===c.id}).length;return'<div class="cc"><div style="display:flex;justify-content:space-between;gap:10px"><div><h4 style="margin-bottom:4px">'+c.nombre+'</h4>'+(c.desc?'<div style="font-size:12px;color:#888;margin-bottom:6px">'+c.desc+'</div>':'')+'<div class="ll">'+(c.niveles||[]).map(function(n){return'<span class="bdg bb">'+n+'</span>'}).join('')+'</div><div style="font-size:11px;color:#888;margin-top:6px">'+cnt+' alumno(s)</div></div><div style="display:flex;gap:6px;flex-shrink:0"><button class="btn bo bsm" onclick="openMCur(\''+c.id+'\')">Editar</button><button class="btn bd bsm" onclick="delCurso(\''+c.id+'\')">X</button></div></div></div>'}).join('')}

function renderGantt(){var el=document.getElementById('gantt-c');var cf=DB.cursos.filter(function(c){return c.inicio&&c.fin});if(!cf.length){el.innerHTML='<div style="color:#aaa;padding:20px;text-align:center">Agrega fechas a los cursos.</div>';return}var minD=new Date(Math.min.apply(null,cf.map(function(c){return new Date(c.inicio)}))),maxD=new Date(Math.max.apply(null,cf.map(function(c){return new Date(c.fin)})));var total=maxD-minD||1;el.innerHTML=cf.map(function(c){var s=(new Date(c.inicio)-minD)/total*100,w=(new Date(c.fin)-new Date(c.inicio))/total*100;return'<div style="margin-bottom:10px"><div style="font-size:12px;font-weight:500;margin-bottom:4px">'+c.nombre+'</div><div style="background:#f0f0f0;border-radius:4px;height:24px;position:relative"><div style="position:absolute;left:'+s+'%;width:'+Math.max(w,2)+'%;background:#e8c547;height:100%;border-radius:4px;display:flex;align-items:center;padding:0 6px;font-size:11px;font-weight:600;color:#1a1a2e;overflow:hidden;white-space:nowrap">'+c.nombre+'</div></div></div>'}).join('')}

window.openMPag=function(id){
  id=id||null;ePid=id;popAl('mp-al');
  document.getElementById('mp-fec').value=new Date().toISOString().split('T')[0];
  ['mp-per','mp-mon','mp-not'].forEach(function(k){document.getElementById(k).value=''});
  document.getElementById('mp-for').value='Efectivo';document.getElementById('mp-est').value='Pagado';
  document.getElementById('mp-del').style.display='none';
  if(id){var p=DB.pagos.find(function(x){return x.id===id});if(p){document.getElementById('mp-al').value=p.alumnoId;document.getElementById('mp-per').value=p.periodo||'';document.getElementById('mp-for').value=p.forma||'Efectivo';document.getElementById('mp-mon').value=p.monto||'';document.getElementById('mp-est').value=p.estado||'Pagado';document.getElementById('mp-fec').value=p.fecha||'';document.getElementById('mp-not').value=p.notas||'';document.getElementById('mp-del').style.display='inline-block'}}
  openM('m-pago');
}

window.savePago=async function(){
  var aid=document.getElementById('mp-al').value,mon=parseFloat(document.getElementById('mp-mon').value);
  if(!aid||!mon){alert('Alumno y monto requeridos.');return}
  var data={alumnoId:aid,periodo:document.getElementById('mp-per').value.trim(),forma:document.getElementById('mp-for').value,monto:mon,estado:document.getElementById('mp-est').value,fecha:document.getElementById('mp-fec').value,notas:document.getElementById('mp-not').value.trim()};
  if(ePid){await fbUpd('pagos',ePid,data)}
  else{data.creado=new Date().toISOString().split('T')[0];await fbAdd('pagos',data)}
  closeM('m-pago');
}

window.selPago=function(pid,nom){_selPagId=pid;document.getElementById('pag-panel-info').textContent=nom;document.getElementById('pag-panel').style.display='block'}
window.closePagPanel=function(){_selPagId=null;document.getElementById('pag-panel').style.display='none'}
window.doPagEdit=function(){var id=_selPagId;closePagPanel();if(id)openMPag(id)}
window.doPagDel=function(){if(!_selPagId)return;var pid=_selPagId;closePagPanel();confirmDel('Eliminar este pago?',async function(){await fbDel('pagos',pid)})}

function renderPagos(){var q=(document.getElementById('q-pag').value||'').toLowerCase(),fe=document.getElementById('f-epag').value;var list=DB.pagos.filter(function(p){if(fe&&p.estado!==fe)return false;if(q){var nom=gAN(p.alumnoId).toLowerCase();if(!nom.includes(q)&&!(p.periodo||'').toLowerCase().includes(q))return false}return true});document.getElementById('t-pag').innerHTML=list.map(function(p){return'<tr style="cursor:pointer" onclick="selPago(\''+p.id+'\',\''+gAN(p.alumnoId).replace(/'/g,'')+'\')">'+'<td>'+gAN(p.alumnoId)+'</td><td>'+gAC(p.alumnoId)+'</td><td>'+(p.periodo||'-')+'</td><td>'+(p.forma||'-')+'</td><td>$'+(p.monto||0).toLocaleString('es-CO')+'</td><td>'+bdg(p.estado)+'</td><td>'+(p.fecha||'-')+'</td><td><span style="font-size:11px;color:#aaa">ver</span></td></tr>'}).join('')||'<tr><td colspan="8" style="text-align:center;color:#aaa;padding:20px">Sin registros</td></tr>'}

window.openMAsist=function(){popAl('ma-al');document.getElementById('ma-fec').value=new Date().toISOString().split('T')[0];document.getElementById('ma-not').value='';openM('m-asist')}
window.saveAsist=async function(){
  var aid=document.getElementById('ma-al').value;if(!aid){alert('Selecciona un alumno.');return}
  await fbAdd('asistencias',{alumnoId:aid,fecha:document.getElementById('ma-fec').value,estado:document.getElementById('ma-est').value,notes:document.getElementById('ma-not').value.trim()});
  closeM('m-asist');renderAsistencia();
}
window.delAsist=async function(id){await fbDel('asistencias',id);renderAsistencia()}

function renderAsistencia(){var fAl=document.getElementById('q-asist-al').value,fF=document.getElementById('q-asist-f').value;var s=document.getElementById('q-asist-al'),pv=s.value;s.innerHTML='<option value="">Todos</option>';DB.alumnos.forEach(function(a){s.innerHTML+='<option value="'+a.id+'">'+a.nombre+'</option>'});s.value=pv;var list=DB.asistencias.filter(function(x){if(fAl&&x.alumnoId!==fAl)return false;if(fF&&x.fecha!==fF)return false;return true});document.getElementById('t-asist').innerHTML=list.map(function(x){return'<tr><td>'+gAN(x.alumnoId)+'</td><td>'+gAC(x.alumnoId)+'</td><td>'+(x.fecha||'-')+'</td><td>'+bdg(x.estado)+'</td><td>'+(x.notes||'-')+'</td><td><button class="btn bd bsm" onclick="delAsist(\''+x.id+'\')">X</button></td></tr>'}).join('')||'<tr><td colspan="6" style="text-align:center;color:#aaa;padding:20px">Sin registros</td></tr>'}

function renderReporte(){var fAl=document.getElementById('r-al').value,fCur=document.getElementById('r-cur').value,fEst=document.getElementById('r-est').value,fMes=document.getElementById('r-mes').value;var sa=document.getElementById('r-al'),pva=sa.value;sa.innerHTML='<option value="">Todos los alumnos</option>';DB.alumnos.forEach(function(a){sa.innerHTML+='<option value="'+a.id+'">'+a.nombre+'</option>'});sa.value=pva;var sc=document.getElementById('r-cur'),pvc=sc.value;sc.innerHTML='<option value="">Todos los cursos</option>';DB.cursos.forEach(function(c){sc.innerHTML+='<option value="'+c.id+'">'+c.nombre+'</option>'});sc.value=pvc;var list=DB.pagos.filter(function(p){if(fAl&&p.alumnoId!==fAl)return false;if(fCur){var a=gA(p.alumnoId);if(!a||a.moduloId!==fCur)return false}if(fEst&&p.estado!==fEst)return false;if(fMes&&p.fecha&&p.fecha.slice(0,7)!==fMes)return false;return true});var rev=list.filter(function(p){return p.estado==='Pagado'}).reduce(function(s,p){return s+p.monto},0);var pen=DB.cuotas.reduce(function(s,c){return s+parseFloat(c.monto||0)},0);document.getElementById('r-tot').textContent='$'+rev.toLocaleString('es-CO');document.getElementById('r-pen').textContent='$'+pen.toLocaleString('es-CO');document.getElementById('r-cnt').textContent=list.length;document.getElementById('t-rep').innerHTML=list.map(function(p){return'<tr><td>'+gAN(p.alumnoId)+'</td><td>'+gAC(p.alumnoId)+'</td><td>'+(p.periodo||'-')+'</td><td>'+(p.forma||'-')+'</td><td>$'+(p.monto||0).toLocaleString('es-CO')+'</td><td>'+bdg(p.estado)+'</td><td>'+(p.fecha||'-')+'</td></tr>'}).join('')||'<tr><td colspan="7" style="text-align:center;color:#aaa;padding:20px">Sin registros</td></tr>'}
window.printRep=function(){var t=document.getElementById('rep-wrap');var w=window.open('','_blank');w.document.write('<!DOCTYPE html><html><head><title>Reporte</title><style>body{font-family:system-ui;font-size:13px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd;text-align:left}th{background:#f0f0f0}</style></head><body><h2>Reporte Financiero - Deejay Academy</h2>'+t.innerHTML+'</body></html>');w.document.close();w.print()}

window.initHorariosPage=function(){
  if(!window.hCursoTab&&DB.cursos.length) window.hCursoTab=DB.cursos[0].id;
  window.renderHorariosPage();
}

window.renderHorariosPage=function(){
  if(!window.hCursoTab&&DB.cursos.length) window.hCursoTab=DB.cursos[0].id;
  var mesAct=window.hMes, cursoAct=window.hCursoTab;
  var curso=DB.cursos.find(function(c){return c.id===cursoAct});
  var niveles=curso?(curso.niveles||[]):[];
  var fIni=curso&&curso['fechas_mes_'+mesAct+'_inicio']||'';
  var fFin=curso&&curso['fechas_mes_'+mesAct+'_fin']||'';
  var mesOpts=MESES_N.map(function(m,i){return'<option value="'+i+'" '+(i==mesAct?'selected':'')+'>'+m.toUpperCase()+'</option>'}).join('');
  var tabs=DB.cursos.map(function(c){var act=c.id===cursoAct;return'<button onclick="window.hCursoTab=\''+c.id+'\';window.renderHorariosPage()" style="padding:6px 16px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;border:none;background:'+(act?'#e8c547':'#1f2937')+';color:'+(act?'#111':'#9ca3af')+'">'+c.nombre+'</button>'}).join('');
  var gridHtml='';
  if(!niveles.length){
    gridHtml='<div style="color:#6b7280;text-align:center;padding:40px">Este curso no tiene niveles.</div>';
  } else {
    var ths=niveles.map(function(n,i){return'<th style="min-width:160px;padding:0 4px 8px 4px"><div style="background:'+HCOLORS[i%HCOLORS.length]+';border-radius:10px;padding:10px 8px;text-align:center;font-size:15px;font-weight:800;color:#fff">'+n+'</div></th>'}).join('');
    var rows=FRANJAS_H.map(function(fr){
      var tds=niveles.map(function(n,ni){
        var bg=HCOLORS[ni%HCOLORS.length];
        var grupos=DB.horario_grupos.filter(function(g){return g.franja===fr&&g.cursoId===cursoAct&&g.nivel===n&&String(g.mes)===String(mesAct)});
        var cards=grupos.map(function(g){
          var noms=(g.alumnos||[]).map(function(aid){return gAN(aid)}).filter(function(x){return x&&x!=='-'}).join('<br>');
          return'<div onclick="window.editGrupo(\''+g.id+'\')" style="border-radius:10px;padding:8px 10px;margin-bottom:6px;position:relative;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.15);cursor:pointer">'
            +'<button onclick="event.stopPropagation();window.delGrupo(\''+g.id+'\')" style="position:absolute;top:4px;right:4px;background:#c0392b;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;color:#fff;line-height:18px;text-align:center;padding:0">x</button>'
            +(g.instructor?'<div style="font-size:11px;font-weight:700;color:#e8c547;background:rgba(0,0,0,.3);border-radius:5px;padding:2px 7px;display:inline-block;margin-bottom:5px">'+g.instructor+'</div>':'')
            +'<div style="color:#e5e7eb;font-size:12px;line-height:1.7">'+(noms||'<span style="color:#6b7280;font-size:11px">Sin alumnos</span>')+'</div>'
            +(g.fechaIni&&g.fechaFin?'<div style="font-size:10px;font-weight:700;color:#f87171;margin-top:5px">'+fmtF(g.fechaIni)+' - '+fmtF(g.fechaFin)+'</div>':'')
            +'</div>';
        }).join('');
        return'<td style="background:'+bg+';border-radius:10px;padding:7px;vertical-align:top;min-height:90px">'+cards+'<div onclick="window.openGrupoModal(\''+cursoAct+'\',\''+n+'\',\''+fr+'\')" style="border:1.5px dashed rgba(255,255,255,.25);border-radius:8px;padding:7px;text-align:center;cursor:pointer;font-size:12px;color:rgba(255,255,255,.35);margin-top:3px">+ grupo</div></td>';
      }).join('');
      return'<tr><td style="color:#9ca3af;font-size:12px;font-weight:600;vertical-align:top;padding:12px 10px 0 2px;white-space:nowrap;width:75px">'+fr+'</td>'+tds+'</tr>';
    }).join('');
    gridHtml='<div style="color:#e8c547;font-size:13px;font-weight:700;margin-bottom:10px;letter-spacing:1px">'+MESES_N[mesAct].toUpperCase()+'</div>'
      +'<div style="overflow-x:auto"><table style="border-collapse:separate;border-spacing:5px;width:100%"><thead><tr><th style="width:75px"></th>'+ths+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
  }
  document.getElementById('horarios-root').innerHTML=
    '<div style="background:#111827;border-radius:14px;padding:16px;min-height:500px">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">'
    +'<select onchange="window.hMes=parseInt(this.value);window.renderHorariosPage()" style="background:#1f2937;color:#fff;border:1px solid #374151;border-radius:8px;padding:6px 12px;font-size:13px;outline:none;font-family:inherit">'+mesOpts+'</select>'
    +'<span style="color:#9ca3af;font-size:12px;margin-left:6px">inicia</span>'
    +'<input type="date" value="'+fIni+'" onchange="window.setCursoFecha(\'inicio\',this.value)" style="background:#1f2937;color:#fff;border:1px solid #374151;border-radius:8px;padding:6px 10px;font-size:13px;outline:none;width:140px">'
    +'<span style="color:#9ca3af;font-size:12px">termina</span>'
    +'<input type="date" value="'+fFin+'" onchange="window.setCursoFecha(\'fin\',this.value)" style="background:#1f2937;color:#fff;border:1px solid #374151;border-radius:8px;padding:6px 10px;font-size:13px;outline:none;width:140px">'
    +'</div>'
    +'<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:14px">'+tabs+'</div>'
    +gridHtml+'</div>';
}

window.setCursoFecha=async function(campo,val){
  if(!window.hCursoTab)return;
  await fbUpd('cursos',window.hCursoTab,{['fechas_mes_'+window.hMes+'_'+campo]:val});
}

window.openGrupoModal=function(cursoId,nivel,franja){
  var tmp=document.getElementById('_hm');if(tmp)tmp.remove();
  var curso=DB.cursos.find(function(c){return c.id===cursoId});
  var alOpts=DB.alumnos.filter(function(a){return a.moduloId===cursoId}).map(function(a){return'<option value="'+a.id+'">'+a.nombre+'</option>'}).join('');
  var ov=document.createElement('div');ov.className='ov show';ov.id='_hm';
  ov.innerHTML='<div class="modal" style="max-width:420px"><div class="mh"><h3>'+nivel+' - '+franja+'</h3><button class="btn bo bsm" onclick="document.getElementById(\'_hm\').remove()">X</button></div><div class="mb"><div class="fg" style="grid-template-columns:1fr"><div class="fgp"><label>Instructor</label><input id="_hi" placeholder="Nombre del instructor"></div><div class="fgp"><label>Alumnos (Ctrl+clic para varios)</label><select id="_has" multiple style="min-height:90px">'+(alOpts||'<option disabled>Sin alumnos en este curso</option>')+'</select></div><div class="fg" style="grid-template-columns:1fr 1fr"><div class="fgp"><label>Fecha inicio</label><input type="date" id="_hfi" value="'+(curso&&curso.inicio||'')+'"></div><div class="fgp"><label>Fecha fin</label><input type="date" id="_hff" value="'+(curso&&curso.fin||'')+'"></div></div></div></div><div class="mf"><button class="btn bo" onclick="document.getElementById(\'_hm\').remove()">Cancelar</button><button class="btn bp" onclick="window.saveGrupo(\''+cursoId+'\',\''+nivel+'\',\''+franja+'\')">Guardar</button></div></div>';
  document.body.appendChild(ov);
}

window.saveGrupo=async function(cursoId,nivel,franja){
  var inst=document.getElementById('_hi').value.trim();
  var sel=document.getElementById('_has');
  var als=sel?Array.from(sel.selectedOptions).map(function(o){return o.value}):[];
  var fi2=document.getElementById('_hfi').value,ff=document.getElementById('_hff').value;
  await fbAdd('horario_grupos',{cursoId:cursoId,nivel:nivel,franja:franja,mes:window.hMes,instructor:inst,alumnos:als,fechaIni:fi2,fechaFin:ff});
  var t=document.getElementById('_hm');if(t)t.remove();window.renderHorariosPage();
}

window.delGrupo=async function(id){await fbDel('horario_grupos',id);window.renderHorariosPage()}

window.editGrupo=function(id){
  var g=DB.horario_grupos.find(function(x){return x.id===id});if(!g)return;
  var tmp=document.getElementById('_hm');if(tmp)tmp.remove();
  var alOpts=DB.alumnos.filter(function(a){return a.moduloId===g.cursoId}).map(function(a){return'<option value="'+a.id+'" '+((g.alumnos||[]).indexOf(a.id)>=0?'selected':'')+'>'+a.nombre+'</option>'}).join('');
  var ov=document.createElement('div');ov.className='ov show';ov.id='_hm';
  ov.innerHTML='<div class="modal" style="max-width:420px"><div class="mh"><h3>'+g.nivel+' - '+g.franja+'</h3><button class="btn bo bsm" onclick="document.getElementById(\'_hm\').remove()">X</button></div><div class="mb"><div class="fg" style="grid-template-columns:1fr"><div class="fgp"><label>Instructor</label><input id="_hi" value="'+(g.instructor||'')+'"></div><div class="fgp"><label>Alumnos</label><select id="_has" multiple style="min-height:90px">'+(alOpts||'<option disabled>Sin alumnos</option>')+'</select></div><div class="fg" style="grid-template-columns:1fr 1fr"><div class="fgp"><label>Fecha inicio</label><input type="date" id="_hfi" value="'+(g.fechaIni||'')+'"></div><div class="fgp"><label>Fecha fin</label><input type="date" id="_hff" value="'+(g.fechaFin||'')+'"></div></div></div></div><div class="mf"><button class="btn bd" onclick="window.delGrupo(\''+id+'\');document.getElementById(\'_hm\').remove()" style="margin-right:auto">Eliminar</button><button class="btn bo" onclick="document.getElementById(\'_hm\').remove()">Cancelar</button><button class="btn bp" onclick="window.updGrupo(\''+id+'\')">Guardar</button></div></div>';
  document.body.appendChild(ov);
}

window.updGrupo=async function(id){
  var sel=document.getElementById('_has');
  await fbUpd('horario_grupos',id,{instructor:document.getElementById('_hi').value.trim(),alumnos:sel?Array.from(sel.selectedOptions).map(function(o){return o.value}):[],fechaIni:document.getElementById('_hfi').value,fechaFin:document.getElementById('_hff').value});
  var t=document.getElementById('_hm');if(t)t.remove();window.renderHorariosPage();
}

function toCSV(r,h){var e=function(v){return'"'+String(v||'').replace(/"/g,'""')+'"'};return[h.map(e).join(',')].concat(r.map(function(x){return h.map(function(k){return e(x[k])}).join(',')})).join('\n')}
function dlCSV(c,f){var a=document.createElement('a');a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(c);a.download=f;a.click()}
window.expAlCSV=function(){dlCSV(toCSV(DB.alumnos.map(function(a){return{Nombre:a.nombre,Cedula:a.cedula,Celular:a.telefono,Programa:gCN(a.moduloId,a.nivel),Fecha_Ingreso:a.ingreso}}),['Nombre','Cedula','Celular','Programa','Fecha_Ingreso']),'Base_Alumnos_Deejay_Academy.csv')}
window.expPagCSV=function(){dlCSV(toCSV(DB.pagos.map(function(p){return{Alumno:gAN(p.alumnoId),Curso:gAC(p.alumnoId),Periodo:p.periodo,Forma:p.forma,Monto:p.monto,Estado:p.estado,Fecha:p.fecha}}),['Alumno','Curso','Periodo','Forma','Monto','Estado','Fecha']),'Reporte_Flujo_Caja.csv')}

window.expJSON=function(){
  var backup={_version:1,_fecha:new Date().toISOString(),alumnos:DB.alumnos,pagos:DB.pagos,cuotas:DB.cuotas,asistencias:DB.asistencias,cursos:DB.cursos,horario_grupos:DB.horario_grupos};
  var blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='DJA_Backup_'+new Date().toISOString().split('T')[0]+'.json';
  a.click();
}

window.impJSON=function(){
  var input=document.createElement('input');input.type='file';input.accept='.json';
  input.onchange=function(e){
    var file=e.target.files[0];if(!file)return;
    var reader=new FileReader();
    reader.onload=function(ev){
      try{
        var data=JSON.parse(ev.target.result);
        if(!data.alumnos&&!data.cursos){alert('Archivo no valido.');return}
        var total=(data.alumnos||[]).length+(data.pagos||[]).length+(data.cuotas||[]).length+(data.asistencias||[]).length+(data.cursos||[]).length+(data.horario_grupos||[]).length;
        if(!confirm('Importar '+total+' registros? Los existentes NO se eliminan.'))return;
        importarJSON(data);
      }catch(err){alert('Error: '+err.message);}
    };reader.readAsText(file);
  };input.click();
}

async function importarJSON(data){
  var el=document.getElementById('_imp_status');if(el)el.textContent='Importando...';
  var cols=['cursos','alumnos','pagos','cuotas','asistencias','horario_grupos'];
  var total=0,done=0;
  cols.forEach(function(c){total+=(data[c]||[]).length});
  for(var ci=0;ci<cols.length;ci++){
    var col=cols[ci],rows=data[col]||[];
    for(var i=0;i<rows.length;i++){
      var row=Object.assign({},rows[i]),id=row.id;delete row.id;delete row._ts;
      try{if(id)await fbSet(col,id,row);else await fbAdd(col,row);}catch(err){console.warn('Error importando '+col,err);}
      done++;if(el)el.textContent='Importando... '+done+'/'+total;
    }
  }
  if(el)el.innerHTML='<span style="color:#15803d;font-weight:600">OK - '+done+' registros importados</span>';
}
