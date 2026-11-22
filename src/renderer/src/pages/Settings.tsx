import RootDiv from "@/компоненты/rootdiv"
import { useEffect, useState } from "react"
import jsonData from "../../../../package.json"
import { invoke } from "@/lib/электрон"
import Button from "@/компоненты/ui/кнопка"
import Modal from "@/компоненты/ui/модальный"
import Toggle from "@/компоненты/ui/переключить"
import { toast } from "react-toastify"
import Card from "@/comComponents/ui/Карта"
import { Dropdown } from "@/компоненты/ui/выпадающий список"
const themes = [
  { label: "System", value: "system" },
  { label: "Dark", value: "dark" },
  { label: "Light", value: "light" },
  { label: "Purple", value: "purple" },
  { label: "Gray", value: "gray" },
  { label: "Classic", value: "classic" },
]
function Settings() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "system")
  const [checking, setChecking] = useState(false)
  const [trayEnabled, setTrayEnabled] = useState(true)
  const [trayLoading, setTrayLoading] = useState(false)
  const [posthogDisabled, setPosthogDisabled] = useState(() => {
    return localStorage.getItem("posthogDisabled") === "true"
  })
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [defaultPackageManager, setDefaultPackageManager] = useState<"Chocolatey" | "Winget">(
    (localStorage.getItem("defaultPackageManager") as "Chocolatey" | "Winget") || "Winget",
  )
  const checkForUpdates = async () => {
    try {
      setChecking(true)
      const res = await invoke({ channel: "updater:check" })
      if (res?.ok && !res.updateInfo) {
        toast.success("Вы в курсе")
      } else if (res?.updateInfo) {
        toast.info(`Доступно обновление: ${res.updateInfo.version}`)
      }
    } catch (e) {
      toast.error(String(e))
    } finally {
      setChecking(false)
    }
  }
  useEffect(() => {
    document.body.classList.remove("light", "purple", "dark", "gray", "classic")
    if (theme === "system") {
      const systemTheme = window.matchMedia("(предпочитает цветовую схему: темную)").matches
        ? "dark"
        : "light"
      document.body.classList.add(systemTheme)
    } else if (theme) {
      document.body.classList.add(theme)
    } else {
      document.body.classList.add("dark")
    }
    localStorage.setItem("theme", theme || "dark")
  }, [theme])
  useEffect(() => {
    invoke({ channel: "tray:get" }).then((status) => setTrayEnabled(status))
  }, [])
  useEffect(() => {
    if (posthogDisabled) {
      document.body.classList.add("ph-no-capture")
    } else {
      document.body.classList.remove("ph-no-capture")
    }
    localStorage.setItem("posthogDisabled", posthogDisabled.toString())
  }, [posthogDisabled])
  const clearCache = async () => {
    await invoke({ channel: "clear-sparkle-cache" })
    localStorage.removeItem("sparkle:systemInfo")
    localStorage.removeItem("sparkle:tweakInfo")
    toast.success("Кэш Sparkle успешно очищен!")
  }
  const handleToggleTray = async () => {
    setTrayLoading(true)
    const newStatus = !trayEnabled
    await invoke({ channel: "tray:set", payload: newStatus })
    setTrayEnabled(newStatus)
    setTrayLoading(false)
  }
  const handleRestartExplorer = async () => {
    try {
      await invoke({ channel: "restart-explorer" })
      toast.success("Проводник успешно перезапущен")
    } catch (e) {
      toast.error("Не удалось перезапустить проводник: " + String(e))
    }
  }
  return (
    <>
      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <div className="bg-sparkle-card border border-sparkle-border rounded-2xl p-8 тень-2xl max-w-md w-full mx-4">
          <div className="текстовый центр mb-6">
            <div className="w-16 h-16 bg-red-500/10 округленные-полные гибкие элементы-центр выравнивания-центр mx-auto mb-4">
              <svg
                className="w-8 h-8 текст-красный-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <h2 className="шрифт text-xl полужирный text-white mb-3">Delete Legacy Backups</h2>
            <p className="text-gray-300 text-sm ведущий-расслабленный">
              Are you sure you want to delete all legacy registry backups? This will permanently
              remove the{" "}
              <code className="bg-sparkle-border-вторичный/20 пикселей-1 py-0,5 округленный-см текст-xs">
                C:\Sparkle\Backup
              </code>{" "}
              folder and all its contents.
            </p>
          </div>
          <div className="гибкий разрыв-3, выравнивание конца">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDeleteModalOpen(false)
                invoke({ channel: "delete-old-sparkle-backups" })
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
      <RootDiv>
        <div className="min-h-screen w-full pb-16 overflow-y-auto">
          <div className="space-y-8 ">
            <SettingSection title="Appearance">
              <SettingCard>
                <div className="space-y-4">
                  <h3 className="текстовый шрифт-средний текст-блеск-текст">Theme</h3>
                  <div className="сетка Grid-cols-6 зазор-3">
                    {themes.map((t) => (
                      <label
                        key={t.value}
                        className={`flex items-center justify-center промежуток-2 курсор-указатель p-3 округлый-lg граница переход-все продолжительность-200 активный: масштаб-95 ${
                          theme === t.value ? "border-sparkle-primary" : "border-sparkle-border"
                        }`}
                      >
                        <input
                          type="radio"
                          name="theme"
                          value={t.value}
                          checked={theme === t.value}
                          onChange={() => setTheme(t.value)}
                          className="sr-only"
                        />
                        <span className="текстовый-блеск-текстовый шрифт-средний">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </SettingCard>
            </SettingSection>
            <SettingSection title="Updates">
              <SettingCard>
                <div className="Гибкое выравнивание элементов по центру между">
                  <div className="flex-1">
                    <h3 className="текстовая база шрифт-средний текст-блеск-текст mb-1">
                      Check for Updates
                    </h3>
                    <p className="текст-см текст-блеск-текст-вторичный">Check for updates</p>
                  </div>
                  <Button onClick={checkForUpdates} disabled={checking}>
                    {checking ? "Checking..." : "Проверьте наличие обновлений"}
                  </Button>
                </div>
              </SettingCard>
            </SettingSection>
            <SettingSection title="Менеджер пакетов">
              <SettingCard>
                <div className="Гибкое выравнивание элементов по центру между">
                  <div className="flex-1">
                    <h3 className="текстовая база шрифт-средний текст-блеск-текст mb-1">
                      Default Package Manager
                    </h3>
                    <p className="текст-см текст-блеск-текст-вторичный">
                      Set the default package manager for installing apps
                    </p>
                  </div>
                  <Dropdown
                    value={defaultPackageManager}
                    options={["Winget", "Chocolatey"]}
                    onChange={(value) => {
                      setDefaultPackageManager(value as "Chocolatey" | "Winget")
                      localStorage.setItem("defaultPackageManager", value)
                    }}
                  />
                </div>
              </SettingCard>
            </SettingSection>
            <SettingSection title="Profile">
              <SettingCard>
                <div className="space-y-4">
                  <h3 className="текстовый шрифт-средний текст-блеск-текст">User Name</h3>
                  <input
                    type="text"
                    defaultValue={localStorage.getItem("sparkle:user") || ""}
                    onChange={(e) => localStorage.setItem("sparkle:user", e.target.value)}
                    className="w-full bg-sparkle-card border border-sparkle-border rounded-lg px-3 py-2 text-sparkle-text фокус: кольцо-0 фокус: контур скрыт"
                    placeholder="Введите свое имя"
                  />
                  <div className="гибкий зазор-2">
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        const username = await invoke({ channel: "get-user-name" })
                        localStorage.setItem("sparkle:user", username)
                        toast.success("Сброс имени для пользователя системы")
                      }}
                    >
                      Reset to System Name
                    </Button>
                  </div>
                </div>
              </SettingCard>
            </SettingSection>
            <SettingSection title="Privacy">
              <SettingCard>
                <div className="Гибкое выравнивание элементов по центру между">
                  <div className="flex-1">
                    <h3 className="текстовая база шрифт-средний текст-блеск-текст mb-1">
                      Disable Analytics
                    </h3>
                    <p className="текст-см текст-блеск-текст-вторичный">
                      Disables Posthog analytics
                      <span className="inline-flex items-centergap-1 ml-2 text-жёлтый-500">
                        <span className="w-1,5 h-1,5 bg-желтый-500 округлый-полный"></span>
                        Requires restart
                      </span>
                    </p>
                  </div>
                  <div className="гибкие элементы-центральный зазор-3">
                    <Toggle
                      checked={posthogDisabled}
                      onChange={() => setPosthogDisabled((v) => !v)}
                    />
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        posthogDisabled
                          ? "text-green-400 bg-green-400/10"
                          : "text-sparkle-text-secondary bg-sparkle-border-secondary/20"
                      }`}
                    >
                      {posthogDisabled ? "Disabled" : "Enabled"}
                    </span>
                  </div>
                </div>
              </SettingCard>
            </SettingSection>
            <SettingSection title="Управление данными">
              <SettingCard>
                <div className="Гибкий центр элементов, выравнивание между mb-4">
                  <div className="flex-1">
                    <h3 className="текстовая база шрифт-средний текст-блеск-текст mb-1">Legacy Backups</h3>
                    <p className="текст-см текст-блеск-текст-вторичный">
                      Remove old backup files stored in{" "}
                      <code className="bg-sparkle-border-вторичный/20 пикселей-1 py-0,5 округленный-см текст-xs">
                        C:\Sparkle\Backup
                      </code>
                    </p>
                  </div>
                  <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>
                    Delete Backups
                  </Button>
                </div>
                <div className="Гибкий центр элементов, выравнивание между mt-2">
                  <div className="flex-1">
                    <h3 className="текстовая база шрифт-средний текст-блеск-текст mb-1">
                      Clear Sparkle Cache
                    </h3>
                    <p className="текст-см текст-блеск-текст-вторичный">
                      Remove temporary files/logs Sparkle may leave behind.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={clearCache}>
                    Clear Cache
                  </Button>
                  <Button
                    variant="secondary"
                    className="ml-2"
                    onClick={async () => {
                      await invoke({ channel: "open-log-folder" })
                    }}
                  >
                    Open Log Folder
                  </Button>
                </div>
              </SettingCard>
            </SettingSection>
            <SettingSection title="Other">
              <SettingCard>
                <div className="Гибкое выравнивание элементов по центру между">
                  <div className="flex-1">
                    <h3 className="текстовая база шрифт-средний текст-блеск-текст mb-1">Show tray icon</h3>
                    <p className="текст-см текст-блеск-текст-вторичный">
                      Enable or disable Sparkle running in the system tray.
                      <span className="inline-flex items-centergap-1 ml-2 text-жёлтый-500">
                        <span className="w-1,5 h-1,5 bg-желтый-500 округлый-полный"></span>
                        Requires restart
                      </span>
                    </p>
                  </div>
                  <div className="гибкие элементы-центральный зазор-3">
                    <Toggle
                      checked={trayEnabled}
                      onChange={handleToggleTray}
                      disabled={trayLoading}
                    />
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        trayEnabled
                          ? "text-green-400 bg-green-400/10"
                          : "text-sparkle-text-secondary bg-sparkle-border-secondary/20"
                      }`}
                    >
                      {trayEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </SettingCard>
            </SettingSection>
            <SettingSection title="Troubleshooting">
              <SettingCard>
                <div className="Гибкое выравнивание элементов по центру между">
                  <div className="flex-1">
                    <h3 className="текстовая база шрифт-средний текст-блеск-текст mb-1">
                      Restart Explorer
                    </h3>
                    <p className="текст-см текст-блеск-текст-вторичный">
                      Restarts Windows Explorer and Taskbar. Useful if the taskbar disappears.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={handleRestartExplorer}>
                    Restart Explorer
                  </Button>
                </div>
              </SettingCard>
            </SettingSection>
            <SettingSection title="About">
              <SettingCard>
                <div className="Гибкое выравнивание элементов по центру между">
                  <div>
                    <h3 className="текстовая база шрифт-средний текст-блеск-текст mb-1">Sparkle</h3>
                    <p className="текст-см текст-блеск-текст-вторичный">
                      Version {jsonData.version}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="текст-см текст-блеск-текст-вторичный">
                      © {new Date().getFullYear()} Parcoil
                    </p>
                  </div>
                </div>
              </SettingCard>
            </SettingSection>
          </div>
        </div>
      </RootDiv>
    </>
  )
}
const SettingCard = ({ children, className = "" }) => (
  <Card className={`р-4 ${className}`}>{children}</Card>
)
const SettingSection = ({ title, children }) => (
  <div className="space-y-4">
    <h2 className="шрифт text-xl полужирный">{title}</h2>
    {children}
  </div>
)
export default Settings