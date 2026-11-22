import { promises as fsp } from "fs"
import path from "path"
import util from "util"
import { exec } from "child_process"
import { app, ipcMain } from "electron"
import { mainWindow } from "@main/индекс"
import fs from "fs"
import log from "electron-log"
const execPromise = util.promisify(exec)
console.log = log.log
console.error = log.error
console.warn = log.warn
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}
export async function executePowerShell(_, props) {
  const { script, name = "script" } = props
  try {
    const tempDir = path.join(app.getPath("userData"), "scripts")
    ensureDirectoryExists(tempDir)
    const tempFile = path.join(tempDir, `${name}-${Date.now()}.ps1`)
    await fsp.writeFile(tempFile, script)
    const { stdout, stderr } = await execPromise(
      `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tempFile}"`,
    )
    await fsp.unlink(tempFile).catch(console.error)
    if (stderr) {
      console.warn(`Стандартный поток PowerShell [${name}]:`, stderr)
    }
    console.log(`Стандартный вывод PowerShell [${name}]:`, stdout)
    return { success: true, output: stdout }
  } catch (error: any) {
    console.error(`Ошибка выполнения PowerShell [${name}]:`, error)
    return { success: false, error: error.message }
  }
}
async function runPowerShellInWindow(_, { script, name = "script", noExit = true }) {
  try {
    const tempDir = path.join(app.getPath("userData"), "scripts")
    ensureDirectoryExists(tempDir)
    const tempFile = path.join(tempDir, `${name}-${Date.now()}.ps1`)
    await fsp.writeFile(tempFile, script)
    const noExitFlag = noExit ? "-NoExit" : ""
    const command = `запустить powershell.exe ${noExitFlag} -Обход политики выполнения -файл "${tempFile}"`
    exec(command, (error) => {
      if (error) {
        console.error(`Ошибка запуска окна PowerShell [${name}]:`, error)
      }
    })
    return { success: true }
  } catch (error: any) {
    console.error(`Ошибка в runPowerShellInWindow [${name}]:`, error)
    return { success: false, error: error.message }
  }
}
export const setupPowerShellHandlers = (): void => {
  ipcMain.handle("run-powershell-window", runPowerShellInWindow)
  ipcMain.handle("run-powershell", executePowerShell)
  ipcMain.handle("check-chocolatey", async (event) => {
    try {
      const result = await executePowerShell(event, {
        script: "Test-Path -Path 'C:\\ProgramData\\chocolatey\\bin\\choco.exe'",
        name: "check-chocolatey",
      })
      if (result.success) {
        const isInstalled = (result.output as string).trim().toLowerCase() === "true"
        return { success: true, installed: isInstalled }
      } else {
        return { success: false, installed: false }
      }
    } catch (error) {
      console.error("Ошибка проверки установки Chocolatey:", error)
      return { success: false, installed: false }
    }
  })
  ipcMain.handle("install-chocolatey", async (event) => {
    try {
      const result = await executePowerShell(event, {
        script: "winget install --id Chocolatey.chocolatey --source winget",
        name: "install-chocolatey",
      })
      if (result.success) {
        return { installed: true, version: (result as any).output.trim() }
      } else {
        return { installed: false }
      }
    } catch (error) {
      console.error("Ошибка установки Chocolatey:", error)
      return { installed: false }
    }
  })
  ipcMain.handle("handle-apps", async (event, { action, apps, source }) => {
    switch (action) {
      case "install":
        for (const app of apps) {
          let command
          if (source === "Chocolatey") {
            command = `шоколадная установка ${app} -y --no-progress`
          } else {
            command = `winget install ${app} --silent --accept-package-agreements --accept-source-agreements`
          }
          if (!mainWindow) throw new Error("Главное окно недоступно")
          mainWindow.webContents.send("install-progress", `${app}`)
          const result = await executePowerShell(event, { script: command, name: `Установить-${app}` })
          const isChocoFailure =
            source === "Chocolatey" &&
            !result.success &&
            result.output &&
            !result.output.includes("уже установлен")
          if (result.success || (result.output && result.output.includes("уже установлен"))) {
            console.log(`${app} успешно установлено.`)
          } else if (isChocoFailure) {
            console.log(`Не удалось выполнить первоначальную установку для ${app}, повторная попытка с флагом --pre.`)
            const retryCommand = `шоколадная установка ${app} -y --no-progress --pre`
            const retryResult = await executePowerShell(event, {
              script: retryCommand,
              name: `Установить-${app}-pre`,
            })
            if (
              retryResult.success ||
              (retryResult.output && retryResult.output.includes("уже установлен"))
            ) {
              console.log(`${app} успешно установлен с флагом --pre.`)
            } else {
              console.error(`Не удалось установить ${app} даже с флагом --pre:`, retryResult.error)
              mainWindow.webContents.send("install-error")
            }
          } else {
            console.error(`Не удалось установить ${app}:`, result.error)
            mainWindow.webContents.send("install-error")
          }
        }
        if (mainWindow) {
          mainWindow.webContents.send("install-complete")
        }
        break
      case "uninstall":
        for (const app of apps) {
          let command
          if (source === "Chocolatey") {
            command = `удаление шоколада ${app} -y --no-progress`
          } else {
            command = `winget удалить ${app} --silent`
          }
          if (!mainWindow) throw new Error("Главное окно недоступно")
          mainWindow.webContents.send("install-progress", `${app}`)
          const result = await executePowerShell(event, {
            script: command,
            name: `Удалить-${app}`,
          })
          if (result.success) {
            console.log(`${app} успешно удален.`)
          } else {
            console.error(`Не удалось удалить ${app}:`, result.error)
            mainWindow.webContents.send("install-error")
          }
        }
        if (mainWindow) {
          mainWindow.webContents.send("install-complete")
        }
        break
      case "check-installed":
        try {
          const result = await executePowerShell(event, {
            script: "список вингетов",
            name: "check-installed",
          })
          if (!result.success) {
            throw new Error(result.error)
          }
          const escapeRegExp = (string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
          }
          const installedAppIds = apps.filter((appId) => {
            const regex = new RegExp(`\\b${escapeRegExp(appId)}\\b`, "i")
            return regex.test((result as any).output)
          })
          if (mainWindow) {
            mainWindow.webContents.send("installed-apps-checked", {
              success: true,
              installed: installedAppIds,
            })
          }
        } catch (error) {
          console.error("Не удалось проверить установленные приложения:", error)
          if (mainWindow) {
            mainWindow.webContents.send("installed-apps-checked", {
              success: false,
              error: (error as any).message,
            })
          }
        }
        break
      default:
        console.error(`Неизвестное действие: ${action}`)
    }
  })
  console.log("[Sparkle main/powershell.ts]: настройка обработчиков PowerShell завершена.")
}
export const cleanupPowerShellHandlers = (): void => {
  ipcMain.removeHandler("run-powershell-window")
  ipcMain.removeHandler("run-powershell")
  ipcMain.removeHandler("check-chocolatey")
  ipcMain.removeHandler("install-chocolatey")
  ipcMain.removeHandler("handle-apps")
}