import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconLoader2
} from "@tabler/icons-react"
import { FC, useCallback, useState } from "react"
import { LimitDisplay } from "../ui/limit-display"
import { toast } from "sonner"

interface ProfileStepProps {
  username: string
  usernameAvailable: boolean
  displayName: string
  onUsernameAvailableChange: (isAvailable: boolean) => void
  onUsernameChange: (username: string) => void
  onDisplayNameChange: (name: string) => void
}

const PROFILE_USERNAME_MIN = 3
const PROFILE_USERNAME_MAX = 50
const PROFILE_DISPLAY_NAME_MAX = 100

export const ProfileStep: FC<ProfileStepProps> = ({
  username,
  usernameAvailable,
  displayName,
  onUsernameAvailableChange,
  onUsernameChange,
  onDisplayNameChange
}) => {
  const [loading, setLoading] = useState(false)

  const debounce = (func: (...args: any[]) => void, wait: number) => {
    let timeout: NodeJS.Timeout | null

    return (...args: any[]) => {
      const later = () => {
        if (timeout) clearTimeout(timeout)
        func(...args)
      }

      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  const checkUsernameAvailability = useCallback(
    debounce(async (username: string) => {
      if (!username) return

      if (username.length < PROFILE_USERNAME_MIN) {
        onUsernameAvailableChange(false)
        return
      }

      if (username.length > PROFILE_USERNAME_MAX) {
        onUsernameAvailableChange(false)
        return
      }

      try {
        const response = await fetch(`/api/username/available`, {
          method: "POST",
          body: JSON.stringify({ username })
        })
        const data = await response.json()
        onUsernameAvailableChange(data.isAvailable)
      } catch {
        onUsernameAvailableChange(false)
      }
    }, 300),
    [onUsernameAvailableChange]
  )

  return (
    <>
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <Label>Username</Label>

          <div className="text-xs">
            {usernameAvailable ? (
              <div className="text-green-500">AVAILABLE</div>
            ) : (
              <div className="text-red-500">UNAVAILABLE</div>
            )}
          </div>
        </div>

        <div className="relative">
          <Input
            className="pr-10"
            placeholder="username"
            value={username}
            onChange={e => {
              onUsernameChange(e.target.value)
              checkUsernameAvailability(e.target.value)
            }}
            minLength={PROFILE_USERNAME_MIN}
            maxLength={PROFILE_USERNAME_MAX}
          />

          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {loading ? (
              <IconLoader2 className="animate-spin" />
            ) : usernameAvailable ? (
              <IconCircleCheckFilled className="text-green-500" />
            ) : (
              <IconCircleXFilled className="text-red-500" />
            )}
          </div>
        </div>

        <LimitDisplay used={username.length} limit={PROFILE_USERNAME_MAX} />
      </div>

      <div className="space-y-1">
        <Label>Chat Display Name</Label>

        <Input
          placeholder="Your Name"
          value={displayName}
          onChange={e => onDisplayNameChange(e.target.value)}
          maxLength={PROFILE_DISPLAY_NAME_MAX}
        />

        <LimitDisplay
          used={displayName.length}
          limit={PROFILE_DISPLAY_NAME_MAX}
        />
      </div>
    </>
  )
}
