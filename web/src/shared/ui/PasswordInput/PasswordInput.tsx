import { useState, type ComponentProps, type ReactElement } from 'react'
import { IconButton } from '../IconButton/IconButton'
import { TextInput } from '../TextInput/TextInput'

type PasswordInputProps = Omit<ComponentProps<typeof TextInput>, 'type' | 'trailingContent'>

// PasswordInput is a TextInput with a show/hide toggle.
export function PasswordInput(props: PasswordInputProps): ReactElement {
  const [visible, setVisible] = useState(false)
  return (
    <TextInput
      {...props}
      type={visible ? 'text' : 'password'}
      trailingContent={
        <IconButton
          size="insideField"
          icon={visible ? 'eye-off' : 'eye'}
          label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible(!visible)}
          disabled={props.disabled}
        />
      }
    />
  )
}
