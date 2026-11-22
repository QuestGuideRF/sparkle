import { app, shell, BrowserWindow, ipcMain, Tray } from "electron"
import path, { join } from "path"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import log from "electron-log"
import { createTray } from "@main/tray"
import { setupPowerShellHandlers } from "@main/powershell"
import { setupSystemHandlers } from "@main/система"
import { setupTweaksHandlers } from "@main/tweakHandler"
import { setupDNSHandlers } from "@main/dnsHandler"
import { setupBackupHandlers } from "@main/резервное копирование"
import { initAutoUpdater } from "@main/обновления"
import Store from "electron-store"
console.log = log.log
console.error = log.error
console.warn = log.warn
export const logo = "[Искорка]:"
log.initialize()
const store = new Store()
let trayInstance: Tray | null = null
if (store.get("showTray") === undefined) {
  store.set("showTray", false)
}
ipcMain.handle("tray:get", () => {
  return store.get("showTray")
})
ipcMain.handle("tray:set", (_event: Electron.IpcMainInvokeEvent, value: boolean) => {
  store.set("showTray", value)
  if (mainWindow) {
    if (value) {
      if (!trayInstance) {
        trayInstance = createTray(mainWindow)
      }
    } else {
      if (trayInstance) {
        trayInstance.destroy()
        trayInstance = null
      }
    }
  }
  return store.get("showTray")
})
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}
export let mainWindow: BrowserWindow | null = null
function createWindow(): void {
  console.log("[Sparkle]: вызывается createWindow")
  console.log("[Искорка]: __dirname =", __dirname)
  console.log("[Сверкание]: путь к значку =", path.join(__dirname, "../../resources/sparkle2.ico"))
  console.log("[Sparkle]: путь предварительной загрузки =", join(__dirname, "../preload/index.js"))
  console.log("[Sparkle]: путь рендеринга =", join(__dirname, "../renderer/index.html"))
  try {
    mainWindow = new BrowserWindow({
      width: 1380,
      backgroundColor: "#0c121f",
      height: 760,
      minWidth: 790,
      center: true,
      frame: false,
      show: false,
      autoHideMenuBar: true,
      icon: path.join(__dirname, "../../resources/sparkle2.ico"),
      webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
        devTools: app.isPackaged ? false : true,
        sandbox: false,
      },
    })
    console.log("[Sparkle]: окно браузера создано.")
  } catch (err: any) {
    console.error("[Sparkle]: не удалось создать BrowserWindow:", err)
    throw err
  }
  mainWindow.webContents.setWindowOpenHandler((details: Electron.HandlerDetails) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    console.log("[Sparkle]: загрузка средства визуализации с URL-адреса:", process.env["ELECTRON_RENDERER_URL"])
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    console.log("[Sparkle]: загрузка рендерера из файла.")
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }
  mainWindow.once("ready-to-show", () => {
    console.log("[Sparkle]: окно готово к показу.")
    mainWindow!.show()
  })
  mainWindow.webContents.on(
    "did-fail-load",
    (_event: Electron.Event, errorCode: number, errorDescription: string) => {
      console.error("[Sparkle]: Не удалось загрузить рендерер:", errorCode, errorDescription)
    },
  )
}
app.commandLine.appendSwitch("no-sandbox")
app
  .whenReady()
  .then(() => {
    console.log("[Sparkle]: Приложение готово, создается окно...")
    try {
      createWindow()
      console.log("[Sparkle]: окно успешно создано.")
    } catch (err: any) {
      console.error("[Sparkle]: не удалось создать окно:", err)
    }
    initAutoUpdater(() => mainWindow)
    console.log("[Sparkle]: программа автоматического обновления инициализирована.")
    if (store.get("showTray")) {
      console.log("[Sparkle]: Создание лотка...")
      try {
        trayInstance = createTray(mainWindow!)
        console.log("[Сверкание]: Лоток создан.")
      } catch (err: any) {
        console.error("[Sparkle]: Не удалось создать лоток:", err)
      }
    }
    setupPowerShellHandlers()
    setupSystemHandlers()
    setupTweaksHandlers()
    setupDNSHandlers()
    setupBackupHandlers()
    console.log("[Sparkle]: настройка обработчиков завершена.")
    electronApp.setAppUserModelId("com.parcoil.sparkle")
    app.on("browser-window-created", (_, window: BrowserWindow) => {
      optimizer.watchWindowShortcuts(window)
    })
    ipcMain.on("window-minimize", () => {
      if (mainWindow) mainWindow.minimize()
    })
    ipcMain.on("window-toggle-maximize", () => {
      if (mainWindow) {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize()
        } else {
          mainWindow.maximize()
        }
      }
    })
    ipcMain.on("window-close", () => {
      if (mainWindow) {
        if (store.get("showTray")) {
          mainWindow.hide()
        } else {
          app.quit()
        }
      }
    })
    app.on("activate", function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  .catch((err: any) => {
    console.error("[Sparkle]: app.whenReady не удалось:", err)
  })