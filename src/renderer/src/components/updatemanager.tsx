import { useState, useEffect, useMemo } from "react"
import Modal from "@/компоненты/ui/модальный"
import Button from "@/компоненты/ui/кнопка"
import { toast } from "react-toastify"
interface UpdatePayload {
  version?: string
  message?: string
  percent?: number
}
export default function UpdateManager(): React.ReactElement {
  const [updateOpen, setUpdateOpen] = useState(false)
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const isDownloaded = useMemo(() => downloadPercent >= 100, [downloadPercent])
  useEffect(() => {
    const onAvailable = (_e: any, payload: UpdatePayload) => {
      setUpdateVersion(payload?.version ?? null)
      setUpdateOpen(true)
      setIsDownloading(false)
      setDownloadPercent(0)
    }
    const onNotAvailable = () => {
      toast.success("Вы в курсе")
    }
    const onError = (_e: any, payload: UpdatePayload) => {
      toast.error(payload?.message ?? "Ошибка обновления")
      setIsDownloading(false)
    }
    const onProgress = (_e: any, payload: UpdatePayload) => {
      setIsDownloading(true)
      setDownloadPercent(Math.max(0, Math.min(100, payload.percent || 0)))
    }
    const onDownloaded = () => {
      setIsDownloading(false)
      setDownloadPercent(100)
    }
    window.electron.ipcRenderer.on("updater:available", onAvailable)
    window.electron.ipcRenderer.on("updater:not-available", onNotAvailable)
    window.electron.ipcRenderer.on("updater:error", onError)
    window.electron.ipcRenderer.on("updater:download-progress", onProgress)
    window.electron.ipcRenderer.on("updater:downloaded", onDownloaded)
    return () => {
      window.electron.ipcRenderer.removeListener("updater:available", onAvailable)
      window.electron.ipcRenderer.removeListener("updater:not-available", onNotAvailable)
      window.electron.ipcRenderer.removeListener("updater:error", onError)
      window.electron.ipcRenderer.removeListener("updater:download-progress", onProgress)
      window.electron.ipcRenderer.removeListener("updater:downloaded", onDownloaded)
    }
  }, [])
  const handleUpdateNow = async () => {
    if (isDownloaded) {
      await window.electron.ipcRenderer.invoke("updater:install")
      return
    }
    setIsDownloading(true)
    setDownloadPercent(0)
    await window.electron.ipcRenderer.invoke("updater:download")
  }
  return (
    <Modal open={updateOpen} onClose={() => {}}>
      <div className="bg-sparkle-card border border-sparkle-border rounded-2xl p-6 тень-xl max-w-lg w-full mx-4">
        <h2 className="text-xl шрифт-полужирный mb-2 text-sparkle-primary">
          Update available{updateVersion ? ` (${updateVersion})` : ""}
        </h2>
        <p className="mb-6 текст-блеск-текст">
          {isDownloaded
            ? "Обновление скачано. Перезапустите установку сейчас."
            : isDownloading
              ? `Загрузка обновления… ${Math.floor(downloadPercent)}%`
              : "Доступна новая версия. Пожалуйста, обновите, чтобы искра продолжала работать правильно."}
        </p>
        <div className="гибкий выравнивание-зазор-3">
          <Button onClick={handleUpdateNow} disabled={isDownloading}>
            {isDownloaded ? "Перезагрузите и установите" : isDownloading ? "Загрузка…" : "Обновить сейчас"}
          </Button>
        </div>
      </div>
    </Modal>
  )
}