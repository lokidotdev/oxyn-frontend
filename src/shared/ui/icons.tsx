import { HugeiconsIcon } from '@hugeicons/react'
import type { IconSvgElement } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  ArrowExpandIcon,
  ArrowLeft01Icon,
  ArrowLeft02Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  Copy01Icon,
  GithubIcon,
  Moon02Icon,
  NewTwitterIcon,
  RefreshIcon,
  SourceCodeIcon,
  Sun03Icon,
  Tick02Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons'

const icon =
  (svg: IconSvgElement, defaultSize = 14) =>
  ({ size = defaultSize }: { size?: number }) => (
    <HugeiconsIcon icon={svg} size={size} strokeWidth={2} aria-hidden="true" />
  )

export const CopyIcon = icon(Copy01Icon)
export const CheckIcon = icon(Tick02Icon)
export const EyeIcon = icon(ViewIcon)
export const CodeIcon = icon(SourceCodeIcon)
export const ExpandIcon = icon(ArrowExpandIcon)
export const ResetIcon = icon(RefreshIcon)
export const SunIcon = icon(Sun03Icon, 16)
export const MoonIcon = icon(Moon02Icon, 16)
export const ArrowLeftIcon = icon(ArrowLeft02Icon)
export const ArrowUpRightIcon = icon(ArrowUpRight01Icon)
export const ChevronLeftIcon = icon(ArrowLeft01Icon)
export const ChevronRightIcon = icon(ArrowRight01Icon)
export const GitHubIcon = icon(GithubIcon, 16)
export const XLogoIcon = icon(NewTwitterIcon, 16)
export const ChevronDownIcon = icon(ArrowDown01Icon)
export const ChevronUpIcon = icon(ArrowUp01Icon)
