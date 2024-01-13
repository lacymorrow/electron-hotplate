// DATA SHOULD ONLY FLOW DOWNWARDS
// Do not use this context to update data, only to read it
// Use IPC to update data

import { ipcChannels } from '@/config/ipc-channels';
import React, { useCallback, useContext, useEffect, useMemo } from 'react';

import { DEFAULT_SETTINGS, SettingsType } from '@/config/settings';
import { $messages } from '@/config/strings';
import Logger from 'electron-log';
import { MenuItemConstructorOptions } from 'electron/renderer';
import { toast } from 'sonner';
import { play, preload } from '../lib/sounds';

interface GlobalContextType {
	appName: string;
	appMenu: MenuItemConstructorOptions[];
	settings: SettingsType;
	setSettings: (newSettings: Partial<SettingsType>) => void;
}

export const GlobalContext = React.createContext<GlobalContextType>({
	appName: '',
	appMenu: [],
	settings: DEFAULT_SETTINGS,
	setSettings: () => {},
});

export function GlobalContextProvider({
	children,
}: {
	children?: React.ReactNode;
}) {
	const [appName, setAppName] = React.useState<string>('');
	const [appMenu, setAppMenu] = React.useState<MenuItemConstructorOptions[]>(
		[],
	);
	const [settings, setCurrentSettings] =
		React.useState<SettingsType>(DEFAULT_SETTINGS);

	useEffect(() => {
		// Create handler for receiving asynchronous messages from the main process
		const synchronizeAppState = async () => {
			Logger.log($messages.synchronize);

			// Get settings
			window.electron.ipcRenderer
				.invoke(ipcChannels.GET_SETTINGS)
				.then(setCurrentSettings)
				.catch(Logger.error);

			// Get app menu
			window.electron.ipcRenderer
				.invoke(ipcChannels.GET_APP_MENU)
				.then(setAppMenu)
				.catch(Logger.error);
		};

		// Listen for messages from the main process
		window.electron.ipcRenderer.on(ipcChannels.APP_UPDATED, async (_event) => {
			await synchronizeAppState();
		});

		// Create notifications using the renderer
		window.electron.ipcRenderer.on(
			ipcChannels.APP_NOTIFICATION,
			({ title, body, action }: any) => {
				toast(title, {
					...(body ? { description: body } : {}),
					...(action ? { action } : {}),
					// action: {
					// 	label: 'Ok',
					// 	onClick: () => {},
					// },
				});
				new Notification(title, {
					body,
				});
			},
		);

		window.electron.ipcRenderer.once(
			ipcChannels.PRELOAD_SOUNDS,
			(basepath: any) => preload(basepath),
		);

		window.electron.ipcRenderer.on(ipcChannels.PLAY_SOUND, (sound: any) => {
			play(sound);
		});

		// Request initial data when the app loads
		synchronizeAppState();

		// Get app name
		window.electron.ipcRenderer
			.invoke(ipcChannels.GET_APP_NAME)
			.then(setAppName)
			.catch(Logger.error);

		// Get app menu
		window.electron.ipcRenderer
			.invoke(ipcChannels.GET_APP_MENU)
			.then(setAppMenu)
			.catch(Logger.error);

		Notification.requestPermission((result) => {
			console.log(result);
		});

		// Let the main process know that the renderer is ready
		window.electron.ipcRenderer.send(ipcChannels.RENDERER_READY);

		return () => {
			// Clean up listeners when the component unmounts
			window.electron.ipcRenderer.removeAllListeners(ipcChannels.APP_UPDATED);
			window.electron.ipcRenderer.removeAllListeners(ipcChannels.PLAY_SOUND);
			window.electron.ipcRenderer.removeAllListeners(
				ipcChannels.APP_NOTIFICATION,
			);
		};
	}, []);

	// Electron API functions
	const setSettings = useCallback((newSettings: Partial<SettingsType>) => {
		window.electron.setSettings(newSettings);
	}, []);

	const value = useMemo(() => {
		return {
			appName,
			appMenu,
			settings,
			setSettings,
		};
	}, [appName, appMenu, settings, setSettings]);

	return (
		<GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
	);
}

export const useGlobalContext = () => {
	const context = useContext(GlobalContext);

	if (context === undefined)
		throw new Error('useGlobalContext must be used within a GlobalContext');

	return context;
};
