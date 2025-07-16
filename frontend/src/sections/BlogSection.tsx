import React from "react";
import { BlogPost } from "../components/BlogPost";
import styles from '../styles/BlogSection.module.css';

interface BlogProps {
  blogPosts: {
    image: string;
    title: string;
    description: string;
    href: string;
    imageAlt: string;
  }[];
}

function useResponsiveGrid() {
  const [isMd, setIsMd] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsMd(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMd;
}

export const BlogSection: React.FC<BlogProps> = ({ blogPosts }) => {
  const isMd = useResponsiveGrid();
  return (
    <section className={styles.section} id="blog">
      {/* Background decorative elements */}
      <div className={styles.bgDecor1} />
      <div className={styles.bgDecor2} />
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.header}>
          <p className={styles.headerLabel}>Insights & Updates</p>
          <h2 className={styles.headerTitle}>
            Latest from{' '}
            <span className={styles.headerTitleAccent}>our blog</span>
          </h2>
          <p className={styles.headerSubtitle}>
            Stay updated with the latest trends, insights, and best practices in AI-powered business automation
          </p>
        </div>
        {/* Blog Posts Grid */}
        <div className={isMd ? styles.gridMd : styles.grid}>
          {blogPosts.map((post, index) => (
            <BlogPost key={index} {...post} />
          ))}
        </div>
      </div>
    </section>
  );
};