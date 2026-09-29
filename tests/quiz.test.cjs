'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const quiz=require('../quiz-bank.cjs');

test('both papers have twenty distinct questions and hide answers before submission',()=>{
 for(const form of ['A','B']){
  const privatePaper=quiz.paper(form),publicPaper=quiz.publicPaper(form);
  assert.equal(privatePaper.length,20);
  assert.equal(new Set(privatePaper.map(q=>q.id)).size,20);
  assert.equal(publicPaper.length,20);
  assert.equal(publicPaper.some(q=>'answer'in q||'explanation'in q),false);
  assert.equal(privatePaper.every(q=>q.options.length===3&&[0,1,2].includes(q.answer)),true);
 }
});

test('grading counts correct answers and identifies unanswered',()=>{
 const qs=quiz.paper('A');
 const correct=Object.fromEntries(qs.map(q=>[q.id,q.answer]));
 assert.equal(quiz.grade('A',correct).score,100);
 delete correct[qs[0].id];
 const result=quiz.grade('A',correct);
 assert.equal(result.score,95);
 assert.deepEqual(result.unanswered,[qs[0].id]);
});

test('classroom exit retake changes situations while preserving the same four targets',()=>{
 const A=quiz.publicExit('A'),B=quiz.publicExit('B');
 assert.equal(A.length,4);assert.equal(B.length,4);
 assert.notEqual(A[0].stem,B[0].stem);
 assert.equal(A.some(q=>'answer'in q),false);
 assert.equal(B.some(q=>'answer'in q),false);
 const answers=Object.fromEntries(quiz.exitPaper('B').map(q=>[q.id,q.answer]));
 assert.equal(quiz.gradeExit('B',answers).score,100);
});
