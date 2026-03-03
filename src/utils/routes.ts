/** Frontend route paths for navigation */
const routes = {
    homePath: '/',

    // session routes
    sessionPath: (sessionId: string) => `/c/${sessionId}`,

    // memory routes
    memoryPath: (projectDir: string) => `/m/${projectDir}`,
};

export {routes};
