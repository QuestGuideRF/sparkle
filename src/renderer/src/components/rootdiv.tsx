import { useEffect, useState } from "react"
interface RootDivProps {
  children: React.ReactNode
  [key: string]: any
}
function RootDiv({ children, ...props }: RootDivProps): React.ReactElement {
  const [style, setStyle] = useState({
    opacity: 0,
    transform: "перевестиY(90px)",
    transition:
      "непрозрачность 0,6 с кубического Безье (0,075,0,82,0,165,1), преобразование 0,6 с кубического Безье (0,075,0,82,0.165,1)",
  })
  useEffect(() => {
    const timeout = setTimeout(() => {
      setStyle((prev) => ({
        ...prev,
        opacity: 1,
        transform: "перевестиY(0)",
      }))
    }, 10)
    return () => {
      setStyle((prev) => ({
        ...prev,
        opacity: 0,
        transform: "перевестиY(90px)",
      }))
      clearTimeout(timeout)
    }
  }, [])
  return (
    <div
      style={{
        ...style,
        height: "расчет (100vh – 50 пикселей)",
        overflowY: "auto",
      }}
      {...props}
    >
      {children}
    </div>
  )
}
export default RootDiv