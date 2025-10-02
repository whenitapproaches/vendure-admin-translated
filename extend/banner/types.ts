import { BannerType } from './constants'

export interface PluginInitOptions {
  /**
   * Whether the banner plugin is enabled
   * @default true
   */
  enabled?: boolean
}

export interface CreateBannerInput {
  name: string
  type: string
  imageAssetId: string
  url?: string
}

export interface UpdateBannerInput {
  id: string
  name?: string
  type?: string
  imageAssetId?: string
  url?: string
}

export interface BannerListOptions {
  skip?: number
  take?: number
  sort?: BannerSortParameter
  filter?: BannerFilterParameter
}

export interface BannerSortParameter {
  id?: 'ASC' | 'DESC'
  name?: 'ASC' | 'DESC'
  type?: 'ASC' | 'DESC'
  createdAt?: 'ASC' | 'DESC'
  updatedAt?: 'ASC' | 'DESC'
}

export interface BannerFilterParameter {
  name?: {
    contains?: string
    eq?: string
  }
  type?: {
    contains?: string
    eq?: string
  }
}
