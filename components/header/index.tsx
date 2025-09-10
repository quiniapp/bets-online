"use client"

import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {UserIcon} from "lucide-react";
import { ThemeToggle } from "../theme-toggle";

import ROUTER from "@/routes";
import { Flex } from "../flex";


const HeaderIndex = () => {
    const  router = useRouter()

    const goToPage = () => {
        return router.push(ROUTER.LOGIN)
    }
    return (
        <header className="flex justify-between p-4 border-b-1">
            <Flex className="items-center justify-center"> logo </Flex>
            <nav>
                <Button variant='ghost' onClick={goToPage} role='button' aria-label='ingresar'>
                   <UserIcon /> Ingresar
                </Button>
                <ThemeToggle />
            </nav>
        </header>
    )
}
export default HeaderIndex;