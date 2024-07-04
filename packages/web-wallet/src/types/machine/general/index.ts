export type UIContextType = {
  onNext: () => Promise<void>
  onBack: () => Promise<void>
  step: number
  maxInteractiveSteps: number
  disabled?: boolean
}
