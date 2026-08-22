const WEDDING_TARGET = new Date("2027-04-17T15:00:00-03:00");

function initEnvelopeOpening(){
  const opening = document.querySelector("#openingScreen");
  const card = document.querySelector("#editorialInvite");
  const content = document.querySelector("#pageContent");
  const music = document.querySelector("#weddingMusic");
  const bow = document.querySelector("#openInviteBtn");
  if(!opening || !card || !content || !bow) return;

  let opened = false;
  let startY = null;
  let dragY = 0;

  const finishOpen = async () => {
    if(opened) return;
    opened = true;
    bow.classList.remove("is-dragging");
    bow.style.transform = "translateX(-50%)";
    bow.classList.add("is-untied");

    setTimeout(() => card.classList.add("is-opening"), 150);
    setTimeout(() => {
      card.classList.add("is-open");
      content.classList.remove("is-blurred");
      sessionStorage.setItem("inviteOpenedV3","1");
    }, 520);
    setTimeout(() => opening.classList.add("is-hidden"), 1050);

    try{
      if(music){music.volume=.22;await music.play();setMusicState(true)}
    }catch{}
  };

  bow.addEventListener("click", finishOpen);
  bow.addEventListener("pointerdown", e => {
    if(opened) return;
    startY = e.clientY;
    dragY = 0;
    bow.classList.add("is-dragging");
    try{bow.setPointerCapture(e.pointerId)}catch{}
  });
  bow.addEventListener("pointermove", e => {
    if(startY === null || opened) return;
    dragY = Math.max(0, Math.min(72, e.clientY - startY));
    bow.style.transform = `translate(-50%, ${dragY}px) scale(${1 - dragY/900})`;
    card.style.transform = `translateY(${dragY*.08}px) rotateX(${dragY*.025}deg)`;
    if(dragY >= 56) finishOpen();
  });
  const release = () => {
    if(startY === null || opened) return;
    startY = null;
    bow.classList.remove("is-dragging");
    bow.style.transform = "translateX(-50%)";
    card.style.transform = "";
  };
  bow.addEventListener("pointerup", release);
  bow.addEventListener("pointercancel", release);

  if(sessionStorage.getItem("inviteOpenedV3")==="1"){
    opening.classList.add("is-hidden");
    content.classList.remove("is-blurred");
  }
}
function setMusicState(playing){
  const toggle=document.querySelector("#musicToggle");
  const label=document.querySelector("#musicLabel");
  toggle.classList.toggle("is-playing",playing);
  label.textContent=playing?"Pausar":"Música";
}
function initMusic(){
  const music=document.querySelector("#weddingMusic");
  const toggle=document.querySelector("#musicToggle");
  toggle.addEventListener("click",async()=>{
    if(music.paused){try{music.volume=.22;await music.play();setMusicState(true)}catch{}}
    else{music.pause();setMusicState(false)}
  });
}
function updateCountdown(){
  let diff=WEDDING_TARGET-new Date(); if(diff<0) diff=0;
  const d=Math.floor(diff/86400000), h=Math.floor((diff%86400000)/3600000), m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
  document.querySelector("#countDays").textContent=String(d).padStart(3,"0");
  document.querySelector("#countHours").textContent=String(h).padStart(2,"0");
  document.querySelector("#countMinutes").textContent=String(m).padStart(2,"0");
  document.querySelector("#countSeconds").textContent=String(s).padStart(2,"0");
}
function initReveal(){
  const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add("is-visible")}),{threshold:.12});
  document.querySelectorAll(".reveal").forEach(el=>obs.observe(el));
}
const API = "https://eaovmjvqbfsztowwlnbb.supabase.co";
const KEY = "sb_publishable_thY9QO7y6FLOIa2x9ACiHg_WtaewdNv";
const PIX_KEY = "82987125101";
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const $ = (s) => document.querySelector(s);
let photos = [], photoIndex = 0, photoTimer = null, gifts = [], selectedGift = null, reservation = null;
async function rpc(name, body = {}) {
  const r = await fetch(`${API}/rest/v1/rpc/${name}`, {method:"POST",headers:H,body:JSON.stringify(body),cache:"no-store"});
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.message || data?.hint || "Não foi possível concluir agora.");
  return data;
}
async function loadPhotos() {
  try {
    const r = await fetch(`${API}/rest/v1/wedding_photos?select=id,storage_path,alt_text,created_at&is_active=eq.true&order=position.asc,created_at.asc`, {headers:H,cache:"no-store"});
    if (!r.ok) throw new Error();
    const rows = await r.json();
    photos = rows.map(x => ({url:`${API}/storage/v1/object/public/wedding-photos/${x.storage_path.split("/").map(encodeURIComponent).join("/")}?v=${x.id}`,alt:x.alt_text}));
    if (!photos.length) { $("#photoLoading").textContent = "As fotos aparecerão aqui em breve."; return; }
    $("#photoLoading").classList.add("hidden"); $("#carousel").classList.remove("hidden"); showPhoto(0); startPhotos();
  } catch { $("#photoLoading").textContent = "Não foi possível carregar as fotos agora."; }
}
function renderDots(){
  const wrap=$("#carouselDots"); wrap.innerHTML="";
  photos.forEach((_,i)=>{const b=document.createElement("button");b.className=i===photoIndex?"active":"";b.type="button";b.addEventListener("click",()=>{showPhoto(i);startPhotos()});wrap.appendChild(b)});
}
function showPhoto(i){
  if(!photos.length)return; photoIndex=(i+photos.length)%photos.length; const p=photos[photoIndex],img=$("#carouselImage"),pre=new Image();
  img.classList.add("fade"); pre.onload=()=>{img.src=p.url;img.alt=p.alt||"Foto de Lucas e Shayane";$("#carouselCounter").textContent=`${photoIndex+1} / ${photos.length}`;requestAnimationFrame(()=>img.classList.remove("fade"))};pre.src=p.url;renderDots();
}
function startPhotos(){clearInterval(photoTimer);if(photos.length>1)photoTimer=setInterval(()=>showPhoto(photoIndex+1),3200)}
function initRsvp(){
  $("#rsvpForm").addEventListener("submit",async e=>{
    e.preventDefault();const b=$("#submitBtn"),m=$("#formMessage");b.disabled=true;b.textContent="Confirmando...";m.textContent="";
    try{const d=await rpc("wedding_confirm_presence",{p_name:$("#name").value.trim(),p_phone:$("#phone").value.trim()||null});const result=Array.isArray(d)?d[0]:d;$("#ticketNumber").textContent=result.number;$("#ticket").classList.remove("hidden");m.textContent=result.existing?"Sua presença já estava confirmada.":"Presença confirmada com sucesso!";$("#ticket").scrollIntoView({behavior:"smooth",block:"center"})}
    catch(err){m.textContent=err.message}finally{b.disabled=false;b.textContent="Confirmar presença"}
  });
}
function money(value,currency="BRL"){if(value==null)return"Preço em sincronização";return new Intl.NumberFormat("pt-BR",{style:"currency",currency}).format(Number(value))}
async function syncGifts(){try{await fetch(`${API}/functions/v1/ml-sync-gifts`,{cache:"no-store"})}catch{}}
async function loadGifts(){
  $("#giftStatus").textContent="Atualizando lista...";
  try{gifts=await rpc("wedding_public_gifts",{});renderGifts();$("#giftStatus").textContent=gifts.length?"":"Todos os presentes da lista já foram escolhidos. ❤️"}
  catch{$("#giftStatus").textContent="Não foi possível carregar a lista agora."}
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function renderGifts(){
  const grid=$("#giftGrid");grid.innerHTML="";
  gifts.forEach(g=>{const card=document.createElement("article");card.className="gift-card"+(g.status==="reserved"?" gift-reserved":"");card.innerHTML=`<div class="gift-image">${g.image_url?`<img src="${g.image_url}" alt="">`:`<div class="placeholder">L&S</div>`}</div><div class="gift-body"><span class="gift-badge">Mercado Livre</span><h3>${escapeHtml(g.title||"Presente especial")}</h3><p class="gift-price">${money(g.current_price,g.currency)}</p><button class="btn btn-secondary" ${g.status==="reserved"?"disabled":""}>${g.status==="reserved"?"Reservado":"Escolher presente"}</button></div>`;card.querySelector("button")?.addEventListener("click",()=>openGift(g));grid.appendChild(card)});
}
function openGift(g){selectedGift=g;reservation=null;$("#modalTitle").textContent=g.title||"Presente especial";$("#modalPrice").textContent=money(g.current_price,g.currency);$("#giftGuestName").value=$("#name").value||"";$("#giftGuestNumber").value=$("#ticketNumber").textContent!=="—"?$("#ticketNumber").textContent:"";$("#reserveMessage").textContent="";$("#copyPixMessage").textContent="";$("#pixCopyCode").value="";$("#reserveStep").classList.remove("hidden");$("#pixStep").classList.add("hidden");$("#mlStep").classList.add("hidden");$("#giftModal").classList.remove("hidden")}
function closeModal(){$("#giftModal").classList.add("hidden")}
function initModalEvents(){
  $("#modalClose").addEventListener("click",closeModal);$("#giftModal").addEventListener("click",e=>{if(e.target.id==="giftModal")closeModal()});$("#chooseMl").addEventListener("click",()=>reserve("mercado_livre"));$("#choosePix").addEventListener("click",()=>reserve("pix"));$("#confirmPix").addEventListener("click",completeGift);$("#confirmMl").addEventListener("click",completeGift);$("#copyPixCode").addEventListener("click",copyPixCode);
}
async function reserve(method){
  const name=$("#giftGuestName").value.trim(),num=Number($("#giftGuestNumber").value),msg=$("#reserveMessage");msg.textContent="";if(!name||!num){msg.textContent="Informe seu nome e a senha do convite.";return}
  try{const d=await rpc("wedding_reserve_gift",{p_gift_id:selectedGift.id,p_guest_name:name,p_guest_number:num,p_method:method});reservation=Array.isArray(d)?d[0]:d;if(method==="mercado_livre"){window.open(reservation.affiliate_url,"_blank","noopener");$("#reserveStep").classList.add("hidden");$("#mlStep").classList.remove("hidden")}else{if(reservation.price==null)throw new Error("Preço ainda não sincronizado.");const payload=buildPixPayload(PIX_KEY,Number(reservation.price),"Lucas e Shayane","MACEIO");$("#pixAmount").textContent=money(reservation.price,reservation.currency);$("#pixCopyCode").value=payload;$("#reserveStep").classList.add("hidden");$("#pixStep").classList.remove("hidden")}await loadGifts()}catch(e){msg.textContent=e.message}
}
async function copyPixCode(){const field=$("#pixCopyCode"),message=$("#copyPixMessage");try{await navigator.clipboard.writeText(field.value);message.textContent="Código PIX copiado com sucesso."}catch{field.select();document.execCommand("copy");message.textContent="Código PIX copiado."}}
async function completeGift(){if(!reservation)return;const num=Number($("#giftGuestNumber").value);try{await rpc("wedding_complete_gift",{p_token:reservation.reservation_token,p_guest_number:num});closeModal();await loadGifts()}catch(e){alert(e.message)}}
function tlv(id,val){const s=String(val);return id+String(new TextEncoder().encode(s).length).padStart(2,"0")+s}
function crc16(str){let crc=0xFFFF;for(const b of new TextEncoder().encode(str)){crc^=b<<8;for(let i=0;i<8;i++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xFFFF:(crc<<1)&0xFFFF}return crc.toString(16).toUpperCase().padStart(4,"0")}
function buildPixPayload(key,amount,name,city){const mai=tlv("00","br.gov.bcb.pix")+tlv("01",key);let p=tlv("00","01")+tlv("26",mai)+tlv("52","0000")+tlv("53","986")+tlv("54",amount.toFixed(2))+tlv("58","BR")+tlv("59",name.substring(0,25).toUpperCase())+tlv("60",city.substring(0,15).toUpperCase())+tlv("62",tlv("05","***"));p+="6304";return p+crc16(p)}
(async function init(){initEnvelopeOpening();initMusic();initReveal();updateCountdown();setInterval(updateCountdown,1000);initRsvp();initModalEvents();await loadPhotos();await syncGifts();await loadGifts()})();
