export class ClientInfo {

	constructor(public id: string, public url: string, public status?: any) {}

}

export default class Client {

	constructor(public name: string, public infos:ClientInfo[] = []) {}

	public getAvailableClients(filter: Function) {
		return this.infos.filter(({status}) => filter(status));
	}

	public toString() {
		return `
		{
			${this.name},
			clients: {
				${this.infos.map(({url, status}) => `
					url: ${url},
					status: ${status}
				`)}
			}
		}
		`
	}

}