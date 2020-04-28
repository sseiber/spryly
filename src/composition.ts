// tslint:disable-next-line:ordered-imports
import { Server, ServerOptions } from '@hapi/hapi';
import { join, resolve } from 'path';
import { process as process_registration, ManifestPlugin } from './registration';
import { process as process_services } from './services';

export type ManifestService = string;
export type CustomLogger = (tags: string[], message: string) => void;

export interface ComposeOptions {
    relativeTo?: string;
    logCompose: boolean;
    logger?: CustomLogger;
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
    const server = new Server(manifest.server);

    if (options.logCompose) {
        if (typeof options.logger === 'function') {
            options.logger = options.logger;
        }
        else {
            await server.register({
                plugin: await import('hapi-pino'),
                options: {
                    prettyPrint: {
                        colorize: true,
                        messageFormat: '[{tags}] {data}',
                        translateTime: 'SYS:yyyy-mm-dd"T"HH:MM:sso',
                        ignore: 'pid,hostname,tags,data'
                    }
                }
            });

            options.logger = (tags: string[], message: string) => {
                server.log(tags, message);
            };
        }
    }
    else {
        // @ts-ignore
        options.logger = (tags: string[], message: string) => { /**/ };
    }

    options.logger(['spryly', 'info'], 'Composing server...');

    const statics = new Map<string, any>([['$server', server]]);

    options.logger(['spryly', 'info'], 'Processing services...');
    const serviceContext = await process_services(manifest.services, options, statics);

    options.logger(['spryly', 'info'], 'Processing plugins...');
    await process_registration(server, manifest.plugins, options, serviceContext);

    options.logger(['spryly', 'info'], 'Composition complete');

    (server.settings.app as any).compositionDone = true;

    return server;
}

export function resolveImport(instance: any, options: ComposeOptions, nameHint?: string[]): any {
    nameHint = nameHint || [];

    if (typeof instance === 'string') {
        options.logger(['spryly', 'info'], `Requiring module ${instance}`);
        nameHint = pathToNameHint(instance);
        instance = requireRelative(instance, options);
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

function requireRelative(id: string, options: ComposeOptions) {
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
