'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const charts=require('../teacher-charts.js');
const analytics=require('../teacher-analytics.cjs');

test('empty class clearly distinguishes no answers and no quiz submissions from zero',()=>{
 const html=charts.render(analytics.aggregate());
 assert.equal((html.match(/class="teacher-chart-card /g)||[]).length,5);
 assert.match(html,/尚无提交/);
 assert.equal((html.match(/<strong>尚无证据<\/strong>/g)||[]).length,8);
 assert.match(html,/未提交不计为0分/);
 assert.doesNotMatch(html,/NaN|Infinity|undefined/);
});

test('visible comparison retains real zero and reports each answer denominator',()=>{
 const evidence={correct:0,answered:2,incorrect:2,noEvidence:1,rate:0};
 const html=charts.render({...analytics.aggregate(),total:3,exit:{submitted:2,notSubmitted:1,items:[{id:'search',label:'搜索',first:evidence,latest:{...evidence,correct:1,incorrect:1,rate:50}}]}});
 assert.match(html,/<strong>0%<\/strong>/);
 assert.match(html,/<strong>50%<\/strong>/);
 assert.match(html,/正确 0\/2人 · 无证据 1人/);
 assert.match(html,/正确 1\/2人 · 无证据 1人/);
 assert.match(html,/各目标已回答人数/);
});

test('bars use the same whole-class denominator and clamp geometry',()=>{
 const html=charts.render({...analytics.aggregate(),stages:[{label:'任务甲',count:2,total:4,percent:1},{label:'任务乙',count:2,total:4,percent:99},{label:'越界',count:12,total:4},{label:'无人数',count:0,total:0}]});
 assert.equal((html.match(/width:50%/g)||[]).length,2);
 assert.match(html,/width:100%/);
 assert.match(html,/2\/4<small> · 50%/);
 assert.doesNotMatch(html,/width:(?:NaN|Infinity|-)/);
});

test('all outside labels are escaped and non-numeric values cannot enter SVG or CSS',()=>{
 const hostile='<img src=x onerror="alert(1)">';
 const html=charts.render({total:'" onload="alert(1)',entered:'<script>',status:[{id:hostile,label:hostile,count:hostile}],stages:[{label:hostile,count:hostile,total:hostile}],halls:[{label:hostile,count:hostile,total:hostile}],exit:{items:[{label:hostile,first:{rate:hostile},latest:{rate:hostile}}]},quiz:{distribution:[{label:hostile,count:hostile}]}});
 assert.doesNotMatch(html,/<img|<script|onload=/);
 assert.match(html,/&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
 assert.doesNotMatch(html,/stroke-dasharray="[^"0-9. ]|style="[^"<>]*</);
});

test('charts provide semantic evidence tables and a named SVG ring',()=>{
 const html=charts.render(analytics.aggregate());
 assert.match(html,/<svg[^>]*role="img"[^>]*aria-labelledby="teacher-status-title teacher-status-desc"/);
 assert.match(html,/<title id="teacher-status-title">班级学习状态<\/title>/);
 assert.match(html,/<desc id="teacher-status-desc">/);
 assert.match(html,/<caption class="teacher-chart-sr-only">/);
 assert.match(html,/<th scope="row">算法与人的判断<\/th>/);
 assert.match(html,/aria-label="20题最新已提交成绩的人数分布"/);
 assert.match(html,/0—59分/);
 assert.match(html,/100分/);
});

test('the no-dependency browser API returns the same five cards',()=>{
 const sandbox={window:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../teacher-charts.js'),'utf8'),sandbox);
 assert.equal(typeof sandbox.window.TeacherCharts.render,'function');
 assert.equal(sandbox.window.TeacherCharts.render(analytics.aggregate()),charts.render(analytics.aggregate()));
});
