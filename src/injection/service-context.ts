import { DiscoveryService, DependencyIdentifier } from './discovery';
import { StubComposable, Composable, ComposableUnit } from './composables';
import { CompositionError } from './errors';
import { toposort } from './toposort';

interface ServiceInitializationGraph {
    async: string[];
    sync: string[];
}

export interface ServiceContextOptions {
    discovery: DiscoveryService;
    logger?: (tags: any, msg: any) => void;
}

export class ServiceMap {

    private map = new Map<string | symbol, ComposableUnit>();
    private identifierMap = new Map<string | symbol, DependencyIdentifier>();

    public has(key: DependencyIdentifier): boolean {
        return this.map.has(key.identifier);
    }

    public get(key: any): ComposableUnit {
        if (!key) {
            return null;
        }

        if (this.isPrimiativeKey(key)) {
            return this.map.get(key);
        }

        return this.map.get(key.identifier);
    }

    public getIdenifier(key: any): DependencyIdentifier {
        if (!key) {
            return null;
        }

        if (this.isPrimiativeKey(key)) {
            return this.identifierMap.get(key);
        }

        return this.identifierMap.get(key.identifier);
    }

    public set(key: DependencyIdentifier, value: ComposableUnit) {
        this.map.set(key.identifier, value);
        this.identifierMap.set(key.identifier, key);
    }

    public forEach(callback: (value, key) => void) {
        this.identifierMap.forEach((identifier, key) => {
            const value = this.map.get(key);
            callback(value, identifier);
        });
    }

    private isPrimiativeKey(key: any): boolean {
        return (key instanceof String) || (key instanceof Symbol) || typeof (key) === 'string' || typeof (key) === 'symbol';
    }
}

export class ServiceContext {
    public composed: boolean = false;
    protected services: ServiceMap = new ServiceMap();

    constructor(public options: ServiceContextOptions, private parent?: ServiceContext) {
        // @ts-ignore (args)
        options.logger = options.logger || ((...args) => { /* no op */ });
        this.services.set(new DependencyIdentifier('$context'), new StubComposable(this));
    }

    public get<T>(identifier: DependencyIdentifier): T {
        if (!this.composed) {
            throw new CompositionError('Context not yet composed');
        }

        const unit = this.services.get(identifier);

        if (!unit) {
            return null;
        }

        return unit.instance;
    }

    public add(ctor: any) {

        const identifier = this.options.discovery.getIdentifier(ctor);

        if (!identifier) {
            throw new CompositionError(`Unable to resolve service name from '${this.getDebugName(ctor)}'`);
        }

        if (this.services.has(identifier)) {
            // tslint:disable-next-line:max-line-length
            throw new CompositionError(`Duplicate services named '${identifier}' from '${identifier.debugInstanceToString()}' and '${this.services.getIdenifier(identifier).debugInstanceToString()} ' within the same scope`);
        }

        this.composed = false;

        this.options.logger(['spryly', 'info'], `Discovered service '${identifier}'`);

        // TODO: Constructor depedencies
        const serviceInstance = new ctor();

        const dependencies = this.options.discovery.getDependencies(serviceInstance);
        this.services.set(identifier, new Composable(serviceInstance, dependencies));
    }

    public async compose(): Promise<void> {

        if (this.composed) {
            this.options.logger(['spryly', 'info'], 'Service context already fully composed - skipping...');
            return;
        }

        this.options.logger(['spryly', 'info'], 'Composing service context...');
        const order = this.getInitializationOrder();

        const composer = (name: string): Promise<Error[] | null> => {
            const composable = this.getComposable(name);

            if (!composable) {
                throw new Error('yolo');
                // this.options.logger(['spryly', 'info'], `Failed to find service '${name}', ignoring...`);
                // return Promise.resolve<any>(null);
            }

            // Already did this instance
            if (composable.composed) {
                return Promise.resolve<any>(null);
            }

            return composable.compose(this.getServiceInstance.bind(this));
        };

        this.options.logger(['spryly', 'info'], `Composing top level services [${order.async.join(', ')}]...`);
        const errors: Error[] = [];
        // First do service with no inbound dependencies, we can do these in parallell
        const asyncErrors = await Promise.all(order.async.map(name => composer(name)));
        asyncErrors.forEach(syncError => syncError ? errors.push(...syncError) : null);

        // The rest of the services happen in order as they have in bound dependencies
        this.options.logger(['spryly', 'info'], `Composing downstream services [${order.sync.join(', ')}]...`);
        for (const serviceName of order.sync) {
            const composeErrors = await composer(serviceName);
            if (composeErrors) {
                composeErrors.push(...composeErrors);
            }
        }

        if (errors.length > 0) {
            throw new CompositionError(`Failed to compose service context`, errors);
        }

        this.options.logger(['spryly', 'info'], 'Composition of services completed');
        this.composed = true;
    }

    public async resolve(instance: any): Promise<void> {

        if (!instance) {
            return Promise.resolve(null);
        }

        const dependencies = this.options.discovery.getDependencies(instance);
        const composable = new Composable(instance, dependencies);

        const errors = await composable.compose(this.getServiceInstance.bind(this));

        if (errors && errors.length > 0) {
            throw new CompositionError(`Failed to compose instance '${this.getDebugName(instance)}'`, errors);
        }
    }

    private getComposable(name: any): ComposableUnit {
        const unit = this.services.get(name);

        if (unit) {
            return unit;
        }

        if (this.parent) {
            return this.parent.getComposable(name);
        }

        return null;
    }

    private getServiceInstance(name: string): any {
        const unit = this.getComposable(name);
        return unit ? unit.instance : null;
    }

    private getInitializationOrder(): ServiceInitializationGraph {
        const graph = [];
        const islands: Set<string> = new Set();

        this.services.forEach((request, serviceName) => {
            if (!request.dependencyRequests || request.dependencyRequests.length === 0) {
                islands.add(serviceName);
                return;
            }

            request.dependencyRequests.forEach(dep => {
                graph.push([serviceName.toString(), dep.name]);
            });
        });

        let sorted = toposort<string>(graph);
        sorted = sorted.filter(s => !islands.has(s));

        return {
            async: Array.from(islands),
            sync: sorted
        };
    }

    private getDebugName(target: any): string {
        if (!target) {
            return '<null>';
        }

        if (target.name) {
            return target.name;
        }

        if (target.toString()) {
            return target.toString();
        }

        return '<unknown>';
    }
}

export class StubServiceContext extends ServiceContext {
    public addWithIdentity(key: string | symbol, instance: any) {
        this.services.set(new DependencyIdentifier(key), new StubComposable(instance));
    }
}
