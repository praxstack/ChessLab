// Named collections of saved games. Validation shared by the server and the browser app.
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
export const MAX_COLLECTIONS=100;
export function collectionDetails(body){
 if(typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>80||/[\u0000-\u001f\u007f]/.test(body.name))fail(400,'Use a collection name of 1–80 characters.');
 if(body.description!==undefined&&(typeof body.description!=='string'||body.description.length>1000))fail(400,'Keep the description under 1000 characters.');
 return {name:body.name.trim(),description:(body.description||'').trim()};
}
export function checkCollectionRevision(c,body){if(!Number.isInteger(body.revision)||c.revision!==body.revision)fail(409,'This collection changed. Refresh the library and try again.');}
// The distinct games named in an add or remove request.
export function collectionSelection(body){
 const {gameIds,present}=body;
 if(!Array.isArray(gameIds)||!gameIds.length||gameIds.length>500||gameIds.some(id=>typeof id!=='string'||id.length>80)||typeof present!=='boolean')fail(400,'Select 1–500 saved games and an add or remove action.');
 return {ids:[...new Set(gameIds)],present};
}
