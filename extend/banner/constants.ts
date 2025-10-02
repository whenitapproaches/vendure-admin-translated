export const BANNER_PLUGIN_OPTIONS = Symbol('BANNER_PLUGIN_OPTIONS')

export const BANNER_TYPES = {
  STARTUP: 'startup',
  HERO: 'hero',
  DISCOUNT: 'discount',
} as const

export type BannerType = typeof BANNER_TYPES[keyof typeof BANNER_TYPES]
