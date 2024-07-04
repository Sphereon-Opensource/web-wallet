export const formatDate = (dateString?: string): string => {
  const userDateTimeOpts = Intl.DateTimeFormat().resolvedOptions()
  if (!dateString) {
    return ''
  }
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    console.error('Invalid date:', dateString)
    return 'Invalid date'
  }

  return new Intl.DateTimeFormat(userDateTimeOpts.locale, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: userDateTimeOpts.timeZone,
  }).format(date)
}
