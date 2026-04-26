"use client"
import * as React from "react"
import Autoplay from "embla-carousel-autoplay"

import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel"

const HeroBannerIndex = () => {
    const plugin = React.useRef(
        Autoplay({ delay: 2000, stopOnInteraction: true })
    )

    return (
        <div className="w-full px-2 sm:px-4 py-2 sm:py-4">
            <Carousel plugins={[plugin.current]} className="w-full">
                <CarouselContent className="-ml-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <CarouselItem key={index} className="pl-1">
                            <div className="h-[120px] xs:h-[160px] sm:h-[280px] md:h-[400px] lg:h-[520px] w-full rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 text-lg font-semibold">
                                {index + 1}
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:flex" />
                <CarouselNext className="hidden sm:flex" />
            </Carousel>
        </div>
    )
}
export default HeroBannerIndex
