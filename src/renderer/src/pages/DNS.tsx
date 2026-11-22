import { useState, useEffect } from "react"
import { invoke } from "@/lib/электрон"
import RootDiv from "@/компоненты/rootdiv"
import Button from "@/компоненты/ui/кнопка"
import Modal from "@/компоненты/ui/модальный"
import { toast } from "react-toastify"
import { Globe, Shield, Settings, RefreshCw, AlertCircle, Info } from "lucide-react"
import { Cloud } from "lucide-react"
import log from "electron-log/renderer"
import { Check, X } from "lucide-react"
import Card from "@/comComponents/ui/Карта"
interface PingResult {
  name: string
  server: string
  latency: number | null
  status: "success" | "timeout" | "error"
}
interface DNSProvider {
  id: string
  name: string
  primary: string
  secondary: string
  description: string
  features: string[]
  recommended?: boolean
  color: string
  icon: React.ReactElement
}
const dnsProviders = [
  {
    id: "cloudflare",
    name: "Cloudflare",
    primary: "1.1.1.1",
    secondary: "1.0.0.1",
    description: "Быстрый, безопасный и ориентированный на конфиденциальность DNS",
    features: ["Fast", "Privacy-focused", "Security"],
    recommended: true,
    color: "text-orange-500",
    icon: <Cloud className="ш-5 ч-5" />,
  },
  {
    id: "google",
    name: "Google",
    primary: "8.8.8.8",
    secondary: "8.8.4.4",
    description: "Надежный и широко используемый сервис DNS",
    features: ["Reliable", "Fast", "Широко поддерживается"],
    color: "text-blue-500",
    icon: <Globe className="ш-5 ч-5" />,
  },
  {
    id: "opendns",
    name: "OpenDNS",
    primary: "208.67.222.222",
    secondary: "208.67.220.220",
    description: "DNS, принадлежащий Cisco, с фильтрацией контента",
    features: ["Фильтрация контента", "Reliable", "Security"],
    color: "text-green-500",
    icon: <Shield className="ш-5 ч-5" />,
  },
  {
    id: "quad9",
    name: "Quad9",
    primary: "9.9.9.9",
    secondary: "149.112.112.112",
    description: "DNS, ориентированный на безопасность, с блокировкой угроз",
    features: ["Security", "Блокировка угроз", "Privacy"],
    color: "text-purple-500",
    icon: <Shield className="ш-5 ч-5" />,
  },
  {
    id: "adguard",
    name: "АдГуард DNS",
    primary: "94.140.14.14",
    secondary: "94.140.15.15",
    description: "Блокирует рекламу, трекеры, вредоносное ПО",
    features: ["Security", "Блокировка угроз", "Privacy"],
    color: "text-teal-500",
    icon: <Cloud className="ш-5 ч-5" />,
  },
  {
    id: "automatic",
    name: "Автоматический (DHCP)",
    primary: "Auto",
    secondary: "Auto",
    description: "Используйте DNS-серверы вашего интернет-провайдера по умолчанию.",
    features: ["Default", "Интернет-провайдер предоставил", "Нет конфигурации"],
    color: "text-gray-500",
    icon: <Settings className="ш-5 ч-5" />,
  },
]
export default function DNSPage() {
  const [selectedProvider, setSelectedProvider] = useState<DNSProvider | null>(null)
  const [currentDNS, setCurrentDNS] = useState<Array<{ adapter: string; servers: string }> | null>(
    null,
  )
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [customDNS, setCustomDNS] = useState({ primary: "", secondary: "" })
  const [showCustom, setShowCustom] = useState(false)
  const [pingResults, setPingResults] = useState<PingResult[] | null>(null)
  const [pingLoading, setPingLoading] = useState(false)
  useEffect(() => {
    getCurrentDNS()
  }, [])
  const getCurrentDNS = async () => {
    try {
      const result = await invoke({
        channel: "dns:get-current",
      })
      if (result.success) {
        setCurrentDNS(result.data)
      }
    } catch (error) {
      console.error("Ошибка получения текущего DNS:", error)
      log.error("Ошибка получения текущего DNS:", error)
    }
  }
  const applyDNS = async (provider) => {
    toast.dismiss()
    setLoading(true)
    const toastId = toast.loading(`Применение ${provider.name} DNS...`)
    try {
      let payload
      if (provider.id === "custom") {
        payload = {
          dnsType: "custom",
          primaryDNS: customDNS.primary,
          secondaryDNS: customDNS.secondary,
        }
      } else {
        payload = {
          dnsType: provider.id,
        }
      }
      const result = await invoke({
        channel: "dns:apply",
        payload,
      })
      if (result.success) {
        toast.update(toastId, {
          render: `${provider.name} DNS успешно применен!`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        })
        await getCurrentDNS()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.update(toastId, {
        render: `Не удалось применить DNS: ${error.message}.`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      })
      log.error("Не удалось применить DNS:", error)
    } finally {
      setLoading(false)
      setModalOpen(false)
    }
  }
  const openConfirmationModal = (provider) => {
    setSelectedProvider(provider)
    setModalOpen(true)
  }
  const validateCustomDNS = (dns) => {
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipRegex.test(dns)
  }
  const isCustomDNSValid = () => {
    return (
      customDNS.primary &&
      validateCustomDNS(customDNS.primary) &&
      (!customDNS.secondary || validateCustomDNS(customDNS.secondary))
    )
  }
  const testAllPing = async () => {
    setPingLoading(true)
    setPingResults(null)
    try {
      const result = await invoke({
        channel: "dns:ping-all",
      })
      if (result.success) {
        const sorted = [...result.data].sort((a, b) => {
          if (a.latency === null && b.latency === null) return 0
          if (a.latency === null) return 1
          if (b.latency === null) return -1
          return a.latency - b.latency
        })
        setPingResults(sorted)
      } else {
        toast.error(`Пинг-тест не пройден: ${result.error}`)
      }
    } catch (error: any) {
      toast.error(`Пинг-тест не пройден: ${error.message}`)
      log.error("Не удалось выполнить проверку DNS-серверов:", error)
    } finally {
      setPingLoading(false)
    }
  }
  const getLowestPingServer = () => {
    if (!pingResults) return null
    const successResults = pingResults.filter((r) => r.latency !== null)
    return successResults.length > 0 ? successResults[0] : null
  }
  return (
    <>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="bg-sparkle-card p-6 rounded-2xl border border-sparkle-border text-sparkle-text w-[90vw] max-w-md">
          <h2 className="шрифт text-lg-полужирный mb-4">Confirm DNS Change</h2>
          {selectedProvider && (
            <>
              <p className="mb-4">
                You are about to change your DNS servers to{" "}
                <span className="текст-блеск-основной шрифт-средний">{selectedProvider.name}</span>.
              </p>
              <div className="bg-sparkle-border-вторичная граница border-sparkle-border p-3 округлый-md mb-4">
                <div className="text-sm">
                  <div>
                    <strong>Primary:</strong> {selectedProvider.primary}
                  </div>
                  <div>
                    <strong>Secondary:</strong> {selectedProvider.secondary}
                  </div>
                </div>
              </div>
              <p className="text-sm text-sparkle-text-вторичный mb-4">
                This will change DNS settings for all active network adapters and flush the DNS
                cache.
              </p>
            </>
          )}
          <div className="гибкий выравнивание-зазор-2">
            <Button onClick={() => setModalOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button onClick={() => applyDNS(selectedProvider)} disabled={loading}>
              {loading ? "Applying..." : "Apply"}
            </Button>
          </div>
        </div>
      </Modal>
      <RootDiv>
        <div className="ПБ-10 МР-4">
          <Card className="р-4 мб-4">
            <div className="гибкие элементы-центральный зазор-3 mb-3">
              <h2 className="font-semibold">Current DNS Settings</h2>
              <Button onClick={getCurrentDNS} variant="" size="sm" className="ml-auto">
                <RefreshCw className="ш-5 ч-5" />
              </Button>
            </div>
            {currentDNS && currentDNS.length > 0 ? (
              <div className="space-y-2">
                {currentDNS.map((dns, index) => (
                  <div key={index} className="Гибкие элементы-центр разрыв-2 текст-см">
                    <Check className="w-4 h-4 текст-зеленый-500" />
                    <span className="font-medium">{dns.adapter}:</span>
                    <span className="text-sparkle-text-secondary">{dns.servers}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="гибкие элементы-центр разрыв-2 текст-см текст-блеск-текст-вторичный">
                <AlertCircle className="ш-4 ч-4" />
                <span>Loading Network Info, this may take a while...</span>
              </div>
            )}
          </Card>
          <Card className="р-4 мб-4">
            <div className="гибкие элементы-центральный зазор-3 mb-3">
              <h2 className="font-semibold">Find Fastest DNS</h2>
              <Button
                onClick={testAllPing}
                disabled={pingLoading}
                variant="secondary"
                size="sm"
                className="ml-auto"
              >
                {pingLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 анимация-спин" />
                    Testing Please Wait...
                  </>
                ) : (
                  <>Test All Servers</>
                )}
              </Button>
              {pingResults && <Button onClick={() => setPingResults(null)}>Clear</Button>}
            </div>
            {pingResults && (
              <div className="space-y-2">
                {getLowestPingServer() && (
                  <div className="bg-green-500/10 граница border-green-500/30 округленная-LG p-3 mb-3">
                    <div className="гибкие элементы-центральный зазор-2">
                      <span className="text-sm text-green-500 средний шрифт">
                        Fastest DNS: {getLowestPingServer()!.name} ({getLowestPingServer()!.server})
                        - {getLowestPingServer()!.latency}ms
                      </span>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  {pingResults.map((result, index) => (
                    <div
                      key={result.server}
                      className={`flex items-center justify-between text-sm p-2 rounded-md ${
                        index === 0 && result.latency !== null
                          ? "bg-green-500/10 border border-green-500/30"
                          : "bg-sparkle-border-secondary"
                      }`}
                    >
                      <div className="гибкие элементы-центральный зазор-2">
                        {result.status === "success" ? (
                          <Check className="w-4 h-4 текст-зеленый-500" />
                        ) : (
                          <X className="w-4 h-4 текст-красный-500" />
                        )}
                        <span className="font-medium">{result.name}</span>
                        <span className="text-sparkle-text-secondary">({result.server})</span>
                      </div>
                      <div className="гибкие элементы-центральный зазор-2">
                        {result.latency !== null ? (
                          <span className="средний шрифт text-green-500">{result.latency}ms</span>
                        ) : (
                          <span className="text-red-500">
                            {result.status === "timeout" ? "Timeout" : "Error"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!pingResults && !pingLoading && (
              <p className="текст-см текст-блеск-текст-вторичный">
                Test all DNS servers to find the one with the lowest ping.
              </p>
            )}
          </Card>
          <div className="сеткаgrid-cols-1 md:grid-cols-2 lg:grid-cols-3 зазор-4 mb-4">
            {dnsProviders.map((provider) => (
              <Card
                key={provider.id}
                onClick={() => openConfirmationModal(provider)}
                disabled={loading}
                className="bg-sparkle-card border border-sparkle-border p-4 rounded-2xl hover:border-sparkle-primary transition text-left"
              >
                <div className="гибкие элементы-центральный зазор-3 mb-3">
                  <div className={provider.color}>{provider.icon}</div>
                  <div>
                    <h3 className="font-semibold">
                      {provider.name}
                      {provider.recommended && (
                        <span className="text-xs text-sparkle-primary ml-2">Recommended</span>
                      )}
                    </h3>
                    <p className="текст-см текст-блеск-текст-вторичный">
                      {provider.primary} / {provider.secondary}
                    </p>
                  </div>
                </div>
                <p className="текст-см текст-блеск-текст-вторичный">{provider.description}</p>
                <div className="гибкий гибкий оберточный разрыв-1 мт-3">
                  {provider.features.map((feature, index) => (
                    <span key={index} className="px-2 py-1 bg-sparkle-border text-xs rounded-md">
                      {feature}
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          <Card className="р-4 мб-6">
            <div className="гибкие элементы-центральный зазор-3 ">
              <Settings className="w-5 h-5 текст-фиолетовый-500" />
              <h2 className="font-semibold">Custom DNS</h2>
              <Button onClick={() => setShowCustom(!showCustom)} size="sm">
                {showCustom ? "Hide" : "Show"}
              </Button>
            </div>
            {showCustom && (
              <div className="space-y-4">
                <div className="сетка Grid-cols-1 md:grid-cols-2 зазор-4">
                  <div>
                    <label className="блок текста-см шрифт-средний мб-2">Primary DNS</label>
                    <input
                      type="text"
                      value={customDNS.primary}
                      onChange={(e) =>
                        setCustomDNS((prev) => ({ ...prev, primary: e.target.value }))
                      }
                      placeholder="e.g., 1.1.1.1"
                      className="w-full px-3 py-2 bg-sparkle-border border border-sparkle-border-secondary rounded-lg text-sparkle-text focus:outline-hidden focus:border-sparkle-primary"
                    />
                  </div>
                  <div>
                    <label className="блок текста-см шрифт-средний мб-2">
                      Secondary DNS (Optional)
                    </label>
                    <input
                      type="text"
                      value={customDNS.secondary}
                      onChange={(e) =>
                        setCustomDNS((prev) => ({ ...prev, secondary: e.target.value }))
                      }
                      placeholder="e.g., 1.0.0.1"
                      className="w-full px-3 py-2 bg-sparkle-border border border-sparkle-border-secondary rounded-lg text-sparkle-text focus:outline-hidden focus:border-sparkle-primary"
                    />
                  </div>
                </div>
                <div className="гибкие элементы-центр разрыв-2 текст-см текст-блеск-текст-вторичный">
                  <Info className="ш-4 ч-4" />
                  <span>Enter valid IPv4 addresses for custom DNS servers</span>
                </div>
                <Button
                  onClick={() =>
                    openConfirmationModal({
                      id: "custom",
                      name: "Пользовательский DNS",
                      primary: customDNS.primary,
                      secondary: customDNS.secondary,
                    })
                  }
                  disabled={!isCustomDNSValid() || loading}
                  className="w-full"
                >
                  Apply Custom DNS
                </Button>
              </div>
            )}
          </Card>
        </div>
      </RootDiv>
    </>
  )
}