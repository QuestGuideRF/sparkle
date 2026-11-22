import { useState, useEffect } from "react"
import RootDiv from "@/компоненты/rootdiv"
import { Cpu, HardDrive, Zap, MemoryStick, Gpu } from "lucide-react"
import InfoCard from "@/компоненты/информационная карта"
import { invoke } from "@/lib/электрон"
import Button from "@/компоненты/ui/кнопка"
import { useNavigate } from "react-router-dom"
import useSystemStore from "@/store/systemInfo"
import log from "electron-log/renderer"
import Greeting from "@/компоненты/приветствие"
import { MonitorCog } from "lucide-react"
import { Wrench } from "lucide-react"
import Card from "@/comComponents/ui/Карта"
function Home() {
  const systemInfo = useSystemStore((state) => state.systemInfo)
  const setSystemInfo = useSystemStore((state) => state.setSystemInfo)
  const [tweakInfo, setTweakInfo] = useState(() => {
    try {
      const cached = localStorage.getItem("sparkle:tweakInfo")
      return cached ? JSON.parse(cached) : null
    } catch (err) {
      console.error("Не удалось проанализировать кэш tweakInfo.", err)
      return null
    }
  })
  const router = useNavigate()
  const [loading, setLoading] = useState(true)
  const [usingCache, setUsingCache] = useState(false)
  const [activeTweaks, setActiveTweaks] = useState(() => {
    try {
      const cached = localStorage.getItem("sparkle:activeTweaks")
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })
  const goToTweaks = () => {
    router("tweaks")
  }
  const fetchActiveTweaks = async () => {
    try {
      const active = await invoke({ channel: "tweak:active" })
      setActiveTweaks(active)
      localStorage.setItem("sparkle:activeTweaks", JSON.stringify(active))
    } catch (err) {
      console.error("Не удалось получить активные настройки:", err)
    }
  }
  useEffect(() => {
    const idleHandle = requestIdleCallback(() => {
      const cached = localStorage.getItem("sparkle:systemInfo")
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          setSystemInfo(parsed)
          setUsingCache(true)
          setLoading(false)
        } catch (err) {
          console.warn("Не удалось проанализировать кэш systemInfo.", err)
        }
      }
      invoke({ channel: "get-system-info" })
        .then((info) => {
          setSystemInfo(info)
          localStorage.setItem("sparkle:systemInfo", JSON.stringify(info))
          setUsingCache(false)
          log.info("Получена информация о системе")
        })
        .catch((err) => {
          log.error("Ошибка при получении информации о системе:", err)
          console.error("Ошибка при получении информации о системе:", err)
        })
        .finally(() => setLoading(false))
    })
    return () => cancelIdleCallback(idleHandle)
  }, [])
  useEffect(() => {
    const idleHandle = requestIdleCallback(() => {
      const cached = localStorage.getItem("sparkle:tweakInfo")
      if (cached) {
        try {
          setTweakInfo(JSON.parse(cached))
        } catch (err) {
          console.error("Не удалось проанализировать кэш tweakInfo.", err)
        }
      }
      invoke({ channel: "tweaks:fetch" })
        .then((tweaks) => {
          setTweakInfo(tweaks)
          localStorage.setItem("sparkle:tweakInfo", JSON.stringify(tweaks))
        })
        .catch((err) => {
          console.error("Ошибка при получении информации о настройке:", err)
        })
    })
    return () => cancelIdleCallback(idleHandle)
  }, [])
  useEffect(() => {
    const idleHandle = requestIdleCallback(() => {
      fetchActiveTweaks()
    })
    return () => cancelIdleCallback(idleHandle)
  }, [])
  const formatBytes = (bytes) => {
    if (bytes === 0 || !bytes) return "0 ГБ"
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB"
  }
  if (loading) {
    return (
      <RootDiv>
        <div className="flex items-center justify-center h-64 flex-col зазор-5">
          <div className="">
            <div
              className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-sparkle-primary rounded-full ml-3"
              role="status"
              aria-label="loading"
            ></div>
          </div>
          <div className="text-sparkle-text-secondary">
            Loading system information... This may take a while depending on your system.
          </div>
          <p className="текст-см текст-блеск-первичный">
            You may use other parts of sparkle while this loads
          </p>
        </div>
      </RootDiv>
    )
  }
  return (
    <RootDiv>
      <div className="max-w-[1800px] mx-auto ">
        <Greeting />
        <div className="сеткаgrid-cols-1 sm:grid-cols-2 lg:grid-cols-3 зазор-4">
          <InfoCard
            icon={Cpu}
            iconBgColor="bg-blue-500/10"
            iconColor="text-blue-500"
            title="CPU"
            subtitle="Информация о процессоре"
            items={[
              { label: "Model", value: systemInfo?.cpu_model || "Unknown" },
              { label: "Cores", value: `${systemInfo?.cpu_cores || "0"} Ядра` },
            ]}
          />
          <InfoCard
            icon={Gpu}
            iconBgColor="bg-teal-500/10"
            iconColor="text-teal-500"
            title="GPU"
            subtitle="Графическая информация"
            items={
              systemInfo?.hasGPU
                ? [
                    { label: "Model", value: systemInfo?.gpu_model || "Unknown" },
                    { label: "VRAM", value: systemInfo?.vram || "Unknown" },
                  ]
                : [
                    { label: "Model", value: systemInfo?.integrated_gpu || "Unknown" },
                    { label: "Type", value: "Integrated" },
                  ]
            }
          />
          <InfoCard
            icon={MemoryStick}
            iconBgColor="bg-purple-500/10"
            iconColor="text-purple-500"
            title="Memory"
            subtitle="Информация об оперативной памяти"
            items={[
              { label: "Общая память", value: formatBytes(systemInfo?.memory_total) },
              { label: "Type", value: systemInfo?.memory_type || "Unknown" },
            ]}
          />
          <InfoCard
            icon={MonitorCog}
            iconBgColor="bg-red-500/10"
            iconColor="text-red-500"
            title="System"
            subtitle="Информация об ОС"
            items={[
              { label: "Операционная система", value: systemInfo?.os || "Unknown" },
              { label: "Version", value: systemInfo?.os_version || "Unknown" },
            ]}
          />
          <InfoCard
            icon={HardDrive}
            iconBgColor="bg-orange-500/10"
            iconColor="text-orange-500"
            title="Storage"
            subtitle="Информация о диске"
            items={[
              { label: "Основной диск", value: systemInfo?.disk_model || "Unknown" },
              { label: "Общая площадь", value: systemInfo?.disk_size || "Unknown" },
            ]}
          />
          <InfoCard
            icon={Wrench}
            iconBgColor="bg-green-500/10"
            iconColor="text-green-500"
            title="Tweaks"
            subtitle="Примененные настройки"
            items={[
              { label: "Доступные настройки", value: `${tweakInfo?.length || 0} Изменения` },
              { label: "Активные настройки", value: `${activeTweaks.length || 0} Активен` },
            ]}
          />
        </div>
        <Card className="bg-sparkle-card backdrop-blur-xs rounded-xl border border-sparkle-border hover:shadow-xs overflow-hidden p-3 w-full mt-4 flex gap-4 items-center">
          <div className="p-3 bg-green-500/10 округлый-LG элементы-центр выравнивания-центр текста-центр">
            <Wrench className="text-green-500" size={24} />
          </div>
          <div>
            <h1 className="шрифт-средний текст-блеск-текст">PC Running slow?</h1>
            <p className="text-sparkle-text-secondary">
              Try Using Tweaks to improve system performance and privacy.
            </p>
          </div>
          <div className="ml-auto">
            <Button variant="outline" className="гибкие элементы-центральный зазор-2" onClick={goToTweaks}>
              <Zap size={18} /> Visit Tweaks
            </Button>
          </div>
        </Card>
        <p className="text-xs text-sparkle-text-вторичный текстовый центр mt-4">
          {usingCache ? "Загрузка последних системных данных..." : ""}
        </p>
      </div>
    </RootDiv>
  )
}
export default Home