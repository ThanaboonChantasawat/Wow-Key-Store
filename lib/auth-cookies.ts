// Utility functions for managing auth cookies

export const setAuthCookie = (token: string) => {
  if (typeof document !== 'undefined') {
    document.cookie = `firebase-token=${token}; path=/; max-age=3600; secure=${location.protocol === 'https:'}; samesite=strict`
  }
}

export const removeAuthCookie = () => {
  if (typeof document !== 'undefined') {
    document.cookie = 'firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  }
}

export const getAuthCookie = (): string | null => {
  if (typeof document !== 'undefined') {
    const name = 'firebase-token='
    const decodedCookie = decodeURIComponent(document.cookie)
    const cookies = decodedCookie.split(';')
    
    for (let cookie of cookies) {
      cookie = cookie.trim()
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length)
      }
    }
  }
  return null
}