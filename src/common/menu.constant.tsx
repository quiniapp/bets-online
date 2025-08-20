import type { MainMenuItem } from "@/types/menu.type";
import { UsersRound, ChartArea } from 'lucide-react';

export const MainMenu: MainMenuItem[] = [
    {
      id: '221',
      label: 'Estadisticas',
      link: '/admin/stats',
      icon: <ChartArea size={16} />
    },
    {
      id: '220',
      label: 'Usuarios', 
      link: '/admin/users',
      icon: <UsersRound size={16} />,
      children: [
        {
          id: '290-b',
          label: 'Alta de Gerente',
          link: '/admin/reports/earnings'
        },
        {
            id: '291-b',
            label: 'Alta de usuario',
            link: '/admin/reports/earnings'
          }
      ]
    },
    {
      id: '290',
      label: 'Reportes',
      link: '/admin/reports',
      children: [
        {
          id: '290-b',
          label: 'Ganancias',
          link: '/admin/reports/earnings'
        },
        {
            id: '291-b',
            label: 'Calcuilar Ganancias',
            link: '/admin/reports/earnings'
          },
          {
            id: '292-b',
            label: 'Cargas y Descargas',
            link: '/admin/reports/earnings'
          }
      ]
    },
  ];