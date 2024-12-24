export interface SocialLinkProps {
  icon: string;
  text: string;
  href: string;
  ariaLabel?: string;
}

export interface AppDownloadProps {
  googlePlayLink: string;
  appStoreLink: string;
  googlePlayImage: string;
  appStoreImage: string;
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
  description: string;
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
  href: string;
  text: string;
  isActive?: boolean;
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
