import {app, BrowserWindow, dialog, ipcMain, Menu, protocol} from 'electron';
import {ClientCache, CurrentWindow, ServerProxy}             from './service';
import {config}                                              from './config';
import {createdWindow}                                       from './core/service/createdWindow.service';
import {WindowManages}                                       from "./core/window_manages";
import {menuTemplateConf}                                    from "./config/menu";
import path                                                  from "path";
import fs                                                    from "fs";

protocol.registerStandardSchemes(['racoon']);

declare var global: any;
global.isValidToken      = false;
global.privateSpace      = '';
global.browserWindowList = {};

// const bytesToSize = (bytes: number): string => {
//     if (bytes === 0) return '0 B';
//     const k     = 1024;
//     const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
//     const i     = Math.floor(Math.log(bytes) / Math.log(k));
//     //return (bytes / Math.pow(k, i)) + ' ' + sizes[i];
//     return (bytes / Math.pow(k, i)).toPrecision(3) + ' ' + sizes[i];
//     //toPrecision(3) 后面保留两位小数，如1.00GB
// };

global.service = {
    ServerProxy,
    CurrentWindow,
    browserWindowList: () => global.browserWindowList,
    ClientCache,
    WindowManages,
    Config           : config,
    CreatedWindow    : createdWindow,
    Process          : {
        platform: process.platform
    },
    RenderToRender   : {
        emit: (eventName: string, params: any = {}) => {
            const emitAuthor    = params.emitAuthor;
            const arr           = eventName.split('@');
            const targetWinHash = arr[0];
            const newEventName  = arr[1];
            const masterWin     = global.browserWindowList[targetWinHash];
            masterWin.webContents.send(`${emitAuthor}@${newEventName}`, params);
        }
    },
    DestroyTargetWin : (winHash: string) => {
        (global.browserWindowList[winHash] as BrowserWindow).destroy();
        delete global.browserWindowList[winHash];
    },
    AppReset         : () => {
        app.relaunch({args: process.argv.slice(1).concat(['--relaunch'])});
        app.exit(0);
    },
    SignOut          : async () => {
        const validToken = await ClientCache('/user/signState').removeSignState();
        if (typeof validToken.raw === 'object' && validToken.raw.length === 0) {
            global.service.AppReset();
        }
    },
    SelectFiles      : (parentWin: BrowserWindow, options: object) => {
        return new Promise((resolve, reject) => {
            const parentWin = global.browserWindowList['master'];
            dialog.showOpenDialog(parentWin, options, (files: string[]) => {
                const data: any = [];
                files.forEach(async (file: string, index: number) => {
                    const filePostfix    = path.extname(file);
                    const fileName       = path.basename(file);
                    const stat: fs.Stats = fs.statSync(file);
                    if (stat) {
                        data.push({name: fileName, type: filePostfix, size: stat.size, path: file});
                    }
                });
                resolve(data);
            });
        });
    }
};

ipcMain.on('getBrowserWindowList', (event: any) => {
    event.returnValue = global.browserWindowList;
});

let masterWindow: BrowserWindow;
let signWindow: BrowserWindow;

// 禁用硬件加速
app.disableHardwareAcceleration();
// 单个实例锁
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit()
} else {

    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (masterWindow) {
            if (masterWindow.isMinimized()) {
                masterWindow.restore();
            }
            masterWindow.focus()
        }
    });

    app.on('ready', async () => {

        const localCacheSignStateInfo = await ClientCache('/user/signState').getSignState();
        if (localCacheSignStateInfo && localCacheSignStateInfo.token && localCacheSignStateInfo.token !== '') {
            const validToken    = await new ServerProxy('User', 'verifySignState').send();
            global.isValidToken = validToken.result === 0;
            global.privateSpace = localCacheSignStateInfo.private_space;
        } else {
            global.isValidToken = false;
        }

        if (!global.isValidToken) {
            masterWindow = new WindowManages.master(null, true).created();
            signWindow   = new WindowManages.sign(true, masterWindow).created();
        } else {
            masterWindow = new WindowManages.master('note', true).created();
        }

        Menu.setApplicationMenu(null);
        const menu = Menu.buildFromTemplate((menuTemplateConf.init() as any));
        Menu.setApplicationMenu(menu);

        // /Users/medivh-mac/MyWork/racoon/electron/dist/attached/618f18f4fa22d292ca1e28865ddada7f/img/md55sd3sa21/mctttIfe.png
        // http://localhost:4001/attached/618f18f4fa22d292ca1e28865ddada7f/img/md55sd3sa21/mctttIfe.png

        // racoon://img/h5llasd.png
        //<img src='racoon://img/md55sd3sa21/mctttIfe.png' />
        protocol.registerHttpProtocol('racoon', async (protocolRequest, callback) => {
            const newProtocolRequest = await ClientCache('/attached/attached').adapter(protocolRequest);
            callback(newProtocolRequest)
        });

    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', (event: any, isShow: any) => {
        if (!isShow && global.service.browserWindowList()['master'].isDestroyed()) {
            if (!global.isValidToken) {
                masterWindow = new WindowManages.master(null, true).created();
                signWindow   = new WindowManages.sign(false, masterWindow).created();
            } else {
                masterWindow = new WindowManages.master('note', true).created();
            }
        }
    });

}

