const json=(error,status)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});

export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if(!['GET','POST'].includes(request.method)) return json('Method not allowed.',405);
    if(request.method==='POST') {
      if(request.headers.get('origin')!==url.origin || request.headers.get('sec-fetch-site')==='cross-site') return json('Cross-origin changes are not allowed.',403);
      if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json('Use JSON for this request.',415);
    }
    if(!env.CHESSLAB_BACKEND_URL||!env.CHESSLAB_BACKEND_SECRET) return json('Chess server is not connected.',503);
    const backend=new URL(env.CHESSLAB_BACKEND_URL);
    if(backend.protocol!=='https:' || backend.username || backend.password) return json('Chess server configuration is invalid.',503);
    backend.pathname=url.pathname;backend.search=url.search;
    const headers=new Headers({'X-ChessLab-Backend-Key':env.CHESSLAB_BACKEND_SECRET,'Origin':url.origin,'Accept':'application/json'});
    // Forward only the application session, never the private Sites account cookies.
    const session=/(?:^|;\s*)chesslab_session=([a-f0-9]{64})(?:;|$)/.exec(request.headers.get('cookie')||'');
    if(session) headers.set('Cookie',`chesslab_session=${session[1]}`);
    if(request.method==='POST') headers.set('Content-Type','application/json');
    try {
      let body;
      if(request.method==='POST') {
        const reader=request.body?.getReader(),chunks=[];
        let size=0;
        if(reader) while(true) {
          const {done,value}=await reader.read();
          if(done) break;
          size+=value.byteLength;
          if(size>262144) {await reader.cancel();return json('Request is too large.',413);}
          chunks.push(value);
        }
        body=new Uint8Array(size);
        let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
      }
      const response=await fetch(backend,{method:request.method,headers,body,redirect:'manual',signal:AbortSignal.any([request.signal,AbortSignal.timeout(190000)])});
      if(response.status>=300&&response.status<400) return json('Chess server returned an unexpected redirect.',502);
      const resultHeaders=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      for(const name of ['content-type','content-disposition','set-cookie']) if(response.headers.has(name)) resultHeaders.set(name,response.headers.get(name));
      return new Response(response.body,{status:response.status,headers:resultHeaders});
    } catch {return json('Chess server is reconnecting. Your saved games are retained.',503);}
  }
};
