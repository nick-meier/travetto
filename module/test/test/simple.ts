import { Suite, Test } from '../';
import * as assert from 'assert';

let a = 0;

@Suite('Simple Suite')
class Simple {

  @Test()
  test1a() {
    assert.equal(1, 1);
  }

  @Test()
  test1b() {
    assert.equal(1, 1);
  }

  @Test()
  test1c() {
    assert.equal(1, 1);
  }

  @Test()
  test1d() {
    assert.equal(1, a);
  }
}