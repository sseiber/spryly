import { ComposeOptions, isClass, resolveImport } from './composition';
import { DefaultDiscoveryService, StubDiscoveryService, ServiceContext, StubServiceContext } from './injection';

export async function process(item: any, opts: ComposeOptions, staticServices?: Map<string, any>): Promise<ServiceContext> {
    const staticContext = new StubServiceContext({
        discovery: new StubDiscoveryService(),
        logger: opts.logger
    });

    for (const [key, instance] of staticServices) {
        staticContext.addWithIdentity(key, instance);
    }

    const context = new ServiceContext({
        discovery: new DefaultDiscoveryService(),
        logger: opts.logger
    }, staticContext);

    const serviceContext = collect(item, opts, context);

    await serviceContext.compose();

    return serviceContext;
}

function collect(item: any, opts: ComposeOptions, context: ServiceContext): ServiceContext {
    if (!Array.isArray(item)) {
        item = resolveImport(item, opts);
    }

    if (Array.isArray(item)) {
        for (const child of item) {
            collect(child, opts, context);
        }

        return context;
    }

    if (!isClass(item)) {
        // TODO: Support statics
        throw new Error('Service instances must be classes');
    }

    context.add(item);

    return context;
}
