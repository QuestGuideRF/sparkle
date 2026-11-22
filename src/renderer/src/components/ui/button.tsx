import clsx from "clsx"
type ButtonSize = "sm" | "md" | "lg"
type ButtonVariant = "primary" | "outline" | "secondary" | "danger" | ""
const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1,5 текст-см",
  md: "текстовая база px-4 py-2",
  lg: "px-5 py-3 текст-LG",
}
interface ButtonProps {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  disabled?: boolean
  as?: React.ElementType
  [key: string]: any
}
const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "sm",
  className = "",
  disabled = false,
  as = "button",
  ...props
}) => {
  const base =
    "flex items-center округлый-lg шрифт-средний переход-все продолжительность-200 выбрать-нет фокус: контур-скрытый активный: масштаб-90"
  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-sparkle-primary text-white hover:brightness-110 border-sparkle-вторичный hover:bg-sparkle-вторичный hover:border-sparkle-primary",
    outline:
      "граница border-sparkle-primary text-sparkle-primary hover:bg-sparkle-primary hover:text-white",
    secondary:
      "bg-sparkle-card border border-sparkle-вторичный text-sparkle-text hover:bg-sparkle-вторичный hover:border-sparkle-card",
    danger:
      "bg-red-600 text-white border border-red-700 hover:bg-red-700 hover:bg-red-800 focus:ring-red-500",
    "": "",
  }
  const disabledClasses = "непрозрачность-50, курсор-не разрешен, события-указателя-нет"
  return (
    <button
      className={clsx(
        base,
        sizes[size as ButtonSize],
        variants[variant as ButtonVariant],
        disabled ? disabledClasses : "",
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
export default Button