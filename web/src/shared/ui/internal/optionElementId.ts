// optionElementId builds the DOM id of an option in a list, for aria-activedescendant.
export function optionElementId(listId: string, optionIndex: number): string {
  return `${listId}-opt-${optionIndex}`
}
