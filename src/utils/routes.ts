/** Frontend route paths for navigation */
const routes = {
    homePath: '/',
    setupPath: '/setup',

    // session routes
    sessionPath: (sessionId: string) => `/c/${sessionId}`,

    // task routes
    taskPath: (sessionId: string, taskId: string) => `/t/${sessionId}/${taskId}`,
    
    // memory routes
    memoryPath: (projectDir: string) => `/m/${projectDir}`,
};

export {routes};
