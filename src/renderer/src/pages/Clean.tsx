import Button from "@/компоненты/ui/кнопка"
import Toggle from "@/компоненты/ui/переключить"
import { useState, useEffect } from "react"
import { invoke } from "@/lib/электрон"
import RootDiv from "@/компоненты/rootdiv"
import { RefreshCw, Icon, FileX, Gauge, Trash2, Download, Image, Bug } from "lucide-react"
import { broom } from "@lucid/лаборатория"
import { toast } from "react-toastify"
import log from "electron-log/renderer"
import Card from "@/comComponents/ui/Карта"
const cleanups = [
  {
    id: "temp",
    label: "Очистить временные файлы",
    path: "C:\\Windows\\Temp",
    description: "Удалите системные и пользовательские временные файлы.",
    icon: <FileX className="ш-5 ч-5" />,
    script: `
      $systemTemp = "$env:SystemRoot\\Temp"
      $userTemp = [System.IO.Path]::GetTempPath()
      $foldersToClean = @($systemTemp, $userTemp)
      $totalSizeBefore = 0
      foreach ($folder in $foldersToClean) {
          if (Test-Path $folder) {
              $folderSize = (Get-ChildItem -Path $folder -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
              $totalSizeBefore += if ($folderSize) { $folderSize } else { 0 }
              Get-ChildItem -Path $folder -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
          }
      }
      Write-Output $totalSizeBefore
    `,
    sizeScript: `
      $systemTemp = "$env:SystemRoot\\Temp"
      $userTemp = [System.IO.Path]::GetTempPath()
      $foldersToClean = @($systemTemp, $userTemp)
      $totalSize = 0
      foreach ($folder in $foldersToClean) {
          if (Test-Path $folder) {
              $folderSize = (Get-ChildItem -Path $folder -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
              $totalSize += if ($folderSize) { $folderSize } else { 0 }
          }
      }
      Write-Output $totalSize
    `,
  },
  {
    id: "prefetch",
    label: "Очистить файлы предварительной выборки",
    path: "C:\\Windows\\Prefetch",
    description: "Удалите файлы из папки Windows Prefetch.",
    icon: <Gauge className="ш-5 ч-5" />,
    script: `
      $prefetch = "$env:SystemRoot\\Prefetch"
      $totalSizeBefore = 0
      if (Test-Path $prefetch) {
          $totalSizeBefore = (Get-ChildItem -Path "$prefetch\\*" -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
          Remove-Item "$prefetch\\*" -Force -Recurse -ErrorAction SilentlyContinue
      }
      Write-Output $totalSizeBefore
    `,
    sizeScript: `
      $prefetch = "$env:SystemRoot\\Prefetch"
      $totalSize = 0
      if (Test-Path $prefetch) {
          $totalSize = (Get-ChildItem -Path "$prefetch\\*" -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
      }
      Write-Output $totalSize
    `,
  },
  {
    id: "recyclebin",
    label: "Пустая корзина",
    path: "Корзина",
    description: "Безвозвратно удалить файлы из корзины.",
    icon: <Trash2 className="ш-5 ч-5" />,
    script: `
      $recycleBinSize = 0
      $shell = New-Object -ComObject Shell.Application
      $recycleBin = $shell.Namespace(0xA)
      $recycleBinSize = ($recycleBin.Items() | Measure-Object -Property Size -Sum).Sum
      if ($null -eq $recycleBinSize) { $recycleBinSize = 0 }
      Clear-RecycleBin -Force -ErrorAction SilentlyContinue
      Write-Output $recycleBinSize
    `,
    sizeScript: `
      $recycleBinSize = 0
      $shell = New-Object -ComObject Shell.Application
      $recycleBin = $shell.Namespace(0xA)
      $recycleBinSize = ($recycleBin.Items() | Measure-Object -Property Size -Sum).Sum
      if ($null -eq $recycleBinSize) { $recycleBinSize = 0 }
      Write-Output $recycleBinSize
    `,
  },
  {
    id: "windows-update",
    label: "Очистить кеш обновлений Windows",
    path: "C:\\Windows\\SoftwareDistribution\\Download",
    description: "Удалите загруженные установочные файлы Центра обновления Windows.",
    icon: <Download className="ш-5 ч-5" />,
    script: `
      $windowsUpdateDownload = "$env:SystemRoot\\SoftwareDistribution\\Download"
      $totalSizeBefore = 0
      if (Test-Path $windowsUpdateDownload) {
          $totalSizeBefore = (Get-ChildItem -Path "$windowsUpdateDownload\\*" -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
          Remove-Item "$windowsUpdateDownload\\*" -Force -Recurse -ErrorAction SilentlyContinue
      }
      Write-Output $totalSizeBefore
    `,
    sizeScript: `
      $windowsUpdateDownload = "$env:SystemRoot\\SoftwareDistribution\\Download"
      $totalSize = 0
      if (Test-Path $windowsUpdateDownload) {
          $totalSize = (Get-ChildItem -Path "$windowsUpdateDownload\\*" -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
      }
      Write-Output $totalSize
    `,
  },
  {
    id: "thumbnails",
    label: "Очистить кэш миниатюр",
    path: "C:\\Users\\<Пользователь>\\AppData\\Local\\Microsoft\\Windows\\Explorer",
    description: "Удалите кэшированные миниатюры изображений, используемые Проводником.",
    icon: <Image className="ш-5 ч-5" />,
    script: `
      $thumbCache = "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer"
      $totalSizeBefore = 0
      $thumbFiles = Get-ChildItem "$thumbCache\\thumbcache_*.db" -ErrorAction SilentlyContinue
      if ($thumbFiles) {
          $totalSizeBefore = ($thumbFiles | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
          Remove-Item "$thumbCache\\thumbcache_*.db" -Force -ErrorAction SilentlyContinue
      }
      Write-Output $totalSizeBefore
    `,
    sizeScript: `
      $thumbCache = "$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer"
      $totalSize = 0
      $thumbFiles = Get-ChildItem "$thumbCache\\thumbcache_*.db" -ErrorAction SilentlyContinue
      if ($thumbFiles) {
          $totalSize = ($thumbFiles | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
      }
      Write-Output $totalSize
    `,
  },
  {
    id: "errorreports",
    label: "Очистить отчеты об ошибках",
    path: "C:\\Users\\<Пользователь>\\AppData\\Local\\CrashDumps",
    description: "Удалите отчет об ошибках и файлы аварийного дампа.",
    icon: <Bug className="ш-5 ч-5" />,
    script: `
      $crashDumps = "$env:LOCALAPPDATA\\CrashDumps"
      $totalSizeBefore = 0
      if (Test-Path $crashDumps) {
          $totalSizeBefore = (Get-ChildItem -Path "$crashDumps\\*" -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
          Remove-Item "$crashDumps\\*" -Force -Recurse -ErrorAction SilentlyContinue
      }
      Write-Output $totalSizeBefore
    `,
    sizeScript: `
      $crashDumps = "$env:LOCALAPPDATA\\CrashDumps"
      $totalSize = 0
      if (Test-Path $crashDumps) {
          $totalSize = (Get-ChildItem -Path "$crashDumps\\*" -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
      }
      Write-Output $totalSize
    `,
  },
]
function Clean() {
  const [selected, setSelected] = useState<string[]>([])
  const [loadingQueue, setLoadingQueue] = useState<string[]>([])
  const [lastClean, setLastClean] = useState(
    localStorage.getItem("last-clean") || "Ещё не чистил.",
  )
  const [isCleaning, setIsCleaning] = useState(false)
  const [cleanupResults, setCleanupResults] = useState({})
  const [currentSizes, setCurrentSizes] = useState<Record<string, number>>({})
  const [loadingSizes, setLoadingSizes] = useState(false)
  const toggleCleanup = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }
  const formatBytes = (bytes) => {
    if (bytes === 0 || !bytes) return "0 B"
    const sizes = ["B", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }
  async function fetchSizes(silent = false) {
    if (!silent) setLoadingSizes(true)
    const newSizes: Record<string, number> = {}
    for (const cleanup of cleanups) {
      if (!cleanup.sizeScript) continue
      try {
        const result = await invoke({
          channel: "run-powershell",
          payload: { script: cleanup.sizeScript, name: `размер-${cleanup.id}` },
        })
        const resultStr = result?.output || "0"
        newSizes[cleanup.id] = parseInt(resultStr.trim(), 10) || 0
      } catch (err) {
        log.error(`Не удалось получить размер для ${cleanup.id}: ${err}.`)
        newSizes[cleanup.id] = 0
      }
    }
    setCurrentSizes(newSizes)
    if (!silent) setLoadingSizes(false)
  }
  useEffect(() => {
    fetchSizes()
  }, [])
  const totalSize = Object.values(currentSizes).reduce((sum, size) => sum + (size || 0), 0)
  const totalFreed = Object.values(cleanupResults as Record<string, number>).reduce(
    (sum: number, size) => sum + (size || 0),
    0,
  )
  async function runSelectedCleanups() {
    toast.dismiss()
    setIsCleaning(true)
    setLoadingQueue([])
    setCleanupResults({})
    let anySuccess = false
    let newResults = {}
    for (const cleanup of cleanups) {
      if (!selected.includes(cleanup.id)) continue
      setLoadingQueue((q) => [...q, cleanup.id])
      const toastId = toast.loading(`Запуск ${cleanup.label}...`)
      try {
        const result = await invoke({
          channel: "run-powershell",
          payload: { script: cleanup.script, name: `очистка-${cleanup.id}` },
        })
        const resultStr = result?.output || "0"
        const freedSpace = parseInt(resultStr.trim(), 10) || 0
        newResults[cleanup.id] = freedSpace
        toast.update(toastId, {
          render: `${cleanup.label} завершено! ${formatBytes(freedSpace)} удален.`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        })
        anySuccess = true
      } catch (err: any) {
        toast.update(toastId, {
          render: `Не удалось: ${err.message || err}`,
          type: "error",
          isLoading: false,
          autoClose: 4000,
        })
        log.error(`Не удалось запустить очистку ${cleanup.id}: ${err.message || err}.`)
      }
    }
    if (anySuccess) {
      const now = new Date().toLocaleString()
      setLastClean(now)
      localStorage.setItem("last-clean", now)
      setCleanupResults(newResults)
      fetchSizes(true)
    }
    setLoadingQueue([])
    setIsCleaning(false)
  }
  return (
    <RootDiv>
      <div className="гибкий флекс-col зазор-6">
        <Card className="гибкие элементы-центральный разрыв-4 p-4">
          <div className="flex items-center justify-center p-3 округлый-xl bg-teal-500/10">
            <Icon iconNode={broom} className="text-teal-500" size={28} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl шрифт-жирный текст-блеск-текст mb-1">System Cleaner</h2>
            <p className="текст-см текст-блеск-текст-вторичный">
              Last cleaned: <span className="font-medium">{lastClean}</span>
            </p>
            <div className="flex flex-wrap items-center зазор-x-4 зазор-y-1 мт-1">
              <p className="текст-см текст-блеск-текст-вторичный">
                {loadingSizes ? (
                  "Расчет общего размера..."
                ) : (
                  <>
                    Total size:{" "}
                    <span className="шрифт-средний текст-бирюзовый-500">{formatBytes(totalSize)}</span>
                  </>
                )}
              </p>
              {totalFreed > 0 && (
                <p className="текст-см текст-зеленый-500">
                  Total freed: <span className="font-medium">{formatBytes(totalFreed)}</span>
                </p>
              )}
            </div>
          </div>
          <div className="гибкий центр элементов">
            {selected.length > 0 ? (
              <Button onClick={() => setSelected([])} variant="secondary" className="mr-2">
                Unselect All
              </Button>
            ) : (
              <Button
                onClick={() => setSelected(cleanups.map((c) => c.id))}
                variant="secondary"
                className="mr-2"
              >
                Select All
              </Button>
            )}
            <Button
              onClick={runSelectedCleanups}
              disabled={isCleaning || selected.length === 0}
              size="md"
              variant="primary"
              className="min-w-45 flex items-center justify-center разрыв-2 текстовая база шрифт-полужирный"
            >
              {isCleaning ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  <span>Cleaning...</span>
                </>
              ) : (
                <>
                  <Icon iconNode={broom} size={18} />
                  <span>Clean Selected</span>
                </>
              )}
            </Button>
          </div>
        </Card>
        <Card className="flex flex-col делитель-y делитель-блеск-граница p-0 mb-10">
          {cleanups.map(({ id, label, description, path, icon }, idx) => {
            const isSelected = selected.includes(id)
            const currentSize = currentSizes[id]
            const freedSpace = cleanupResults[id]
            return (
              <div
                key={id}
                className={`относительная гибкость элементов-центра выравнивания-между px-6 py-5 ${idx === 0 ? "rounded-t-xl" : ""} ${idx === cleanups.length - 1 ? "rounded-b-xl" : ""} group hover:bg-sparkle-card/50 переходных цветов`}
              >
                <div className="гибкие элементы-центр разрыв-4 гибкие-1 мин-ш-0">
                  <div className="flex items-center justify-center w-10 h-10 округлый-xl bg-sparkle-border/50 text-sparkle-text-вторичный">
                    {icon}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="гибкие элементы-центральный зазор-3">
                      <span className="текстовый шрифт-полужирный текст-блеск-текст усечь">
                        {label}
                      </span>
                      {freedSpace ? (
                        <span className="px-2 py-0.5 text-xs шрифт-средний округлый-полный bg-green-500/20 text-green-500">
                          {formatBytes(freedSpace)} freed
                        </span>
                      ) : null}
                    </div>
                    <span className="текст-см текст-блеск-текст-вторичный мт-1">{description}</span>
                    <div className="гибкие элементы-центральный зазор-4 мт-2">
                      <span className="text-xs text-sparkle-text-muted гибкие элементы-центр разрыв-1">
                        <span className="font-medium">Size:</span>
                        {loadingSizes ? (
                          <span className="text-sparkle-text-secondary">Calculating...</span>
                        ) : currentSize !== undefined ? (
                          <span className="средний шрифт text-teal-500">
                            {formatBytes(currentSize)}
                          </span>
                        ) : (
                          <span className="text-sparkle-text-secondary">Unknown</span>
                        )}
                      </span>
                      {path && path !== "Корзина" && (
                        <span className="text-xs text-sparkle-text-muted усечь max-w-xs">
                          {path}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ml-4 гибкие предметы-центр">
                  <Toggle
                    checked={isSelected}
                    onChange={() => toggleCleanup(id)}
                    disabled={isCleaning}
                  />
                </div>
                {loadingQueue.includes(id) && (
                  <div className="абсолютная вставка-0 flex items-center выравнивание-центр z-10 округленный-xl">
                    <div className="flex items-centergap-2 px-4 py-2 округлый-lg bg-sparkle-border border border-sparkle-border-вторичный">
                      <RefreshCw className="анимация-вращение текста-чирок-500" size={18} />
                      <span className="text-sm шрифт-средний text-teal-600">Cleaning...</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </Card>
      </div>
    </RootDiv>
  )
}
export default Clean