'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const os=require('node:os');
const {DatabaseSync}=require('node:sqlite');
const rules=require('./game-rules.cjs');
const quiz=require('./quiz-bank.cjs');

const classIds=['501','502','503','504'];
function isTeacherAddress(ip){return ip==='127.0.0.1'||ip==='::1'||ip==='::ffff:127.0.0.1';}
function isPrivateLanAddress(ip){return /^10\./.test(ip)||/^192\.168\./.test(ip)||/^172\.(1[6-9]|2\d|3[01])\./.test(ip);}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
function redirect(res,target){res.writeHead(302,{Location:target,'Cache-Control':'no-store'});res.end();}
async function readBody(req){
 let data='';for await(const chunk of req){data+=chunk;if(Buffer.byteLength(data)>1024*1024)throw Error('提交内容过大');}
 try{return JSON.parse(data||'{}');}catch{throw Error('提交格式不正确');}
}
function createApp(options={}){
 const dataDir=options.dataDir||process.env.DATA_DIR||path.join(__dirname,'runtime');
 fs.mkdirSync(dataDir,{recursive:true});
 const rosterPath=options.rosterPath||process.env.ROSTER_FILE||path.join(__dirname,'roster.private.json');
 if(!fs.existsSync(rosterPath))throw Error(`没有找到五年级名单：${rosterPath}。请按 README 导入名单。`);
 const roster=JSON.parse(fs.readFileSync(rosterPath,'utf8'));
 if(!Array.isArray(roster)||roster.some(s=>!classIds.includes(s.classId)||!s.id||!s.name))throw Error('名单格式或年级不正确');
 const db=new DatabaseSync(path.join(dataDir,'classroom.sqlite'));
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
 CREATE TABLE IF NOT EXISTS students(id TEXT PRIMARY KEY,class_id TEXT NOT NULL,name TEXT NOT NULL,manual INTEGER NOT NULL DEFAULT 0,entered INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,sid TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS records(sid TEXT PRIMARY KEY,payload TEXT NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS awards(sid TEXT NOT NULL,stage TEXT NOT NULL,points INTEGER NOT NULL,completed INTEGER NOT NULL,PRIMARY KEY(sid,stage));
 CREATE TABLE IF NOT EXISTS events(sid TEXT NOT NULL,event_id TEXT NOT NULL,PRIMARY KEY(sid,event_id));
 CREATE TABLE IF NOT EXISTS quiz_attempts(id TEXT PRIMARY KEY,sid TEXT NOT NULL,form TEXT NOT NULL,answers TEXT NOT NULL,status TEXT NOT NULL,score INTEGER,results TEXT,created INTEGER NOT NULL,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS exit_attempts(id TEXT PRIMARY KEY,sid TEXT NOT NULL,answers TEXT NOT NULL,score INTEGER NOT NULL,results TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_quiz_sid ON quiz_attempts(sid,created);`);
 const add=db.prepare('INSERT OR IGNORE INTO students(id,class_id,name,manual,entered,created) VALUES(?,?,?,0,0,?)');
 for(const s of roster)add.run(String(s.id),String(s.classId),String(s.name),Date.now());
 function auth(req){
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('festival_student='))?.slice('festival_student='.length);
  const row=token&&db.prepare('SELECT sid FROM sessions WHERE token=? AND expires>?').get(token,Date.now());
  return row?.sid||null;
 }
 function student(sid){return db.prepare('SELECT id,class_id classId,name,manual,entered FROM students WHERE id=?').get(sid);}
 function state(sid){return JSON.parse(db.prepare('SELECT payload FROM records WHERE sid=?').get(sid)?.payload||JSON.stringify(rules.initialState()));}
 function awards(sid){return db.prepare('SELECT stage,points,completed FROM awards WHERE sid=? ORDER BY completed').all(sid);}
 function view(sid){const a=awards(sid);return {student:student(sid),state:state(sid),awards:a,points:a.reduce((sum,x)=>sum+x.points,0),updated:db.prepare('SELECT updated FROM records WHERE sid=?').get(sid)?.updated||null};}
 function latestQuiz(sid){return db.prepare('SELECT * FROM quiz_attempts WHERE sid=? ORDER BY created DESC LIMIT 1').get(sid);}
 function publicAttempt(a){return a&&{id:a.id,form:a.form,answers:JSON.parse(a.answers),status:a.status,score:a.score,results:a.results?JSON.parse(a.results):null,created:a.created};}
 function teacherClass(classId){
  const students=db.prepare('SELECT id FROM students WHERE class_id=? ORDER BY manual,name').all(classId).map(({id})=>{
   const v=view(id),attempts=db.prepare('SELECT form,status,score,created FROM quiz_attempts WHERE sid=? ORDER BY created').all(id);
   const exits=db.prepare('SELECT score,created,results FROM exit_attempts WHERE sid=? ORDER BY created').all(id).map(x=>({...x,results:JSON.parse(x.results)}));
   return {...v,quiz:attempts,exit:exits};
  });
  return {classId,at:Date.now(),students};
 }
 const allowedFiles=new Map([
  ['/page-guide.js','page-guide.js'],['/page-guide.css','page-guide.css'],
  ['/','login.html'],['/login.js','login.js'],['/game','game.html'],['/game.js','game.js'],['/gallery-model.cjs','gallery-model.cjs'],['/gallery-ui.js','gallery-ui.js'],['/game-rules.cjs','game-rules.cjs'],['/walk-map.cjs','walk-map.cjs'],['/walk.js','walk.js'],['/vendor/easystar.js','vendor/easystarjs/easystar-0.4.4.min.js'],['/game.css','game.css'],['/teacher','teacher.html'],['/teacher.js','teacher.js'],['/quiz','quiz.html'],['/quiz.js','quiz.js'],['/demo','demo.html'],['/demo.js','demo.js']
 ]);
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try{
   const url=new URL(req.url,'http://localhost'),p=url.pathname;
   if(req.method==='POST'){
    if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`)return json(res,403,{error:'来源不允许'});
    if(!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'需要JSON格式'});
   }
   if(p.startsWith('/api/teacher/')||p==='/teacher'||p==='/demo'||p==='/teacher.js'||p==='/demo.js'){
    if(!isTeacherAddress(req.socket.remoteAddress))return json(res,403,{error:'教师页面仅可在教师电脑本机打开'});
   }
   if(p==='/api/classes'&&req.method==='GET')return json(res,200,{classes:classIds});
   if(p==='/api/roster'&&req.method==='GET'){
    const cls=url.searchParams.get('class');if(!classIds.includes(cls))return json(res,400,{error:'请选择五年级班级'});
    return json(res,200,db.prepare('SELECT id,name,manual FROM students WHERE class_id=? ORDER BY manual,name').all(cls));
   }
   if(p==='/api/login'&&req.method==='POST'){
    const b=await readBody(req);if(!classIds.includes(b.classId))return json(res,400,{error:'请选择五年级班级'});
    let s=b.id&&db.prepare('SELECT * FROM students WHERE id=? AND class_id=?').get(String(b.id),b.classId);
    if(!s&&!b.id){
     const name=typeof b.name==='string'?b.name.trim():'';
     if(!name||name.length>30)return json(res,400,{error:'请填写1至30字的姓名'});
     const existing=db.prepare('SELECT * FROM students WHERE class_id=? AND name=?').all(b.classId,name);
     if(existing.length>1)return json(res,409,{error:'本班有同名同学，请从名单选择对应身份'});
     s=existing[0];
     if(!s){s={id:crypto.randomUUID(),class_id:b.classId,name,manual:1};db.prepare('INSERT INTO students VALUES(?,?,?,1,0,?)').run(s.id,b.classId,name,Date.now());}
    }
    if(!s)return json(res,400,{error:'请重新选择姓名'});
    db.prepare('UPDATE students SET entered=1 WHERE id=?').run(s.id);
    const token=crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(token,s.id,Date.now()+7*86400000);
    res.setHeader('Set-Cookie',`festival_student=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`);
    return json(res,200,{student:student(s.id)});
   }
   if(p==='/api/logout'&&req.method==='POST'){
    const sid=auth(req),token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('festival_student='))?.slice('festival_student='.length);
    if(sid&&token)db.prepare('DELETE FROM sessions WHERE token=?').run(token);
    res.setHeader('Set-Cookie','festival_student=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});
   }
   if(p==='/api/state'&&req.method==='GET'){
    const sid=auth(req);if(!sid)return json(res,401,{error:'请先选择班级和姓名'});return json(res,200,view(sid));
   }
   if(p==='/api/action'&&req.method==='POST'){
    const sid=auth(req);if(!sid)return json(res,401,{error:'登录已过期，请重新登录'});
   const b=await readBody(req);
   if(typeof b.eventId!=='string'||b.eventId.length<8||b.eventId.length>100||!b.action||typeof b.action!=='object'||JSON.stringify(b.action).length>1000)return json(res,400,{error:'操作格式不正确'});
   if(db.prepare('SELECT 1 FROM events WHERE sid=? AND event_id=?').get(sid,b.eventId))return json(res,200,view(sid));
   if(b.expected){
    const current=state(sid),stage=rules.stageOf(current),phase=stage==='search'?current.search.guest:stage==='nav'?current.nav.phase:stage==='reco'?current.reco.phase:0;
    if(b.expected.stage!==stage||b.expected.phase!==phase)return json(res,409,{error:'另一设备已有更新，本机操作已保留。请导出记录后刷新核对。',...view(sid)});
   }
    db.exec('BEGIN IMMEDIATE');
    try{
     const next=rules.step(state(sid),b.action);
     db.prepare('INSERT INTO records VALUES(?,?,?) ON CONFLICT(sid) DO UPDATE SET payload=excluded.payload,updated=excluded.updated').run(sid,JSON.stringify(next.state),Date.now());
     for(const [stage,points]of Object.entries(rules.points))if(next.state[stage].done)db.prepare('INSERT OR IGNORE INTO awards VALUES(?,?,?,?)').run(sid,stage,points,Date.now());
     db.prepare('INSERT INTO events VALUES(?,?)').run(sid,b.eventId);
     db.exec('COMMIT');
     return json(res,200,{...view(sid),accepted:next.accepted});
    }catch(e){db.exec('ROLLBACK');throw e;}
   }
   if(p==='/api/quiz/start'&&req.method==='POST'){
    const sid=auth(req);if(!sid)return json(res,401,{error:'请先登录'});
    let a=latestQuiz(sid);
    if(!a||a.status!=='draft'){
     const count=db.prepare('SELECT count(*) n FROM quiz_attempts WHERE sid=?').get(sid).n;
     a={id:crypto.randomUUID(),sid,form:count%2===0?'A':'B',answers:'{}',status:'draft',score:null,results:null,created:Date.now(),updated:Date.now()};
     db.prepare('INSERT INTO quiz_attempts VALUES(?,?,?,?,?,?,?,?,?)').run(a.id,a.sid,a.form,a.answers,a.status,a.score,a.results,a.created,a.updated);
    }
    return json(res,200,{attempt:publicAttempt(a),questions:quiz.publicPaper(a.form)});
   }
   if(p==='/api/quiz/latest'&&req.method==='GET'){
    const sid=auth(req);if(!sid)return json(res,401,{error:'请先登录'});
    const a=latestQuiz(sid);return json(res,200,{attempt:publicAttempt(a),questions:a?.status==='draft'?quiz.publicPaper(a.form):null});
   }
   if(p==='/api/quiz/save'&&req.method==='POST'){
    const sid=auth(req);if(!sid)return json(res,401,{error:'请先登录'});
    const b=await readBody(req),a=db.prepare('SELECT * FROM quiz_attempts WHERE id=? AND sid=?').get(b.attemptId,sid);
    if(!a||a.status!=='draft')return json(res,409,{error:'本次考核已经提交，请刷新'});
    if(!b.answers||typeof b.answers!=='object'||Array.isArray(b.answers))return json(res,400,{error:'答案格式错误'});
    const ids=new Set(quiz.paper(a.form).map(q=>q.id));
    if(Object.entries(b.answers).some(([id,v])=>!ids.has(id)||!Number.isInteger(v)||v<0||v>2))return json(res,400,{error:'题号或选项错误'});
    db.prepare('UPDATE quiz_attempts SET answers=?,updated=? WHERE id=?').run(JSON.stringify(b.answers),Date.now(),a.id);
    return json(res,200,{saved:true});
   }
   if(p==='/api/quiz/submit'&&req.method==='POST'){
    const sid=auth(req);if(!sid)return json(res,401,{error:'请先登录'});
    const b=await readBody(req),a=db.prepare('SELECT * FROM quiz_attempts WHERE id=? AND sid=?').get(b.attemptId,sid);
    if(!a)return json(res,404,{error:'没有找到本次考核'});
    if(a.status!=='draft')return json(res,200,{attempt:publicAttempt(a)});
    const graded=quiz.grade(a.form,JSON.parse(a.answers));
    if(graded.unanswered.length)return json(res,400,{error:'还有未回答的题目',unanswered:graded.unanswered});
    db.prepare('UPDATE quiz_attempts SET status=?,score=?,results=?,updated=? WHERE id=? AND status=?').run('submitted',graded.score,JSON.stringify(graded.results),Date.now(),a.id,'draft');
    return json(res,200,{attempt:publicAttempt(db.prepare('SELECT * FROM quiz_attempts WHERE id=?').get(a.id))});
   }
  if(p==='/api/exit'&&req.method==='GET'){
    const sid=auth(req);if(!sid)return json(res,401,{error:'请先登录'});
    const rows=db.prepare('SELECT id,answers,score,results,created FROM exit_attempts WHERE sid=? ORDER BY created').all(sid);
    const form=rows.length%2===0?'A':'B';
    return json(res,200,{form,questions:quiz.publicExit(form),attempts:rows.map(x=>({...x,answers:JSON.parse(x.answers),results:JSON.parse(x.results)}))});
   }
   if(p==='/api/exit/submit'&&req.method==='POST'){
    const sid=auth(req);if(!sid)return json(res,401,{error:'请先登录'});
    const b=await readBody(req);if(!b.answers||typeof b.answers!=='object'||Array.isArray(b.answers))return json(res,400,{error:'答案格式错误'});
    const count=db.prepare('SELECT count(*) n FROM exit_attempts WHERE sid=?').get(sid).n;
    const form=count%2===0?'A':'B';
    const result=quiz.gradeExit(form,b.answers);
    if(result.unanswered.length)return json(res,400,{error:'还有未回答的题目',unanswered:result.unanswered});
    db.prepare('INSERT INTO exit_attempts VALUES(?,?,?,?,?,?)').run(crypto.randomUUID(),sid,JSON.stringify(b.answers),result.score,JSON.stringify(result.results),Date.now());
    return json(res,200,result);
   }
   if(p==='/api/teacher/class'&&req.method==='GET'){
    const cls=url.searchParams.get('class');if(!classIds.includes(cls))return json(res,400,{error:'班级不正确'});
    return json(res,200,teacherClass(cls));
   }
   if(p==='/api/teacher/answers'&&req.method==='GET')return json(res,200,{A:quiz.paper('A'),B:quiz.paper('B'),exitA:quiz.exitPaper('A'),exitB:quiz.exitPaper('B'),service:rules.topics});
   if(p.startsWith('/api/'))return json(res,404,{error:'接口不存在'});
   if(req.method!=='GET')return json(res,405,{error:'方法不允许'});
   let file=allowedFiles.get(p);
   if(p.startsWith('/assets/')){
    const name=path.basename(p);if(name!==p.slice('/assets/'.length)||!['game-map.webp','game-map-paths.webp','guide.webp','guide-front-pass.webp','guide-back.webp','guide-side.webp','guide-side-pass.webp','guide-back-pass.webp','visitor.webp','service-booth.webp','leaf-ginkgo.webp','leaf-maple.webp','leaf-pine.webp','favicon.svg'].includes(name))return json(res,404,{error:'资源不存在'});
    file='assets/'+name;
   }
   if(!file)return json(res,404,{error:'页面不存在'});
   if(['/game','/quiz'].includes(p)&&!auth(req))return redirect(res,'/');
   const full=path.join(__dirname,file),ext=path.extname(file);
   const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.cjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml'}[ext];
   if(!fs.existsSync(full))return json(res,404,{error:'文件暂未准备好'});
   res.writeHead(200,{'Content-Type':type,'Cache-Control':ext==='.webp'?'public, max-age=86400':'no-store'});fs.createReadStream(full).pipe(res);
  }catch(e){console.error('Request error:',e);if(!res.headersSent)json(res,400,{error:e.message||'保存失败，请检查网络后重试'});else res.end();}
 });
 return {server,db};
}
if(require.main===module){
 const {server}=createApp();
 const port=Number(process.env.PORT||8784),host=process.env.HOST||'0.0.0.0';
 server.listen(port,host,()=>{
  const active=server.address().port;
  console.log(`奇趣游园会学生端：http://localhost:${active}/`);
  console.log(`教师电脑大屏：http://localhost:${active}/teacher`);
  const addresses=Object.values(os.networkInterfaces()).flat().filter(n=>n?.family==='IPv4'&&!n.internal).map(n=>n.address);
  const classroomAddresses=addresses.filter(isPrivateLanAddress);
  for(const address of classroomAddresses.length?classroomAddresses:addresses)console.log(`学生局域网入口：http://${address}:${active}/`);
 });
}
module.exports={createApp,isTeacherAddress,isPrivateLanAddress};
