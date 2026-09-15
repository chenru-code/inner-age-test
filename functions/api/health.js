import{json,readJson}from"../lib/security.js";
export async function onRequestGet(){const started=Date.now();try{await readJson(INNER_AGE_KV,"health_probe",{});return json({status:"ok",database:"ok",latencyMs:Date.now()-started})}catch{return json({status:"degraded",database:"unavailable"},503)}}
