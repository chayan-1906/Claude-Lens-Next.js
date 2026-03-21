"use client";

import React from "react";
import {FaPlus} from "react-icons/fa";
import {useRouter} from "next/navigation";
import {routes} from "@/utils/routes";
import {Button} from "@/components/ui/Button";
import {ConfigCard} from "@/components/ConfigCard";
import type {ISetupFormProps} from "@/types/components";
import {ConfigFormModal} from "@/components/ConfigFormModal";
import {activateConfiguration, addConfiguration, deleteConfiguration, getConfigProjects, testConfiguration} from "@/actions/setup.actions";
import type {IActivateConfigurationResponse, IAddConfigurationResponse, IDeleteConfigurationResponse, IGetConfigProjectsResponse, IMongoConfig, ITestConfigurationResponse} from "@/types/setup";

function SetupForm({initialConfigurations, initialActiveConfigId}: ISetupFormProps) {
    const router = useRouter();
    const hasConfigs: boolean = initialConfigurations.length > 0;

    // First-run state (no configs)
    const [mongoUri, setMongoUri] = React.useState<string>('');
    const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    // Config management state
    const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
    const [editingConfig, setEditingConfig] = React.useState<IMongoConfig | null>(null);
    const [activatingId, setActivatingId] = React.useState<string | null>(null);
    const [testResult, setTestResult] = React.useState<{ configId: string; success: boolean; message: string } | null>(null);
    const [projectsPreview, setProjectsPreview] = React.useState<{ configId: string; projects: { rawProjectDir: string; projectDir: string }[] } | null>(null);

    // First-run submit handler: add a "Default" config and activate it
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

        router.push(routes.homePath);
    }, [mongoUri, router]);

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

        router.refresh();
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

            {/* Home link when configured */}
            {initialActiveConfigId && (
                <div className={'flex justify-center mt-6'}>
                    <Button variant={'link'} size={'sm'} onClick={() => router.push(routes.homePath)}>
                        Go to Home
                    </Button>
                </div>
            )}

            {/* Add/Edit modal */}
            <ConfigFormModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} editingConfig={editingConfig} onSaved={handleSaved}/>
        </div>
    );
}

export {SetupForm};
