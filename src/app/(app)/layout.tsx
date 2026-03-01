import React from "react";
import {Sidebar} from "@/components/Sidebar";
import {AppLayout} from "@/components/layouts/AppLayout";

function AppGroupLayout({children}: Readonly<{ children: React.ReactNode }>) {
    return (
        <AppLayout sidebar={<Sidebar/>}>
            {children}
        </AppLayout>
    );
}

export default AppGroupLayout;
