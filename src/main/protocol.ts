// Custom app protocol handler for Electron
// https://www.electronjs.org/docs/latest/api/protocol
// https://www.electronjs.org/docs/latest/tutorial/launch-app-from-url-in-another-app

import { net, protocol, shell } from 'electron';
import Logger from 'electron-log/main';
import path from 'path';
import { PROTOCOL } from '../config/config';
import { __assets } from './paths';

const initialize = () => {
	if (!protocol?.handle) {
		// Old versions of Electron don't have protocol.handle
		return null;
	}

	Logger.status(`Initializing file protocol: ${PROTOCOL}`);
	protocol.handle(PROTOCOL, (request: any) => {
		// list all files in the directory
		const filepath = path.join(
			__assets,
			request.url.slice(`${PROTOCOL}://`.length),
		);
		const file = `file://${filepath}`;
		Logger.status(`Protocol request: ${request.url}; File: ${file}`);
		shell.openPath(filepath);
		return net.fetch(file);
	});
};

const register = () => {
	Logger.status(`Registering file protocol: ${PROTOCOL}`);
	protocol.registerSchemesAsPrivileged([
		{
			scheme: PROTOCOL,
			privileges: {
				allowServiceWorkers: true,
				secure: true,
				standard: true,
				stream: true,
				supportFetchAPI: true,
				bypassCSP: true,
			},
		},
	]);
};

export default { initialize, register };
