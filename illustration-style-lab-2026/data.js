window.__loadTextParts=async function(prefix,count){const files=Array.from({length:count},(_,i)=>prefix+String(i+1).padStart(2,'0')+'.part');const rows=await Promise.all(files.map(f=>fetch(f).then(r=>{if(!r.ok)throw new Error(f+' '+r.status);return r.text();})));return rows.join('');};
window.__styleDataReady=window.__loadTextParts('chunks/data-',4).then(code=>(0,eval)(code));
