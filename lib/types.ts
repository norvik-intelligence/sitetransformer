export type ID = string;
export type ISODate = string;
export type DeviceMode = "desktop" | "mobile";
export type ProjectStatus = "draft" | "mapping" | "ready" | "error";
export type BlockKind = "hero" | "section" | "text" | "image" | "cta" | "features" | "testimonial" | "pricing" | "faq" | "footer";

export interface BrandTokens {
  name: string;
  logoUrl?: string;
  colors: { primary: string; secondary: string; accent: string; background: string; foreground: string; muted: string };
  typography: { heading: string; body: string; scale: "compact" | "comfortable" | "spacious" };
  radius: number;
  tone: "minimal" | "premium" | "playful" | "editorial" | "enterprise";
}

export interface BlockStyle {
  background?: string;
  foreground?: string;
  paddingY?: number;
  paddingX?: number;
  align?: "left" | "center" | "right";
  radius?: number;
  shadow?: "none" | "sm" | "md" | "lg";
  hiddenOnMobile?: boolean;
}

export interface MappedContent {
  headline?: string;
  eyebrow?: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  imageUrl?: string;
  items?: Array<{ title: string; body?: string; icon?: string; imageUrl?: string }>;
}

export interface SiteBlock {
  id: ID;
  kind: BlockKind;
  name: string;
  content: MappedContent;
  style: BlockStyle;
  locked?: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface PageModel {
  id: ID;
  title: string;
  slug: string;
  seo: { title: string; description: string; image?: string };
  blocks: SiteBlock[];
}

export interface SourceSnapshot {
  url: string;
  title?: string;
  description?: string;
  html?: string;
  text: string;
  images: string[];
  capturedAt: ISODate;
}

export interface MappingConfidence { blockId: ID; score: number; reason: string }

export interface SiteProject {
  id: ID;
  name: string;
  status: ProjectStatus;
  designUrl?: string;
  contentUrl?: string;
  brand: BrandTokens;
  pages: PageModel[];
  activePageId: ID;
  source?: { design?: SourceSnapshot; content?: SourceSnapshot };
  mappingReport?: MappingConfidence[];
  createdAt: ISODate;
  updatedAt: ISODate;
  lastSavedAt?: ISODate;
  error?: string;
}

export interface CloneRequest { designUrl: string; projectName?: string }
export interface ContentMappingRequest { project: SiteProject; contentUrl: string }
export interface CloneResponse { project: SiteProject }
export interface ContentMappingResponse { project: SiteProject; report: MappingConfidence[] }
