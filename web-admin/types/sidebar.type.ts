export interface MenuItem {
    title: string;
    icon: any;
    href?: string;
    collapsible?: boolean;
    isOpen?: boolean;
    setOpen?: (open: boolean) => void;
    items?: { title: string; href: string }[];
  }
  
  export interface SidebarProps {
    className?: string;
  }
  