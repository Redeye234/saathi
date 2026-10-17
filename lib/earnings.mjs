export function indiaDate(date = new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
export function summarize(entries, start='', end='9999-12-31') {
 const selected=entries.filter(e=>e.date>=start && e.date<=end);
 const income=selected.filter(e=>e.kind==='income').reduce((s,e)=>s+e.amount,0);
 const expenses=selected.filter(e=>e.kind==='expense').reduce((s,e)=>s+e.amount,0);
 return {income,expenses,net:income-expenses,count:selected.length};
}
export function csvExport(entries) {
 const escape=v=>'"'+String(v).replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
 return '\ufeffDate,Type,Amount INR,Description\r\n'+entries.map(e=>[e.date,e.kind,e.amount,e.note].map(escape).join(',')).join('\r\n');
}
