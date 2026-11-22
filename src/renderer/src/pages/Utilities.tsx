import RootDiv from "@/компоненты/rootdiv"
import Button from "@/компоненты/ui/кнопка"
import Card from "@/comComponents/ui/Карта"
import Toggle from "@/компоненты/ui/переключить"
import {
  GpuIcon,
  HardDrive,
  Monitor,
  GlobeIcon,
  Zap,
  Computer,
  Volume2Icon,
  WifiIcon,
  Wrench,
  Star,
  NetworkIcon,
  BluetoothIcon,
  SearchIcon,
} from "lucide-react"
import { useState, useEffect } from "react"
import { invoke } from "@/lib/электрон"
import { toast } from "react-toastify"
import log from "electron-log/renderer"
import { Dropdown } from "@/компоненты/ui/выпадающий список"
import Modal from "@/компоненты/ui/модальный"
import { LargeInput } from "@/компоненты/ui/вход"
type Utility = {
  name: string
  command?: string
  description: string
  state: boolean
  icon: React.ReactNode
  type: "button" | "toggle" | "dropdown"
  buttonText?: string
  options?: string[]
  checkScript?: string
  applyScript?: string | Record<string, string>
  unapplyScript?: string
  runScript?: string
}
const utilities: Utility[] = [
  {
    name: "Очиститель дисков",
    command: "cleanmgr",
    description: "Освободите место, удалив ненужные файлы.",
    state: true,
    icon: <HardDrive />,
    type: "button",
    buttonText: "Очистить сейчас",
    runScript: "Cleanmgr /sagerun:1",
  },
  {
    name: "Разумное хранение",
    description: "Автоматически освобождайте место, удаляя ненужные файлы.",
    state: true,
    icon: <Computer />,
    type: "toggle",
    checkScript: `
$path = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy"
if (Test-Path $path) {
  $value = Get-ItemProperty -Path $path -Name "01" -ErrorAction SilentlyContinue
  if ($value."01" -eq 1) { Write-Output "enabled" } else { Write-Output "disabled" }
} else {
  Write-Output "disabled"
}`,
    applyScript: `
$path = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy"
if (-not (Test-Path $path)) {
  New-Item -Path $path -Force | Out-Null
}
Set-ItemProperty -Path $path -Name "01" -Value 1`,
    unapplyScript: `
$path = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy"
if (Test-Path $path) {
  Set-ItemProperty -Path $path -Name "01" -Value 0
}`,
  },
  {
    name: "Информация о системе",
    command: "msinfo32",
    description: "Просмотр подробной информации о вашей системе.",
    state: false,
    icon: <Monitor />,
    type: "button",
    buttonText: "Посмотреть информацию",
    runScript: "msinfo32",
  },
  {
    name: "Быстрый запуск",
    description: "Увеличьте время загрузки за счет оптимизации параметров запуска.",
    state: false,
    icon: <Zap />,
    type: "toggle",
    checkScript: `
$path = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power"
if (Test-Path $path) {
    $value = Get-ItemProperty -Path $path -Name "HiberbootEnabled" -ErrorAction SilentlyContinue
    if ($value.HiberbootEnabled -eq 1) { Write-Output "enabled" } else { Write-Output "disabled" }
} else {
    Write-Output "disabled"
}`,
    applyScript: `
powercfg /hibernate on
$path = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power"
if (!(Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
Set-ItemProperty -Path $path -Name "HiberbootEnabled" -Type DWord -Value 1
`,
    unapplyScript: `
$path = "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power"
if (Test-Path $path) { Set-ItemProperty -Path $path -Name "HiberbootEnabled" -Type DWord -Value 0 }
`,
  },
  {
    name: "Графический драйвер",
    description: "Перезапустите графический драйвер, чтобы устранить проблемы с отображением.",
    state: false,
    icon: <GpuIcon />,
    type: "button",
    buttonText: "Restart",
    runScript: `
$gpus = Get-PnpDevice -Class Display -Status OK -ErrorAction SilentlyContinue
if ($gpus) {
    foreach ($gpu in $gpus) {
        Write-Output "Restarting $($gpu.FriendlyName)..."
        Disable-PnpDevice -InstanceId $gpu.InstanceId -Confirm:$false
        Start-Sleep -Seconds 2
        Enable-PnpDevice -InstanceId $gpu.InstanceId -Confirm:$false
    }
    Write-Output "Graphics driver restart completed."
} else {
    Write-Output "No active display devices found."
}
`,
  },
  {
    name: "Поиск Windows и пользовательский интерфейс",
    description: "Перезапустите поиск Windows и пользовательский интерфейс, чтобы устранить проблемы с отображением. (Может занять некоторое время)",
    state: false,
    icon: <Monitor />,
    type: "button",
    buttonText: "Restart",
    runScript: `
try {
    Get-AppxPackage Microsoft.Windows.Search | Reset-AppxPackage
    Write-Output "Microsoft.Windows.Search restart completed."
}
catch {
    Write-Output "An error occured while resetting Microsoft.Windows.Search."
}
try {
    Get-AppxPackage MicrosoftWindows.Client.CBS | Reset-AppxPackage
    Write-Output "MicrosoftWindows.Client.CBS restart completed."
}
catch {
    Write-Output "An error occured while resetting MicrosoftWindows.Client.CBS."
}
`,
  },
  {
    name: "План электропитания",
    description: "Выберите, как ваш компьютер будет управлять питанием и производительностью.",
    state: false,
    icon: <Monitor />,
    type: "dropdown",
    options: ["Balanced", "Высокая производительность", "Экономия энергии", "Максимальная производительность"],
    checkScript: `
$current = powercfg /getactivescheme
if ($current -match "Power saver") { Write-Output "Power Saver" }
elseif ($current -match "High performance") { Write-Output "High Performance" }
elseif ($current -match "Ultimate Performance") { Write-Output "Ultimate Performance" }
else { Write-Output "Balanced" }
`,
    applyScript: {
      Balanced: `powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e`,
      "Высокая производительность": `powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c`,
      "Экономия энергии": `powercfg /setactive a1841308-3541-4fab-bc81-f71556f20b4a`,
      "Максимальная производительность": `
$ultimatePlan = powercfg -l | Select-String "Ultimate Performance"
if (-not $ultimatePlan) {
    Write-Host "Ultimate Performance plan not found. Creating..."
    powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61
} else {
    Write-Host "Ultimate Performance plan already exists."
}
$ultimatePlanGUID = (powercfg -l | Select-String "Ultimate Performance").ToString().Split()[3]
if ($ultimatePlanGUID) {
    powercfg -setactive $ultimatePlanGUID 2>$null
    Write-Host "Ultimate Performance power plan is now active."
} else {
    Write-Host "Failed to find Ultimate Performance plan GUID."
}
`,
    },
  },
  {
    name: "Очистить DNS-кеш",
    command: "ipconfig /flushdns",
    description: "Устраните проблемы с подключением, очистив кэш преобразователя DNS.",
    state: false,
    icon: <GlobeIcon />,
    type: "button",
    buttonText: "Flush",
    runScript: `
ipconfig /flushdns
Вывод записи «DNS-кэш очищен».
`,
  },
  {
    name: "Выпустить IP",
    command: "ipconfig/выпуск",
    description: "Освободите свой текущий IP-адрес и временно отключитесь от сети.",
    state: false,
    icon: <NetworkIcon />,
    type: "button",
    buttonText: "Release",
    runScript: `
ipconfig/выпуск
Вывод записи «IP-адрес освобожден. Вы временно отключены от сети».
`,
  },
  {
    name: "Продлить IP",
    command: "ipconfig /обновить",
    description: "Запросите новый IP-адрес у DHCP-сервера.",
    state: false,
    icon: <NetworkIcon />,
    type: "button",
    buttonText: "Renew",
    runScript: `
ipconfig /обновить
Вывод записи: «Новый IP-адрес получен успешно».
`,
  },
  {
    name: "Исправить Bluetooth",
    description: "Перезапустите службы Bluetooth, чтобы устранить проблемы с подключением.",
    state: false,
    icon: <BluetoothIcon />,
    type: "button",
    buttonText: "Fix",
    runScript: `
Stop-Service -Name "bthserv" -Force -ErrorAction SillyContinue
Пуск-Сервис-Имя «bthserv»-ErrorAction SillyContinue
Вывод записи «Службы Bluetooth перезапущены».
`,
  },
  {
    name: "Проверка системных файлов",
    command: "СФЦ /сканноу",
    description: "Восстановите поврежденные системные файлы для повышения стабильности.",
    state: false,
    icon: <Wrench />,
    type: "button",
    buttonText: "Repair",
    runScript: `
Start-Process powershell -ArgumentList "-NoExit", "-Command", "sfc /scannow; Write-Output 'Проверка системных файлов завершена'"
`,
  },
  {
    name: "Восстановление работоспособности DISM",
    command: "Dism / восстановление здоровья",
    description: "Используйте DISM для восстановления образа Windows и устранения системных проблем.",
    state: false,
    icon: <Star />,
    type: "button",
    buttonText: "Repair",
    runScript: `
Start-Process powershell -ArgumentList «-NoExit», «-Command», «dism /online /cleanup-image /restorehealth; вывод записи «Восстановление работоспособности DISM завершено»»
`,
  },
  {
    name: "Проверить диск",
    command: "chkdsk",
    description: "Проверьте и исправьте ошибки диска в вашей системе.",
    state: false,
    icon: <HardDrive />,
    type: "button",
    buttonText: "Check",
    runScript: `
Powershell Start-Process -ArgumentList "-NoExit", "-Command", "chkdsk /f /r /x; Write-Output 'Проверка диска завершена'"
`,
  },
  {
    name: "Перезапустить аудиослужбу",
    description: "Устраните проблемы со звуком, перезапустив Windows Audio.",
    state: false,
    icon: <Volume2Icon />,
    type: "button",
    buttonText: "Restart",
    runScript: `
Stop-Service -Name «Audiosrv» -Force -ErrorAction SillyContinue
Пуск-Сервис-Имя «Audiosrv»-ErrorAction SillyContinue
Вывод записи «Аудиосервис перезапущен».
`,
  },
  {
    name: "Сброс сети",
    command: "netsh",
    description: "Сбросьте сетевой стек, чтобы устранить проблемы с подключением.",
    state: false,
    icon: <WifiIcon />,
    type: "button",
    buttonText: "Reset",
    runScript: `
сброс netsh winsock
netsh int IP сброс
Вывод записи «Сброс сетевого стека. Перезагрузите компьютер, чтобы применить изменения».
`,
  },
]
function Utilities() {
  const [dropdownValues, setDropdownValues] = useState<Record<string, string>>({})
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({})
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState("")
  const filteredUtilities = utilities.filter(
    (util) =>
      util.name.toLowerCase().includes(search.toLowerCase()) ||
      util.description.toLowerCase().includes(search.toLowerCase()),
  )
  useEffect(() => {
    if (localStorage.getItem("utilitiesModalShown") !== "true") {
      setModalOpen(true)
    }
  }, [])
  useEffect(() => {
    const checkAllStates = async () => {
      const checkPromises = utilities.map(async (util) => {
        if (util.type === "toggle" && util.checkScript) {
          setLoadingStates((prev) => ({ ...prev, [util.name]: true }))
          try {
            const result = await invoke({
              channel: "run-powershell",
              payload: {
                script: util.checkScript,
                name: `проверьте-${util.name}`,
              },
            })
            if (result.success) {
              const isEnabled = result.output.trim().toLowerCase() === "enabled"
              setToggleStates((prev) => ({ ...prev, [util.name]: isEnabled }))
            }
          } catch (error) {
            console.error(`Не удалось проверить ${util.name}:`, error)
            log.error(`Не удалось проверить ${util.name}:`, error)
          } finally {
            setLoadingStates((prev) => ({ ...prev, [util.name]: false }))
          }
        } else if (util.type === "dropdown" && util.checkScript) {
          setLoadingStates((prev) => ({ ...prev, [util.name]: true }))
          try {
            const result = await invoke({
              channel: "run-powershell",
              payload: {
                script: util.checkScript,
                name: `проверьте-${util.name}`,
              },
            })
            if (result.success) {
              const value = result.output.trim()
              setDropdownValues((prev) => ({ ...prev, [util.name]: value }))
            }
          } catch (error) {
            console.error(`Не удалось проверить ${util.name}:`, error)
            log.error(`Не удалось проверить ${util.name}:`, error)
          } finally {
            setLoadingStates((prev) => ({ ...prev, [util.name]: false }))
          }
        }
      })
      await Promise.all(checkPromises)
    }
    checkAllStates()
  }, [])
  const handleToggleChange = async (util: Utility, newState: boolean) => {
    toast.dismiss()
    const previousState = toggleStates[util.name]
    setToggleStates((prev) => ({ ...prev, [util.name]: newState }))
    const script = newState ? util.applyScript : util.unapplyScript
    if (script) {
      const loadingToastId = toast.loading(
        `${newState ? "Applying" : "Unapplying"} ${util.name}...`,
      )
      try {
        const result = await invoke({
          channel: "run-powershell",
          payload: {
            script,
            name: `${newState ? "apply" : "unapply"}-${util.name}`,
          },
        })
        if (!result.success) {
          throw new Error(result.error || "Не удалось выполнить скрипт")
        }
        toast.update(loadingToastId, {
          render: `${newState ? "Applied" : "Unapplied"} ${util.name}`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        })
      } catch (error) {
        console.error(`Ошибка переключения ${util.name}:`, error)
        log.error(`Ошибка переключения ${util.name}:`, error)
        setToggleStates((prev) => ({ ...prev, [util.name]: previousState }))
        toast.update(loadingToastId, {
          render: `Не удалось ${newState ? "apply" : "unapply"} ${util.name}`,
          type: "error",
          isLoading: false,
          autoClose: 3000,
        })
      }
    }
  }
  const handleDropdownChange = async (util: Utility, value: string) => {
    toast.dismiss()
    const previousValue = dropdownValues[util.name]
    setDropdownValues((prev) => ({ ...prev, [util.name]: value }))
    if (util.applyScript) {
      const script =
        typeof util.applyScript === "object" ? util.applyScript[value] : util.applyScript
      if (script) {
        const loadingToastId = toast.loading(`Применение ${util.name}: ${value}...`)
        try {
          const result = await invoke({
            channel: "run-powershell",
            payload: {
              script,
              name: `применить-${util.name}-${value}`,
            },
          })
          if (!result.success) {
            throw new Error(result.error || "Не удалось выполнить скрипт")
          }
          toast.update(loadingToastId, {
            render: `Применено ${util.name}: ${value}`,
            type: "success",
            isLoading: false,
            autoClose: 3000,
          })
        } catch (error) {
          console.error(`Ошибка применения ${util.name}:`, error)
          log.error(`Ошибка применения ${util.name}:`, error)
          setDropdownValues((prev) => ({ ...prev, [util.name]: previousValue }))
          toast.update(loadingToastId, {
            render: `Не удалось применить ${util.name}: ${value}.`,
            type: "error",
            isLoading: false,
            autoClose: 3000,
          })
        }
      }
    }
  }
  const handleButtonClick = async (util: Utility) => {
    toast.dismiss()
    if (util.runScript) {
      const loadingToastId = toast.loading(`Запуск ${util.name}...`)
      try {
        const result = await invoke({
          channel: "run-powershell",
          payload: {
            script: util.runScript,
            name: `запустить-${util.name}`,
          },
        })
        if (!result.success) {
          throw new Error(result.error || "Не удалось выполнить скрипт")
        }
        toast.update(loadingToastId, {
          render: `${util.name} завершено`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        })
      } catch (error) {
        console.error(`Ошибка при запуске ${util.name}:`, error)
        log.error(`Ошибка при запуске ${util.name}:`, error)
        toast.update(loadingToastId, {
          render: `Не удалось запустить ${util.name}.`,
          type: "error",
          isLoading: false,
          autoClose: 3000,
        })
      }
    }
  }
  return (
    <>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="bg-sparkle-card border border-sparkle-border rounded-2xl p-8shadow-2xl max-w-lg w-full mx-4 flex flex-col items-center text-center">
          <h1 className="текст-3xl шрифт-жирный текст-блеск-текст mb-4">
            What's New in the Utilities Page
          </h1>
          <p className="text-sparkle-text-secondary mb-6">
            We've redesigned the Utilities page to be more useful and powerful.
          </p>
          <p className="текст-блеск-текст-вторичный mb-4 text-sm">
            - Each utility now shows detailed descriptions and has new controls like toggles,
            buttons, or dropdowns.
            <br />
            <br />
            - Utilities run or apply settings directly using PowerShell scripts behind the scenes.
            <br />
            <br />
            - The settings sync with your Windows always reflecting your current configuration no
            matter where you toggle these settings.
            <br />
            <br />
            <p className="text-sparkle-primary">
              - You can now manage Windows updates, restart graphics drivers, reset network, and
              more.
            </p>
            <br /> <br />
          </p>
          <div className="flex flex-col sm:flex-rowgap-4 w-full justify-center">
            <Button
              onClick={() => {
                setModalOpen(false)
                localStorage.setItem("utilitiesModalShown", "true")
              }}
            >
              Got it
            </Button>
          </div>
        </div>
      </Modal>
      <RootDiv>
        <div className="гибкий зазор-4 гибкий кол mb-10 мр-4">
          <LargeInput
            placeholder="Поиск утилит..."
            className="w-full"
            icon={SearchIcon}
            onChange={(e) => setSearch(e.target.value)}
            value={search}
          />
          {filteredUtilities.length === 0 && (
            <p className="text-sparkle-text-вторичный flex text-center элементы-центр выравнивания-центр разрыв-2">
              No utilities match your search.
            </p>
          )}
          {filteredUtilities !== null &&
            filteredUtilities.map((util) => {
              return (
                <Card className="p-4 гибкие элементы-центральный зазор-4" key={util.name}>
                  {util.icon}
                  <div>
                    <div className="Гибкий разрыв-3 элемента-центра">
                      <h1>{util.name}</h1>{" "}
                      {util.command && (
                        <p className="text-xs text-sparkle-primary">CMD: {util.command}</p>
                      )}
                    </div>
                    <p className="текст-см текст-блеск-текст-вторичный">{util.description}</p>
                  </div>
                  <div className="Flex Justify-End мл-авто">
                    {util.type === "toggle" &&
                      (loadingStates[util.name] ? (
                        <div className="w-6 h-6 border-2 border-sparkle-border-вторичная граница-t-sparkle-primary округленная-полная анимация-вращение" />
                      ) : (
                        <Toggle
                          checked={toggleStates[util.name] || false}
                          onChange={(checked: boolean) => handleToggleChange(util, checked)}
                        />
                      ))}
                    {util.type === "button" && (
                      <Button onClick={() => handleButtonClick(util)}>{util.buttonText}</Button>
                    )}
                    {util.type === "dropdown" &&
                      (loadingStates[util.name] ? (
                        <div className="w-6 h-6 border-2 border-sparkle-border-вторичная граница-t-sparkle-primary округленная-полная анимация-вращение" />
                      ) : (
                        <Dropdown
                          options={util.options || []}
                          value={dropdownValues[util.name] || util.options?.[0] || ""}
                          onChange={(value) => handleDropdownChange(util, value)}
                        />
                      ))}
                  </div>
                </Card>
              )
            })}
        </div>
      </RootDiv>
    </>
  )
}
export default Utilities