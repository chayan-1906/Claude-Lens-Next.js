const isDev: boolean = process.env.NODE_ENV === 'development';
// const isDev: boolean = false;

function debug(...args: unknown[]): void {
    if (isDev) {
        console.log(...args);
    }
}

export {debug};
