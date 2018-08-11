#!/usr/bin/env node

process.env.ENV = 'test';
const startup = require('@travetto/base/bin/travetto');

if (process.env.EXECUTION) {
  process.env.NO_WATCH = true;
  require('../src/runner/communication').server();
} else {
  startup.run().then(x => {
    const { Runner } = require('../src/runner');
    return new Runner(process.argv.slice(2)).run();
  }).then(
    x => process.exit(x ? 0 : 1),
    e => process.exit(1));
}