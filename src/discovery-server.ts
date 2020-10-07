import express, { Request, Response } from 'express';
import http from 'http';
import https from 'https';

import io from 'socket.io';
import Client, { ClientInfo } from './model/client';

export const DEFAULT_OPTIONS = {
	path: "/discovery",
	useSSL: false
};

// this function tests if object is of type express.Express
function instanceOfExpress(object: any): object is express.Express {
	return "get" in object;
}

export class DiscoveryServer {

	private httpServer: http.Server | https.Server;
	private socket: io.Server;
	private clients: Client[] = [];

	/**
	 * 
	 * @param httpServer the http/https server
	 * @param clientFilter the function that filters clients depending on their status
	 * @param options the server options
	 * @param socketOptions the socket options @see io.ServerOptions
	 */
	constructor(private app: express.Express, public clientFilter: Function, options = DEFAULT_OPTIONS, socketOptions?: io.ServerOptions) {

		if (options.useSSL) {
			this.httpServer = https.createServer(app);
		} else {
			this.httpServer = http.createServer(app);
		}

		this.socket = io(this.httpServer, socketOptions);

		this.socket.on('connection', (clientSocket) => {

			console.log("client connected")

			clientSocket.on('register', ({ name, port, protocol }) => {
				if (name && port > -1) {
					const url: string = `${protocol || 'http'}://${clientSocket.conn.remoteAddress}:${port}/`;
					const clients: Client[] = this.clients.filter(({ name: clientName }) => clientName === name);
					if (clients.length > 0) {
						if (clients.length > 1) {
							const client: Client = clients.reduce((clientA: Client, clientB: Client) => {
								clientA.infos.push(...clientB.infos);
								return clientA;
							})
							this.clients = this.clients.filter(({ name: clientName }) => clientName !== name);
							client.infos.push(new ClientInfo(clientSocket.id, url));
							this.clients.push(client);
						} else {
							const client: Client = this.clients[this.clients.indexOf(clients[0])];
							client.infos.push(new ClientInfo(clientSocket.id, url));
						}

					} else {
						const client: Client = new Client(name, [new ClientInfo(clientSocket.id, url)])
						this.clients.push(client)
					}

				}
			});

			clientSocket.on('status', ({ name, status }) => {
				for (const client of this.clients) {
					if (client.name === name) {
						for (const info of client.infos) {
							if (info.id === clientSocket.id)
								info.status = status;
						}
					}

				}
			})

			clientSocket.on('unregister', ({ name }) => {
				for (const client of this.clients) {
					if (client.name === name) {

						client.infos.map(({ id: infoId }, index) => {
							return { infoId, index }
						})
							.filter(({ infoId }) => infoId === clientSocket.id)
							.forEach(({ index }) => {
								client.infos.splice(index, 1);
							})

						if (client.infos.length <= 0) {
							this.clients.splice(this.clients.indexOf(client), 1);
						}
					}

				}
			})

		});

		app.get(options.path, (req: Request, res: Response) => {
			res.status(200);
			res.write(JSON.stringify(this.clients));
			res.end()
		});

		app.get(`${options.path}/instance`, (req: Request, res: Response) => {
			const clients = this.clients
				.filter(({ name }) => name === req.query.name)
				.map(client => client.getAvailableClients(this.clientFilter))
				.reduce((a, b) => [...a, ...b], []);
			res.writeHead(200, {
				"Content-Type": "application/json"
			})
			res.write(JSON.stringify(clients));
			res.end();
		})
	}

	/**
	 * forward method for http server .listen(port, callback)
	 * @param port 
	 * @param callback 
	 */
	public listen(port: number, callback?: (() => void)) {
		return this.httpServer.listen(port, callback)
	}


}

/**
 * 
 * @param app the http/https server containing the express app or the Express app
 * @param useSSL if app is of type Express, an http server will be instantiated, if useSSL is true, the server will be of type https.Server
 * 
 * @returns disovery-server.DiscoveryServer
 */
export default function discovery(app: express.Express, clientFilter: Function, options = DEFAULT_OPTIONS, socketOptions: io.ServerOptions = {}): DiscoveryServer {

	options = { ...DEFAULT_OPTIONS, ...options }
	return new DiscoveryServer(app, clientFilter, options, socketOptions);
}