import {timingSafeEqual} from 'node:crypto';

export function hostingGuard({secret=process.env.CHESSLAB_BACKEND_SECRET,publicOrigin=process.env.PUBLIC_ORIGIN}={}) {
  if (secret || publicOrigin) {
    if (!/^[a-f0-9]{64}$/.test(secret||'') || !publicOrigin || new URL(publicOrigin).protocol !== 'https:' || new URL(publicOrigin).origin !== publicOrigin) throw new Error('Hosted access requires a 32-byte secret and a canonical HTTPS PUBLIC_ORIGIN.');
  }
  return (req,res,next)=>{
    if (!secret) return next();
    const supplied=req.get('x-chesslab-backend-key')||'';
    if(!/^[a-f0-9]{64}$/.test(supplied) || !timingSafeEqual(Buffer.from(supplied),Buffer.from(secret))) return res.status(403).json({error:'Private backend.'});
    next();
  };
}
