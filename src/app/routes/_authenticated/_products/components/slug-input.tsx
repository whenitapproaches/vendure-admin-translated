import {
  Input,
  Button,
  Switch,
  DashboardFormComponent,
} from "@vendure/dashboard"
import { useFormContext } from "react-hook-form"
import { useState, useEffect } from "react"
import { RefreshCw, Lock, Unlock } from "lucide-react"

export const SlugInputComponent: DashboardFormComponent = ({
  value,
  onChange,
  disabled,
  name,
}) => {
  const [autoGenerate, setAutoGenerate] = useState(!value)
  const [isGenerating, setIsGenerating] = useState(false)
  const { watch } = useFormContext()
  const nameValue = watch("translations.0.name")

  const generateSlug = (str: string) => {
    str = str.replace(/^\s+|\s+$/g, "") // trim
    str = str.toLowerCase()

    // Vietnamese diacritics mapping
    const vietnameseMap: { [key: string]: string } = {
      'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a', 'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
      'è': 'e', 'é': 'e', 'ẹ': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ê': 'e', 'ề': 'e', 'ế': 'e', 'ệ': 'e', 'ể': 'e', 'ễ': 'e',
      'ì': 'i', 'í': 'i', 'ị': 'i', 'ỉ': 'i', 'ĩ': 'i',
      'ò': 'o', 'ó': 'o', 'ọ': 'o', 'ỏ': 'o', 'õ': 'o', 'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ộ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ợ': 'o', 'ở': 'o', 'ỡ': 'o',
      'ù': 'u', 'ú': 'u', 'ụ': 'u', 'ủ': 'u', 'ũ': 'u', 'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ự': 'u', 'ử': 'u', 'ữ': 'u',
      'ỳ': 'y', 'ý': 'y', 'ỵ': 'y', 'ỷ': 'y', 'ỹ': 'y',
      'đ': 'd',
      // Uppercase versions
      'À': 'a', 'Á': 'a', 'Ạ': 'a', 'Ả': 'a', 'Ã': 'a', 'Â': 'a', 'Ầ': 'a', 'Ấ': 'a', 'Ậ': 'a', 'Ẩ': 'a', 'Ẫ': 'a', 'Ă': 'a', 'Ằ': 'a', 'Ắ': 'a', 'Ặ': 'a', 'Ẳ': 'a', 'Ẵ': 'a',
      'È': 'e', 'É': 'e', 'Ẹ': 'e', 'Ẻ': 'e', 'Ẽ': 'e', 'Ê': 'e', 'Ề': 'e', 'Ế': 'e', 'Ệ': 'e', 'Ể': 'e', 'Ễ': 'e',
      'Ì': 'i', 'Í': 'i', 'Ị': 'i', 'Ỉ': 'i', 'Ĩ': 'i',
      'Ò': 'o', 'Ó': 'o', 'Ọ': 'o', 'Ỏ': 'o', 'Õ': 'o', 'Ô': 'o', 'Ồ': 'o', 'Ố': 'o', 'Ộ': 'o', 'Ổ': 'o', 'Ỗ': 'o', 'Ơ': 'o', 'Ờ': 'o', 'Ớ': 'o', 'Ợ': 'o', 'Ở': 'o', 'Ỡ': 'o',
      'Ù': 'u', 'Ú': 'u', 'Ụ': 'u', 'Ủ': 'u', 'Ũ': 'u', 'Ư': 'u', 'Ừ': 'u', 'Ứ': 'u', 'Ự': 'u', 'Ử': 'u', 'Ữ': 'u',
      'Ỳ': 'y', 'Ý': 'y', 'Ỵ': 'y', 'Ỷ': 'y', 'Ỹ': 'y',
      'Đ': 'd'
    }

    // Replace Vietnamese characters
    for (const [vietnamese, latin] of Object.entries(vietnameseMap)) {
      str = str.replace(new RegExp(vietnamese, 'g'), latin)
    }

    str = str
      .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
      .replace(/\s+/g, "-") // collapse whitespace and replace by -
      .replace(/-+/g, "-") // collapse dashes

    return str
  }

  useEffect(() => {
    if (autoGenerate && nameValue) {
      const newSlug = generateSlug(nameValue)
      if (newSlug !== value) {
        onChange(newSlug)
      }
    }
  }, [nameValue, autoGenerate, onChange, value])

  const handleManualGenerate = async () => {
    if (!nameValue) return

    setIsGenerating(true)
    // Simulate API call for slug validation/generation
    await new Promise((resolve) => setTimeout(resolve, 500))

    const newSlug = generateSlug(nameValue)
    onChange(newSlug)
    setIsGenerating(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || autoGenerate}
          placeholder="product-slug"
          className="flex-1"
          name={name}
        />

        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || !nameValue || isGenerating}
          onClick={handleManualGenerate}
        >
          <RefreshCw
            className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`}
          />
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={autoGenerate}
          onCheckedChange={setAutoGenerate}
          disabled={disabled}
        />
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          {autoGenerate ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
          <span>Auto-generate from name</span>
        </div>
      </div>
    </div>
  )
}
