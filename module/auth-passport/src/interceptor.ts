import * as passport from 'passport';

import { RestInterceptor, Request, Response } from '@travetto/rest';
import { Injectable } from '@travetto/di';
import { AuthInterceptor } from '@travetto/auth-rest';

interface Handler {
  (req: Request, res: Response, next: Function): any;
}

const authenticator = (passport as any as passport.Authenticator<Handler>);

@Injectable()
export class PassportInterceptor extends RestInterceptor {

  private init = authenticator.initialize();

  after = AuthInterceptor;

  intercept(req: Request, res: Response) {
    return new Promise((resolve, reject) => {
      this.init(req, res, () => resolve());
    });
  }
}