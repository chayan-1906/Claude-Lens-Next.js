"use client";

import React from "react";
import type {IScrollToBottomProps} from "@/types/components";

function ScrollToBottom({trigger}: IScrollToBottomProps) {
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        ref.current?.scrollIntoView({behavior: 'smooth'});
    }, [trigger]);

    return (
        <div ref={ref}/>
    );
}

export {ScrollToBottom};
