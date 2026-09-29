'use strict';
const $=id=>document.getElementById(id);
let names=[];
async function api(path,options){const r=await fetch(path,options);const data=await r.json();if(!r.ok)throw Error(data.error||'连接失败');return data;}
function showNames(){
 const term=$('name-search').value.trim();const current=$('student-select').value;
 const found=names.filter(x=>x.name.includes(term));
 const options=[new Option('请选择姓名',''),...found.map(x=>new Option(x.name+(x.manual?'（手动加入）':''),x.id))];
 $('student-select').replaceChildren(...options);
 if(found.some(x=>x.id===current))$('student-select').value=current;
 preview();
}
function preview(){const cls=$('class-select').value;const id=$('student-select').value;const s=names.find(x=>x.id===id);const manual=$('manual-toggle').checked?$('manual-name').value.trim():'';$('identity-preview').textContent=cls&&(s||manual)?`${cls}班 · ${s?.name||manual}`:'请选择班级与姓名';}
async function loadClasses(){
 try{const data=await api('/api/classes');$('class-select').innerHTML='<option value="">请选择班级</option>'+data.classes.map(x=>`<option value="${x}">${x}班</option>`).join('');}
 catch(e){$('login-error').textContent='暂时无法连接课堂服务，请告知老师。';}
}
$('class-select').addEventListener('change',async()=>{
 names=[];$('student-select').innerHTML='<option value="">正在载入名单…</option>';$('name-search').value='';preview();
 const cls=$('class-select').value;if(!cls){$('student-select').innerHTML='<option value="">先选班级</option>';return;}
 try{names=await api(`/api/roster?class=${encodeURIComponent(cls)}`);showNames();$('login-error').textContent='';}
 catch(e){$('login-error').textContent=e.message;}
});
$('name-search').addEventListener('input',showNames);
$('student-select').addEventListener('change',preview);
$('manual-toggle').addEventListener('change',()=>{const enabled=$('manual-toggle').checked;$('manual-field').hidden=!enabled;$('student-select').disabled=enabled;preview();});
$('manual-name').addEventListener('input',preview);
$('login-form').addEventListener('submit',async event=>{
 event.preventDefault();$('login-error').textContent='';
 const classId=$('class-select').value,manual=$('manual-toggle').checked;
 const body={classId};if(manual)body.name=$('manual-name').value.trim();else body.id=$('student-select').value;
 if(!classId||!(manual?body.name:body.id)){$('login-error').textContent='请选择班级与姓名。';return;}
 const button=$('login-form').querySelector('button[type=submit]');button.disabled=true;
 try{const data=await api('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});localStorage.setItem('festival-current',JSON.stringify(data.student));location.href='/game';}
 catch(e){$('login-error').textContent=e.message;button.disabled=false;}
});
loadClasses();
