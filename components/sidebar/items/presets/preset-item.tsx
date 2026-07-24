import { ModelIcon } from "@/components/models/model-icon"
import { ChatSettingsForm } from "@/components/ui/chat-settings-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ChatbotUIContext } from "@/context/context"
import { FC, useContext, useState } from "react"
import { SidebarItem } from "../all/sidebar-display-item"

interface PresetItemProps {
  preset: any
}

export const PresetItem: FC<PresetItemProps> = ({ preset }) => {
  const { availableHostedModels } = useContext(ChatbotUIContext)
  const [name, setName] = useState(preset.name)
  const [isTyping, setIsTyping] = useState(false)
  const [description, setDescription] = useState(preset.description)
  const [presetChatSettings, setPresetChatSettings] = useState({
    model: preset.model,
    prompt: preset.prompt,
    temperature: preset.temperature,
    contextLength: preset.context_length,
    includeProfileContext: preset.include_profile_context,
    includeWorkspaceInstructions: preset.include_workspace_instructions
  })

  const modelDetails = availableHostedModels.find(
    (m: any) => m.modelId === preset.model
  )

  return (
    <SidebarItem
      item={preset}
      isTyping={isTyping}
      contentType="presets"
      icon={
        <ModelIcon
          provider={modelDetails?.provider || "custom"}
          height={30}
          width={30}
        />
      }
      updateState={{
        name,
        description,
        include_profile_context: presetChatSettings.includeProfileContext,
        include_workspace_instructions:
          presetChatSettings.includeWorkspaceInstructions,
        context_length: presetChatSettings.contextLength,
        model: presetChatSettings.model,
        prompt: presetChatSettings.prompt,
        temperature: presetChatSettings.temperature
      }}
      renderInputs={() => (
        <>
          <div className="space-y-1">
            <Label>Name</Label>

            <Input
              placeholder="Preset name..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <ChatSettingsForm
            chatSettings={presetChatSettings as any}
            onChangeChatSettings={setPresetChatSettings}
            useAdvancedDropdown={true}
          />
        </>
      )}
    />
  )
}
