"use client";

import React from "react";
import {FaPlus} from "react-icons/fa";
import {useRouter} from "next/navigation";
import {routes} from "@/utils/routes";
import {Button} from "@/components/ui/Button";
import {ConfigCard} from "@/components/ConfigCard";
import type {ISetupFormProps} from "@/types/components";
import {ConfigFormModal} from "@/components/ConfigFormModal";
import {PathMappingCard} from "@/components/PathMappingCard";
import {PathMappingFormModal} from "@/components/PathMappingFormModal";
import {
    activateConfiguration,
    addConfiguration,
    deleteConfiguration,
    deletePathMapping,
    getConfigProjects,
    mergePathMapping,
    saveClaudeAccount,
    saveGroqConfig,
    saveR2Config,
    testConfiguration,
} from "@/actions/setup.actions";
import type {
    IActivateConfigurationResponse,
    IAddConfigurationResponse,
    IClaudeAccount,
    IDeleteConfigurationResponse,
    IDeletePathMappingResponse,
    IGetConfigProjectsResponse,
    IMergePathMappingResponse,
    IMongoConfig,
    IPathMapping,
    ISaveClaudeAccountResponse,
    ISaveGroqConfigResponse,
    ISaveR2ConfigResponse,
    ITestConfigurationResponse,
} from "@/types/setup";

function SetupForm({initialConfigurations, initialActiveConfigId, initialPathMappings, initialR2Config, initialGroqConfig, initialAccounts, initialClaudeConfigDir}: ISetupFormProps) {
    const router = useRouter();
    const hasConfigs: boolean = initialConfigurations.length > 0;

    // First-run state (no configs)
    const [mongoUri, setMongoUri] = React.useState<string>('');
    const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);
    const [selectedConfigDir, setSelectedConfigDir] = React.useState<string>(initialClaudeConfigDir ?? '');

    // Claude account section (management mode)
    const [accountConfigDir, setAccountConfigDir] = React.useState<string>(initialClaudeConfigDir ?? '');
    const [isAccountSaving, setIsAccountSaving] = React.useState<boolean>(false);
    const [accountResult, setAccountResult] = React.useState<{ success: boolean; message: string } | null>(null);

    // Config management state
    const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
    const [editingConfig, setEditingConfig] = React.useState<IMongoConfig | null>(null);
    const [activatingId, setActivatingId] = React.useState<string | null>(null);
    const [testResult, setTestResult] = React.useState<{ configId: string; success: boolean; message: string } | null>(null);
    const [projectsPreview, setProjectsPreview] = React.useState<{ configId: string; projects: { rawProjectDir: string; projectDir: string }[] } | null>(null);

    // Path mapping state
    const [isMappingModalOpen, setIsMappingModalOpen] = React.useState<boolean>(false);
    const [editingMapping, setEditingMapping] = React.useState<IPathMapping | null>(null);
    const [mergingId, setMergingId] = React.useState<string | null>(null);
    const [mergeResult, setMergeResult] = React.useState<{ mappingId: string; success: boolean; message: string } | null>(null);

    // R2 config state
    const [r2AccessKeyId, setR2AccessKeyId] = React.useState<string>(initialR2Config?.accessKeyId ?? '');
    const [r2SecretAccessKey, setR2SecretAccessKey] = React.useState<string>(initialR2Config?.secretAccessKey ?? '');
    const [r2Endpoint, setR2Endpoint] = React.useState<string>(initialR2Config?.endpoint ?? '');
    const [r2PublicUrl, setR2PublicUrl] = React.useState<string>(initialR2Config?.publicUrl ?? '');
    const [r2BucketName, setR2BucketName] = React.useState<string>(initialR2Config?.bucketName ?? '');
    const [isR2Saving, setIsR2Saving] = React.useState<boolean>(false);
    const [r2Result, setR2Result] = React.useState<{ success: boolean; message: string } | null>(null);

    // Groq config state
    const [groqApiKey, setGroqApiKey] = React.useState<string>(initialGroqConfig?.apiKey ?? '');
    const [isGroqSaving, setIsGroqSaving] = React.useState<boolean>(false);
    const [groqResult, setGroqResult] = React.useState<{ success: boolean; message: string } | null>(null);

    // First-run submit handler: add a "Default" config, activate it, and save selected Claude account
    const handleFirstRunSubmit = React.useCallback(async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const addResponse: IAddConfigurationResponse = await addConfiguration({
            name: 'Default',
            uri: mongoUri.trim(),
        });

        if (!addResponse.success || !addResponse.configuration) {
            setError(addResponse.error || 'Setup failed!');
            setIsSubmitting(false);
            return;
        }

        const activateResponse: IActivateConfigurationResponse = await activateConfiguration({
            configId: addResponse.configuration.id,
        });

        if (!activateResponse.success) {
            setError(activateResponse.error || 'Failed to activate configuration!');
            setIsSubmitting(false);
            return;
        }

        if (selectedConfigDir) {
            const accountResponse: ISaveClaudeAccountResponse = await saveClaudeAccount({claudeConfigDir: selectedConfigDir});
            if (!accountResponse.success) {
                setError(accountResponse.error || 'Failed to save Claude account!');
                setIsSubmitting(false);
                return;
            }
        }

        router.push(routes.homePath);
    }, [mongoUri, router, selectedConfigDir]);

    // Config management handlers
    const handleAddNew = React.useCallback((): void => {
        setEditingConfig(null);
        setIsModalOpen(true);
    }, []);

    const handleEdit = React.useCallback((config: IMongoConfig): void => {
        setEditingConfig(config);
        setIsModalOpen(true);
    }, []);

    const handleDelete = React.useCallback(async (config: IMongoConfig): Promise<void> => {
        const confirmed: boolean = window.confirm(`Delete "${config.name}"? This cannot be undone.`);
        if (!confirmed) return;

        const response: IDeleteConfigurationResponse = await deleteConfiguration({configId: config.id});
        if (!response.success) {
            setError(response.error || 'Failed to delete configuration!');
            return;
        }

        router.refresh();
    }, [router]);

    const handleActivate = React.useCallback(async (config: IMongoConfig): Promise<void> => {
        setActivatingId(config.id);
        setError(null);

        const response: IActivateConfigurationResponse = await activateConfiguration({configId: config.id});

        if (!response.success) {
            setError(response.error || 'Failed to activate configuration!');
            setActivatingId(null);
            return;
        }

        router.push(routes.homePath);
        setActivatingId(null);
    }, [router]);

    const handleTest = React.useCallback(async (config: IMongoConfig): Promise<void> => {
        setTestResult(null);
        setProjectsPreview(null);

        const response: ITestConfigurationResponse = await testConfiguration({configId: config.id});

        if (response.success) {
            setTestResult({configId: config.id, success: true, message: 'Connection test passed!'});

            // Fetch projects preview on successful test
            const projectsResponse: IGetConfigProjectsResponse = await getConfigProjects({configId: config.id});
            if (projectsResponse.success && projectsResponse.projects) {
                setProjectsPreview({configId: config.id, projects: projectsResponse.projects});
            }
        } else {
            setTestResult({configId: config.id, success: false, message: response.error || 'Connection test failed!'});
        }
    }, []);

    const handleSaved = React.useCallback((): void => {
        router.refresh();
    }, [router]);

    // Path mapping handlers
    const handleAddMapping = React.useCallback((): void => {
        setEditingMapping(null);
        setIsMappingModalOpen(true);
    }, []);

    const handleEditMapping = React.useCallback((mapping: IPathMapping): void => {
        setEditingMapping(mapping);
        setIsMappingModalOpen(true);
    }, []);

    const handleDeleteMapping = React.useCallback(async (mapping: IPathMapping): Promise<void> => {
        const confirmed: boolean = window.confirm(`Delete mapping "${mapping.label}"? Future syncs will fall back to raw paths.`);
        if (!confirmed) return;

        const response: IDeletePathMappingResponse = await deletePathMapping({mappingId: mapping.id});
        if (!response.success) {
            setError(response.error || 'Failed to delete path mapping!');
            return;
        }

        router.refresh();
    }, [router]);

    const handleMergeMapping = React.useCallback(async (mapping: IPathMapping): Promise<void> => {
        const confirmed: boolean = window.confirm(`Merge existing data for "${mapping.label}"? This will update all sessions and memories with non-canonical paths to use the canonical path.`);
        if (!confirmed) return;

        setMergingId(mapping.id);
        setMergeResult(null);

        const response: IMergePathMappingResponse = await mergePathMapping({mappingId: mapping.id});

        if (response.success) {
            setMergeResult({
                mappingId: mapping.id,
                success: true,
                message: response.message || `Merged! ${response.sessionsUpdated} session(s) and ${response.memoriesUpdated} memory doc(s) updated.`
            });
        } else {
            setMergeResult({mappingId: mapping.id, success: false, message: response.error || 'Merge failed!'});
        }

        setMergingId(null);
    }, []);

    const handleMappingSaved = React.useCallback((): void => {
        router.refresh();
    }, [router]);

    // R2 config handler
    const r2FieldsFilled: boolean = !!(r2AccessKeyId.trim() && r2SecretAccessKey.trim() && r2Endpoint.trim() && r2PublicUrl.trim() && r2BucketName.trim());

    const handleR2Save = React.useCallback(async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setIsR2Saving(true);
        setR2Result(null);

        const response: ISaveR2ConfigResponse = await saveR2Config({
            accessKeyId: r2AccessKeyId.trim(),
            secretAccessKey: r2SecretAccessKey.trim(),
            endpoint: r2Endpoint.trim(),
            publicUrl: r2PublicUrl.trim(),
            bucketName: r2BucketName.trim(),
        });

        if (response.success) {
            setR2Result({success: true, message: response.message || 'R2 config saved!'});
        } else {
            setR2Result({success: false, message: response.error || 'Failed to save R2 config!'});
        }

        setIsR2Saving(false);
    }, [r2AccessKeyId, r2SecretAccessKey, r2Endpoint, r2PublicUrl, r2BucketName]);

    // Groq config handler
    const handleGroqSave = React.useCallback(async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setIsGroqSaving(true);
        setGroqResult(null);

        const response: ISaveGroqConfigResponse = await saveGroqConfig({
            apiKey: groqApiKey.trim(),
        });

        if (response.success) {
            setGroqResult({success: true, message: response.message || 'Groq config saved!'});
        } else {
            setGroqResult({success: false, message: response.error || 'Failed to save Groq config!'});
        }

        setIsGroqSaving(false);
    }, [groqApiKey]);

    // Claude account save handler (management mode)
    const handleAccountSave = React.useCallback(async (): Promise<void> => {
        setIsAccountSaving(true);
        setAccountResult(null);

        const {success, message, error} = await saveClaudeAccount({claudeConfigDir: accountConfigDir});

        if (success) {
            setAccountResult({success: true, message: message || 'Claude account saved!'});
        } else {
            setAccountResult({success: false, message: error || 'Failed to save Claude account!'});
        }

        setIsAccountSaving(false);
    }, [accountConfigDir]);

    // First-run mode: simple URI input form
    if (!hasConfigs) {
        return (
            <form onSubmit={handleFirstRunSubmit} className={'mt-6'}>
                <label htmlFor={'mongo-uri'} className={'block text-sm font-medium text-text mb-1.5'}>
                    MongoDB Connection String
                </label>
                <input
                    id={'mongo-uri'}
                    type={'text'}
                    value={mongoUri}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMongoUri(e.target.value)}
                    placeholder={'mongodb+srv://user:password@cluster.mongodb.net/dbname'}
                    className={'w-full px-3 py-2.5 rounded-md border border-border bg-surface text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                    disabled={isSubmitting}
                    autoFocus
                />

                {initialAccounts.length > 0 && (
                    <div className={'mt-4'}>
                        <label htmlFor={'claude-account'} className={'block text-sm font-medium text-text mb-1.5'}>
                            Claude Account
                        </label>
                        <select
                            id={'claude-account'}
                            value={selectedConfigDir}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedConfigDir(e.target.value)}
                            className={'w-full px-3 py-2.5 rounded-md border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                            disabled={isSubmitting}
                        >
                            <option value={''}>System default (no override)</option>
                            {initialAccounts.map((account: IClaudeAccount) => (
                                <option key={account.configDir} value={account.configDir}>
                                    {account.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {error && (
                    <p className={'text-sm text-error mt-3 bg-error/10 px-3 py-2 rounded-md'}>{error}</p>
                )}

                <Button type={'submit'} variant={'primary'} size={'md'} isLoading={isSubmitting} disabled={!mongoUri.trim() || isSubmitting} className={'w-full mt-4'}>
                    Connect
                </Button>
            </form>
        );
    }

    // Config management mode
    return (
        <div className={'mt-6'}>
            {/* Add New button */}
            <div className={'flex justify-end mb-4'}>
                <Button variant={'primary'} size={'sm'} onClick={handleAddNew}>
                    <FaPlus/>
                    Add New
                </Button>
            </div>

            {/* Error */}
            {error && (
                <p className={'text-sm text-error bg-error/10 px-3 py-2 rounded-md mb-4'}>{error}</p>
            )}

            {/* Config cards */}
            <div className={'grid gap-3'}>
                {initialConfigurations.map((config: IMongoConfig) => (
                    <React.Fragment key={config.id}>
                        <ConfigCard
                            config={config}
                            isActive={config.id === initialActiveConfigId}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onActivate={handleActivate}
                            onTest={handleTest}
                            isActivating={activatingId === config.id}
                        />

                        {/* Test result */}
                        {testResult && testResult.configId === config.id && (
                            <div className={`text-xs px-3 py-2 rounded-md ${testResult.success ? 'text-success bg-success/10' : 'text-error bg-error/10'}`}>
                                {testResult.message}
                            </div>
                        )}

                        {/* Projects preview */}
                        {projectsPreview && projectsPreview.configId === config.id && projectsPreview.projects.length > 0 && (
                            <div className={'text-xs bg-surface border border-border rounded-md px-3 py-2'}>
                                <p className={'font-medium text-text mb-1'}>
                                    Projects ({projectsPreview.projects.length}):
                                </p>
                                <ul className={'space-y-0.5'}>
                                    {projectsPreview.projects.map((project) => (
                                        <li key={project.projectDir} className={'text-text-muted truncate'}>
                                            {project.rawProjectDir}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* ======================== Path Mappings Section ======================== */}
            <div className={'mt-8 pt-6 border-t border-border'}>
                <div className={'flex items-center justify-between mb-4'}>
                    <div>
                        <h2 className={'text-lg font-semibold text-text'}>Path Mappings</h2>
                        <p className={'text-xs text-text-muted mt-0.5'}>
                            Map multiple machine paths to a single canonical project
                        </p>
                    </div>
                    <Button variant={'primary'} size={'sm'} onClick={handleAddMapping}>
                        <FaPlus/>
                        Add Mapping
                    </Button>
                </div>

                {initialPathMappings.length === 0
                    ? (
                        <p className={'text-sm text-text-muted text-center py-6 bg-surface rounded-lg border border-border border-dashed'}>
                            No path mappings configured yet.
                        </p>
                    )
                    : (
                        <div className={'grid gap-3'}>
                            {initialPathMappings.map((mapping: IPathMapping) => (
                                <React.Fragment key={mapping.id}>
                                    <PathMappingCard
                                        mapping={mapping}
                                        onEdit={handleEditMapping}
                                        onDelete={handleDeleteMapping}
                                        onMerge={handleMergeMapping}
                                        isMerging={mergingId === mapping.id}
                                    />

                                    {/* Merge result */}
                                    {mergeResult && mergeResult.mappingId === mapping.id && (
                                        <div className={`text-xs px-3 py-2 rounded-md ${mergeResult.success ? 'text-success bg-success/10' : 'text-error bg-error/10'}`}>
                                            {mergeResult.message}
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )
                }
            </div>

            {/* ======================== Cloudflare R2 Section ======================== */}
            <div className={'mt-8 pt-6 border-t border-border'}>
                <div className={'mb-4'}>
                    <h2 className={'text-lg font-semibold text-text'}>Cloudflare R2</h2>
                    <p className={'text-xs text-text-muted mt-0.5'}>
                        Storage credentials for file attachments (images, PDFs, code files)
                    </p>
                </div>

                <form onSubmit={handleR2Save} className={'space-y-3'}>
                    <div>
                        <label htmlFor={'r2-access-key-id'} className={'block text-xs font-medium text-text mb-1'}>
                            Access Key ID
                        </label>
                        <input
                            id={'r2-access-key-id'}
                            type={'text'}
                            value={r2AccessKeyId}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setR2AccessKeyId(e.target.value)}
                            placeholder={'CLOUDFLARE_ACCESS_KEY_ID'}
                            className={'w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                            disabled={isR2Saving}
                        />
                    </div>

                    <div>
                        <label htmlFor={'r2-secret-access-key'} className={'block text-xs font-medium text-text mb-1'}>
                            Secret Access Key
                        </label>
                        <input
                            id={'r2-secret-access-key'}
                            type={'text'}
                            value={r2SecretAccessKey}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setR2SecretAccessKey(e.target.value)}
                            placeholder={'CLOUDFLARE_SECRET_ACCESS_KEY'}
                            className={'w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                            disabled={isR2Saving}
                        />
                    </div>

                    <div>
                        <label htmlFor={'r2-endpoint'} className={'block text-xs font-medium text-text mb-1'}>
                            R2 Endpoint
                        </label>
                        <input
                            id={'r2-endpoint'}
                            type={'text'}
                            value={r2Endpoint}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setR2Endpoint(e.target.value)}
                            placeholder={'https://<account-id>.r2.cloudflarestorage.com'}
                            className={'w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                            disabled={isR2Saving}
                        />
                    </div>

                    <div>
                        <label htmlFor={'r2-public-url'} className={'block text-xs font-medium text-text mb-1'}>
                            R2 Public URL
                        </label>
                        <input
                            id={'r2-public-url'}
                            type={'text'}
                            value={r2PublicUrl}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setR2PublicUrl(e.target.value)}
                            placeholder={'https://pub-xxx.r2.dev'}
                            className={'w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                            disabled={isR2Saving}
                        />
                    </div>

                    <div>
                        <label htmlFor={'r2-bucket-name'} className={'block text-xs font-medium text-text mb-1'}>
                            Bucket Name
                        </label>
                        <input
                            id={'r2-bucket-name'}
                            type={'text'}
                            value={r2BucketName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setR2BucketName(e.target.value)}
                            placeholder={'my-bucket'}
                            className={'w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                            disabled={isR2Saving}
                        />
                    </div>

                    {/* R2 result feedback */}
                    {r2Result && (
                        <div className={`text-xs px-3 py-2 rounded-md ${r2Result.success ? 'text-success bg-success/10' : 'text-error bg-error/10'}`}>
                            {r2Result.message}
                        </div>
                    )}

                    <Button type={'submit'} variant={'primary'} size={'sm'} isLoading={isR2Saving} disabled={!r2FieldsFilled || isR2Saving} className={'w-full'}>
                        Save R2 Config
                    </Button>
                </form>
            </div>

            {/* ======================== Groq API Key Section ======================== */}
            <div className={'mt-8 pt-6 border-t border-border'}>
                <div className={'mb-4'}>
                    <h2 className={'text-lg font-semibold text-text'}>Groq API Key</h2>
                    <p className={'text-xs text-text-muted mt-0.5'}>
                        API key for Speech-to-Text (Whisper) — required to enable the mic button
                    </p>
                </div>

                <form onSubmit={handleGroqSave} className={'space-y-3'}>
                    <div>
                        <label htmlFor={'groq-api-key'} className={'block text-xs font-medium text-text mb-1'}>
                            API Key
                        </label>
                        <input
                            id={'groq-api-key'}
                            type={'text'}
                            value={groqApiKey}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGroqApiKey(e.target.value)}
                            placeholder={'gsk_...'}
                            className={'w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                            disabled={isGroqSaving}
                        />
                    </div>

                    {/* Groq result feedback */}
                    {groqResult && (
                        <div className={`text-xs px-3 py-2 rounded-md ${groqResult.success ? 'text-success bg-success/10' : 'text-error bg-error/10'}`}>
                            {groqResult.message}
                        </div>
                    )}

                    <Button type={'submit'} variant={'primary'} size={'sm'} isLoading={isGroqSaving} disabled={!groqApiKey.trim() || isGroqSaving} className={'w-full'}>
                        Save Groq API Key
                    </Button>
                </form>
            </div>

            {/* ======================== Claude Account Section ======================== */}
            {initialAccounts.length > 0 && (
                <div className={'mt-8 pt-6 border-t border-border'}>
                    <div className={'mb-4'}>
                        <h2 className={'text-lg font-semibold text-text'}>Claude Account</h2>
                        <p className={'text-xs text-text-muted mt-0.5'}>
                            Select which Claude config directory to use when spawning the CLI
                        </p>
                    </div>

                    {initialAccounts.length === 1 ? (
                        <div className={'px-3 py-2.5 rounded-md border border-border bg-surface text-text text-sm'}>
                            {initialClaudeConfigDir ? initialAccounts[0].label : 'System default (no override)'}
                        </div>
                    ) : (
                        <select
                            value={accountConfigDir}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAccountConfigDir(e.target.value)}
                            className={'w-full px-3 py-2.5 rounded-md border border-border bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                            disabled={isAccountSaving}
                        >
                            <option value={''}>System default (no override)</option>
                            {initialAccounts.map((account: IClaudeAccount) => (
                                <option key={account.configDir} value={account.configDir}>
                                    {account.label}
                                </option>
                            ))}
                        </select>
                    )}

                    {accountResult && (
                        <div className={`text-xs px-3 py-2 rounded-md mt-3 ${accountResult.success ? 'text-success bg-success/10' : 'text-error bg-error/10'}`}>
                            {accountResult.message}
                        </div>
                    )}

                    <Button variant={'primary'} size={'sm'} isLoading={isAccountSaving} disabled={isAccountSaving} onClick={handleAccountSave} className={'w-full mt-3'}>
                        Save Account
                    </Button>
                </div>
            )}

            {/* Home link when configured */}
            {initialActiveConfigId && (
                <div className={'flex justify-center mt-6'}>
                    <Button variant={'link'} size={'sm'} onClick={() => router.push(routes.homePath)}>
                        Go to Home
                    </Button>
                </div>
            )}

            {/* Add/Edit config modal */}
            <ConfigFormModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} editingConfig={editingConfig} onSaved={handleSaved}/>

            {/* Add/Edit path mapping modal */}
            <PathMappingFormModal isOpen={isMappingModalOpen} onOpenChange={setIsMappingModalOpen} editingMapping={editingMapping} onSaved={handleMappingSaved}/>
        </div>
    );
}

export {SetupForm};
