// Option is one choice in a Select, MultiCombobox or CheckboxList.
export type Option = {
  value: string
  label: string
  // count is the number of minis with this value, shown in mono at the end of the row.
  count?: number
}
