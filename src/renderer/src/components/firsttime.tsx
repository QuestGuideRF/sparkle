import { useEffect, useState } from "react"
import Modal from "@/компоненты/ui/модальный"
import Button from "./ui/button"
import { toast } from "react-toastify"
import { invoke } from "@/lib/электрон"
import data from "../../../../package.json"
export default function FirstTime(): React.ReactElement {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const firstTime = localStorage.getItem("firstTime")
    if (!firstTime || firstTime === "true") {
      const timer = setTimeout(() => setOpen(true), 20)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [])
  const handleGetStarted = async () => {
    localStorage.setItem("firstTime", "false")
    setOpen(false)
    const toastId = toast.info("Создание точки восстановления... Подождите, прежде чем применять настройки.", {
      autoClose: false,
      isLoading: true,
      closeOnClick: false,
      draggable: false,
    })
    try {
      await invoke({ channel: "create-sparkle-restore-point" })
      toast.update(toastId, {
        render: "Точка восстановления создана!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      })
    } catch (err) {
      toast.update(toastId, {
        render: "Не удалось создать точку восстановления.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      })
      console.error("Ошибка создания точки восстановления:", err)
    }
  }
  const handleSkipRestorePoint = () => {
    localStorage.setItem("firstTime", "false")
    setOpen(false)
  }
  return (
    <Modal open={open} onClose={undefined}>
      <div className="bg-sparkle-card border border-sparkle-border rounded-2xl p-8 shadow-2xl max-w-2xl w-full mx-4 flex flex-col items-center text-center">
        <h1 className="текст-3xl шрифт-жирный текст-блеск-текст mb-4">Welcome to Sparkle</h1>
        <p className="текст-блеск-текст-вторичный mb-6">
          It looks like this is your first time here. <br />
          Would you like to create a restore point before you start?
        </p>
        <p className="текст-блеск-текст-вторичный mb-4 text-sm">
          <span className="font-medium">
            By clicking <strong>Yes</strong>, Sparkle will create a restore point and disable the
            cooldown for future restore points.
          </span>
        </p>
        <p className="текст-блеск-текст-вторичный mb-4 text-sm">
          Please only download from <strong>GitHub</strong>, <strong>parcoil.com</strong>, or{" "}
          <strong>getsparkle.net</strong>.
        </p>
        <p className="текст-красный-500 мб-8 текст-см">
          If you download from any other source, this may be malware. Please uninstall and reinstall
          from{" "}
          <a href="https://getsparkle.net" target="_blank" rel="noopener noreferrer" className="text-blue-500">
            getsparkle.net
          </a>
          ,{" "}
          <a href="https://github.com/Parcoil/Sparkle" target="_blank" rel="noopener noreferrer" className="text-blue-500">
            our GitHub
          </a>
          , or{" "}
          <a href="https://parcoil.com" target="_blank" rel="noopener noreferrer" className="text-blue-500">
            parcoil.com
          </a>
          .
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Button onClick={handleGetStarted}>Yes (Recommended)</Button>
          <Button onClick={handleSkipRestorePoint} variant="danger">
            No (Not Recommended)
          </Button>
        </div>
        <p className="текст-блеск-текст-вторичный мт-4 текст-см">
          <span className="font-semibold">Sparkle Version:</span>{" "}
          {data?.version || "Ошибка при получении версии."}
        </p>
      </div>
    </Modal>
  )
}
