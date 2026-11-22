import { Tray, Menu, app, BrowserWindow } from "electron"
import path from "path"
export function createTray(mainWindow: BrowserWindow): Tray {
  const tray = new Tray(path.join(__dirname, "../../resources/sparkle2.ico"))
  const contextMenu = Menu.buildFromTemplate([
    { label: "Открытое окно", click: (): void => mainWindow.show() },
    { label: "Quit", click: (): void => app.quit() },
  ])
  tray.setToolTip("Блестящий оптимизатор")
  tray.setTitle("Блестящий оптимизатор")
  tray.setContextMenu(contextMenu)
  tray.on("click", (): void => ToggleWindowState(mainWindow))
  return tray
}
function ToggleWindowState(mainWindow: BrowserWindow): void {
  mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
}