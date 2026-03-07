import React from "react";
import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {routes} from "@/utils/routes";
import {Sidebar} from "@/components/Sidebar";
import {getSetupStatus} from "@/actions/setup.actions";
import {AppLayout} from "@/components/layouts/AppLayout";
import type {IGetSetupStatusResponse} from "@/types/setup";

async function AppGroupLayout({children}: Readonly<{ children: React.ReactNode }>) {
    await headers();

    const {configured}: IGetSetupStatusResponse = await getSetupStatus();

    if (!configured) {
        redirect(routes.setupPath);
    }

    return (
        <AppLayout sidebar={<Sidebar/>}>
            {children}
        </AppLayout>
    );
}

export default AppGroupLayout;
