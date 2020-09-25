import express, {Express, Request, Response} from 'express';

const app: Express = express();

app.listen(8080);
app.get('/', (req: Request, res: Response<string>) => {
	res.status(200);
	res.write("Hello, World!");
	res.end();
})