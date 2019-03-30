import { Server, Plugin } from 'hapi';
import { pathToNameHint, resolveImport, isClass, ComposeOptions } from './composition';
import { ServiceContext } from './injection';

export type AsyncPluginFunction<TRegistrationOptions> = () => HapiPlugin<TRegistrationOptions>;

export interface PluginRegistration<TRegistrationOptions> {
    plugin: string | Plugin<TRegistrationOptions> | AsyncPluginFunction<TRegistrationOptions> | HapiPlugin<TRegistrationOptions>;
    options?: TRegistrationOptions;
}

export type ManifestPlugin = PluginRegistration<any> | string;

export interface HapiPlugin<TRegistrationOptions = {}> {
    register(server: Server, options?: TRegistrationOptions): Promise<void>;
}

export async function process(server: Server, item: any, options: ComposeOptions, serviceContext: ServiceContext, nameHint?: string[]) {

    if (Array.isArray(item)) {
        for (const child of item) {
            await process(server, child, options, serviceContext, nameHint);
        }

        return;
    }

    nameHint = nameHint || [];

    let registration: any = null;

    if (item instanceof String) {
        nameHint.push(...pathToNameHint(item.toString()));
        registration = {
            plugin: item
        };
    } else {
        registration = item;
    }

    if (!registration || !registration.plugin) {
        throw new Error('Panic');
    }

    registration.plugin = resolveImport(registration.plugin, options, nameHint);
    if (registration.plugin.plugin) {
        registration.plugin = registration.plugin.plugin;
    }

    if (Array.isArray(registration.plugin)) {
        for (let child of registration.plugin) {

            if (!child.plugin) {
                child = { plugin: child };
            }

            await process(server, child, options, serviceContext);
        }
    }
    else {
        await serverRegister(server, options, serviceContext, registration, nameHint);
    }
}

async function serverRegister(server: Server, options: ComposeOptions, serviceContext: ServiceContext, registration: any, nameHint: string[]) {

    await serviceContext.resolve(registration);

    nameHint = nameHint || [];
    if (isClass(registration.plugin)) {
        nameHint.push(`@${registration.plugin.name}`);
        options.logger(['registration', 'info'], `Awaiting class registration for '${nameHint.join('-')}'`);
        registration.plugin = new registration.plugin(server);
        await serviceContext.resolve(registration.plugin);
        await server.register(wrapClassRegister(registration.plugin, registration.options, nameHint));
    }
    else if (isPluginRegistrationFunction(registration.plugin)) {
        options.logger(['registration', 'info'], 'Awaiting promise for old-style function registration');
        await server.register(registration.plugin);
    }
    else if (isPluginRegistrationObject(registration.plugin)) {
        // Assume old style registration object
        options.logger(['registration', 'info'], 'Awaiting promise for old-style object registration');
        await server.register({ plugin: registration.plugin, options: registration.options });
    }
    else if (registration.plugin instanceof Function) {
        options.logger(['registration', 'info'], 'Awaiting promise for function style registration');

        const plugin = registration.plugin(server);
        await serviceContext.resolve(plugin);
        await server.register(wrapClassRegister(plugin, registration.options, nameHint));
    }
}

// @ts-ignore (options)
function wrapClassRegister(instance: HapiPlugin<any>, options: any, nameHint: string[]): Plugin<any> {
    const result: Plugin<any> = {
        name: nameHint.join('-'),
        register: (server, opts) => {
            return instance.register(server, opts);
        }
    };

    return result;
}

function isPluginRegistrationObject(instance: any): boolean {
    return (instance instanceof Object) && isPluginRegistrationFunction(instance.register);
}

function isPluginRegistrationFunction(instance: any): boolean {
    return (instance instanceof Function);
}
