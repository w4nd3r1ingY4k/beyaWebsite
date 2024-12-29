export interface SocialLinkProps {
  text: string;
  href: string;
  ariaLabel?: string;
}

export interface AppDownloadProps {
  googlePlayLink: string;
  appStoreLink: string;
  googlePlayImage: string;
  appStoreImage: string;
  disabled?: boolean;
}

export interface HeroSectionProps {
  title: string;
  description: string;
  appDownload: AppDownloadProps;
  heroImage: string;
}

export interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

export interface StatisticProps {
  icon: string;
  value: string;
  label: string;
}

export interface TeamMemberProps {
  image: string;
  name: string;
  role: string;
  socialLinks: SocialLinkProps[];
}

export interface BlogPostProps {
  image: string;
  title: string;
  description: string;
  href: string;
  imageAlt: string;
}

export interface NavLinkProps {
  text: string;
  isActive?: boolean;
}

export interface LogoProps {
  src: string;
  alt: string;
}

export interface FooterProps {
  logo: string;
  description: string;
  socialLinks: SocialLinkProps[];
  quickLinks: NavLinkProps[];
  newsletterTitle: string;
  newsletterDescription: string;
  copyrightText: string;
}

export  interface Feature {
  icon?: string;
  title?: string;
  description?: string;
  centerImage?: string;
}

export interface FeatureColumnProps {
  position: "left" | "center" | "right";
  features: Feature[];
}
