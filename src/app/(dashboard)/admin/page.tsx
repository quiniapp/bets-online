import Box from "@/components/box";
import Sidebar from "@/components/sidebar";

interface MainProps {
    children: React.ReactNode
}

export default function Main({children}: MainProps){
    return (
        <Box className="grid">
             
            {children}
        </Box>
    )
}