import { useState, useRef } from "react"
type TooltipSide = "top" | "bottom" | "left" | "right"
interface TooltipProps {
  content: string | undefined | null
  children: React.ReactNode
  side?: TooltipSide
  delay?: number
}
const Tooltip = ({
  content,
  children,
  side = "top",
  delay = 0.5,
}: TooltipProps): React.ReactElement => {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const handleMouseEnter = () => {
    if (!content) return
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay * 1000)
  }
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }
  const sideToTransform: Record<TooltipSide, string> = {
    top: "транслировать (-50%, -0,5рем) масштаб-95",
    bottom: "транслировать(-50%, 0,5бэр) масштаб-95",
    left: "транслировать (-0,5рем, -50%) масштаб-95",
    right: "транслировать (0,5рем, -50%), масштаб-95",
  }
  const sideToPositionStyle: Record<TooltipSide, Record<string, string>> = {
    top: { left: "50%", bottom: "100%" },
    bottom: { left: "50%", top: "100%" },
    left: { right: "100%", top: "50%" },
    right: { left: "100%", top: "50%" },
  }
  const transformStyle = isVisible
    ? sideToTransform[side]
        .replace("scale-95", "scale-100")
        .replace(/-0.5rem/, "0rem")
        .replace(/0.5rem/, "0rem")
    : sideToTransform[side]
  if (!content) {
    return <>{children}</>
  }
  return (
    <div
      className="относительный встроенный блок"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <div
        className={`абсолютный z-50 указатель-события-нет px-2 py-1 text-xs шрифт-средний bg-sparkle-card text-sparkle-text округленный-md тень-lg border border-sparkle-border пробел-nowrap переход-все продолжительность-150 легкость`}
        style={{
          ...sideToPositionStyle[side],
          transform: transformStyle,
          opacity: isVisible ? 1 : 0,
        }}
      >
        {content}
      </div>
    </div>
  )
}
export default Tooltip