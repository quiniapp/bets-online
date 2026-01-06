import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { Role } from "@/lib/mock-data";
import {
  BarChart3,
  Users,
  FileText,
  DollarSign,
  ArrowUpDown,
  Gamepad2,
  User,
  History,
  CreditCard,
  Settings,
} from "lucide-react";

interface MenuItem {
  title: string;
  href?: string;
  icon: any;
  collapsible?: boolean;
  isOpen?: boolean;
  setOpen?: (open: boolean) => void;
  items?: { title: string; href: string }[];
}

export const useSidebarNavigation = () => {
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  
  const [usersOpen, setUsersOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(pathname);

  // Actualizar el item activo cuando cambia la ruta
  useEffect(() => {
    setActiveItem(pathname);

    // Auto-abrir collapsibles si la ruta está dentro de ellos
    if (pathname.startsWith('/admin/users')) {
      setUsersOpen(true);
    }
    if (pathname.startsWith('/admin/reports')) {
      setReportsOpen(true);
    }
  }, [pathname]);

  // Función para manejar navegación
  const handleNavigation = (href: string) => {
    console.log("Navigating to:", href);
    setActiveItem(href);
    router.push(href);
  };

  // Menu para SUPERADMIN (Administrador) - Máximos permisos
  const superAdminMenuItems: MenuItem[] = [
    {
      title: t("nav.statistics"),
      href: "/admin/dashboard",
      icon: BarChart3,
    },
    {
      title: t("nav.users"),
      icon: Users,
      collapsible: true,
      isOpen: usersOpen,
      setOpen: setUsersOpen,
      items: [
        { title: t("users.list"), href: "/admin/users" },
        {
          title: "Crear Administrador",
          href: "/admin/users/create-admin",
        },
        {
          title: "Crear Cajero",
          href: "/admin/users/create-manager",
        },
        { title: "Crear Usuario", href: "/admin/users/create-user" },
      ],
    },
    {
      title: t("nav.games"),
      href: "/admin/games",
      icon: Gamepad2,
    },
    {
      title: t("nav.reports"),
      icon: FileText,
      collapsible: true,
      isOpen: reportsOpen,
      setOpen: setReportsOpen,
      items: [
        { title: t("reports.bets"), href: "/admin/reports/bets" },
        { title: t("reports.users"), href: "/admin/reports/users" },
        { title: t("reports.earnings"), href: "/admin/reports/earnings" },
      ],
    },
    {
      title: t("nav.earnings"),
      icon: DollarSign,
      items: [{ title: t("earnings.calculate"), href: "/admin/balances" }],
    },
    {
      title: t("nav.transactions"),
      href: "/admin/transactions",
      icon: ArrowUpDown,
    },
    {
      title: t("nav.settings"),
      href: "/admin/settings",
      icon: Settings,
    },
  ];

  // Menu para ADMIN (Cajero) - Permisos limitados
  const adminMenuItems: MenuItem[] = [
    {
      title: t("nav.statistics"),
      href: "/admin/dashboard",
      icon: BarChart3,
    },
    {
      title: t("nav.users"),
      icon: Users,
      collapsible: true,
      isOpen: usersOpen,
      setOpen: setUsersOpen,
      items: [
        { title: t("users.list"), href: "/admin/users" },
        { title: "Crear Usuario", href: "/admin/users/create-user" },
      ],
    },
    {
      title: t("nav.games"),
      href: "/admin/games",
      icon: Gamepad2,
    },
    {
      title: t("nav.transactions"),
      href: "/admin/transactions",
      icon: ArrowUpDown,
    },
  ];

  // Menu para USER (Jugador) - Panel de usuario normal
  const userMenuItems: MenuItem[] = [
    {
      title: t("nav.dashboard"),
      href: "/user/dashboard",
      icon: BarChart3,
    },
    {
      title: t("nav.profile"),
      href: "/user/profile",
      icon: User,
    },
    {
      title: t("nav.games"),
      href: "/user/games",
      icon: Gamepad2,
    },
    {
      title: t("nav.myBets"),
      href: "/user/bets",
      icon: History,
    },

    {
      title: t("nav.settings"),
      href: "/user/settings",
      icon: Settings,
    },
  ];

  // Seleccionar menu según el role exacto
  const getMenuItems = () => {
    switch (role) {
      case Role.superadmin:
        return superAdminMenuItems;
      case Role.admin:
        return adminMenuItems;
      case Role.user:
        return userMenuItems;
      default:
        return userMenuItems;
    }
  };

  // Mostrar rol correcto
  const getRoleDisplay = () => {
    switch (role) {
      case Role.superadmin:
        return "Administrador";
      case Role.admin:
        return "Cajero";
      case Role.user:
        return "Usuario";
      default:
        return "Usuario";
    }
  };

  return {
    user,
    role,
    pathname,
    activeItem,
    menuItems: getMenuItems(),
    handleNavigation,
    getRoleDisplay,
  };
};