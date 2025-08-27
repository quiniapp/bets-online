import Link from "next/link";

const HeaderIndex = () => {
    return (
        <header className="flex justify-between p-4 border-b-1">
            <div> logo </div>
            <nav>
                <Link href='/login'>
                    login
                </Link>
            </nav>
        </header>
    )
}
export default HeaderIndex;