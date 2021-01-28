import 'reflect-metadata';
import { InjectMetadataKey, ServiceMetadataKey } from './decorators';

export class DependencyIdentifier {
    constructor(public identifier: string | symbol, public instanceIdentifier?: string) { }

    public debugToString(): string {
        return this.toString() || '<null>';
    }

    public debugInstanceToString(): string {
        return this.instanceIdentifier || '<unknown>';
    }

    public toString(): string {
        return this.identifier ? this.identifier.toString() : null || this.instanceIdentifier;
    }

    public equals(other: DependencyIdentifier): boolean {
        if (other === null) {
            return false;
        }

        return other.identifier === this.identifier;
    }
}

export interface DependencyRequest {
    name: string;
    required: boolean;
    setter: (value: string) => Error;
}

export interface DiscoveryService {
    getDependencies(instance: any): DependencyRequest[];
    getIdentifier(instance: any): DependencyIdentifier;
}

export class StubDiscoveryService implements DiscoveryService {
    // @ts-ignore (instance)
    public getDependencies(instance: any): DependencyRequest[] {
        return [];
    }

    // @ts-ignore (instance)
    public getIdentifier(instance: any): DependencyIdentifier {
        throw new Error('Not implemented');
    }
}

export class DefaultDiscoveryService implements DiscoveryService {

    public getDependencies(instance: any): DependencyRequest[] {
        const requests = instance[InjectMetadataKey];

        // delete instance[InjectMetadataKey];

        if (!requests || !Array.isArray(requests)) {
            return [];
        }

        return requests.map(request => {
            const required = request.required === null ? true : request.required;
            const name = request.service_name;

            const setter = (value) => {
                if (!value && required) {
                    const identifier = this.getIdentifier(instance);
                    return new Error(`Service '${identifier.toString()}' missing required service '${name}'`);
                }

                instance[request.key] = value;
            };

            return {
                name,
                required,
                setter
            };
        });
    }

    public getIdentifier(instance: any): DependencyIdentifier | null {

        if (!instance) {
            return null;
        }

        const identifier = Reflect.getMetadata(ServiceMetadataKey, instance) || instance.name;

        if (!identifier) {
            return null;
        }

        const instanceName = this.getObjectIdentifier(instance);

        return new DependencyIdentifier(identifier, instanceName);
    }

    private getObjectIdentifier(instance: any): string {
        return (instance.constructor ? instance.constructor.name : instance.name) || (instance.toString ? instance.toString() : null) || '<unknown>';
    }
}
