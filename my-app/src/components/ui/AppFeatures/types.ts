export type Position = "left" | "center" | "right";

export interface Feature {
    icon?: string;
    title?: string;
    description?: string;
    centerImage?: string;
}

export interface Column {
    position: Position;
    features: Feature[];
}

export interface Slide {
    columns: Column[];
}
