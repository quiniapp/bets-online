import Box from "@/components/box";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { Flex } from "@/components/flex";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <Flex className="h-full w-screen">
            <Box className="h-full bg-slate-200 w-screen grid grid-rows-[auto_1fr_auto] ">
                <Header />
                <Box className="grid grid-cols-[300px_1fr] gap-md w-full">
                    <Sidebar />
                    <Box className="grid grid-rows-[1fr_auto]">
                        {children}
                        <Flex> footer</Flex>
                    </Box>
                </Box>
            </Box>
        </Flex>
    )
}