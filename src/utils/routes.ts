/** Frontend route paths for navigation */
const routes = {
    homePath: '/',

    // session routes
    sessionPath: (sessionId: string) => `/c/${sessionId}`,
};

export {routes};
