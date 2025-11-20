'use strict';

const Benchmark = require('benchmark');

function areEqualOld(a, b) {
  if (!Buffer.isBuffer(a)) {
    return false;
  }
  if (!Buffer.isBuffer(b)) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0, len = a.length; i < len; ++i) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function areEqualNew(a, b) {
  if (!Buffer.isBuffer(a)) {
    return false;
  }
  if (!Buffer.isBuffer(b)) {
    return false;
  }
  return a.equals(b);
}

const buf32Equal1 = Buffer.alloc(32, 0xAB);
const buf32Equal2 = Buffer.alloc(32, 0xAB);

const buf4kEqual1 = Buffer.alloc(4096, 0xCD);
const buf4kEqual2 = Buffer.alloc(4096, 0xCD);

const buf64kEqual1 = Buffer.alloc(65536, 0xEF);
const buf64kEqual2 = Buffer.alloc(65536, 0xEF);

const buf64kUnequal1 = Buffer.alloc(65536, 0xAA);
const buf64kUnequal2 = Buffer.alloc(65536, 0xAA);
buf64kUnequal2[65535] = 0xBB; // Different at last byte

console.log('Benchmarking Buffer.areEqual implementations\n');
console.log('Node version:', process.version);
console.log('');

console.log('=== 32-byte equal buffers ===');
new Benchmark.Suite()
  .add('old implementation', function() {
    areEqualOld(buf32Equal1, buf32Equal2);
  })
  .add('new implementation (Buffer.equals)', function() {
    areEqualNew(buf32Equal1, buf32Equal2);
  })
  .on('cycle', function(evt) {
    console.log(String(evt.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
    const oldOps = this[0].hz;
    const newOps = this[1].hz;
    const speedup = (newOps / oldOps).toFixed(2);
    console.log('Speedup: ' + speedup + 'x\n');
  })
  .run();

console.log('=== 4KB equal buffers ===');
new Benchmark.Suite()
  .add('old implementation', function() {
    areEqualOld(buf4kEqual1, buf4kEqual2);
  })
  .add('new implementation (Buffer.equals)', function() {
    areEqualNew(buf4kEqual1, buf4kEqual2);
  })
  .on('cycle', function(evt) {
    console.log(String(evt.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
    const oldOps = this[0].hz;
    const newOps = this[1].hz;
    const speedup = (newOps / oldOps).toFixed(2);
    console.log('Speedup: ' + speedup + 'x\n');
  })
  .run();

console.log('=== 64KB equal buffers ===');
new Benchmark.Suite()
  .add('old implementation', function() {
    areEqualOld(buf64kEqual1, buf64kEqual2);
  })
  .add('new implementation (Buffer.equals)', function() {
    areEqualNew(buf64kEqual1, buf64kEqual2);
  })
  .on('cycle', function(evt) {
    console.log(String(evt.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
    const oldOps = this[0].hz;
    const newOps = this[1].hz;
    const speedup = (newOps / oldOps).toFixed(2);
    console.log('Speedup: ' + speedup + 'x\n');
  })
  .run();

console.log('=== 64KB unequal buffers (different at last byte) ===');
new Benchmark.Suite()
  .add('old implementation', function() {
    areEqualOld(buf64kUnequal1, buf64kUnequal2);
  })
  .add('new implementation (Buffer.equals)', function() {
    areEqualNew(buf64kUnequal1, buf64kUnequal2);
  })
  .on('cycle', function(evt) {
    console.log(String(evt.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
    const oldOps = this[0].hz;
    const newOps = this[1].hz;
    const speedup = (newOps / oldOps).toFixed(2);
    console.log('Speedup: ' + speedup + 'x\n');
  })
  .run();
