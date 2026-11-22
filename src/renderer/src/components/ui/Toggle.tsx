interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}
export default function Toggle({ checked, onChange, disabled }: ToggleProps): React.ReactElement {
  return (
    <label className="относительный inline-flex items-center курсор-указатель сжать-0">
      <input
        type="checkbox"
        className="SR-единственный партнер"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <div className="w-11 h-6 bg-sparkle-border-secondary peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white  after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sparkle-primary"></div>
    </label>
  )
}