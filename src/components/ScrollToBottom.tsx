"use client";

import React from "react";

function ScrollToBottom() {
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        ref.current?.scrollIntoView({behavior: 'smooth'});
    }, []);

    return (
        <div ref={ref}/>
    );
}

export {ScrollToBottom};
