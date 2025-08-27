import Box from "@/components/box";
import HeaderIndex from "@/components/header";
import HeroBannerIndex from "@/feature/hero";
 
export default function LandingPage() {
  return (
    <Box className="grid grid-rows-[auto_1fr_auto] h-full">
      <HeaderIndex />
      <div >
        <HeroBannerIndex />
        <div className="p-4 border-t-1">  games cards</div>
      </div>
      <div> footer</div>
    </Box>

  )
}
