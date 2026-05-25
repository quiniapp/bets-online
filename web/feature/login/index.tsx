"use client"

import Box from "@/components/box";
import { FlexCol } from "@/components/flex";
import React from "react";
import LoginForm from "./components/login-form";


const LoginPageContent = () => {
    return (
        <Box className="min-h-full sm:bg-primary-foreground">
            <FlexCol className="min-h-full items-center justify-start sm:justify-center py-2 sm:py-12 px-4 sm:px-0">
                <LoginForm />
            </FlexCol>
        </Box>
    )
}
export default LoginPageContent;