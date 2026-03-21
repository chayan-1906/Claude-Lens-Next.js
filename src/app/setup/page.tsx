import type {Metadata} from "next";
import {SetupForm} from "@/components/SetupForm";
import {getConfigurations} from "@/actions/setup.actions";
import type {IGetConfigurationsResponse, IMongoConfig} from "@/types/setup";

export const metadata: Metadata = {
    title: 'Setup — Claude Lens',
    description: 'Configure your MongoDB connection to get started!',
};

async function SetupPage() {
    const {configurations, activeConfigId}: IGetConfigurationsResponse = await getConfigurations();
    const hasConfigs: boolean = (configurations?.length ?? 0) > 0;

    return (
        <div className={'flex items-center justify-center min-h-dvh bg-background px-4 py-8'}>
            <div className={hasConfigs ? 'w-full max-w-2xl' : 'w-full max-w-md'}>
                <h1 className={'text-2xl font-bold text-text text-center'}>
                    {hasConfigs ? 'MongoDB Configurations' : 'Welcome to Claude Lens'}
                </h1>
                <p className={'text-sm text-text-muted text-center mt-2'}>
                    {hasConfigs
                        ? 'Manage your MongoDB connections'
                        : 'Enter your MongoDB connection string to get started!'}
                </p>

                <SetupForm initialConfigurations={configurations as IMongoConfig[] ?? []} initialActiveConfigId={activeConfigId ?? ''}/>
            </div>
        </div>
    );
}

export default SetupPage;