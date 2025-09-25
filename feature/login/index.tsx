"use client"

import Box from "@/components/box";
import { Flex, FlexCol } from "@/components/flex";
import React from "react";
import LoginForm from "./components/login-form";


const LoginPageContent = () => {
    return (
        <Box className="grid grid-cols-1 xs:bg-pink-200 sm:bg-primary-foreground  h-full ">
            
            <FlexCol className="h-full items-center justify-center  xs:mx-4 ">
                <LoginForm />
            </FlexCol>
        </Box>
    )
}
export default LoginPageContent;