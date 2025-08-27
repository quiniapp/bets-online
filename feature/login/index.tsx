"use client"

import Box from "@/components/box";
import { Flex, FlexCol } from "@/components/flex";
import React from "react";
import LoginForm from "./components/login-form";


const LoginPageContent = () => {
    return (
        <Box className="grid grid-cols-[1fr_600px] h-full bg-pink-100">
            <Flex>imagen</Flex>
            <FlexCol className="h-full items-center justify-center border-l-1 bg-white">
                <LoginForm />
                
            </FlexCol>
        </Box>
    )
}
export default LoginPageContent;