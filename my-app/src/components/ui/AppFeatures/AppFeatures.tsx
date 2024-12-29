import { FeatureColumn } from "./FeatureColumn";
import { FeatureHeader } from "./FeatureHeader";
import Slider from "react-slick";
import { slides } from "./featureData";

export function AppFeatures() {
    const settings = {
        dots: true,
        infinite: true,
        speed: 500,
        autoplaySpeed: 3000,
        slidesToShow: 1,
        slidesToScroll: 1,
        arrows: false,
    };

    return (
        <div className="flex flex-col justify-center items-center w-full h-screen overflow-hidden bg-gradient-to-r from-brandPink to-pink-600">
            <div className="w-full max-w-[1126px] text-center h-full flex flex-col justify-between overflow-hidden">
                <FeatureHeader />
                <div className="flex-1 mt-5 w-full h-full max-md:mt-10 overflow-auto">
                    <Slider {...settings}>
                        {slides.map((slide, index) => (
                            <div key={index} className="mt-5 h-full flex items-center justify-center">
                                <div className="flex items-center gap-5 max-md:flex-col">
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
