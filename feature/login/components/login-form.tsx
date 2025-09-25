"use client";
import { useState } from "react";
import Box from "@/components/box";
import { Flex, FlexCol } from "@/components/flex";
import { Input } from "@/components/ui/input";
import { EyeClosed, Eye, ArrowRight, MailIcon, UsersIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { Alert, AlertDescription } from "@/components/ui/alert";
import useLogin from "../hook/useLogin";
import { Card, CardContent, CardTitle } from "@/components/ui/card";

const LoginForm = () => {
  const {
    register,
    handleSubmit,
    errors,
    isLoading,
    error,
    validationRules
  } = useLogin();

  const [showPassword, setShowPassword] = useState(false);

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Card >

   
    <form
      className="w-full flex flex-col gap-lg items-start  p-6 rounded-sm xs:mpx-4" 
      onSubmit={handleSubmit}
    >
      <FlexCol className="w-full gap-8">
        <FlexCol className="gap-2 w-full justify-center items-center text-center">
          <Flex className="text-blue-600 bg-blue-100 p-4 rounded-full"  aria-setsize={24}   >
            <UsersIcon color="currentColor" size={32} />
          </Flex>
          <CardTitle>
            <h1 className="text-2xl font-medium">Ingresar</h1>
          </CardTitle>
          <CardContent>
            <p className="text-sm text-zinc-500">
            Ingresa con tu email y contraseña para poder administrar tu cuenta.
          </p>
          </CardContent>
        </FlexCol>
        
        <FlexCol className="w-full gap-10">
          <FlexCol className="space-y-4">

            <FlexCol className="space-y-2">
              <Label htmlFor="email">Usuario</Label>
              <Box className="w-full">
                <Flex className="absolute items-center justify-end right-0 h-full pr-2 text-zinc-400">
                  <MailIcon size={16} className="text-current" />
                </Flex>
                <Input
                  id="email"
                  type="text"
                  placeholder="usuario@mail.com o admin"
                  {...register("email", validationRules.email)}
                  className={errors.email ? "border-red-500" : ""}
                />
              </Box>
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </FlexCol>

            <FlexCol className="space-y-2">
                <FlexCol className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Box className="w-full">
                        <Flex
                        className="absolute items-center justify-end right-0 h-full pr-2 text-zinc-400 cursor-pointer"
                        onClick={handleShowPassword}
                        >
                        {!showPassword ? (
                            <EyeClosed size={16} className="text-current" />
                        ) : (
                            <Eye size={16} className="text-current" />
                        )}
                        </Flex>
                        <Input
                        id="password"
                        type={!showPassword ? "password" : "text"}
                        placeholder="Contraseña"
                        {...register("password", validationRules.password)}
                        className={errors.password ? "border-red-500" : ""}
                        />
                    </Box>
                    {errors.password && (
                        <p className="text-red-500 text-sm">{errors.password.message}</p>
                    )}
                    </FlexCol>
                    <p className="text-xs"> recuperar contraseña</p>
            </FlexCol>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </FlexCol>

          {/* Botón Submit */}
          <Flex className="w-full">
            <Flex className="flex-1">
              <Button
                
                className="w-full bg-blue-600"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Ingresando..."
                ) : (
                  <>
                    Ingresar a la cuenta <ArrowRight />
                  </>
                )}
              </Button>
            </Flex>
            
          </Flex>
        </FlexCol>
      </FlexCol>
    </form>
     </Card>
  );
};

export default LoginForm;