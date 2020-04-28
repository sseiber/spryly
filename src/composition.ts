// tslint:disable-next-line:ordered-imports
import { Server, ServerOptions } from '@hapi/hapi';
import { join, resolve } from 'path';
import { process as process_registration, ManifestPlugin } from './registration';
import { process as process_services } from './services';

export type ManifestService = string;

export interface ComposeOptions {
    relativeTo?: string;
    logger?: (tags: any, message: any) => void;
}

export interface ServerComposeOptions {
    no_ws?: boolean;
}

export interface ComposeManifest {
    server: ServerOptions | undefined;
    services?: ManifestService[];
    plugins: ManifestPlugin[];
}

export async function compose(manifest: ComposeManifest, options: ComposeOptions): Promise<Server> {
    // @ts-ignore (noop)
    options.logger = options.logger || ((noop) => { /* no-op */ });

    options.logger(['compose', 'info'], 'Composing server...');

    const server = new Server(manifest.server);
    const statics = new Map<string, any>([['$server', server]]);

    options.logger(['compose', 'info'], 'Processing services...');
    const serviceContext = await process_services(manifest.services, options, statics);

    options.logger(['compose', 'info'], 'Processing plugins...');
    await process_registration(server, manifest.plugins, options, serviceContext);

    options.logger(['compose', 'info'], 'Composition complete');

    // tslint:disable-next-line:no-string-literal
    (server.settings.app as any).compositionDone = true;

    return server;
}

export function resolveImport(instance: any, options: ComposeOptions, nameHint?: string[]): any {
    nameHint = nameHint || [];

    if (typeof instance === 'string') {
        options.logger(['compose', 'info'], `Requiring module ${instance}`);
        nameHint = pathToNameHint(instance);
        instance = require_relative(instance, options);
    }

    if (instance && instance.default) {
        instance = instance.default;
    }

    return instance;
}

export function pathToNameHint(path: string): string[] {
    if (!path) {
        return [];
    }

    return path.split('/').filter(Boolean).filter(i => i !== '.');
}

export function isClass(func: any): boolean {
    return typeof func === 'function' && /^class\s/.test(Function.prototype.toString.call(func));
}

function require_relative(id: string, options: ComposeOptions) {
    if (id.startsWith('./') && options.relativeTo) {
        id = join(options.relativeTo, id);
    }

    let instance = null;

    try {
        instance = require(id);
    }
    catch (e) {
        // This is to support multi-project local development
        instance = require(resolve(process.cwd(), 'node_modules', id));
    }

    return instance;
}
