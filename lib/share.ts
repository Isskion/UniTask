/**
 * Central utility to generate shareable URLs for various modules.
 */

export type ShareModule = 'tasks' | 'kb' | 'proposals' | 'unileaks';

export function getShareUrl(module: ShareModule, id: string, queryParams: Record<string, string> = {}): string {
    if (typeof window === 'undefined') return '';

    const baseUrl = window.location.origin;
    let path = '';
    const params = new URLSearchParams(queryParams);
    params.set('id', id);

    switch (module) {
        case 'tasks':
            path = '/tasks';
            break;
        case 'kb':
            path = '/kb';
            break;
        case 'proposals':
            path = '/proposals';
            break;
        case 'unileaks':
            path = '/unileaks';
            // UniLeaks uses noteId for deep linking
            params.delete('id');
            params.set('noteId', id);
            break;
    }

    return `${baseUrl}${path}?${params.toString()}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy text: ', err);
        return false;
    }
}
