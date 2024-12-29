import { Slide } from "./types";

const icon1 = "https://cdn.builder.io/api/v1/image/assets/TEMP/43431b66f1f83d6e0e68bd91581ed9eebb56afa2d4fd0b6fefc47f6981a7e992";
const icon2 = "https://cdn.builder.io/api/v1/image/assets/TEMP/9799e7e0a958388cd9bbe8d12744be0e3177ef5a2db06ddb5c4ba7bd2ffa30e3";
const icon3 = "https://cdn.builder.io/api/v1/image/assets/TEMP/e7ef7a3eea63044cc9602cbdeaa294f78423bbfe2a63527dfa30b82893d993bc";
const icon4 = "https://cdn.builder.io/api/v1/image/assets/TEMP/ec499e41ff62426332adb53d41da9d0b76e1a56ea1039f8342c9b3af5d1b65c2";

/*
    TODO:
    Locales, teams and checkout have two mockups. Need to click on the image and flip to the other mockup.
*/
export const slides: Slide[] = [
    // Signup Slide
    {
        columns: [
            {
                position: "left",
                features: [
                    {
                        icon: icon1,
                        title: "Scope",
                        description: "The Signup process enables new users to create an account on Beya by providing personal, business, and verification details to access the platform.",
                    },
                    {
                        icon: icon2,
                        title: "Motivation",
                        description: "A streamlined signup process ensures users can quickly and securely set up their accounts, creating a smooth onboarding experience and building secure accounts for transactions.",
                    },
                ],
            },
            {
                position: "center",
                features: [
                    {
                        centerImage: ["assets/pages/signup.png"],
                    },
                ],
            },
            {
                position: "right",
                features: [
                    {
                        icon: icon3,
                        title: "UX",
                        description: "Designed with a step-by-step flow, the Signup process ensures users provide required information, verify details, and review terms through intuitive and guided slides.",
                    },
                    {
                        icon: icon4,
                        title: "Functionality",
                        description: "Users will input personal and business information, connect their payment methods, verify email addresses, and accept terms to activate their accounts."
                        ,
                    },
                ],
            },
        ],
    },
    // Profiles Slide
    {
        columns: [
            {
                position: "left",
                features: [
                    {
                        icon: icon1,
                        title: "Scope",
                        description: "The Profile Page provides vendors with a centralized hub to view and edit their account details, track activity, and access support information.",
                    },
                    {
                        icon: icon2,
                        title: "Motivation",
                        description: "This page ensures vendors can manage their business profiles efficiently while accessing key information and resources, fostering trust and usability.",
                    },
                ],
            },
            {
                position: "center",
                features: [
                    {
                        centerImage: ["assets/pages/profile.png"],
                    },
                ],
            },
            {
                position: "right",
                features: [
                    {
                        icon: icon3,
                        title: "UX",
                        description: "The Profile Page is accessible from the main menu, designed with a clean layout for quick edits and seamless navigation to related support links.",
                    },
                    {
                        icon: icon4,
                        title: "Functionality",
                        description: "Vendors can update profile fields, review their activity stats (e.g., locales joined, collaboration status), and access FAQs or support contacts.",
                    },
                ],
            },
        ],
    },
    {
        // Items Slide
        columns: [
            {
                position: "left",
                features: [
                    {
                        icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/43431b66f1f83d6e0e68bd91581ed9eebb56afa2d4fd0b6fefc47f6981a7e992?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
                        title: "Scope",
                        description: "Items let small businesses intuitively manage inventory, tracking products ready to be sold and their components with ease.",
                    },
                    {
                        icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/9799e7e0a958388cd9bbe8d12744be0e3177ef5a2db06ddb5c4ba7bd2ffa30e3?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
                        title: "Motivation",
                        description: "Inventory management empowers small businesses, aligning with our mission to enhance operational success.",
                    },
                ],
            },
            {
                position: "center",
                features: [
                    {
                        centerImage: ["assets/pages/features_image.png"],
                    },
                ],
            },
            {
                position: "right",
                features: [
                    {
                        icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/e7ef7a3eea63044cc9602cbdeaa294f78423bbfe2a63527dfa30b82893d993bc?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
                        title: "UX",
                        description: "Accessible on app entry, the Items widget offers quick edits via pop-up UI or conversational input.",
                    },
                    {
                        icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/ec499e41ff62426332adb53d41da9d0b76e1a56ea1039f8342c9b3af5d1b65c2?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
                        title: "Functionality",
                        description: "Create, update, and delete items or inventory with features designed for seamless inventory control.",
                    },
                ],
            },
        ],
    },
    // Orders Slide
    {
        columns: [
            {
                position: "left",
                features: [
                    {
                        icon: icon1,
                        title: "Scope",
                        description: "The Orders page allows businesses to track and manage all customer orders, categorized as pending or fulfilled, while also enabling manual order entry for custom cases.",
                    },
                    {
                        icon: icon2,
                        title: "Motivation",
                        description: "Efficient order management ensures businesses can stay organized, fulfill orders promptly, and handle customer-specific needs, reinforcing trust and satisfaction.",
                    },
                ],
            },
            {
                position: "center",
                features: [
                    {
                        centerImage: ["assets/pages/orders.png"],
                    },
                ],
            },
            {
                position: "right",
                features: [
                    {
                        icon: icon3,
                        title: "UX",
                        description: "The Orders page integrates seamlessly with the app, offering a clean layout for viewing order statuses and editing details via an intuitive pop-up UI.",
                    },
                    {
                        icon: icon4,
                        title: "Fuctionality",
                        description: "Users can view, update, and track orders, add notes, edit details, and manually input custom orders for items not listed in the checkout.",
                    },
                ],
            },
        ],
    },
    // Locales and Events Slide
    {
        columns: [
            {
                position: "left",
                features: [
                    {
                        icon: icon1,
                        title: "Scope",
                        description: "The Locales Page helps vendors and businesses discover and connect with nearby locations, events, and collaboration opportunities.",
                    },
                    {
                        icon: icon2,
                        title: "Motivation",
                        description: "Connecting businesses with local communities encourages collaboration, boosts visibility, and drives engagement, fostering mutual growth and networking.",
                    },
                ],
            },
            {
                position: "center",
                features: [
                    {
                        centerImage: ["assets/pages/locales.png", "assets/pages/events.png"],
                        // centerImage: "assets/pages/events.png",
                    },
                ],
            },
            {
                position: "right",
                features: [
                    {
                        icon: icon3,
                        title: "UX",
                        description: "Accessible through the main navigation, the Locales Page presents a map-based interface to explore events and locales with detailed pop-ups for quick insights.",
                    },
                    {
                        icon: icon4,
                        title: "Fuctionality",
                        description: "Users can view nearby locales, join events, create collaborations with other vendors, and access detailed profiles for each location or event.",
                    },
                ],
            },
        ],
    },
    // Teams Page 
    {
        columns: [
            {
                position: "left",
                features: [
                    {
                        icon: icon1,
                        title: "Scope",
                        description: "The Teams Page helps businesses manage their team members and assign tasks efficiently, all in one central location.",
                    },
                    {
                        icon: icon2,
                        title: "Motivation",
                        description: "Team management ensures smooth collaboration by enabling clear task assignments, progress tracking, and quick communication, fostering operational success.",
                    },
                ],
            },
            {
                position: "center",
                features: [
                    {
                        centerImage: ["assets/pages/teams.png", "assets/pages/teams2.png"],
                    },
                ],
            },
            {
                position: "right",
                features: [
                    {
                        icon: icon3,
                        title: "UX",
                        description: "Accessible from the main app interface, the Teams Page provides an intuitive layout with tabs for members and actions, QR code sharing, and task filtering.",
                    },
                    {
                        icon: icon4,
                        title: "Functionality",
                        description: "Users can view team member roles, assign and track tasks with status updates (e.g., pending or completed), and share access via QR code.",
                    },
                ],
            },
        ],
    },
    // Checkout Slide
    {
        columns: [
            {
                position: "left",
                features: [
                    {
                        icon: icon1,
                        title: "Scope",
                        description: "The Checkout Page allows vendors to finalize sales efficiently, manage itemized orders, and accept payments through an intuitive interface.",
                    },
                    {
                        icon: icon2,
                        title: "Motivation",
                        description: "An easy-to-use checkout system simplifies the sales process, enhances accuracy, and ensures a seamless customer experience.",
                    },
                ],
            },
            {
                position: "center",
                features: [
                    {
                        centerImage: ["assets/pages/checkout.png", "assets/pages/checkout2.png"],
                    },
                ],
            },
            {
                position: "right",
                features: [
                    {
                        icon: icon3,
                        title: "UX",
                        description: "Located within the app, the Checkout Page provides a clear layout with itemized details, a numeric pad for custom amounts, and actionable buttons for quick processing.",
                    },
                    {
                        icon: icon4,
                        title: "Functionality",
                        description: "Vendors can adjust item quantities, review the order basket, enter custom payment amounts, and finalize sales with a single click.",
                    },
                ],
            },
        ],
    },
]