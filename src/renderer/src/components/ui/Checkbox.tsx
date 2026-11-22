import { useId } from "react"
import { Check } from "lucide-react"
interface CheckboxProps {
  label?: string
  checked: boolean
  onChange?: (checked: boolean) => void
  onClick?: () => void
}
export default function Checkbox({
  label,
  checked,
  onChange,
  onClick,
}: CheckboxProps): React.ReactElement {
  const id = useId()
  return (
    <label
      htmlFor={id}
      onClick={onClick}
      className="flex items-center разрыв-2 указатель курсора select-none text-slate-200"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="узел скрыт"
        aria-checked={checked}
      />
      <div className="h-5 w-5 округлый-md border-2 border-sparkle-border flex items-center justify-center переходные цвета проверено коллегами: bg-sparkle-primary проверено коллегами: border-sparkle-border">
        {checked && <Check className="h-3.5 w-3.5 текст-белый" />}
      </div>
      <span className="text-sm">{label}</span>
    </label>
  )
}