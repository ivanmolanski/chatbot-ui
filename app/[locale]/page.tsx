import { ChatbotUISVG } from "@/components/icons/chatbotui-svg"
import { IconArrowRight } from "@tabler/icons-react"
import { useTheme } from "next-themes"
import Link from "next/link"

export default function HomePage() {
  const { theme } = useTheme()

  return (
    <div className="flex size-full flex-col items-center justify-center">
      <div>
        <ChatbotUISVG theme={theme === "dark" ? "dark" : "light"} scale={0.3} />
      </div>

      <div className="mt-2 text-4xl font-bold">AF Deep Research</div>

      <div className="mt-2 text-sm text-gray-500">
        Autonomous research powered by Agent Field
      </div>

      <Link
        className="mt-6 flex w-[240px] items-center justify-center rounded-md bg-blue-500 p-3 font-semibold text-white hover:bg-blue-600"
        href="/default/chat"
      >
        Start Research
        <IconArrowRight className="ml-1" size={20} />
      </Link>
    </div>
  )
}
