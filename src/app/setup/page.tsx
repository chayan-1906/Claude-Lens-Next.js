import type {Metadata} from "next";
import {SetupForm} from "@/components/SetupForm";

export const metadata: Metadata = {
    title: 'Setup — Claude Lens',
    description: 'Configure your MongoDB connection to get started!',
};

function SetupPage() {
    return (
        <div className={'flex items-center justify-center min-h-dvh bg-background px-4'}>
            <div className={'w-full max-w-md'}>
                <h1 className={'text-2xl font-bold text-text text-center'}>Welcome to Claude Lens</h1>
                <p className={'text-sm text-text-muted text-center mt-2'}>Enter your MongoDB connection string to get started!</p>

                <SetupForm/>
            </div>
        </div>
    );
}

export default SetupPage;
