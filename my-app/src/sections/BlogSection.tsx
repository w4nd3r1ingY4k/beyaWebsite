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


export const BlogSection: React.FC<BlogProps> = ({ blogPosts }) => {
    return (
        <section className="py-20 bg-indigo-700" id="blog">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-bold text-center mb-12 text-gray-50">Latest Blog Posts</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {blogPosts.map((post, index) => (
                        <BlogPost key={index} {...post} />
                    ))}
                </div>
            </div>
        </section>
    );
};
