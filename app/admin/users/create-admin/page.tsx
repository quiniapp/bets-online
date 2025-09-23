import type React from "react";
import { DashboardLayout } from "@/components/dashboard-layout";

import CreateAdminFeature from "@/feature/pages/create-admin";

export default function CreateAdminPage (){
    return (
        <DashboardLayout> 
            <CreateAdminFeature />

        </DashboardLayout>
    )
}