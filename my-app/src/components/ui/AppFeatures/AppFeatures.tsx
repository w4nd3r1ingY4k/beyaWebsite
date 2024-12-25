import { FeatureColumn } from "./FeatureColumn";
import { FeatureHeader } from "./FeatureHeader";

export function AppFeatures() {
  return (
  <div className="flex relative flex-col justify-center items-center self-stretch px-20 py-32 w-full min-h-[900px] bg-brandPink max-md:px-5 max-md:py-24 max-md:mt-10 max-md:max-w-full bg-gradient-to-r from-brandPink to-pink-600">
      <div className="flex relative flex-col items-center mb-0 w-full max-w-[1126px] max-md:mb-2.5 max-md:max-w-full">
        <FeatureHeader />
        <div className="self-stretch mt-16 max-md:mt-10 max-md:max-w-full">
          <div className="flex gap-5 max-md:flex-col">
            <FeatureColumn
              position="left"
              features={[
                {
                  icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/43431b66f1f83d6e0e68bd91581ed9eebb56afa2d4fd0b6fefc47f6981a7e992?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
                  title: "unlimiter features",
                  description:
                    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
                },
                {
                  icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/9799e7e0a958388cd9bbe8d12744be0e3177ef5a2db06ddb5c4ba7bd2ffa30e3?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
                  title: "awsome ui design",
                  description:
                    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
                },
              ]}
            />
            <FeatureColumn
              position="center"
              features={[
                {
                  centerImage:
                    "assets/landing_page/features_image.png",
                },
              ]}
            />
            <FeatureColumn
              position="right"
              features={[
                {
                  icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/e7ef7a3eea63044cc9602cbdeaa294f78423bbfe2a63527dfa30b82893d993bc?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
                  title: "iso & androind version",
                  description:
                    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
                },
                {
                  icon: "https://cdn.builder.io/api/v1/image/assets/TEMP/ec499e41ff62426332adb53d41da9d0b76e1a56ea1039f8342c9b3af5d1b65c2?placeholderIfAbsent=true&apiKey=81df03e36d684043a7cd51a4520bc0ac",
                  title: "retina ready greaphics",
                  description:
                    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
                },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
