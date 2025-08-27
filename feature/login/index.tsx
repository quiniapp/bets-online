"use client"

import Box from "@/components/box";
import { Flex, FlexCol } from "@/components/flex";
import React from "react";
import LoginForm from "./components/login-form";


const LoginPageContent = () => {
    return (
        <Box className="grid grid-cols-1 bg-primary-foreground  h-full ">
            
            <FlexCol className="h-full items-center justify-center   ">
                <LoginForm />
            </FlexCol>
        </Box>
    )
}
export default LoginPageContent;