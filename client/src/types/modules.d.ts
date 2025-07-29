// Type declarations for JavaScript modules that haven't been converted to TypeScript yet

declare module '../components/Login' {
  import React from 'react'
  const Login: React.ComponentType<any>
  export default Login
}

declare module '../LanguageHelper' {
  import React from 'react'
  const LanguageHelper: React.ComponentType<any>
  export const LanguageSelector: React.ComponentType<any>
  export default LanguageHelper
}

declare module '../hooks/useLanguageHelper' {
  export const useLanguageConfig: () => any
}

// Generic fallbacks
declare module '*.jsx' {
  import React from 'react'
  const Component: React.ComponentType<any>
  export default Component
}

declare module '*.js' {
  const value: any
  export default value
}

// Allow imports of SCSS files
declare module '*.scss' {
  const content: Record<string, string>
  export default content
}

declare module '*.css' {
  const content: Record<string, string>
  export default content
}

// Allow imports of SVG files
declare module '*.svg' {
  const content: string
  export default content
}

// Allow imports of image files
declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

declare module '*.jpeg' {
  const content: string
  export default content
}

declare module '*.gif' {
  const content: string
  export default content
}

declare module '*.webp' {
  const content: string
  export default content
}
