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
import { Card, CardContent } from "@/components/ui/card"
import { Flex } from "@/components/flex";

const HeroBannerIndex = () => {
  const plugin = React.useRef(
    Autoplay({ delay: 2000, stopOnInteraction: true })
  )



    return (
        <Carousel  plugins={[plugin.current]} className="w-full max-w-[95vw] py-4">
            <CarouselContent className="-ml-1">
                {Array.from({ length: 5 }).map((_, index) => (
                    <CarouselItem key={index} className="pl-1 md:w-full lg:w-full h-[600px]">
                        <Flex className="p-1 items-center bg-pink  h-full">
                            <Card className="flex-1 h-full bg-pink">
                                <CardContent className="flex h-full  items-center justify-center bg-pink ">
                                    <span className="text-2xl font-semibold">{index + 1}</span>
                                </CardContent>
                            </Card>
                        </Flex>
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
        </Carousel>

    )
}
export default HeroBannerIndex;