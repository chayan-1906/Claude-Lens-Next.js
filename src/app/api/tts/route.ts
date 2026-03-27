import {NextRequest, NextResponse} from "next/server";
import {BACKEND_URL} from "../../../../config/config";

export async function POST(req: NextRequest): Promise<Response> {
    try {
        const body = await req.json();

        const response = await fetch(`${BACKEND_URL}/api/v1/voice/speak`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            return NextResponse.json({error: 'Speech synthesis failed'}, {status: response.status});
        }

        return new Response(response.body, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-store',
            },
        });
    } catch (error: unknown) {
        const message: string = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({error: message}, {status: 500});
    }
}
