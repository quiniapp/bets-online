import { MainMenu } from "@/common/menu.constant";

import AsideMenu from "../menu";

const Sidebar = () => {
    return (
        <aside aria-label="aside" tabIndex={0} className="h-full grid grid-rows-[1fr_auto] bg-white w-sidebar">
            <AsideMenu menu={MainMenu} />
            <div>menu</div>
        </aside>
    )
}
export default Sidebar;