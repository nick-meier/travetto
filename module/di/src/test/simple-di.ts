import { Injectable, Inject } from '../lib/decorator/injectable';
import { DbConfig } from './config';
import { Registry } from '../lib/service';

@Injectable()
class Database {
  constructor( @Inject('a') dbConfig: DbConfig) {
    console.log("Creating database", dbConfig.getUrl());
  }

  query() {
    console.log("Getting stuff");
  }
}

@Injectable()
class Service {
  constructor(private db: Database) {
    console.log("Creating service", db);
  }

  doWork() {
    this.db.query();
  }
}


async function run() {
  let inst = await Registry.getInstance(Service);
  inst.doWork();
}

run();