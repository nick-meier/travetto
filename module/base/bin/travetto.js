#!/usr/bin/env node

global.INIT_TIME = Date.now();

if (require.main === module) {
  require('./args');
}

const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = global.ts = require('typescript');

//Simple bootstrap to load compiler
const { Env } = require('../src/env');
const { resolveFrameworkFile } = require('../src/app-info');
const { AppCache } = require('../src/cache');
const cwd = Env.cwd;

const json = ts.readJsonConfigFile(`${cwd}/tsconfig.json`, ts.sys.readFile);
const opts = ts.parseJsonSourceFileConfigFileContent(json, ts.sys, cwd).options;

AppCache.init();

//Rewrite Module for local development
if (Env.frameworkDev) {
  const parDir = path.resolve(path.dirname(path.dirname(cwd)), 'module');
  const og = Module._load.bind(Module);
  Module._load = (request, parent) => {
    const root = path.dirname(parent.filename);
    if (request.startsWith('@travetto')) { // Handle import directly
      request = `${cwd}/node_modules/${request}`;
    } else if (request.startsWith('.') && root.startsWith(parDir) && !root.startsWith(cwd)) { // Handle relative and sub
      const relativeRoot = root.split(parDir).pop();
      request = path.resolve(`${cwd}/node_modules/@travetto/${relativeRoot}`, request);
    }
    request = resolveFrameworkFile(request);
    return og.apply(null, [request, parent]);
  };
}

// Cache on require
require.extensions['.ts'] = function load(m, tsf) {
  const name = tsf.replace(/[\\\/]/g, path.sep);

  let content;
  if (!AppCache.hasEntry(name)) {
    content = ts.transpile(fs.readFileSync(tsf, 'utf-8'), opts);
    AppCache.writeEntry(name, content);
  } else {
    content = AppCache.readEntry(name);
  }

  const r = m._compile(content, tsf.replace(/\.ts$/, '.js'));
  return r;
};

const { PhaseManager } = require('../src/phase');
const mgr = new PhaseManager('bootstrap');
mgr.load();

if (require.main === module) {
  mgr.run();
} else {
  module.exports = mgr;
}