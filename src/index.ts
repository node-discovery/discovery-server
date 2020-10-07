import express, {Express, Request, Response} from 'express';

import discovery, { DiscoveryServer } from './discovery-server';

const app: Express = express();
const server: DiscoveryServer = discovery(app, ({heartbeat}: any) => heartbeat < 2000);
server.listen(8080);

app.get('/', (_req: Request, res: Response<string>) => {
	res.status(200);
	res.write("Hello, World!");
	res.end();
})