import { Flex, FlexCol } from "@/components/flex";
import Box from "@/components/box";
 
import HeaderIndex from "@/components/header";
import HeroBannerIndex from "@/feature/hero";
import Footer from "@/components/footer";
import GamesList from "@/components/games";
 
export default function LandingPage() {
  return (
    <Box className="grid grid-rows-[auto_1fr_auto] h-full">
      <HeaderIndex />
      <FlexCol className="carousel">
        <HeroBannerIndex />
        <Flex className="p-4 border-t-1 justify-center">
          <GamesList />
        </Flex>
      </FlexCol>
      <Footer />
    </Box>
    )
}
