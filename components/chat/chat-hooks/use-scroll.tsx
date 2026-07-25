import { ChatbotUIContext } from "@/context/context"
import {
  type UIEventHandler,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from "react"

export const useScroll = () => {
  const { isGenerating, chatMessages } = useContext(ChatbotUIContext)

  const messagesStartRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isAutoScrolling = useRef(false)

  const [isAtTop, setIsAtTop] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [userScrolled, setUserScrolled] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)

  const scrollToTop = useCallback(() => {
    if (messagesStartRef.current) {
      messagesStartRef.current.scrollIntoView({ behavior: "instant" })
    }
  }, [])

  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    isAutoScrolling.current = true

    scrollTimeoutRef.current = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "instant" })
      }

      isAutoScrolling.current = false
      scrollTimeoutRef.current = null
    }, 100)
  }, [])

  const handleScroll: UIEventHandler<HTMLDivElement> = useCallback(e => {
    const target = e.target as HTMLDivElement
    const bottom =
      Math.round(target.scrollHeight) - Math.round(target.scrollTop) ===
      Math.round(target.clientHeight)
    setIsAtBottom(bottom)

    const top = target.scrollTop === 0
    setIsAtTop(top)

    // User interaction (wheel, touch, keyboard) always cancels pending
    // programmatic scroll and marks userScrolled when away from bottom.
    // Only programmatic scroll-to-bottom events (isAutoScrolling && at bottom)
    // are excluded so they don't falsely set userScrolled.
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = null
    }

    if (!(isAutoScrolling.current && bottom)) {
      setUserScrolled(!bottom)
    }

    isAutoScrolling.current = false
  }, [])

  const prevIsGeneratingRef = useRef(isGenerating)
  const prevUserScrolledRef = useRef(userScrolled)

  useEffect(() => {
    if (!prevIsGeneratingRef.current && prevUserScrolledRef.current) {
      setUserScrolled(false)
    }
    prevIsGeneratingRef.current = isGenerating
    prevUserScrolledRef.current = userScrolled
  }, [isGenerating, userScrolled])

  useEffect(() => {
    if (isGenerating && !userScrolled) {
      scrollToBottom()
    }
  }, [chatMessages, isGenerating, userScrolled, scrollToBottom])

  return {
    messagesStartRef,
    messagesEndRef,
    isAtTop,
    isAtBottom,
    userScrolled,
    isOverflowing,
    handleScroll,
    scrollToTop,
    scrollToBottom,
    setIsAtBottom
  }
}
