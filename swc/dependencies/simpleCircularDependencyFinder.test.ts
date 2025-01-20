import { simpleCircularDependencyFinderRecursive } from "./simpleCircularDependencyFinder";
const test = async () => {
  console.time();
  const x = await simpleCircularDependencyFinderRecursive({});
  console.dir(x, { maxArrayLength: 999 });
  console.timeEnd();
};
test();
