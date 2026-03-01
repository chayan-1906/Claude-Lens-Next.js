/** Frontend route paths for navigation */
const routes = {
    homePath: '/',

    // Conversation routes
    sessionPath: (sessionId: string) => `/c/${sessionId}`,
};

export {routes};
