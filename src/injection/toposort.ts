export class CyclicGraphError extends Error { }
export class MissingNodeError extends Error { }

class EdgeNode<T> {
    public afters: T[] = [];
    constructor(public id: T) { }
}

export interface ToposortOptions {
    continueOnCircularDependency: boolean;
}

export function toposort<T>(edges: T[][], options?: ToposortOptions): T[] {

    options = options || { continueOnCircularDependency: false };

    const nodes = edgesToMap(edges);
    const visited = new Set<T>();
    const sorted: T[] = [];

    const visit = (id: string, ancestorsIn: any) => {
        const node: EdgeNode<T> = nodes.get(id);

        if (visited.has(node.id)) {
            return;
        }

        const ancestors: T[] = Array.isArray(ancestorsIn) ? ancestorsIn : [];
        ancestors.push(node.id);
        visited.add(node.id);

        node.afters.sort(sortDesc);
        node.afters.forEach(afterId => {
            if (ancestors.indexOf(afterId) >= 0) {
                if (options.continueOnCircularDependency) {
                    return;
                }

                throw new CyclicGraphError('Cyclic graph detected');
            }

            visit(afterId.toString(), Array.from(ancestors));
        });

        sorted.unshift(node.id);
    };

    const keys: string[] = Array.from(nodes.keys());
    keys.sort(sortDesc);
    keys.forEach(visit);
    sorted.reverse();
    return sorted;
}

function sortDesc(a, b): number {
    if (a < b) {
        return 1;
    }
    if (a > b) {
        return -1;
    }
    return 0;
}

function edgesToMap<T>(edges: T[][]): Map<string, EdgeNode<T>> {
    const nodes = new Map<string, EdgeNode<T>>();

    edges.forEach((edge: T[]) => {
        const from: T = edge[0];
        const fromKey: string = from.toString();
        let fromNode: EdgeNode<T> = nodes.get(fromKey);

        if (!fromNode) {
            fromNode = new EdgeNode(from);
            nodes.set(fromKey, fromNode);
        }

        edge.forEach((to: T) => {
            if (to === from) {
                return;
            }

            const toKey = to.toString();

            if (!nodes.has(toKey)) {
                nodes.set(toKey, new EdgeNode<T>(to));
            }

            fromNode.afters.push(to);
        });

    });

    return nodes;
}
