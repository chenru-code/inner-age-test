import { env } from "cloudflare:workers";
import { clearFailures, cookie, ipKey, isRateLimited, recordFailure, sessionCookie, sha256, signSession } from "../../lib/security";

const DAY = 86_400_000;
export async function POST(request: Request) {
 try {
  const secret=env.ADMIN_SECRET||"",limiter=await ipKey(request,secret,"invite");
  if(await isRateLimited(env.DB,limiter))return Response.json({valid:false,message:"尝试次数过多，请稍后再试"},{status:429,headers:{"Retry-After":"900","Cache-Control":"no-store"}});
  const{code}=await request.json() as{code?:string},normalized=String(code||"").trim().toUpperCase();
  if(!normalized)return Response.json({valid:false,message:"请输入邀请码"},{status:400});
  if(normalized==="MIND2026")return Response.json({valid:false,message:"体验邀请码已停用，请使用购买后获得的邀请码"},{status:410});
  if(!/^MIND-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(normalized)){await recordFailure(env.DB,limiter,10,900_000,900_000);return Response.json({valid:false,message:"邀请码格式不正确"},{status:400});}
  let device=cookie(request,"ia_device");if(!device)device=crypto.randomUUID()+crypto.randomUUID();
  const deviceHash=await sha256(device),now=Date.now();
  const active=await env.DB.prepare(`UPDATE invite_codes SET activated_at=COALESCE(activated_at, ?), expires_at=COALESCE(expires_at, ?), device_hash=COALESCE(device_hash, ?), usage_count=usage_count+1 WHERE code=? AND (expires_at IS NULL OR expires_at>=?) AND (device_hash IS NULL OR device_hash=?) RETURNING expires_at`).bind(now,now+DAY,deviceHash,normalized,now,deviceHash).first<{expires_at:number}>();
  if(!active){const found=await env.DB.prepare("SELECT expires_at, device_hash FROM invite_codes WHERE code=?").bind(normalized).first<{expires_at:number|null;device_hash:string|null}>();await recordFailure(env.DB,limiter,10,900_000,900_000);const message=!found?"邀请码不存在，请向购买渠道确认":found.expires_at&&found.expires_at<now?"邀请码已超过 24 小时有效期":"该邀请码已绑定其他设备";return Response.json({valid:false,message},{status:!found?404:403,headers:{"Cache-Control":"no-store"}});}
  await clearFailures(env.DB,limiter);const seconds=Math.max(1,Math.floor((active.expires_at-now)/1000));const token=await signSession({scope:"test",code:normalized,deviceHash,exp:active.expires_at},secret);const headers=new Headers({"Cache-Control":"no-store"});headers.append("Set-Cookie",sessionCookie("ia_device",device,seconds));headers.append("Set-Cookie",sessionCookie("ia_session",token,seconds));return Response.json({valid:true,expiresAt:active.expires_at,remainingSeconds:seconds},{headers});
 }catch{return Response.json({valid:false,message:"验证服务暂时繁忙，请稍后重试"},{status:503,headers:{"Retry-After":"1","Cache-Control":"no-store"}})}
}
