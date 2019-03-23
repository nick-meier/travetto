import { Config } from '@travetto/config';
import { Env, AppError } from '@travetto/base';

import { SSLUtil } from './util/ssl';
import { Method } from './types';

@Config('rest')
export class RestConfig {
  serve = true;
  port = 3000;
  disableGetCache = true;

  cookie: {
    keys: string[];
    signed?: boolean;
    secure?: boolean;
    domain?: string;
    path?: string;
    expires?: number;
  } = {
      signed: true,
      keys: ['default-insecure']
    };

  ssl: {
    active?: boolean,
    keys?: {
      cert: string,
      key: string
    }
  } = {
      active: false
    };

  cors: {
    active: boolean;
    origins?: string[],
    methods?: Method[],
    headers?: string[],
    credentials?: boolean
  } = {
      active: false
    };

  async getKeys() {
    if (this.ssl.active) {
      if (!this.ssl.keys) {
        if (Env.prod) {
          throw new AppError('Cannot use test keys in production', 'permissions');
        }
        return SSLUtil.generateKeyPair('/C=US/ST=CA/O=TRAVETTO/OU=REST/CN=DEV');
      } else {
        return this.ssl.keys;
      }
    }
  }
}
