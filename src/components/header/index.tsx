"use client"
import {useState} from 'react'
import Box from "../box";
import { Flex } from "../flex";

import { MoonIcon, SunIcon} from 'lucide-react'
import Link from 'next/link';

const Header = () => {
    const [theme, setTheme] = useState('light')
    return (
        <header className="w-full bg-slate-100 grid grid-cols-[300px_1fr] p-3">
            <Flex>
                <Link href='/admin/'> logo</Link>
            </Flex>
            <Flex className="justify-between">
                <Flex> primer menu  </Flex>
                <Flex>
                    <Box>
{theme}
                    </Box>
                    <MoonIcon onClick={() => setTheme('dark')} />
                    <SunIcon onClick={() => setTheme('light')}/>
                </Flex>
            </Flex>
        </header>
    )
}
export default Header;