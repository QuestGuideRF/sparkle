import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
interface InputProps {
  type?: string
  defaultValue?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  className?: string
  placeholder?: string
  Icon?: LucideIcon
}
function Input({
  type = "text",
  defaultValue,
  onChange,
  className,
  placeholder,
  ...props
}: InputProps): React.ReactElement {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      onChange={onChange}
      className={cn(
        "w-full bg-sparkle-card border border-sparkle-border rounded-lg px-3 py-2 text-sparkle-text",
        "фокус: кольцо-0 фокус: контур-скрытый фокус: граница-блеск-основные цвета перехода",
        className,
      )}
      placeholder={placeholder}
      {...props}
    />
  )
}
interface LargeInputProps {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  icon?: LucideIcon
  className?: string
}
function LargeInput({
  placeholder,
  value,
  onChange,
  icon: Icon,
  className,
  ...props
}: LargeInputProps): React.ReactElement {
  return (
    <div
      className={cn(
        "гибкие элементы-центр разрыв-3 bg-sparkle-card border border-sparkle-border",
        "rounded-xl px-4 фон-размытие-xs цвета перехода",
        "focus-within:border-sparkle-primary",
        className,
      )}
    >
      {Icon && <Icon className="w-5 h-5 текст-блеск-текст-вторичный" />}
      <input
        type="text"
        placeholder={placeholder}
        className={cn(
          "w-full py-3 px-0 bg-прозрачная граница-нет",
          "фокус: контур-скрытый фокус: кольцо-0 текст-блеск-текст",
          "placeholder:text-sparkle-text-secondary",
        )}
        value={value}
        onChange={onChange}
        {...props}
      />
    </div>
  )
}
export { Input, LargeInput }