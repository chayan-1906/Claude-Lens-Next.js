import Image from "next/image";
import type {Metadata} from "next";
import {assets} from "@/utils/assets";
import {connection} from "next/server";
import {SetupForm} from "@/components/SetupForm";
import {getAccounts, getClaudeAccount, getConfigurations, getGroqConfig, getPathMappings, getR2Config} from "@/actions/setup.actions";
import type {
    IClaudeAccount,
    IGetAccountsResponse,
    IGetClaudeAccountResponse,
    IGetConfigurationsResponse,
    IGetGroqConfigResponse,
    IGetPathMappingsResponse,
    IGetR2ConfigResponse,
    IGroqConfig,
    IMongoConfig,
    IPathMapping,
    IR2Config,
} from "@/types/setup";

export const metadata: Metadata = {
    title: 'Setup | Claude Lens',
    description: 'Configure your MongoDB connection to get started!',
};

async function SetupPage() {
    await connection();
    const [{
        configurations,
        activeConfigId
    }, {pathMappings}, {r2Config}, {groqConfig}, {accounts}, {claudeConfigDir}]: [IGetConfigurationsResponse, IGetPathMappingsResponse, IGetR2ConfigResponse, IGetGroqConfigResponse, IGetAccountsResponse, IGetClaudeAccountResponse] = await Promise.all([
        getConfigurations(),
        getPathMappings(),
        getR2Config(),
        getGroqConfig(),
        getAccounts(),
        getClaudeAccount(),
    ]);
    const hasConfigs: boolean = (configurations?.length ?? 0) > 0;

    if (!hasConfigs) {
        return (
            <div className={'flex items-center justify-center min-h-dvh bg-background px-4 py-8'}>
                <div className={'w-full max-w-md'}>
                    <div className={'bg-surface border border-border rounded-2xl shadow-sm p-8'}>
                        {/* Brand header */}
                        <div className={'flex flex-col items-center gap-3 mb-6'}>
                            <div className={'relative size-16 rounded-2xl overflow-hidden ring-1 ring-border shadow-md'}>
                                <Image src={assets.logo} alt={'Claude Lens'} fill unoptimized className={'object-cover'}/>
                            </div>
                            <div className={'text-center space-y-1'}>
                                <h1 className={'text-2xl font-bold text-text tracking-tight'}>Welcome to Claude Lens</h1>
                                <p className={'text-sm text-text-muted'}>Enter your MongoDB connection string to get started!</p>
                            </div>
                        </div>

                        <SetupForm
                            initialConfigurations={configurations as IMongoConfig[] ?? []}
                            initialActiveConfigId={activeConfigId ?? ''}
                            initialPathMappings={pathMappings as IPathMapping[] ?? []}
                            initialR2Config={r2Config as IR2Config ?? null}
                            initialGroqConfig={groqConfig as IGroqConfig ?? null}
                            initialAccounts={accounts as IClaudeAccount[] ?? []}
                            initialClaudeConfigDir={claudeConfigDir as string ?? null}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={'min-h-dvh bg-background px-6 py-8'}>
            <div className={'w-full max-w-2xl mx-auto'}>
                {/* Page header */}
                <div className={'flex items-center gap-4 mb-8'}>
                    <div className={'relative size-12 rounded-xl overflow-hidden ring-1 ring-border shadow-sm shrink-0'}>
                        <Image src={assets.logo} alt={'Claude Lens'} fill unoptimized className={'object-cover'}/>
                    </div>
                    <div>
                        <h1 className={'text-2xl font-bold text-text tracking-tight'}>Settings</h1>
                        <p className={'text-sm text-text-muted mt-0.5'}>Manage your MongoDB connections and integrations</p>
                    </div>
                </div>

                <SetupForm
                    initialConfigurations={configurations as IMongoConfig[] ?? []}
                    initialActiveConfigId={activeConfigId ?? ''}
                    initialPathMappings={pathMappings as IPathMapping[] ?? []}
                    initialR2Config={r2Config as IR2Config ?? null}
                    initialGroqConfig={groqConfig as IGroqConfig ?? null}
                    initialAccounts={accounts as IClaudeAccount[] ?? []}
                    initialClaudeConfigDir={claudeConfigDir as string ?? null}
                />
            </div>
        </div>
    );
}

export default SetupPage;
