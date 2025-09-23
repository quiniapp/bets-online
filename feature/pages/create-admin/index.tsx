"use client"

import { Save } from "lucide-react"
import { useForm, SubmitHandler, FieldValues } from 'react-hook-form'

import HeadingTitle from "@/components/heading"
import { Flex, FlexCol } from "@/components/flex"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CreateAdminValue = {
   name: string
   email: string
   password: string
   repeatPassword: string
}

const CreateAdminFeature = () => {
   const { register, handleSubmit, reset } = useForm<CreateAdminValue>()

   const onSubmit: SubmitHandler<CreateAdminValue> = (data) => {
      console.log(data);
      if (data.name && data.email && data.password && data.repeatPassword) {
         reset()
      }
   };

   return (
      <div className="space-y-6">
         <div className="space-y-6 max-w-7xl">
            <HeadingTitle
               title="Crear Administrador"
               body="Registra un nuevo Administrador con permisos administrativos"
            />

            <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
               <Card>
                  <CardHeader>
                     <CardTitle>Información Básica</CardTitle>
                  </CardHeader>
                  <FlexCol className="space-y-8">
                     <CardContent className="space-y-4">
                        <Label htmlFor="name">Nombre</Label>
                        <Input id="name" {...register("name")} />
                     </CardContent>

                     <CardContent className="space-y-4">
                        <Label htmlFor="email">Email</Label>
                        <Input
                           id="email"
                           type="email"
                           {...register("email")}
                        />
                     </CardContent>

                     <CardContent className="space-y-4">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input
                           id="password"
                           type="password"
                           {...register("password")}
                        />
                     </CardContent>

                     <CardContent className="space-y-4">
                        <Label htmlFor="repeatPassword">Confirmar Contraseña</Label>
                        <Input
                           id="repeatPassword"
                           type="password"
                           {...register("repeatPassword")}
                        />
                     </CardContent>
                  </FlexCol>
               </Card>

               <Card>
                  <Flex className="px-4 space-x-8">
                     <Button variant="outline" type="button">Cancelar</Button>
                     <Button type="submit">
                        <Save className="mr-2 h-4 w-4" />
                        Crear Administrador
                     </Button>
                  </Flex>
               </Card>
            </form>
         </div>
      </div>
   )
}

export default CreateAdminFeature