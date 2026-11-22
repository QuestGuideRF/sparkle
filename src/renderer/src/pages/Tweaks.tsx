import { useState, useEffect, useMemo } from "react"
import {
  Wrench,
  Search,
  AlertTriangle,
  Monitor,
  Shield,
  Gamepad,
  Network,
  Zap,
  Paintbrush,
  ExternalLink,
  ShieldCheck,
} from "lucide-react"
import { toast } from "react-toastify"
import RootDiv from "@/компоненты/rootdiv"
import Tooltip from "@/компоненты/ui/подсказка"
import Modal from "@/компоненты/ui/модальный"
import { invoke } from "@/lib/электрон"
import useRestartStore from "@/store/restartState"
import useSystemStore from "@/store/systemInfo"
import Button from "@/компоненты/ui/кнопка"
import Toggle from "@/компоненты/ui/переключить"
import Checkbox from "@/comComponents/ui/Флажок"
import log from "electron-log/renderer"
import Card from "@/comComponents/ui/Карта"
import { Gpu, Plus, RefreshCw } from "lucide-react"
import { LargeInput } from "@/компоненты/ui/вход"
import { isNewInCurrentVersion, isUpdatedInCurrentVersion, CURRENT_VERSION } from "@/lib/версия"
import { Star } from "lucide-react"
import { Tweak } from "@/типы/индекс"
function Tweaks() {
  const [tweaks, setTweaks] = useState<Tweak[]>([])
  const [toggleStates, setToggleStates] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [modalContent, setModalContent] = useState<string | boolean | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTweak, setSelectedTweak] = useState<Tweak | null>(null)
  const [isRecommendedModalOpen, setIsRecommendedModalOpen] = useState(false)
  const [recommendedTweaksToApply, setRecommendedTweaksToApply] = useState<Tweak[]>([])
  const [selectedRecommendedTweaks, setSelectedRecommendedTweaks] = useState<Set<string>>(new Set())
  const [isApplyingRecommended, setIsApplyingRecommended] = useState(false)
  const { setNeedsRestart } = useRestartStore()
  const systemInfo = useSystemStore((state) => state.systemInfo)
  const isTweakCompatible = (tweak) => {
    if (!systemInfo || Object.keys(systemInfo).length === 0) {
      return { compatible: true }
    }
    if (tweak.category && tweak.category.includes("GPU")) {
      if (!systemInfo.hasGPU) {
        return { compatible: false, reason: "Требуется выделенный графический процессор" }
      }
    }
    if (tweak.name === "optimize-nvidia-settings") {
      if (!systemInfo.isNvidia) {
        return { compatible: false, reason: "Требуется графический процессор NVIDIA" }
      }
    }
    return { compatible: true }
  }
  useEffect(() => {
    loadTweaks()
    loadToggleStates()
  }, [])
  const loadTweaks = async () => {
    try {
      const fetchedTweaks = await invoke({
        channel: "tweaks:fetch",
      })
      setTweaks(fetchedTweaks)
    } catch (error) {
      console.error("Ошибка при загрузке настроек:", error)
      log.error("Ошибка при загрузке настроек:", error)
    }
  }
  const loadToggleStates = async () => {
    try {
      const savedStates = await invoke({
        channel: "tweak-states:load",
      })
      if (savedStates) {
        setToggleStates(JSON.parse(savedStates))
      }
    } catch (error) {
      console.error("Ошибка загрузки состояний переключения:", error)
      log.error("Ошибка загрузки состояний переключения:", error)
    } finally {
      setIsLoading(false)
    }
  }
  const saveToggleStates = async (newStates) => {
    try {
      await invoke({
        channel: "tweak-states:save",
        payload: JSON.stringify(newStates),
      })
    } catch (error) {
      console.error("Ошибка сохранения состояний переключения:", error)
      log.error("Ошибка сохранения состояний переключения:", error)
    }
  }
  const applyTweak = async (tweak, _) => {
    toast.dismiss()
    const newState = !toggleStates[tweak.name]
    const newStates = {
      ...toggleStates,
      [tweak.name]: newState,
    }
    setToggleStates(newStates)
    const loadingToastId = toast.loading(
      `Доработка ${newState ? "Applying" : "Unapplying"}: ${tweak.title}`,
    )
    try {
      await saveToggleStates(newStates)
      if (newState) {
        await invoke({
          channel: "tweak:apply",
          payload: tweak.name,
        })
        if (tweak.restart) {
          setNeedsRestart(true)
        }
        toast.update(loadingToastId, {
          render: `Примененная настройка: ${tweak.title}`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        })
      } else {
        await invoke({
          channel: "tweak:unapply",
          payload: tweak.name,
        })
        if (tweak.restart) {
          setNeedsRestart(true)
        }
        toast.update(loadingToastId, {
          render: `Непримененная настройка: ${tweak.title}`,
          type: "info",
          isLoading: false,
          autoClose: 3000,
        })
      }
    } catch (error) {
      console.error(`Ошибка переключения настройки ${tweak.title}:`, error)
      log.error(`Ошибка переключения настройки ${tweak.title}:`, error)
      toast.update(loadingToastId, {
        render: `Не удалось настроить ${newState ? "apply" : "unapply"}: ${tweak.title}.`,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      })
      const revertedStates = {
        ...newStates,
        [tweak.name]: !newState,
      }
      setToggleStates(revertedStates)
      try {
        await saveToggleStates(revertedStates)
      } catch (err) {
        console.error("Ошибка при возврате состояния переключения:", err)
        log.error("Ошибка при возврате состояния переключения:", err)
      }
    }
  }
  const applyNonReversibleTweak = async (tweak, _) => {
    toast.dismiss()
    const newStates = {
      ...toggleStates,
      [tweak.name]: true,
    }
    setToggleStates(newStates)
    const loadingToastId = toast.loading(`Применение настройки: ${tweak.title}`)
    try {
      await saveToggleStates(newStates)
      await invoke({
        channel: "tweak:apply",
        payload: tweak.name,
      })
      if (tweak.restart) {
        setNeedsRestart(true)
      }
      toast.update(loadingToastId, {
        render: `Примененная настройка: ${tweak.title}`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      })
    } catch (error) {
      console.error(`Ошибка применения настройки ${tweak.title}:`, error)
      log.error(`Ошибка применения настройки ${tweak.title}:`, error)
      toast.update(loadingToastId, {
        render: `Не удалось применить настройку: ${tweak.title}.`,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      })
    }
  }
  const handleToggle = async (index) => {
    const tweak: any = tweaks[index]
    if (tweak.modal && !toggleStates[tweak.name]) {
      setSelectedTweak(tweak)
      setModalContent(tweak.modal)
      setIsModalOpen(true)
      return
    }
    await applyTweak(tweak, index)
  }
  const handleButtonClick = async (index) => {
    const tweak: Tweak = tweaks[index]
    if (tweak.modal) {
      setSelectedTweak(tweak)
      setModalContent(tweak.modal)
      setIsModalOpen(true)
      return
    }
    await applyNonReversibleTweak(tweak, index)
  }
  const handleApplyRecommended = async () => {
    const preset = presets[0]
    const presetTweaks = tweaks.filter((t) => preset.tweaks.includes(t.name))
    setRecommendedTweaksToApply(presetTweaks)
    setSelectedRecommendedTweaks(new Set(presetTweaks.map((t) => t.name)))
    setIsRecommendedModalOpen(true)
  }
  const applyRecommendedTweaks = async () => {
    toast.dismiss()
    setIsApplyingRecommended(true)
    setIsRecommendedModalOpen(false)
    const newStates = { ...toggleStates }
    const tweaksToApply = recommendedTweaksToApply.filter((t) =>
      selectedRecommendedTweaks.has(t.name),
    )
    for (const tweak of tweaksToApply) {
      const loadingToastId = toast.loading(`Применение настройки: ${tweak.title}`)
      try {
        newStates[tweak.name] = true
        setToggleStates({ ...newStates })
        await saveToggleStates(newStates)
        await invoke({
          channel: "tweak:apply",
          payload: tweak.name,
        })
        if (tweak.restart) {
          setNeedsRestart(true)
        }
        toast.update(loadingToastId, {
          render: `Примененная настройка: ${tweak.title}`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        })
      } catch (error) {
        console.error(`Ошибка применения настройки ${tweak.title}:`, error)
        log.error(`Ошибка применения настройки ${tweak.title}:`, error)
        toast.update(loadingToastId, {
          render: `Не удалось применить настройку: ${tweak.title}.`,
          type: "error",
          isLoading: false,
          autoClose: 3000,
        })
      }
    }
    setIsApplyingRecommended(false)
  }
  const categories = useMemo(
    () => ["All", ...new Set(tweaks.flatMap((t: any) => t.category || []).filter(Boolean))],
    [tweaks],
  )
  const filteredTweaks: any = useMemo(() => {
    return tweaks.filter((tweak) => {
      const matchesSearch =
        tweak.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tweak.description.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory =
        activeCategory === "All" ||
        (Array.isArray(tweak.category) && tweak.category.includes(activeCategory)) ||
        tweak.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [tweaks, searchTerm, activeCategory])
  const sortedTweaks = useMemo(() => {
    return [...filteredTweaks].sort((a, b) => {
      const aRec: any = !!a.top
      const bRec: any = !!b.top
      return bRec - aRec
    })
  }, [filteredTweaks])
  const categoryIcons = {
    Performance: <Zap className="w-4 h-4 текст-желтый-500" />,
    GPU: <Gpu className="w-4 h-4 текст-красный-500" />,
    Privacy: <Shield className="w-4 h-4 текст-зеленый-500" />,
    Network: <Network className="w-4 h-4 текст-оранжевый-500" />,
    Appearance: <Paintbrush className="w-4 h-4 текст-блеск-первичный" />,
    Gaming: <Gamepad className="w-4 h-4 текст-бирюзовый-500" />,
    General: <Wrench className="w-4 h-4 текст-синий-500" />,
  }
  const presets = [
    {
      name: "Применить рекомендуемые настройки",
      description: "Сбалансированный набор твиков для повседневного использования.",
      tweaks: [
        "disable-telemetry",
        "revert-context-menu",
        "hide-taskview-and-widgets",
        "set-win32-priority-separation",
        "disable-copilot",
        "enable-end-task-right-click",
        "disable-location-tracking",
        "disable-lockscreen-tips",
        "optimize-network-settings",
        "set-services-to-manual",
        "wpbt",
      ],
    },
  ]
  if (isLoading) {
    return (
      <RootDiv>
        <div className="Гибкий центр элементов, выравнивание центра h-64">
          <div className="text-slate-400">Loading tweaks...</div>
        </div>
      </RootDiv>
    )
  }
  return (
    <>
      <Modal open={isRecommendedModalOpen} onClose={() => setIsRecommendedModalOpen(false)}>
        <div className="bg-sparkle-card border border-sparkle-border rounded-2xl p-6 max-w-xl w-full mx-4 max-h-2xl">
          <h3 className="текст-xl шрифт-полужирный текст-блеск-текст mb-3">Apply Recommended Tweaks</h3>
          <div className="text-sparkle-text-вторичный text-sm Leading-6 пробел-pre-wrap max-h-64 overflow-y-auto пользовательская полоса прокрутки mb-6">
            Select the tweaks you want to apply:
            <p className="текст-xs текст-оранжевый-500 ">
              Debloating windows is highly recommended. you can do it after you apply the recomended
              tweaks. its not here because it has a UI
            </p>
            <ul className="мт-3 космос-у-3">
              {recommendedTweaksToApply.map((tweak) => (
                <li
                  key={tweak.name}
                  className="flex flex-col rounded-lg border border-sparkle-border p-3 mr-2"
                >
                  <label className="гибкий указатель курсора в центре элементов">
                    <Checkbox
                      checked={selectedRecommendedTweaks.has(tweak.name)}
                      onChange={(checked) => {
                        const newSelected = new Set(selectedRecommendedTweaks)
                        if (checked) newSelected.add(tweak.name)
                        else newSelected.delete(tweak.name)
                        setSelectedRecommendedTweaks(newSelected)
                      }}
                    />
                    <h2 className="шрифт-средний текст-блеск-текст">{tweak.title}</h2>
                  </label>
                  {tweak.description && (
                    <p className="ml-7 text-sm text-sparkle-text-вторичный ведущий-уютный">
                      {tweak.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="гибкий выравнивание-зазор-3">
            <Button
              variant="secondary"
              onClick={() => setIsRecommendedModalOpen(false)}
              disabled={isApplyingRecommended}
            >
              Cancel
            </Button>
            <Button
              onClick={applyRecommendedTweaks}
              disabled={isApplyingRecommended || selectedRecommendedTweaks.size === 0}
            >
              {isApplyingRecommended
                ? "Applying..."
                : `Применить выбранное (${selectedRecommendedTweaks.size})`}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
        }}
      >
        <div className="bg-sparkle-card border border-sparkle-border rounded-2xl p-6 тень-xl max-w-lg w-full mx-4">
          <h3 className="текст-xl шрифт-полужирный текст-блеск-текст mb-3">{selectedTweak?.title}</h3>
          <div className="text-sparkle-text-вторичный text-sm Leading-6 пробел-pre-wrap max-h-64 overflow-y-auto пользовательская полоса прокрутки mb-6">
            {modalContent}
          </div>
          <div className="гибкий выравнивание-зазор-3">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false)
              }}
            >
              Cancel
            </Button>
            {selectedTweak && (
              <Button
                onClick={async () => {
                  const newState = true
                  const newStates = {
                    ...toggleStates,
                    [selectedTweak.name]: newState,
                  }
                  setToggleStates(newStates)
                  setIsModalOpen(false)
                  const loadingToastId = toast.loading(`Применение настройки: ${selectedTweak.title}`)
                  try {
                    await saveToggleStates(newStates)
                    await invoke({
                      channel: "tweak:apply",
                      payload: selectedTweak.name,
                    })
                    if (selectedTweak.restart) {
                      setNeedsRestart(true)
                    }
                    toast.update(loadingToastId, {
                      render: `Примененная настройка: ${selectedTweak.title}`,
                      type: "success",
                      isLoading: false,
                      autoClose: 3000,
                    })
                  } catch (error) {
                    console.error(`Ошибка применения настройки ${selectedTweak.title}:`, error)
                    log.error(`Ошибка применения настройки ${selectedTweak.title}:`, error)
                    const revertedStates = {
                      ...toggleStates,
                      [selectedTweak.name]: false,
                    }
                    setToggleStates(revertedStates)
                    await saveToggleStates(revertedStates)
                  }
                }}
              >
                Apply
              </Button>
            )}
          </div>
        </div>
      </Modal>
      <RootDiv>
        <div className="Макс-W-450 MX-авто ">
          <div className="mb-4">
            <div className="space-y-4">
              <LargeInput
                icon={Search}
                placeholder="Поиск твиков по названию или описанию..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="flex flex-wrap items-center зазор-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95  ${
                      activeCategory === category
                        ? "bg-sparkle-primary text-white shadow-lg border border-sparkle-border"
                        : "bg-sparkle-card/50 text-sparkle-text-secondary  hover:bg-sparkle-border border border-sparkle-border-secondary"
                    }`}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
                <p className="текст-см текст-блеск-текст-вторичный мл-авто мр-2">
                  Showing {sortedTweaks.length} of {tweaks.length} tweaks
                </p>
              </div>
              <div>
                {presets.length > 0 && tweaks.some((t) => presets[0].tweaks.includes(t.name)) && (
                  <Button
                    variant="secondary"
                    onClick={handleApplyRecommended}
                    disabled={isApplyingRecommended}
                  >
                    Apply Recommended Tweaks
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="сеткаgrid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 зазор-4">
            {sortedTweaks.length > 0 ? (
              sortedTweaks.map((tweak, _) => {
                const originalIndex = tweaks.indexOf(tweak)
                return (
                  <Card key={originalIndex} className=" р-0 ч-52">
                    <div className="p-5 flex flex-col h-65">
                      <div className="Гибкий центр элементов, выравнивание между mb-3">
                        {tweak.category && (
                          <div className="гибкие элементы-центр разрыв-2 гибкая обертка">
                            <>
                              {tweak.warning && (
                                <Tooltip content={tweak.warning} delay={0.3} side="right">
                                  <div className="p-1.5 темный:bg-red-900/50 bg-red-300 округлый-lg при наведении:bg-red-800 темный:hover:bg-red-900/80 переходных цветов">
                                    <AlertTriangle className="w-4 h-4 темный:text-red-400 text-red-600 при наведении:text-white" />
                                  </div>
                                </Tooltip>
                              )}
                              {tweak.recommended && (
                                <Tooltip content={"Рекомендуемая настройка"} delay={0.3} side="right">
                                  <div className="p-1.5 bg-green-500/50 округлый-lg при наведении: bg-green-500/80 переходных цветов">
                                    <Star className="w-4 h-4 текст-белый заполняющий белый" />
                                  </div>
                                </Tooltip>
                              )}
                              {tweak.addedversion &&
                                isNewInCurrentVersion(tweak.addedversion, CURRENT_VERSION) && (
                                  <Tooltip
                                    content={`Новое в Sparkle ${tweak.addedversion}`}
                                    delay={0.3}
                                    side="right"
                                  >
                                    <div className="p-1.5 bg-pink-500/50 округлый-lg hover:bg-pink-500/80 переходных цветов">
                                      <Plus className="w-4 h-4 текст-белый" />
                                    </div>
                                  </Tooltip>
                                )}
                              {tweak.updatedversion &&
                                isUpdatedInCurrentVersion(
                                  tweak.updatedversion,
                                  CURRENT_VERSION,
                                ) && (
                                  <Tooltip
                                    content={`Обновлено в Sparkle ${tweak.updatedversion}`}
                                    delay={0.3}
                                    side="right"
                                  >
                                    <div className="p-1.5 bg-blue-500/50 округлый-LG при наведении: bg-blue-500/80 переходных цветов">
                                      <RefreshCw className="w-4 h-4 текст-белый" />
                                    </div>
                                  </Tooltip>
                                )}
                              {(Array.isArray(tweak.category)
                                ? tweak.category
                                : [tweak.category]
                              ).map((cat) => (
                                <Tooltip
                                  key={cat}
                                  content={`${cat} Оптимизация`}
                                  delay={0.3}
                                  side="right"
                                >
                                  <div className="p-1.5 bg-sparkle-accent rounded-lg hover:bg-sparkle-bg переходные цвета text-sparkle-text">
                                    {categoryIcons[cat] || categoryIcons["General"]}
                                  </div>
                                </Tooltip>
                              ))}
                              {tweak.risk && (
                                <Tooltip
                                  content={
                                    tweak.risk === "safe" ? "Безопасно в использовании" : "Используйте с осторожностью"
                                  }
                                  delay={0.3}
                                  side="right"
                                >
                                  <div className="p-1.5 bg-sparkle-accent rounded-lg hover:bg-sparkle-bg переходные цвета text-sparkle-text">
                                    {tweak.risk === "safe" && (
                                      <div className="гибкий зазор-2">
                                        <ShieldCheck className="w-4 h-4 текст-зеленый-500" />{" "}
                                        <p className="text-xs">Safe</p>
                                      </div>
                                    )}
                                    {tweak.risk === "risky" && (
                                      <div className="гибкий зазор-2">
                                        <AlertTriangle className="w-4 h-4 текст-красный-500" />{" "}
                                        <p className="text-xs">Risky</p>
                                      </div>
                                    )}
                                    {tweak.risk === "caution" && (
                                      <div className="гибкий зазор-2">
                                        <AlertTriangle className="w-4 h-4 текст-желтый-500" />{" "}
                                        <p className="text-xs">Caution</p>
                                      </div>
                                    )}
                                  </div>
                                </Tooltip>
                              )}
                            </>
                          </div>
                        )}
                        <div className="гибкие элементы-центр м-0 зазор-2">
                          <Button
                            variant="secondary"
                            className="пикс-2! ру-1! text-xs flex items-center зазор-1"
                            title="Открытые документы"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              const url = `https://docs.getsparkle.net/tweaks/${tweak.name}`
                              window.open(url, "_blank")
                            }}
                          >
                            <ExternalLink className="w-3 h-3" /> Docs
                          </Button>
                          {(() => {
                            const compatibility = isTweakCompatible(tweak)
                            return (
                              <>
                                {!compatibility.compatible && (
                                  <Tooltip content={compatibility.reason} delay={0.3} side="right">
                                    <div className="p-1.5 bg-orange-500/50 rounded-lg hover:bg-orange-500/80 transition-colors">
                                      <Monitor className="w-4 h-4 text-orange-300" />
                                    </div>
                                  </Tooltip>
                                )}
                                {tweak.reversible == null || tweak.reversible == true ? (
                                  <Tooltip
                                    content={
                                      !compatibility.compatible ? compatibility.reason : null
                                    }
                                  >
                                    <Toggle
                                      checked={toggleStates[tweak.name] || false}
                                      onChange={() => handleToggle(originalIndex)}
                                      disabled={!compatibility.compatible}
                                    />
                                  </Tooltip>
                                ) : (
                                  <Tooltip
                                    content={
                                      !compatibility.compatible ? compatibility.reason : null
                                    }
                                  >
                                    <Button
                                      onClick={() => handleButtonClick(originalIndex)}
                                      disabled={!compatibility.compatible}
                                    >
                                      Apply
                                    </Button>
                                  </Tooltip>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      </div>
                      <div className="flex items-start mb-3">
                        <h2 className="font-semibold text-sparkle-text text-base">{tweak.title}</h2>
                      </div>
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <p className="text-sparkle-text-secondary text-sm flex-1 overflow-y-auto custom-scrollbar pr-1">
                          {tweak.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                )
              })
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <div className="bg-sparkle-card p-6 rounded-2xl mb-4">
                  <Search className="w-10 h-10 text-sparkle-text-secondary" />
                </div>
                <h3 className="text-xl font-medium mb-2 text-sparkle-text"> Loading Tweaks...</h3>
                <h3 className="text-sm font-medium mb-2 text-sparkle-text-muted">
                  No tweaks Found
                </h3>
                <p className="text-sparkle-text-secondary">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </RootDiv>
    </>
  )
}
export default Tweaks
