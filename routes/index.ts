import { CONFIG } from "@/config"

const ROUTER = {
    SITE : CONFIG.NEXTAUTH_URL,
    LOGIN: CONFIG.NEXTAUTH_URL + '/login',
    ADMIN: '',
}

export default ROUTER