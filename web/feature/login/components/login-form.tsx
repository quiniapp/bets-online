"use client";
import { useState } from "react";
import Box from "@/components/box";
import { Flex, FlexCol } from "@/components/flex";
import { Input } from "@/components/ui/input";
import { EyeClosed, Eye, ArrowRight, UserIcon } from "lucide-react";
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
    <Card className="w-full sm:w-[420px] border-0 sm:border shadow-none sm:shadow-sm rounded-none sm:rounded-xl">
      <form
        className="w-full flex flex-col gap-4 items-start p-4 sm:p-8"
        onSubmit={handleSubmit}
      >
        <FlexCol className="w-full gap-4 sm:gap-6">
          <FlexCol className="gap-1 w-full justify-center items-center text-center">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-20 w-auto mx-auto mb-1"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <CardTitle>
              <h1 className="text-xl sm:text-2xl font-medium">Ingresar</h1>
            </CardTitle>
            <CardContent className="p-0 hidden sm:block">
              <p className="text-sm text-zinc-500">
                Ingresa con tu nombre de usuario y contraseña para poder administrar tu cuenta.
              </p>
            </CardContent>
          </FlexCol>

          <FlexCol className="w-full gap-4 sm:gap-5">
            <FlexCol className="space-y-3">
              <FlexCol className="space-y-1.5">
                <Label htmlFor="email">Usuario</Label>
                <Box className="w-full">
                  <Flex className="absolute items-center justify-end right-0 h-full pr-2 text-zinc-400">
                    <UserIcon size={16} className="text-current" />
                  </Flex>
                  <Input
                    id="email"
                    type="text"
                    placeholder="Nombre de usuario"
                    {...register("email", validationRules.email)}
                    className={errors.email ? "border-red-500" : ""}
                  />
                </Box>
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email.message}</p>
                )}
              </FlexCol>

              <FlexCol className="space-y-1.5">
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
                <p className="text-xs cursor-pointer hover:underline">recuperar contraseña</p>
              </FlexCol>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </FlexCol>

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
          </FlexCol>
        </FlexCol>
      </form>
    </Card>
  );
};

export default LoginForm;