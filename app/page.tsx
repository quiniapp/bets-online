import { FlexCol } from "@/components/flex";
import Box from "@/components/box";
 
import HeaderIndex from "@/components/header";
import HeroBannerIndex from "@/feature/hero";
import Footer from "@/components/footer";
 
export default function LandingPage() {
  return (
    <Box className="grid grid-rows-[auto_1fr_auto] h-full">
      <HeaderIndex />
      <FlexCol>
        <HeroBannerIndex />
        <div className="p-4 border-t-1"> sss games cards</div>
      </FlexCol>
      <Footer />
    </Box>
    )
}
