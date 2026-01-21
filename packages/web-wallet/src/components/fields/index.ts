/**
 * Field Components
 *
 * Reusable form fields and input components.
 */

// File Upload Zone
export {FileUploadZone} from './FileUploadZone'
export type {FileUploadZoneProps} from './FileUploadZone'

// Form Input Components
export {
  FormRow,
  FormGroup,
  FormInput,
  FormNumberInput,
  FormSelect,
  FormTextarea,
  FormDivider,
  FormSection,
  InfoPanel,
  StepHeader,
  FileItem,
  getFileTypeIcon,
  LoadingIndicator,
  WarningCard,
} from './FormInput'

export type {
  FormRowProps,
  FormGroupProps,
  FormInputType,
  FormInputProps,
  FormNumberInputProps,
  FormSelectOption,
  FormSelectProps,
  FormTextareaProps,
  FormDividerProps,
  FormSectionProps,
  InfoPanelProps,
  StepHeaderProps,
  FileItemProps,
  LoadingIndicatorProps,
  WarningCardProps,
} from './FormInput'

// Contact and Address Cards
export {default as ContactCard} from './ContactCard'
export type {ContactCardProps, ContactCardType, ContactCardField} from './ContactCard'

export {default as AddressCard} from './AddressCard'
export type {AddressCardProps} from './AddressCard'
