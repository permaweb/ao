import Router from '@koa/router';
import { createReadStream } from 'fs';
import * as path from 'path';

const welcomeRouter = new Router();

welcomeRouter.get('/', (ctx: Router.RouterContext) => {
  ctx.type = 'text/html';
  ctx.body = createReadStream('welcome.html');
});

export default welcomeRouter;
