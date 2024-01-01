/* eslint global-require: off, no-console: off, promise/always-return: off */

import { app } from 'electron';
import Logger from 'electron-log/main';
import { $errors, $messages } from '../config/strings';
import { is } from './util';

import appListeners from './app-listeners';
import { debugInfo } from './constants';
import debugging from './debugging';
import ipc from './ipc';
import logger from './logger';
import { resetStore } from './store';
import win from './window';

console.time(app.name);

const start = () => {
	// Initialize logger and error handler
	logger.initialize();

	// Register ipcMain listeners
	ipc.initialize();

	// Enable electron debug and source map support
	debugging.initialize();

	// Register app listeners, e.g. `app.on()`
	appListeners.register();
};

// This happens when the app is loaded, AFTER the 'ready' event is fired
app
	.whenReady()
	.then(async () => {
		// initialize  the logger for any renderer process
		Logger.initialize({ preload: true });
		console.timeLog(app.name, $messages.ready);

		// Log Node/Electron versions
		Logger.info(debugInfo());

		if (is.debug) {
			await debugging.installExtensions();
			resetStore();
		}
	})
	.then(async () => {
		// Create the main browser window.
		win.createWindow();
	})
	.then(() => console.timeLog(app.name, $messages.window_created))
	.finally(() => {
		// Idle
		console.timeLog(app.name, $messages.idle);
		Logger.status($messages.idle);
	})
	.catch((error: Error) => {
		Logger.error($errors.prefix_main, error);
	});

// LAUNCH THE APP
console.timeLog(app.name, $messages.init);
start();
