import { Flex, FlexCol } from "@/components/flex";
import { Card } from "@/components/ui/card";

const HeroBannerIndex = () => {
    return (
        <Flex className="carousel space-x-4">
            {[...Array(3)].map(() =>(
                <Card className="flex-1 h-[50dvh] card"> banner</Card>
            ))}
        </Flex>
    )
}
export default HeroBannerIndex;