import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useLanguage } from "@/contexts/language-context";
import { UserRole } from "helper";
import {
  BarChart3,
  Users,
  FileText,
  DollarSign,
  ArrowUpDown,
  Gamepad2,
  User,
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
  const [gamesOpen, setGamesOpen] = useState(false);
  const [casinoOpen, setCasinoOpen] = useState(false);
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
    if (pathname.startsWith('/admin/games') || pathname.startsWith('/admin/providers') || pathname.startsWith('/admin/featured-games') || pathname.startsWith('/admin/banners') || pathname.startsWith('/admin/settings/casino')) {
      setGamesOpen(true);
    }
    if (pathname.startsWith('/user/games')) {
      setCasinoOpen(true);
    }
  }, [pathname]);

  // Función para manejar navegación
  const handleNavigation = (href: string) => {
    console.log("Navigating to:", href);
    setActiveItem(href);
    router.push(href);
  };

  // Menu para SUPERADMIN (Owner) - Máximos permisos
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
        { title: "Alta de Administrador", href: "/admin/users/create-manager" },
        { title: "Alta de Cajero", href: "/admin/users/create-cashier" },
        { title: "Alta de Jugador", href: "/admin/users/create-user" },
      ],
    },
    {
      title: t("nav.games"),
      icon: Gamepad2,
      collapsible: true,
      isOpen: gamesOpen,
      setOpen: setGamesOpen,
      items: [
        { title: "Catálogo", href: "/admin/games" },
        { title: "Proveedores", href: "/admin/providers" },
        { title: "Destacados", href: "/admin/featured-games" },
        { title: "Banners", href: "/admin/banners" },
        { title: "Juegos", href: "/admin/settings/casino" },
      ],
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

  // Menu para ADMIN - Permisos limitados (sin juegos/casino)
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
        { title: "Alta de Administrador", href: "/admin/users/create-manager" },
        { title: "Alta de Cajero", href: "/admin/users/create-cashier" },
        { title: "Alta de Jugador", href: "/admin/users/create-user" },
      ],
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

  // Menu para CASHIER - Gestión de usuarios y balance (sin casino)
  const cashierMenuItems: MenuItem[] = [
    {
      title: "Inicio",
      href: "/cashier/dashboard",
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
        { title: "Alta de Cajero", href: "/admin/users/create-cashier" },
        { title: "Alta de Jugador", href: "/admin/users/create-user" },
      ],
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
      title: "Casino",
      icon: Gamepad2,
      collapsible: true,
      isOpen: casinoOpen,
      setOpen: setCasinoOpen,
      items: [
        { title: "Todos los juegos", href: "/user/games" },
        { title: "Slots", href: "/user/games?type=VideoSlot" },
        { title: "Casino en Vivo", href: "/user/games?type=LiveGames" },
        { title: "Ruletas", href: "/user/games?type=Roulette" },
        { title: "Otros", href: "/user/games?type=__otros__" },
      ],
    },
    {
      title: t("nav.profile"),
      href: "/user/profile",
      icon: User,
    },
  ];

  // Seleccionar menu según el role exacto
  const getMenuItems = () => {
    switch (role) {
      case UserRole.OWNER:
        return superAdminMenuItems;
      case UserRole.ADMIN:
        return adminMenuItems;
      case UserRole.CASHIER:
        return cashierMenuItems;
      case UserRole.PLAYER:
        return userMenuItems;
      default:
        return userMenuItems;
    }
  };

  // Mostrar rol correcto
  const getRoleDisplay = () => {
    switch (role) {
      case UserRole.OWNER:
        return "Propietario";
      case UserRole.ADMIN:
        return "Administrador";
      case UserRole.CASHIER:
        return "Cajero";
      case UserRole.PLAYER:
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