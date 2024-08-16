import React, {CSSProperties, ReactElement} from 'react'
import CreatableSelect from 'react-select/creatable'
import {CSSObjectWithLabel} from 'react-select'
import {backgroundColors, fontColors} from '@sphereon/ui-components.core'

type DropDownOption = {
  label: string
  value: any
}

type Props<T extends DropDownOption> = {
  onChange?: (value: any) => Promise<void>
  noOptionsMessage?: string
  placeholder?: string
  defaultValue?: T
  inlineOption?: InlineOption
  options: Array<T>
  style?: CSSProperties
}

type InlineOption = {
  caption: string
  onCreate: (name: string) => Promise<void>
}

const DropDownList = <T extends DropDownOption>(props: Props<T>): ReactElement => {
  const {onChange, noOptionsMessage, placeholder, defaultValue, inlineOption, options = [], style} = props
  const creatableProps = inlineOption
    ? {
        allowCreateWhileLoading: true,
        isValidNewOption: () => true,
        onCreateOption: inlineOption.onCreate,
        createOptionPosition: 'last' as const,
        formatCreateLabel: (inputValue: string) => `${inlineOption.caption}`,
      }
    : {}
  return (
    <CreatableSelect
      styles={{
        control: (provided: CSSObjectWithLabel, state) => ({
          ...provided,
          ...style,
          maxWidth: 455,
          borderColor: state.isFocused ? '#7276F7' : provided.borderColor,
          '&:hover': {
            borderColor: '#7276F7',
          },
          boxShadow: 'none',
          height: 48,
          backgroundColor: backgroundColors.primaryLight,
        }),
        menu: (provided: CSSObjectWithLabel) => ({
          ...provided,
          ...style,
          maxWidth: 455,
        }),
        option: (provided: CSSObjectWithLabel, state) => ({
          ...provided,
          color: 'rgba(17, 17, 19, 0.60)',
          backgroundColor: state.isSelected ? '#7B61FF' : state.isFocused ? '#B7B8D9' : backgroundColors.primaryLight,
          '&:hover': {
            backgroundColor: '#B7B8D9',
          },
        }),
        singleValue: (provided: CSSObjectWithLabel) => ({
          ...provided,
          color: fontColors.dark,
        }),
      }}
      defaultValue={defaultValue}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      noOptionsMessage={noOptionsMessage ? (): string => noOptionsMessage : undefined}
      maxMenuHeight={210}
      {...creatableProps}
    />
  )
}

export default DropDownList
