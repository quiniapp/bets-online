"use client"

import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {UserIcon} from "lucide-react";
import { ThemeToggle } from "../theme-toggle";

import ROUTER from "@/routes";


const HeaderIndex = () => {
    const  router = useRouter()

    const goToPage = () => {
        return router.push(ROUTER.LOGIN)
    }
    return (
        <header className="flex justify-between p-4 border-b-1">
            <div> logo </div>
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