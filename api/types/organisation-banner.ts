export type OrganisationBannerRecord = {
  uid: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  category: string;
  isPublished: boolean;
  isAiGenerated: boolean;
  sourceNewsUid: number | null;
  carouselOrder: number | null;
  createdAt: string;
  updatedAt: string;
};

export type GetOrganisationBannersResponse = {
  banners: OrganisationBannerRecord[];
  aiGeneratedToday: number;
  liveInAppUids: number[];
};

export type ShopBannerRecord = {
  uid: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  category: string;
};

export type GetShopBannersResponse = {
  banners: ShopBannerRecord[];
  message?: string;
};

export type CreateOrganisationBannerBody = {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  category: string;
  isPublished?: boolean;
};

export type PatchOrganisationBannerBody = Partial<CreateOrganisationBannerBody>;

export type GenerateOrganisationBannersBody = {
  count?: number;
  theme?: string;
};

export type BannerSuggestion = {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  newsContent: string;
  image: string;
  selected?: boolean;
};

export type PreviewOrganisationBannersResponse = {
  suggestions: BannerSuggestion[];
  message: string;
};

export type ConfirmOrganisationBannersBody = {
  suggestions: BannerSuggestion[];
};

export type ConfirmOrganisationBannersResponse = {
  created: number;
  banners: OrganisationBannerRecord[];
  message: string;
};

export type SetActiveOrganisationBannersBody = {
  uids: number[];
};

export type SetActiveOrganisationBannersResponse = {
  liveInAppUids: number[];
  message: string;
};

export type GenerateOrganisationBannersResponse = {
  created: number;
  banners: OrganisationBannerRecord[];
  message: string;
};
