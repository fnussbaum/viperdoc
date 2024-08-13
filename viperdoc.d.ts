declare module 'viperdoc' {
    export function generateWebsite(sourcePath: string, jsonData: string, modulePath: string): Promise<void>;
}
