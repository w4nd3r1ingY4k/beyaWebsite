import React from "react";
import { BlogPost } from "../components/BlogPost";

interface BlogProps {
    blogPosts: {
        image: string;
        title: string;
        description: string;
        href: string;
        imageAlt: string;
    }[];
}

const sectionStyle: React.CSSProperties = {
    padding: "80px 0",
    backgroundColor: "#6366f1", // indigo-500
};

const containerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 16px",
};

const headingStyle: React.CSSProperties = {
    fontSize: "1.875rem",
    fontWeight: 600,
    textAlign: "center",
    marginBottom: "48px",
    color: "#FCFCFC",
};

const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "32px",
};

const gridMdStyle: React.CSSProperties = {
    ...gridStyle,
    gridTemplateColumns: "repeat(3, 1fr)",
};

function useResponsiveGrid() {
    const [isMd, setIsMd] = React.useState(window.innerWidth >= 768);
    React.useEffect(() => {
        const onResize = () => setIsMd(window.innerWidth >= 768);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);
    return isMd;
}

export const BlogSection: React.FC<BlogProps> = ({ blogPosts }) => {
    const isMd = useResponsiveGrid();
    return (
        <section style={sectionStyle} id="blog">
            <div style={containerStyle}>
                <h2 style={headingStyle}>Latest Blog Posts</h2>
                <div style={isMd ? gridMdStyle : gridStyle}>
                    {blogPosts.map((post, index) => (
                        <BlogPost key={index} {...post} />
                    ))}
                </div>
            </div>
        </section>
    );
};
