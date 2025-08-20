import { Flex } from "../flex";

const Header = () => {
    return (
        <header className="w-full bg-slate-100 grid grid-cols-[300px_1fr] p-3">
            <Flex> logo </Flex>
            <Flex className="justify-between">
                <Flex> primer menu  </Flex>
                <Flex> menu  </Flex>
            </Flex>
        </header>
    )
}
export default Header;