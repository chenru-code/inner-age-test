const encoder=new TextEncoder();
const b64=bytes=>{let s="";bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")};
const fromB64=value=>{const p=value.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((value.length+3)%4);return Uint8Array.from(atob(p),c=>c.charCodeAt(0))};
export async function sha256(value){return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(value))),b=>b.toString(16).padStart(2,"0")).join("")}
async function signature(body,secret){const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return b64(new Uint8Array(await crypto.subtle.sign("HMAC",key,encoder.encode(body))))}
export async function signSession(payload,secret){const body=b64(encoder.encode(JSON.stringify(payload)));return`${body}.${await signature(body,secret)}`}
export async function verifySession(token,secret){if(!token||!secret)return null;const parts=token.split(".");if(parts.length!==2)return null;const expected=await signature(parts[0],secret);if(expected.length!==parts[1].length)return null;let bad=0;for(let i=0;i<expected.length;i++)bad|=expected.charCodeAt(i)^parts[1].charCodeAt(i);if(bad)return null;try{const value=JSON.parse(new TextDecoder().decode(fromB64(parts[0])));return value.exp>=Date.now()?value:null}catch{return null}}
export function cookies(request){return Object.fromEntries((request.headers.get("cookie")||"").split(";").filter(Boolean).map(v=>{const[k,...r]=v.trim().split("=");return[k,decodeURIComponent(r.join("="))]}))}
export function setCookie(name,value,maxAge){return`${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${Math.max(0,Math.floor(maxAge))}; HttpOnly; Secure; SameSite=Strict`}
export function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",...headers}})}
export async function readJson(kv,key,fallback=null){try{const value=await kv.get(key,{type:"json"});return value??fallback}catch{return fallback}}
export async function writeJson(kv,key,value){await kv.put(key,JSON.stringify(value))}
export async function codeKey(code){return`invite_${await sha256(code)}`}
export async function ipKey(request,secret,scope){const ip=request.headers.get("EO-Connecting-IP")||request.headers.get("X-Forwarded-For")?.split(",")[0]||"unknown";return`limit_${scope}_${await sha256(`${secret}:${ip}`)}`}
export async function limited(kv,key){const row=await readJson(kv,key);return Boolean(row?.blockedUntil>Date.now())}
export async function fail(kv,key,max,windowMs,blockMs){const now=Date.now(),old=await readJson(kv,key),fresh=!old||old.windowStart<now-windowMs,row=fresh?{attempts:1,windowStart:now}:{...old,attempts:old.attempts+1};if(row.attempts>=max)row.blockedUntil=now+blockMs;await writeJson(kv,key,row)}
export async function clearFail(kv,key){await kv.put(key,JSON.stringify({attempts:0,windowStart:Date.now(),blockedUntil:0}))}
export async function audit(kv,request,secret,action,detail=""){const ip=request.headers.get("EO-Connecting-IP")||request.headers.get("X-Forwarded-For")?.split(",")[0]||"unknown",logs=await readJson(kv,"audit_logs",[]);logs.unshift({action,detail:String(detail).slice(0,200),actorHash:await sha256(`${secret}:${ip}`),created_at:Date.now()});await writeJson(kv,"audit_logs",logs.slice(0,100))}
export function methodNotAllowed(){return json({message:"Method not allowed"},405,{Allow:"GET, POST, DELETE"})}
