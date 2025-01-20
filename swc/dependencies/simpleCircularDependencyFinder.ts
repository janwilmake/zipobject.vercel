import { getDependenciesPerOperation } from "./getDependenciesPerOperation";
export type DependencyOperation = {
  operationName: string;
  dependencies?: string[];
};

/**
Takes an additional 20-40ms on top of the ±400ms of `getDependenciesPerOperation` to find the problematic dependencies while also returning a good order of least dependency.
  
Best until now (much more efficient than other algos)
  
NB: If I plug the result of this into `findCircularDependencyRecursive` I'll get a perfect result showing exactly what the loops are... But even without that it'll already be easy enough to spot with the result of this
   */
export const simpleCircularDependencyFinderRecursive = async (
  operations: { [key: string]: string },
  dependenciesPerOperationLeft?: DependencyOperation[],
  stack?: string[],
): Promise<{
  dependenciesPerOperation: DependencyOperation[];
  stack: string[] | undefined;
}> => {
  const dependenciesPerOperation =
    dependenciesPerOperationLeft ||
    (await getDependenciesPerOperation(Object.keys(operations), operations));

  /**
         1) find one with zero dependencies
         2) remove that one
         3) rmeove that dependeny from all others
         4) repeat
         */

  const noDependenciesOperation = dependenciesPerOperation.find((item) => {
    const noDependencies = !item.dependencies || item.dependencies.length === 0;
    return noDependencies;
  });

  if (!noDependenciesOperation) {
    // base case: trouble
    return { dependenciesPerOperation, stack };
  }

  const prunedDependenciesPerOperation = dependenciesPerOperation
    .filter((x) => x.operationName !== noDependenciesOperation.operationName)
    .map((item) => ({
      operationName: item.operationName,
      dependencies: item.dependencies?.filter(
        (x) => x !== noDependenciesOperation.operationName,
      ),
    }));

  if (prunedDependenciesPerOperation.length === 0) {
    // base case: you win
    return { dependenciesPerOperation: prunedDependenciesPerOperation, stack };
  }

  if (!stack) {
    stack = [];
  }
  stack.push(noDependenciesOperation.operationName);

  return simpleCircularDependencyFinderRecursive(
    operations,
    prunedDependenciesPerOperation,
    stack,
  );
};
