import { FeatureColumn } from "./FeatureColumn";
import { FeatureHeader } from "./FeatureHeader";
import Slider from "react-slick";
import { slides } from "./featureData";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

// Custom arrow components
const CustomPrevArrow = (props: any) => {
    const { onClick } = props;
    return (
        <div
            className="absolute z-10 left-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
            onClick={onClick}
        >
            <FiChevronLeft size={35} className="text-white" />
        </div>
    );
};

const CustomNextArrow = (props: any) => {
    const { onClick } = props;
    return (
        <div
            className="absolute z-10 right-2 top-1/2 transform -translate-y-1/2 cursor-pointer"
            onClick={onClick}
        >
            <FiChevronRight size={35} className="text-white" />
        </div>
    );
};

export function AppFeatures() {
    const settings = {
        infinite: true,
        speed: 500,
        autoplaySpeed: 3000,
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: true,
        prevArrow: <CustomPrevArrow />,
        nextArrow: <CustomNextArrow />,
    };

    return (
        <div className="flex flex-col justify-center items-center w-full h-screen bg-gradient-to-r from-brandPink to-pink-600 max-md:min-h-[900px] max-md:overflow-y-auto">
            <div className="w-full max-w-[1200px] text-center h-full flex flex-col justify-between overflow-hidden max-md:py-10">
                <FeatureHeader />
                <div className="flex-1 mt-5 w-full h-full max-md:h-auto max-md:overflow-y-auto">
                    <Slider {...settings}>
                        {slides.map((slide, index) => (
                            <div key={index} className="mt-5 h-full flex items-center justify-center">
                                <div className="flex items-center gap-5 max-md:flex-col max-md:gap-8">
                                    {slide.columns.map((column, colIndex) => (
                                        <FeatureColumn
                                            key={colIndex}
                                            position={column.position}
                                            features={column.features}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </Slider>
                </div>
            </div>
        </div>
    );
}
