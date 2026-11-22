import { useState, useMemo, Suspense } from "react"
import data from "../assets/apps.json"
import RootDiv from "@/компоненты/rootdiv"
import { Search } from "lucide-react"
import Button from "@/компоненты/ui/кнопка"
import Checkbox from "@/comComponents/ui/Флажок"
import Modal from "@/компоненты/ui/модальный"
import { invoke } from "@/lib/электрон"
import { Download } from "lucide-react"
import { Trash } from "lucide-react"
import { ExternalLink } from "lucide-react"
import { toast } from "react-toastify"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import log from "electron-log/renderer"
import { Upload } from "lucide-react"
import Card from "@/comComponents/ui/Карта"
import { LargeInput } from "@/компоненты/ui/вход"
import { Dropdown } from "@/компоненты/ui/выпадающий список"
import useAppInstallStore from "@/store/appInstallStore"
import logo from "../../../../resources/sparklelogo.png"
interface AppData {
  name: string
  id: string | string[]
  chocolatey?: string
  category: string
  info: string
  link?: string
  icon: string
  warning?: string
}
interface AppsByCategory {
  [key: string]: AppData[]
}
interface InvokeResult {
  success: boolean
  installed?: boolean
  error?: string
}
function Apps() {
  const [search, setSearch] = useState("")
  const [selectedApps, setSelectedApps] = useState<string[]>([])
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importedApps, setImportedApps] = useState<string[]>([])
  const [selectedImportedApps, setSelectedImportedApps] = useState<string[]>([])
  const [appsList, setAppsList] = useState<AppData[]>([])
  const [wingetInstalled, setWingetInstalled] = useState<boolean>(true)
  const [wingetChecking, setWingetChecking] = useState<boolean>(false)
  const [wingetInstalling, setWingetInstalling] = useState<boolean>(false)
  const [source, setSource] = useState<"Chocolatey" | "Winget">(
    (localStorage.getItem("defaultPackageManager") as "Chocolatey" | "Winget") || "Winget",
  )
  const [chocolateyInstalled, setChocolateyInstalled] = useState<boolean>(true)
  const [chocolateyChecking, setChocolateyChecking] = useState<boolean>(false)
  const [chocolateyInstalling, setChocolateyInstalling] = useState<boolean>(false)
  const { addApp, apps: installingApps, setAction } = useAppInstallStore()
  const router = useNavigate()
  const filteredApps = appsList
    .filter((app: AppData) => app.name.toLowerCase().includes(search.toLowerCase()))
    .filter((app: AppData) => {
      if (source === "Chocolatey") {
        return (app as any).chocolatey !== undefined
      }
      return true
    })
  const getAppIdForSource = (app: AppData): string => {
    if (source === "Chocolatey" && app.chocolatey) {
      return app.chocolatey
    }
    return Array.isArray(app.id) ? app.id[0] : app.id
  }
  const exportSelectedApps = () => {
    const blob = new Blob([JSON.stringify(selectedApps, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sparkle-apps.json"
    a.click()
    URL.revokeObjectURL(url)
  }
  const importSelectedApps = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        if (!e.target?.result) throw new Error("Ошибка чтения файла")
        const parsed = JSON.parse(e.target.result as string)
        if (Array.isArray(parsed)) {
          setImportedApps(parsed)
          setSelectedImportedApps(parsed)
          setImportModalOpen(true)
        } else {
          toast.error("Неверный формат файла импорта")
        }
      } catch {
        toast.error("Не удалось проанализировать файл JSON.")
      } finally {
        event.target.value = ""
      }
    }
    reader.readAsText(file)
  }
  const appsByCategory = useMemo(() => {
    return filteredApps.reduce<AppsByCategory>((acc, app) => {
      if (!acc[app.category]) acc[app.category] = []
      acc[app.category].push(app)
      return acc
    }, {})
  }, [filteredApps])
  const checkWinget = async (): Promise<void> => {
    setWingetChecking(true)
    try {
      const result = (await invoke({ channel: "check-winget" })) as InvokeResult
      if (result.success) {
        setWingetInstalled(result.installed ?? false)
      } else {
        console.warn("Не удалось проверить статус Winget:", result.error)
        setWingetInstalled(false)
      }
    } catch (error) {
      console.error("Ошибка проверки Winget:", error)
      setWingetInstalled(false)
    } finally {
      setWingetChecking(false)
    }
  }
  const installWinget = async (): Promise<void> => {
    setWingetInstalling(true)
    try {
      await invoke({ channel: "install-winget" })
      toast.success("Установка Winget завершена!")
      await checkWinget()
    } catch (error) {
      console.error("Ошибка установки Winget:", error)
      toast.error("Не удалось установить Winget. Пожалуйста, попробуйте еще раз.")
    } finally {
      setWingetInstalling(false)
    }
  }
  const checkChocolatey = async (): Promise<void> => {
    setChocolateyChecking(true)
    try {
      const result = (await invoke({ channel: "check-chocolatey" })) as InvokeResult
      if (result.success) {
        setChocolateyInstalled(result.installed ?? false)
      } else {
        console.warn("Не удалось проверить статус Chocolatey:", result.error)
        setChocolateyInstalled(false)
      }
    } catch (error) {
      console.error("Ошибка проверки Шоколадки:", error)
      setChocolateyInstalled(false)
    } finally {
      setChocolateyChecking(false)
    }
  }
  const installChocolatey = async (): Promise<void> => {
    setChocolateyInstalling(true)
    try {
      await invoke({ channel: "install-chocolatey" })
      toast.success("Шоколадная установка завершена!")
      await checkChocolatey()
    } catch (error) {
      console.error("Ошибка установки Chocolatey:", error)
      toast.error("Не удалось установить Chocolatey. Пожалуйста, попробуйте еще раз.")
    } finally {
      setChocolateyInstalling(false)
    }
  }
  const toggleApp = (appId: string): void => {
    setSelectedApps((prev) =>
      prev.includes(appId) ? prev.filter((selectedId) => selectedId !== appId) : [...prev, appId],
    )
  }
  useEffect(() => {
    const loadApps = async () => {
      try {
        let appsData: { apps: AppData[] }
        if (import.meta.env.DEV) {
          appsData = data as { apps: AppData[] }
        } else {
          const response = await fetch(
            "https://raw.githubusercontent.com/parcoil/sparkle/refs/heads/v2/src/renderer/src/assets/apps.json",
          )
          appsData = await response.json()
        }
        setAppsList(appsData.apps || [])
      } catch (error) {
        console.error("Не удалось загрузить список приложений.", error)
        toast.error("Failed to fetch apps list (Using local apps.json)")
        setAppsList((data as { apps: AppData[] }).apps || [])
      }
    }
    loadApps()
    checkWinget()
    checkChocolatey()
  }, [])
  useEffect(() => {
    setSelectedApps([])
    if (source === "Chocolatey") {
      checkChocolatey()
    }
  }, [source])
  const handleAppAction = async (type: string, appsToUse = selectedApps) => {
    if (appsToUse.length === 0) return
    const actionType = type as "install" | "uninstall"
    setAction(actionType)
    appsToUse.forEach((appId) => {
      const app = appsList.find((a) => getAppIdForSource(a) === appId)
      addApp(appId, app?.name || appId)
    })
    try {
      invoke({
        channel: "handle-apps",
        payload: {
          action: type,
          apps: appsToUse,
          source: source,
        },
      })
    } catch (error) {
      console.error(`Ошибка приложения ${type === "install" ? "installing" : "uninstalling"}:`, error)
      log.error(`Ошибка приложения ${type === "install" ? "installing" : "uninstalling"}:`, error)
    }
  }
  return (
    <>
      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)}>
        <div className="bg-sparkle-card border border-sparkle-border rounded-2xl p-6 тень-xl max-w-lg w-full mx-4">
          <h3 className="текст-xl шрифт-полужирный текст-блеск-текст mb-3">
            Import Apps ({importedApps.length})
          </h3>
          <div className="text-sparkle-text-вторичный text-sm Leading-6 пробел-pre-wrap max-h-64 overflow-y-auto пользовательская полоса прокрутки mb-6">
            {importedApps.length > 0 ? (
              <ul className="space-y-2 max-h-60 overflow-y-auto пользовательская полоса прокрутки">
                {importedApps.map((id) => {
                  const app = appsList.find((a) => a.id === id)
                  return (
                    <li key={id} className="гибкий элемент-центр разрыв-2 текст-блеск-текст">
                      <Checkbox
                        checked={selectedImportedApps.includes(id)}
                        onChange={(checked: boolean) => {
                          setSelectedImportedApps((prev) => {
                            if (checked) {
                              return prev.includes(id) ? prev : [...prev, id]
                            } else {
                              return prev.filter((x) => x !== id)
                            }
                          })
                        }}
                      />
                      {app ? app.name : `Неизвестное приложение (${id})`}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sparkle-text-вторичный курсив">No apps found in file</p>
            )}
          </div>
          <div className="гибкий выравнивание-зазор-3">
            <Button variant="secondary" onClick={() => setImportModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={selectedImportedApps.length === 0}
              onClick={() => {
                setSelectedApps(selectedImportedApps)
                setImportModalOpen(false)
                handleAppAction("install", selectedImportedApps)
              }}
            >
              Install Selected
            </Button>
          </div>
        </div>
      </Modal>
      <RootDiv>
        <LargeInput
          icon={Search}
          placeholder={`Найти приложения ${filteredApps.length}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {!wingetInstalled && (
          <Card className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 w-full mt-5 flex gap-4 items-center">
            <div className="p-3 bg-amber-500/10 округлый-LG">
              <Download className="text-amber-500" size={24} />
            </div>
            <div className="flex-1">
              <h1 className="шрифт-средний текст-блеск-текст">Winget Not Installed</h1>
              <p className="text-sparkle-text-secondary">
                Winget is required to install and manage apps. Click the button to install it.
              </p>
            </div>
            <div className="ml-auto">
              <Button
                variant="outline"
                className="flex items-centergap-2 border-amber-500/20 hover:bg-amber-500/10"
                onClick={installWinget}
                disabled={wingetInstalling || wingetChecking}
              >
                {wingetInstalling ? (
                  <>
                    <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    Installing...
                  </>
                ) : wingetChecking ? (
                  <>Checking...</>
                ) : (
                  <>
                    <Download size={18} /> Install Winget
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
        {source === "Chocolatey" && !chocolateyInstalled && (
          <Card className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 w-full mt-5 flex gap-4 items-center">
            <div className="p-3 bg-amber-500/10 округлый-LG">
              <Download className="text-amber-500" size={24} />
            </div>
            <div className="flex-1">
              <h1 className="шрифт-средний текст-блеск-текст">Chocolatey Not Installed</h1>
              <p className="text-sparkle-text-secondary">
                Chocolatey is required to install and manage apps with this source. Click the button
                to install it.
              </p>
            </div>
            <div className="ml-auto">
              <Button
                variant="outline"
                className="flex items-centergap-2 border-amber-500/20 hover:bg-amber-500/10"
                onClick={installChocolatey}
                disabled={chocolateyInstalling || chocolateyChecking}
              >
                {chocolateyInstalling ? (
                  <>
                    <div className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                    Installing...
                  </>
                ) : chocolateyChecking ? (
                  <>Checking...</>
                ) : (
                  <>
                    <Download size={18} /> Install Chocolatey
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
        <div className="гибкий зазор-3 мт-5 с авто мл-1 мр-1">
          <Button
            className="text-sparkle-text гибкий разрыв-2"
            disabled={selectedApps.length === 0 || installingApps.length > 0}
            onClick={() => handleAppAction("install")}
          >
            <Download className="w-5" />
            Install Selected
          </Button>
          <Button
            className="гибкий зазор-2"
            variant="danger"
            disabled={selectedApps.length === 0 || installingApps.length > 0}
            onClick={() => handleAppAction("uninstall")}
          >
            <Trash className="w-5" />
            Uninstall Selected
          </Button>
          <Button
            className="гибкий зазор-2"
            onClick={exportSelectedApps}
            disabled={selectedApps.length === 0}
          >
            <Download className="w-5" />
            Export List
          </Button>
          <label className="flex-gap-2 курсор-указатель bg-sparkle-border text-sparkle-text округлый-lg шрифт-средний px-3 py-1.5 text-sm text-center items-center active:scale-90 hover:bg-sparkle-вторичный переход-все длительность-200">
            <Upload className="w-5" />
            Import List
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={importSelectedApps}
            />
          </label>
          {selectedApps.length > 0 && (
            <Button
              className="flex-gap-2 ml-auto bg-sparkle-border text-sparkle-text"
              variant="secondary"
              onClick={() => setSelectedApps([])}
            >
              Uncheck All
            </Button>
          )}
        </div>
        <p className="mb-2 mt-2 text-sparkle-text-muted средний шрифт">
          Looking to debloat windows? its located in {""}
          <a className="текстовый-блеск-первичный указатель курсора" onClick={() => router("/tweaks")}>
            Tweaks
          </a>
        </p>
        <div className="flex flex-row разрыв-2 элемента-центр">
          {import.meta.env.DEV && (
            <p className=" текст-красный-500 текст-xs">
              You are in development mode, using local apps.json
            </p>
          )}
          <div className="ml-auto flex gap-2 пункт-центр">
            <p className="text-sparkle-text-muted">Select Source:</p>
            <Dropdown
              options={["Winget", "Chocolatey"]}
              value={source || "Winget"}
              onChange={(value) => setSource(value as "Chocolatey" | "Winget")}
            />
          </div>
        </div>
        <div className="космос-у-10 мб-10">
          <Suspense
            fallback={<div className="текстовый центр text-sparkle-text-вторичный">Loading...</div>}
          >
            {Object.entries(appsByCategory).map(([category, apps]) => (
              <div key={category} className="space-y-4">
                <h2 className="text-2xl text-sparkle-primary шрифт-жирный, писать с заглавной буквы">{category}</h2>
                <div className="сеткаgrid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 зазор-4 mr-4">
                  {apps.map((app) => {
                    const appId = getAppIdForSource(app)
                    return (
                      <Card key={appId} onClick={() => toggleApp(appId)} className="p-4">
                        <div className="Гибкое выравнивание элементов по центру между">
                          <div className="гибкие элементы-центральный зазор-4">
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedApps.includes(appId)}
                                onChange={() => toggleApp(appId)}
                              />
                            </div>
                            <div className="min-w-10 max-w-10 max--h-10 min-h-10 rounded-lg overflow-hidden bg-sparkle-accent flex items-center justify-center">
                              {app.icon ? (
                                <img
                                  src={app.icon}
                                  alt={app.name}
                                  onError={(e) => (e.currentTarget.src = logo)}
                                  className="w-8 h-8 объект-содержащий округлый-MD"
                                />
                              ) : (
                                <img src="" alt="" className="w-6 h-6 непрозрачность-50" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-sparkle-text font-medium group-hover:text-sparkle-primary transition">
                                {app.name}
                              </h3>
                              {app.info && (
                                <p className="text-sm text-sparkle-text-вторичный зажим строки-1 шрифт-полужирный">
                                  {app.info}
                                </p>
                              )}
                              <p className="text-xs text-sparkle-text-вторичный">ID: {appId}</p>
                            </div>
                          </div>
                          {app.link && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                aria-label={`Открыть веб-сайт ${app.name}`}
                                className="ml-3 text-sparkle-primary hover:text-sparkle-text-вторичный переход-непрозрачность"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  try {
                                    window.open(app.link, "_blank")
                                  } catch (err) {
                                    console.error("Не удалось открыть внешнюю ссылку", err)
                                  }
                                }}
                              >
                                <ExternalLink className="ш-4 ч-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </Suspense>
          <p className="текстовый центр">
            Request more apps or make a pull request on{" "}
            <a
              href="https://github.com/Parcoil/Sparkle"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sparkle-primary"
            >
              github
            </a>
          </p>
        </div>
      </RootDiv>
    </>
  )
}
export default Apps
