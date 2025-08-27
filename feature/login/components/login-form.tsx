"use client";
import { useState } from "react";
import Box from "@/components/box";
import { Flex, FlexCol } from "@/components/flex";
import { Input } from "@/components/ui/input";
import { EyeClosed, Eye, ArrowRight, MailIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { Alert, AlertDescription } from "@/components/ui/alert";
import useLogin from "../hook/useLogin";

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
    <form
      className="w-md flex flex-col gap-lg items-start border-1 border-zinc-100 p-6 rounded-sm"
      onSubmit={handleSubmit}
    >
      <FlexCol className="w-full gap-8">
        <FlexCol className="gap-2 w-xs">
          <Box>
            <h1 className="text-big font-medium">Ingresar</h1>
          </Box>
          <p className="text-sm text-zinc-500">
            Ingresa con tu email y contraseña para poder administrar tu cuenta.
          </p>
        </FlexCol>
        
        <FlexCol className="w-full gap-8">
          <FlexCol className="space-y-4">
            {/* Campo Email/Usuario */}
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
                variant="outline"
                className="w-full"
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
            <Flex className="flex-1"></Flex>
          </Flex>
        </FlexCol>
      </FlexCol>
    </form>
  );
};

export default LoginForm;