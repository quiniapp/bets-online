export interface MainMenuItem {
    id: string;
    label: string;
    link?: string;
    children?: MainMenuItem[];
  }