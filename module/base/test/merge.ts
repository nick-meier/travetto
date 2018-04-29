import { deepMerge, isPrimitive, isFunction } from '../src/util';
import * as assert from 'assert';

class Test { }

function testPrimitive() {
  for (const v of [1, '1', true, false, 0.0, /ab/g]) {
    assert(isPrimitive(v));
  }

  for (const v of [[], {}, () => { }, new Test(), null, undefined]) {
    assert(!isPrimitive(v));
  }

  assert(isFunction(Test));
}

function testMerge() {
  assert(deepMerge({ a: 1, b: 2 }, { a: 5 }).a === 5);
  assert(typeof deepMerge({ a: 1, b: () => { } }, { a: 5, c: 10 }).b !== 'number');
  assert.deepEqual(deepMerge({ a: 1, b: () => { }, d: [1, 2, 3] }, { a: 5, c: 10, d: [1, 5, 6, 7] }).d, [1, 5, 6, 7]);

  const right = {
    lines: { start: 15, end: 21 },
    file: '/home/tim/Code/travetto/test/test/simple.1.ts',
    description: undefined
  };
  const left = {
    file: '/home/tim/Code/travetto/test/test/simple.1.ts',
    methodName: 'test1a'
  };

  const merged = deepMerge(left, right);
  assert.deepEqual(merged.lines, { start: 15, end: 21 });
  assert(merged.methodName === 'test1a');
  assert(merged.file === left.file);

  assert.strictEqual(deepMerge({ a: {} }, { a: { b: Test } }).a.b, Test);

  assert(deepMerge({ a: { b: 5 } }, { a: null }).a === null);
  assert.deepEqual(deepMerge({ a: { b: 5 } }, { a: undefined }).a, { b: 5 });

}

function testStrict() {
  assert.throws(() =>
    deepMerge({ a: 1 }, { a: '5' }, 'strict')
  );
}

function testCoerce() {
  assert(deepMerge({ a: 1 }, { a: '5' }, 'coerce').a === 5);
  assert(deepMerge({ a: '1' }, { a: 5 }, 'coerce').a === '5');
  assert(isNaN(deepMerge({ a: 1 }, { a: true }, 'coerce').a));
  assert(deepMerge({ a: true }, { a: null }, 'coerce').a === null);
  assert(deepMerge({ a: true }, { a: null }, 'coerce').a === null);
}

testPrimitive();
testMerge();
testStrict();
testCoerce();