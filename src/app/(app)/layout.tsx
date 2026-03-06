import React from "react";
import {headers} from "next/headers";
import {Sidebar} from "@/components/Sidebar";
import {AppLayout} from "@/components/layouts/AppLayout";

async function AppGroupLayout({children}: Readonly<{ children: React.ReactNode }>) {
    await headers();

    return (
        <AppLayout sidebar={<Sidebar/>}>
            {children}
        </AppLayout>
    );
}

export default AppGroupLayout;
