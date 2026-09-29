'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const dataDir=process.env.DATA_DIR||path.join(__dirname,'runtime');
const source=path.join(dataDir,'classroom.sqlite');
if(!fs.existsSync(source))throw Error('尚无课堂数据库，请先启动应用并保存一条记录。');
const backupDir=process.env.BACKUP_DIR||path.join(__dirname,'backups');
fs.mkdirSync(backupDir,{recursive:true});
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const target=path.join(backupDir,`classroom-${stamp}.sqlite`);
const db=new DatabaseSync(source);
try{db.exec(`VACUUM INTO '${target.replace(/'/g,"''")}'`);}finally{db.close();}
console.log(`课堂数据已备份到：${target}`);
