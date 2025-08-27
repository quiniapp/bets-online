"use client"

import { useState } from 'react'

import Box from "@/components/box";
import { Flex, FlexCol } from "@/components/flex";
import { Input } from "@/components/ui/input";
import { EyeClosed, Eye, ArrowRight, MailIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const LoginForm = () => {
    const [showPassword, setShowPassword] = useState(false)

    const handleShowPassword = () => {
        setShowPassword(!showPassword)
    }

    return (

        <form className=' w-md flex flex-col gap-lg items-start border-1 border-zinc-100 p-6 rounded-sm'>
            <FlexCol className='w-full gap-8'>
                <FlexCol className='gap-2 w-xs'>
                    <Box>
                        <h1 className='text-big font-medium'> Ingresar</h1>
                    </Box>
                    <p className='text-sm text-zinc-500'> Ingresa con tu clave y contraseña para poder administrar tu cuenta.</p>
                </FlexCol>

                <FlexCol className='w-full gap-8'>
                    <FlexCol className='space-y-4'>
                        <FlexCol className='space-y-2'>
                            <Label htmlFor='user'> Usuario</Label>
                            <Box className='w-full' >
                                <Flex className='absolute items-center justify-end items-center right-0 h-full pr-2 text-zinc-400'>
                                    <MailIcon size={16} className='text-current' />
                                </Flex>
                                <Input id='user' type='text' placeholder="usuario@mail.com " />
                            </Box>
                        </FlexCol>
                        <FlexCol className='space-y-2'>
                            <Label htmlFor='pasword'> Contraseña</Label>
                            <Box className='w-full' >
                                <Flex className='absolute items-center justify-end items-center right-0 h-full pr-2 text-zinc-400' onClick={handleShowPassword}>
                                    {!showPassword ? <EyeClosed size={16} className='text-current' /> : <Eye size={16} className='text-current' />}
                                </Flex>
                                <Input id='password' name='password' type={!showPassword ? 'password' : 'text'} placeholder="password " />
                            </Box>
                        </FlexCol>
                    </FlexCol>
                    <Flex className='w-full'>
                        <Flex className='flex-1'><Button className='!bg-[#C41E3A] shadow-lg shadow-[#C41E3A]/50 w-full '> Ingresar a la cuenta <ArrowRight /> </Button></Flex>
                        <Flex className='flex-1'></Flex>

                    </Flex>
                </FlexCol>
            </FlexCol>
        </form>
    )
}
export default LoginForm;