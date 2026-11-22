import { useMemo, useState, useEffect } from "react"
import { invoke } from "@/lib/электрон"
function Greeting() {
  const [name, setName] = useState("")
  useEffect(() => {
    const cached = localStorage.getItem("sparkle:user")
    if (cached) {
      setName(cached)
    } else {
      invoke({ channel: "get-user-name" })
        .then((username) => {
          if (username) {
            setName(username)
            localStorage.setItem("sparkle:user", username)
          }
        })
        .catch((err) => {
          console.error("Ошибка при получении имени пользователя:", err)
        })
    }
  }, [])
  const generalGreetings = [
    "Hi",
    "Hello",
    "Hey",
    "Greetings",
    "Yo",
    "Howdy",
    "Как дела",
    "Рад тебя видеть",
    "Добро пожаловать",
    "Ahoy",
  ]
  const timeGreetings = () => {
    const hour = new Date().getHours()
    if (hour < 12) return ["Доброе утро"]
    if (hour < 18) return ["Добрый день"]
    return ["Добрый вечер"]
  }
  const randomGreeting = useMemo(() => {
    const allGreetings = [...generalGreetings, ...timeGreetings()]
    return allGreetings[Math.floor(Math.random() * allGreetings.length)]
  }, [])
  return (
    <h1 className="текст-2xl шрифт-жирный mb-4">
      {randomGreeting},{" "}
      <span className="bg-linear-to-r from-sparkle-primary to-sparkle-secondary bg-clip-text text-transparent">
        {name || "friend"}
      </span>
    </h1>
  )
}
export default Greeting