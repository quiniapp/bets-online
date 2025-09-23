"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type Language = "es" | "en"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations = {
  es: {
    // Navigation
    "nav.statistics": "Estadísticas",
    "nav.users": "Usuarios",
    "nav.games": "Casino",
    "nav.reports": "Reportes",
    "nav.earnings": "Ganancias",
    "nav.transactions": "Cargas y Descargas",
    "nav.dashboard": "Dashboard",
    "nav.profile": "Perfil",
    "nav.myBets": "Favoritos",
    "nav.settings": "Configuración",

    // User Management
    "users.list": "Lista de Usuarios",
    "users.createManager": "Alta de Gerente",
    "users.createUser": "Alta de Usuario",

    // Reports
    "reports.bets": "Reporte de Apuestas",
    "reports.users": "Reporte de Usuarios",
    "reports.earnings": "Reporte de Ganancias",

    // Earnings
    "earnings.calculate": "Calcular Ganancias",

    // Common
    "common.logout": "Cerrar Sesión",
    "common.admin": "Administrador",
    "common.user": "Usuario",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.edit": "Editar",
    "common.delete": "Eliminar",
    "common.search": "Buscar",
    "common.filter": "Filtrar",
    "common.language": "Idioma",
    "common.spanish": "Español",
    "common.english": "Inglés",

    // Settings
    "settings.title": "Configuración",
    "settings.language": "Idioma de la Plataforma",
    "settings.languageDesc": "Selecciona el idioma para la interfaz",
    "settings.theme": "Tema",
    "settings.themeDesc": "Selecciona el tema de la aplicación",
    "settings.notifications": "Notificaciones",
    "settings.notificationsDesc": "Configurar notificaciones del sistema",

    // Profile
    "profile.title": "Mi Perfil",
    "profile.personalInfo": "Información Personal",
    "profile.username": "Nombre de Usuario",
    "profile.email": "Correo Electrónico",
    "profile.role": "Rol",
    "profile.createdAt": "Fecha de Registro",
    "profile.lastLogin": "Último Acceso",
    "profile.accountSettings": "Configuración de Cuenta",
    "profile.changePassword": "Cambiar Contraseña",
    "profile.twoFactor": "Autenticación de Dos Factores",
    "profile.activityLog": "Registro de Actividad",
  },
  en: {
    // Navigation
    "nav.statistics": "Statistics",
    "nav.users": "Users",
    "nav.games": "Games",
    "nav.reports": "Reports",
    "nav.earnings": "Earnings",
    "nav.transactions": "Deposits & Withdrawals",
    "nav.dashboard": "Dashboard",
    "nav.profile": "Profile",
    "nav.myBets": "My Bets",
    "nav.settings": "Settings",

    // User Management
    "users.list": "User List",
    "users.createManager": "Create Manager",
    "users.createUser": "Create User",

    // Reports
    "reports.bets": "Bets Report",
    "reports.users": "Users Report",
    "reports.earnings": "Earnings Report",

    // Earnings
    "earnings.calculate": "Calculate Earnings",

    // Common
    "common.logout": "Logout",
    "common.admin": "Administrator",
    "common.user": "User",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.language": "Language",
    "common.spanish": "Spanish",
    "common.english": "English",

    // Settings
    "settings.title": "Settings",
    "settings.language": "Platform Language",
    "settings.languageDesc": "Select the interface language",
    "settings.theme": "Theme",
    "settings.themeDesc": "Select the application theme",
    "settings.notifications": "Notifications",
    "settings.notificationsDesc": "Configure system notifications",

    // Profile
    "profile.title": "My Profile",
    "profile.personalInfo": "Personal Information",
    "profile.username": "Username",
    "profile.email": "Email",
    "profile.role": "Role",
    "profile.createdAt": "Registration Date",
    "profile.lastLogin": "Last Login",
    "profile.accountSettings": "Account Settings",
    "profile.changePassword": "Change Password",
    "profile.twoFactor": "Two-Factor Authentication",
    "profile.activityLog": "Activity Log",
  },
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("es")

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language
    if (savedLanguage && (savedLanguage === "es" || savedLanguage === "en")) {
      setLanguage(savedLanguage)
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
  }

  const t = (key: string): string => {
    return translations[language][key as keyof (typeof translations)[typeof language]] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
