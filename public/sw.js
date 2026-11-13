const SHELL='wb-shell-v1',API='wb-api-v1',ST='wb-state';
const HOSTS=['api.openweathermap.org','api.open-meteo.com','geocoding-api.open-meteo.com'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>c.addAll(['./','./manifest.webmanifest','./icon-192.png'])));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>![SHELL,API,ST].includes(x)).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(HOSTS.includes(u.hostname)){e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(API).then(c=>c.put(r,cp));return res}).catch(()=>caches.match(r)));return}
 if(u.origin===location.origin){e.respondWith(caches.open(SHELL).then(async c=>{const hit=await c.match(r);
  const net=fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res}).catch(()=>hit||(r.mode==='navigate'?c.match('./'):Response.error()));return hit||net}))}});
const load=async()=>{const r=await (await caches.open(ST)).match('s');return r?r.json():null};
const save=async s=>(await caches.open(ST)).put('s',new Response(JSON.stringify(s)));
async function check(){const s=await load();if(!s||!s.on||Notification.permission!=='granted')return;
 const n=new Date(),[h,m]=s.time.split(':'),t=new Date(n);t.setHours(+h,+m,0,0);const day=n.toDateString();
 if(n<t||s.last===day)return;s.last=day;await save(s);
 let body='Open WeatherBoard to check today’s weather.';
 try{const j=await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lon}&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`)).json();
  body=`${s.city}: ${Math.round(j.current.temperature_2m)}°C now, high ${Math.round(j.daily.temperature_2m_max[0])}°, low ${Math.round(j.daily.temperature_2m_min[0])}°`}catch{}
 await self.registration.showNotification('Good morning ☀️',{body,icon:'icon-192.png',tag:'daily'})}
self.addEventListener('message',e=>{e.waitUntil((async()=>{if(e.data.type==='state'){const o=await load(),s=e.data.s;s.last=o&&o.time===s.time?o.last:undefined;await save(s)}await check()})())});
self.addEventListener('periodicsync',e=>{if(e.tag==='daily-weather')e.waitUntil(check())});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window'}).then(l=>l[0]?l[0].focus():clients.openWindow('./')))});
