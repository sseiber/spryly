import { DependencyRequest } from './discovery';

export type ServiceContextGetter = (name: string) => any;

export interface ComposableTarget {
    init?: () => Promise<void> | void;
    onServicesResolved?: () => void;
}

export interface ComposableUnit {
    instance: any;
    composed: boolean;
    dependencyRequests: DependencyRequest[];
    compose(...args: any[]): Promise<any>;
}

export class StubComposable implements ComposableUnit {
    public composed: boolean = true;
    public dependencyRequests: DependencyRequest[] = [];

    constructor(public instance: any) {
    }

    // @ts-ignore (args)
    public compose(...args: any[]): Promise<Error[] | null> {
        return Promise.resolve(null);
    }
}

export class Composable implements ComposableUnit {
    public composed = false;
    public errors: Error[] = [];

    constructor(public instance: ComposableTarget, public dependencyRequests: DependencyRequest[]) {
    }

    public async compose(getter: ServiceContextGetter): Promise<Error[] | null> {

        const errors: Error[] = this.inject(getter);

        if (this.instance.init) {
            try {
                const initFunc = this.instance.init();

                if (initFunc instanceof Promise) {
                    await initFunc;
                }
            }
            catch (e) {
                errors.push(e);
            }
        }

        if (this.instance.onServicesResolved && this.instance.onServicesResolved instanceof Function) {
            try {
                this.instance.onServicesResolved();
            }
            catch (e) {
                errors.push(e);
            }
        }

        if (errors.length > 0) {
            this.errors = errors;
            return errors;
        }

        this.errors = [];
        this.composed = true;
        return null;
    }

    private inject(getter: ServiceContextGetter): Error[] {

        const errors: Error[] = [];

        if (this.dependencyRequests) {
            for (const dependency of this.dependencyRequests) {
                const error = dependency.setter(getter(dependency.name));

                if (error) {
                    errors.push(error);
                }
            }
        }

        return errors;
    }
}
