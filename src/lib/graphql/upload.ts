import { API_URL, SELECTED_CHANNEL_TOKEN_KEY } from './api';
import { uiConfig } from 'virtual:vendure-ui-config';
import { DocumentNode, print } from 'graphql';

/**
 * Perform a GraphQL multipart request suitable for Upload scalar.
 */
export async function graphqlUpload<T>(args: {
    query: string | DocumentNode;
    variables: Record<string, any>;
    fileMap: Record<string, File>;
}): Promise<T> {
    const form = new FormData();
    const operations = {
        query: typeof args.query === 'string' ? args.query : print(args.query),
        variables: args.variables,
    };
    form.append('operations', JSON.stringify(operations));

    const map: Record<string, string[]> = {};
    let i = 0;
    for (const key of Object.keys(args.fileMap)) {
        map[String(i)] = [key];
        i++;
    }
    form.append('map', JSON.stringify(map));

    i = 0;
    for (const [_, file] of Object.entries(args.fileMap)) {
        form.append(String(i), file);
        i++;
    }

    const channelToken = localStorage.getItem(SELECTED_CHANNEL_TOKEN_KEY);
    const headers = new Headers();
    if (channelToken) {
        headers.set(uiConfig.api.channelTokenKey, channelToken);
    }

    const res = await fetch(API_URL, {
        method: 'POST',
        body: form,
        credentials: 'include',
        mode: 'cors',
        headers,
    });
    const json = await res.json();
    if (json.errors?.length) {
        throw new Error(json.errors.map((e: any) => e.message).join('; '));
    }
    return json.data as T;
}
