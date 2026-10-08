const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = path.join(__dirname, '../page-guide.js');
const guides = fs.existsSync(source) ? require(source) : {};

function clock() {
 let time = 100;
 assert.equal(typeof guides.createGate, 'function', '共享指引需要提供时间门控');
 return { gate: guides.createGate(() => time), advance(ms) { time += ms; } };
}

test('弹窗打开满三秒才能主动关闭，时间到不会自动关闭', () => {
 const { gate, advance } = clock();
 assert.equal(gate.enter('search'), true);
 assert.equal(gate.remaining(), 3);
 assert.equal(gate.close(), false);
 advance(2999);
 assert.equal(gate.canClose(), false);
 assert.equal(gate.close(), false);
 advance(1);
 assert.equal(gate.canClose(), true);
 assert.equal(gate.isOpen, true);
 assert.equal(gate.close(), true);
 assert.equal(gate.isOpen, false);
});

test('当前任务重复渲染不重置等待，关闭后也不重弹', () => {
 const { gate, advance } = clock();
 gate.enter('nav');
 advance(2000);
 assert.equal(gate.enter('nav'), false);
 assert.equal(gate.remaining(), 1);
 advance(1000);
 assert.equal(gate.close(), true);
 assert.equal(gate.enter('nav'), false);
 assert.equal(gate.isOpen, false);
});

test('切换任务或手动重看都重新计时，返回上一任务会再次弹出', () => {
 const { gate, advance } = clock();
 assert.equal(gate.show(), false);
 gate.enter('search');
 advance(3000);
 gate.close();
 assert.equal(gate.enter('nav'), true);
 assert.equal(gate.remaining(), 3);
 advance(3000);
 gate.close();
 assert.equal(gate.enter('search'), true);
 advance(3000);
 gate.close();
 assert.equal(gate.show(), true);
 assert.equal(gate.key, 'search');
 assert.equal(gate.close(), false);
 assert.equal(gate.remaining(), 3);
});

test('所有课堂页面均提供任务背景和三步操作指引', () => {
 assert.equal(typeof guides.guides, 'object');
 const keys = ['login', 'search', 'nav', 'reco', 'service', 'complete', 'hall:hub',
  ...['recognition', 'translation', 'shopping', 'sports', 'art', 'medical'].map(id => `hall:${id}`),
  'quiz', 'teacher', 'demo'];
 for (const key of keys) {
  const guide = guides.guides[key];
  assert.ok(guide, key);
  assert.ok(guide.title && guide.background, `${key}的背景`);
  assert.equal(guide.steps.length, 3, `${key}的三步指引`);
 }
});
