import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import type { MainMenuItem } from "@/types/menu.type";
import { FlexCol } from "../flex";
import Link from "next/link";


interface AsideMenuProps {
    menu: MainMenuItem[]
}
const AsideMenu = ({ menu }: AsideMenuProps) => {
    return (
        <FlexCol>
            {menu.map((item: MainMenuItem) => {
                const hasChildren = item.children && item.children.length > 0;
                return (
                    <FlexCol key={item.id}>
                        {hasChildren ? (
                            <Accordion type="single" collapsible>
                                <AccordionItem value={item.id}>
                                    <AccordionTrigger className="py-0 px-2 h-sidebar-item flex items-center">{item.label}</AccordionTrigger>
                                    <AccordionContent >
                                        {item.children!.map((child) => (
                                            <FlexCol key={child.id} className="px-2 h-sidebar-item flex justify-center items-start">
                                                <Link href={child.link || ''}>
                                                    {child.label}
                                                </Link>
                                            </FlexCol>
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        ) : (
                            <Link className="px-2 flex items-center h-sidebar-item" href={item.link || ''}>{item.label}</Link>
                        )}
                    </FlexCol>
                );
            })}
        </FlexCol>
    )

}
export default AsideMenu;